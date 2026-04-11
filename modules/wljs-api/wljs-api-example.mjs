/**
 * Example: create a notebook, add a cell, evaluate it, return the output as text.
 * Requires WLJS Frontend to be running with at least one open window and a ready kernel.
 */

const BASE_URL = "http://localhost:20560"; // adjust port as needed
const POLL_INTERVAL_MS = 300;
const POLL_TIMEOUT_MS = 30_000;

async function api(path, body = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} on ${path}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Poll /api/promise/ until the result is ready, then return it. */
async function awaitPromise(promiseId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const status = await api("/api/promise/", { Promise: promiseId });
    if (status?.ReadyQ === true) return status.Result;
  }
  throw new Error(`Promise ${promiseId} timed out after ${POLL_TIMEOUT_MS} ms`);
}

/**
 * Evaluate a cell, retrying on 409 (notebook not yet open) until it succeeds.
 * New quick notebooks are untitled and won't appear in /api/notebook/list/,
 * so we probe readiness by attempting the evaluate call directly.
 */
async function evaluateWhenReady(cellId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const evalPromise = await api("/api/notebook/cells/evaluate/", { Cell: cellId });
      return await awaitPromise(evalPromise.Promise);
    } catch (e) {
      if (e.status === 409) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }
      throw e;
    }
  }
  throw new Error(`Cell ${cellId} could not be evaluated within ${POLL_TIMEOUT_MS} ms`);
}

/**
 * Read an output cell's text, and optionally its rendered snapshot image.
 * Returns a string when withSnapshot=false, or {text, image} when true
 * (image is a base64-encoded PNG string, or null if snapshot failed).
 */
async function readOutputCell(outCell, withSnapshot = false) {
  const text = await api("/api/notebook/cells/getlines/", {
    Cell: outCell.Id,
    From: 1,
    To: outCell.Lines,
  });

  if (!withSnapshot) return text;

  const snapPromise = await api("/api/notebook/cells/snapshot/", { Cell: outCell.Id });
  const snap = await awaitPromise(snapPromise.Promise);
  return { text, image: snap?.Image ?? null };
}

/** Evaluate a single cell: replace its content, run it, read the output. */
async function evalCell(cellId, expression, withSnapshot = false) {
  // Replace cell content with the new expression
  await api("/api/notebook/cells/setlines/", {
    Cell: cellId,
    From: 1,
    To: 999999, // replace everything
    Content: expression,
  });

  // Give the frontend time to process the content change
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

  // Evaluate (reuses the retry logic so mid-pipeline pauses also recover)
  const outputCells = await evaluateWhenReady(cellId);

  if (!Array.isArray(outputCells) || outputCells.length === 0) {
    throw new Error(`No output cells produced for: ${expression}`);
  }

  // Give the frontend time to settle after evaluation
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

  return readOutputCell(outputCells[0], withSnapshot);
}

/**
 * Create one notebook + one cell, then evaluate each expression in sequence
 * reusing that same cell.
 *
 * @param {string[]} expressions - Wolfram Language expressions to evaluate.
 * @param {boolean}  withSnapshot - When true, each result is {text, image} instead of a plain string.
 * @returns Array of results (strings or {text, image} objects).
 */
async function evaluateMany(expressions, withSnapshot = false) {
  // 1. Verify server is up
  const ready = await api("/api/ready/");
  if (!ready?.ReadyQ) throw new Error("Server is not ready");

  // 2. Create notebook
  const notebookPromise = await api("/api/notebook/create/");
  const notebookId = await awaitPromise(notebookPromise.Promise);
  console.log("Notebook created:", notebookId);

  // 3. Add one reusable input cell with the first expression
  const cellId = await api("/api/notebook/cells/add/", {
    Notebook: notebookId,
    Content: expressions[0],
    Type: "Input",
    Display: "codemirror",
  });
  console.log("Cell created:", cellId);

  // 4. Evaluate the first expression — retries until the notebook window is ready
  const results = [];
  const firstOutputCells = await evaluateWhenReady(cellId);
  if (!Array.isArray(firstOutputCells) || firstOutputCells.length === 0) {
    throw new Error(`No output cells produced for: ${expressions[0]}`);
  }
  const firstOut = firstOutputCells[0];
  results.push(await readOutputCell(firstOut, withSnapshot));
  console.log(`[1/${expressions.length}] ${expressions[0]}  =>`, results[0]);

  // 5. For subsequent expressions: overwrite the cell and re-evaluate
  for (let i = 1; i < expressions.length; i++) {
    const result = await evalCell(cellId, expressions[i], withSnapshot);
    results.push(result);
    console.log(`[${i + 1}/${expressions.length}] ${expressions[i]}  =>`, result);
  }

  return results;
}

// --- main ---
const expressions = [
  "Sin[Pi/6] // N",
  "Integrate[x^2, {x, 0, 1}]",
  "Prime[10]",
  "Fibonacci[20]",
];

// Set withSnapshot to true to also capture a rendered PNG of each output cell.
const withSnapshot = true;

evaluateMany(expressions, withSnapshot)
  .then((results) => {
    console.log("\n=== All results ===");
    results.forEach((r, i) => {
      if (withSnapshot) {
        console.log(`  ${expressions[i]}  =>  ${r.text}`);
        if (r.image) console.log(`    snapshot: data:image/png;base64,${r.image.slice(0, 40)}...`);
        else         console.log(`    snapshot: (not available)`);
      } else {
        console.log(`  ${expressions[i]}  =>  ${r}`);
      }
    });
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
