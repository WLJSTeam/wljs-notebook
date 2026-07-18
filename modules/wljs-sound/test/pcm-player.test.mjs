import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/kernel.js', import.meta.url), 'utf8');
const playerSource = source.slice(source.indexOf('const unlockAudioContext'), source.indexOf('const rates'));
let now = 0, frameId = 0;
const frames = new Map(), sources = [];

class MockAudioContext {
    constructor() { this.currentTime = 0; this.state = 'running'; }
    resume() { this.resumed = true; return Promise.resolve(); }
    close() { this.closed = true; return Promise.resolve(); }
    createGain() { return {gain: {value: 0}, connect() {}, disconnect() { this.disconnected = true; }}; }
    createBuffer(channels, length, sampleRate) {
        const data = Array.from({length: channels}, () => new Float32Array(length));
        return {duration: length / sampleRate, getChannelData: (channel) => data[channel]};
    }
    createBufferSource() {
        const source = {connect() {}, start(time) { this.startTime = time; }, stop() { this.stopped = true; }};
        sources.push(source);
        return source;
    }
}

const context = {
    ArrayBuffer, Int8Array, Int16Array, Int32Array, Float32Array,
    performance: {now: () => now},
    requestAnimationFrame: (callback) => { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => frames.delete(id),
    window: {AudioContext: MockAudioContext},
    document: {body: {addEventListener() {}, removeEventListener() {}}},
    console
};
context.globalThis = context;
vm.runInNewContext(`${playerSource}; globalThis.FUPCMPlayer = FUPCMPlayer;`, context);

const runFrames = (timestamp) => {
    now = timestamp;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(timestamp));
};

const player = new context.FUPCMPlayer({encoding: '16bitInt', sampleRate: 16000, callbackTimeAhead: 0});
player.feed(new Int16Array([32767, -32768]));
assert.equal(sources.length, 1);
assert.equal(sources[0].startTime, 0);
assert.ok(Math.abs(sources[0].buffer.getChannelData(0)[0] - 32767 / 32768) < 1e-7);

player.feed(new Int16Array([0, 16384]));
assert.equal(sources.length, 1, 'streaming feed queues until the scheduled flush');
runFrames(6);
assert.equal(sources.length, 2);
assert.equal(sources[1].startTime, 2 / 16000, 'queued audio starts immediately after the prior buffer');

frames.clear();
const first = new context.FUPCMPlayer({callbackTimeAhead: 0});
first.feed(new Int16Array([1]));
const second = new context.FUPCMPlayer({callbackTimeAhead: 0});
second.feed(new Int16Array([1]));
assert.equal(frames.size, 2, 'each player schedules its own flush');
const secondFrame = second.timeout;
first.interrupt();
assert.equal(frames.has(secondFrame), true, 'interrupting one player leaves another stream scheduled');
second.interrupt();

const stereo = new context.FUPCMPlayer({channels: 2, sampleRate: 16000});
stereo.feed(new Int16Array([32767, -32768, 16384, -16384]));
assert.deepEqual([...stereo.scheduledBufferNode.buffer.getChannelData(0)], [32767 / 32768, .5]);
assert.deepEqual([...stereo.scheduledBufferNode.buffer.getChannelData(1)], [-1, -.5]);
stereo.interrupt();

const active = new context.FUPCMPlayer();
active.feed(new Int16Array([1]));
const activeSource = active.scheduledBufferNode;
active.destroy();
assert.equal(activeSource.stopped, true);
assert.equal(active.audioCtx, null);
assert.equal(frames.size, 0, 'destroy cancels scheduled flushes');

let callbackTimestamp;
const notifier = new context.FUPCMPlayer({callback: (timestamp) => { callbackTimestamp = timestamp; }, callbackTimeAhead: 0});
notifier.feed(new Int16Array([1]));
runFrames(12);
assert.equal(callbackTimestamp, 12, 'streaming callback fires before the next flush');
notifier.interrupt();

console.log('PCM player tests passed');
