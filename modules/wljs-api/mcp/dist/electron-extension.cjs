'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const GLOBAL_KEY = '__WLJS_NOTEBOOK_MCP_SERVER_PROMISE__';

function resolveModuleFile() {
  const candidates = [
    path.join(__dirname, 'wljs-mcp.mjs'),
    path.join(__dirname, 'dist', 'wljs-mcp.mjs'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Could not find wljs-mcp.mjs next to ${__filename}. ` +
      'Run npm run build, or keep electron-extension.cjs beside wljs-mcp.mjs.'
  );
}

function defaultOptions() {
  return {
    wlApiBase: process.env.WL_API_BASE || 'http://127.0.0.1:20560',
    host: process.env.WL_MCP_HOST || '127.0.0.1',
    port: Number(process.env.WL_MCP_PORT || 20564),
    path: process.env.WL_MCP_PATH || '/',
    originCheck: process.env.WL_MCP_DISABLE_ORIGIN_CHECK !== '1',
    readOnly: process.env.WL_READ_ONLY === '1',
  };
}

function startWljsNotebookMcpExtension(options = {}) {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];

  const promise = (async () => {
    const moduleFile = resolveModuleFile();
    const mod = await import(pathToFileURL(moduleFile).href);
    const start = mod.default || mod.startWljsNotebookMcp;

    if (typeof start !== 'function') {
      throw new Error('wljs-mcp.mjs does not export default or startWljsNotebookMcp');
    }

    const server = await start({
      ...defaultOptions(),
      ...options,
    });

    globalThis.__WLJS_NOTEBOOK_MCP_SERVER__ = server;
    console.error(`[wljs-mcp] MCP server listening at ${server.url}`);
    return server;
  })();

  globalThis[GLOBAL_KEY] = promise;

  promise.catch((error) => {
    delete globalThis[GLOBAL_KEY];
    console.error('[wljs-mcp] Failed to start MCP server:');
    console.error(error && error.stack ? error.stack : error);
  });

  return promise;
}

startWljsNotebookMcpExtension.close = async function closeWljsNotebookMcpExtension() {
  const promise = globalThis[GLOBAL_KEY];
  if (!promise) return;

  const server = await promise;
  if (server && typeof server.close === 'function') {
    await server.close();
  }

  delete globalThis[GLOBAL_KEY];
  delete globalThis.__WLJS_NOTEBOOK_MCP_SERVER__;
};

module.exports = startWljsNotebookMcpExtension;
