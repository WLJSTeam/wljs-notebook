import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const kernel = readFileSync('modules/wljs-graphics-d3/src/kernel.js', 'utf8');

test('Graphics pointer events emit digitizer data in plot coordinates', async ({ page }) => {
  const start = kernel.indexOf('const pointerEventData = ');
  const end = kernel.indexOf('g2d.EventListener.mouseover = ', start);
  const handler = kernel.slice(start, end);

  const result = await page.evaluate((source) => {
    const g2d = {EventListener: {}};
    const fired = [];
    const d3 = {pointer: (event) => [event.clientX, event.clientY]};
    const server = {kernel: {io: {fire: (...args) => fired.push(args)}}};
    const throttle = () => { throw new Error('pointer events must not be throttled'); };
    new Function('g2d', 'd3', 'server', 'throttle', source)(g2d, d3, server, throttle);

    const listeners = {};
    const object = {on: (name, listener) => { listeners[name] = listener; }};
    g2d.EventListener.pointerrawupdate('pen', object, {
      xAxis: {invert: (x) => x / 10},
      yAxis: {invert: (y) => -y / 10}
    });

    listeners.pointerrawupdate.call({}, {
      clientX: 25,
      clientY: 40,
      tiltX: -15,
      tiltY: 30,
      pressure: 0.625,
      buttons: 3
    });
    return {fired, patterns: Object.keys(g2d.EventListener)};
  }, handler);

  expect(result.patterns).toEqual(expect.arrayContaining([
    'pointerdown', 'pointerup', 'pointermove', 'pointerrawupdate'
  ]));
  expect(result.fired).toEqual([[
    'pen',
    {Position: [2.5, -4], Tilt: [-15, 30], Pressure: 0.625, Buttons: 3},
    'pointerrawupdate'
  ]]);
});

test('Image pointer events emit digitizer data in device pixels', async ({ page }) => {
  const start = kernel.indexOf('const imagePointerEventListener = ');
  const end = kernel.indexOf('imageContext.EventListener.mouseover = ', start);
  const handler = kernel.slice(start, end);

  const result = await page.evaluate((source) => {
    Object.defineProperty(window, 'devicePixelRatio', {value: 2, configurable: true});
    const imageContext = {EventListener: {}};
    const fired = [];
    const listeners = {};
    const canvas = {addEventListener: (name, listener) => { listeners[name] = listener; }};
    const server = {kernel: {io: {fire: (...args) => fired.push(args)}}};
    const throttle = () => { throw new Error('pointer events must not be throttled'); };
    const pointerEventData = (event, Position) => ({
      Position,
      Tilt: [event.tiltX, event.tiltY],
      Pressure: event.pressure,
      Buttons: event.buttons
    });
    new Function(
      'imageContext', 'server', 'throttle', 'pointerEventData', source
    )(imageContext, server, throttle, pointerEventData);

    imageContext.EventListener.pointerrawupdate('pen', canvas, {});
    listeners.pointerrawupdate({
      offsetX: 12,
      offsetY: 18,
      tiltX: 20,
      tiltY: -10,
      pressure: 0.75,
      buttons: 1
    });
    return {fired, patterns: Object.keys(imageContext.EventListener)};
  }, handler);

  expect(result.patterns).toEqual(expect.arrayContaining([
    'pointerdown', 'pointerup', 'pointermove', 'pointerrawupdate'
  ]));
  expect(result.fired).toEqual([[
    'pen',
    {Position: [24, 36], Tilt: [20, -10], Pressure: 0.75, Buttons: 1},
    'pointerrawupdate'
  ]]);
});
