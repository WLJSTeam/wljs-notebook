---
title: Migrating Mathematica notebooks to WLJS
desc: Adapt Mathematica notebook files, formatting, dynamic interfaces, controls, and frontend-dependent code to WLJS.
---

# Migration from Mathematica

Most kernel-side Wolfram Language works unchanged. The main differences are the
plain-text `.wln` notebook format and WLJS's browser frontend, formatting, event, and
reactivity model. Use ``Internal`Kernel`WLJSQ`` when a library must return different
frontend output.

Mathematica `.nb` files can be imported into WLJS and WLJS notebooks can be exported
as `.nb`, but conversion is not always lossless. Prefer native `.wln` files for useful
text diffs and external/LLM editing.

## Common replacements

| Mathematica pattern | WLJS pattern |
| --- | --- |
| `Dynamic[expr]` | `Refresh[expr, interval]` for polling, or `Offload` for pushed updates |
| `DynamicModule[...]` | `Module[...]` with explicit events and updates |
| `Slider[Dynamic[x], range]` | `EventHandler[InputRange[...], (x = #) &]` |
| `Checkbox[Dynamic[x]]` | `EventHandler[InputCheckbox[initial], (x = #) &]` |
| `MousePosition` dependency | A graphics `"mousemove"` event updating an offloaded symbol |
| `Print[Dynamic[expr]]` | `Print[Refresh[expr, interval]]` |

WLJS uses explicit, one-way, push-based updates rather than Mathematica's automatic
two-way dependency tracking. A value sent through `Offload` must normally be assigned
an own value before the view is created:

```wolfram
value = 1;
TextView[value // Offload]
value = 2;
```

Not every expression supports frontend evaluation or `Offload`; search the symbol
documentation before relying on it.

## Manipulate and Animate

`Manipulate` and `Animate` are supported with fewer frontend/layout options. Use
`ContinuousAction -> True` for updates during a drag. Keep output structure, image
dimensions, and `PlotRange` stable so granular updates can be used. Prefer specialized
`ManipulatePlot`, `ManipulateParametricPlot`, `AnimatePlot`, or
`AnimateParametricPlot` for interactive curves.

`Animate` supports one finite-range parameter. Use `RefreshRate` to throttle expensive
output. `Refresh` is written directly as `Refresh[expr, interval]`; it does not need an
outer `Dynamic` and does not automatically track symbols.

## Output and persistence

- Narrative cells use Markdown and `$...$`/`$$...$$` equations.
- `TraditionalForm` can render an expression but is not invertible back to input.
- `MMAView[expr]` can rasterize unsupported frontend output as a temporary workaround.
- Persist kernel-owned data with `NotebookWrite[NotebookStore["key"], value]` and read
  it with `NotebookRead[NotebookStore["key"]]`.
- Wolfram Cloud, ChatBook, and Wolfram LLM frontend services are not guaranteed or are
  unavailable; WLJS focuses on local/offline workflows and MCP connectivity.

Source: https://wljs.io/llms.mdx/frontend/Guides/Migration
