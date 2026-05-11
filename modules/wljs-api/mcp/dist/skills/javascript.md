---
title: Notes on JavaScript Cells
desc: Limitations and important features of JS cells in notebooks
---

## 1. Return Value Requirement

A JavaScript cell **must return a value**. The code is executed line by line as if it were inside an **implicit anonymous function**. No extra brackets are needed.  

```
.js
const i = 3;
return i;
```

- The returned value (`3` in this example) will be displayed in the output cell.  
- If you return a **DOM element**, it will be rendered as a normal DOM element.

---

## 2. DOM Manipulation

**Do not use** `document.body`—it can break the notebook interface.  
**Do not append anything to document.body or head**


To insert a DOM element:

1. **Create the element locally.**  
2. **Return it from the cell.**

Example:

```
.js
const element = document.createElement('span');
element.innerText = "Hello World!";

// Additional manipulation here...

// The created object is rendered in the output cell
return element;
```

---

## 3. Variable Scope

- Variables defined in a JS cell are **local to that cell**.  

---

## 4. Animations

If using `requestAnimationFrame` or `setInterval`, **store the ID** so it can be canceled when the cell is destroyed.  

Use the `ondestroy` property of the root context:

```
.js
let uid;

// Rendering code...
uid = requestAnimationFrame(render);

// Cleanup
this.ondestroy = () => {
    cancelAnimationFrame(uid);
};
...

```

- `this.ondestroy` is automatically called if the cell is removed or re-evaluated.

---

## 5. Return Statement

- A `return` at the **top-level** of the cell ends execution immediately.  
- The returned value is displayed in the output cell.

---

## 6. How to exchange data with WL

Define a symbol in `core` object as async function:

```
.js
core.sumOfArray = async (args, env) => {
    const data = await interpretate(args[0], env);
    return data.reduce((a, c) => a + c, 0);
}
```

then you can execute it and fetch the result using:

```
FrontFetch[sumOfArray[Table[i, {i,10}]]]
```

or execute only (no results):

```
FrontSubmit[sumOfArray[Table[i, {i,10}]]];
```