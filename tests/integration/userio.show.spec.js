// @ts-check
import { test, expect } from '@playwright/test';
import {url, delay, evaluate, clearCell} from './common'

test.describe.configure({ mode: 'default' });


test.describe('Users GUI', () => {
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

  test('Cell view', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'CellView["graph LR\nA[Text Header 3200 byte]  --> B[Binary Header 400 byte]\nB --> C1[240 byte 1-st trace header] --> T1[samples of 1-st trace]\nB --> C2[240 byte 2-st trace header] --> T2[samples of 1-st trace]\nB --> CN[240 byte n-st trace header] --> T3[samples of 1-st trace]", ImageSize->650, "Display"->"mermaid"] ', 15000, 1000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'cellview.png']);
  });  

  test('Editor view', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'EditorView[ToString[Plot[x, {x,0,1}], StandardForm]]', 15000, 1000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'editor.png']);
  }); 
  
  test('HTML View', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'HTMLView["<h2>Hello World</h2>"]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'html.png']);
  }); 

  test('InputButton', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'InputButton[]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'InputButton.png']);
  });   

  test('InputRange', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'InputRange[0,1,0.1]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'inputrange.png']);
  }); 

  test('InputGroup', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'InputGroup[{InputRange[0, 10, 1, "Label"->"Range 1"],InputRange[0, 10, 1, "Label"->"Range 2"],InputText["Hi"]}]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'inputgroup.png']);
  });  
  
  test('Manipulate basic 1', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Manipulate[Table[Orange, n], {n, 1, 5, 1}]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'manipulateBasic1.png']);
  });   
 
  test('Manipulate basic 2', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Manipulate[Graphics[Style[RegularPolygon[n], Hue[h]]], {n, 5, 20, 1}, {h, 0, 1}]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'manipulateBasic2.png']);
  });  

  test('Manipulate plot 1', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ManipulatePlot[{Sin[x w], Cos[x w]}, {x,-4Pi, 4Pi}, {w,0,2.5}]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'manipulatePlot1.png']);
  }); 

  test('Sound input', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Sound[SoundNote["C"]]', 15000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'soundNote.png']);
  });  
  

  test('Planets', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'ExampleData[{"Dataset","Planets"}]',15000, 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'planets2.png']);
  });

  test('Tooltip1', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, ' Plot[{Tooltip[Sin[x], "This is sine"], Tooltip[Cos[x], "This is cosine"]}, {x,0,2Pi}]',15000, 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'tooltip1.png']);
  });
  
  test('Tooltip2', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Tooltip[x, Graphics[Disk[], ImageSize->100]]',15000, 5000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'tooltip2.png']);
  });
  
});