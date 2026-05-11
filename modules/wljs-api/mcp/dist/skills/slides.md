---
title: Notes on Slide Cells
desc: Instructions for creating presentations in a notebook
---

You can create **slide cells** using **Reveal.js** with Markdown as the primary language for slide content.  

- To render a slide, specify `"Slide"` or `"Reveal"` as contentType in the `cellPrint` function.  
- **One cell = one slide**. To create multiple slides, print multiple cells.  
- You can use **HTML** and script tags alongside Markdown within slides

### Examples

#### HTML in a Slide

```
.slide
# Title

<iframe
  style="margin-left:auto; margin-right:auto; border-radius: 10px"
  width="600"
  height="500"
  src="https://jerryi.github.io/wljs-docs/">
</iframe>
```

#### LaTeX Equations

```
.slide
# LaTeX Equations (use double backslashes)

$$
E = \\hbar \\omega
$$
```

#### Slide Animations (Fragments)

```
.slide
# Fragments Example

This content is always visible.

<span style="color:red">Appears later</span> <!-- .element: class="fragment" data-fragment-index="1" -->

And this one <!-- .element: class="fragment fade-up" data-fragment-index="2" -->
```

- Use **fragment classes** to create step-by-step reveal effects.

---

To embed Wolfram Language Plots:
- create a Wolfram Language cell and assign a plot or image to `YourSymbolName`, **that starts from capital letter**
- evaluate this Wolfram cell
- create a slide cell with `<YourSymbolName/>` tag somewhere on a slide. A plot will be embeeded to a slide as if it was a normal HTML tag