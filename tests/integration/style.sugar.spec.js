// @ts-check
import { test, expect } from '@playwright/test';
import {url, delay, evaluate, clearCell} from './common'

test.describe.configure({ mode: 'default' });


test.describe('Wolfram Expressions Styling', () => {
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

  test('Bold string', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Style["1", Bold]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'boldString1.png']);
  });  

  test('Bold string 16 size', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Style["1", Bold, 16]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'boldString2.png']);
  });   

  test('Bold string 16 size Red', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Style["1", Red, Bold, 16]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'boldString3.png']);
  });   

  test('Large Wolfram Expression', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Style[Sqrt[2]/5, 16]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'largeWl.png']);
  });   

  test('Large Wolfram Expression and background', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Style[Sqrt[2]/5, 16, Background->Cyan]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'largeWlback.png']);
  });    

  test('Highlighted WL', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Highlighted[Sqrt[2]/5, Background->LightYellow]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'highlightedWl.png']);
  }); 
  
  test('Framed WL', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Framed[Sqrt[2]/5]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'framedWl.png']);
  });


  test('Row', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Row[{1, "->", 2}]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'row.png']);
  });  

  test('Row with text', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Row[{"1", "->", "2"}]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'rowText.png']);
  });   

  test('Row with small graphics', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Row[{"1", Graphics[Arrow[{{0,0}, {1,0}}], ImageSize->{30,20}, ImagePadding->None], "2"}]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'rowTextWithArrow.png']);
  });    

  test('Column', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Column[{Red, Blue}]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'column.png']);
  }); 


  test('Grid', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Grid @ Table[KroneckerDelta[i,j], {i,3}, {j,3}]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'grid.png']);
  });   

  test('Grid with Item', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'au = {{1, 2}, {3, 4}}; Grid[KroneckerProduct[IdentityMatrix[5], au]] /. {0 -> 0, x_?NumberQ -> Item[x, Background -> Orange]}', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'gridItem.png']);
  });   

  test('MatrixForm with Item', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'a;b;c;d; MatrixForm[{{a, b}, {Item[c, Background -> Red], d}}]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'matrixFormWithItem.png']);
  }); 
  
  test('TableForm with Item and Heading', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'TableForm[{{5, Item[7, Background->Yellow]}, {4, 2}, {10, 3}}, TableHeadings -> {{"Group A", "Group B", "Group C"}, {"y1", "y2"}}]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'tableFormHeadingItem.png']);
  });   
 
  
  test('Squiggled', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Squiggled["Text", Red]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'Squiggled.png']);
  });   

  test('Spacer', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '{x, Spacer[20], y} // Row', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'spacer.png']);
  });   

  test('Rotate on Expression', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Rotate[x+y, 90 Degree]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'rotate.png']);
  });    

  test('Pane', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Pane[30!, 100]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'pane.png']);
  }); 

 
  test('Magnify', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Magnify[x+y, 2]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'magnify.png']);
  });   


  test('Framed and Invisible', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Framed[Invisible[1/2]]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'invisibleFrame.png']);
  });   

  test('Panel with a slider', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Panel[InputRange[0,1], Style["My slider", 10]]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'panelSlider.png']);
  });  
  
  
  test('Labeled', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Labeled[Framed[{a, b, c, d}], lbl, Right]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'labeled.png']);
  });  

  test('TabView', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '  TabView[{Sin->Plot3D[Sin[x] Sin[y], {x,-2Pi,2Pi}, {y,-2Pi,2Pi}], Sinh->Plot3D[Sinh[x] Sinh[y], {x,-2Pi,2Pi}, {y,-2Pi,2Pi}] }]', 35000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'TabView.png']);
  });  


  
  test('Labeled Graphics', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Labeled[Graphics[Disk[{0,0}, 1], ImagePadding->None], InputButton["Collapse/Expand"], Background->Yellow] ', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'labeledGraphics.png']);
  });   
  
  test('Short', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Table[ColorData[97][i+j+k], {i, 100}, {j, 3}, {k, 30}] // Short  ', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'short.png']);
  }); 
  
  test('Style 1000', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Style[1000, Background->Green]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'style1000.png']);
  }); 

  test('Style 1000 (String)', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Style["1000", Green]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'style1000string.png']);
  });   
  
  test('Style Scaled (expr)', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Table[Style[100, n], {n, 30}]', 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'styleScaled100.png']);
  });    



  
});