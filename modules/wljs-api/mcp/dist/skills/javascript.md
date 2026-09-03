---
title: JavaScript and MJS cells in WLJS
desc: Author isolated browser JavaScript cells or bundled module cells with correct output and cleanup behavior.
---

# JavaScript cells

## Vanilla `.js`

A `.js` cell runs as an anonymous function in an isolated scope. Declared variables
are local to the cell; shared frontend state is reachable through `window` or `core`.
Return the value that the output cell should display. A returned DOM node is mounted
as the output:

```javascript
.js
const element = document.createElement("span");
element.textContent = "Hello World";
return element;
```

Do not append elements to `document.body` or `document.head`.

## Cleanup

Assign `this.ondestroy` whenever the cell starts timers, animation frames, observers,
listeners, or third-party widgets. It is called when the cell is removed or
reevaluated:

```javascript
.js
const element = document.createElement("div");
const timer = setInterval(() => element.textContent = new Date().toISOString(), 1000);
this.ondestroy = () => clearInterval(timer);
return element;
```

## Module `.mjs`

Use `.mjs` when imports or NPM packages are required. Node.js must be installed. MJS
cells are bundled automatically and store the bundled output in the notebook.

Unlike `.js`, publish output with `this.return(...)`. Use `this.after` for work that
must happen after the returned DOM node has mounted:

```javascript
.mjs
import Widget from "some-package";

const root = document.createElement("div");
this.return(root);

let widget;
this.after = () => {
  widget = new Widget({ container: root });
};
this.ondestroy = () => widget?.dispose();
```

Install notebook-local packages from a `.sh` cell with an explicit local prefix:

```shell
.sh
npm install some-package --prefix .
```

## Wolfram/frontend communication

Frontend symbols can be defined on `core`. Evaluate Wolfram arguments with
`interpretate`, then call the symbol from Wolfram Language with `FrontFetch` when a
result is needed or `FrontSubmit` for fire-and-forget execution:

```javascript
.js
core.sumOfArray = async (args, env) => {
  const data = await interpretate(args[0], env);
  return data.reduce((sum, value) => sum + value, 0);
};
return "sumOfArray registered";
```

```wolfram
FrontFetch[sumOfArray[Range[10]]]
```

Source: https://wljs.io/llms.mdx/frontend/Cell-types/Javascript
