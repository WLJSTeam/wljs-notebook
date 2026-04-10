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
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
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

async function evaluateExpression(expression) {
  // 1. Verify server is up
  const ready = await api("/api/ready/");
  if (!ready?.ReadyQ) throw new Error("Server is not ready");

  // 2. Create a new notebook (async — returns a Promise ID)
  const notebookPromise = await api("/api/notebook/create/");
  const notebookId = await awaitPromise(notebookPromise.Promise);
  console.log("Notebook created:", notebookId);

  // 3. Add an input cell with the expression
  const cellId = await api("/api/notebook/cells/add/", {
    Notebook: notebookId,
    Content: expression,
    Type: "Input",
    Display: "codemirror",
  });
  console.log("Cell added:", cellId);

  // 4. Evaluate the cell (async — returns a Promise ID)
  const evalPromise = await api("/api/notebook/cells/evaluate/", { Cell: cellId });
  const outputCells = await awaitPromise(evalPromise.Promise);
  console.log("Output cells:", outputCells);

  if (!Array.isArray(outputCells) || outputCells.length === 0) {
    throw new Error("No output cells were produced");
  }

  // 5. Read the content of the first output cell
  const outCell = outputCells[0];
  const result = await api("/api/notebook/cells/getlines/", {
    Cell: outCell.Id,
    From: 1,
    To: outCell.Lines,
  });

  return result;
}

// --- main ---
const expression = "Sin[Pi/6] // N";     // change to any Wolfram Language expression

evaluateExpression(expression)
  .then((result) => {
    console.log("\nResult:", result);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
