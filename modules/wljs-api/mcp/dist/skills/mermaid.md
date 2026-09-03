---
title: Mermaid diagram cells in WLJS
desc: Create Mermaid diagrams as dedicated WLJS cells or typed programmatic cells.
---

# Mermaid cells

Start a notebook input cell with `.mermaid`; the remaining text is Mermaid source:

```mermaid
.mermaid
flowchart TD
  A[Input] --> B{Valid?}
  B -->|Yes| C[Evaluate]
  B -->|No| D[Revise]
```

Theme configuration can be included in the source:

```mermaid
.mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ffcc00"}}}%%
graph TD
  A --> B
  A --> C
```

When creating cells programmatically, use the Mermaid subtype:

```wolfram
CellPrint[Cell["graph TD; A-->B", "Output", "Mermaid"]]
```

Keep the `.mermaid` marker only in an input cell; `Cell[..., "Output", "Mermaid"]`
receives the diagram source without the marker.

Source: https://wljs.io/llms.mdx/frontend/Cell-types/Misc
