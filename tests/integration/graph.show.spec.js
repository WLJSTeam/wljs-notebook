// @ts-check
import { test, expect } from '@playwright/test';
import {url, delay, evaluate, clearCell} from './common'

test.describe.configure({ mode: 'default' });


test.describe('Graphs', () => {
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

  test('Simple graph', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graph[{1 -> 2, 2 -> 3, 3 -> 1}]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graph.png']);
  });  

  test('Vertex shaped graph', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graph[{1 -> 2, 2 -> 3, 3 -> 1}, VertexShapeFunction -> "Diamond", VertexSize -> Medium]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graphshape.png']);
  }); 
  
  test('Annotated graph', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graph[Table[Annotation[v, {VertexSize -> 0.2 + 0.2 Mod[v, 5], VertexStyle -> Hue[v/15, 1, 1]}], {v, 0, 14}], Table[v <-> Mod[v + 1, 15], {v, 0, 14}]]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'annotatedgraph.png']);
  }); 

  test('3D Graph', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'GraphPlot3D@Graph3D[ButterflyGraph[3]]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graph3d.png']);
  });

  test('3D Graph (Annotated)', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graph3D[Table[Annotation[v, {VertexSize -> 0.2 + 0.2 Mod[v, 5], VertexStyle -> Hue[v/15, 1, 1]}], {v, 0, 14}], Table[v <-> Mod[v + 1, 15], {v, 0, 14}]]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graph3dAnoot.png']);
  });

  test('Graph Styled 1', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graph[{1, 2, 3, 4, 5, 6},{1<->2,  1<->6,  2<->3,  3<->4,  4<->5,  5<->6},{GraphLayout -> {"Dimension" -> 2, "VertexLayout" -> {"CircularEmbedding", "OptimalOrder" -> False}},GraphStyle -> "SmallNetwork"}]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graphStyle1.png']);
  });

  test('Graph Styled 2', async () => {
    await clearCell(page);
  
    const outputCell = await evaluate(page, 'Graph[{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16},(*VB[*)(Uncompress["1:eJyF0sEOwiAQBFDU1lppqcde+zHePJn4Awo1c7GJ7f9HlsTrzGUT4E2ywE7P5T6Pzrm1yuWGdZv3tgq5PD4R3/TaUrzGd8Iub8EOuThKcWHC9nGQomfC4qikODFhcdRSDEzU8j2KODNhcTRMNPIuRXRMWBwtE63stIjAhMXhmfCyUy8nqJPz0ctOg/zb4d/HDwpUspY="])(*,*)(*"1:eJxTTMoPSmNmYGAo5gUSYZmp5S6pyflFiSX5RcEcQBHP5Py8zKrUlEwNTgaGNCaQQhYgEVSakxrMCmT4JCal5gSDhPzy81IB4VYSLA=="*)(*]VB*),{GraphLayout -> {"Dimension" -> 2, "VertexLayout" -> {"CircularEmbedding", "OptimalOrder" -> False}},GraphStyle -> "DiagramGreen"}]', 5000, 500);
    await expect(outputCell).toHaveScreenshot(['screenshorts', 'graphStyle2.png']);
  });


  
 
  
});