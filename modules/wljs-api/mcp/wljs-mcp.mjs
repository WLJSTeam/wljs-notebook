import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import cors from "cors";

import fs from "node:fs/promises"

const idSchema = z.string().min(1);
const lineNumberSchema = z.number().int().positive();

const cellIdShape = {
  Cell: idSchema.describe("Cell hash/id."),
};

const notebookIdShape = {
  Notebook: idSchema.describe("Notebook hash/id."),
};

const lineRangeShape = {
  From: lineNumberSchema.describe("1-indexed start line, inclusive."),
  To: lineNumberSchema.describe("1-indexed end line, inclusive."),
};

const optionalAnchorShape = {
  After: idSchema.optional().describe("Optional anchor cell id to insert after."),
  Before: idSchema.optional().describe("Optional anchor cell id to insert before."),
};

function assertLineRange({ From, To }, label = "line range") {
  if (From > To) {
    throw new Error(`Invalid ${label}: From (${From}) must be <= To (${To}).`);
  }
}

function assertSingleAnchor({ After, Before }) {
  if (After !== undefined && Before !== undefined) {
    throw new Error("Specify only one of After or Before, not both.");
  }
}

function assertNonOverlappingLineChanges(changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error("Changes must contain at least one edit.");
  }

  for (const [index, change] of changes.entries()) {
    assertLineRange(change, `Changes[${index}]`);
  }

  const sorted = changes
    .map((change, index) => ({ ...change, index }))
    .sort((a, b) => a.From - b.From || a.To - b.To);

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];

    if (current.From <= previous.To) {
      throw new Error(
        `Overlapping edits: Changes[${previous.index}] (${previous.From}-${previous.To}) ` +
          `overlaps Changes[${current.index}] (${current.From}-${current.To}).`,
      );
    }
  }
}

function parsePositiveIntParam(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return n;
}

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
    key: "migration",
    title: "Migration from Mathematica",
    uri: "wljs://skills/migration",
    summary: "Use when porting Mathematica/.nb content or diagnosing Mathematica-to-WLJS frontend compatibility.",
    aliases: ["migration", "migrate from mathematica", "mathematica", ".nb", ".wln", "dynamicmodule", "mma view", "mmaview", "mathematica compatibility", "port notebook"],
    text: readBundledMarkdown("./skills/migration.md"),
  },
  {
    key: "formatting",
    title: "Formatting Wolfram Expressions",
    uri: "wljs://skills/formatting",
    summary: "Use for Wolfram output forms, layouts, and expression styling; use HTML or WLX for web/CSS layout.",
    aliases: ["wolfram formatting", "format expression", "format expressions", "standardform", "inputform", "traditionalform", "wlxform", "numberform", "tableform", "matrixform", "wolfram style", "style expression", "deploy", "makeboxes", "arrangesummarybox"],
    text: readBundledMarkdown("./skills/formatting.md"),
  },
  {
    key: "dynamics",
    title: "WLJS Dynamics and Interactivity",
    uri: "wljs://skills/dynamics",
    summary: "Use for interactive controls, events, Refresh, Offload, Manipulate, and pointer-driven graphics.",
    aliases: ["wljs dynamic", "dynamics", "interactivity", "interactive controls", "manipulate", "manipulateplot", "offload", "eventhandler", "event handler", "inputrange", "inputbutton", "inputcheckbox", "slider", "button", "drag", "click", "graphics event", "interactive graphics", "dragsignal", "mousemove"],
    text: readBundledMarkdown("./skills/dynamics.md"),
  },
  {
    key: "async-programming",
    title: "Asynchronous Wolfram Programming",
    uri: "wljs://skills/async-programming",
    summary: "Use for non-blocking Wolfram event handlers, promises, AsyncFunction, and Await; not ordinary JavaScript async.",
    aliases: ["async", "asynchronous wolfram", "asyncfunction", "await", "wljs promise", "wolfram then", "pauseasync", "sessionsubmit", "non-blocking event handler", "async callback", "callback"],
    text: readBundledMarkdown("./skills/async-programming.md"),
  },
  {
    key: "wlx",
    title: "WLX Cells and Components",
    uri: "wljs://skills/wlx",
    summary: "Primary resource for .wlx cells and reusable WLX components; use HTML for unparsed raw markup.",
    aliases: ["wlx", ".wlx", "wlxform", "component", "wlx component", "component markup", "wlx custom tag", "optionspattern", "wlx markup", "wlx template"],
    text: readBundledMarkdown("./skills/wlx.md"),
  },
  {
    key: "html",
    title: "HTML Cells",
    uri: "wljs://skills/html",
    summary: "Primary resource for .html cells, raw HTML, and WSP interpolation; not WLX component semantics.",
    aliases: ["html", ".html", "html cell", "raw html", "wsp", "<?wsp", "html iframe", "html script", "html style", "html void element"],
    text: readBundledMarkdown("./skills/html.md"),
  },
  {
    key: "javascript",
    title: "JavaScript Cells",
    uri: "wljs://skills/javascript",
    summary: "Primary resource for .js and .mjs cells, DOM output, lifecycle cleanup, and frontend symbols.",
    aliases: ["javascript", "js", ".js", "mjs", ".mjs", "javascript cell", "mjs cell", "dom", "document.body", "ondestroy", "this.ondestroy", "this.return", "this.after", "requestanimationframe", "setinterval", "frontend symbol", "frontfetch", "frontsubmit", "interpretate", "npm", "npm module", "rollup"],
    text: readBundledMarkdown("./skills/javascript.md"),
  },
  {
    key: "markdown",
    title: "Markdown Cells",
    uri: "wljs://skills/markdown",
    summary: "Primary resource for .md narrative cells and Markdown-specific KaTeX, admonitions, drawings, and WLX embedding.",
    aliases: ["markdown", "md", ".md", "markdown latex", "admonition", "markdown admonition", "excalidraw", "bookmark", "pagebreakbelow", "pagebreakabove"],
    text: readBundledMarkdown("./skills/markdown.md"),
  },
  {
    key: "mermaid",
    title: "Mermaid Diagram Cells",
    uri: "wljs://skills/mermaid",
    summary: "Primary resource for .mermaid cells and programmatically created Mermaid output cells.",
    aliases: ["mermaid", ".mermaid", "diagram", "mermaid diagram", "flowchart", "sequence diagram", "gantt"],
    text: readBundledMarkdown("./skills/mermaid.md"),
  },
  {
    key: "slides",
    title: "RevealJS Slide Cells",
    uri: "wljs://skills/slides",
    summary: "Primary resource for .slide/.slides presentations, Reveal options, fragments, events, and embedded WLX.",
    aliases: ["slide", "slides", ".slide", ".slides", "reveal", "revealjs", "presentation", "presentation cell", "fragment", "fragments", "slide fragment", "slideeventlistener", "slide background", "slide transition", "slide iframe", "slide latex", "plot embedding"],
    text: readBundledMarkdown("./skills/slides.md"),
  },
  {
    key: "special-cells",
    title: "File, Shell, and LaTeX Cells",
    uri: "wljs://skills/special-cells",
    summary: "Primary resource for .sh, .latex, and notebook-local filename cells; not .mjs module code.",
    aliases: ["special cells", "shell", ".sh", "shell cell", "latex cell", ".latex", "file cell", "image preview", "notebookdirectory", "notebook npm install"],
    text: readBundledMarkdown("./skills/special-cells.md"),
  },
];

const SKILL_INDEX = SKILL_DOCS.map((doc) => `- ${doc.title}: ${doc.uri} — ${doc.summary}`).join("\n");

const NOTEBOOK_ASSISTANT_INSTRUCTIONS = `Operate on a local sandboxed WLJS/Wolfram notebook.

Workflow:
1. Inspect before acting: use notebook_context, get_focused_cell, or list_cells.
2. Before editing a cell, read nearby context with get_cell_lines or read_content.
3. Edit only INPUT cells. 
4. Outputs are produced by evaluate_cell.
5. Use batch tools for related edits: set_cell_lines_batch and add_cells_batch.
6. Before creating or editing rich or special cells, read one primary bundled resource selected by the cell's first-line marker. Consult a cross-cutting resource (dynamics, async-programming, formatting, or migration) only when the task needs it. Use search_wolfram_docs for individual Wolfram Language symbols and functions. For example:
\`\`\`
.md
This will output **markdown**.
\`\`\`

Bundled resources are available at: wljs://skills/*

Cell rules:
- Cell type is determined only by the first line of input cell: .md, .html, .js, .mjs, .mermaid, .slide, .slides, .wlx, .sh, .latex, a filename marker, or no marker for plain Wolfram Language.
- Line numbers are 1-indexed and inclusive.
- Deleting an input also deletes its outputs; do not delete unless explicitly asked.
- Avoid Print and Abort in Wolfram cells.

When asked to show, print, demonstrate, or create notebook content, add or edit an INPUT cell and evaluate it when output is needed.`;

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
  return `# WLJS Notebook Skill Index

These bundled MCP resources cover rich and special cell types, expression formatting, WLJS interactivity, asynchronous workflows, and Mathematica migration.

Routing:
- Usually read one primary resource selected by the explicit cell marker or requested output type.
- Add a cross-cutting resource (dynamics, async-programming, formatting, or migration) only when that concern is actually present.
- Do not combine marker-specific rules: for example, .js returns output with return, .mjs uses this.return(...), and .latex does not use Markdown escaping.

${SKILL_INDEX}`;
}

function findSkillDocs(query) {
  const q = String(query ?? "").toLowerCase();
  if (!q.trim()) return [];
  if (["all", "skills", "skill", "index", "docs"].includes(q.trim())) return SKILL_DOCS;
  return SKILL_DOCS.filter((doc) => {
    if (q.includes(doc.key.toLowerCase()) || doc.title.toLowerCase().includes(q)) return true;
    return doc.aliases.some((alias) => {
      const a = alias.toLowerCase();
      const idx = q.indexOf(a);
      if (idx === -1) return false;
      const before = idx === 0 || !/[a-z0-9]/.test(q[idx - 1]);
      const after = idx + a.length === q.length || !/[a-z0-9]/.test(q[idx + a.length]);
      return before && after;
    });
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
  throw new WlApiError(
    `WLJS operation is still pending after ${timeoutMs} ms. ` +
      `The sandbox will keep running it; if it fails, WLJS will resolve it with $Failed. ` +
      `Increase WL_PROMISE_TIMEOUT_MS or use a shorter evaluation if the MCP client needs the result.`,
    {
      path: "/api/promise/",
      payload: {
        Promise: id,
        ReadyQ: false,
        TimedOut: true,
      },
    },
  );
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

async function createAndWaitForNotebook(app, nocells=true, timeoutMs = runtimeConfig.PROMISE_TIMEOUT_MS) {
  const created = await wlPost("/api/notebook/new/", {NoCells: nocells});
  const id = created?.Id;
  const pathEncoded = created?.PathEncoded;

  if (!id || !pathEncoded) {
    throw new WlApiError("Notebook creation returned an unexpected response; could not extract notebook id.", {
      path: "/api/notebook/new/",
      payload: created,
    });
  }

  await sleep(450);
  await openNotebookFile(app, decodeURIComponent(pathEncoded));

  const startedAt = Date.now();
  while (true) {
    const status = await wlPost("/api/notebook/readyQ/", { Id: id });

    if (status === true || status?.ReadyQ === true || status?.Result === true) {
      //main.create_window({url: main.server.url.default('local') + `/` + status.PathEncoded, title: status.Name});
      return id;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new WlApiError(
        `Notebook ${id} was created but did not become ready within ${timeoutMs} ms.`,
        { path: "/api/notebook/readyQ/", payload: { Id: id, ReadyQ: false, TimedOut: true } },
      );
    }

    await sleep(runtimeConfig.POLL_INTERVAL_MS);
  }
}

export function createWlMcpServer(app, options = {}) {
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
      description: "Index of bundled WLJS skills for rich cells, formatting, interactivity, asynchronous workflows, and Mathematica migration.",
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
        description: skill.summary,
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
            text: `Use the WLJS notebook tools with the bundled skills below. Select one primary resource from the cell marker or requested output type, then add a cross-cutting resource only when needed. Use search_wolfram_docs for individual Wolfram Language symbols and functions.\n\n${skillIndexText()}`,
          },
        },
      ],
    }),
  );

const READ_ONLY_LOCAL = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const READ_ONLY_OPEN_WORLD = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

const MUTATING_ADDITIVE_LOCAL = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

const MUTATING_DESTRUCTIVE_LOCAL = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

const EXECUTES_CODE_LOCAL = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

function humanTitle(name) {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function register(name, description, inputSchema, handler, options = {}) {
  const title = options.title ?? humanTitle(name);

  server.registerTool(
    name,
    {
      title,
      description,
      inputSchema,
      ...(options.outputSchema ? { outputSchema: options.outputSchema } : {}),
      annotations: {
        title,
        openWorldHint: false,
        ...(options.annotations ?? {}),
      },
    },
    async (args) => {
      try {
        return toMcpResult(await handler(args ?? {}));
      } catch (error) {
        return toMcpError(error);
      }
    },
  );
}

register(
  "search_wolfram_docs",
  "Search the configured WLJS llms-full.txt documentation corpus for one or more Wolfram Language symbols or topics. Curated WLJS authoring and migration guidance is available separately through the wljs://skills/* resources.",
  {
    Topics: z
      .array(z.string().trim().min(1))
      .min(1)
      .max(8)
      .describe(
        'Wolfram Language symbols or documentation topics, for example ["Plot", "Map", "EventHandler"]. Keep multi-word topic names in one array item.',
      ),
    LinesPerTopic: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(60)
      .describe("Maximum documentation lines returned for each matched topic."),
  },
  async ({ Topics, LinesPerTopic }) => {
    return {
      Source: "wljs-llms-full-docs",
      Topics,
      Content: await wlCall("/api/docs/find/", {
        Query: Topics.join(", "),
        LinesCount: LinesPerTopic,
      }),
    };
  },
  {
    annotations: READ_ONLY_OPEN_WORLD,
    outputSchema: {
      result: z.object({
        Source: z.literal("wljs-llms-full-docs"),
        Topics: z.array(z.string()),
        Content: z.string(),
      }),
    },
  },
);

register(
  "notebook_context",
  "Agent workflow helper: get the focused notebook if needed, list its cells, and include the focused cell/selection when available. Prefer this before notebook edits.",
  {
    Notebook: z
      .string()
      .optional()
      .describe("Optional notebook hash/id. If omitted, uses the focused notebook."),
  },
  async ({ Notebook }) => {
    const notebookId = Notebook ?? (await wlCall("/api/notebook/focused/", {})).Id;
    const cells = await wlCall("/api/notebook/cells/list/", {
      Notebook: notebookId,
    });

    let focusedCell = null;

    try {
      focusedCell = await wlCall("/api/notebook/cells/focused/", {
        Notebook: notebookId,
      });
    } catch (error) {
      focusedCell = {
        Error: error?.message ?? String(error),
      };
    }

    return {
      Notebook: notebookId,
      Cells: cells,
      FocusedCell: focusedCell,
    };
  },
);

register(
  "list_notebooks",
  "List notebooks known to the application.",
  {},
  () => wlCall("/api/notebook/list/", {}),
  {
  title: "List Notebooks",
  annotations: READ_ONLY_LOCAL,
}
);

register(
  "new_notebook",
  "Create a new empty notebook and wait until it is ready. Returns the notebook id/hash.",
  {},
  () => createAndWaitForNotebook(app),
  {
    title: "New Notebook",
    annotations: MUTATING_ADDITIVE_LOCAL,
  },
);

register(
  "get_focused_notebook",
  "Return the id/hash and kernel info of the currently focused notebook.",
  {},
  () => wlCall("/api/notebook/focused/", {}),
);

register(
  "list_cells",
  "List all cells in a notebook with id, type, display mode, line count, and first line.",
  {
    ...notebookIdShape 
  },
  ({ Notebook }) => wlCall("/api/notebook/cells/list/", { Notebook }),
  {
  title: "List Cells",
  annotations: READ_ONLY_LOCAL,
}
);

register(
  "list_kernels",
  "List all kernels available",
  {

  },
  ({  }) => wlCall("/api/kernel/list/", {  }),
  {
  title: "List Kernels",
  annotations: READ_ONLY_LOCAL,
}
);

register(
  "get_focused_cell",
  "Get the currently focused cell in a notebook and its selected line range, if any. Lines are 1-indexed.",
  {
    Notebook: z.string().min(1).describe("Notebook hash/id."),
  },
  ({ Notebook }) => wlCall("/api/notebook/cells/focused/", { Notebook }),
);

register(
  "read_content",
  "Read cell content, bypassing output shortening and revealing hidden data when possible. Use Summarize to reveal overall shape summary of output expressions.",
  {
    Cell: idSchema.describe("Cell hash/id."),
    MaxCharacters: lineNumberSchema.optional().describe("Maximum characters. Default is 2500"),
    Summarize: z.boolean().optional().describe("Summarize output content instead of returning the full expression. Default is false")
  },
  ({ Cell, MaxCharacters, Summarize }) => wlCall("/api/notebook/cells/readcontent/", { Cell, MaxCharacters, Summarize }),
  {
  title: "Read Cell Content",
  annotations: READ_ONLY_LOCAL,
}
);

register(
  "get_cell_lines",
  "Read an inclusive, 1-indexed line range from a cell. Read a little above and below selected lines before editing. Cannot be used on output cells",
  {
    ...cellIdShape,
    ...lineRangeShape,
  },
  ({ Cell, From, To }) => {
    assertLineRange({ From, To });
    return wlCall("/api/notebook/cells/getlines/", { Cell, From, To });
  },
  { title: "Get Cell Lines", annotations: READ_ONLY_LOCAL },
);

register(
  "wolfram_alpha",
  "Ask Wolfram Alpha for a short factual answer.",
  {
    Query: z.string().min(1).describe("Natural-language Wolfram Alpha query."),
  },
  ({ Query }) => wlCall("/api/alphaRequest/", { Query }),
  {
  title: "Ask Wolfram Alpha",
  annotations: READ_ONLY_OPEN_WORLD,
}
);

if (!runtimeConfig.READ_ONLY) {
  register(
    "set_cell_lines",
    "Replace an inclusive, 1-indexed line range in an input cell. Prefer set_cell_lines_batch for multiple edits in one cell.",
    {
      Cell: z.string().min(1).describe("Cell hash/id."),
      From: z
        .number()
        .int()
        .positive()
        .describe("1-indexed start line, inclusive."),
      To: z
        .number()
        .int()
        .positive()
        .describe("1-indexed end line, inclusive."),
      Content: z
        .string()
        .describe("Replacement text. May contain one or more lines."),
    },
    ({ Cell, From, To, Content }) =>
      wlCall("/api/notebook/cells/setlines/", {
        Cell,
        From,
        To,
        Content,
      }),
  {
  title: "Replace Cell Lines",
  annotations: MUTATING_DESTRUCTIVE_LOCAL,
});

register(
  "set_cell_lines_batch",
  "Apply multiple non-overlapping line replacements to one input cell. Changes are 1-indexed and inclusive.",
  {
    ...cellIdShape,
    Changes: z
      .array(
        z.object({
          From: lineNumberSchema,
          To: lineNumberSchema,
          Content: z.string(),
        }),
      )
      .min(1)
      .describe("Non-overlapping line replacements."),
  },
  ({ Cell, Changes }) => {
    assertNonOverlappingLineChanges(Changes);
    return wlCall("/api/notebook/cells/setlines/batch/", { Cell, Changes });
  },
  { title: "Batch Replace Cell Lines", annotations: MUTATING_DESTRUCTIVE_LOCAL },
);

  register(
    "insert_cell_lines",
    "Insert text after a 1-indexed line number in an input cell. After=0 inserts at the beginning.",
    {
      Cell: z.string().min(1).describe("Cell hash/id."),
      After: z
        .number()
        .int()
        .min(0)
        .describe("Insert after this line. Use 0 to insert at the beginning."),
      Content: z
        .string()
        .describe("Text to insert. May contain one or more lines."),
    },
    ({ Cell, After, Content }) =>
      wlCall("/api/notebook/cells/insertlines/", {
        Cell,
        After,
        Content,
      }),
  {
  title: "Insert Cell Lines",
  annotations: MUTATING_ADDITIVE_LOCAL,
});

  register(
    "delete_cell",
    "Delete an input cell. Output cells cannot be deleted directly. Do not use unless the user explicitly asks to delete.",
    {
      Cell: z.string().min(1).describe("Cell hash/id."),
    },
    ({ Cell }) => wlCall("/api/notebook/cells/delete/", { Cell }),
    {
  title: "Delete Cell",
  annotations: MUTATING_DESTRUCTIVE_LOCAL,
}
  );

  register(
    "add_cell",
    "Add a new INPUT cell to a notebook. Use first-line markers such as .md, .html, .js, .mermaid, or .slide to choose special cell content types; do not create output cells directly.",
    {
      Notebook: z.string().min(1).describe("Notebook hash/id."),
      Content: z.string().describe("Cell content."),
      After: z.string().optional().describe("Optional cell id to insert after."),
      Before: z.string().optional().describe("Optional cell id to insert before."),
    },
    (args) => {
  assertSingleAnchor(args);
  return wlCall("/api/notebook/cells/add/", compact(args));
},{
  title: "Add Cell",
  annotations: MUTATING_ADDITIVE_LOCAL,
}
  );

  register(
    "add_cells_batch",
    "Add multiple INPUT cells to a notebook in sequence. Prefer this for related cells.",
    {
      Notebook: z.string().min(1).describe("Notebook hash/id."),
      After: z.string().optional().describe("Optional anchor cell id to insert after."),
      Before: z.string().optional().describe("Optional anchor cell id to insert before."),
      Cells: z
        .array(
          z.object({
            Content: z.string(),
          }),
        )
        .min(1),
    },
(args) => {
  assertSingleAnchor(args);
  return wlCall("/api/notebook/cells/add/batch/", compact(args));
}
  );

  register(
    "evaluate_cell",
    "Evaluate an input cell with 20 seconds timeout interval. Output cells are created by evaluation. Returns output cell metadata when evaluation finishes. Use read_content on output ids. If Summarize is true, output expression is summarized",
    {
      Cell: z.string().min(1).describe("Input cell hash/id."),
      TimeLimit: z.number().optional().describe("Optional time limit in seconds."),
      MaxCharacters: lineNumberSchema.optional().describe("Optional maximum characters for wolfram output. Default is 1000."),
      Summarize: z.boolean().optional().describe("When true, summarize wolfram output expressions. Default is false.")
    },
    ({ Cell, TimeLimit, MaxCharacters, Summarize }) => {
      return wlCall(
        "/api/notebook/cells/evaluate/",
        compact({ Cell, TimeLimit, MaxCharacters, Summarize }),
        {
          wait: true,
          timeoutMs: runtimeConfig.PROMISE_TIMEOUT_MS + lookup(TimeLimit, 20),
        },
      )},
      {
  title: "Evaluate Cell",
  annotations: EXECUTES_CODE_LOCAL,
}
  );

  register(
    "project_cell",
    "Project an input cell into a standalone window. Requires the notebook to be open.",
    {
      Cell: z.string().min(1).describe("Input cell hash/id."),
    },
    ({ Cell }) => wlCall("/api/notebook/cells/project/", { Cell }),
  );

  const lookup = (number, def) => {
    if (!number) return def;
    return number;
  };
  
  register(
    "kernel_evaluate",
    "Evaluate Wolfram Language directly in a ready kernel without a notebook cell. The output is capped by MaxCharacters; if Summarize is true, over-limit output is summarized to fit instead of truncated. Can execute arbitrary WL code.",
    {
      Expression: z
        .string()
        .min(1)
        .describe("Wolfram Language expression to evaluate."),
      Kernel: z.string().optional().describe("Optional kernel hash/id."),
      TimeLimit: z.number().optional().describe("Optional time limit in seconds."),
      MaxCharacters: z.number().optional().describe("Optional maximum returned characters after evaluation. Default is 2500"),
      Summarize: z.boolean().optional().describe("When true, summarize over-limit output to fit MaxCharacters instead of truncating it. Default is false")
    },
    ({ Expression, Kernel, TimeLimit, MaxCharacters, Summarize }) =>
      wlCall(
        "/api/kernel/evaluate/",
        compact({ Expression, Kernel, TimeLimit, MaxCharacters, Summarize }),
        {
          wait: true,
          timeoutMs: runtimeConfig.PROMISE_TIMEOUT_MS + lookup(TimeLimit, 20),
        },
      ),
      {
  title: "Evaluate Wolfram Kernel Expression",
  annotations: EXECUTES_CODE_LOCAL,
}
  );
} else {
  console.error(
    "WL_READ_ONLY is enabled; mutating and evaluation tools are not registered.",
  );
}

return server;
}

/**
 * Start a local Streamable HTTP MCP endpoint inside the current Node/Electron process.
 * This is not a separate daemon. Call it once from Electron main and close it
 * when the app quits.
 */
export async function startWljsNotebookMcp(a,b,c,options = {}) {
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
  app.use(cors());

  app.post(path, async (req, res) => {
    const server = createWlMcpServer(a);
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

startWljsNotebookMcp.cli = async (app, _main, args, opts = {}) => {
  const stdout = process.stdout;
  const stderr = process.stderr;

  try {
    const code = await runWljsCli(app, args, { stdout, stderr });
    app.exit(code);
    return code;
  } catch (error) {
    stderr.write(`${error?.message ?? String(error)}\n`);
    app.exit(1);
    return 1;
  }
};

function cliManifest() {
  return {
    name: "wljs",
    title: "WLJS Notebook CLI",
    version: "v0.1",
    description:
      "Command-line interface for controlling a local sandboxed WLJS/Wolfram notebook application. Commands inspect notebooks, read and edit input cells, evaluate cells, project cells, and consult bundled WLJS/Wolfram documentation.",
    intended_for: [
      "human terminal users",
      "LLM coding agents",
      "Claude Code",
      "Codex",
      "local automation scripts",
    ],
    environment: {
      local_only: true,
      sandbox_expected: true,
      requires_running_app: true,
      backend: "WLJS Notebook local API",
      default_backend_url: getWlMcpConfig().WL_API_BASE,
      output_channel: {
        stdout: "command results, usually JSON",
        stderr: "errors and debug messages",
      },
    },
    global_rules: [
      "All normal command results are written to stdout.",
      "Errors are written to stderr and should produce a non-zero exit code.",
      "Most commands return JSON.",
      "Line numbers are 1-indexed and inclusive.",
      "Only INPUT cells should be edited.",
      "OUTPUT cells are created by evaluating INPUT cells.",
      "Do not delete cells unless the user explicitly requested deletion.",
      "Before editing a cell, inspect the notebook and read the relevant cell lines.",
      "Before creating a rich or special cell, use docs for one primary resource selected by its first-line marker; add a cross-cutting resource only when needed.",
    ],
    content_argument_syntax: {
      recommended_for_multiline: "--content -",
      file: "--content @path/to/file",
      inline_literal: "--content 'one line'",
      inline_escaped: "--content-escaped '.md\\nHello World'",
      note:
        "Normal --content is literal. It does not decode \\n. Use --content - or --content-escaped for multiline inline content.",
    },
    cell_type_markers: {
      markdown: ".md",
      html: ".html",
      javascript: ".js",
      javascript_module: ".mjs",
      mermaid: ".mermaid",
      slide: ".slide",
      merged_slides: ".slides",
      wlx: ".wlx",
      shell: ".sh",
      latex: ".latex",
      custom: "*.*",
      wolfram_language: "no marker",
    },
    recommended_agent_workflows: {
      inspect_before_editing: [
        "wljs focused",
        "wljs context",
        "wljs cells <notebook>",
        "wljs lines <cell> <from> <to>",
        "wljs full <cell>"
      ],
      add_and_render_markdown: [
        "wljs focused",
        "wljs add <notebook> --content '.md\\n# Title\\nBody text' --eval",
      ],
      modify_existing_cell: [
        "wljs lines <cell> <from> <to>",
        "wljs set-lines <cell> <from> <to> --content '<replacement>'",
        "wljs eval <cell>",
      ],
      consult_cli_docs_before_rich_cells: [
        "wljs docs javascript",
        "wljs docs html",
        "wljs docs wlx",
        "wljs docs dynamics",
        "wljs docs slides",
      ]
    },
    commands: [
      {
        name: "help",
        category: "meta",
        usage: "wljs help [--json|--llm]",
        description: "Show human help or, with --json/--llm, print the LLM-readable CLI manifest.",
        mutates_notebook: false,
        executes_code: false,
        output: "text or JSON",
        examples: ["wljs help", "wljs help --json"],
      },
      {
        name: "describe",
        aliases: ["llm-help", "commands"],
        category: "meta",
        usage: "wljs describe",
        description: "Print a stable machine-readable description of the CLI for LLM agents.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        examples: ["wljs describe"],
      },
      {
        name: "version",
        aliases: ["-v", "--version"],
        category: "meta",
        usage: "wljs version",
        description: "Print the CLI version.",
        mutates_notebook: false,
        executes_code: false,
        output: "text",
        examples: ["wljs version", "wljs -v"],
      },
      {
        name: "config",
        category: "meta",
        usage: "wljs config",
        description: "Print runtime configuration such as local WL API base URL and timeouts.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        examples: ["wljs config"],
      },
      {
        name: "notebooks",
        category: "inspection",
        usage: "wljs notebooks",
        description: "List notebooks known to the WLJS application.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        examples: ["wljs notebooks"],
      },
      {
        name: "kernels",
        category: "inspection",
        usage: "wljs kernels",
        description: "List all kernels available to the WLJS application, including their ids/hashes. Use a kernel id with `wljs wl --kernel <id>`.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        examples: ["wljs kernels"],
      },
      {
        name: "new",
        category: "notebook",
        usage: "wljs new [--nocells]",
        description: "Create a new notebook and wait until it is ready. Prints the notebook id/hash. By default creates a notebook with a single empty input cell. Pass --nocells to create a fully empty notebook with no cells.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON string",
        examples: ["wljs new", "wljs new --nocells"],
      },
      {
        name: "focused",
        category: "inspection",
        usage: "wljs focused",
        description: "Return the id/hash of the currently focused notebook.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON string or JSON value",
        examples: ["wljs focused"],
      },
      {
        name: "context",
        category: "inspection",
        usage: "wljs context [--Notebook <notebook>]",
        description:
          "Return notebook context: notebook id, cell list, and focused cell/selection when available. If no notebook is provided, uses the focused notebook.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        examples: ["wljs context", "wljs context --Notebook abc123"],
      },
      {
        name: "cells",
        category: "inspection",
        usage: "wljs cells <notebook>",
        description:
          "List cells in a notebook, including metadata such as id/hash, type/display info, line count, and first line when available.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        examples: ["wljs cells abc123"],
      },
      {
        name: "focused-cell",
        category: "inspection",
        usage: "wljs focused-cell <notebook>",
        description: "Return the currently focused cell and selected line range, if any.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        examples: ["wljs focused-cell abc123"],
      },
      {
        name: "lines",
        category: "inspection",
        usage: "wljs lines <cell> <from> <to>",
        description:
          "Read an inclusive 1-indexed line range from a cell. Agents should use this before editing a cell.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        argument_rules: [
          "<from> and <to> must be positive integers.",
          "<from> must be less than or equal to <to>.",
        ],
        examples: ["wljs lines cell123 1 40"],
      },
      {
        name: "full",
        category: "inspection",
        usage: "wljs full <cell> [--summarize]",
        description:
          "Read cell content, bypassing shortening and revealing hidden data when possible.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        examples: ["wljs full cell123", "wljs full cell123 --summarize"],
      },
      {
        name: "docs",
        category: "documentation",
        usage: "wljs docs <query>",
        description:
          "Consult bundled WLJS skill docs first, then local Wolfram Language docs if no bundled skill matches.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        recommended_queries: [
          "javascript",
          "html",
          "markdown",
          "mermaid",
          "slides",
          "dynamics",
          "Manipulate",
          "EventHandler",
          "Offload",
        ],
        examples: ["wljs docs javascript", "wljs docs dynamics", "wljs docs Plot"],
      },
      {
        name: "add",
        category: "editing",
        usage:
          "wljs add <notebook> --content <text|@file|-> [--after <cell>] [--before <cell>] [--eval] [--summarize] [--max-characters <n>]",
        description:
          "Add a new INPUT cell to a notebook. Use first-line markers such as .md, .html, .js, .mermaid, or .slide to choose special cell types.",
        mutates_notebook: true,
        executes_code: "only when --eval is provided",
        output: "JSON",
        argument_rules: [
          "--after and --before are mutually exclusive.",
          "--content is required.",
          "--content @file reads from a file.",
          "--content - reads from stdin.",
          "--eval evaluates the newly added cell if the cell id can be inferred.",
          "--summarize and --max-characters apply to the evaluation when --eval is provided.",
        ],
        examples: [
          "wljs add abc123 --content '.md\\n# Hello' --eval",
          "wljs add abc123 --content @example.wl",
          "cat example.wl | wljs add abc123 --content - --eval",
        ],
      },
      {
        name: "set-lines",
        category: "editing",
        usage: "wljs set-lines <cell> <from> <to> --content <text|@file|->",
        description:
          "Replace an inclusive 1-indexed line range in an existing input cell. Agents should read the target range first with wljs lines.",
        mutates_notebook: true,
        executes_code: false,
        output: "JSON",
        argument_rules: [
          "<from> and <to> must be positive integers.",
          "<from> must be less than or equal to <to>.",
          "--content is required.",
        ],
        examples: [
          "wljs lines cell123 1 20",
          "wljs set-lines cell123 3 5 --content 'replacement text'",
        ],
      },
      {
        name: "insert-lines",
        category: "editing",
        usage: "wljs insert-lines <cell> <after> --content <text|@file|->",
        description:
          "Insert content after a 1-indexed line number in an input cell. Use after=0 to insert at the beginning.",
        mutates_notebook: true,
        executes_code: false,
        output: "JSON",
        argument_rules: [
          "<after> must be a non-negative integer.",
          "--content is required.",
        ],
        examples: [
          "wljs insert-lines cell123 0 --content '.md'",
          "wljs insert-lines cell123 10 --content @snippet.wl",
        ],
      },
      {
        name: "delete-cell",
        category: "editing",
        usage: "wljs delete-cell <cell>",
        description:
          "Delete an input cell. Deleting an input cell also deletes its outputs. Use only when explicitly requested.",
        mutates_notebook: true,
        destructive: true,
        executes_code: false,
        output: "JSON",
        examples: ["wljs delete-cell cell123"],
      },
      {
        name: "eval",
        category: "evaluation",
        usage: "wljs eval <cell> [--time-limit <seconds>] [--summarize] [--max-characters <n>]",
        description:
          "Evaluate an input cell. Evaluation creates output cells and may execute arbitrary Wolfram Language or cell-specific code. Defaults to a 20 second time limit; pass --time-limit to override. When --summarize is used, --max-characters caps codemirror/overflow output summaries.",
        mutates_notebook: true,
        executes_code: true,
        output: "JSON",
        argument_rules: [
          "--time-limit is optional and must be a positive number of seconds.",
          "--summarize is optional and summarizes codemirror/overflow outputs.",
          "--max-characters is optional and must be a positive integer.",
        ],
        safety_notes: [
          "Only evaluate code that the user requested or that the agent intentionally created.",
          "Long-running evaluations may time out from the CLI perspective while continuing in the sandbox.",
        ],
        examples: ["wljs eval cell123", "wljs eval cell123 --time-limit 120", "wljs eval cell123 --summarize --max-characters 1200"],
      },
      {
        name: "project",
        category: "ui",
        usage: "wljs project <cell>",
        description: "Project an input cell into a standalone window. Requires the notebook to be open.",
        mutates_notebook: false,
        mutates_ui: true,
        executes_code: false,
        output: "JSON",
        examples: ["wljs project cell123"],
      },
      {
        name: "<file path>",
        category: "notebook",
        usage: "wljs path/to/notebook.wln",
        description: "Open a notebook by file path. Any argument that looks like a path (contains /, or starts with ./ or ../) is treated as a file to open.",
        mutates_notebook: false,
        executes_code: false,
        output: "JSON",
        examples: ["wljs path/to/notebook.wln", "wljs ./notebooks/demo.wln", "wljs /home/user/work.wln"],
      },
      {
        name: "wl",
        category: "evaluation",
        usage: "wljs wl '<wolfram-expression>' [--kernel <id>] [--time-limit <seconds>] [--summarize]",
        description:
          "Evaluate Wolfram Language directly in a ready kernel without creating a notebook cell. Output is capped by MaxCharacters; --summarize summarizes over-limit output to fit instead of truncating it.",
        mutates_notebook: false,
        executes_code: true,
        output: "JSON",
        safety_notes: [
          "This can execute arbitrary Wolfram Language code.",
          "Execution defaults to a 25 second time limit; override with --time-limit.",
          "Prefer notebook cells when the user expects visible notebook output.",
        ],
        argument_rules: [
          "The expression is taken from the joined positional arguments.",
          "Pass '-' (or no expression) to read the expression from stdin; use this on Windows/PowerShell when the expression contains double quotes, since the .bat launcher cannot forward them inline.",
          "--kernel is optional and selects a specific kernel id/hash.",
          "--time-limit is optional and must be a positive number of seconds.",
          "--summarize is optional and summarizes over-limit output to fit the maximum character limit instead of truncating it.",
        ],
        examples: [
          "wljs wl 'Total[Range[100]]'",
          "wljs wl 'Plot[Sin[x], {x, 0, 10}]'",
          "wljs wl 'Pause[60]; 1+1' --time-limit 120",
          "wljs wl 'Range[10]' --kernel abc123",
          "wljs wl 'Range[100000]' --summarize",
          "echo 'FileNames[\"*\"]' | wljs -c -",
        ],
      },
    ],
    exit_codes: {
      0: "success",
      1: "error",
    },
    llm_usage_advice: [
      "Start with `wljs describe` if command syntax is unknown.",
      "Use `wljs focused` or `wljs context` to find the active notebook.",
      "Use `wljs lines` before `wljs set-lines`.",
      "Use `wljs docs <topic>` before writing rich WLJS cell types.",
      "Use `wljs add ... --eval` when the user asks to show/render/create visible notebook output.",
      "Use `wljs full` to reveal any shortened data in the output cells",
      "Avoid `delete-cell` unless deletion was explicitly requested.",
      "Avoid `wl` for visible notebook output; use `add` plus `eval` instead.",
    ],
  };
}

function normalizeFilePath(arg) {
  let p = String(arg);
  if ((p.startsWith("'") && p.endsWith("'")) || (p.startsWith('"') && p.endsWith('"'))) {
    p = p.slice(1, -1);
  }
  if (p === "~" || p.startsWith("~/")) {
    p = homedir() + p.slice(1);
  }
  return resolve(p);
}

function looksLikeFilePath(arg) {
  return (
    typeof arg === "string" &&
    (arg.startsWith("/") || arg.startsWith("./") || arg.startsWith("../") || arg.includes("/"))
  );
}

async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

import { spawn } from "node:child_process";


// eslint-disable-next-line no-unused-vars
async function openNotebookFile(app, filePath) {
  if (! (await fileExists(filePath))) throw 'File does not exist!';
  const exePath = app.getPath('exe');
  const child = spawn(exePath, [filePath], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();  
}

async function runWljsCli(app, args, { stdout, stderr }) {
  const command = args.shift();

  if (command === "describe" || command === "llm-help" || command === "commands") {
    writeJson(stdout, cliManifest());
    return 0;
  }

  if (command === "help") {
    if (args.includes("--json") || args.includes("--llm")) {
      writeJson(stdout, cliManifest());
    } else {
      writeCli(stdout, cliHelpText());
    }
    return 0;
  }

  if (command === "version" || command === "-v" || command === "--version") {
    writeCli(stdout, app.getVersion());
    return 0;
  }

  

  switch (command) {
    case "config":
      writeJson(stdout, getWlMcpConfig());
      return 0;

    case "notebooks":
      writeJson(stdout, await wlCall("/api/notebook/list/", {}));
      return 0;

    case "kernels":
      writeJson(stdout, await wlCall("/api/kernel/list/", {}));
      return 0;

    case "new":
      const opts = parseCliOptions(args);
      if (opts.Nocells || opts.NoCells) 
        writeJson(stdout, await createAndWaitForNotebook(app, true));
      else
        writeJson(stdout, await createAndWaitForNotebook(app, false));
      
      return 0;

    case "focused":
      writeJson(stdout, await wlCall("/api/notebook/focused/", {}));
      return 0;

    case "context": {
      const opts = parseCliOptions(args);
      const Notebook = unquoteId(opts.Notebook ?? opts.notebook);

      const notebookId = Notebook ?? (await wlCall("/api/notebook/focused/", {})).Id;
      const cells = await wlCall("/api/notebook/cells/list/", { Notebook: notebookId });

      let focusedCell = null;
      try {
        focusedCell = await wlCall("/api/notebook/cells/focused/", { Notebook: notebookId });
      } catch (error) {
        focusedCell = { Error: error?.message ?? String(error) };
      }

      writeJson(stdout, {
        Notebook: notebookId,
        Cells: cells,
        FocusedCell: focusedCell,
      });
      return 0;
    }

    case "cells": {
      const Notebook = unquoteId(requireCliArg(args.shift(), "Usage: wljs cells <notebook>"));
      writeJson(stdout, await wlCall("/api/notebook/cells/list/", { Notebook }));
      return 0;
    }

    case "focused-cell": {
      const Notebook = unquoteId(requireCliArg(args.shift(), "Usage: wljs focused-cell <notebook>"));
      writeJson(stdout, await wlCall("/api/notebook/cells/focused/", { Notebook }));
      return 0;
    }

    case "lines": {
      const Cell = unquoteId(requireCliArg(args.shift(), "Usage: wljs lines <cell> <from> <to>"));
      const From = parsePositiveIntParam(args.shift(), "From");
      const To = parsePositiveIntParam(args.shift(), "To");

      assertLineRange({ From, To });

      writeText(stdout, await wlCall("/api/notebook/cells/getlines/", { Cell, From, To }));
      return 0;
    }

    case "full": {
      const opts = parseCliOptions(args.filter((a) => a.startsWith("--")));
      const positional = args.filter((a) => !a.startsWith("--"));
      const Cell = unquoteId(requireCliArg(positional.shift(), "Usage: wljs full <cell> [--summarize]"));
      const MaxCharacters = 5000;
      const Summarize = !!(opts.summarize ?? opts.Summarize);

      writeText(stdout, await wlCall("/api/notebook/cells/readcontent/", { Cell, MaxCharacters, Summarize }));
      return 0;
    }    

    case "docs": {
      const opts = parseCliOptions(args.filter((a) => a.startsWith("--")));
      const positional = args.filter((a) => !a.startsWith("--"));
      const Query = requireCliArg(positional.join(" "), "Usage: wljs docs <query> [--wl-only]");
      writeText(stdout, await cliConsultDocs(Query, 60, !!(opts["wl-only"] ?? opts.wolframOnly)));
      return 0;
    }

    case "wl":
    case "code":
    case "-c":
    case "-code": {
      // `-` (or no expression) reads the expression from stdin. This sidesteps
      // shell quoting entirely, which matters on Windows/PowerShell where the
      // .bat launcher cannot reliably forward embedded double quotes (e.g.
      // FileNames["*"]). Pipe instead:  echo 'FileNames["*"]' | wljs -c -
      const { Kernel, TimeLimit, Summarize, positional } = extractKernelEvalOptions(args);
      const joined = positional.join(" ");
      const Expression = removeTicks(requireCliArg(
        joined === "-" || joined === "" ? readFileSync(0, "utf8").trim() : joined,
        "Usage: wljs wl '<expression>' [--kernel <id>] [--time-limit <seconds>] [--summarize]   (or pipe it:  <expression> | wljs wl -)",
      ));

      writeText(
        stdout,
        await wlCall(
          "/api/kernel/evaluate/",
          compact({ Expression, Directory: resolve(), Kernel, TimeLimit, Summarize }),
          {
            wait: true,
            timeoutMs: runtimeConfig.PROMISE_TIMEOUT_MS + cliTimeLimitMs(TimeLimit),
          },
        ),
      );
      return 0;
    }

    case "eval": {
      const Cell = unquoteId(requireCliArg(args.shift(), "Usage: wljs eval <cell> [--time-limit <seconds>] [--summarize] [--max-characters <n>]"));
      const opts = parseCliOptions(args);
      const TimeLimit = parseCliTimeLimit(opts);
      const MaxCharacters = parseCliMaxCharacters(opts);
      const Summarize = !!(opts.summarize ?? opts.Summarize);

      writeJson(
        stdout,
        await wlCall(
          "/api/notebook/cells/evaluate/",
          compact({ Cell, TimeLimit, MaxCharacters, Summarize }),
          {
            wait: true,
            timeoutMs: runtimeConfig.PROMISE_TIMEOUT_MS + cliTimeLimitMs(TimeLimit),
          },
        ),
      );
      return 0;
    }

    case "project": {
      const Cell = unquoteId(requireCliArg(args.shift(), "Usage: wljs project <cell>"));
      writeText(stdout, await wlCall("/api/notebook/cells/project/", { Cell }));
      return 0;
    }

    case "add": {
      ensureWritableCli();

      const Notebook = unquoteId(requireCliArg(
        args.shift(),
        "Usage: wljs add <notebook> --content <text|@file|-> [--after cell] [--before cell] [--eval] [--summarize] [--max-characters <n>]",
      ));

      const opts = parseCliOptions(args);
      const Content = removeTicks(readCliContent(opts));

      const payload = compact({
        Notebook,
        Content,
        After: unquoteId(opts.after ?? opts.After),
        Before: unquoteId(opts.before ?? opts.Before),
      });

      assertSingleAnchor(payload);

      const added = await wlCall("/api/notebook/cells/add/", payload);

      if (opts.eval === true) {
        const Cell = extractCliCellId(added);

        if (!Cell) {
          writeJson(stdout, {
            Added: added,
            Warning: "Cell was added, but CLI could not infer the new cell id for evaluation.",
          });
          return 0;
        }

        const evaluated = await wlCall(
          "/api/notebook/cells/evaluate/",
          compact({
            Cell,
            MaxCharacters: parseCliMaxCharacters(opts),
            Summarize: !!(opts.summarize ?? opts.Summarize),
          }),
          {
            wait: true,
            timeoutMs: runtimeConfig.PROMISE_TIMEOUT_MS,
          },
        );

        writeJson(stdout, {
          Added: added,
          Evaluated: evaluated,
        });
        return 0;
      }

      writeJson(stdout, added);
      return 0;
    }

    case "set-lines": {
      ensureWritableCli();

      const Cell = unquoteId(requireCliArg(
        args.shift(),
        "Usage: wljs set-lines <cell> <from> <to> --content <text|@file|->",
      ));
      const From = parsePositiveIntParam(args.shift(), "From");
      const To = parsePositiveIntParam(args.shift(), "To");

      assertLineRange({ From, To });

      const opts = parseCliOptions(args);
      const Content = readCliContent(opts);

      writeJson(
        stdout,
        await wlCall("/api/notebook/cells/setlines/", {
          Cell,
          From,
          To,
          Content,
        }),
      );
      return 0;
    }

    case "insert-lines": {
      ensureWritableCli();

      const Cell = unquoteId(requireCliArg(
        args.shift(),
        "Usage: wljs insert-lines <cell> <after> --content <text|@file|->",
      ));

      const After = parseNonNegativeCliInt(args.shift(), "After");
      const opts = parseCliOptions(args);
      const Content = readCliContent(opts);

      writeJson(
        stdout,
        await wlCall("/api/notebook/cells/insertlines/", {
          Cell,
          After,
          Content,
        }),
      );
      return 0;
    }

    case "delete-cell": {
      ensureWritableCli();

      const Cell = unquoteId(requireCliArg(args.shift(), "Usage: wljs delete-cell <cell>"));
      writeJson(stdout, await wlCall("/api/notebook/cells/delete/", { Cell }));
      return 0;
    }

    default: {
      if (looksLikeFilePath(command)) {
        
        await openNotebookFile(app, normalizeFilePath(command), { stdout, stderr });
        return 0;
      }
      throw new Error(`Unknown command: ${command}\n\nRun: wljs help`);
    }
  }
}

function writeCli(stdout, text) {
  stdout.write(`${text}\n`);
}

function writeJson(stdout, value) {
  stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function writeText(stdout, text) {
  stdout.write(`${text}\n`);
}

function removeTicks(literal) {
  if (literal.charAt(0) == "'" && literal.charAt(literal.length - 1) == "'") return literal.slice(1, -1);
  return literal;
}

// Strip surrounding matching ' or " quotes (and whitespace) from an id passed on
// the command line. Lets users write a cell/notebook/kernel id as "001", '001',
// or bare 001 regardless of how their shell handled quoting.
function unquoteId(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed.charAt(0);
    const last = trimmed.charAt(trimmed.length - 1);
    if ((first === "'" || first === '"') && first === last) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function requireCliArg(value, usage) {
  if (value === undefined || value === "") {
    throw new Error(usage);
  }
  return value;
}

function parseNonNegativeCliInt(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return n;
}

function parseCliOptions(args) {
  const out = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);

    if (key === "eval") {
      out.eval = true;
      continue;
    }

    const value = args[i + 1];

    if (value === undefined || value.startsWith("--")) {
      out[key] = true;
      continue;
    }

    out[key] = value;
    i += 1;
  }

  return out;
}



function parseCliTimeLimit(opts) {
  const raw = opts["time-limit"] ?? opts.timeLimit ?? opts.TimeLimit ?? opts.timelimit ?? opts.tl;
  if (raw === undefined) return undefined;
  if (raw === true) {
    throw new Error("--time-limit requires a value in seconds.");
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("--time-limit must be a positive number of seconds.");
  }
  return n;
}

function parseCliMaxCharacters(opts) {
  const raw = opts["max-characters"] ?? opts.maxCharacters ?? opts.MaxCharacters ?? opts.maxcharacters ?? opts.maxchars;
  if (raw === undefined) return undefined;
  if (raw === true) {
    throw new Error("--max-characters requires a value.");
  }
  return parsePositiveIntParam(raw, "--max-characters");
}

function cliTimeLimitMs(timeLimit) {
  return Number.isFinite(timeLimit) && timeLimit > 0 ? timeLimit * 1000 : 0;
}

// Pull --kernel, --time-limit, and --summarize out of the argv for `wl`/`code`, leaving the
// rest as positional expression tokens (which may include a leading '-' for stdin).
function extractKernelEvalOptions(args) {
  const positional = [];
  let Kernel;
  let TimeLimit;
  let Summarize;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const key = typeof arg === "string" && arg.startsWith("--") ? arg.slice(2).toLowerCase() : null;

    if (key === "kernel") {
      const value = args[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--kernel requires a kernel id value.");
      }
      Kernel = unquoteId(value);
      i += 1;
      continue;
    }

    if (key === "time-limit" || key === "timelimit" || key === "tl") {
      const value = args[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--time-limit requires a value in seconds.");
      }
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error("--time-limit must be a positive number of seconds.");
      }
      TimeLimit = n;
      i += 1;
      continue;
    }

    if (key === "summarize") {
      Summarize = true;
      continue;
    }

    positional.push(arg);
  }

  return { Kernel, TimeLimit, Summarize, positional };
}

function readCliContent(opts) {
  const literal = opts.content ?? opts.Content;
  const escaped = opts["content-escaped"] ?? opts.contentEscaped;

  if (literal !== undefined && escaped !== undefined) {
    throw new Error("Use only one of --content or --content-escaped.");
  }

  if (escaped !== undefined) {
    return decodeCliEscapes(String(escaped));
  }

  if (literal === undefined) {
    throw new Error("Missing --content <text|@file|-> or --content-escaped <text>");
  }

  if (literal === "-") {
    return readFileSync(0, "utf8");
  }

  if (typeof literal === "string" && literal.startsWith("@")) {
    return readFileSync(literal.slice(1), "utf8");
  }

  

  return String(literal);
}

function decodeCliEscapes(text) {
  return text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

function ensureWritableCli() {
  if (runtimeConfig.READ_ONLY) {
    throw new Error("WL_READ_ONLY is enabled; mutating CLI commands are unavailable.");
  }
}

function extractCliCellId(value) {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    return (
      value.Cell ??
      value.cell ??
      value.ID ??
      value.Id ??
      value.id ??
      value.Hash ??
      value.hash ??
      null
    );
  }

  return null;
}

async function cliConsultDocs(query, linesCount = 60, wolframOnly = false) {
  const localMatches = wolframOnly ? [] : findSkillDocs(query);

  if (localMatches.length > 0) {
    return formatHumanResult({
      source: "Bundled WLJS Skills",
      query,
      docs: localMatches,
    });
  }

  try {
    const result = await wlCall("/api/docs/find/", {
      Query: query,
      LinesCount: linesCount,
    });

    return formatHumanResult({
      source: "Wolfram Language Docs",
      query,
      docs: Array.isArray(result) ? result : [result],
    });
  } catch (error) {
    return [
      `No documentation found for "${query}".`,
      "",
      `Lookup failed: ${error?.message ?? String(error)}`,
    ].join("\n");
  }
}

function formatHumanResult({ source, query, docs }) {
  const sections = [
    `# ${source}`,
    "",
    `Query: ${query}`,
  ];

  for (const doc of docs) {
    sections.push(
      "",
      `## ${doc.title ?? doc.key}`,
      doc.uri ? `URI: ${doc.uri}` : "",
      "",
      typeof doc.text === "string"
        ? doc.text
        : JSON.stringify(doc, null, 2)
    );
  }

  return sections.join("\n");
}

function cliHelpText() {
  return `WLJS Notebook CLI

Usage:
  wljs help
  wljs version
  wljs config

Notebook:
  wljs notebooks
  wljs kernels
  wljs new [--nocells]
  wljs focused
  wljs context [--Notebook <id>]
  wljs cells <notebook>
  wljs focused-cell <notebook>
  wljs lines <cell> <from> <to>
  wljs full <cell>

Editing:
  wljs add <notebook> --content <text|@file|-> [--after cell] [--before cell] [--eval] [--summarize] [--max-characters <n>]
  wljs set-lines <cell> <from> <to> --content <text|@file|->
  wljs insert-lines <cell> <after> --content <text|@file|->
  wljs delete-cell <cell>

Evaluation in the notebook:
  wljs eval <cell> [--time-limit <seconds>] [--summarize] [--max-characters <n>]
  wljs project <cell>

Direct evaluation:
  wljs wl 1+1
  wljs wl 'Range[10]^2'
  wljs wl 'Pause[60]; 1+1' --time-limit 120
  wljs wl 'Range[10]' --kernel <kernel-id>
  wljs wl 'Range[100000]' --summarize
  wljs code 1+1
  wljs -code 1+1
  wljs -c 1+1
  echo 'FileNames["*"]' | wljs -c -   (read expression from stdin; use this on
                                       Windows/PowerShell for quoted expressions)

Documentation:  
  wljs docs <query>

Open notebook by path:
  wljs path/to/notebook.wln
  wljs 'path/to/notebook.wln'
  wljs ./notebook.wln
  wljs ./notebook.md
  wljs ./notebook.html

Open a folder:
  wljs path/to/folder
  wljs .`;
}

export default startWljsNotebookMcp;
