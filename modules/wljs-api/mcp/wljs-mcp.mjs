import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function resolveRuntimeConfig(options = {}) {
  return {
    WL_API_BASE: "http://127.0.0.1:20560",
    POLL_INTERVAL_MS: positiveInt(options.pollIntervalMs ?? options.WL_POLL_INTERVAL_MS ?? process.env.WL_POLL_INTERVAL_MS, 360),
    PROMISE_TIMEOUT_MS: positiveInt(options.promiseTimeoutMs ?? options.WL_PROMISE_TIMEOUT_MS ?? process.env.WL_PROMISE_TIMEOUT_MS, 220_000),
    REQUEST_TIMEOUT_MS: positiveInt(options.requestTimeoutMs ?? options.WL_REQUEST_TIMEOUT_MS ?? process.env.WL_REQUEST_TIMEOUT_MS, 50_000),
    MCP_TEXT_MAX_CHARS: positiveInt(options.maxTextChars ?? options.MCP_TEXT_MAX_CHARS ?? process.env.MCP_TEXT_MAX_CHARS, 60_000),
    DEBUG: options.debug ?? truthy(options.WL_DEBUG ?? process.env.WL_DEBUG),
    READ_ONLY: options.readOnly ?? truthy(options.WL_READ_ONLY ?? process.env.WL_READ_ONLY),
  };
}

let runtimeConfig = resolveRuntimeConfig();

export function configureWlMcp(options = {}) {
  runtimeConfig = resolveRuntimeConfig(options);
  return getWlMcpConfig();
}

export function getWlMcpConfig() {
  return { ...runtimeConfig };
}

export const config = new Proxy({}, {
  get(_target, prop) {
    return runtimeConfig[prop];
  },
  ownKeys() {
    return Reflect.ownKeys(runtimeConfig);
  },
  getOwnPropertyDescriptor(_target, prop) {
    if (prop in runtimeConfig) return { enumerable: true, configurable: true };
    return undefined;
  },
});

function readBundledMarkdown(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const SKILL_DOCS = [
  {
    key: "dynamics",
    title: "WLJS Dynamics and Interactivity",
    uri: "wljs://skills/dynamics",
    aliases: ["dynamic", "dynamics", "interactivity", "interactive", "manipulate", "manipulateplot", "offload", "eventhandler", "event handler", "inputrange", "inputbutton", "slider", "button", "drag", "click", "mousemove", "graphics"],
    text: readBundledMarkdown("./skills/dynamics.md"),
  },
  {
    key: "html",
    title: "HTML Cells",
    uri: "wljs://skills/html",
    aliases: ["html", ".html", "iframe", "script", "style", "dom", "body", "head", "void element", "img", "br", "input"],
    text: readBundledMarkdown("./skills/html.md"),
  },
  {
    key: "javascript",
    title: "JavaScript Cells",
    uri: "wljs://skills/javascript",
    aliases: ["javascript", "js", ".js", "dom", "document.body", "return", "ondestroy", "requestanimationframe", "setinterval", "frontfetch", "frontsubmit", "core", "interpretate"],
    text: readBundledMarkdown("./skills/javascript.md"),
  },
  {
    key: "markdown",
    title: "Markdown Cells",
    uri: "wljs://skills/markdown",
    aliases: ["markdown", "md", ".md", "latex", "admonition", "note"],
    text: readBundledMarkdown("./skills/markdown.md"),
  },
  {
    key: "mermaid",
    title: "Mermaid Diagram Cells",
    uri: "wljs://skills/mermaid",
    aliases: ["mermaid", ".mermaid", "diagram", "flowchart", "sequence diagram", "gantt"],
    text: readBundledMarkdown("./skills/mermaid.md"),
  },
  {
    key: "slides",
    title: "RevealJS Slide Cells",
    uri: "wljs://skills/slides",
    aliases: ["slide", "slides", ".slide", "reveal", "revealjs", "presentation", "fragments", "fragment", "iframe", "latex", "plot embedding"],
    text: readBundledMarkdown("./skills/slides.md"),
  },
];

const SKILL_INDEX = SKILL_DOCS.map((doc) => `- ${doc.title}: ${doc.uri} (aliases: ${doc.aliases.slice(0, 8).join(", ")})`).join("\n");

const NOTEBOOK_ASSISTANT_INSTRUCTIONS = `You are operating inside a WLJS/Wolfram notebook environment with an ordered list of cells from top to bottom.

Notebook model:
- Each INPUT cell may have zero or more OUTPUT cells directly following it.
- OUTPUT cells are read-only and are created by evaluating an INPUT cell.
- Deleting an input deletes its outputs. Do not delete cells unless explicitly asked.
- Never create OUTPUT cells directly. Only create or edit INPUT cells, then evaluate them when output is needed.

Cell type rules, determined only by the first line of an INPUT cell:
- ".md\\n" means Markdown.
- ".html\\n" means HTML.
- ".js\\n" means JavaScript.
- ".mermaid\\n" means Mermaid.
- ".slide\\n" means RevealJS slides.
- "*.*\\n" means a user custom type.
- Otherwise the cell is Wolfram Language.
- Do not set Display to choose these types; use the first-line marker pattern.

Example Markdown input cell:
.md
# Hello World
This is **markdown** cell.

Markdown, HTML, JavaScript, Mermaid, and slide cells are evaluated in the same way as code cells; they are not rendered automatically when inserted. Consult docs for JavaScript, HTML, slides, and Wolfram dynamics/interactivity.

Core workflow:
- Line numbers are 1-indexed and inclusive for both From and To.
- Always inspect the current notebook/cell first using notebook_context, get_focused_cell, or list_cells.
- Before editing/commenting a cell, read relevant lines with get_cell_lines; include a little above and below any selection for context.
- When making multiple edits in one cell, prefer set_cell_lines_batch.
- When adding multiple related cells, prefer add_cells_batch.
- To produce output, create or edit an INPUT cell, then evaluate it.
- If asked to "show" or "print" something, insert a new INPUT cell in the notebook and evaluate it, rather than only answering in chat.
- If asked for code examples, add a new INPUT cell containing the code.
- If asked to modify something, apply changes directly with editing tools.
- Avoid using Print or Abort in Wolfram cells.

Documentation:
- Use consult_docs when unsure about a Wolfram feature, cell type, JavaScript/HTML/Markdown/slide cells, Mermaid, or WLJS dynamics/interactivity.
- Bundled skill resources are available at wljs://skills/index, wljs://skills/javascript, wljs://skills/html, wljs://skills/markdown, wljs://skills/mermaid, wljs://skills/slides, and wljs://skills/dynamics.

Tool intent guide:
- consult_docs: consult local library docs when unsure about a feature or cell type.
- list_cells: notebook overview.
- get_focused_cell: current target and selected lines.
- get_cell_lines: read cell content.
- set_cell_lines, set_cell_lines_batch, insert_cell_lines: edit input cells.
- add_cell, add_cells_batch, delete_cell: manage input cells.
- evaluate_cell, project_cell: run or project an input cell.
- kernel_evaluate: run Wolfram Language without a notebook cell.
- wolfram_alpha: factual Wolfram Alpha short-answer queries.`;

function textResourceResult(uri, text) {
  return {
    contents: [
      {
        uri: typeof uri === "string" ? uri : uri.href,
        mimeType: "text/markdown",
        text,
      },
    ],
  };
}

function skillIndexText() {
  return `# WLJS Notebook Skill Index\n\nThese are bundled MCP resources for notebook-specific cell types and WLJS interactivity. Agents should call consult_docs before creating or editing these cell types.\n\n${SKILL_INDEX}`;
}

function findSkillDocs(query) {
  const q = String(query ?? "").toLowerCase();
  if (!q.trim()) return [];
  if (["all", "skills", "skill", "index", "docs"].includes(q.trim())) return SKILL_DOCS;
  return SKILL_DOCS.filter((doc) => {
    if (q.includes(doc.key.toLowerCase()) || doc.title.toLowerCase().includes(q)) return true;
    return doc.aliases.some((alias) => q.includes(alias.toLowerCase()));
  });
}

class WlApiError extends Error {
  constructor(message, { status, path, payload } = {}) {
    super(message);
    this.name = "WlApiError";
    this.status = status;
    this.path = path;
    this.payload = payload;
  }
}

function positiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function truthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());
}

function debug(...args) {
  if (runtimeConfig.DEBUG) console.error("[wljs-mcp]", ...args);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePath(path) {
  if (typeof path !== "string" || path.trim() === "") {
    throw new Error("Path must be a non-empty string.");
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function parseMaybeJson(text) {
  if (text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function stringify(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function clampText(text) {
  if (text.length <= runtimeConfig.MCP_TEXT_MAX_CHARS) return text;
  return `${text.slice(0, runtimeConfig.MCP_TEXT_MAX_CHARS)}\n\n…[truncated to ${runtimeConfig.MCP_TEXT_MAX_CHARS} chars; raw structuredContent still contains the full result when the client supports it]`;
}

function toMcpResult(value) {
  return {
    content: [{ type: "text", text: clampText(stringify(value)) }],
    structuredContent: { result: value },
  };
}

function toMcpError(error) {
  const payload = error?.payload === undefined ? "" : `\nPayload: ${stringify(error.payload)}`;
  const status = error?.status === undefined ? "" : `HTTP ${error.status} `;
  const path = error?.path ? `${error.path}: ` : "";
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `${status}${path}${error?.message ?? String(error)}${payload}`,
      },
    ],
  };
}

function isPromiseEnvelope(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.Promise === "string"
  );
}

async function wlPost(path, body = {}) {
  const normalizedPath = normalizePath(path);
  const url = new URL(normalizedPath, runtimeConfig.WL_API_BASE);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), runtimeConfig.REQUEST_TIMEOUT_MS);

  debug("POST", url.toString(), stringify(body));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        accept: "application/json",
      },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = parseMaybeJson(text);

    if (!response.ok) {
      throw new WlApiError(
        typeof payload === "string" ? payload : `WL API request failed with HTTP ${response.status}`,
        { status: response.status, path: normalizedPath, payload },
      );
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new WlApiError(`WL API request timed out after ${runtimeConfig.REQUEST_TIMEOUT_MS} ms`, {
        path: normalizedPath,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function pollPromise(id, { wait = true, timeoutMs = runtimeConfig.PROMISE_TIMEOUT_MS } = {}) {
  if (!wait) return wlPost("/api/promise/", { Promise: id });

  const startedAt = Date.now();
  while (true) {
    const status = await wlPost("/api/promise/", { Promise: id });

    if (status && typeof status === "object" && status.ReadyQ === true) {
      return Object.prototype.hasOwnProperty.call(status, "Result") ? status.Result : status;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      return {
        Promise: id,
        ReadyQ: false,
        TimedOut: true,
        Message: `Operation is still pending after ${timeoutMs} ms. Call wl_poll_promise with this Promise id to continue polling.`,
      };
    }

    await sleep(runtimeConfig.POLL_INTERVAL_MS);
  }
}

async function wlCall(path, body = {}, { wait = true, timeoutMs = runtimeConfig.PROMISE_TIMEOUT_MS } = {}) {
  const initial = await wlPost(path, body);
  if (wait && isPromiseEnvelope(initial)) {
    return pollPromise(initial.Promise, { wait: true, timeoutMs });
  }
  return initial;
}

export function createWlMcpServer(options = {}) {
  if (options && Object.keys(options).length > 0) configureWlMcp(options);

  const server = new McpServer(
    {
      name: "wljs-notebook-mcp-proxy",
      version: "0.4.0",
    },
    {
      instructions: NOTEBOOK_ASSISTANT_INSTRUCTIONS,
    },
  );

  server.registerResource(
    "notebook-assistant-guide",
    "wljs://docs/notebook-assistant-guide",
    {
      title: "WLJS Notebook Assistant Guide",
      description: "Operating rules and workflow guidance for agents using the WLJS notebook tools.",
      mimeType: "text/markdown",
    },
    (uri) => textResourceResult(uri, NOTEBOOK_ASSISTANT_INSTRUCTIONS),
  );

  server.registerResource(
    "wljs-skill-index",
    "wljs://skills/index",
    {
      title: "WLJS Skill Index",
      description: "Index of bundled WLJS notebook skills: JS, HTML, Markdown, Mermaid, slides, and dynamics/interactivity.",
      mimeType: "text/markdown",
    },
    (uri) => textResourceResult(uri, skillIndexText()),
  );

  for (const skill of SKILL_DOCS) {
    server.registerResource(
      `wljs-skill-${skill.key}`,
      skill.uri,
      {
        title: skill.title,
        description: `Bundled WLJS notebook skill documentation for ${skill.title}.`,
        mimeType: "text/markdown",
      },
      (uri) => textResourceResult(uri, skill.text),
    );
  }

  server.registerPrompt(
    "notebook-assistant",
    {
      title: "WLJS Notebook Assistant",
      description: "Use this prompt to operate safely inside a WLJS/Wolfram notebook.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: NOTEBOOK_ASSISTANT_INSTRUCTIONS,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "use-wljs-skills",
    {
      title: "Use WLJS Notebook Skills",
      description: "Attach the WLJS skill index and remind the agent to consult relevant bundled docs before creating rich notebook cells.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use the WLJS notebook tools with the bundled skills below. Before creating or editing .js, .html, .md, .mermaid, .slide, or interactive Wolfram cells, call consult_docs with the relevant topic.\n\n${skillIndexText()}`,
          },
        },
      ],
    }),
  );

function register(name, description, inputSchema, handler) {
  server.registerTool(
    name,
    { description, inputSchema },
    async (args) => {
      try {
        return toMcpResult(await handler(args ?? {}));
      } catch (error) {
        return toMcpError(error);
      }
    },
  );
}

const JsonBody = z.any().describe("JSON body to send to the WL API route.");
const waitFields = {
  wait: z
    .boolean()
    .optional()
    .default(true)
    .describe("When the WL API returns {Promise: id}, poll /api/promise/ until it resolves or times out."),
  timeoutMs: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(`Maximum time to poll promises in ms. Default: ${runtimeConfig.PROMISE_TIMEOUT_MS}.`),
};

register(
  "wl_api_raw",
  "Call any WL HTTP API route directly. Use this as an escape hatch for routes not wrapped by a dedicated MCP tool.",
  {
    path: z.string().describe("WL API route, for example /api/notebook/list/."),
    body: JsonBody.optional().default({}),
    ...waitFields,
  },
  ({ path, body, wait, timeoutMs }) => wlCall(path, body ?? {}, { wait, timeoutMs }),
);

register(
  "wl_api_routes",
  "List top-level WL API routes exposed by /api/.",
  {},
  () => wlCall("/api/", {}),
);

register(
  "wl_api_ready",
  "Check whether the WL notebook HTTP API is alive and ready.",
  {},
  () => wlCall("/api/ready/", {}),
);

register(
  "wl_poll_promise",
  "Poll a WL promise id returned by a previous tool call. By default, waits until the promise resolves or times out.",
  {
    Promise: z.string().describe("Promise id returned by the WL API."),
    ...waitFields,
  },
  ({ Promise, wait, timeoutMs }) => pollPromise(Promise, { wait, timeoutMs }),
);

register(
  "wolfram_alpha_request",
  "Ask Wolfram Alpha for a short answer through /api/alphaRequest/.",
  {
    Query: z.string().min(1).describe("Natural-language Wolfram Alpha query."),
  },
  ({ Query }) => wlCall("/api/alphaRequest/", { Query }),
);

register(
  "wl_docs_find",
  "Find Wolfram Language documentation snippets from the local llm.txt file by heading.",
  {
    Query: z.string().min(1).describe("Documentation heading/query, for example Plot or Association."),
    LinesCount: z.number().int().positive().optional().default(40),
  },
  ({ Query, LinesCount }) => wlCall("/api/docs/find/", { Query, LinesCount }),
);


register(
  "consult_docs",
  "Consult bundled WLJS skill docs first, then fallback to Wolfram Language documentation from the local llm.txt. Use this when unsure about JS/HTML/Markdown/Mermaid/slide cells or dynamics/interactivity.",
  {
    Query: z.string().min(1).describe("Documentation topic, for example JavaScript, HTML, Markdown, Mermaid, Slide, dynamics, EventHandler, Offload, Manipulate, Plot."),
    LinesCount: z.number().int().positive().optional().default(60),
  },
  async ({ Query, LinesCount }) => {
    const localMatches = findSkillDocs(Query);
    if (localMatches.length > 0) {
      return {
        Source: "bundled-wljs-skills",
        Query,
        AvailableSkillDocs: SKILL_DOCS.map(({ key, title, uri }) => ({ key, title, uri })),
        Documents: localMatches.map(({ key, title, uri, text }) => ({ key, title, uri, text })),
      };
    }

    try {
      return {
        Source: "wolfram-language-llm-docs",
        Query,
        Result: await wlCall("/api/docs/find/", { Query, LinesCount }),
        AvailableSkillDocs: SKILL_DOCS.map(({ key, title, uri }) => ({ key, title, uri })),
      };
    } catch (error) {
      return {
        Source: "not-found",
        Query,
        Message: `No bundled WLJS skill matched and the WL documentation lookup failed: ${error?.message ?? String(error)}`,
        AvailableSkillDocs: SKILL_DOCS.map(({ key, title, uri, aliases }) => ({ key, title, uri, aliases })),
      };
    }
  },
);

register(
  "wl_notebooks_list",
  "List notebooks known to the application, including notebook ids, open state, and file paths.",
  {},
  () => wlCall("/api/notebook/list/", {}),
);

register(
  "wl_notebook_focused",
  "Return the id/hash of the currently focused notebook.",
  {},
  () => wlCall("/api/notebook/focused/", {}),
);

register(
  "wl_notebook_cells_list",
  "List all cells in a notebook with id, type, display mode, line count, and first line.",
  {
    Notebook: z.string().min(1).describe("Notebook hash/id."),
  },
  ({ Notebook }) => wlCall("/api/notebook/cells/list/", { Notebook }),
);

register(
  "wl_notebook_cell_focused",
  "Get the currently focused cell in a notebook and its selected line range, if any. Lines are 1-indexed.",
  {
    Notebook: z.string().min(1).describe("Notebook hash/id."),
  },
  ({ Notebook }) => wlCall("/api/notebook/cells/focused/", { Notebook }),
);

register(
  "wl_cell_get_lines",
  "Read an inclusive, 1-indexed line range from a cell.",
  {
    Cell: z.string().min(1).describe("Cell hash/id."),
    From: z.number().int().positive().describe("1-indexed start line, inclusive."),
    To: z.number().int().positive().describe("1-indexed end line, inclusive."),
  },
  ({ Cell, From, To }) => wlCall("/api/notebook/cells/getlines/", { Cell, From, To }),
);

register(
  "wl_notebook_context",
  "Convenience read-only context: focused notebook if Notebook is omitted, notebook cells, and focused cell if available.",
  {
    Notebook: z.string().optional().describe("Optional notebook hash/id. If omitted, uses the focused notebook."),
  },
  async ({ Notebook }) => {
    const notebookId = Notebook ?? (await wlCall("/api/notebook/focused/", {}));
    const cells = await wlCall("/api/notebook/cells/list/", { Notebook: notebookId });
    let focusedCell = null;
    try {
      focusedCell = await wlCall("/api/notebook/cells/focused/", { Notebook: notebookId });
    } catch (error) {
      focusedCell = { Error: error?.message ?? String(error) };
    }
    return { Notebook: notebookId, Cells: cells, FocusedCell: focusedCell };
  },
);


register(
  "notebook_context",
  "Agent workflow helper: get the focused notebook if needed, list its cells, and include the focused cell/selection when available. Prefer this before notebook edits.",
  {
    Notebook: z.string().optional().describe("Optional notebook hash/id. If omitted, uses the focused notebook."),
  },
  async ({ Notebook }) => {
    const notebookId = Notebook ?? (await wlCall("/api/notebook/focused/", {}));
    const cells = await wlCall("/api/notebook/cells/list/", { Notebook: notebookId });
    let focusedCell = null;
    try {
      focusedCell = await wlCall("/api/notebook/cells/focused/", { Notebook: notebookId });
    } catch (error) {
      focusedCell = { Error: error?.message ?? String(error) };
    }
    return { Notebook: notebookId, Cells: cells, FocusedCell: focusedCell };
  },
);

register("list_notebooks", "List notebooks known to the application.", {}, () => wlCall("/api/notebook/list/", {}));

register("get_focused_notebook", "Return the id/hash of the currently focused notebook.", {}, () => wlCall("/api/notebook/focused/", {}));

register(
  "list_cells",
  "List all cells in a notebook with id, type, display mode, line count, and first line.",
  { Notebook: z.string().min(1).describe("Notebook hash/id.") },
  ({ Notebook }) => wlCall("/api/notebook/cells/list/", { Notebook }),
);

register(
  "get_focused_cell",
  "Get the currently focused cell in a notebook and its selected line range, if any. Lines are 1-indexed.",
  { Notebook: z.string().min(1).describe("Notebook hash/id.") },
  ({ Notebook }) => wlCall("/api/notebook/cells/focused/", { Notebook }),
);

register(
  "get_cell_lines",
  "Read an inclusive, 1-indexed line range from a cell. Read a little above and below selected lines before editing.",
  {
    Cell: z.string().min(1).describe("Cell hash/id."),
    From: z.number().int().positive().describe("1-indexed start line, inclusive."),
    To: z.number().int().positive().describe("1-indexed end line, inclusive."),
  },
  ({ Cell, From, To }) => wlCall("/api/notebook/cells/getlines/", { Cell, From, To }),
);

register(
  "wolfram_alpha",
  "Ask Wolfram Alpha for a short factual answer.",
  { Query: z.string().min(1).describe("Natural-language Wolfram Alpha query.") },
  ({ Query }) => wlCall("/api/alphaRequest/", { Query }),
);

if (!runtimeConfig.READ_ONLY) {
  register(
    "wl_cell_set_lines",
    "Replace an inclusive, 1-indexed line range in an input cell. This mutates notebook content.",
    {
      Cell: z.string().min(1).describe("Cell hash/id."),
      From: z.number().int().positive().describe("1-indexed start line, inclusive."),
      To: z.number().int().positive().describe("1-indexed end line, inclusive."),
      Content: z.string().describe("Replacement text. May contain one or more lines."),
    },
    ({ Cell, From, To, Content }) => wlCall("/api/notebook/cells/setlines/", { Cell, From, To, Content }),
  );

  register(
    "wl_cell_set_lines_batch",
    "Apply multiple non-overlapping line replacements to one input cell. Changes are 1-indexed and inclusive. This mutates notebook content.",
    {
      Cell: z.string().min(1).describe("Cell hash/id."),
      Changes: z
        .array(
          z.object({
            From: z.number().int().positive(),
            To: z.number().int().positive(),
            Content: z.string(),
          }),
        )
        .describe("Non-overlapping line replacements."),
    },
    ({ Cell, Changes }) => wlCall("/api/notebook/cells/setlines/batch/", { Cell, Changes }),
  );

  register(
    "wl_cell_insert_lines",
    "Insert text after a 1-indexed line number in an input cell. After=0 inserts at the beginning. This mutates notebook content.",
    {
      Cell: z.string().min(1).describe("Cell hash/id."),
      After: z.number().int().min(0).describe("Insert after this line. Use 0 to insert at the beginning."),
      Content: z.string().describe("Text to insert. May contain one or more lines."),
    },
    ({ Cell, After, Content }) => wlCall("/api/notebook/cells/insertlines/", { Cell, After, Content }),
  );

  register(
    "wl_cell_delete",
    "Delete an input cell. Output cells cannot be deleted directly. This mutates notebook content.",
    {
      Cell: z.string().min(1).describe("Cell hash/id."),
    },
    ({ Cell }) => wlCall("/api/notebook/cells/delete/", { Cell }),
  );

  register(
    "wl_cell_add",
    "Add a new cell to a notebook. If After/Before are omitted, the cell is appended. This mutates notebook content.",
    {
      Notebook: z.string().min(1).describe("Notebook hash/id."),
      Content: z.string().describe("Cell content."),
      After: z.string().optional().describe("Optional cell id to insert after."),
      Before: z.string().optional().describe("Optional cell id to insert before."),
      Type: z.string().optional().default("Input").describe("Cell type, default Input."),
      Display: z.string().optional().default("codemirror").describe("Display mode, default codemirror."),
      Hidden: z.boolean().optional().default(false),
      Id: z.string().optional().describe("Optional custom cell id."),
    },
    (args) => wlCall("/api/notebook/cells/add/", compact(args)),
  );

  register(
    "wl_cell_add_batch",
    "Add multiple cells to a notebook in sequence. This mutates notebook content.",
    {
      Notebook: z.string().min(1).describe("Notebook hash/id."),
      After: z.string().optional().describe("Optional anchor cell id to insert after."),
      Before: z.string().optional().describe("Optional anchor cell id to insert before."),
      Cells: z
        .array(
          z.object({
            Content: z.string(),
            Type: z.string().optional(),
            Display: z.string().optional(),
            Hidden: z.boolean().optional(),
            Id: z.string().optional(),
          }),
        )
        .min(1),
    },
    (args) => wlCall("/api/notebook/cells/add/batch/", compact(args)),
  );

  register(
    "wl_cell_add_rich_output",
    "Create a hidden input cell plus rendered output cell for markdown, JavaScript, or HTML. This mutates notebook content.",
    {
      Notebook: z.string().min(1).describe("Notebook hash/id."),
      Kind: z.enum(["markdown", "js", "html"]).describe("Rendered output type."),
      Content: z.string().describe("Rendered content."),
      After: z.string().optional().describe("Optional cell id to insert after."),
      Before: z.string().optional().describe("Optional cell id to insert before."),
      Id: z.string().optional().describe("Optional custom id for the hidden input cell."),
    },
    ({ Kind, ...rest }) => wlCall(`/api/notebook/cells/add/${Kind}/`, compact(rest)),
  );

  register(
    "wl_cell_evaluate",
    "Evaluate an input cell in its open notebook. The WL API returns a Promise; this tool polls it by default.",
    {
      Cell: z.string().min(1).describe("Input cell hash/id."),
      ...waitFields,
    },
    ({ Cell, wait, timeoutMs }) => wlCall("/api/notebook/cells/evaluate/", { Cell }, { wait, timeoutMs }),
  );

  register(
    "wl_cell_project",
    "Project an input cell into a standalone window. Requires the notebook to be open.",
    {
      Cell: z.string().min(1).describe("Input cell hash/id."),
    },
    ({ Cell }) => wlCall("/api/notebook/cells/project/", { Cell }),
  );

  register(
    "wl_kernel_evaluate",
    "Evaluate a Wolfram Language expression directly in a ready kernel. The WL API returns a Promise; this tool polls it by default. This can execute arbitrary WL code.",
    {
      Expression: z.string().min(1).describe("Wolfram Language expression to evaluate."),
      Kernel: z.string().optional().describe("Optional kernel hash/id."),
      ...waitFields,
    },
    ({ Expression, Kernel, wait, timeoutMs }) =>
      wlCall("/api/kernel/evaluate/", compact({ Expression, Kernel }), { wait, timeoutMs }),
  );

  register(
    "set_cell_lines",
    "Replace an inclusive, 1-indexed line range in an input cell. Prefer set_cell_lines_batch for multiple edits in one cell.",
    {
      Cell: z.string().min(1).describe("Cell hash/id."),
      From: z.number().int().positive().describe("1-indexed start line, inclusive."),
      To: z.number().int().positive().describe("1-indexed end line, inclusive."),
      Content: z.string().describe("Replacement text. May contain one or more lines."),
    },
    ({ Cell, From, To, Content }) => wlCall("/api/notebook/cells/setlines/", { Cell, From, To, Content }),
  );

  register(
    "set_cell_lines_batch",
    "Apply multiple non-overlapping line replacements to one input cell. Changes are 1-indexed and inclusive.",
    {
      Cell: z.string().min(1).describe("Cell hash/id."),
      Changes: z.array(z.object({ From: z.number().int().positive(), To: z.number().int().positive(), Content: z.string() })).describe("Non-overlapping line replacements."),
    },
    ({ Cell, Changes }) => wlCall("/api/notebook/cells/setlines/batch/", { Cell, Changes }),
  );

  register(
    "insert_cell_lines",
    "Insert text after a 1-indexed line number in an input cell. After=0 inserts at the beginning.",
    {
      Cell: z.string().min(1).describe("Cell hash/id."),
      After: z.number().int().min(0).describe("Insert after this line. Use 0 to insert at the beginning."),
      Content: z.string().describe("Text to insert. May contain one or more lines."),
    },
    ({ Cell, After, Content }) => wlCall("/api/notebook/cells/insertlines/", { Cell, After, Content }),
  );

  register(
    "delete_cell",
    "Delete an input cell. Output cells cannot be deleted directly. Do not use unless the user explicitly asks to delete.",
    { Cell: z.string().min(1).describe("Cell hash/id.") },
    ({ Cell }) => wlCall("/api/notebook/cells/delete/", { Cell }),
  );

  register(
    "add_cell",
    "Add a new INPUT cell to a notebook. Use first-line markers such as .md, .html, .js, .mermaid, or .slide to choose special cell content types; do not create output cells directly.",
    {
      Notebook: z.string().min(1).describe("Notebook hash/id."),
      Content: z.string().describe("Cell content."),
      After: z.string().optional().describe("Optional cell id to insert after."),
      Before: z.string().optional().describe("Optional cell id to insert before."),
      Type: z.string().optional().default("Input").describe("Cell type, default Input."),
      Display: z.string().optional().default("codemirror").describe("Display mode, default codemirror."),
      Hidden: z.boolean().optional().default(false),
      Id: z.string().optional().describe("Optional custom cell id."),
    },
    (args) => wlCall("/api/notebook/cells/add/", compact(args)),
  );

  register(
    "add_cells_batch",
    "Add multiple INPUT cells to a notebook in sequence. Prefer this for related cells.",
    {
      Notebook: z.string().min(1).describe("Notebook hash/id."),
      After: z.string().optional().describe("Optional anchor cell id to insert after."),
      Before: z.string().optional().describe("Optional anchor cell id to insert before."),
      Cells: z.array(z.object({ Content: z.string(), Type: z.string().optional(), Display: z.string().optional(), Hidden: z.boolean().optional(), Id: z.string().optional() })).min(1),
    },
    (args) => wlCall("/api/notebook/cells/add/batch/", compact(args)),
  );

  register(
    "evaluate_cell",
    "Evaluate an input cell. Output cells are created by evaluation. Polls WL promises by default.",
    { Cell: z.string().min(1).describe("Input cell hash/id."), ...waitFields },
    ({ Cell, wait, timeoutMs }) => wlCall("/api/notebook/cells/evaluate/", { Cell }, { wait, timeoutMs }),
  );

  register(
    "project_cell",
    "Project an input cell into a standalone window. Requires the notebook to be open.",
    { Cell: z.string().min(1).describe("Input cell hash/id.") },
    ({ Cell }) => wlCall("/api/notebook/cells/project/", { Cell }),
  );

  register(
    "kernel_evaluate",
    "Evaluate Wolfram Language directly in a ready kernel without a notebook cell. Can execute arbitrary WL code.",
    { Expression: z.string().min(1).describe("Wolfram Language expression to evaluate."), Kernel: z.string().optional().describe("Optional kernel hash/id."), ...waitFields },
    ({ Expression, Kernel, wait, timeoutMs }) => wlCall("/api/kernel/evaluate/", compact({ Expression, Kernel }), { wait, timeoutMs }),
  );
} else {
  console.error("WL_READ_ONLY is enabled; mutating and evaluation tools are not registered.");
}


  return server;
}


/**
 * Start a local Streamable HTTP MCP endpoint inside the current Node/Electron process.
 * This is not a separate daemon. Call it once from Electron main and close it
 * when the app quits.
 */
export async function startWljsNotebookMcp(options = {}) {
  configureWlMcp(options);

  const host = options.host ?? options.mcpHost ?? process.env.WL_MCP_HOST ?? "127.0.0.1";
  const port = positiveInt(options.port ?? options.mcpPort ?? process.env.WL_MCP_PORT, 20564);
  const path = normalizeMcpPath(options.path ?? process.env.WL_MCP_PATH ?? "/");
  const bodyLimit = options.bodyLimit ?? process.env.WL_MCP_BODY_LIMIT ?? "25mb";
  const originCheck = options.originCheck ?? !truthy(process.env.WL_MCP_DISABLE_ORIGIN_CHECK);

  const expressModule = await import("express");
  const express = expressModule.default ?? expressModule;
  const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: bodyLimit }));

  app.use((req, res, next) => {
    if (originCheck && !isLocalOrigin(req.headers.origin)) {
      rejectJsonRpc(res, 403, "Forbidden Origin. This local MCP server only accepts localhost origins or non-browser clients.");
      return;
    }
    next();
  });

  app.post(path, async (req, res) => {
    const server = createWlMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on("close", () => {
      Promise.resolve(transport.close()).catch(() => {});
      Promise.resolve(server.close()).catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling WLJS MCP request:", error);
      if (!res.headersSent) rejectJsonRpc(res, 500, "Internal server error");
    }
  });

  app.get(path, (_req, res) => {
    rejectJsonRpc(res, 405, `Method not allowed. Use POST ${path} for MCP Streamable HTTP requests.`);
  });

  app.delete(path, (_req, res) => {
    rejectJsonRpc(res, 405, "Method not allowed. This stateless MCP endpoint has no server-side session to delete.");
  });

  app.use((req, res) => {
    rejectJsonRpc(res, 404, `Not found: ${req.method} ${req.path}. This server exposes MCP only at ${path}`);
  });

  const listener = await new Promise((resolve, reject) => {
    const instance = app.listen(port, host, () => resolve(instance));
    instance.once("error", reject);
  });

  const url = `http://${host}:${port}${path}`;
  const close = () => new Promise((resolve, reject) => {
    listener.close((error) => (error ? reject(error) : resolve()));
  });

  return {
    app,
    listener,
    host,
    port,
    path,
    url,
    config: getWlMcpConfig(),
    close,
  };
}

function normalizeMcpPath(value) {
  if (!value) return "/";
  const s = String(value).trim();
  if (s === "") return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function isLocalOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function rejectJsonRpc(res, status, message) {
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code: -32000, message },
    id: null,
  });
}

export default startWljsNotebookMcp;
