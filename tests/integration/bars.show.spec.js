// @ts-check
import { test, expect } from '@playwright/test';
import {url, delay, evaluate, clearCell, loadPage} from './common'

test.describe.configure({ mode: 'default' });


test.describe('Bar and Charts', () => {
  let page;
  test.beforeAll(async ({ browser }) => {
       
      const context = await browser.newContext();
      page = await context.newPage();
      page.route('**', route => route.continue());
      
      await loadPage(page, url);
      await delay(6000);


  });

  test.afterAll(async ({ browser }) => {
      browser.close;
  });

  test('Bubble', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'SeedRandom[120]; BubbleChart[RandomReal[1, {5, 7, 3}]]', 55000, 3500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'bubble.png']);
  });  

  test('Simple bar', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'BarChart[{1, 2, 3}]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'bar.png']);
  });    

  test('Multi bar', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'BarChart[{{1, 2, 3}, {1, 3, 2}, {5, 2}}, ChartLabels -> {"a", "b", "c"}, LabelingFunction -> Above]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'multibar.png']);
  });  
  
  test('Bar labeled', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'BarChart[{{1, 2, 3}, {1, 3, 2}, {5, 2}}, ChartLegends -> {"a", "b", "c"}]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'barlegened.png']);
  });   

  test('Sector chart', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'SectorChart[{{1, 1}, {1, 2}, {1, 3}}]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'sector.png']);
  });   
  
  test('Annual chart', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'SectorChart[{{1, 1}, {1, 2}, {1, 3}}, SectorOrigin -> {Automatic, 1}]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'anuualsector.png']);
  });  


  test('Pie chart', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'PieChart[{1, 2, Legended[3, "Jue"], 4}]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'piechart.png']);
  }); 

  test('Pie chart labeled', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'PieChart[{{1, 2, 3}, {2, 2, 1}}, ChartLegends -> {"a", "b", "c"}]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'piechartChartLegends.png']);
  });   

  test('Histogram', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'SeedRandom[120];Histogram[RandomVariate[NormalDistribution[0, 1], 500]]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'histogram.png']);
  });   

  test('Histogram Stylized', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'SeedRandom[120];Histogram[RandomVariate[NormalDistribution[0, 1], 500], ColorFunction -> Function[{height}, Opacity[height]], ChartStyle -> Purple]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'histogramstyle.png']);
  });   

  test('Radial Wind Diagram', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'SeedRandom[13]; Clear[g]; g[{{t0_, t1_}, {r0_, r1_}}, ___] := Polygon[{r0 {Cos[t0], Sin[t0]}, r1 {Cos[t0], Sin[t0]}, r1 {Cos[t1], Sin[t1]}, r0 {Cos[t1], Sin[t1]}}]; SectorChart[RandomReal[1, {10, 2}],ChartBaseStyle -> Thick, PolarAxes -> Automatic, PolarGridLines -> Automatic, ChartStyle ->EdgeForm[Gray], ChartElementFunction -> g]', 15000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'windRadial.png']);
  });   

  
  
});
