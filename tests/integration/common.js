import path from 'path';

export const delay = (ms) => {
  const promise = new Promise((resolve) => {
    setTimeout(resolve, ms)
  });

  return promise;
}

const checkIfKernelAttached = async (page) => {
  if (!page.kernelQ) {
    
  }
  await delay(2000);
  let kernelSelection = page.locator('button').filter({ hasText: 'Auto' });
  if (page.kernelQ) return;
  if (await kernelSelection.isVisible({timeout: 2000})) {
    kernelSelection.click();
    console.log('Attaching kernel');
    await delay(8000);
    page.kernelQ = true;
  } 
}

const os = process.platform;
const selectAllShortcut = os === 'darwin' ? 'Meta+A' : 'Control+A'; // macOS uses Meta (Cmd)
export const url = 'http://127.0.0.1:20560/iframe/'+encodeURIComponent(path.resolve(__dirname, 'notebook.wln'));

console.warn('Using url:'+url);

class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject)=> {
      this.reject = reject
      this.resolve = resolve
    })
  }
}

export const evaluate = async (page, input="1+1", timeout=5000, extra=500) => {
  if (!page.confirmDismissQ) {
    page.confirmDismissQ = true;
    page.on('dialog', async (dialog) => {
      dialog.accept();
      console.log('accepting kernel...');
      const d = new Deferred();
      page.kernelQ = d.promise;
      await delay(10000);
      d.resolve();
      console.log('done!');
      page.kernelQ = 9;
    });
  }
  const editor = page.locator('.cm-editor').first();
  // Click to focus
  await delay(200);
  await editor.click();
  await delay(200);
  await page.keyboard.type(input);
  await delay(400);
  await page.keyboard.type(' ');
  await delay(200);
  //await page.keyboard.type(input, { delay: 100 });
  await delay(300);
  const play = page.locator('.button-cplay').first();
  await play.click();
  await delay(300);
  await delay(100);

  if (page.kernelQ != 9) {
    await page.kernelQ;
  }
  
  await page.waitForSelector('.cout', {timeout:timeout});
  await delay(3.0*extra);
  await delay(1000);
  const outputCell = page.locator('.cout').first();
  return outputCell;
}


export const clearCell = async (page, timeout=1000) => {
  const editor = page.locator('.cm-editor').first();
  // Click to focus
  await delay(200);
  await editor.click();
  await delay(200);
  await page.keyboard.press('ControlOrMeta+A');
  await delay(200);
  await page.keyboard.press('Backspace');
  await delay(200);
  await delay(200);
}
