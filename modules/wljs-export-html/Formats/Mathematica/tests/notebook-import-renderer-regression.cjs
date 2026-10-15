// Geometry smoke test for imported, held ExpressionJSON display payloads.
// Uses the real interpreter and Three.js primitives without a browser/GPU.
// DOM text labels and the root camera/lighting setup need a separate UI check.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');

async function main() {
  const root = path.resolve(__dirname, '..');
  const three = await import(pathToFileURL(path.join(root,
    'modules/wljs-sharedlib-three/node_modules/three/build/three.module.js')));
  const fflate = require(path.join(root, 'Packages/WLJS/node_modules/fflate/lib/node.cjs'));
  const { default: earcut } = await import(pathToFileURL(path.join(root,
    'modules/wljs-graphics3d-threejs/node_modules/earcut/src/earcut.js')));
  const context = vm.createContext({
    console: { log() {}, warn() {}, error: console.error },
    TextEncoder, TextDecoder, setTimeout, clearTimeout, atob, btoa,
    crypto: require('node:crypto').webcrypto, sharedThree: three,
    sharedEarcut: earcut, ...fflate
  });
  vm.runInContext('window = globalThis; document = {};', context);
  for (const relative of ['Packages/WLJS/src/interpreter.js',
    'Packages/WLJS/src/core.js', 'modules/wljs-graphics3d-threejs/src/kernel.js']) {
    let source = fs.readFileSync(path.join(root, relative), 'utf8')
      .replace(/^import .*?;?$/mg, '');
    if (relative.includes('graphics3d')) {
      source = '(function(){' + source
        .replace('let THREE;', 'let THREE = sharedThree;')
        .replace('var earcut;', 'var earcut = sharedEarcut;') +
        '; window.g3d = g3d; })();';
    }
    vm.runInContext(source, context, { filename: relative });
  }
  // Labels require CSS2DRenderer/DOM; still check their imported coordinates.
  vm.runInContext(`g3d.Text = async (args, env) => {
    const p = await interpretate(args[1], env);
    if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite))
      throw new Error('Invalid text position');
  };`, context);
  const dimensions = await vm.runInContext(`(async () => {
    const results = [];
    for (const length of [0.001, 1, 1000]) {
      const env = {local: {}, mesh: new sharedThree.Group(),
        material: sharedThree.MeshPhysicalMaterial};
      const points = new NumericArrayObject(new Float64Array([0, 0, 0, 0, 0, length]), [2, 3]);
      const mesh = await g3d.TubeArrow([['JSObject', points]], env);
      results.push([length, mesh.children[0].geometry.parameters.radiusTop,
        mesh.children[1].geometry.parameters.height, mesh.children[1].geometry.parameters.radius]);
    }
    const env = {local: {}, mesh: new sharedThree.Group(),
      material: sharedThree.MeshPhysicalMaterial};
    await g3d.Arrowheads([0.05], env);
    const mesh = await g3d.TubeArrow([['List', ['List', 0, 0, 0], ['List', 0, 0, 1]], 0.07], env);
    results.push([mesh.children[0].geometry.parameters.radiusTop,
      mesh.children[1].geometry.parameters.height, mesh.children[1].geometry.parameters.radius]);
    return results;
  })()`, context);
  for (const [length, radius, headHeight, headRadius] of dimensions.slice(0, 3)) {
    assert.equal(radius, length * 0.02, 'automatic tube radius must scale with length');
    assert.equal(headHeight, length * 0.2, 'automatic head height must scale with length');
    assert.equal(headRadius, length * 0.06, 'automatic head radius must scale with length');
  }
  assert.equal(dimensions[3][0], 0.07, 'explicit tube radius must be retained');
  assert.equal(dimensions[3][1], 0.05 * 280 / 60, 'explicit arrowhead height must be retained');
  assert.equal(dimensions[3][2], 0.05 * 180 / 100, 'explicit arrowhead radius must be retained');
  context.json = fs.readFileSync(process.argv[2], 'utf8');
  const results = await vm.runInContext(`(async () => {
    const results = [];
    for (const held of JSON.parse(json).slice(1)) {
      const graphic = held[1][1]; // HoldComplete[Hold[Graphics3D[...]]]
      if (graphic[0] !== 'Graphics3D') throw new Error('Expected held Graphics3D');
      const scene = new sharedThree.Group();
      const env = {context: g3d, global: {scene, stack: []}, local: {},
        mesh: scene, matrix: new sharedThree.Matrix4(),
        color: new sharedThree.Color('white'), opacity: 1, roughness: .5,
        metalness: 0, material: sharedThree.MeshPhysicalMaterial,
        thickness: 1, shadows: false,
        edgecolor: new sharedThree.Color('black'), wake() {}};
      await interpretate(graphic[1], env);
      let meshes = 0;
      scene.updateMatrixWorld(true);
      scene.traverse(mesh => {
        if (!mesh.matrixWorld.elements.every(Number.isFinite))
          throw new Error('Invalid object transform');
        if (!mesh.geometry) return;
        meshes++;
        for (const attribute of Object.values(mesh.geometry.attributes)) {
          for (const n of attribute.array)
            if (!Number.isFinite(n)) throw new Error('Invalid geometry attribute');
        }
        const positions = mesh.geometry.getAttribute('position');
        const indices = mesh.geometry.index;
        if (indices) for (const i of indices.array)
          if (i < 0 || i >= positions.count) throw new Error('Invalid vertex index');
      });
      results.push(meshes);
    }
    return results;
  })()`, context);
  assert.equal(results.length, 6, 'all six saved 3D outputs must be checked');
  assert.ok(results.every(n => n > 0), 'each output must produce geometry');
  console.log('All six imported 3D outputs produce finite, indexed geometry');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
