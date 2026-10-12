// @ts-check
import { test, expect } from '@playwright/test';
import {url, delay, evaluate, clearCell} from './common'

test.describe.configure({ mode: 'default' });


test.describe('Cell types', () => {
  let page;
  test.beforeAll(async ({ browser }) => {
       
      const context = await browser.newContext();
      page = await context.newPage();
      page.route('**', route => route.continue());
      
      await page.goto(url);
      await delay(6000);
  });

  test.afterAll(async ({ browser }) => {
      browser.close;
  });

  test('Markdown cell', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '.md\n# Hello World\n\n<DateObject>2025</DateObject>', 15000, 1000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'markdownBasic.png']);
  });  

  test('Slide cell', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '.slide\n# Hello World\n\n<DateObject>2025</DateObject>', 15000, 1000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'slideBasic.png']);
  }); 
  
  /* test('Slide row', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '.slide\n# Hello World\n\n<Row><div style="width:100%">Col1</div><div style="width:100%">Col2</div></Row>"]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'slideRow.png']);
  }); 

  test('Slide row and Latex', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '.slide\n# Hello World\n\n<Row>\n<div style="width:100%">\n\n## Subtitle 1\n\n$$\na + b\n$$\n\n</div>\n\n<div style="width:100%">\n\n## Subtitle 2\n\n$$\na + b\n$$\n\n</div>\n</Row>', 5000, 1000);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'SlideRowLatex.png']);
  });   */

  test('JS Cell', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, '.js\nconst d = document.createElement("div");\nd.style.background = "red"; d.innerText = "Hello World";\nreturn d;', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'jscell.png']);
  }); 

  test('WLX Cell', async () => {
    await clearCell(page);


    const outputCell = await evaluate(page, '.wlx\n\nGetTime := DateObject[2025]\n\n\n<GetTime/>', 5000, 1500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'wlxcell.png']);
  });   
  
});
