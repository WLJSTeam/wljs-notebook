---
title: Asynchronous Wolfram programming in WLJS
desc: Keep event handlers and long-running WLJS applications responsive with promises, callbacks, AsyncFunction, and Await.
---

# Asynchronous Wolfram programming

Event handlers run on the kernel's event loop. Their bodies must not call blocking
operations such as `Input`, `NotebookRead`, `SystemInputDialog`, `Rasterize`,
`FrontFetch`, or `WaitAll`; doing so can hang the evaluation kernel.

Choose asynchronous variants (often ending in `Async`) and process their promises
with `Then`, or use `AsyncFunction` and `Await` for sequential-looking code.

```wolfram
n = EvaluationNotebook[];

EventHandler[InputButton["Add cell"], AsyncFunction[Null,
  Module[{choice, content},
    choice = ChoiceDialogAsync["Create a cell?", "Notebook" -> n] // Await;
    If[choice =!= True, Return[Null, Module]];

    content = InputStringAsync["Enter content", "Notebook" -> n] // Await;
    If[!StringQ[content], Return[Null, Module]];

    NotebookWrite[n, Cell[content, "Input"]];
  ]
]]
```

`AsyncFunction` returns a `Promise`, so its result can be awaited by another async
function or consumed with `Then`:

```wolfram
Then[asyncOperation[], Function[result, Print[result]]]
```

Use `PauseAsync[seconds] // Await` for a non-blocking delay. Use `SessionSubmit` to
schedule a microtask after the current evaluation without waiting for it.

Capture notebook or window context before entering a callback. For example,
`EvaluationNotebook[]` does not reliably resolve from a later button or timer event.

Source: https://wljs.io/llms.mdx/frontend/Advanced/Asynchronous-programming
