import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

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

const NOTEBOOK_ASSISTANT_INSTRUCTIONS = `Operate on a local sandboxed WLJS/Wolfram notebook.

Workflow:
1. Inspect before acting: use notebook_context, get_focused_cell, or list_cells.
2. Before editing a cell, read nearby context with get_cell_lines.
3. Edit only INPUT cells. 
4. Outputs are produced by evaluate_cell.
5. Use batch tools for related edits: set_cell_lines_batch and add_cells_batch.
6. Use consult_docs before creating or editing .js, .html, .md, .mermaid, .slide, or WLJS dynamic/interactivity cells. For example:
\`\`\`
.md
This will output **markdown**.
\`\`\`

Bundled resources are available at: wljs://skills/*

Cell rules:
- Cell type is determined only by the first line of input cell: .md, .html, .js, .mermaid, .slide, *.*, or not --- this is plain Wolfram Language.
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
  "consult_docs",
  "Consult bundled WLJS skill docs first, then fallback to Wolfram Language documentation from the local llm.txt. Use this when unsure about JS/HTML/Markdown/Mermaid/slide cells or dynamics/interactivity.",
  {
    Query: z
      .string()
      .min(1)
      .describe(
        "Documentation topic, for example JavaScript, HTML, Markdown, Mermaid, Slide, dynamics, EventHandler, Offload, Manipulate, Plot.",
      ),
    LinesCount: z.number().int().positive().optional().default(60),
  },
  async ({ Query, LinesCount }) => {
    const localMatches = findSkillDocs(Query);

    if (localMatches.length > 0) {
      return {
        Source: "bundled-wljs-skills",
        Query,
        AvailableSkillDocs: SKILL_DOCS.map(({ key, title, uri }) => ({
          key,
          title,
          uri,
        })),
        Documents: localMatches.map(({ key, title, uri, text }) => ({
          key,
          title,
          uri,
          text,
        })),
      };
    }

    try {
      return {
        Source: "wolfram-language-llm-docs",
        Query,
        Result: await wlCall("/api/docs/find/", { Query, LinesCount }),
        AvailableSkillDocs: SKILL_DOCS.map(({ key, title, uri }) => ({
          key,
          title,
          uri,
        })),
      };
    } catch (error) {
      return {
        Source: "not-found",
        Query,
        Message: `No bundled WLJS skill matched and the WL documentation lookup failed: ${
          error?.message ?? String(error)
        }`,
        AvailableSkillDocs: SKILL_DOCS.map(
          ({ key, title, uri, aliases }) => ({
            key,
            title,
            uri,
            aliases,
          }),
        ),
      };
    }
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
    const notebookId = Notebook ?? (await wlCall("/api/notebook/focused/", {}));
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
  "get_focused_notebook",
  "Return the id/hash of the currently focused notebook.",
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
  "get_focused_cell",
  "Get the currently focused cell in a notebook and its selected line range, if any. Lines are 1-indexed.",
  {
    Notebook: z.string().min(1).describe("Notebook hash/id."),
  },
  ({ Notebook }) => wlCall("/api/notebook/cells/focused/", { Notebook }),
);

register(
  "get_cell_lines",
  "Read an inclusive, 1-indexed line range from a cell. Read a little above and below selected lines before editing.",
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
    "Evaluate an input cell. Output cells are created by evaluation. Returns output cell metadata when evaluation finishes.",
    {
      Cell: z.string().min(1).describe("Input cell hash/id."),
    },
    ({ Cell }) =>
      wlCall(
        "/api/notebook/cells/evaluate/",
        { Cell },
        {
          wait: true,
          timeoutMs: runtimeConfig.PROMISE_TIMEOUT_MS,
        },
      ),
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

  register(
    "kernel_evaluate",
    "Evaluate Wolfram Language directly in a ready kernel without a notebook cell. Can execute arbitrary WL code.",
    {
      Expression: z
        .string()
        .min(1)
        .describe("Wolfram Language expression to evaluate."),
      Kernel: z.string().optional().describe("Optional kernel hash/id."),
    },
    ({ Expression, Kernel }) =>
      wlCall(
        "/api/kernel/evaluate/",
        compact({ Expression, Kernel }),
        {
          wait: true,
          timeoutMs: runtimeConfig.PROMISE_TIMEOUT_MS,
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

startWljsNotebookMcp.cli = async (app, args = [], io = {}) => {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;

  try {
    const code = await runWljsCli(args, { stdout, stderr });
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
      "Use docs before creating or editing .js, .html, .md, .mermaid, .slide, or interactive WLJS cells.",
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
      mermaid: ".mermaid",
      slide: ".slide",
      custom: "*.*",
      wolfram_language: "no marker",
    },
    recommended_agent_workflows: {
      inspect_before_editing: [
        "wljs focused",
        "wljs context",
        "wljs cells <notebook>",
        "wljs lines <cell> <from> <to>",
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
      consult_docs_before_rich_cells: [
        "wljs docs javascript",
        "wljs docs html",
        "wljs docs dynamics",
        "wljs docs slides",
      ],
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
          "wljs add <notebook> --content <text|@file|-> [--after <cell>] [--before <cell>] [--eval]",
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
        usage: "wljs eval <cell>",
        description:
          "Evaluate an input cell. Evaluation creates output cells and may execute arbitrary Wolfram Language or cell-specific code.",
        mutates_notebook: true,
        executes_code: true,
        output: "JSON",
        safety_notes: [
          "Only evaluate code that the user requested or that the agent intentionally created.",
          "Long-running evaluations may time out from the CLI perspective while continuing in the sandbox.",
        ],
        examples: ["wljs eval cell123"],
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
        name: "wl",
        category: "evaluation",
        usage: "wljs wl '<wolfram-expression>'",
        description:
          "Evaluate Wolfram Language directly in a ready kernel without creating a notebook cell.",
        mutates_notebook: false,
        executes_code: true,
        output: "JSON",
        safety_notes: [
          "This can execute arbitrary Wolfram Language code.",
          "Prefer notebook cells when the user expects visible notebook output.",
        ],
        examples: [
          "wljs wl 'Total[Range[100]]'",
          "wljs wl 'Plot[Sin[x], {x, 0, 10}]'",
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
      "Avoid `delete-cell` unless deletion was explicitly requested.",
      "Avoid `wl` for visible notebook output; use `add` plus `eval` instead.",
    ],
  };
}

async function runWljsCli(args, { stdout, stderr }) {
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
    writeCli(stdout, "v0.1");
    return 0;
  }

  switch (command) {
    case "config":
      writeJson(stdout, getWlMcpConfig());
      return 0;

    case "notebooks":
      writeJson(stdout, await wlCall("/api/notebook/list/", {}));
      return 0;

    case "focused":
      writeJson(stdout, await wlCall("/api/notebook/focused/", {}));
      return 0;

    case "context": {
      const opts = parseCliOptions(args);
      const Notebook = opts.Notebook ?? opts.notebook;

      const notebookId = Notebook ?? (await wlCall("/api/notebook/focused/", {}));
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
      const Notebook = requireCliArg(args.shift(), "Usage: wljs cells <notebook>");
      writeJson(stdout, await wlCall("/api/notebook/cells/list/", { Notebook }));
      return 0;
    }

    case "focused-cell": {
      const Notebook = requireCliArg(args.shift(), "Usage: wljs focused-cell <notebook>");
      writeJson(stdout, await wlCall("/api/notebook/cells/focused/", { Notebook }));
      return 0;
    }

    case "lines": {
      const Cell = requireCliArg(args.shift(), "Usage: wljs lines <cell> <from> <to>");
      const From = parsePositiveIntParam(args.shift(), "From");
      const To = parsePositiveIntParam(args.shift(), "To");

      assertLineRange({ From, To });

      writeJson(stdout, await wlCall("/api/notebook/cells/getlines/", { Cell, From, To }));
      return 0;
    }

    case "docs": {
      const Query = requireCliArg(args.join(" "), "Usage: wljs docs <query>");
      writeJson(stdout, await cliConsultDocs(Query));
      return 0;
    }

    case "wl": {
      const Expression = requireCliArg(args.join(" "), "Usage: wljs wl '<expression>'");

      writeJson(
        stdout,
        await wlCall(
          "/api/kernel/evaluate/",
          { Expression },
          {
            wait: true,
            timeoutMs: runtimeConfig.PROMISE_TIMEOUT_MS,
          },
        ),
      );
      return 0;
    }

    case "eval": {
      const Cell = requireCliArg(args.shift(), "Usage: wljs eval <cell>");

      writeJson(
        stdout,
        await wlCall(
          "/api/notebook/cells/evaluate/",
          { Cell },
          {
            wait: true,
            timeoutMs: runtimeConfig.PROMISE_TIMEOUT_MS,
          },
        ),
      );
      return 0;
    }

    case "project": {
      const Cell = requireCliArg(args.shift(), "Usage: wljs project <cell>");
      writeJson(stdout, await wlCall("/api/notebook/cells/project/", { Cell }));
      return 0;
    }

    case "add": {
      ensureWritableCli();

      const Notebook = requireCliArg(
        args.shift(),
        "Usage: wljs add <notebook> --content <text|@file|-> [--after cell] [--before cell] [--eval]",
      );

      const opts = parseCliOptions(args);
      const Content = readCliContent(opts);

      const payload = compact({
        Notebook,
        Content,
        After: opts.after ?? opts.After,
        Before: opts.before ?? opts.Before,
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
          { Cell },
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

      const Cell = requireCliArg(
        args.shift(),
        "Usage: wljs set-lines <cell> <from> <to> --content <text|@file|->",
      );
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

      const Cell = requireCliArg(
        args.shift(),
        "Usage: wljs insert-lines <cell> <after> --content <text|@file|->",
      );

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

      const Cell = requireCliArg(args.shift(), "Usage: wljs delete-cell <cell>");
      writeJson(stdout, await wlCall("/api/notebook/cells/delete/", { Cell }));
      return 0;
    }

    default:
      throw new Error(`Unknown command: ${command}\n\nRun: wljs help`);
  }
}

function writeCli(stdout, text) {
  stdout.write(`${text}\n`);
}

function writeJson(stdout, value) {
  stdout.write(`${JSON.stringify(value, null, 2)}\n`);
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

async function cliConsultDocs(Query, LinesCount = 60) {
  const localMatches = findSkillDocs(Query);

  if (localMatches.length > 0) {
    return {
      Source: "bundled-wljs-skills",
      Query,
      AvailableSkillDocs: SKILL_DOCS.map(({ key, title, uri }) => ({
        key,
        title,
        uri,
      })),
      Documents: localMatches.map(({ key, title, uri, text }) => ({
        key,
        title,
        uri,
        text,
      })),
    };
  }

  try {
    return {
      Source: "wolfram-language-llm-docs",
      Query,
      Result: await wlCall("/api/docs/find/", { Query, LinesCount }),
      AvailableSkillDocs: SKILL_DOCS.map(({ key, title, uri }) => ({
        key,
        title,
        uri,
      })),
    };
  } catch (error) {
    return {
      Source: "not-found",
      Query,
      Message: `No bundled WLJS skill matched and the WL documentation lookup failed: ${
        error?.message ?? String(error)
      }`,
      AvailableSkillDocs: SKILL_DOCS.map(({ key, title, uri, aliases }) => ({
        key,
        title,
        uri,
        aliases,
      })),
    };
  }
}

function cliHelpText() {
  return `WLJS Notebook CLI

Usage:
  wljs help
  wljs version
  wljs config

Notebook:
  wljs notebooks
  wljs focused
  wljs context [--Notebook <id>]
  wljs cells <notebook>
  wljs focused-cell <notebook>
  wljs lines <cell> <from> <to>

Editing:
  wljs add <notebook> --content <text|@file|-> [--after cell] [--before cell] [--eval]
  wljs set-lines <cell> <from> <to> --content <text|@file|->
  wljs insert-lines <cell> <after> --content <text|@file|->
  wljs delete-cell <cell>

Evaluation:
  wljs eval <cell>
  wljs project <cell>
  wljs wl 'Range[10]^2'
  wljs docs <query>`;
}

export default startWljsNotebookMcp;
