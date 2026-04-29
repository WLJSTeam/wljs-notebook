---
title: Interactive evaluation in Wolfram Language within WLJS Environment
desc: A guide to creating sliders, manipulating expressions, dynamically plotting, and interactive graphics.
---

Some symbols commonly available in Mathematica are **not supported** here:

- `Dynamic`  
- `DynamicModule`   
- `Refresh`  
- `CellPrint`   
- `Out`  
- `Slider`  

## Manipulate
Offers limited features, but generally can work following these examples:

```wolfram
Manipulate[
 Plot[Sin[a x + b], {x, 0, 6}, ImageSize->300], 
 {{a, 2, "Frequency"}, 1, 4,1}, 
 {{b, 0, "Phase"}, 0, 10,1}, 
 ContinuousAction->True,
 Appearance->None
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

And Animate:

```wolfram
Animate[
  ParametricPlot[ReIm @ Exp[-I (\[Phi] + \[Gamma] I \[Phi])], {\[Phi],0,5Pi}, 
    PlotLabel->StringTemplate["\[Gamma] = ``"][\[Gamma]],
    ImageSize->270
  ]
, {\[Gamma],0,0.5}, Appearance->None]
```


## Dynamic Plot Function

`ManipulatePlot` works only for **real values**.  

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

---

## Granural updates

Use `Offload` expression with

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

# Extended Interaction with Graphics Primitives

Some primitives support direct user interaction:

- **2D:** `Point` (single), `Rectangle`, `Disk`  
- **3D:** `Sphere`  

Event patterns:  

- `"drag"` → make draggable (returns new position)  
- `"mousemove"` → listen to cursor position (returns coordinates)  
- `"click"` → trigger handler on click (returns click position)  
- `"transform"` (3D) → make object draggable (returns association with `"position" -> {x,y,z}`)  

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
