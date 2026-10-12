import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const notebookPath = path.resolve(__dirname, 'notebook.wln');
const mcpUrl = new URL(process.env.WL_MCP_URL ?? 'http://127.0.0.1:20564/');
const sessions = new WeakMap();
const slowDataRender = /\b(?:Dataset|Tabular)\b|\bResourceData\s*\[/;
const slowDataRenderDelay = 5000;

export const url = 'http://127.0.0.1:20560/iframe/' + encodeURIComponent(notebookPath);

console.warn(`Using url:${url}`);

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resultText = (result) => result.content
  ?.filter((item) => item.type === 'text')
  .map((item) => item.text)
  .join('\n');

const unwrapResult = (tool, result) => {
  if (result.isError) {
    throw new Error(`WLJS MCP ${tool} failed: ${resultText(result) ?? 'Unknown error'}`);
  }

  if (result.structuredContent && 'result' in result.structuredContent) {
    return result.structuredContent.result;
  }

  const text = resultText(result);
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const callTool = async (session, name, args, timeout = 60_000) => {
  const result = await session.client.callTool(
    { name, arguments: args },
    undefined,
    { timeout },
  );

  return unwrapResult(name, result);
};

const findNotebook = async (session, timeout = 10_000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const notebooks = await callTool(session, 'list_notebooks', {});
    const notebook = notebooks.find((candidate) =>
      candidate.Path && path.resolve(candidate.Path) === notebookPath,
    );

    if (notebook) return notebook;
    await delay(200);
  }

  throw new Error(`WLJS MCP did not report the open test notebook at ${notebookPath}`);
};

const findInputCell = async (session) => {
  const cells = await callTool(session, 'list_cells', {
    Notebook: session.notebook.Id,
  });
  const cell = cells.find((candidate) => candidate.Type === 'Input');

  if (!cell) {
    throw new Error(`WLJS MCP found no input cell in notebook ${session.notebook.Id}`);
  }

  return cell;
};

const clearGlobalSymbols = async (session) => {
 
};

const getSession = async (page) => {
  let session = sessions.get(page);
  if (session) return session;

  const client = new Client({
    name: 'wljs-playwright-tests',
    version: '1.0.0',
  });

  await client.connect(new StreamableHTTPClientTransport(mcpUrl));
  session = { client };

  try {
    session.notebook = await findNotebook(session);
  } catch (error) {
    await client.close().catch(() => {});
    throw error;
  }

  sessions.set(page, session);
  page.once('close', () => {
    sessions.delete(page);
    client.close().catch(() => {});
  });

  return session;
};

const replaceInputCell = async (page, content) => {
  const session = await getSession(page);
  const cell = await findInputCell(session);
  const lastLine = Math.max(cell.Lines ?? 1, 1);


  await callTool(session, 'set_cell_lines', {
    Cell: cell.Id,
    From: 1,
    To: lastLine,
    Content: content,
  });

  return { session, cell };
};

export const evaluate = async (page, input = '1+1', timeout = 5000, extra = 500) => {

  let finput;
  if (input.charAt(0) != '.' && input.length > 3) {
    finput = 'Clear["Global`*"]; '+input;
  } else {
    finput = input;
  }

  const { session, cell } = await replaceInputCell(page, finput);

  await callTool(session, 'evaluate_cell', {
    Cell: cell.Id,
    TimeLimit: Math.max(timeout / 1000, 1),
  }, timeout + 30_000);

  // MCP resolves when evaluation is complete. Keep only the existing render
  // allowance for asynchronous frontend graphics before taking the screenshot.
  const dataRenderDelay = slowDataRender.test(input) ? slowDataRenderDelay : 0;
  await delay(3 * extra + 1000 + dataRenderDelay);

  return page;
};

export const clearCell = async (page) => {
  await replaceInputCell(page, '');
};
