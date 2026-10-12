// @ts-check
import { test, expect } from '@playwright/test';
import { delay, evaluate, clearCell} from './common'

import path from 'path';


test.describe.configure({ mode: 'default' });


test.describe('Cell types', () => {
  let page;
  test.beforeAll(async ({ browser }) => {
       
      const context = await browser.newContext();
      page = await context.newPage();
      page.route('**', route => route.continue());
  });

  test.afterAll(async ({ browser }) => {
      browser.close;
  });

  /*test('Import mathematica', async () => {
    await page.goto('http://127.0.0.1:20560/iframe/'+encodeURIComponent(path.resolve(__dirname, 'import.nb')));
    await delay(3000);

    let kernelSelection = page.locator('button').filter({ hasText: 'Auto' });
    if (await kernelSelection.isVisible({timeout: 2000})) {
      kernelSelection.click();
      console.log('Attaching kernel');
      await delay(5000);
    }   
    
    await delay(5000);

    await expect(page).toHaveScreenshot(['screenshorts', 'mathematica.png']);
  }); */  

  test('Import markdown', async () => {
    await page.goto('http://127.0.0.1:20560/iframe/'+encodeURIComponent(path.resolve(__dirname, 'import.md')));
    await delay(8000);

    await expect(page).toHaveScreenshot(['screenshorts', 'markdown.png']);
  });  

  test('Import html', async () => {
    await page.goto('http://127.0.0.1:20560/iframe/'+encodeURIComponent(path.resolve(__dirname, 'import.html')));
    await delay(8000);

    await expect(page).toHaveScreenshot(['screenshorts', 'html.png']);
  });     
  
});
