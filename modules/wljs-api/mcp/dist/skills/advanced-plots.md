---
title: Plots and Graphics in WLJS
desc: Advanced 2D and 3D plotting, labels, insets, legends, rendering, and export in the WLJS frontend.
---

# Plots and graphics in WLJS

WLJS evaluates Wolfram Language plots in the kernel and displays them with its own web renderers: SVG-based `Graphics` for 2D and Three.js-based `Graphics3D` for 3D. Start with ordinary plotting functions, then check frontend-specific styling and export behavior. A Mathematica option or visual result is not automatically available in WLJS.

## 2D plots and annotations

- Use `Plot`, `ListPlot`, `ListLinePlot`, `DateListPlot`, `ParametricPlot`, `DensityPlot`, `ContourPlot`, `VectorPlot`, `ComplexPlot`, `ArrayPlot` and others, or `Graphics` as appropriate. `Frame`, `Axes`, `PlotRange`, `Filling`, `PlotStyle`, `Epilog`, and ordinary legends are available.
- Keep graphics primitives (`Line`, `Point`, `Disk`, `Arrow`, `Text`, and so on) in `Graphics`, `Prolog`, or `Epilog`. Use `Inset` when the content is an arbitrary expression, another plot, an image, or a frontend view. An inset's position is in the parent graphic's coordinates; its optional size is in those coordinates too.
- `PlotLabel`, `AxesLabel`, and `FrameLabel` are most predictable with strings. Some formatted expressions, including `TraditionalForm` and `TeXView`, also work through frontend insets. Use `HoldForm` when a displayed formula must remain unevaluated. Strings support `^{...}` and `_{...}` in plot labels and `Text` primitive, but this is a small text syntax, not full LaTeX.
- Use `Directive[FontSize -> 14]` on `FrameStyle`, `FrameTicksStyle` for plot-wide styling with `Frame->True`. `Style` supports basic text font properties inside `Graphics`; use color directives for primitives. Put a complex `Row`, `Pane`, or nested formatting expression in an `Inset` rather than directly among drawing primitives.
- Use `ImageSize -> Medium` or a modest pixel size first. The 2D renderer can suppress axes and frames on very small figures. Very large figures and many embedded views can be slow to paint and capture.
- Do not rely on `PlotTheme` for WLJS appearance. Set the required options explicitly.
- For large sets of polygons/primitives use `GraphicsComplex[verticesList, {Polygon[indices]}]`, the same works for large number of `Point`. This switches from SVG to WebGL renderer for this particular part

For an equation inside a 2D plot, position a rendered expression explicitly:

```wolfram
Plot[x^2, {x, 0, 1}, Frame -> True,
  FrameLabel -> {"x", "x^{2}"},
  Epilog -> {Inset[TeXView["x^{2}"], {0.5, 0.6}, Center]}]
```

Legends can contain formatted expressions:

```wolfram
Plot[{x, x^2}, {x, 0, 1},
  PlotLegends -> SwatchLegend[Automatic,
    {TeXView["x"], TeXView["x^{2}"]}]]
```

`LineLegend`, `PointLegend`, `SwatchLegend`, `BarLegend`, `Legended`, `Labeled`, and `Placed` are available when you need to control legend type or placement. Wrap the complete graphic in `Legended`; putting `Legended` directly inside `Graphics` is unsupported. `Row` or `Grid` can arrange complete plots outside the graphic; **they are not drawing primitives**.

## 3D graphics

Use `Plot3D`, `SphericalPlot3D`, `VectorPlot3D`, `ComplexPlot3D` and others, or `Graphics3D` for interactive scenes. `Graphics3D` accepts 3D primitives such as `Sphere`, `Cuboid`, `Cylinder`, `Polygon`, `Line`, and `Text`, with color and opacity directives. It is a separate renderer from 2D `Graphics`, so verify an option against the 3D symbol rather than assuming the 2D behavior carries over.

```wolfram
Plot3D[Sin[Sqrt[x^2 + y^2]], {x, -6, 6}, {y, -6, 6},
  PlotRange -> All, Mesh -> None, ColorFunction -> "Rainbow",
  ImageSize -> Medium]
```

For a hand-built scene, group directives with the primitives they affect:

```wolfram
Graphics3D[{
  {Opacity[0.5], Blue, Sphere[{0, 0, 1}, 1]},
  {Red, Cuboid[{-0.5, -0.5, -0.5}, {0.5, 0.5, 0.5}]},
  Text[Style["origin", FontSize -> 16], {0, 0, -0.8}]
}, Boxed -> True, ImageSize -> 300]
```

- `ViewPoint` and `ViewProjection -> "Orthographic"` or `"Perspective"` control the initial camera. The default projection is orthographic. Users can rotate the displayed scene; set a view explicitly when a reproducible figure matters.
- The default orbit controls allow pointer rotation and zoom. 
- `Boxed -> True` draws a reference box, and `AxesLabel -> {"x", "y", "z"}` labels the coordinate axes. `BoxRatios -> {sx, sy, sz}` changes the scene's displayed proportions; `Automatic` keeps natural proportions instead of rescaling every scene to a unit cube.
- `Lighting` controls default illumination; `Lighting -> None` disables the default lights. `PointLight` and `SpotLight` can be included as scene objects. Use `Directive[color, "Roughness" -> value, "Metalness" -> value, "Transmission" -> value]` for WLJS material properties; these are renderer-specific string options, with most material fractions between 0 and 1. 
- `Text` in `Graphics3D` supports `Style` or `Directive` with `FontSize` and `FontFamily`. `Text` and `Inset` are screen-facing overlays anchored to 3D points, not solid 3D geometry. For a complex formula or UI view, try a 3D `Inset` and inspect the result. Its positional size argument is currently ignored; use `ImageSizeRaw -> {width, height}` to control pixel dimensions. Keep ordinary 2D labels and legends outside the 3D scene when screen-space placement is desired.
- The 3D renderer does not implement `Dashing` or `CapForm`; do not depend on those directives for 3D lines.
- The default `"Renderer" -> "Rasterization"` is the practical starting point. `"Renderer" -> "PathTracing"` accumulates a more photorealistic image but needs more GPU time; use it when the material and lighting result warrants it.
- For large sets of polygons use `GraphicsComplex[verticesList, {Polygon[indices]}]`, the same works for `Point`. You can provide `Texture`, `VertexNormals` and `VertexColors` to `GraphicsComplex` as options. They must be lists of with numeric tiplets (not RGBColor objects!)

### SpinShow

`"SpinShow"` rotates a `Graphics3D` scene around its vertical axis. It is disabled by default:

- `"SpinShow" -> True` or `"SpinShow" -> Automatic`: rotate continuously at the default speed of 0.6 radians per second.
- `"SpinShow" -> angle`: swing between `-Abs[angle]` and `Abs[angle]` radians, rather than making full turns.
- `"SpinShow" -> {angle, speed}`: use the same continuous or bounded motion with a custom speed in radians per second. For example, `{Pi/3, 0.4}` swings through a 120-degree arc. `False` or zero angle disables the animation.

```wolfram
Graphics3D[{Orange, Sphere[], Blue, Cuboid[{1, 0, 0}, {2, 1, 1}]},
  "SpinShow" -> {Pi/3, 0.4}, ImageSize -> 300]
```

The animation pauses when the plot is offscreen, hidden, or covered.

### Path tracing and render time

`"Renderer" -> "PathTracing"` enables progressive GPU path tracing. Its main tuning options are:

| Option | Effect | Renderer default |
| --- | --- | --- |
| `"Bounces"` | Maximum light bounces per ray | `5` |
| `"EnvironmentIntensity"` | Ambient environment strength | `1` |
| `"MultipleImportanceSampling"` | Improve sampling for `PointLight` and `SpotLight` scenes | `False` |

Change these only when the default quality or speed needs tuning. A moving `SpinShow` scene does not give the tracer a stationary view in which to accumulate samples, so omit spinning for a clean still image.

`"SleepAfter" -> milliseconds` stops continuous rendering after an idle interval to limit GPU use. The current renderer defaults to 1000 ms for rasterization and 10000 ms for path tracing; camera or scene changes wake it again. For path-traced export, allow rendering to continue before capture. `"ExposureTime"` is a separate capture delay in **seconds**:

```wolfram
scene = Graphics3D[{Gray, Cuboid[], Red, Sphere[{0, 0, 2}]},
  "Renderer" -> "PathTracing", "SleepAfter" -> 10000];
image = Rasterize[scene, "ExposureTime" -> 10];
Export["scene.png", image]
```

## Inspecting and exporting the rendered result

To obtain an image of what WLJS actually displayed, use `Rasterize[plot, "ExposureTime" -> 5]`. The result is an `Image`, which can be inspected or exported with `Export["figure.png", image]`. Labels, legends, insets, LaTeX, and 3D rendering can finish asynchronously; increase the exposure time only if the capture is incomplete. For a PDF of the composed expression, use `Export["figure.pdf", plot, "ExposureTime" -> 5]` directly.

Frontend `Rasterize` and PDF `Export` require the WLJS desktop app; they are unavailable in server mode. These are blocking operations.

If a plot differs from Mathematica, inspect the actual WLJS output before adding more formatting. For supported options, consult [`Graphics3D`](https://wljs.io/llms.mdx/frontend/Graphics3D/Graphics3D), [3D `Directive`](https://wljs.io/llms.mdx/frontend/Graphics3D/Directive), and [`Inset`](https://wljs.io/llms.mdx/frontend/Graphics/Inset). For expression layout and output forms, see the [Formatting guide](https://wljs.io/llms.mdx/frontend/Guides/Formatting).
