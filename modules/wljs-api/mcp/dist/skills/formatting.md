---
title: Formatting Wolfram expressions in WLJS
desc: Choose output forms, layouts, styles, labels, metadata, editable decorations, and custom display behavior in WLJS.
---

# Formatting expressions

Keep raw data in its own symbol and apply formatting only when producing output.
Formatting wrappers normally change presentation, not the underlying value. Convert
to text with `ToString` only when a string is actually required for export, a label,
or a text-only API.

## Choose the output form

- `StandardForm` is the normal WLJS output representation. It is decorated
  text-compatible input and rarely needs to be requested explicitly.
- `InputForm` exposes a one-dimensional representation useful for debugging or plain
  source. Use `ToString[expr, InputForm]` when that representation must be a string.
- `TraditionalForm` displays conventional mathematical notation but does not change
  evaluation and cannot be inverted reliably to input.
- `WLXForm` is used when expressions are embedded in WLX, Markdown, and slide cells.
  If embedded output looks wrong, assign `StandardForm[expr]` to the capitalized
  symbol used by the tag.

```wolfram
EmbeddedPanel = StandardForm @ Deploy @ Panel[Plot[x, {x, 0, 1}]];
```

```xml
.wlx
<EmbeddedPanel/>
```

## Common composition tools

- Numbers: `NumberForm`, `DecimalForm`, `PaddedForm`, `EngineeringForm`, `BaseForm`.
- Layout: `Row`, `Column`, `Grid`, `Item`, `TableForm`, `MatrixForm`, `Spacer`.
- Styling: `Style`, `Highlighted`, `Squiggled`, `Framed`, `Magnify`, `Rotate`,
  `Invisible`, `Pane`, `Panel`, `TabView`.
- Visible labels: `Labeled`, `Legended`, `Placed`, `Tooltip`, and legend functions.
- Invisible metadata: `Annotation`, `Indexed`, and `Interpretation`.
- Large expressions: `Iconize` and `Shallow`.
- LaTeX: `TeXForm` for conversion and `TeXView` for rendering.

Formatted `StandardForm` output is normally selectable, editable, and reusable as
Wolfram input. Apply `Deploy` last when a finished dashboard, control, or presentation
result should be non-selectable and non-editable.

Use `MakeBoxes[symbol, StandardForm|WLXForm]` or `ArrangeSummaryBox` only for custom
symbol formatting. Use HTML or WLX when the task needs web layout, CSS, JavaScript, or
reusable markup components rather than expression formatting.

Search the symbol reference before relying on a Mathematica formatting option that
may not be implemented by the WLJS frontend.

Source: https://wljs.io/llms.mdx/frontend/Guides/Formatting
Custom symbols: https://wljs.io/llms.mdx/frontend/Advanced/Decorating-symbols
