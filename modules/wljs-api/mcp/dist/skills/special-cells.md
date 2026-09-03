---
title: File, shell, and LaTeX cells in WLJS
desc: Use notebook-local file preview/editing, shell commands, and dedicated LaTeX rendering cells.
---

# Special cells

## Notebook-local files

A single filename can preview an image or print a text file from the notebook folder:

```text
randompic.png
```

To write a file, put its notebook-relative name on the first line and content on the
following lines:

```text
notes.txt
Hello from the notebook
```

Keep file access scoped to the notebook folder unless the user explicitly requests a
different path.

## Shell cells

Start shell content with `.sh`. The working directory is `NotebookDirectory[]` and
the terminal `PATH` is imported:

```shell
.sh
pwd
ls
```

For notebook-local NPM dependencies, use `npm install package --prefix .`. Long-running
shell processes can be interrupted from the notebook with Alt+`.`.

## LaTeX cells

Use `.latex` for a dedicated KaTeX equation cell:

```latex
.latex
\alpha^2 + \beta^2
```

Unlike Markdown and slide cells, a `.latex` cell does not require Markdown-level
backslash escaping or surrounding `$`/`$$` delimiters.

Source: https://wljs.io/llms.mdx/frontend/Cell-types/Misc
