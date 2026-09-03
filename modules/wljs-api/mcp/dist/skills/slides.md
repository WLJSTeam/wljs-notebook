---
title: Slide cells in WLJS
desc: Build Reveal.js presentations with Markdown, WLX, HTML, fragments, events, and per-slide options.
---

# Slide cells

Start a cell with `.slide`. Slide content supports Markdown, HTML, and WLX.

One `.slide` cell commonly represents one slide, but a cell may contain multiple
slides separated by `---`:

```markdown
.slide
# First slide

Content

---

# Second slide

More content
```

Use `.slides` to merge slide cells from the notebook into one continuous
presentation.

## Layout and slide options

Use blank lines around HTML blocks when mixing them with Markdown. Common slide
classes and Reveal attributes are attached with a `.slide` comment:

```markdown
.slide
<!-- .slide: class="slide-standard" data-transition="fade" data-background-color="#172033" -->

# Title

<div class="flex justify-between">

<div>Left column</div>

<div>Right column</div>

</div>
```

Use `slide-standard-scroll` for long scrollable content. Background images use
`data-background-image`, optionally with `data-background-size`,
`data-background-position`, and `data-background-opacity`.

## Fragments

```markdown
Appears later
<!-- .element: class="fragment fade-up" data-fragment-index="1" -->
```

Reveal fragment classes include `fade-in`, `fade-out`, `fade-up`, `fade-down`,
`fade-left`, `fade-right`, `highlight-red`, `highlight-green`, `grow`, and `shrink`.

## Wolfram expressions and equations

Assign a figure or other expression to a capitalized symbol, evaluate it, and embed
it as a tag:

```wolfram
MyFigure = Plot[Sin[x], {x, 0, 2 Pi}, ImageSize -> 500];
```

```markdown
.slide
# Result

<MyFigure/>
```

If an expression has no useful `WLXForm`, wrap it with `StandardForm` before assigning
it to the embedded symbol. Slides use KaTeX; escape backslashes in equations.

## Slide events

Put a listener in the slide and register the handler before evaluating the slide:

```wolfram
EventHandler["demoSlide", {
  "Slide" -> (Print["revealed"] &),
  "fragment-1" -> (Print["fragment revealed"] &)
}]
```

```markdown
.slide
# Event-driven slide

Details <!-- .element: class="fragment" data-fragment-index="1" -->

<SlideEventListener Id={"demoSlide"}/>
```

Other lifecycle patterns include `"Mounted"`, `"Left"`, and `"Destroy"`.

Source: https://wljs.io/llms.mdx/frontend/Cell-types/Slide
