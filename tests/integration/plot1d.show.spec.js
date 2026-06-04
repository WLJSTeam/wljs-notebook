// @ts-check
import { test, expect } from '@playwright/test';
import {url, delay, evaluate, clearCell} from './common'

test.describe.configure({ mode: 'default' });

test.describe('1D Plot', () => {
  let page;
  test.beforeAll(async ({ browser }) => {
       
      const context = await browser.newContext();
      page = await context.newPage();
      page.route('**', route => route.continue());
      
      await page.goto(url);
      await delay(6000);
      page.on('console', msg => console.log(msg.text()));
  });

  test.afterAll(async ({ browser }) => {
      browser.close;
  });

  test('Simple plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[(*FB[*)((1)(*,*)/(*,*)(x))(*]FB*), {x,0,1}, PlotStyle->Red, Frame->True, FrameLabel->{"x-axis", "y-axis"}, FrameStyle->Directive[FontSize->14], FrameTicksStyle->Directive[FontSize->14],Epilog->{Cyan, Line[{{-10,10}, {10,10}}]}]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plot.png']);
  });  

  test('Filling plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[{Sin[x] + x/2, Sin[x] + x}, {x, 0, 10}, Filling -> {1 -> {2}}]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plotfilling.png']);
  }); 

  test('Multiple filling plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[Evaluate[Table[BesselJ[n, x], {n, 4}]], {x, 0, 10}, Filling -> Axis]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plotmultifilling.png']);
  }); 
  
  test('Date plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'DateListPlot[Transpose[{{DateObject[{2022, 12}], DateObject[{2023, 12}], DateObject[{2024, 2}]}, {1,2,3}}]]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'dateplot.png']);
  }); 
  
  test('Legended Accumulated plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'SeedRandom[10]; ListLinePlot[Table[Accumulate[RandomReal[{-1, 1}, 250]], {3}], Filling -> Axis, PlotLegends -> {"one", "two", "three"}]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'legendedaccplot.png']);
  });   


  test('Legended BinomialDistribution plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ListPlot[Table[{k, PDF[BinomialDistribution[50, p], k]}, {p, {0.3, 0.5, 0.8}}, {k, 0, 50}], Filling -> Axis, PlotLegends -> {0.3, 0.5, 0.8}]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'BinomialDistribution.png']);
  });
  
  test('Legended Swatch plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[{Sin[x], Cos[x]}, {x, 0, 5}, PlotLegends -> SwatchLegend["Expressions"]]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'swatchplot.png']);
  });

  test('Legended Swatch plot with StandardForm', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[{Sin[x], Cos[x]}, {x, 0, 5}, PlotLegends -> SwatchLegend[{Sin[x], "Hey"}]]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'swatchplot2.png']);
  });  

  test('Legended Swatch plot with TraditionalForm', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[{Sin[x], Cos[x]}, {x, 0, 5}, PlotLegends -> SwatchLegend[{Sin[x]//TraditionalForm, "Hey"}]]', 15000, 3500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'swatchplot3.png']);
  });   

  test('PlotLabel with TraditionalForm', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[Sin[x], {x, 0, 5}, PlotLabel -> TraditionalForm[Sin[x]]]', 15000, 5500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'potLabelTrad.png']);
  });    

  test('Plot with Gridlines', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, ' Plot[{Sin[x], Cos[x]}, {x,0,10}, Frame->True, GridLines->Automatic]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'gridlinesp.png']);
  });
 
  
  test('Point Legend', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'PointLegend[{Red, Green, Blue}, {"red", "green", "blue"}]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'pointlegend.png']);
  });  

  test('Legended Line plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[{Sin[x], Cos[x]}, {x, 0, 5}, PlotLegends -> LineLegend["Expressions"]]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'lineplot.png']);
  });

  test('Legended Markdown plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[{Sin[x], Cos[x]}, {x, 0, 5}, PlotLegends -> LineLegend[Automatic, {CellView["$\\\\sin(x)$", "Display"->"markdown"],CellView["$\\\\cos(x)$", "Display"->"markdown"]}]]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'markdownplot.png']);
  });

  test('Legended Prime Numbers', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Legended[Grid[Partition[Table[If[PrimeQ[n], Item[n, Background -> LightBlue], n], {n, 100}], 10], Frame -> All], SwatchLegend[{LightBlue}, {"prime numbers"}]]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'legendedPrime.png']);
  });

  test('Placed Swatch Legend', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[{x,x^2}, {x,0,1}, PlotLegends->Placed[SwatchLegend[Automatic], {0.2,0.2}]]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'placedSwatch.png']);
  });  

  test('Placed Swatch Legend 2', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[{x,x^2}, {x,0,1}, PlotLegends->Placed[SwatchLegend[Automatic], After]]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'placedSwatch2.png']);
  });   

  test('Labeled Plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Labeled[Plot[{x,x^2}, {x,0,1}], Red, Bottom]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'labeled1.png']);
  });   

  test('Labeled Plot pointa', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ListPlot[MapThread[Labeled, {{{1,2},{2,4},{4,6}}, {"1","2","3"}}]]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'labeledPoints.png']);
  });   


  
  test('Plot framed axes labels shifted', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[x, {x,0,1}, Frame->True, FrameLabel->{{"x-axis", {-20,0}}, {"y-axis", {0,0}}}]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plot1daxesshifted.png']);
  });  
  
  test('Plot framed axes labels shifted 2', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[x, {x,0,1}, Frame->True, FrameLabel->{{"x-axis", {-20,0}}, {"y-axis"}}]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plot1daxesshifted2.png']);
  });    

  test('Plot framed axes labels Automatic', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[x, {x,0,1}, Frame->True, FrameLabel->Automatic]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plot1dframedautomatic.png']);
  });   

  test('Plot axes labels Automatic', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[x, {x,0,1}, AxesLabel->Automatic]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plot1dnonframedautomatic.png']);
  });   

  test('Plot axes labels TeX', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[x, {x,0,1}, Frame->True, FrameLabel->{{HoldForm[CellView["\\alpha", "Display"->"latex"]], {0,-5}},  None}]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plot1dnonframedTex.png']);
  });   

  
  

});