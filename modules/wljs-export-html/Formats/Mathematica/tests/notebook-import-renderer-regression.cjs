// Geometry smoke test for imported, held ExpressionJSON display payloads.
// Uses the real interpreter and Three.js primitives without a browser/GPU.
// DOM text labels and the root camera/lighting setup need a separate UI check.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');

async function main() {
  let root = __dirname;
  while (!fs.existsSync(path.join(root, 'Packages/WLJS/src/interpreter.js'))) {
    const parent = path.dirname(root);
    if (parent === root) throw new Error('Cannot locate WLJS repository root');
    root = parent;
  }
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
        '; window.g3d = g3d; window.graphics3DBoxScale = graphics3DBoxScale; })();';
    }
    vm.runInContext(source, context, { filename: relative });
  }
  // Labels require CSS2DRenderer/DOM; still check their imported coordinates.
  vm.runInContext(`g3d.Text = async (args, env) => {
    const p = await interpretate(args[1], env);
    if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite))
      throw new Error('Invalid text position');
  };
  interpretate.anonymous = d => { throw new Error('Unsupported display expression: ' + JSON.stringify(d)); };
  `, context);
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
  const arrows = await vm.runInContext(`(async () => {
    const results = [];
    for (const wrapped of [false, true]) for (const packed of [false, true]) {
      const env = {local: {}, mesh: new sharedThree.Group(),
        matrix: new sharedThree.Matrix4(), color: new sharedThree.Color('red'),
        thickness: 1, wake() {}};
      const coordinates = z => packed
        ? ['JSObject', new NumericArrayObject(new Float64Array([0, 0, 0, 0, 0, z]), [2, 3])]
        : ['List', ['List', 0, 0, 0], ['List', 0, 0, z]];
      const args = z => [wrapped ? ['Line', coordinates(z)] : coordinates(z)];
      const input = args(2);
      const arrow = await g3d.Arrow(input, env);
      const before = arrow.line.scale.y;
      await g3d.Arrow.update(args(4), env);
      results.push([before, arrow.line.scale.y, env.mesh.children.length,
        input[0][0] === (wrapped ? 'Line' : packed ? 'JSObject' : 'List')]);
    }
    return results;
  })()`, context);
  for (const [before, after, objects, preserved] of arrows) {
    assert.equal(before, 1.6, 'arrow must use the supplied endpoint');
    assert.equal(after, 3.2, 'arrow updates must use the new endpoint');
    assert.equal(objects, 1, 'Line inside Arrow must not create a separate line mesh');
    assert.ok(preserved, 'rendering an arrow must retain its source expression');
  }
  const cells = await vm.runInContext(`(async () => {
    const results = [];
    const corners = (origin, vectors) => Array.from({length: 8}, (_, bits) =>
      origin.map((p, axis) => p + vectors.reduce((sum, v, i) =>
        sum + ((bits & (1 << i)) ? v[axis] : 0), 0)).join(',')).sort();
    for (const packed of [false, true]) {
      const env = {local: {}, mesh: new sharedThree.Group(),
        material: sharedThree.MeshPhysicalMaterial, wake() {}};
      const data = (origin, vectors) => packed
        ? [['JSObject', new NumericArrayObject(new Float64Array(origin), [3])],
           ['JSObject', new NumericArrayObject(new Float64Array(vectors.flat()), [3, 3])]]
        : [['JSObject', origin], ['JSObject', vectors]];
      const inspect = () => {
        env.mesh.updateMatrixWorld(true);
        const box = env.local.box;
        const positions = box.geometry.getAttribute('position');
        return [...new Set(Array.from({length: positions.count}, (_, i) => {
          const p = new sharedThree.Vector3().fromBufferAttribute(positions, i)
            .applyMatrix4(box.matrixWorld);
          return p.toArray().join(',');
        }))].sort();
      };
      const origin = [1, 2, 3], vectors = [[2, 0, 0], [1, 3, 0], [0.5, 0.25, 4]];
      await g3d.Parallelepiped(data(origin, vectors), env);
      results.push([inspect(), corners(origin, vectors)]);
      const nextOrigin = [4, 5, 6], nextVectors = [[3, 0, 0], [-1, 2, 0], [1, 0, 5]];
      await g3d.Parallelepiped.update(data(nextOrigin, nextVectors), env);
      results.push([inspect(), corners(nextOrigin, nextVectors)]);
      await g3d.Parallelepiped.destroy([], env);
    }
    return results;
  })()`, context);
  for (const [actual, expected] of cells)
    assert.equal(JSON.stringify(actual), JSON.stringify(expected),
      'skew crystal cells must retain their origin, basis vectors and updates');
  context.scaleCases = [
    [[2, 4, 8], undefined, [1, 1, 1]],
    [[2, 4, 8], 'Automatic', [1, 1, 1]],
    [[2, 4, 8], [1, 1, 1], [4, 2, 1]],
    [[2, 4, 8], [1, 2, 3], [4 / 3, 2, 2 / 3]],
    [[100, 200, 400], 'Automatic', [.025, .025, .025]],
    [[0, 2, 4], [1, 1, 1], [1, 2, 1]]
  ];
  const scales = vm.runInContext('scaleCases.map(([size, ratios]) => graphics3DBoxScale(size, ratios))', context);
  scales.forEach((actual, i) => assert.ok(actual.every((r, axis) =>
    Number.isFinite(r) && Math.abs(r - context.scaleCases[i][2][axis]) < 1e-12),
    'Automatic and explicit box ratios must produce finite scene scales'));
  if (!process.argv[2]) {
    console.log('38 arrow, crystal-cell and scene-scale assertions passed');
    return;
  }
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
      const options = await core._getRules(graphic.slice(1), {...env, hold: true});
      if ('[object Promise]' in options) throw new Error('Unresolved Graphics3D option name');
      await interpretate(graphic[1], env);
      let meshes = 0;
      const extent = new sharedThree.Box3().setFromObject(scene).getSize(new sharedThree.Vector3());
      const boxRatios = 'BoxRatios' in options ? await interpretate(options.BoxRatios, env) : undefined;
      scene.scale.set(...graphics3DBoxScale([extent.x, extent.z, extent.y], boxRatios));
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
  const expected = Number(process.argv[3] || 6);
  assert.equal(results.length, expected, 'all saved 3D outputs must be checked');
  assert.ok(results.every(n => n > 0), 'each output must produce geometry');
  console.log(`All ${expected} imported 3D outputs produce finite, indexed geometry`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
