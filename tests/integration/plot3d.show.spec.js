// @ts-check
import { test, expect } from '@playwright/test';
import {url, delay, evaluate, clearCell} from './common'

test.describe.configure({ mode: 'default' });

test.describe('3D Plot', () => {
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

  test('Graphics3D Basics 1', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graphics3D[Style[Dodecahedron[], Yellow], ImageSize->150]', 25000, 3500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graphicsDodecahedron.png']);
  });

  test('Graphics3D Basics 2', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'SeedRandom[10]; Graphics3D[Table[Style[Sphere[RandomInteger[10, 3]], Opacity[0.5]], 50]]', 25000, 3500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graphicsBasic2.png']);
  });


  test('Graphics3D Basics 3', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graphics3D[{Opacity[0.6], EdgeForm[], Table[{ColorData["Rainbow"][Rescale[c, {0, 2 Pi}]], GeometricTransformation[Tetrahedron[], RotationTransform[c, {0, 0, 1}, {0.5, 0, 0}]]}, {c, 0, 2 Pi, 2 Pi/30}]}]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graphicsBasic3.png']);
  });

  test('Graphics3D Basics 4 (Lighting)', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graphics3D[{PointLight[Red, -{2, 2, -2}],PointLight[Green, -{-2, 2, -2}],PointLight[Blue, -{-2, -2, -2}],{Directive["Roughness" -> 1],Icosahedron[1]}}]', 25000, 2500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graphicsBasic4.png']);
  });


  

  test('Spherical Plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '(*SbB[*)Subscript[Y(*|*),(*|*)k_,q_](*]SbB*)[θ_, ϕ_] := SphericalHarmonicY[k,q, θ, ϕ]; SphericalPlot3D[(*SbB[*)Subscript[Y(*|*),(*|*)4,0](*]SbB*)[θ, ϕ], {θ,0,π}, {ϕ,0,2π}]', 25000, 2500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'spherical.png']);
  });  

  test('Vector plot', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'VectorPlot3D[{x, y, z}, {x, -1, 1}, {y, -1, 1}, {z, -1, 1}]', 25000, 2500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'vector.png']);
  }); 

  test('Plot3D', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot3D[Im[ArcSin[(x + I y)^4]], {x, -2, 2}, {y, -2, 2}, Mesh -> None, PlotStyle -> Directive[Yellow, Opacity[0.8]], ExclusionsStyle -> {None, Red}]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plot3d.png']);
  }); 
  
  test('Plot3D 2', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot3D[Sin[Sqrt[x^2 + y^2]], {x, -6, 6}, {y, -6, 6}, PlotRange -> All, Mesh -> None, ColorFunction -> "Rainbow"]', 15000, 1000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plot3d2.png']);
  }); 
  
  test('3D Materials', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graphics3D[{Darker[White], Polygon[{{-2,-2,0}, {2,-2,0}, {2,2,0}, {-2,2,0}}],{ Directive[Cyan, "MaterialThickness"->1.0, "Transmission"->1.0,"Roughness"->0.13, "Ior"->2.0], Sphere[{0,0,1}, 1]}}]', 25000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'materials.png']);
  });   


  test('Glass Material', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graphics3D[{Plot3D[Sin[x] Cos[y], {x,-10,10}, {y,-10,10}][[1]], {Graphics3D`Materials[#], Red,Sphere[{0,0,2}, 6]}}] &@ "Glass"', 25000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'glass.png']);
  });
  
  test('Lights and shadows', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graphics3D[{Directive["Shadows"->True], Polygon[ {{-5,5,-1}, {5,5,-1}, {5,-5,-1}, {-5,-5,-1}}], White, Cuboid[{-1,-1,-1}, {1,1,1}], Directive["Shadows"->False], PointLight[Red, {1.5075, 4.1557, 2.6129}, 100], Directive["Shadows"->True], SpotLight[Cyan, {-2.268, -2.144, 3.1635}]}, "Lighting"->None]', 25000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'imagenegate.png']);
  });

  test('Plot3D 2 AxesLabels', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot3D[x y, {x,0,1}, {y,0,1}, AxesLabel->{Cos[3], "y", "z"}]', 15000, 1000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plot3d2Axes.png']);
  }); 

  test('Plot3D 2 AxesLabels Automatic', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Plot3D[x y, {x,0,1}, {y,0,1}, AxesLabel->Automatic]', 15000, 1000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'plot3d2AxesAuto.png']);
  }); 

  test('CThead', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '  Image3D[ExampleData[{"TestImage3D","CThead"}], BoxRatios->{1,1,1}, ColorFunction->"GrayLevelOpacity"]', 15000, 10000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'CThead.png']);
  }); 

  test('ComplexPLot 3D', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ComplexPlot3D[(*FB[*)(((*SpB[*)Power[z(*|*),(*|*)2](*]SpB*)+1)(*,*)/(*,*)((*SpB[*)Power[z(*|*),(*|*)2](*]SpB*)-1))(*]FB*), {z, -2 - 2 I, 2 + 2 I}]', 15000, 10000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'complex3d.png']);
  }); 
  

  

});