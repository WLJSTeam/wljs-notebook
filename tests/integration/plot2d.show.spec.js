// @ts-check
import { test, expect } from '@playwright/test';
import {url, delay, evaluate, clearCell} from './common'

test.describe.configure({ mode: 'default' });


test.describe('2D Plot', () => {
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

  test('Graphics Basics 1', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graphics[Style[RegularPolygon[5], Orange], ImageSize->100]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graphicsRegularPoly.png']);
  });

  test('Array Plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ArrayPlot[Table[i*j / 25.0, {i, 5}, {j, 5}]]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'arrayPlot.png']);
  });

  test('Graphics Basics 2', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, ' Graphics[Table[Circle[{x, 0}, x], {x, 10}], ImageSize->100]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graphicsBasic2.png']);
  });  

 

  

  test('Contour plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ContourPlot[Cos[x] + Cos[y], {x, 0, 4 Pi}, {y, 0, 4 Pi}, PlotLegends->Automatic]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'countour.png']);
  });  

  test('List contour', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ListContourPlot[Table[Sin[i + (*SpB[*)Power[j(*|*),(*|*)2](*]SpB*)], {i, 0, 3, 0.2}, {j, 0, 3, 0.2}], ColorFunction -> "SunsetColors"]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'listcontour.png']);
  }); 

  test('Density plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'CoolColor[ z_ ] := RGBColor[z, 1 - z, 1]; DensityPlot[Sin[x y], {x, -1, 1}, {y, -1, 1}, ColorFunction -> CoolColor]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'densityplot.png']);
  }); 
  
  test('Vector plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'VectorPlot[{x + y, y - x}, {x, -3, 3}, {y, -3, 3}]', 15000, 1000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'vector.png']);
  }); 

  test('Complex Plot (Texture mapping)', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ComplexPlot[z^2 + z, {z, -5 - 5I, 5 + 5I}]', 15000, 1000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'complexplot.png']);
  });   
  
  test('Matrix plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'MatrixPlot[Fourier[Table[UnitStep[i, 4 - i] UnitStep[j, 7 - j], {i, -7, 7}, {j, -7, 7}]]]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'matrix.png']);
  });   


  test('Raster plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graphics[{{Red, Disk[{5, 5}, 4]}, Raster[Table[{x, y, x, y}, {x, .1, 1, .1}, {y, .1, 1, .1}]]}]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'raster.png']);
  });
  
  test('Image Negate', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ImageResize[Import[FileNameJoin[{"attachments", "tstballs-d08.png"}]], 450] // ColorNegate', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'imagenegate.png']);
  });
  
  test('Image Features', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'With[{img = Image[Import[FileNameJoin[{"attachments", "flower.png"}]], ImageResolution->Automatic]},HighlightImage[img, {Yellow,ImageCorners[img, 1, .001, 5]}, ImageSize->300]]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'imagefeatures.png']);
  });  

  test('Image Generation', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Image[CellularAutomaton[30, {{1}, 0}, 40], "Bit", Magnification -> (2 Graphics`DPR[])]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'gencellular.png']);
  });

  test('Linear Gradient over Annulus', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '(*FB[*)((LinearGradientImage[{{Left, Bottom}, {Right, Top}} -> "Rainbow", {150, 150}] + RegionImage[Annulus[], RasterSize->150])(*,*)/(*,*)(2))(*]FB*)', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'annulus.png']);
  });

  test('Region mesh', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ImageMesh[Binarize[Import[FileNameJoin[{"attachments", "flower.png"}]]]]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'regionmesh.png']);
  });

  test('Disk Region', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'DiscretizeRegion[Disk[]]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'diskregionmesh.png']);
  });

  test('Texture Plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ParametricPlot[{r Cos[\\[Theta]], r Sin[\\[Theta]]}, {r, 1,  2}, {\\[Theta], 0, 2 Pi/3}, PlotRange -> All, Mesh -> 15, PlotStyle->Texture[ExampleData[{"TestImage", "Lena"}]]]', 15000, 20000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'texturePlot2.png']);
  });

  test('Inset Test', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graphics[{Circle[], Inset[x^2 + y^2 == 1, {0, 0}]}, ImageSize->Small]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'inset1.png']);
  });  
  
  test('Inset Test 2', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'g=Plot[Sin[x], {x, 0, 10}, Frame -> True, FrameTicks -> None, AspectRatio -> Full]; Table[Graphics[{Inset[g, Automatic, Automatic, {s, s}], Circle[{0, 0}, 2]}, Frame -> True, ImageSize->150], {s, {1, 2, 3}}]', 15000, 2500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'inset122.png']);
  }); 

  
  test('Tabular Test', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Tabular[{{1, x, Today}, {4, y, Tomorrow}}, {"col1", "col2", "col3"}]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'tabular1.png']);
  });  
  
  test('Tabular Test2', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'EntityValue[ EntityClass["Book", "DuneBooks"], {"FirstPublished", "Author",  "Image"}, "Tabular"]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'tabular2.png']);
  });  

  test('Opener V', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'OpenerView[{"Show me a plot", Plot[x, {x,0,1}]}, False]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'openerv.png']);
  });  
  
  test('Information on symbols', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '?Plot', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'infoplot.png']);
  });  

  test('Axes Origin', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot[Sin[x], {x,0,2Pi}, AxesOrigin->{Pi,0}, Ticks->{{{0, "0"},{2Pi, "2Pi"}}, {-0.5,0.5}}]', 15000, 2000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'axsesOrigin.png']);
  });  
  





});