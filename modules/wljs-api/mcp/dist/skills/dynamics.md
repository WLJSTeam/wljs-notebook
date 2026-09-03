---
title: Dynamics and interactive evaluation in WLJS
desc: Build responsive controls, plots, pushed updates, and pointer-driven graphics with WLJS's event model.
---

# WLJS dynamics

WLJS does not implement Mathematica's automatic two-way `Dynamic` dependency model.
Choose the update mechanism explicitly:

- Use `Refresh[expr, interval]` to poll and reevaluate an expression.
- Use `Offload` to push assignments into supported frontend views or primitives.
- Use `EventHandler` with `InputRange`, `InputButton`, `InputCheckbox`, or graphics
  events for user input.
- Use `Module` instead of `DynamicModule` and connect state changes explicitly.

`CellPrint` is supported for programmatic cell creation. Mathematica-style
`Slider[Dynamic[x], ...]` should be rewritten with `InputRange` and an event handler.

## Manipulate

`Manipulate` is supported with fewer layout and control options. Use
`ContinuousAction -> True` when updates should occur during a drag. Keep the output
structure, image dimensions, and plot ranges stable so WLJS can use granular updates;
otherwise it falls back to full reevaluation.

```wolfram
Manipulate[
 Plot[Sin[a x + b], {x, 0, 6}, ImageSize->300], 
 {{a, 2, "Frequency"}, 1, 4,1}, 
 {{b, 0, "Phase"}, 0, 10,1}, 
 ContinuousAction->True
]
```

```wolfram
Manipulate[Series[Sin[x], {x,0,n}], {n,1,10,1}]
```

```wolfram
Manipulate[
 Plot[Evaluate[
   y[t] /. First[
     NDSolve[ {y''[x] == -x y[x], y[0] == a, y'[0] == b}, 
      y, {x, 0, 4}]]], {t, 0, 4}, 
  Epilog -> {Point[{4, 1/2}], Green, Arrow[{{0, a}, {1, b + a}}], Red,
     Point[{0, a}]},  PlotRange -> {{0,5}, {-6,6}}],
 {{a, 1}, -3, 3},
 {{b, 0}, -3, 3}]
```

```wolfram
Manipulate[Plot3D[Sin[n x] Cos[n y], {x,-1,1}, {y,-1,1}], {n, 1, 5, 0.3}, ContinuousAction->True]
```

```wolfram
img = ImageResize[ExampleData[ExampleData["TestImage"] // Last], 350];
Manipulate[
  ImageAdjust[img, {c,a}], 
  
  {{c, 0},0,5,0.1}, 
  {{a, 0},0,5,0.1},
  ContinuousAction->True
]
```

`Animate` uses the same optimization strategy, supports one finite-range parameter,
and accepts `RefreshRate` to throttle expensive output:

```wolfram
Animate[
  ParametricPlot[ReIm @ Exp[-I (\[Phi] + \[Gamma] I \[Phi])], {\[Phi],0,5 Pi},
    PlotLabel->StringTemplate["\[Gamma] = ``"][\[Gamma]],
    ImageSize->270
  ]
, {\[Gamma],0,0.5}, RefreshRate->0.5]
```

## Refresh

`Refresh` does not require an outer `Dynamic` and does not automatically track
symbols. Give it a polling interval or trigger it from an event:

```wolfram
Module[{count = 0}, Refresh[count = count + 1, 0.5]]
```

Use `Offload` instead when assignments can be pushed directly to a supported view.

## Specialized dynamic plot functions

Prefer `ManipulatePlot`, `ManipulateParametricPlot`, `AnimatePlot`, or
`AnimateParametricPlot` for interactive curves. `ManipulatePlot` works only for real
values.

```wolfram
ManipulatePlot[f_, {t, tmin_, tmax_}, {p1, min_, max_}, {p2, min_, max_}, ...]
```

This displays sliders for parameters (`p1`, `p2`, …) and dynamically plots `f` over the range `{tmin, tmax}`.  

### Examples

A function of two parameters:

```wolfram
ManipulatePlot[Sin[w z + p], {z,0,10}, {w, 0, 15.1, 1}, {p, 0, Pi, 0.1}]
```

Single parameter:

```wolfram
ManipulatePlot[Sin[w z], {z,0,10}, {w, 0, 15.1, 1}]
```

Multiple functions:

```wolfram
ManipulatePlot[{Sin[w z], Tan[w z]}, {z,0,10}, {w, 0, 15.1, 1}]
```

These will be plotted as separate curves.

---

## UI Elements and Event Handling

UI elements (sliders, buttons, etc.) generate **EventObjects** that can be displayed in output cells and linked to handlers:

```wolfram
EventHandler[object, handler]
```

### Button

```wolfram
EventHandler[InputButton["Press me"], Function[data, Print[data]]]
```

Creates a button that fires an event (`True`) when pressed.

### Slider

```wolfram
EventHandler[InputRange[0,10,1], Function[value, Print[value]]]
```

Creates a slider from 0 to 10 with step size 1. Moving the slider prints its value.  
You can also store it in a symbol:

```wolfram
slider = InputRange[0,10,1];
EventHandler[slider, Function[value, Print[value]]];
slider
```

Apply `EventFire` to an `EventObject` to emit its default value and initialize state:

```wolfram
slider // EventFire;
```

For multiple controls, use `Row` or `Column` for visual grouping. Use `InputGroup` to
combine controls while preserving a list or association of values.

---

## Granular updates

Define a symbol's own value before passing it through `Offload`. Later assignments are
pushed to dependent frontend objects:

### Supported objects

- `Line`  
- `Point`  
- `Sphere`  
- `Cuboid`  
- `Disk`  
- `Circle`  
- `Polygon` (2D only)  
- `Text` (inside `Graphics`)  
- `Arrow`  
- `Cylinder`  
- `Rotate` (inside `Graphics` or `Graphics3D`)  
- `Translate`  
- `GeometricTransformation`  
- `Tube`  

---

## Examples

### `Line`

```wolfram
sym = {{0,0}, {1,1}};
Graphics[Line[sym // Offload], PlotRange->{{0,1}, {0,1}}]
```

Updating `sym` in a later cell automatically updates the plot:

```wolfram
sym = {{0,0}, {0,1}}
```

---

### `Point`

```wolfram
pt = {0,0};
Graphics[Point[pt // Offload], PlotRange->{{-1,1}, {-1,1}}]

EventHandler[InputRange[-1,1,0.1], Function[value, pt = {value, 0}]]
```

Slider moves the point horizontally.

---

### `Disk` (with radius + position control)

```wolfram
radius = 1.;
pos = {0,0};

Graphics[Disk[pos // Offload, radius // Offload], PlotRange->{{-1,1}, {-1,1}}]

EventHandler[InputRange[-1,1,0.1], Function[x, pos = {x, pos[[2]]}]]
EventHandler[InputRange[-1,1,0.1], Function[y, pos = {pos[[1]], y}]]
EventHandler[InputRange[0,1,0.1], Function[r, radius = r]]
```

---

### `Text`

```wolfram
text = "hello";
Graphics[Text[text // Offload, {0,0}]]

EventHandler[InputButton["Random word!"], Function[Null, text = RandomWord[]]]
```

---

## Extended interaction with graphics primitives

Some primitives support direct user interaction:

- **2D:** `Point` (single), `Rectangle`, `Disk`  
- **3D:** `Sphere`  

Event patterns:  

- `"drag"` → make a primitive draggable and return its coordinates
- `"dragsignal"` → report dragging without moving the primitive
- `"dragall"` → report drag start, movement, and end
- `"mousemove"`, `"mousedown"`, `"mouseup"`, `"mouseover"` → pointer events
- `"click"` and `"altclick"` → click with or without the Alt key
- `"zoom"` → mouse-wheel input on supported primitives
- `"transform"` (3D) → make object draggable (returns association with `"position" -> {x,y,z}`)  

The entire 2D `Graphics` canvas additionally supports `"keydown"`,
`"capturekeydown"`, and `"onload"`.

### Example: Draggable Point

```wolfram
Graphics[EventHandler[Point[{0.,0.}], {"drag" -> Print}]]
```

Dragging the point prints its new position.

---

### Example: Canvas Click to Add Points

```wolfram
pts = {};

EventHandler[Graphics[{
  Blue, Point[pts // Offload]
}, PlotRange->{{-1,1}, {-1,1}}], {
    "click" -> Function[xy, pts = Append[pts, xy]]
}]
```

Each click adds a new point to the plot.

Source: https://wljs.io/llms.mdx/frontend/Guides/Dynamic
Migration patterns: https://wljs.io/llms.mdx/frontend/Guides/Migration
Input events: https://wljs.io/llms.mdx/frontend/Guides/UI-Events-Capture
