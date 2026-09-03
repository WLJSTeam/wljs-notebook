---
title: Markdown cells in WLJS
desc: Author narrative cells with WLJS Markdown, KaTeX, HTML, WLX, drawings, and notebook-specific directives.
---

# Markdown cells

Start an input cell with `.md` and put Markdown on following lines:

```markdown
.md
# Notebook title
This is **narrative content**.
```

Markdown cells are evaluated and inherit HTML and WLX features. Plain HTML, styles,
scripts, and capitalized Wolfram symbol tags can therefore be mixed with Markdown.

## WLJS extensions

- Highlight text with `==important==`.
- Create an Excalidraw canvas with `!![]`.
- Place `@bookmark` where a notebook bookmark should scroll.
- Use `<PageBreakAbove/>` or `<PageBreakBelow/>` to control printed/PDF page breaks.
- Admonition types include `tip`, `info`, `warning`, `danger`, and `todo`:
- Always close self-closing `<img/>`, `<input/>` and other HTML tags

```markdown
:::warning
Check the parameter range before evaluating.
:::
```

## Mathematics

WLJS uses KaTeX. Use `$...$` inline and `$$...$$` for display equations. Markdown
requires backslashes to be escaped:

```markdown
.md
The state is $\\psi$.

$$
E = \\hbar \\omega
$$
```

Use a `.latex` cell when escaping makes a large equation awkward.

## Embed Wolfram output

Assign an expression to a capitalized symbol in a Wolfram cell, evaluate it, then use
that symbol as a WLX tag:

```wolfram
Figure = Plot3D[Sin[x] Cos[y], {x, -5, 5}, {y, -5, 5}];
```

```markdown
.md
Here is the interactive figure:

<Figure/>
```

The initial capital letter is required by WLX syntax. Inline Wolfram evaluation is
also possible, for example `<ToExpression>0.6 180/Pi</ToExpression>`.

Source: https://wljs.io/llms.mdx/frontend/Cell-types/Markdown
