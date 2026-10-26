import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const { unzlibSync, zlibSync } = require("fflate");
const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageDirectory = path.dirname(sourceDirectory);
const sourcePath = path.join(sourceDirectory, "interpreter.js");
const quick = process.argv.includes("--quick");

const baselineIndex = process.argv.indexOf("--baseline");
const baselineRef = baselineIndex === -1 ? undefined : process.argv[baselineIndex + 1];
if (baselineIndex !== -1 && !baselineRef) {
    throw new Error("--baseline requires a Git revision, for example --baseline HEAD~1");
}

function loadWXF(source, name) {
    source = source.replace(/^import .*?from 'fflate';\n/m, "");
    source += `\n;globalThis.__wxf = {
        deserializeWXF,
        serializeWXF: typeof serializeWXF === "function" ? serializeWXF : undefined,
        NumericArrayObject
    };`;

    const sandbox = {
        console: { log() {}, error() {} },
        performance,
        TextEncoder,
        TextDecoder,
        ArrayBuffer,
        DataView,
        Uint8Array,
        Uint8ClampedArray,
        Int8Array,
        Uint16Array,
        Int16Array,
        Uint32Array,
        Int32Array,
        BigInt64Array,
        BigUint64Array,
        Float32Array,
        Float64Array,
        BigInt,
        Number,
        Math,
        JSON,
        Set,
        Promise,
        setTimeout,
        clearTimeout,
        unzlibSync,
        zlibSync
    };
    sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, { filename: name });
    return sandbox.__wxf;
}

function loadGitRevision(ref) {
    return execFileSync(
        "git",
        ["show", `${ref}:Packages/WLJS/src/interpreter.js`],
        { cwd: path.join(packageDirectory, "../.."), encoding: "utf8" }
    );
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

let benchmarkSink;
function benchmark(fn, iterations, rounds) {
    for (let i = 0; i < Math.min(iterations, 100); ++i) benchmarkSink = fn();

    const samples = [];
    for (let round = 0; round < rounds; ++round) {
        if (global.gc) global.gc();
        const start = performance.now();
        for (let i = 0; i < iterations; ++i) benchmarkSink = fn();
        samples.push(performance.now() - start);
    }
    return median(samples);
}

function milliseconds(value) {
    return Number(value.toFixed(2));
}

function percent(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

const current = loadWXF(fs.readFileSync(sourcePath, "utf8"), sourcePath);
assert.equal(typeof current.serializeWXF, "function", "Current interpreter has no WXF serializer");

const baseline = baselineRef
    ? loadWXF(loadGitRevision(baselineRef), `${baselineRef}:interpreter.js`)
    : undefined;

const scale = quick ? 0.2 : 1;
const rounds = quick ? 3 : 5;
const count = value => Math.max(1, Math.round(value * scale));

const values = {
    tiny: 42,
    smallList: Array.from({ length: 10 }, (_, index) => index),
    largeList: Array.from({ length: 100_000 }, (_, index) => index % 100),
    largeFloatList: Array.from({ length: 100_000 }, (_, index) => index + 0.25),
    rgba1080p: new Uint8Array(1920 * 1080 * 4),
    intImage: new Int32Array(1024 * 1024),
    floatImage: new Float64Array(1024 * 1024),
    unalignedIntImage: new Int32Array(2_100_000),
    unalignedFloatImage: new Float64Array(2_100_000)
};
values.rgbaTensor = new current.NumericArrayObject(
    values.rgba1080p,
    [1080, 1920, 4]
);

const decodeCases = [
    ["tiny integer", values.tiny, count(500_000)],
    ["10-element List", values.smallList, count(100_000)],
    ["100k-element List", values.largeList, count(30)],
    ["100k Float List", values.largeFloatList, count(20)],
    ["1080p RGBA Uint8Array", values.rgba1080p, count(40)],
    ["1080p RGBA NumericArrayObject", values.rgbaTensor, count(40)],
    ["1M Int32Array", values.intImage, count(40)],
    ["1M Float64Array", values.floatImage, count(40)],
    ["2.1M Int32Array (unaligned)", values.unalignedIntImage, count(20)],
    ["2.1M Float64Array (unaligned)", values.unalignedFloatImage, count(20)]
].map(([name, value, iterations]) => ({
    name,
    iterations,
    payload: current.serializeWXF(value)
}));

const decodeResults = decodeCases.map(({ name, iterations, payload }) => {
    const decoded = current.deserializeWXF(payload);
    const typedArray = decoded?.[1]?.buffer;
    const currentTime = benchmark(
        () => current.deserializeWXF(payload),
        iterations,
        rounds
    );
    const result = {
        payload: name,
        bytes: payload.byteLength,
        iterations,
        storage: ArrayBuffer.isView(typedArray)
            ? (typedArray.buffer === payload ? "zero-copy" : "copied")
            : "n/a",
        "current ms": milliseconds(currentTime)
    };

    if (baseline) {
        const baselineTime = benchmark(
            () => baseline.deserializeWXF(payload),
            iterations,
            rounds
        );
        result[`${baselineRef} ms`] = milliseconds(baselineTime);
        result.delta = percent((currentTime / baselineTime - 1) * 100);
    }
    return result;
});

const encodeCases = [
    ["tiny integer", values.tiny, count(200_000)],
    ["10-element List", values.smallList, count(50_000)],
    ["100k-element List", values.largeList, count(20)],
    ["100k Float List", values.largeFloatList, count(12)],
    ["1080p RGBA Uint8Array", values.rgba1080p, count(30)],
    ["1080p RGBA NumericArrayObject", values.rgbaTensor, count(30)],
    ["1M Int32Array", values.intImage, count(30)],
    ["1M Float64Array", values.floatImage, count(30)],
    ["2.1M Int32Array (unaligned)", values.unalignedIntImage, count(15)],
    ["2.1M Float64Array (unaligned)", values.unalignedFloatImage, count(15)]
];

const encodeResults = encodeCases.map(([name, value, iterations]) => {
    const outputBytes = current.serializeWXF(value).byteLength;
    const elapsed = benchmark(() => current.serializeWXF(value), iterations, rounds);
    const result = {
        payload: name,
        bytes: outputBytes,
        iterations,
        "current ms": milliseconds(elapsed),
        "ops/sec": Math.round(iterations / (elapsed / 1000)),
        "MiB/sec": Number(
            ((outputBytes * iterations / (1024 * 1024)) / (elapsed / 1000)).toFixed(1)
        )
    };

    if (baseline?.serializeWXF) {
        const baselineTime = benchmark(
            () => baseline.serializeWXF(value),
            iterations,
            rounds
        );
        result[`${baselineRef} ms`] = milliseconds(baselineTime);
        result.delta = percent((elapsed / baselineTime - 1) * 100);
    }
    return result;
});

console.log(`WXF benchmark (${rounds} rounds, median${quick ? ", quick" : ""})`);
console.log("\nDeserialization");
console.table(decodeResults);
console.log("Serialization");
console.table(encodeResults);

// Keep the result observable so a future optimizing runtime cannot discard calls.
void benchmarkSink;
