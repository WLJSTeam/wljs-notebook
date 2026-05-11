# WLJS Notebook MCP for Electron

This package can be used in two ways:

1. ESM import for explicit control.
2. CommonJS `require(fn)()` extension entrypoint for Electron loaders.

## Build bundled dist

```bash
npm install
npm run build
```

This creates:

```text
dist/
  wljs-mcp.mjs            # bundled ESM library
  wljs-mcp.mjs.map
  electron-extension.cjs  # CommonJS callable wrapper for require(fn)()
  package.json            # makes require('/path/to/dist')() work
  skills/
```

## Use with your loader

Point `loadedElectronExtensions` to either the dist directory:

```js
loadedElectronExtensions = ["/absolute/path/to/wljs-mcp-electron/dist"];
```

or the wrapper file:

```js
loadedElectronExtensions = ["/absolute/path/to/wljs-mcp-electron/dist/electron-extension.cjs"];
```

Your existing code then works:

```js
loadedElectronExtensions.forEach(fn => {
  console.log('loading ...', fn);
  require(fn)();
});
```

The wrapper starts the MCP HTTP server once, even if loaded multiple times. It returns a Promise, but also logs startup failures to stderr so a non-awaited loader still reports errors.

Default endpoint:

```text
http://127.0.0.1:20564/
```

Default Wolfram API backend:

```text
http://127.0.0.1:8080
```

Override with environment variables:

```bash
WL_API_BASE=http://127.0.0.1:8080
WL_MCP_HOST=127.0.0.1
WL_MCP_PORT=20564
WL_MCP_PATH=/
WL_READ_ONLY=0
WL_MCP_DISABLE_ORIGIN_CHECK=0
```

## Awaited loader variant

Recommended if you can change the loader:

```js
for (const fn of loadedElectronExtensions) {
  console.log('loading ...', fn);
  await require(fn)({
    wlApiBase: 'http://127.0.0.1:8080',
    port: 20564,
  });
}
```

## Closing

If you need to close it explicitly:

```js
const start = require('/absolute/path/to/dist');
await start();
await start.close();
```

## ESM import

```js
import startWljsNotebookMcp, { startWljsNotebookMcp as start } from './dist/wljs-mcp.mjs';

const server = await startWljsNotebookMcp({
  wlApiBase: 'http://127.0.0.1:8080',
  port: 20564,
});
```
