import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");


await build({
  entryPoints: [join(root, "wljs-mcp.mjs")],
  outfile: join(dist, "wljs-mcp.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: ["node20"],
  legalComments: "eof",
  mainFields: ["module", "main"],
  banner: {
    js: [
      "import { createRequire as __wljsCreateRequire } from 'node:module';",
      "const require = __wljsCreateRequire(import.meta.url);",
    ].join("\n"),
  },
});


await cp(join(root, "electron-extension.cjs"), join(dist, "electron-extension.cjs"));

await writeFile(
  join(dist, "package.json"),
  JSON.stringify(
    {
      private: true,
      type: "module",
      main: "./electron-extension.cjs",
      exports: {
        ".": {
          import: "./wljs-mcp.mjs",
          require: "./electron-extension.cjs",
        },
        "./extension": "./electron-extension.cjs",
        "./wljs-mcp.mjs": "./wljs-mcp.mjs",
      },
    },
    null,
    2,
  ) + "\n",
);

console.log("Built dist/wljs-mcp.mjs, dist/electron-extension.cjs");
