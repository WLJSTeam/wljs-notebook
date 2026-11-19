import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const kernel = readFileSync('modules/wljs-graphics-d3/src/kernel.js', 'utf8');
const start = kernel.indexOf('g2d.EventListener.dragsignal = ');
const end = kernel.indexOf('g2d.EventListener.dragall = ', start);
const handler = kernel.slice(start, end);

test('dragsignal uses plot coordinates through Translate, pan, and zoom', async ({ page }) => {
  await page.setContent(`
    <svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(40,250)">
        <g id="zoom"><g id="graphics">
          <g id="translate" transform="translate(0,-100)">
            <circle id="disk" cx="0" cy="0" r="10" />
          </g>
        </g></g>
      </g>
    </svg>
  `);

  await page.evaluate((source) => {
    const g2d = { EventListener: {} };
    const disk = document.querySelector('#disk');
    const svg = document.querySelector('svg');
    const graphics = document.querySelector('#graphics');
    window.dragPositions = [];

    // This is the SVG branch of d3.pointer: screen point through the target CTM.
    const d3 = { pointer: (event, node) => {
      const point = node.ownerSVGElement.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const local = point.matrixTransform(node.getScreenCTM().inverse());
      return [local.x, local.y];
    } };
    const server = { kernel: { io: { fire: (_uid, position) => {
      window.dragPositions.push(position);
    } } } };
    const throttle = (callback) => callback;
    new Function('g2d', 'd3', 'server', 'throttle', source)(g2d, d3, server, throttle);

    const object = {
      classed() { return this; },
      on(event, handler) { disk.addEventListener(event, handler); return this; }
    };
    const axis = { invert: (pixel) => pixel / 100 };
    g2d.EventListener.dragsignal('disk', object, {
      rootSVG: { node: () => graphics },
      panZoomEntites: { canvas: { node: () => svg } },
      xAxis: axis,
      yAxis: { invert: (pixel) => -pixel / 100 },
      local: {} // The listener does not own the graphics zoom state.
    });
  }, handler);

  let position = [0, 1];
  for (const transform of ['translate(30,15) scale(2)', 'translate(-20,20) scale(1.5)']) {
    await page.locator('#zoom').evaluate((node, value) => node.setAttribute('transform', value), transform);
    const center = await page.locator('#disk').evaluate((node) => {
      const point = node.ownerSVGElement.createSVGPoint();
      const screen = point.matrixTransform(node.getScreenCTM());
      return [screen.x, screen.y];
    });

    await page.mouse.move(...center);
    await page.mouse.down();
    await page.mouse.move(center[0] + 12, center[1] - 9);
    await page.mouse.up();

    const positions = await page.evaluate(() => window.dragPositions.slice(-2));
    const scale = Number(transform.match(/scale\(([^)]+)/)[1]);
    const next = [position[0] + 12 / (100 * scale), position[1] + 9 / (100 * scale)];
    expect(positions[0][0]).toBeCloseTo(position[0]);
    expect(positions[0][1]).toBeCloseTo(position[1]);
    expect(positions[1][0]).toBeCloseTo(next[0]);
    expect(positions[1][1]).toBeCloseTo(next[1]);

    // The Offload update moves Translate before the next drag begins.
    await page.locator('#translate').evaluate((node, [x, y]) => {
      node.setAttribute('transform', `translate(${x * 100},${-y * 100})`);
    }, next);
    position = next;
  }
});
