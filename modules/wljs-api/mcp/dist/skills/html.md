---
title: HTML cells in WLJS
desc: Author raw HTML cells and embed Wolfram Language expressions with WSP templates.
---

# HTML cells

Start an input cell with `.html` and put the HTML on following lines:

```html
.html
Here is my <h3>Hello World</h3>
```

HTML cells are evaluated like other input cells. Return only content intended for the
cell output; do not create a complete document with `<html>`, `<head>`, or `<body>`,
and do not append content to `document.body`.

HTML parsing is more permissive than WLX because HTML tags are not converted into a
Wolfram expression tree. Prefer `.wlx` when Wolfram expressions, reusable components,
or strict tag/argument semantics are central to the result.

## Embed Wolfram expressions with WSP

Use `<?wsp ... ?>` inside an HTML cell to evaluate a Wolfram expression:

```html
.html
<h3>Today is <?wsp Now // TextString ?></h3>
```

Use self-closing syntax for void elements when content may later be reused in WLX,
Markdown, or slide cells:

```html
<img src="image.png"/>
<br/>
<input type="text"/>
```

Source: https://wljs.io/llms.mdx/frontend/Cell-types/HTML
