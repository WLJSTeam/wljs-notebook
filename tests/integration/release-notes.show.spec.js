// @ts-check
import { test, expect } from '@playwright/test';
import { url, delay, evaluate, clearCell } from './common';

test.describe.configure({ mode: 'default' });

test.describe('Release note expressions (3.0.5+)', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    page.route('**', route => route.continue());

    await page.goto(url);
    await delay(6000);
    page.on('console', msg => console.log(msg.text()));
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  const snapshot = async (expression, filename, timeout = 15000, extra = 1000) => {
    await clearCell(page);
    const outputCell = await evaluate(page, expression, timeout, extra);
    await expect(outputCell).toHaveScreenshot(['screenshorts', filename]);
  };

  test('3.0.5 InputColor', async () => {
    await snapshot('InputColor[{1, 0, 0}]', '305-input-color.png');
  });

  test('3.0.5 Image in HTMLView', async () => {
    await snapshot('ExampleData[{"TestImage", "Lena"}] // HTMLView', '305-html-image.png', 30000, 2000);
  });

  test('3.0.5 TeXView ImageSize', async () => {
    await snapshot('TeXView[TeXForm[Integrate[f[x], x]], ImageSize -> 180]', '305-tex-view.png');
  });

  test('3.0.5 RGB Image3D', async () => {
    await snapshot('SeedRandom[305]; Image3D[RandomReal[1, {5, 10, 10, 3}], BoxRatios -> {1, 1, 1}]', '305-rgb-image3d.png', 30000, 2500);
  });

  test('3.0.5 Inset size', async () => {
    await snapshot('g = Plot[Sin[x], {x, 0, 10}, Frame -> True, FrameTicks -> None, AspectRatio -> Full]; Graphics[{Inset[g, Automatic, Automatic, {2, 2}], Circle[{0, 0}, 2]}, Frame -> True, ImageSize -> 150]', '305-inset-size.png', 30000, 2000);
  });

  test('3.0.7 compound Disk and Circle coordinates', async () => {
    await snapshot('pts = {{-1., -1.}, {1., 1.}}; Graphics[{Disk[pts // Offload, 0.08], Red, Circle[pts // Offload, 0.11]}, PlotRange -> 1.3, ImageSize -> 180, "Controls" -> False]', '307-compound-disk-circle.png');
  });

  test('3.0.8 typed Shallow', async () => {
    await snapshot('Table[{i, j}, {i, 1000}, {j, 10}] // Shallow', '308-shallow-table.png');
  });

  test('3.0.8 opaque values in Shallow', async () => {
    await snapshot('{{{{ByteArray[{1, 2, 3, 4}]}, Red, I}}, ByteArray[Range[0, 255]]} // Shallow', '308-shallow-byte-array.png');
  });

  test('3.0.8 typed Shallow patterns', async () => {
    await snapshot('Shallow[Plot[x, {x, 0, 1}], {2, 1}]', '308-shallow-plot.png');
  });

  test('3.0.8 offloaded BezierCurve', async () => {
    await snapshot('pts = {{0., 0.}, {0.2, 1.}, {0.8, -1.}, {1., 0.}}; Graphics[{Thick, BezierCurve[pts // Offload]}, PlotRange -> All, ImageSize -> 180]', '308-offloaded-bezier-curve.png');
  });

  test('3.0.8 Around rounding', async () => {
    await snapshot('Around[1.234567, 0.006789]', '308-around.png');
  });

  test('3.0.9 NumericArray', async () => {
    await snapshot('NumericArray[{1, 2, 4}]', '309-numeric-array.png');
  });

  test('3.0.9 Row layout options', async () => {
    await snapshot('Row[{Graphics[{Red, Disk[]}, ImageSize -> {18, 18}, PlotRange -> 2], Style["Hey there", Gray]}, Alignment -> {{Right, Left}, Center}, ImageSize -> 400]', '309-row-options.png');
  });

  test('3.0.9 Grid layout options', async () => {
    await snapshot('Grid[Table[x, {3}, {7}], Dividers -> {{False, False, True}, {False, True}}, Spacings -> 2, Alignment -> {{Right, Center, Left}, Center}]', '309-grid-options.png');
  });

  test('3.0.9 Column layout options', async () => {
    await snapshot('Column[{1, 12, 123, 1234}, Center, Dividers -> All, Spacings -> 1]', '309-column-options.png');
  });

  test('3.0.9 TableForm layout options', async () => {
    await snapshot('TableForm[{{5, 7}, {4, 2}, {10, 3}}, TableHeadings -> {{"Group A", "Group B", "Group C"}, {"y1", "y2"}}, TableAlignments -> Center, TableSpacing -> {2, 1}]', '309-table-form-options.png');
  });

  test('3.0.9 Deploy wrapper', async () => {
    await snapshot('Deploy[Panel[Row[{Graphics[{Red, Disk[]}, ImageSize -> 20], "Deployed"}, Spacings -> 1]]]', '309-deploy.png');
  });

  test('3.0.9 Panel appearance and background', async () => {
    await snapshot('Column[{Panel[Plot[x, {x, 0, 1}, ImageSize -> 140], Background -> LightYellow], Panel["Frameless", Appearance -> "Frameless"]}]', '309-panel-options.png', 30000, 2000);
  });

  test('3.0.9 Locator primitive', async () => {
    await snapshot('Plot[x, {x, 0, 1}, Epilog -> {Locator[{0.3, 0.7}]}]', '309-locator.png', 30000, 2000);
  });

  test('3.0.9 TextView multiline and ImageSize', async () => {
    await snapshot('Column[{TextView["Hey!"], TextView["Hey!\\nThere"], TextView["A very long line here", ImageSize -> 100]}]', '309-text-view.png');
  });

  test('3.0.9 frontend string operators', async () => {
    await snapshot('sqval = 0.3; TextView[StringJoin["sqval = ", ToString[NumberForm[Sqrt[sqval], {4, 2}]]] // Offload]', '309-string-operators.png');
  });

  test('3.0.9 frontend Association keys', async () => {
    await snapshot('a = <|"a" -> 1, "b" -> 0.3|>; Column[{TextView[a["a"] // Offload], TextView[a["b"] // Offload]}]', '309-association-keys.png');
  });

  test('3.0.9 Transparent graphics directive', async () => {
    await snapshot('Graphics[{Transparent, Disk[], Red, Thick, Circle[]}, ImageSize -> 150]', '309-transparent.png');
  });

  test('3.1.0 Exception object', async () => {
    await snapshot('Exception["DataConsistencyError"]', '310-exception.png');
  });

  test('3.1.0 symbolic arrays, matrices, and vectors', async () => {
    await snapshot('Column[{ArraySymbol["a", {2, 3}], MatrixSymbol["m", {2, 3}], VectorSymbol["v", 45]}]', '310-symbolic-arrays.png');
  });

  test('3.1.0 non-commutative algebra', async () => {
    await snapshot('ClearAll[x,y,z]; alg = CliffordAlgebra[{{x}, {y}, {z}}]; NonCommutativeExpand[(x + 2 y + 3 z) ** (4 x + 5 y + 6 z), alg]', '310-noncommutative-algebra.png');
  });

  test('3.1.0 IncrementalObject', async () => {
    await snapshot('IncrementalObject["Identity"][{1, 2}]', '310-incremental-object.png');
  });

  test('3.1.0 standard colors', async () => {
    await snapshot('Row[{StandardBlue, StandardRed}, Spacings -> 1]', '310-standard-colors.png');
  });

  test('3.1.0 TeXView in plot labels', async () => {
    await snapshot('Plot[x x, {x, 0, 1}, PlotLegends -> Placed[{Row[{TeXView["x^2"], " function"}]}, {0.25, 0.7}], FrameLabel -> {None, Row[{TeXView["x^2"], " function"}, Spacings -> 1]}, Frame -> True]', '310-tex-plot-labels.png', 30000, 2500);
  });

  test('3.1.0 Sound sequence', async () => {
    await snapshot('Sound[{{SoundNote[{"A4", "C4"}]}, SoundNote["E4"], SoundNote["G4"], SoundNote["C5"]}]', '310-sound-sequence.png');
  });

  test('3.1.0 music objects', async () => {
    await snapshot('Column[{MusicChord["CMajor7"], MusicScale["Dorian"]}]', '310-music-objects.png', 30000, 2000);
  });

  test('3.1.0 colors in Manipulate', async () => {
    await snapshot('Manipulate[Graphics[{Hue[h, l], Disk[]}, ImageSize -> Small], {h, 0, 1, 0.2}, {l, 0, 1, 0.2}, ContinuousAction -> True]', '310-manipulate-colors.png', 30000, 2500);
  });

  test('3.1.0 FrontFileDownload', async () => {
    await snapshot('FrontFileDownload[ByteArray[{1, 2, 3}], "test.bin"]', '310-front-file-download.png');
  });

  test('3.1.1 TraditionalForm matrix', async () => {
    await snapshot('MatrixForm[PauliMatrix[3]] // TraditionalForm', '311-traditional-matrix.png');
  });

  test('3.1.1 shared GeometricTransformation data', async () => {
    await snapshot('shape = {Red, Cuboid[{-1, -1, -1}, {1, 1, 1}]}; Row[{Graphics3D[GeometricTransformation[shape, TranslationTransform[{1, 0, 0}]], ImageSize -> 130], Graphics3D[GeometricTransformation[shape, ScalingTransform[{0.5, 0.5, 0.5}]], ImageSize -> 130]}]', '311-geometric-transformation.png', 30000, 2500);
  });

  test('3.1.3 Print ordering', async () => {
    await clearCell(page);
    await evaluate(page, 'Print["1"]; Print["2"]; Print["3"]; 4', 15000, 1000);
    await expect(page.locator('.cout')).toHaveCount(4);
    await expect(page.locator('.cout')).toHaveText(['1', '2', '3', '4']);
  });

  test('3.1.3 URL and File representations', async () => {
    await snapshot('Column[{URL["https://google.com?q=1"], File["3.1.3.wln"], File["missing.wln"]}]', '313-url-file.png');
  });

  test('3.1.3 GeneralizedPower', async () => {
    await snapshot('ClearAll[f,a];GeneralizedPower[f, a, 2]', '313-generalized-power.png');
  });

  test('3.1.4 legend styling', async () => {
    await snapshot('Plot[{x, 2 x}, {x, 0, 1}, PlotLegends -> SwatchLegend[Automatic, {"x", "2x"}, LegendFunction -> "Panel"]]', '314-legend-panel.png', 30000, 2000);
  });

  test('3.1.4 legend layout and margins', async () => {
    await snapshot('Plot[{x, 2 x}, {x, 0, 1}, PlotLegends -> Placed[SwatchLegend[Automatic, TraditionalForm /@ {x, 2 x}, LegendFunction -> "DarkFrame", RoundingRadius -> 0, Background -> White, LegendMargins -> {{15, 10}, {5, 5}}, LegendLayout -> "Row"], {0.45, 0.25}]]', '314-legend-layout.png', 30000, 2000);
  });

  test('3.1.4 BarLegend', async () => {
    await snapshot('BarLegend["Thermometer", 3, LegendLabel -> "Temperature", LabelStyle -> Directive[FontSize -> 14]]', '314-bar-legend.png', 30000, 2000);
  });

  test('3.1.4 ContourPlot BarLegend', async () => {
    await snapshot('ContourPlot[(x^2 - y^2)/(x^2 + y^2)^2, {x, -1, 1}, {y, -1, 1}, Contours -> 4, PlotLegends -> BarLegend[Automatic, 3, ImageSize -> {20, 220}, LabelStyle -> Directive[FontSize -> 14], LegendLabel -> "f(x,y)"], ImageSize -> {220, 220}, ColorFunction -> "Rainbow", ClippingStyle -> Automatic]', '314-contour-bar-legend.png', 45000, 3000);
  });

  test('3.1.4 logarithmic plots', async () => {
    await snapshot('Row[{LogPlot[x + Exp[x/10], {x, 0, 100}, Frame -> True, ImageSize -> 220], LogLogPlot[x + Exp[x/10], {x, 1, 100}, Frame -> True, ImageSize -> 220]}]', '314-log-plots.png', 45000, 3000);
  });

  test('3.1.4 Overlay', async () => {
    await snapshot('Overlay[{Style[1, Red, 24], Style[4, Blue, 16]}]', '314-overlay.png');
  });

  test('3.1.4 InputRange appearances', async () => {
    await snapshot('Row[{InputRange[0, 1, Appearance -> "Vertical"], InputRange[0, 1, Appearance -> "Number"]}, Spacings -> 2]', '314-input-range-appearances.png');
  });

  test('3.1.4 InputButton states', async () => {
    await snapshot('Column[{InputButton["Disabled", "StateExpression" -> False], InputButton["Busy", "StateExpression" -> "Busy"]}]', '314-input-button-states.png');
  });

  test('3.1.4 frontend comparison operators', async () => {
    await snapshot('Column[{TextView[(1 == 1) // Offload], TextView[(1 != 2) // Offload]}]', '314-offloaded-comparisons.png');
  });

  test('3.1.4 ComplexPlot custom shading', async () => {
    await snapshot('ComplexPlot[z^2 + z, {z, -2 - 2 I, 2 + 2 I}, ColorFunction -> Function[{z}, If[Re[z] > 0, Red, Blue]], ImageSize -> 260]', '314-complex-plot-shading.png', 45000, 3000);
  });

  test('3.1.4 AsyncFunction Return', async () => {
    await snapshot('AsyncFunction[Null, Return["Yes"]; "No"][] // WaitAll', '314-async-return.png');
  });

  test('3.1.4 WhileAsync', async () => {
    await snapshot('i = 0; WhileAsync[i < 10, i++; If[EvenQ[i], Continue[]]; If[i >= 7, Break[]]] // WaitAll; i', '314-while-async.png');
  });
});
