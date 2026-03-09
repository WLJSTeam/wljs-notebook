
let g3d = {};
g3d.name = "WebObjects/Graphics3D";
interpretate.contextExpand(g3d); 

["AlignmentPoint", "AspectRatio", "AutomaticImageSize", "Axes", 
"AxesEdge", "AxesLabel", "AxesOrigin", "AxesStyle", "Background", 
"BaselinePosition", "BaseStyle", "Boxed", "BoxRatios", "BoxStyle", 
"ClipPlanes", "ClipPlanesStyle", "ColorOutput", "ContentSelectable", 
"ColorFunction",
"ControllerLinking", "ControllerMethod", "ControllerPath", 
"CoordinatesToolOptions", "DisplayFunction", "Epilog", "FaceGrids", 
"FaceGridsStyle", "FormatType", "ImageMargins", "ImagePadding", 
"ImageSize", "ImageSizeRaw", "LabelStyle", "Lighting", "Method", 
"PlotLabel", "PlotRange", "PlotRangePadding", "PlotRegion", 
"PreserveImageOptions", "Prolog", "RotationAction", 
"SphericalRegion", "Ticks", "TicksStyle", "TouchscreenAutoZoom", 
"ViewAngle", "ViewCenter", "ViewMatrix", "ViewPoint", 
"ViewProjection", "VertexTextureCoordinates", "RTX","ViewRange", "ViewVector", "ViewVertical", "Controls", "PointerLockControls", "VertexNormals", "VertexColors"].map((e)=>{
  g3d[e] = () => e;
});

g3d.VertexNormals.update = () => "VertexNormals"
g3d.VertexColors.update = () => "VertexColors"

g3d.Void = (args, env) => {console.log(args); console.warn('went to the void...');}
g3d.Void.update = () => {}
g3d.Void.destroy = () => {}

g3d.CapForm = g3d.Void
g3d.Appearance = g3d.Void;

g3d.All = () => 'All'

/**
* @type {import('three')}
*/
let THREE;
let MathUtils;

function computeGroupCenter(group) {
  var center = new THREE.Vector3();
  var children = group.children;
  var count = children.length;
  for (var i = 0; i < count; i++) {
    center.add(children[i].position);
  }
  center.divideScalar(count);
  return center;
}

/**
 * Create a set of tick‐marks around the boundary of a rectangle
 * instead of drawing every grid line.
 *
 * @param {number} width   Full width of the plane
 * @param {number} height  Full height of the plane
 * @param {number} divisions  Number of subdivisions per side
 * @param {number} tickLength  Length of each tick (in world units)
 */
function createATicks(width, height, divisions, nodubs = false, special = false) {
  const invertTickDirection = false;
  const halfW = width / 2;
  const halfH = height / 2;
  const stepX = width / divisions;
  const stepY = height / divisions;
  const dir = invertTickDirection ? -1 : 1;
  const points = [];
  const tickLength = [stepX*0.4, stepY*0.4];
  const material = new THREE.LineBasicMaterial({ toneMapped: false, color: new THREE.Color("gray") });

  // vertical ticks on bottom/top
  if (special) {
    points.push(new THREE.Vector3(halfW, halfH, 0));
    points.push(new THREE.Vector3(halfW, -halfH, 0));
    
    points.push(new THREE.Vector3(-halfW, halfH, 0));
    points.push(new THREE.Vector3(-halfW, -halfH, 0));

    if (nodubs) {
      points.push(new THREE.Vector3(-halfW, -halfH, 0));
      points.push(new THREE.Vector3(halfW, -halfH, 0));

      points.push(new THREE.Vector3(halfW, -halfH, 0));
      points.push(new THREE.Vector3(halfW, halfH, 0));
      
    }
  }
    for (let i = 0; i <= divisions; i++) {
      const x = -halfW + stepX*i;
      // bottom edge tick (positive→up, or negative→down if inverted)

      points.push(new THREE.Vector3(x, -halfH, 0));
      points.push(new THREE.Vector3(x, -halfH + dir*tickLength[1], 0));
      // top edge tick

      if (!nodubs) {
        points.push(new THREE.Vector3(x,  halfH, 0));
        points.push(new THREE.Vector3(x,  halfH - dir*tickLength[1], 0));
      }
    }
  

  
  // horizontal ticks on left/right

    for (let j = 0; j <= divisions; j++) {
      const y = -halfH + stepY*j;
      // right edge

      points.push(new THREE.Vector3( halfW, y, 0));
      points.push(new THREE.Vector3( halfW - dir*tickLength[0], y, 0));

      // left edge


      points.push(new THREE.Vector3(-halfW, y, 0));
      points.push(new THREE.Vector3(-halfW + dir*tickLength[0], y, 0));

    }
  
   


  return new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    material
  );
}


import labToRgb from '@fantasy-color/lab-to-rgb'


g3d.LABColor =  async (args, env) => {
  let lab;
  if (args.length > 1)
    lab = [await interpretate(args[0], env), await interpretate(args[1], env), await interpretate(args[2], env)];
  else 
    lab = await interpretate(args[0], env);

    const color = labToRgb({luminance: 100*lab[0], a: 100*lab[1], b: 100*lab[2]});
  console.log('LAB color');
  console.log(color);
  
  env.color = new THREE.Color(color.red / 255.0, color.green / 255.0, color.blue / 255.0);
  if (args.length > 3) env.opacity = await interpretate(args[3], env);
  
  return env.color;   
}

g3d.LABColor.update = () => {}


g3d.LinearFog = async (args, env) => {
  let near = 1; let far = 100;
  let color = 0xcccccc;
  if (args.length > 0) {
    color = await interpretate(args[0], env);
  } if (args.length > 1) {
    [near, far] = await interpretate(args[1], env);
  }
  
  env.global.scene.fog = new THREE.Fog( color, near, far );
}



g3d.Style = async (args, env) => {
  const copy = env;
  const options = await core._getRules(args, env);
  
  if (options.FontSize) {
    copy.fontSize = options.FontSize;
  }  

  if (options.FontColor) {
    copy.color = options.FontColor;
  }

  if (options.FontFamily) {
    copy.fontFamily = options.FontFamily
  } 

  for(let i=1; i<(args.length - Object.keys(options).length); ++i) {
    const res = await interpretate(args[i], copy);
    if (res == 'Bold') {
      copy.fontweight = 'bold';
    }
  }

  return await interpretate(args[0], copy);
}

g3d.Style.update = async (args, env) => {
    const options = await core._getRules(args, env);
    
    if (options.FontSize) {
      env.fontSize = options.FontSize;
    }  
  
    if (options.FontFamily) {
      env.fontFamily = options.FontFamily
    } 
  
    return await interpretate(args[0], env);
}  

/**
 * @description https://threejs.org/docs/#api/en/materials/LineDashedMaterial
 */
g3d.Dashing = (args, env) => {
  console.log("Dashing not implemented");
}

g3d.Annotation = core.List

g3d.GraphicsGroup = async (args, env) => {
  const group = new THREE.Group();
  let copy = {...env};

  copy.mesh = group;

  for (const a of args) {
    await interpretate(a, copy);
  }

  env.mesh.add(group);
};

g3d.Metalness = (args, env) => {
  env.metalness = interpretate(args[0], env);
}

g3d.Emissive = async (args, env) => {
  const copy = {...env};
  await interpretate(args[0], copy);
  env.emissive = copy.color;
  if (args.length > 1) {
    env.emissiveIntensity = await interpretate(args[1], copy);
  }
}

g3d.Glow = g3d.Emissive

let hsv2hsl = (h,s,v,l=v-v*s/2, m=Math.min(l,1-l)) => [h,m?(v-l)/m:0,l];

g3d.Hue = async (args, env) => {
    env.colorInherit = false;
  

    let color = await Promise.all(args.map(el => interpretate(el, env)));
    if (color.length < 3) {
      color = [color[0], 1,1];
    }
    color = hsv2hsl(...color);
    color = [color[0], (color[1]*100).toFixed(2), (color[2]*100).toFixed(2)];


    env.color = new THREE.Color("hsl("+(3.14*100*color[0]).toFixed(2)+","+color[1]+"%,"+color[2]+"%)");
    return env.color; 

}   

g3d.EdgeForm = async (args, env) => {
  env.edgecolor = await interpretate(args[0], {...env});
}

g3d.RGBColor = async (args, env) => {
  env.colorInherit = false;

  if (args.length !== 3 && args.length !== 4 && args.length !== 1) {
    console.log("RGB format not implemented", args);
    console.error("RGB values should be triple!");
    return;
  }

  let a = [...args];

  if (args.length === 1) {
    a = await interpretate(args[0], env); // return [r, g, b] , 0<=r, g, b<=1
  }

  const r = await interpretate(a[0], env);
  const g = await interpretate(a[1], env);
  const b = await interpretate(a[2], env);

  env.color = new THREE.Color(r, g, b);
  return env.color;
};

g3d.GrayLevel = async (args, env) => { 
  env.colorInherit = false;
  const r = await interpretate(args[0], env);

  env.color = new THREE.Color(r, r, r);
  return env.color;

};



g3d.Roughness = (args, env) => {
  const o = interpretate(args[0], env);
  if (typeof o !== "number") console.error("Opacity must have number value!");
  console.log(o);
  env.roughness = o;  
}

g3d.Opacity = (args, env) => {
  var o = interpretate(args[0], env);
  if (typeof o !== "number") console.error("Opacity must have number value!");
  console.log(o);
  env.opacity = o;
};

g3d.Scale = async (args, env) => {
  // args: [object, scale, center?]
  const object = args[0];
  let scale = await interpretate(args[1], env);
  let center = args.length > 2 ? await interpretate(args[2], env) : [0, 0, 0];

  if (scale instanceof NumericArrayObject) scale = scale.normal();
  if (!Array.isArray(scale)) scale = [scale, scale, scale];
  if (center instanceof NumericArrayObject) center = center.normal();

  const group = new THREE.Group();
  await interpretate(object, { ...env, mesh: group });

  // Build transformation: T(center) * S(scale) * T(-center)
  const t1 = new THREE.Matrix4().makeTranslation(-center[0], -center[1], -center[2]);
  const s = new THREE.Matrix4().makeScale(scale[0], scale[1], scale[2]);
  const t2 = new THREE.Matrix4().makeTranslation(center[0], center[1], center[2]);
  const m = new THREE.Matrix4().multiplyMatrices(t2, s).multiply(t1);
  group.applyMatrix4(m);

  env.mesh.add(group);
  env.local.group = group;
  env.local.scale = scale.slice();
  env.local.center = center.slice();
  return group;
}

g3d.Scale.update = async (args, env) => {
  let scale = await interpretate(args[1], env);
  let center = args.length > 2 ? await interpretate(args[2], env) : [0, 0, 0];
  if (scale instanceof NumericArrayObject) scale = scale.normal();
  if (!Array.isArray(scale)) scale = [scale, scale, scale];
  if (center instanceof NumericArrayObject) center = center.normal();

  // Compute delta scale
  const prevScale = env.local.scale || [1, 1, 1];
  const prevCenter = env.local.center || [0, 0, 0];

  // Remove previous scaling by applying inverse
  const t1 = new THREE.Matrix4().makeTranslation(-prevCenter[0], -prevCenter[1], -prevCenter[2]);
  const sInv = new THREE.Matrix4().makeScale(1 / prevScale[0], 1 / prevScale[1], 1 / prevScale[2]);
  const t2 = new THREE.Matrix4().makeTranslation(prevCenter[0], prevCenter[1], prevCenter[2]);
  const mInv = new THREE.Matrix4().multiplyMatrices(t2, sInv).multiply(t1);
  env.local.group.applyMatrix4(mInv);

  // Apply new scaling
  const t1n = new THREE.Matrix4().makeTranslation(-center[0], -center[1], -center[2]);
  const sn = new THREE.Matrix4().makeScale(scale[0], scale[1], scale[2]);
  const t2n = new THREE.Matrix4().makeTranslation(center[0], center[1], center[2]);
  const mn = new THREE.Matrix4().multiplyMatrices(t2n, sn).multiply(t1n);
  env.local.group.applyMatrix4(mn);

  env.local.scale = scale.slice();
  env.local.center = center.slice();
  env.wake && env.wake();
};

g3d.Scale.virtual = true 
g3d.Scale.destroy = () => {}


g3d.ImageScaled = (args, env) => { };

g3d.Thickness = async (args, env) => { env.thickness = await interpretate(args[0], env)
};

g3d.AbsoluteThickness = async (args, env) => { env.thickness = await interpretate(args[0], env)
};

g3d.Arrowheads = async (args, env) => {
    let obj = await interpretate(args[0], env);
    if (Array.isArray(obj)) {
      obj = obj.flat(Infinity)[0];
      env.arrowHeight = obj*280;
      env.arrowRadius = obj*180;      
    } else {
      env.arrowHeight = obj*280;
      env.arrowRadius = obj*180;
    }
};

const g3dComplex = {};

g3dComplex.Tube = async (args, env) => {
  let data = await interpretate(args[0], env);

  let radius = 1;
  if (args.length > 1) radius = await interpretate(args[1], env);
  if (env.radius) radius = env.radius;

  if (radius instanceof NumericArrayObject) {
    radius = radius.normal();
  }

  let multipleInstances = false;

  if (data instanceof NumericArrayObject) { 
    
    data = data.buffer;
    
  } else {
    if (Array.isArray(data[0])) {
      data.forEach((d) => interpretate(['Tube', ['JSObject', d], ...args.slice(1)], env) );
      return;
    }
  }

  let coordinates = [];
  const ref = env.vertices.position.array;
  for (let i=0; i<data.length; ++i) {
    const index = (data[i]-1)*3;
    coordinates.push([ref[index], ref[index+1], ref[index+2]]);
  }

  /**
   * @type {env.material}}
   */  
  const material = new env.material({
    color: env.color,
    transparent: env.opacity < 1.0,
    roughness: env.roughness,
    opacity: env.opacity,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,  
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
    thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
    
  });

  if (!VariableTube) {
    VariableTube = await import('./../libs/tubes/index.js');
    VariableTube = VariableTube.VariableTube;
  } 

    const tube = new VariableTube( material, coordinates, null, radius, 16, false );

    env.mesh.add(tube.mesh);
    env.local.tube = tube;
  
    //geometry.dispose();
  
    material.dispose();  
}

g3dComplex.Tube.update = () => console.error('Tube inside Complex does not support updates')

g3dComplex.Tube.destroy = async (args, env) => {
  if (env.local.tube) env.local.tube.dispose();
}

g3dComplex.Tube.virtual = true;

g3d.Cone = async (args, env) => {

  let radius = 1;
  if (args.length > 1) radius = await interpretate(args[1], env);
  /**
   * @type {THREE.Vector3}}
   */
  let coordinates = await interpretate(args[0], env);
  //throw coordinates;

  if (coordinates instanceof NumericArrayObject) {
    coordinates = coordinates.normal();
  }

  if (radius instanceof NumericArrayObject) {
    radius = radius.normal();
  }  

  if (!Array.isArray(radius)) {
    radius = coordinates.map(() => radius);
  }

  radius[radius.length - 1] = 0.;

  let dir = [coordinates[0][0]-coordinates[1][0], coordinates[0][1]-coordinates[1][0], coordinates[0][2]-coordinates[1][2]];

  const base = dir.map((el, index) => coordinates[0][index] + 0.0001 * el); //Dirty hack
  coordinates.unshift(base);
  radius.unshift(0.000001);





  /**
   * @type {env.material}}
   */  
  const material = new env.material({
    color: env.color,
    transparent: env.opacity < 1.0,
    roughness: env.roughness,
    opacity: env.opacity,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,  
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
    thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
    
  });

  if (!VariableTube) {
    VariableTube = await import('./../libs/tubes/index.js');
    VariableTube = VariableTube.VariableTube;
  } 

    const tube = new VariableTube( material, coordinates, null, radius, 16, false );

    env.mesh.add(tube.mesh);
    env.local.tube = tube;
  
    //geometry.dispose();
  
  material.dispose();
}

g3d.Cone.update = async (args, env) => {
  let radius = 1;
  if (args.length > 1) radius = await interpretate(args[1], env);

  let coordinates = await interpretate(args[0], env);

  if (coordinates instanceof NumericArrayObject) {
    coordinates = coordinates.normal();
  }

  if (radius instanceof NumericArrayObject) {
    radius = radius.normal();
  }  

  if (!Array.isArray(radius)) {
    radius = coordinates.map(() => radius);
  }

  radius[radius.length - 1] = 0.;
  let dir = [coordinates[0][0]-coordinates[1][0], coordinates[0][1]-coordinates[1][0], coordinates[0][2]-coordinates[1][2]];

  const base = dir.map((el, index) => coordinates[0][index] + 0.0001 * el); //Dirty hack
  coordinates.unshift(base);
  radius.unshift(0.000001);

  env.local.tube.update(coordinates, radius);
  
  //env.local.tube.geometry.dispose();
  //env.local.tube.geometry = new VariableTube(path, Math.max(20, 4 * array.length), radius, 16, false);
  env.wake(true);
}

g3d.Cone.virtual = true

g3d.Cone.destroy = async (args, env) => {
  env.local.tube.dispose();
}

g3d.Tube = async (args, env) => {

  let radius = 1;
  if (args.length > 1) radius = await interpretate(args[1], env);
  /**
   * @type {THREE.Vector3}}
   */
  let coordinates = await interpretate(args[0], env);
  //throw coordinates;

  if (coordinates instanceof NumericArrayObject) {
    coordinates = coordinates.normal();
  }

  if (radius instanceof NumericArrayObject) {
    radius = radius.normal();
  }  



  /**
   * @type {env.material}}
   */  
  const material = new env.material({
    color: env.color,
    transparent: env.opacity < 1.0,
    roughness: env.roughness,
    opacity: env.opacity,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,  
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
    thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
    
  });

  if (!VariableTube) {
    VariableTube = await import('./../libs/tubes/index.js');
    VariableTube = VariableTube.VariableTube;
  } 

    const tube = new VariableTube( material, coordinates, null, radius, 16, false );

    env.mesh.add(tube.mesh);
    env.local.tube = tube;
  
    //geometry.dispose();
  
  material.dispose();
}

g3d.Tube.update = async (args, env) => {
  let radius = 1;
  if (args.length > 1) radius = await interpretate(args[1], env);

  let coordinates = await interpretate(args[0], env);

  if (coordinates instanceof NumericArrayObject) {
    coordinates = coordinates.normal();
  }

  if (radius instanceof NumericArrayObject) {
    radius = radius.normal();
  }  

  env.local.tube.update(coordinates, radius);
  
  //env.local.tube.geometry.dispose();
  //env.local.tube.geometry = new VariableTube(path, Math.max(20, 4 * array.length), radius, 16, false);
  env.wake(true);
}

g3d.Tube.virtual = true

g3d.Tube.destroy = async (args, env) => {
  env.local.tube.dispose();
}


g3d.TubeArrow = async (args, env) => {


  let radius = 1;
  if (args.length > 1) radius = await interpretate(args[1], env);
  /**
   * @type {THREE.Vector3}}
   */
  const coordinates = await interpretate(args[0], env);
  //throw coordinates;

  /**
   * @type {env.material}}
   */  
  const material = new env.material({
    color: env.color,
    transparent: env.opacity < 1.0,
    roughness: env.roughness,
    opacity: env.opacity,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,
    
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
    
  });

  //points 1, 2
  const p2 = new THREE.Vector3(...coordinates[0]);
  const p1 = new THREE.Vector3(...coordinates[1]);
  //direction
  const dp = p2.clone().addScaledVector(p1, -1);

  const geometry = new THREE.CylinderGeometry(radius, radius, dp.length(), 32, 1);

  //calculate the center (might be done better, i hope BoundingBox doest not envolve heavy computations)


  //default geometry
  const cylinder = new THREE.Mesh(geometry, material);

  //cone
  const conegeometry = new THREE.ConeGeometry(env.arrowRadius/100.0, env.arrowHeight/60.0, 32 );
  const cone = new THREE.Mesh(conegeometry, material);
  cone.position.y = dp.length()/2 + env.arrowHeight/120.0;

  let group = new THREE.Group();
  group.add(cylinder, cone);


  var HALF_PI = Math.PI * .5;
  var position  = p1.clone().add(p2).divideScalar(2);

  var orientation = new THREE.Matrix4();//a new orientation matrix to offset pivot
  var offsetRotation = new THREE.Matrix4();//a matrix to fix pivot rotation
  var offsetPosition = new THREE.Matrix4();//a matrix to fix pivot position
  orientation.lookAt(p1,p2,new THREE.Vector3(0,1,0));//look at destination
  offsetRotation.makeRotationX(HALF_PI);//rotate 90 degs on X
  orientation.multiply(offsetRotation);//combine orientation with rotation transformations
  
  env.local.matrix = group.matrix.clone();
  group.applyMatrix4(orientation);


  //group.position=position;    


  //translate its center to the middle target point
  group.position.addScaledVector(position, 1);

  env.local.group = group;

  env.mesh.add(group);

  geometry.dispose();
  conegeometry.dispose();
  material.dispose();

  return group;
};

g3d.TubeArrow.update = async (args, env) => {
  /**
   * @type {THREE.Vector3}}
   */
  
  
  const coordinates = await interpretate(args[0], env);
  //points 1, 2
  const p2 = new THREE.Vector3(...coordinates[0]);
  const p1 = new THREE.Vector3(...coordinates[1]);
  //direction
  const dp = p2.clone().addScaledVector(p1, -1);

  //const geometry = new THREE.CylinderGeometry(radius, radius, dp.length(), 32, 1);

  //calculate the center (might be done better, i hope BoundingBox doest not envolve heavy computations)


  //default geometry
  //const cylinder = new THREE.Mesh(geometry, material);

  //cone
  //const conegeometry = new THREE.ConeGeometry(env.arrowRadius, env.arrowHeight, 32 );
  //const cone = new THREE.Mesh(conegeometry, material);
  //cone.position.y = dp.length()/2 + env.arrowHeight/2;

  ///let group = new THREE.Group();
  //group.add(cylinder, cone);


  var HALF_PI = Math.PI * .5;
  var position  = p1.clone().add(p2).divideScalar(2);

  var orientation = new THREE.Matrix4();//a new orientation matrix to offset pivot
  var offsetRotation = new THREE.Matrix4();//a matrix to fix pivot rotation
  var offsetPosition = new THREE.Matrix4();//a matrix to fix pivot position
  orientation.lookAt(p1,p2,new THREE.Vector3(0,1,0));//look at destination
  offsetRotation.makeRotationX(HALF_PI);//rotate 90 degs on X
  orientation.multiply(offsetRotation);//combine orientation with rotation transformations

  env.local.matrix.decompose( env.local.group.position, env.local.group.quaternion, env.local.group.scale );
  env.local.group.matrix.copy( env.local.matrix );

  env.local.group.applyMatrix4(orientation);


  //group.position=position;    


  //translate its center to the middle target point
  env.local.group.position.addScaledVector(position, 1);

  env.wake(true);
}

//g3d.TubeArrow.virtual = true 

g3d.Arrow = async (args, env) => {
  let arr;

  if (args.length === 1) {
    if (args[0][0] === 'Tube' || args[0][0] === 'TubeArrow') {
      //console.log('TUBE inside!');
      args[0][0] = 'TubeArrow';
      return await interpretate(args[0], env);
    } else {
      arr = await interpretate(args[0], env);
    }
  } else {
    arr = await interpretate(args[0], env);
  }
  
  if (arr.length === 1) arr = arr[0];


  if (arr.length > 2) {
    var geometry = new THREE.BufferGeometry();
    const points = arr.slice(0, -1);

    geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(points.flat()), 3 ) );

    const material = new THREE.LineBasicMaterial({
      linewidth: env.thickness,
      color: env.color,
      opacity: env.opacity,
      transparent: env.opacity < 1.0 ? true : false
    });
    const line = new THREE.Line(geometry, material);

    env.local.line = line;

    env.mesh.add(line);
  }

  const points = [
    new THREE.Vector4(...arr[arr.length-2], 1),
    new THREE.Vector4(...arr[arr.length-1], 1),
  ];

  points.forEach((p) => {
    p = p.applyMatrix4(env.matrix);
  });

  const origin = points[0].clone();
  const dir = points[1].add(points[0].negate());
  const len = dir.length();

  const arrowHelper = new THREE.ArrowHelper(
    dir.normalize(),
    origin,
    len,
    env.color
  );
  //arrowHelper.castShadow = env.shadows;
  //arrowHelper.receiveShadow = env.shadows;
   


  env.mesh.add(arrowHelper);
  arrowHelper.line.material.linewidth = env.thickness;

  env.local.arrow = arrowHelper;

  return arrowHelper;
};

g3d.Arrow.update = async (args, env) => {
  let arr;

  if (args.length === 1) {
    if (args[0][0] === 'Tube' || args[0][0] === 'TubeArrow') {
      console.log('TUBE inside!');
      //args[0][0] = 'TubeArrow';
      return await interpretate(args[0], env);
    } else {
      arr = await interpretate(args[0], env);
    }
  } else {
    arr = await interpretate(args[0], env);
    if (arr instanceof NumericArrayObject) {
      arr = arr.normal();
    }
  }
  
  if (arr.length === 1) arr = arr[0];

  if (env.local.line) {
    //update line geometry
    const positionAttribute = env.local.line.geometry.getAttribute( 'position' );
    const points = arr.slice(0, -1);

    positionAttribute.needsUpdate = true;

    for ( let i = 0; i < positionAttribute.count; i ++ ) {
      positionAttribute.setXYZ( i, ...(points[i]));
    }

    env.local.line.geometry.computeBoundingBox();
    env.local.line.geometry.computeBoundingSphere();
  }

  const points = [
    new THREE.Vector4(...arr[arr.length-2], 1),
    new THREE.Vector4(...arr[arr.length-1], 1),
  ];

  points.forEach((p) => {
    p = p.applyMatrix4(env.matrix);
  });


  env.local.arrow.position.copy(points[0]);

  const dir = points[1].add(points[0].negate());

  const len = dir.length();

  env.local.arrow.setDirection(dir.normalize());
  env.local.arrow.setLength(len);

  env.wake(true);

}

g3d.Arrow.destroy = async (args, env) => {
  if (env.local.line) env.local.line.dispose();
  if (env.local.arrow) env.local.arrow.dispose();
}

g3d.Arrow.virtual = true

//g3d.Tube = g3d.TubeArrow

g3dComplex.Point = async (args, env) => {
  let data = await interpretate(args[0], env);
  

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', env.vertices.position);
  //env.vertices.geometry.clone();
  

  if (data instanceof NumericArrayObject) { 
    const dp = data.normal(); //FIXME!!!
    geometry.setIndex( dp.flat().map((e)=>e-1) );
  } else {  
    if (!Array.isArray(data)) data = [data];
    geometry.setIndex( data.flat().map((e)=>e-1) );
  }

  let material;
  
  if (env?.vertices?.colored) {
    //geometry.setAttribute()
    geometry.setAttribute( 'color', env.vertices.colors );

    material = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: env.opacity < 1,
      opacity: env.opacity, 
      size: 3.1 * env.pointSize / (0.011111111111111112)       
    });

  } else {
    material = new THREE.PointsMaterial( { color: env.color, opacity: env.opacity, size: 3.1 * env.pointSize / (0.011111111111111112)} );
  }  

  env.local.material = material;
  
  
  const points = new THREE.Points( geometry, material );

  env.local.geometry = geometry;

  env.mesh.add(points);
  env.local.points = points;

  

  return env.local.points;  
}

g3dComplex.Point.virtual = true;

g3dComplex.Point.destroy = (args, env) => {
  env.local.geometry.dispose();
  env.local.material.dispose();

}

g3d.Point = async (args, env) => {
  let data = await interpretate(args[0], env);


  const geometry = new THREE.BufferGeometry();


    if (data instanceof NumericArrayObject) { 
      geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( data.buffer, 3 ) );
    } else {

      geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( new Float32Array(data.flat(Infinity)), 3 ) );
    }
    


  let material;
  
  material = new THREE.PointsMaterial( { color: env.color, opacity: env.opacity, size: 3.1 * env.pointSize / (0.011111111111111112)} );
  
  
  const points = new THREE.Points( geometry, material );

  env.local.geometry = geometry;

  env.mesh.add(points);
  env.local.points = points;

  env.local.material = material;

  return env.local.points;
};

g3d.Point.update = async (args, env) => {

  let data = await interpretate(args[0], env);
  if (data instanceof NumericArrayObject) {
    env.local.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( data.buffer, 3 ) );
  } else {  
    env.local.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( data.flat(Infinity), 3 ) );
  }

  env.wake(true);

  
  return env.local.points;
}

g3d.Point.destroy = async (args, env) => {
  env.local.geometry.dispose();
  env.local.material.dispose();
}

g3d.Point.virtual = true


g3d.Sphere = async (args, env) => {
  var radius = 1;
  if (args.length > 1) radius = await interpretate(args[1], env);

  const material = new env.material({
    color: env.color,
    roughness: env.roughness,
    opacity: env.opacity,
    transparent: env.opacity < 1.0,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
  });

  function addSphere(cr) {
    const origin = new THREE.Vector4(...cr, 1);
    const geometry = new THREE.SphereGeometry(radius, 40, 40);
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.set(origin.x, origin.y, origin.z);
    sphere.castShadow = env.shadows;
    sphere.receiveShadow = env.shadows;

    env.mesh.add(sphere);
    geometry.dispose();
    return sphere;
  }

  console.log(env.local);
  let list = await interpretate(args[0], env);

  if (list instanceof NumericArrayObject) { // convert back automatically
    list = list.normal();
  }

  console.log('DRAW A SPHERE');

  if (list.length === 3) {
    env.local.object = [addSphere(list)];
  } else {

    //env.local.multiple = true;
    env.local.object = [];

    list.forEach((el) => {
      env.local.object.push(addSphere(el));
    });
  } 

  material.dispose();

  return env.local.object;
};

g3d.Sphere.update = async (args, env) => {
  //console.log('Sphere: updating the data!');
  env.wake(true);

  let c = await interpretate(args[0], env);
  if (c instanceof NumericArrayObject) { // convert back automatically
    c = c.normal();
  }

  if (env.local.object.length == 1) {
    c = [c];
  }

  if (env.Lerp) {

      if (!env.local.lerp) {
        console.log('creating worker for lerp of movements multiple..');
        const initial = c.map((e)=> new THREE.Vector3(...e));

        const worker = {
          alpha: 0.05,
          target: initial,
          eval: () => {
            for (let i=0; i<env.local.object.length; ++i)
              env.local.object[i].position.lerp(worker.target[i], 0.05)
          }
        };

        env.local.lerp = worker;  

        env.Handlers.push(worker);
      }
      
      for (let i=0; i<c.length; ++i)
        env.local.lerp.target[i].fromArray(c[i]);

      return;


  }

  if (true) {
    let i = 0;
    c.forEach((cc)=>{
      env.local.object[i].position.set(...cc);
      ++i;
    });

    return;
  }

}

g3d.Sphere.destroy = async (args, env) => {
  console.log('Sphere: destroy');
}

g3d.Sphere.virtual = true

g3d.Sky = (args, env) => {
  const sky = new Sky();
  sky.scale.setScalar( 10000 );
  env.mesh.add( sky );
  env.sky = sky;
  env.sun = new THREE.Vector3();

  const skyUniforms = sky.material.uniforms;

  skyUniforms[ 'turbidity' ].value = 10;
  skyUniforms[ 'rayleigh' ].value = 2;
  skyUniforms[ 'mieCoefficient' ].value = 0.005;
  skyUniforms[ 'mieDirectionalG' ].value = 0.8;
}

g3d._Water = (args, env) => {
  const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 );

  const water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load( 'textures/waternormals.jpg', function ( texture ) {

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      } ),

      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: true
    }
    );

    water.rotation.x = - Math.PI / 2;

    env.mesh.add( water );
    env.water = water;
}

g3d.Cube = async (args, env) => {
  let position = new THREE.Vector3(0, 0, 0);
  let scale = new THREE.Vector3(1, 1, 1);
  let rotation = new THREE.Euler(0, 0, 0);

  for (const arg of args) {
    const val = await interpretate(arg, env);

    if (typeof val === "number") {
      scale.set(val, val, val);
    } else if (Array.isArray(val)) {
      if (val.length === 3) {
        if (val.every(v => typeof v === "number")) {
          // assume it's a position vector
          position.set(...val);
        }
      } else if (val.length === 2) {
        const [theta, phi] = val;
        if (typeof theta === "number" && typeof phi === "number") {
          // rotation angles
          rotation.z = theta;
          rotation.y = phi;
        }
      }
    }
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new env.material({
    color: env.color,
    transparent: true,
    opacity: env.opacity,
    roughness: env.roughness,
    depthWrite: true,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
    thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
  });

  const cube = new THREE.Mesh(geometry, material);

  // Apply transformations
  cube.position.copy(position);
  cube.scale.copy(scale);
  cube.rotation.copy(rotation);

  cube.receiveShadow = env.shadows;
  cube.castShadow = env.shadows;

  env.mesh.add(cube);
  env.local.geometry = cube.geometry.clone();
  env.local.box = cube;

  geometry.dispose();
  material.dispose();

  return cube;
}

g3d.Cube.update = async (args, env) => {
  const box = env.local.box;
  if (!box) {
    console.warn("No cube found to update.");
    return;
  }

  let position = new THREE.Vector3(0, 0, 0);
  let scale = new THREE.Vector3(1, 1, 1);
  let rotation = new THREE.Euler(0, 0, 0);

  for (const arg of args) {
    const val = await interpretate(arg, env);

    if (typeof val === "number") {
      scale.set(val, val, val);
    } else if (Array.isArray(val)) {
      if (val.length === 3 && val.every(v => typeof v === "number")) {
        position.set(...val);
      } else if (val.length === 2) {
        const [theta, phi] = val;
        if (typeof theta === "number" && typeof phi === "number") {
          rotation.z = theta;
          rotation.y = phi;
        }
      }
    }
  }

  // Apply transformations
  box.position.copy(position);
  box.rotation.copy(rotation);

  // Reset geometry and rescale
  box.geometry.copy(env.local.geometry);
  box.geometry.applyMatrix4(new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z));

  env.wake(true);
};

g3d.Cube.destroy = async (args, env) => {
  env.local.box.geometry.dispose();
}

g3d.Cube.virtual = true;

g3d.Cuboid = async (args, env) => {
  //if (params.hasOwnProperty('geometry')) {
  //	var points = [new THREE.Vector4(...interpretate(func.args[0]), 1),
  //				new THREE.Vector4(...interpretate(func.args[1]), 1)];
  //}
  /**
   * @type {THREE.Vector4}
   */
  var diff;
  /**
   * @type {THREE.Vector4}
   */
  var origin;
  var p;

  if (args.length === 2) {
    var points = [
      new THREE.Vector4(...(await interpretate(args[1], env)), 1),
      new THREE.Vector4(...(await interpretate(args[0], env)), 1),
    ];

    origin = points[0]
      .clone()
      .add(points[1])
      .divideScalar(2);
    diff = points[0].clone().add(points[1].clone().negate());
  } else if (args.length === 1) {
    p = await interpretate(args[0], env);
    origin = new THREE.Vector4(...p, 1);
    diff = new THREE.Vector4(1, 1, 1, 1);

    //shift it
    origin.add(diff.clone().divideScalar(2));
  } else {
    console.error("Expected 2 or 1 arguments");
    return;
  }

  //env.local.prev = [diff.x, diff.y, diff.z];

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new env.material({
    color: env.color,
    transparent: true,
    opacity: env.opacity,
    roughness: env.roughness,
    depthWrite: true,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte    
    
    
    
  });

  //material.side = THREE.DoubleSide;

  const cube = new THREE.Mesh(geometry, material);

  //var tr = new THREE.Matrix4();
  //	tr.makeTranslation(origin.x,origin.y,origin.z);

  //cube.applyMatrix(params.matrix.clone().multiply(tr));

  cube.position.set(origin.x, origin.y, origin.z);

  env.local.geometry = cube.geometry.clone();
  cube.geometry.applyMatrix4(new THREE.Matrix4().makeScale(diff.x, diff.y, diff.z));

  cube.receiveShadow = env.shadows;
  cube.castShadow = env.shadows;

  env.mesh.add(cube);

  env.local.box = cube;

  geometry.dispose();
  material.dispose();

  return cube;
};

g3d.Cuboid.update = async (args, env) => {
  /**
       * @type {THREE.Vector4}
       */
  var diff;
  /**
   * @type {THREE.Vector4}
   */
  var origin;
  var p;

  if (args.length === 2) {
    var points = [
      new THREE.Vector4(...(await interpretate(args[1], env)), 1),
      new THREE.Vector4(...(await interpretate(args[0], env)), 1),
    ];
  
    origin = points[0]
      .clone()
      .add(points[1])
      .divideScalar(2);
    diff = points[0].clone().add(points[1].clone().negate());
  } else {
    p = await interpretate(args[0], env);
    origin = new THREE.Vector4(...p, 1);
    diff = new THREE.Vector4(1, 1, 1, 1);
  
    //shift it
    origin.add(diff.clone().divideScalar(2));
  }


  console.log(diff.x, diff.y, diff.z);

  env.local.box.position.copy(origin);
  env.local.box.geometry.copy(env.local.geometry);
  env.local.box.geometry.applyMatrix4(new THREE.Matrix4().makeScale(diff.x, diff.y, diff.z));

  //env.local.box.updateMatrix();


  env.wake(true);

} 

g3d.Cuboid.destroy = async (args, env) => {
  env.local.box.geometry.dispose();
}

g3d.Cuboid.virtual = true;


g3d.Center = (args, env) => {
  return "Center";
};

g3d.Cylinder = async (args, env) => {
  let radius = 1;
  if (args.length > 1) radius = await interpretate(args[1], env);
  /**
   * @type {THREE.Vector3}}
   */
  let coordinates = await interpretate(args[0], env);
  if (coordinates.length === 1) {
    coordinates = coordinates[0];
  }

  coordinates[0] = new THREE.Vector3(...coordinates[0]);
  coordinates[1] = new THREE.Vector3(...coordinates[1]);

  const material = new env.material({
    color: env.color,
    transparent: env.opacity < 1.0,
    roughness: env.roughness,
    opacity: env.opacity,
    metalness: env.metalness,
    emissive: env.emissive,
emissiveIntensity: env.emissiveIntensity,
ior: env.ior,
transmission: env.transmission,
thinFilm: env.thinFilm,
thickness: env.materialThickness,
attenuationColor: env.attenuationColor,
attenuationDistance: env.attenuationDistance,
clearcoat: env.clearcoat,
clearcoatRoughness: env.clearcoatRoughness,
sheenColor: env.sheenColor,
sheenRoughness: env.sheenRoughness,
iridescence: env.iridescence,
iridescenceIOR: env.iridescenceIOR,
iridescenceThickness: env.iridescenceThickness,
specularColor: env.specularColor,
specularIntensity: env.specularIntensity,
matte: env.matte    
    
    
  });

  console.log(coordinates);

  // edge from X to Y
  var direction = new THREE.Vector3().subVectors(coordinates[1], coordinates[0]);

  console.log(direction);

  // Make the geometry (of "direction" length)
  var geometry = new THREE.CylinderGeometry(radius, radius, 1, 32, 4, false);
  // shift it so one end rests on the origin
  geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 1 / 2.0, 0));
  // rotate it the right way for lookAt to work
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(90)));
  // Make a mesh with the geometry

  //env.local.geometry = geometry.clone();

  //geometry.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, direction.length()));


  var mesh = new THREE.Mesh(geometry, material);
  // Position it where we want
  mesh.receiveShadow = env.shadows;
  mesh.castShadow = env.shadows;

  //env.local.bmatrix = mesh.matrix.clone();

  mesh.position.copy(coordinates[0]);

  env.local.g = mesh.geometry.clone();
  mesh.geometry.applyMatrix4(new THREE.Matrix4().makeScale(1,1,direction.length()));
  //mesh.scale.set( 1,1,direction.length() );

  // And make it point to where we want
  mesh.geometry.lookAt(direction); 

  

  env.local.cylinder = mesh;
  //env.local.coordinates = coordinates;
  //mesh.matrixAutoUpdate = false;

  env.mesh.add(mesh);

  //geometry.dispose();
  //material.dispose();
};

g3d.Cylinder.update = async (args, env) => {
  let coordinates = await interpretate(args[0], env);
  if (coordinates.length === 1) {
    coordinates = coordinates[0];
  }

  coordinates[0] = new THREE.Vector3(...coordinates[0]);
  coordinates[1] = new THREE.Vector3(...coordinates[1]);   
  
  var direction = new THREE.Vector3().subVectors(coordinates[1], coordinates[0]);


  env.local.cylinder.position.copy(coordinates[0]);

  //env.local.cylinder.matrix.identity();
  env.local.cylinder.geometry.copy(env.local.g);
  env.local.cylinder.geometry.applyMatrix4(new THREE.Matrix4().makeScale(1,1,direction.length()));

  //env.local.cylinder.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, direction.length()));
  //env.local.cylinder.scale.set( 1,1,direction.length() );
  // And make it point to where we want
  env.local.cylinder.geometry.lookAt(direction); 

  env.wake(true);

}

g3d.Cylinder.destroy = async (args, env) => {
  env.local.cylinder.geometry.dispose();
  env.local.g.dispose();
}

g3d.Cylinder.virtual = true

g3d.Octahedron = async (args, env) => {
  let position = new THREE.Vector3(0, 0, 0);
  let scale = 1.0;
  let rotation = new THREE.Euler(0, 0, 0);

  for (const arg of args) {
    const val = await interpretate(arg, env);
    if (typeof val === "number") {
      scale = val;
    } else if (Array.isArray(val)) {
      if (val.length === 3 && val.every(v => typeof v === "number")) {
        position.set(...val);
      } else if (val.length === 2 && val.every(v => typeof v === "number")) {
        rotation.z = val[0];
        rotation.y = val[1];
      }
    }
  }

  const geometry = new THREE.OctahedronGeometry(1);
  const material = new env.material({
    color: env.color,
    transparent: env.opacity < 1.0,
    roughness: env.roughness,
    opacity: env.opacity,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,  
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
    thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
    
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.scale.set(scale, scale, scale);
  mesh.rotation.copy(rotation);
  mesh.receiveShadow = env.shadows;
  mesh.castShadow = env.shadows;

  env.mesh.add(mesh);


  geometry.dispose();
  material.dispose();
  return mesh;
};

g3d.Tetrahedron = async (args, env) => {
  let position = new THREE.Vector3(0, 0, 0);
  let scale = 1.0;
  let rotation = new THREE.Euler(0, 0, 0);

  for (const arg of args) {
    const val = await interpretate(arg, env);
    if (typeof val === "number") {
      scale = val;
    } else if (Array.isArray(val)) {
      if (val.length === 3 && val.every(v => typeof v === "number")) {
        position.set(...val);
      } else if (val.length === 2 && val.every(v => typeof v === "number")) {
        rotation.z = val[0];
        rotation.y = val[1];
      }
    }
  }

  const geometry = new THREE.TetrahedronGeometry(1);
  const material = new env.material({
    color: env.color,
    transparent: env.opacity < 1.0,
    roughness: env.roughness,
    opacity: env.opacity,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,  
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
    thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
    
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.scale.set(scale, scale, scale);
  mesh.rotation.copy(rotation);
  mesh.receiveShadow = env.shadows;
  mesh.castShadow = env.shadows;

  env.mesh.add(mesh);


  geometry.dispose();
  material.dispose();
  return mesh;
};

g3d.Icosahedron = async (args, env) => {
  let position = new THREE.Vector3(0, 0, 0);
  let scale = 1.0;
  let rotation = new THREE.Euler(0, 0, 0);

  for (const arg of args) {
    const val = await interpretate(arg, env);
    if (typeof val === "number") {
      scale = val;
    } else if (Array.isArray(val)) {
      if (val.length === 3 && val.every(v => typeof v === "number")) {
        position.set(...val);
      } else if (val.length === 2 && val.every(v => typeof v === "number")) {
        rotation.z = val[0];
        rotation.y = val[1];
      }
    }
  }

  const geometry = new THREE.IcosahedronGeometry(1);
  const material = new env.material({
    color: env.color,
    transparent: env.opacity < 1.0,
    roughness: env.roughness,
    opacity: env.opacity,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,  
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
    thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
    
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.scale.set(scale, scale, scale);
  mesh.rotation.copy(rotation);
  mesh.receiveShadow = env.shadows;
  mesh.castShadow = env.shadows;

  env.mesh.add(mesh);

  geometry.dispose();
  material.dispose();
  return mesh;
};

g3d.Translate = async (args, env) => {
  let group = new THREE.Group();

  let p = await interpretate(args[1], env);
  if (p instanceof NumericArrayObject) { // convert back automatically
    p = p.normal();
  }

  //Backup of params
  let copy = Object.assign({}, env);
  copy.mesh = group;
  await interpretate(args[0], copy);

  group.translateX(p[0]);
  group.translateY(p[1]);
  group.translateZ(p[2]);

  env.local.mesh = group;

  env.mesh.add(group);
};

g3d.Translate.update = async (args, env) => {
  env.wake(true);
  let p = await interpretate(args[1], env);
  if (p instanceof NumericArrayObject) { // convert back automatically
    p = p.normal();
  }
  const group = env.local.mesh;

  if (env.Lerp) {

    if (!env.local.lerp) {
      console.log('creating worker for lerp of movements..');
      const worker = {
        alpha: 0.05,
        target: new THREE.Vector3(...p),
        eval: () => {
          group.position.lerp(worker.target, 0.05)
        }
      };

      env.local.lerp = worker;  

      env.Handlers.push(worker);
    }

    env.local.lerp.target.fromArray(p);
    return;
  }

  group.position.set(p[0], p[1], p[2]);
}

g3d.Translate.virtual = true  

g3d.Translate.destroy = (args, env) => {
  env.local.mesh.removeFromParent();
}

g3d.LookAt = async (args, env) => {
  const group = new THREE.Group();
  const dir = await interpretate(args[1], env);



  await interpretate(args[0], {...env, mesh:group});

  let bbox = new THREE.Box3().setFromObject(group);
  let center = bbox.max.clone().add(bbox.min).divideScalar(2);

  console.log('center: ');
  console.log(center);

  let translate = new THREE.Matrix4().makeTranslation(
    -center.x,
    -center.y,
    -center.z,
  );

  group.applyMatrix4(translate);

  group.lookAt(...dir);
  group.rotation.x = MathUtils.PI/2;

  translate = new THREE.Matrix4().makeTranslation(
    center.x,
    center.y,
    center.z,
  );

  group.applyMatrix4(translate);

  env.local.group = group;

  env.mesh.add(group);
}

g3d.LookAt.update = async (args, env) => {
  env.wake(true);
  const dir = await interpretate(args[1], env);
  env.local.group.lookAt(...dir);
}  

g3d.LookAt.virtual = true


const decodeTransformation = (arrays, env) => {

  /*console.log(p);
  var centering = false;
  var centrans = [];

  if (p.length === 1) {
    p = p[0];
  }
  if (p.length === 1) {
    p = p[0];
  } else if (p.length === 2) {
    console.log(p);
    if (p[1] === "Center") {
      centering = true;
    } else {
      console.log("NON CENTERING ISSUE!!!");
      console.log(p);
      centrans = p[1];
      console.log("???");
    }
    //return;
    p = p[0];
  }

  if (p.length === 3) {
    if (typeof p[0] === "number") {
      var dir = p;
      var matrix = new THREE.Matrix4().makeTranslation(...dir, 1);
    } else {
      //make it like Matrix4
      p.forEach((el) => {
        el.push(0);
      });
      p.push([0, 0, 0, 1]);

      var matrix = new THREE.Matrix4();
      console.log("Apply matrix to group::");
      matrix.set(...aflatten(p));
    }
  } else {
    console.log(p);
    console.error("Unexpected length matrix: :: " + p);
  }

  //Backup of params
  var copy = Object.assign({}, env);
  copy.mesh = group;
  await interpretate(args[0], copy);
  console.log('MATRIX');
  console.log(matrix);

  if (centering || centrans.length > 0) {
    console.log("::CENTER::");
    var bbox = new THREE.Box3().setFromObject(group);
    console.log(bbox);
    var center = bbox.max.clone().add(bbox.min).divideScalar(2);
    if (centrans.length > 0) {
      console.log("CENTRANS");
      center = center.fromArray(centrans);
    }
    console.log(center);

    var translate = new THREE.Matrix4().makeTranslation(
      -center.x,
      -center.y,
      -center.z,
    );
    group.applyMatrix4(translate);
    group.applyMatrix4(matrix);
    translate = new THREE.Matrix4().makeTranslation(
      center.x,
      center.y,
      center.z
    );
    group.applyMatrix4(translate);
  } else {
    group.applyMatrix4(matrix);
  }*/
  let matrix = [];

  if (!env.local.type) {
    if (arrays.length == 2) {
      console.warn('apply matrix3x3 + translation');
      //translation matrix + normal 3x3
      env.local.type = 'complex';
    } else {
      if (!Array.isArray(arrays[0])) {
        //most likely this is Translate
        console.warn('apply translation');
        env.local.type = 'translation';

      } else {
        env.local.type = 'normal';
        console.warn('apply matrix 3x3');
      }
    }
  }

  switch(env.local.type) {
    case 'normal':
      //make it like Matrix4

      

      matrix = arrays.map((el) => [...el, 0]);
      matrix.push([0, 0, 0, 1]);
      matrix = new THREE.Matrix4().set(...aflatten(matrix));
    break;

    case 'translation':

      matrix = new THREE.Matrix4().makeTranslation(...arrays);
    break;

    case 'complex':
      matrix = [...arrays[0]];
      const v = [...arrays[1]];

      matrix[0].push(v[0]);
      matrix[1].push(v[1]);
      matrix[2].push(v[2]);

      matrix.push([0, 0, 0, 1]);
      matrix = new THREE.Matrix4().set(...aflatten(matrix));
    break;

    default:
      throw 'undefined type of matrix or vector';
  }

  return matrix;
}

g3d.Rotate = async (args, env) => {
  let angle = await interpretate(args[1], env);
  let dir = [0,0,1];

  if (args.length > 2) dir = await interpretate(args[2], env);
  if (dir instanceof NumericArrayObject) { // convert back automatically
    dir = dir.normal();
  }     

  const group = new THREE.Group();
  await interpretate(args[0], {...env, mesh: group});

  dir = new THREE.Vector3(...dir);
  group.rotateOnWorldAxis(dir, angle);
  env.mesh.add(group);

  env.local.group = group;
  env.local.angle = angle;
  env.local.dir = dir;

  return group;
}

g3d.Rotate.update = async (args, env) => {
  let angle = await interpretate(args[1], env);
  const deltAngle = angle - env.local.angle;
  env.local.angle = angle;


  if (args.length > 2) {
    let dir = await interpretate(args[2], env);
    if (dir instanceof NumericArrayObject) { // convert back automatically
      dir = dir.normal();
    }      
    env.local.dir.fromArray(dir);
    env.local.group.rotateOnWorldAxis(env.local.dir, deltAngle);
  } else {
    env.local.group.rotateOnWorldAxis(env.local.dir, deltAngle);
  }

  env.wake();
}

g3d.Rotate.virtual = true;

g3d.Rotate.destroy = (args, env) => {

}

g3d.Scale = async (args, env) => {
  let scale = await interpretate(args[1], env);
  let center = args.length > 2 ? await interpretate(args[2], env) : [0, 0, 0];
  if (scale instanceof NumericArrayObject) scale = scale.normal();
  if (!Array.isArray(scale)) scale = [scale, scale, scale];
  if (center instanceof NumericArrayObject) center = center.normal();

  // Ensure scale is [x, y, z]
  if (scale.length === 2) scale = [scale[0], scale[1], 1];
  if (scale.length === 1) scale = [scale[0], scale[0], scale[0]];

  const group = new THREE.Group();
  await interpretate(args[0], { ...env, mesh: group });

  // Build transformation: T(center) * S(scale) * T(-center)
  const t1 = new THREE.Matrix4().makeTranslation(-center[0], -center[1], -center[2]);
  const s = new THREE.Matrix4().makeScale(scale[0], scale[1], scale[2]);
  const t2 = new THREE.Matrix4().makeTranslation(center[0], center[1], center[2]);
  const m = new THREE.Matrix4().multiplyMatrices(t2, s).multiply(t1);
  group.applyMatrix4(m);

  env.mesh.add(group);
  env.local.group = group;
  env.local.scale = scale.slice();
  env.local.center = center.slice();
  return group;
}

g3d.Scale.update = async (args, env) => {
  // args: [object, scale, center?]
  let scale = await interpretate(args[1], env);
  let center = args.length > 2 ? await interpretate(args[2], env) : [0, 0, 0];
  if (scale instanceof NumericArrayObject) scale = scale.normal();
  if (!Array.isArray(scale)) scale = [scale, scale, scale];
  if (center instanceof NumericArrayObject) center = center.normal();

  // Ensure scale is [x, y, z]
  if (scale.length === 2) scale = [scale[0], scale[1], 1];
  if (scale.length === 1) scale = [scale[0], scale[0], scale[0]];

  // Compute previous scale and center
  const prevScale = env.local.scale || [1, 1, 1];
  const prevCenter = env.local.center || [0, 0, 0];

  // Remove previous scaling by applying inverse
  const t1 = new THREE.Matrix4().makeTranslation(-prevCenter[0], -prevCenter[1], -prevCenter[2]);
  const sInv = new THREE.Matrix4().makeScale(1 / prevScale[0], 1 / prevScale[1], 1 / prevScale[2]);
  const t2 = new THREE.Matrix4().makeTranslation(prevCenter[0], prevCenter[1], prevCenter[2]);
  const mInv = new THREE.Matrix4().multiplyMatrices(t2, sInv).multiply(t1);
  env.local.group.applyMatrix4(mInv);

  // Apply new scaling
  const t1n = new THREE.Matrix4().makeTranslation(-center[0], -center[1], -center[2]);
  const sn = new THREE.Matrix4().makeScale(scale[0], scale[1], scale[2]);
  const t2n = new THREE.Matrix4().makeTranslation(center[0], center[1], center[2]);
  const mn = new THREE.Matrix4().multiplyMatrices(t2n, sn).multiply(t1n);
  env.local.group.applyMatrix4(mn);

  env.local.scale = scale.slice();
  env.local.center = center.slice();
  env.wake && env.wake();
}

g3d.Scale.virtual = true;

g3d.Scale.destroy = (args, env) => {

}

g3d.GeometricTransformation = async (args, env) => {  
  let data = await interpretate(args[1], env);

  if (data instanceof NumericArrayObject) { // convert back automatically
    data = data.normal();
  }  

  if (data.length > 3) {
    //list of matrixes
    console.warn('multiple matrixes');
    env.local.entities = [];

    for (const m of data) {
      const group = new THREE.Group();
      const matrix = decodeTransformation(m, env);

      await interpretate(args[0], {...env, mesh: group});

      group.matrixAutoUpdate = false;
      
      const object = {};

      object.quaternion = new THREE.Quaternion();
      object.position = new THREE.Vector3();
      object.scale = new THREE.Vector3();    
  
      matrix.decompose(object.position, object.quaternion, object.scale);
  
      group.quaternion.copy( object.quaternion );
      group.position.copy( object.position );
      group.scale.copy( object.scale );
  
      group.updateMatrix();
  
      object.group = group;
  
      env.mesh.add(group);
      env.local.entities.push(object);
    }


    return env.local.entities[0];

  } else {
    console.warn('single matrix');

    const group = new THREE.Group();
    const matrix = decodeTransformation(data, env);

    await interpretate(args[0], {...env, mesh: group});

    group.matrixAutoUpdate = false;

    env.local.quaternion = new THREE.Quaternion();
    env.local.position = new THREE.Vector3();
    env.local.scale = new THREE.Vector3();    

    matrix.decompose(env.local.position, env.local.quaternion, env.local.scale);

    group.quaternion.copy( env.local.quaternion );
    group.position.copy( env.local.position );
    group.scale.copy( env.local.scale );

    group.updateMatrix();

    env.local.group = group;

    env.mesh.add(group);

    return group;
  }
  
};

g3d.GeometricTransformation.update = async (args, env) => {
  env.wake(true);
  let data = await interpretate(args[1], env);
  if (data instanceof NumericArrayObject) { // convert back automatically
    data = data.normal();
  }
  

  if (env.local.entities) {
    //list of matrixes
    console.log('multiple matrixes');

    for (let i =0; i<env.local.entities.length; ++i) {
      const group = env.local.entities[i].group;

      const matrix = decodeTransformation(data[i], env);

      //await interpretate(args[0], {...env, mesh: group});

      


      const quaternion = new THREE.Quaternion();
      const position = new THREE.Vector3();
      const scale = new THREE.Vector3();    
  
      matrix.decompose(position, quaternion, scale);
  
      group.quaternion.copy( quaternion );
      group.position.copy( position );
      group.scale.copy( scale );
  
      group.updateMatrix();
  
      //object.group = group;
  
      //env.mesh.add(group);
      //env.local.entities.push(object);
    }


    return env.local.entities[0];

  } else {
    console.log('single matrix');

    const group = env.local.group;
    const matrix = decodeTransformation(data, env);



    env.local.quaternion = new THREE.Quaternion();
    env.local.position = new THREE.Vector3();
    env.local.scale = new THREE.Vector3();    

    matrix.decompose(env.local.position, env.local.quaternion, env.local.scale);

    group.quaternion.copy( env.local.quaternion );
    group.position.copy( env.local.position );
    group.scale.copy( env.local.scale );

    group.updateMatrix();


    return group;
  }
  
};  

g3d.GeometricTransformation.destroy = (args, env) => {
  console.warn('Nothing to dispose!');
}

g3d.Entity = () => {
  console.log('Entity is not supported inside Graphics3D');
}

g3d.GeometricTransformation.virtual = true

g3d.GraphicsComplex = async (args, env) => {
  
  var copy = Object.assign({}, env);
  const options = await core._getRules(args, {...env, hold: true});

  let pts = (await interpretate(args[0], copy));
  let vertices;
  
  if (pts instanceof NumericArrayObject) { // convert back automatically
    vertices = new Float32Array(pts.buffer);
  } else {
    pts = pts.flat();
    vertices = new Float32Array( pts );
  }
  
  
  

  //local storage
  copy.vertices = {
    //geometry: new THREE.BufferGeometry(),
    //coordinates: vertices,
    position: new THREE.BufferAttribute( vertices, 3 ),
    colored: false,
    onResize: [],
    handlers: []
  }

  env.local.vertices = copy.vertices;

  //copy.vertices.geometry.setAttribute( 'position',  );

  let fences = [];
  env.local.fence = () => {
      for (const p of fences) p.resolve();
      fences = [];
  }

  if ('VertexFence' in options) {
    copy.fence = () => {
      const d = new Deferred();
      fences.push(d);
      return d.promise;
    }
  }  

  if ('VertexColors' in options) {
    let colors = await interpretate(options["VertexColors"], env);
    copy.vertices.colored = true;

    if (colors instanceof NumericArrayObject) {
      copy.vertices.colors = new THREE.BufferAttribute( new Float32Array( colors.buffer ), 3 );
    } else {
      if (colors[0]?.isColor) {
        colors = colors.map((c) => [c.r, c.g, c.b]);
      } 
      copy.vertices.colors = new THREE.BufferAttribute( new Float32Array( colors.flat() ), 3 );
    }
    
  }

  if ('VertexNormals' in options) {
    const normals = await interpretate(options["VertexNormals"], env);

    

    if (normals instanceof NumericArrayObject) {
      copy.vertices.normals = new THREE.BufferAttribute( new Float32Array( normals.buffer ), 3 );
    } else {
      copy.vertices.normals = new THREE.BufferAttribute( new Float32Array( normals.flat() ), 3 );
    }
  }

  const group = new THREE.Group();
  env.local.group = group;

  copy.context = [g3dComplex, g3d];

  await interpretate(args[1], copy);

  env.mesh.add(group);
  //copy.geometry.dispose();
};

g3d.Reflectivity = () => {
  console.warn('not implemented');
}

g3d.GraphicsComplex.update = async (args, env) => {
  env.wake(true);

  let pts = (await interpretate(args[0], env));
  let vertices;

  if (pts instanceof NumericArrayObject) { // convert back automatically
    vertices = new Float32Array( pts.buffer );
    //console.warn(pts.dims);
  } else {
    vertices = new Float32Array( pts.flat() );
    //console.warn(pts.length);
  }

  //env.local.vertices.coordinates = vertices;
  if (env.local.vertices.position.count * 3 < vertices.length) {
    console.warn(`Buffer attributes will be resized x 2! Old: ${env.local.vertices.position.count * 3} Required ${vertices.length}`);
    
    env.local.vertices.position = new THREE.BufferAttribute( new Float32Array(vertices.length * 2), 3 );
    env.local.vertices.position.setUsage(THREE.StreamDrawUsage); //Optimizaton for WebGL
    env.local.vertices.position.needsUpdate = true;

    if (env.local.vertices.normals) {
      env.local.vertices.normals = new THREE.BufferAttribute( new Float32Array(vertices.length * 2), 3 );
      env.local.vertices.normals.setUsage(THREE.StreamDrawUsage); //Optimizaton for WebGL
      env.local.vertices.normals.needsUpdate = true;
    }

    if (env.local.vertices.colors) {
      env.local.vertices.colors = new THREE.BufferAttribute( new Float32Array(vertices.length * 2), 3 );
      env.local.vertices.colors.setUsage(THREE.StreamDrawUsage); //Optimizaton for WebGL
      env.local.vertices.colors.needsUpdate = true;
    }    

    env.local.vertices.onResize.forEach((el) => el(env.local.vertices));
  }

  env.local.vertices.position.set( vertices);
  env.local.vertices.position.needsUpdate = true;



  let options = false;

  if (env.local.vertices.normals) {
    //console.warn('Update normals');
    if (!options) options = await core._getRules(args, {...env, hold: true});
    const normals = await interpretate(options["VertexNormals"], env);

    if (normals instanceof NumericArrayObject) {
      env.local.vertices.normals.set(new Float32Array( normals.buffer ));
    } else {
      env.local.vertices.normals.set(new Float32Array( normals.flat() ));
    }

    env.local.vertices.normals.needsUpdate = true;
  }

  if (env.local.vertices.colored) {
    if (!options) options = await core._getRules(args, {...env, hold: true});
    const colors = await interpretate(options["VertexColors"], env);



    if (colors instanceof NumericArrayObject) {
      env.local.vertices.colors.set(new Float32Array( colors.buffer ));
    } else {
      env.local.vertices.colors.set(new Float32Array( colors.flat() ));
    }
    
    env.local.vertices.colors.needsUpdate = true;
  }

  for (let i=0; i<env.local.vertices.handlers.length; ++i) {
    env.local.vertices.handlers[i]();
  }

  env.local.fence();
}  

g3d.GraphicsComplex.destroy = async (args, env) => {
  //env.local.vertices.position.dispose();
  //if (env.local.vertices.colored) env.local.vertices.colors.dispose();
}  

g3d.GraphicsComplex.virtual = true

g3dComplex.Cylinder = async (args, env) => {
  let radius = 1;
  if (args.length > 1) radius = await interpretate(args[1], env);

  let coordinates = await interpretate(args[0], env);
  if (coordinates.length === 1) {
    coordinates = coordinates[0];
  }

  const ref = env.vertices.position.array;
  let index = 3*(coordinates[0]-1);
  coordinates[0] = new THREE.Vector3(ref[index], ref[index+1], ref[index+2]);
      index = 3*(coordinates[1]-1);
  coordinates[1] = new THREE.Vector3(ref[index], ref[index+1], ref[index+2]);

  const material = new env.material({
    color: env.color,
    transparent: env.opacity < 1.0,
    roughness: env.roughness,
    opacity: env.opacity,
    metalness: env.metalness,
    emissive: env.emissive,
emissiveIntensity: env.emissiveIntensity,
ior: env.ior,
transmission: env.transmission,
thinFilm: env.thinFilm,
thickness: env.materialThickness,
attenuationColor: env.attenuationColor,
attenuationDistance: env.attenuationDistance,
clearcoat: env.clearcoat,
clearcoatRoughness: env.clearcoatRoughness,
sheenColor: env.sheenColor,
sheenRoughness: env.sheenRoughness,
iridescence: env.iridescence,
iridescenceIOR: env.iridescenceIOR,
iridescenceThickness: env.iridescenceThickness,
specularColor: env.specularColor,
specularIntensity: env.specularIntensity,
matte: env.matte    
    
    
  });

  console.log(coordinates);

  // edge from X to Y
  var direction = new THREE.Vector3().subVectors(coordinates[1], coordinates[0]);

  console.log(direction);

  // Make the geometry (of "direction" length)
  var geometry = new THREE.CylinderGeometry(radius, radius, 1, 32, 4, false);
  // shift it so one end rests on the origin
  geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 1 / 2.0, 0));
  // rotate it the right way for lookAt to work
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(90)));
  // Make a mesh with the geometry

  //env.local.geometry = geometry.clone();

  //geometry.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, direction.length()));


  var mesh = new THREE.Mesh(geometry, material);
  // Position it where we want
  mesh.receiveShadow = env.shadows;
  mesh.castShadow = env.shadows;

  //env.local.bmatrix = mesh.matrix.clone();

  mesh.position.copy(coordinates[0]);

  mesh.geometry.clone();
  mesh.geometry.applyMatrix4(new THREE.Matrix4().makeScale(1,1,direction.length()));
  //mesh.scale.set( 1,1,direction.length() );

  // And make it point to where we want
  mesh.geometry.lookAt(direction); 


  env.mesh.add(mesh);

  //geometry.dispose();
  //material.dispose();
}

g3dComplex.Sphere = async (args, env) => {
  var radius = 1;
  if (args.length > 1) radius = await interpretate(args[1], env);

  const material = new env.material({
    color: env.color,
    roughness: env.roughness,
    opacity: env.opacity,
    transparent: env.opacity < 1.0,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
  });

  function addSphere(cr) {
    const origin = new THREE.Vector3(...cr);
    const geometry = new THREE.SphereGeometry(radius, 40, 40);
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.set(origin.x, origin.y, origin.z);
    sphere.castShadow = env.shadows;
    sphere.receiveShadow = env.shadows;

    env.mesh.add(sphere);
    geometry.dispose();
    return sphere;
  }

  let list = await interpretate(args[0], env);

  if (list instanceof NumericArrayObject) { // convert back automatically
    list = list.normal();
  }

  const ref = env.vertices.position.array;

  if (Array.isArray(list)) {
    env.local.object = [];

    for (let i=0; i<list.length; ++i) {
      const index = (list[i]-1) * 3;
      env.local.object.push(addSphere([ref[index], ref[index+1], ref[index+2]]));
    }
  } else {
    
    const index = (list-1) * 3;
    env.local.object = [addSphere([ref[index], ref[index+1], ref[index+2]])];
  } 


  material.dispose();

  return env.local.object;
};

var earcut;

g3dComplex.Polygon = async (args, env) => {

  var geometry;
  let material;

  geometry = new THREE.BufferGeometry();

  env.local.geometry = geometry;

  geometry.setAttribute('position', env.vertices.position);

  env.vertices.onResize.push((v) => g3dComplex.Polygon.reassign(v, env.local));

  let a = await interpretate(args[0], env);
  let indexes;

  
  

  if (a instanceof NumericArrayObject) {
    //throw 'indexed geometry with NumericArray is not yet supported';
    //single polygon
    

    switch(a.dims.length) {
      case 1: //single
        console.warn('Odd case of polygons data...');
        geometry.setIndex( a.normal().map((e)=>e-1) );
      break;

      case 2: //multiple
        switch(a.dims[a.dims.length-1]) {
          case 3: //triangles
            indexes = new THREE.BufferAttribute( new Uint16Array(a.buffer.map((e)=>e-1)), 1 );
          break;

          case 4: {
            const originalLength = a.buffer.length;
            const oldBuffer = a.buffer;
            const newLength = originalLength  * 2;
            const newBuffer = new Uint16Array(newLength);
            
            let i=0;
            let j=0;
            
            for (; i<originalLength; i+=4) {
              newBuffer[j] = oldBuffer[i]-1;
              newBuffer[j+1] = oldBuffer[i+1]-1;
              newBuffer[j+2] = oldBuffer[i+2]-1;
              j+=3;
              newBuffer[j] = oldBuffer[i]-1;
              newBuffer[j+1] = oldBuffer[i+2]-1;
              newBuffer[j+2] = oldBuffer[i+3]-1;
              j+=3;
            }

            indexes = new THREE.BufferAttribute( newBuffer, 1 );
          }
          break;

          case 5: {
            const originalLength = a.buffer.length;
            const oldBuffer = a.buffer;
            const newLength = originalLength  * 3;
            const newBuffer = new Uint16Array(newLength);
            
            let i=0;
            let j=0;

            
            for (; i<originalLength; i+=5) {
              newBuffer[j] = oldBuffer[i]-1;
              newBuffer[j+1] = oldBuffer[i+1]-1;
              newBuffer[j+2] = oldBuffer[i+4]-1;
              j+=3;
              newBuffer[j] = oldBuffer[i+1]-1;
              newBuffer[j+1] = oldBuffer[i+2]-1;
              newBuffer[j+2] = oldBuffer[i+3]-1;
              j+=3;
              newBuffer[j] = oldBuffer[i+1]-1;
              newBuffer[j+1] = oldBuffer[i+3]-1;
              newBuffer[j+2] = oldBuffer[i+4]-1;   
              j+=3;           
            }

            indexes = new THREE.BufferAttribute( newBuffer, 1 );
          }
          break;

          case 6: {
          
            const originalLength = a.buffer.length;
            const oldBuffer = a.buffer;
            const newLength = originalLength  * 4;
            const newBuffer = new Uint16Array(newLength);
            
            let i=0;
            let j=0;

            
            for (; i<originalLength; i+=6) {
              newBuffer[j] = oldBuffer[i]-1;
              newBuffer[j+1] = oldBuffer[i+1]-1;
              newBuffer[j+2] = oldBuffer[i+5]-1;
              j+=3;
              newBuffer[j] = oldBuffer[i+1]-1;
              newBuffer[j+1] = oldBuffer[i+2]-1;
              newBuffer[j+2] = oldBuffer[i+5]-1;
              j+=3;
              newBuffer[j] = oldBuffer[i+5]-1;
              newBuffer[j+1] = oldBuffer[i+2]-1;
              newBuffer[j+2] = oldBuffer[i+4]-1;    
              j+=3;   
              newBuffer[j] = oldBuffer[i+2]-1;
              newBuffer[j+1] = oldBuffer[i+3]-1;
              newBuffer[j+2] = oldBuffer[i+4]-1;    
              j+=3;                      
            }

            indexes = new THREE.BufferAttribute( newBuffer, 1 );

          }
          break;

          default:
            throw 'cannot build such complex polygon'
        }
      break;

      default:
        console.warn('Unknown case:' + a.dims);
    }


  } else {

    const opts = await core._getRules(args, env);

    if ((args.length - Object.keys(opts).length) > 1) {

    let b = await interpretate(args[1], env);
    

    if (typeof b == 'number') { //non indexed geometry case

      geometry.setDrawRange( a-1, b );
      env.local.indexOffset = a-1;
      env.local.range = b;
      env.local.nonindexed = true;
      

    } else {
      console.warn(args);
      console.error('Unknow case for Polygon');
      return;
    }

    } else {

      
    
      if (a[0].length === 3 && a[a.length-1].length === 3) {
        //geometry.setIndex(  );
        
        if (env.vertices.position.array.length > 65535) {
          indexes = new THREE.BufferAttribute( new Uint32Array(a.flat().map((e)=>e-1)), 1 );
        } else {
          indexes = new THREE.BufferAttribute( new Uint16Array(a.flat().map((e)=>e-1)), 1 );
        }
        
      } else {


        
      
    //more complicatec case, need to covert all polygons into triangles
    let extendedIndexes = [];

    //console.log(a);

    if (Array.isArray(a[0])) {
   
    for (let i=0; i<a.length; ++i) {
      const b = a[i];
    
 
      switch (b.length) {
        
        case 3:
          extendedIndexes.push(b[0],b[1],b[2]);
          break;

        case 4:
          //throw b;
          extendedIndexes.push(b[0],b[1],b[2]);
          extendedIndexes.push(b[0],b[2],b[3]);
          break;
        /**
         *  0 1
         * 4   2
         *   3
         */
        case 5:
          extendedIndexes.push(b[0], b[1], b[4]);
          extendedIndexes.push(b[1], b[2], b[3]);
          extendedIndexes.push(b[1], b[3], b[4]);
          break;
        /**
         * 0  1
         *5     2
         * 4   3
         */
        case 6:
          extendedIndexes.push(b[0], b[1], b[5]);
          extendedIndexes.push(b[1], b[2], b[5]);
          extendedIndexes.push(b[5], b[2], b[4]);
          extendedIndexes.push(b[2], b[3], b[4]);
          break;
        default:


          const fallbackVertices = env.vertices.position.array;



         
          if (!earcut) earcut = (await import('earcut')).default;


          const explicitVertices = [];

          for (let k=0; k<b.length; ++k) {
            const index = (b[k]-1)*3;
            explicitVertices.push(fallbackVertices[index], fallbackVertices[index+1], fallbackVertices[index+2]);
          }

          

  

          extendedIndexes.push(earcut(explicitVertices, null, 3).map((index) => b[index]));

        
          break;
      }
    }   
   
  } else {

     switch (a.length) {
        
        case 3:
          extendedIndexes.push(...a);
          break;

        case 4:
          //throw b;
          extendedIndexes.push(a[0],a[1],a[2]);
          extendedIndexes.push(a[0],a[2],a[3]);
          break;
        /**
         *  0 1
         * 4   2
         *   3
         */
        case 5:
          extendedIndexes.push(a[0], a[1], a[4]);
          extendedIndexes.push(a[1], a[2], a[3]);
          extendedIndexes.push(a[1], a[3], a[4]);
          break;
        /**
         * 0  1
         *5     2
         * 4   3
         */
        case 6:
          extendedIndexes.push(a[0], a[1], a[5]);
          extendedIndexes.push(a[1], a[2], a[5]);
          extendedIndexes.push(a[5], a[2], a[4]);
          extendedIndexes.push(a[2], a[3], a[4]);
          break;
        default:


          const fallbackVertices = env.vertices.position.array;



         
          if (!earcut) earcut = (await import('earcut')).default;
          console.warn('earcut');

          const explicitVertices = [];

          for (let k=0; k<a.length; ++k) {
            const index = (a[k]-1)*3;
            explicitVertices.push(fallbackVertices[index], fallbackVertices[index+1], fallbackVertices[index+2]);
          }

          

  

          extendedIndexes.push(earcut(explicitVertices, null, 3).map((index) => a[index]));

        
          break;
      }
    
  }
    console.log('Set Index');



    extendedIndexes = extendedIndexes.flat();
    env.local.range = extendedIndexes.length;


    if (env.vertices.position.array.length > 65535) {
      indexes = new THREE.Uint32BufferAttribute( new Uint32Array(extendedIndexes.map((e)=>e-1)), 1 );
    } else {
      indexes = new THREE.Uint16BufferAttribute( new Uint16Array(extendedIndexes.map((e)=>e-1)), 1 );
    }
    
    //geometry.setIndex(  );
    
    
      }
    }
  }

  if (indexes) {
    geometry.setIndex(indexes);
    indexes.needsUpdate = true;  
  }

  env.local.indexes = indexes;

  //handler for future recomputations (in a case of update)
  if (env?.vertices?.normals) {

    env.local.geometry.setAttribute('normal', env.vertices.normals);
    env.local.normals = true;

  } else {
    env.vertices.handlers.push(() => {
      env.local.geometry.computeVertexNormals();
    });

    env.local.geometry.computeVertexNormals();
  }

  //check if colored (Material BUG) !!!
  if (env?.vertices?.colored) {
    //geometry.setAttribute()
    geometry.setAttribute( 'color', env.vertices.colors );

    material = new env.material({
      vertexColors: true,
      transparent: env.opacity < 1,
      opacity: env.opacity,
      roughness: env.roughness,
      metalness: env.metalness,
      emissive: env.emissive,
      emissiveIntensity: env.emissiveIntensity, 
      ior: env.ior,
      transmission: env.transmission,
      thinFilm: env.thinFilm,
thickness: env.materialThickness,
      attenuationColor: env.attenuationColor,
      attenuationDistance: env.attenuationDistance,
      clearcoat: env.clearcoat,
      clearcoatRoughness: env.clearcoatRoughness,
      sheenColor: env.sheenColor,
      sheenRoughness: env.sheenRoughness,
      iridescence: env.iridescence,
      iridescenceIOR: env.iridescenceIOR,
      iridescenceThickness: env.iridescenceThickness,
      specularColor: env.specularColor,
      specularIntensity: env.specularIntensity,
      matte: env.matte,
      side: THREE.DoubleSide                     
    });
  } else {
    material = new env.material({
      color: env.color,
      transparent: env.opacity < 1,
      opacity: env.opacity,
      roughness: env.roughness,
      metalness: env.metalness,
      emissive: env.emissive,
      emissiveIntensity: env.emissiveIntensity,
      ior: env.ior,
      transmission: env.transmission,
      thinFilm: env.thinFilm,
thickness: env.materialThickness,
      attenuationColor: env.attenuationColor,
      attenuationDistance: env.attenuationDistance,
      clearcoat: env.clearcoat,
      clearcoatRoughness: env.clearcoatRoughness,
      sheenColor: env.sheenColor,
      sheenRoughness: env.sheenRoughness,
      iridescence: env.iridescence,
      iridescenceIOR: env.iridescenceIOR,
      iridescenceThickness: env.iridescenceThickness,
      specularColor: env.specularColor,
      specularIntensity: env.specularIntensity,
      matte: env.matte,
      side: THREE.DoubleSide   
    });         
  }

    //console.log(env.opacity);
    material.side = THREE.DoubleSide;

    const poly = new THREE.Mesh(geometry, material);

    poly.receiveShadow = env.shadows;
    poly.castShadow = true;
  
    //poly.frustumCulled = false;
    env.mesh.add(poly);
    env.local.material = material;
    env.local.poly = poly;

    
  
    return poly;

}

g3dComplex.Polygon.reassign = (v, local) => {
      console.warn('Reassign geometry of Polygon');
      //
      const g = local.geometry;

      g.setAttribute('position', v.position);
      if (v.colored)
        g.setAttribute( 'color', v.colors );
      
      if (local.normals)
        g.setAttribute('normal', v.normals);

      //g.setIndex(local.indexes);

      if (local.nonindexed) {
        g.setDrawRange(local.indexOffset, local.range);
        return;
      }

      //g.setDrawRange(0, local.range);

}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

g3dComplex.Polygon.update = async (args, env) => {
  
  if (env.fence) await env.fence();
 


  if (env.local.nonindexed) {
    const a = await interpretate(args[0], env);
    const b = await interpretate(args[1], env);

    env.local.indexOffset = a-1;
    env.local.range = b;

    /*if (env.vertices.position.count*3  < b*3) {
      console.warn(`Polygon: nonindexed buffer attributes will be resized x 2! Old: ${env.vertices.position.count * 3} Required ${b*3}`);
      env.vertices.position = new THREE.BufferAttribute( new Float32Array(b * 2 * 3), 3 );
      env.vertices.position.needsUpdate = true;
      env.vertices.onResize.forEach((el) => el(env.vertices));
    } else {

    }  */
    if (env.vertices.position.count*3  < b*3) {
      //env.local.geometry.setDrawRange( a-1, Math.min(b, env.vertices.position.count-1) );
    } else {
      env.local.geometry.setDrawRange( a-1, b );
    }

    //console.warn(env.vertices);
    if (b < 100000) { //too slow
      env.local.geometry.computeBoundingBox();
      env.local.geometry.computeBoundingSphere();
    }

    
    env.wake(true);
    return;
  }

    //normal indexed geometry
    //let indexes = 
    //throw 'indexed geometry is not yet supported';
 
    let a = await interpretate(args[0], env);
    let newBuffer;
   
    if (a instanceof NumericArrayObject) {

    
      switch(a.dims[a.dims.length-1]) {
        case 3: //triangles
          newBuffer = new Uint16Array(a.buffer.map((e)=>e-1));
        break;

        case 4: {
          const originalLength = a.buffer.length;
          const oldBuffer = a.buffer;
          const newLength = originalLength  * 2;
          newBuffer = new Uint16Array(newLength);
          
          let i=0;
          let j=0;
          
          for (; i<originalLength; i+=4) {
            newBuffer[j] = oldBuffer[i]-1;
            newBuffer[j+1] = oldBuffer[i+1]-1;
            newBuffer[j+2] = oldBuffer[i+2]-1;
            j+=3;
            newBuffer[j] = oldBuffer[i]-1;
            newBuffer[j+1] = oldBuffer[i+2]-1;
            newBuffer[j+2] = oldBuffer[i+3]-1;
            j+=3;
          }
        }
        break;

        case 5: {
          const originalLength = a.buffer.length;
          const oldBuffer = a.buffer;
          const newLength = originalLength  * 3;
          newBuffer = new Uint16Array(newLength);
          
          let i=0;
          let j=0;

          
          for (; i<originalLength; i+=5) {
            newBuffer[j] = oldBuffer[i]-1;
            newBuffer[j+1] = oldBuffer[i+1]-1;
            newBuffer[j+2] = oldBuffer[i+4]-1;
            j+=3;
            newBuffer[j] = oldBuffer[i+1]-1;
            newBuffer[j+1] = oldBuffer[i+2]-1;
            newBuffer[j+2] = oldBuffer[i+3]-1;
            j+=3;
            newBuffer[j] = oldBuffer[i+1]-1;
            newBuffer[j+1] = oldBuffer[i+3]-1;
            newBuffer[j+2] = oldBuffer[i+4]-1;   
            j+=3;           
          }

        }
        break;

        case 6: {
        
          const originalLength = a.buffer.length;
          const oldBuffer = a.buffer;
          const newLength = originalLength  * 4;
          newBuffer = new Uint16Array(newLength);
          
          let i=0;
          let j=0;

          
          for (; i<originalLength; i+=6) {
            newBuffer[j] = oldBuffer[i]-1;
            newBuffer[j+1] = oldBuffer[i+1]-1;
            newBuffer[j+2] = oldBuffer[i+5]-1;
            j+=3;
            newBuffer[j] = oldBuffer[i+1]-1;
            newBuffer[j+1] = oldBuffer[i+2]-1;
            newBuffer[j+2] = oldBuffer[i+5]-1;
            j+=3;
            newBuffer[j] = oldBuffer[i+5]-1;
            newBuffer[j+1] = oldBuffer[i+2]-1;
            newBuffer[j+2] = oldBuffer[i+4]-1;    
            j+=3;   
            newBuffer[j] = oldBuffer[i+2]-1;
            newBuffer[j+1] = oldBuffer[i+3]-1;
            newBuffer[j+2] = oldBuffer[i+4]-1;    
            j+=3;                      
          }

        }
        break;

        default:
          throw 'cannot build such complex polygon'
      }

      
    } else { 
      if (!a[0][0]) a = [a];

      switch(a[0].length) {
        case 3: //triangles
          newBuffer = new Uint16Array(a.flat(Infinity).map((e)=>e-1));
        break;

        case 4: {
          a = a.flat(Infinity);
          const originalLength = a.length;
          const oldBuffer = a;
          const newLength = originalLength  * 2;
          newBuffer = new Uint16Array(newLength);
          
          let i=0;
          let j=0;
          
          for (; i<originalLength; i+=4) {
            newBuffer[j] = oldBuffer[i]-1;
            newBuffer[j+1] = oldBuffer[i+1]-1;
            newBuffer[j+2] = oldBuffer[i+2]-1;
            j+=3;
            newBuffer[j] = oldBuffer[i]-1;
            newBuffer[j+1] = oldBuffer[i+2]-1;
            newBuffer[j+2] = oldBuffer[i+3]-1;
            j+=3;
          }
        }
        break;

        case 5: {
          a = a.flat(Infinity);
          const originalLength = a.length;
          const oldBuffer = a;
          const newLength = originalLength  * 3;
          newBuffer = new Uint16Array(newLength);
          
          let i=0;
          let j=0;

          
          for (; i<originalLength; i+=5) {
            newBuffer[j] = oldBuffer[i]-1;
            newBuffer[j+1] = oldBuffer[i+1]-1;
            newBuffer[j+2] = oldBuffer[i+4]-1;
            j+=3;
            newBuffer[j] = oldBuffer[i+1]-1;
            newBuffer[j+1] = oldBuffer[i+2]-1;
            newBuffer[j+2] = oldBuffer[i+3]-1;
            j+=3;
            newBuffer[j] = oldBuffer[i+1]-1;
            newBuffer[j+1] = oldBuffer[i+3]-1;
            newBuffer[j+2] = oldBuffer[i+4]-1;   
            j+=3;           
          }

        }
        break;

        case 6: {
          a = a.flat(Infinity);
          const originalLength = a.length;
          const oldBuffer = a;
          const newLength = originalLength  * 4;
          newBuffer = new Uint16Array(newLength);
          
          let i=0;
          let j=0;

          
          for (; i<originalLength; i+=6) {
            newBuffer[j] = oldBuffer[i]-1;
            newBuffer[j+1] = oldBuffer[i+1]-1;
            newBuffer[j+2] = oldBuffer[i+5]-1;
            j+=3;
            newBuffer[j] = oldBuffer[i+1]-1;
            newBuffer[j+1] = oldBuffer[i+2]-1;
            newBuffer[j+2] = oldBuffer[i+5]-1;
            j+=3;
            newBuffer[j] = oldBuffer[i+5]-1;
            newBuffer[j+1] = oldBuffer[i+2]-1;
            newBuffer[j+2] = oldBuffer[i+4]-1;    
            j+=3;   
            newBuffer[j] = oldBuffer[i+2]-1;
            newBuffer[j+1] = oldBuffer[i+3]-1;
            newBuffer[j+2] = oldBuffer[i+4]-1;    
            j+=3;                      
          }

        }
        break;

        default:
          throw 'cannot build such complex polygon'
      }
         
    }

      

      env.local.range = newBuffer.length;


      if (env.local.indexes.count < newBuffer.length) {
        console.warn('Buffer attribute will be resized x2!');

  
        // pick 32‑bit if >65 535 points
        const use32 = newBuffer.length > 30000;
        const ArrayCtor = use32 ? Uint32Array : Uint16Array;
        const AttrCtor  = THREE.BufferAttribute;
      
        // allocate double the required size
        const newArr = new ArrayCtor(newBuffer.length * 2);
        newArr.set(newBuffer);

        const newIdx = new AttrCtor(newArr, 1);

      
        newIdx.setUsage(THREE.StreamDrawUsage);
        


        newIdx.needsUpdate = true;
      
        // swap it onto the geometry
        env.local.indexes = newIdx;
   
        //dispose and recreate geometry
        /*env.local.geometry.dispose();

        const g = new THREE.BufferGeometry();
        env.local.geometry = g;
        g.setAttribute('position', env.vertices.position);

        if (env.vertices.colored)
          g.setAttribute( 'color', env.vertices.colors );

        if (env.local.normals) {
          g.setAttribute('normal', env.vertices.normals);
        } else {
          g.computeVertexNormals();
        }

        g.setIndex(newIdx);
        
        env.local.poly.geometry  = g;
        */
        env.local.geometry.setIndex(newIdx)

        env.local.geometry.setDrawRange(0, newBuffer.length);

      } else {
        // write your new indices into the existing buffer
        env.local.indexes.set(newBuffer);
        env.local.indexes.needsUpdate = true;
        env.local.geometry.setDrawRange(0, newBuffer.length);
      }

        
      

      
      // adjust draw range to the exact size
      


    //if (!env.local.normals) env.local.geometry.computeVertexNormals();

    
    env.local.geometry.computeBoundingBox();
    env.local.geometry.computeBoundingSphere();

  
  //just setDrawingRange
  //do not process indexes!

}

g3dComplex.Polygon.destroy = (args, env) => {
  //just setDrawingRange
  //do not process indexes!
  env.local.geometry.dispose();
  env.local.material.dispose();

}

g3dComplex.Polygon.virtual = true;

g3d.Polygon = async (args, env) => {
  const vertices = await interpretate(args[0], env);

  //check if multiple polygons (FIXME update)
  if (Array.isArray(vertices)) {
    if (Array.isArray(vertices[0][0])) {
      env.local.vmulti = true;
      for (const v of vertices) {
        await interpretate(['Polygon', ['JSObject', v]], {...env});
      }
      return;
    }
  }

  let range = vertices.length;
  if (vertices instanceof NumericArrayObject) range = vertices.dims[0];

  const indices  = Array.from({length: range}, (e, i)=> i+1);
  const virtualStack = {};

  env.local.indices = indices;
  env.local.vertices = vertices;

  //META-PROGRAMMING: convert on-fly to GraphicsComplex[..., Polygon[...]]
  //Non Graphics-Complex polygon is a rare case in 3D graphics

  await interpretate(['GraphicsComplex', ['__takeJSProperty', env.local, 'vertices'], ['Polygon', ['__takeJSProperty', env.local, 'indices']], ['Rule', "'VertexFence'", true]], {
    ...env, global: {...env.global, stack: virtualStack}
  });

  env.local.virtualStack = virtualStack;

  env.local.vpoly = Object.values(env.local.virtualStack).find((el)=>el.firstName == 'Polygon');
  env.local.vcomplex = Object.values(env.local.virtualStack).find((el)=>el.firstName == 'GraphicsComplex');

  //break the chain to avoid bubbling up
  env.local.vpoly.parent = undefined;
};

g3d.__takeJSProperty = (args, env) => {
  return args[0][args[1]];
}

g3d.__takeJSProperty.update = g3d.__takeJSProperty;
g3d.__takeJSProperty.destroy = g3d.__takeJSProperty;

g3d.Polygon.update = async (args, env) => {
  if (env.local.vmulti) throw 'update of multiple polygons is not possible';
  const vertices = await interpretate(args[0], env);

  let range = vertices.length;
  if (vertices instanceof NumericArrayObject) range = vertices.dims[0];

  const indices  = Array.from({length: range}, (e, i)=> i+1);



  env.local.indices = indices;
  env.local.vertices = vertices;

  //FIXME: Buffer resizing does not work properly with earcut.
  //it always crashes with GL Vertex buffer is not big enough.
  //I have no fucking idea why.
  //It works absolutely fine with NumericArrayObject s
  //and for Manipulate[PLot3D...].. it WORKS FINE. WHY DOES IT nOT WORK HERE?!?!?
  env.local.vpoly.update();
  await env.local.vcomplex.update();
}

g3d.Polygon.virtual = true 

g3d.Polygon.destroy = (args, env) => {
  if (env.local.vmulti) return;
  for (const o of Object.values(env.local.virtualStack)) o.dispose();
}

g3d.Dodecahedron = async (args, env) => {
  let position = new THREE.Vector3(0, 0, 0);
  let scale = 1.0;
  let rotation = new THREE.Euler(0, 0, 0); // Z, Y, X order by default

  for (const arg of args) {
    const val = await interpretate(arg, env);

    if (typeof val === "number") {
      scale = val;
    } else if (Array.isArray(val)) {
      if (val.length === 3 && val.every(v => typeof v === "number")) {
        position.set(...val);
      } else if (val.length === 2 && val.every(v => typeof v === "number")) {
        rotation.z = val[0];
        rotation.y = val[1];
      }
    }
  }

  // Always use radius 1, scale manually later
  const geometry = new THREE.DodecahedronGeometry(1);

  const material = new env.material({
    color: env.color,
    transparent: true,
    opacity: env.opacity,
    depthWrite: true,
    roughness: env.roughness,
    metalness: env.metalness,
    emissive: env.emissive,
    emissiveIntensity: env.emissiveIntensity,
    ior: env.ior,
    transmission: env.transmission,
    thinFilm: env.thinFilm,
    thickness: env.materialThickness,
    attenuationColor: env.attenuationColor,
    attenuationDistance: env.attenuationDistance,
    clearcoat: env.clearcoat,
    clearcoatRoughness: env.clearcoatRoughness,
    sheenColor: env.sheenColor,
    sheenRoughness: env.sheenRoughness,
    iridescence: env.iridescence,
    iridescenceIOR: env.iridescenceIOR,
    iridescenceThickness: env.iridescenceThickness,
    specularColor: env.specularColor,
    specularIntensity: env.specularIntensity,
    matte: env.matte
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.scale.set(scale, scale, scale);
  mesh.rotation.copy(rotation);

  mesh.receiveShadow = env.shadows;
  mesh.castShadow = env.shadows;

  env.mesh.add(mesh);

  geometry.dispose();
  material.dispose();

  return mesh;
};

g3d.Polyhedron = async (args, env) => {
  if (args[1][1].length > 4) {
    //non-optimised variant to work with 4 vertex per face
    return await interpretate(["GraphicsComplex", args[0], ["Polygon", args[1]]], env);
  } else {
    //reguar one. gpu-fiendly
    /**
     * @type {number[]}
     */
    const indices = await interpretate(args[1], env)
      .flat(4)
      .map((i) => i - 1);
    /**
     * @type {number[]}
     */
    const vertices = await interpretate(args[0], env).flat(4);

    const geometry = new THREE.PolyhedronGeometry(vertices, indices);

    var material = new env.material({
      color: env.color,
      transparent: true,
      opacity: env.opacity,
      depthWrite: true,
      roughness: env.roughness,
      metalness: env.metalness,
      emissive: env.emissive,
emissiveIntensity: env.emissiveIntensity,
ior: env.ior,
transmission: env.transmission,
thinFilm: env.thinFilm,
thickness: env.materialThickness,
attenuationColor: env.attenuationColor,
attenuationDistance: env.attenuationDistance,
clearcoat: env.clearcoat,
clearcoatRoughness: env.clearcoatRoughness,
sheenColor: env.sheenColor,
sheenRoughness: env.sheenRoughness,
iridescence: env.iridescence,
iridescenceIOR: env.iridescenceIOR,
iridescenceThickness: env.iridescenceThickness,
specularColor: env.specularColor,
specularIntensity: env.specularIntensity,
matte: env.matte      
      
      
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = env.shadows;
    mesh.castShadow = env.shadows;
    env.mesh.add(mesh);
    geometry.dispose();
    material.dispose();

    return mesh;
  }
};



g3d.Specularity = (args, env) => { };

function latexLikeToHTML(raw) {
  // 1) Escape any existing HTML to avoid injection
  const esc = String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // 2) Convert subscripts:   base_(group|char)
  const withSubs = esc.replace(
    /(\S)_(\{([^{}]+)\}|([^\s{}]))/g,
    (m, base, _whole, groupBody, singleChar) =>
      base + "<sub>" + (groupBody ?? singleChar) + "</sub>"
  );

  // 3) Convert superscripts: base^(group|char)
  const withSupers = withSubs.replace(
    /(\S)\^(\{([^{}]+)\}|([^\s{}]))/g,
    (m, base, _whole, groupBody, singleChar) =>
      base + "<sup>" + (groupBody ?? singleChar) + "</sup>"
  );

  return withSupers;
}

g3d.Inset = async (args, env) => {
    let pos = [0,0,0];
    let size; 

    const opts = await core._getRules(args, env);
    const oLength = Object.keys(opts).length;
    
    if (args.length - oLength > 1) pos = await interpretate(args[1], env);
    let opos;

    if (pos instanceof NumericArrayObject) { // convert back automatically
      pos = pos.normal();
    }

    if (args.length - oLength > 2) opos = await interpretate(args[2], env);
    //if (args.length - oLength > 3) size = await interpretate(args[3], env);


    const foreignObject = document.createElement('div');

    let object = new CSS2D.CSS2DObject( foreignObject );
    object.className = 'g3d-label';

    env.mesh.add(object);

    env.local.object = object;

    //const foreignObject = foreignObject.append('xhtml:canvas').attr('xmlns', 'http://www.w3.org/1999/xhtml').node();
    const stack = {};
    env.local.stack = stack;

    const copy = {global: {...env.global, stack: stack}, inset:true, element: foreignObject, context: g3d};


    if (opts.ImageSizeRaw) {
      size = opts.ImageSizeRaw;
    }

    if (size) {
      //if (typeof size === 'number') size = [size, size/1.6];
      //size = [Math.abs(env.xAxis(size[0]) - env.xAxis(0)), Math.abs(env.yAxis(size[1]) - env.yAxis(0))];

      foreignObject.style.width = size[0] + 'px';
      foreignObject.style.height = size[1] + 'px';
      //copy.imageSize = size;
    } 

    (async function() {
    let fallback = false; //fallback to EditorView
    if (args[0][0] == 'HoldForm') {
      if (Array.isArray(args[0][1])) {
        if (args[0][1][0] == 'Offload') {

        } else {
          fallback = true;
        }
      } else {
        fallback = true;
      }
    }
 
    try {
      if (!fallback) await interpretate(args[0], copy);
    } catch(err) {
      console.warn(err);
      fallback = true;
    }



    if (fallback) {
      await makeEditorView(args[0], copy);
    }

    const child = foreignObject;

    await delay(60);

    
    
    const h = child.offsetHeight || child.firstChild?.offsetHeight || child.firstChild?.height;

    if (h < 10) {
      for (let u=0; u<20; ++u) {
        await delay(300);
        if ((child.offsetHeight || child.firstChild?.offsetHeight || child.firstChild?.height) > 30) break;
      }
    }


    let box = {width: child.offsetWidth || child.firstChild?.offsetWidth || child.firstChild?.width, height: child.offsetHeight || child.firstChild?.offsetHeight || child.firstChild?.height};
    

    if (box.width instanceof SVGAnimatedLength) {
      box.width = box.width.animVal.valueInSpecifiedUnits
    }

    if (box.height instanceof SVGAnimatedLength) {
      box.height = box.height.animVal.valueInSpecifiedUnits
    }



    if ((box.width < 1 || !box.width) && box.height > 1) {
      //HACK: check if this is EditorView or similar
      const content = child.getElementsByClassName('cm-scroller');
      if (content.length > 0) {
        box.width = content[0].firstChild.offsetWidth;
      } else {
        box.width = box.height * 1.66;
      }
    }

    if (!size) {
      foreignObject.style.width = box.width + 'px';
      foreignObject.style.height = box.height + 'px'; 
      //size = [box.width, box.height];     
    }

    env.local.box = box;

 
    
    

          object.position.copy( new THREE.Vector3(...pos)  );

  })(); // go async, so the the object would appear in DOM already

      return object;

  }

  g3d.Inset.update = async (args, env) => {
    
    let pos = await interpretate(args[1], env);

    if (pos instanceof NumericArrayObject) { // convert back automatically
      pos = pos.normal();
    }

    const f = env.local.object;

    if (f)
      f.position.copy( new THREE.Vector3(...pos)  );

    env.wake();

    return f;
   
  }


  g3d.Inset.destroy = async (args, env) => {
    Object.values(env.local.stack).forEach((el) => {
      if (!el.dead) el.dispose();
    });
  }

  g3d.Inset.virtual = true


g3d.Text = async (args, env) => { 
  const text = document.createElement( 'span' );
  text.className = 'g3d-label';

  let label;

  try {
    label = await interpretate(args[0], env);
  } catch(err) {
    console.warn('Error interpreting input of Text. Could it be an undefined symbol?');
    
    const stext = document.createElement( 'span' );
    let labelX = new CSS2D.CSS2DObject( stext );
    stext.className = 'g3d-label';
    labelX.position.copy( new THREE.Vector3(...(await interpretate(args[1], env)))  );
    env.mesh.add(labelX);

    await makeEditorView(args[0], {...env, element:stext});
    return labelX;
  }

  if (env.fontweight) text.style.fontWeight = env.fontweight;
  if (env.fontSize) text.style.fontSize = env.fontSize + 'px';
  if (env.fontFamily) text.style.fontFamily = env.fontFamily ;
  if (!env.colorInherit) text.style.color = env.color.getStyle();

  //text.style.color = 'rgb(' + atom[ 3 ][ 0 ] + ',' + atom[ 3 ][ 1 ] + ',' + atom[ 3 ][ 2 ] + ')';
  
  let pos   = await interpretate(args[1], env);
  if (pos instanceof NumericArrayObject) { // convert back automatically
    pos = pos.normal();
  }

  text.innerHTML = latexLikeToHTML(String(label));

  env.local.text = text;
  

  const labelObject = new CSS2D.CSS2DObject( text );
  labelObject.position.copy( new THREE.Vector3(...pos) );
  env.local.labelObject = labelObject;

  env.mesh.add(labelObject);
};

g3d.Text.update = async (args, env) => { 
  let pos   = await interpretate(args[1], env);

  if (pos instanceof NumericArrayObject) { // convert back automatically
    pos = pos.normal();
  }

  const label = await interpretate(args[0], env);

  env.local.text.innerHTML = latexLikeToHTML(String(label));
  env.local.labelObject.position.copy( new THREE.Vector3(...pos) );
  env.wake();
}

g3d.Text.destroy = () => {

}

g3d.Text.virtual = true



    /*params.materialProperties.metalness = 0.0;
    params.materialProperties.roughness = 0.23;
    params.materialProperties.transmission = 1.0;
    params.materialProperties.color = '#ffffff';*/

    const materialProps = [
      'color',
      'emissive',
      'emissiveIntensity',
      'roughness',
      'metalness',
      'ior',
      'transmission',
      'thinFilm',
      "materialThickness",
      'attenuationColor',
      'attenuationDistance',
      'opacity',
      'clearcoat',
      'clearcoatRoughness',
      'sheenColor',
      'sheenRoughness',
      'iridescence',
      'iridescenceIOR',
      'iridescenceThickness',
      'specularColor',
      'specularIntensity',
      'matte',
      'flatShading',
      'castShadow',
      'shadows',
      'fontSize'
  ];

g3d.Directive = async (args, env) => { 
  const opts = await core._getRules(args, {...env, hold:true});

  if (args[0][0] == 'List') {
    for (let i=1; i<args[0].length; ++i) {
      const r = await interpretate(args[0][i], env);
    }
  } else {
    for (let i=0; i<args.length - Object.keys(opts).length; ++i) {
      const r = await interpretate(args[i], env);
    }
  }

  const keys = Object.keys(opts);
  for (let i=0; i<keys.length; ++i) {
    const okey = keys[i];
    const key = okey.charAt(0).toLocaleLowerCase() + okey.slice(1);

    if (materialProps.includes(key)) {
      env[key] = await interpretate(opts[okey], {...env});
    }
  }

};

g3d.PlaneGeometry = () => { };

const arrayRange = (start, stop, step) =>
Array.from(
{ length: (stop - start) / step + 1 },
(value, index) => start + index * step
);

g3dComplex.Arrow = async (args, env) => {
  if (args.length > 1)
    env.radius = (await interpretate(args[1], env)) * 0.7;

  if (args[0][0] == 'Tube') {
    const points = await interpretate(args[0][1], env);

    if (Array.isArray(points[0])) {
      points.forEach((p) => {
        const r = env.radius || 1.0;
        const radiuses = p.map(() =>  r);
        radiuses[radiuses.length-1] = 0.4*r; //mimic an arrow, in fact there is no arrows
      
        interpretate(['Tube', ['JSObject', p], ['JSObject', radiuses]], {...env, radius: radiuses});
      })
    } else {
      const r = env.radius || 1.0;
      const radiuses = points.map(() => r);
      radiuses[radiuses.length-1] = r*0.4; //mimic an arrow, in fact there is no arrows
      
      interpretate(['Tube', ['JSObject', points], ['JSObject', radiuses]], {...env, radius: radiuses});
    }
  }
}



g3dComplex.Line = async (args, env) => {
    

    //vertices = env.vertices;
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', env.vertices.position);
    env.local.geometry = geometry;

    env.vertices.onResize.push((v) => g3dComplex.Line.reassign(v, env.local));

    let a = await interpretate(args[0], env);

    if (a instanceof NumericArrayObject) {
      a = a.buffer;
    }

    let indexes;

    if (env.vertices.position.array.length > 65535) {
      indexes = new THREE.Uint32BufferAttribute( new Uint32Array(a.map((e)=>e-1)), 1 );
    } else {
      indexes = new THREE.BufferAttribute( new Uint16Array(a.map((e)=>e-1)), 1 );
    }

    env.local.indexes = indexes;    


    geometry.setIndex(indexes);
    env.local.range = a.length;

    //geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

    let material;
    
    if (env?.vertices?.colored) {
      geometry.setAttribute( 'color', env.vertices.colors );
      material = new THREE.LineBasicMaterial({
        linewidth: env.thickness,
        color: env.color,
        opacity: env.opacity,
        vertexColors:true,
        transparent: env.opacity < 1.0 ? true : false
      });
    } else {
      material = new THREE.LineBasicMaterial({
        linewidth: env.thickness,
        color: env.color,
        opacity: env.opacity,
        transparent: env.opacity < 1.0 ? true : false
      });
    }
    const line = new THREE.Line(geometry, material);

    env.local.line = line;

    env.mesh.add(line);
    env.local.material = material;

    return line;
}

g3dComplex.Line.virtual = true

g3dComplex.Line.update = async (args, env) => {
  // 1) get new index data (zero‑based)
  if (env.fence) await env.fence();

  let newBuffer = await interpretate(args[0], env);
  if (newBuffer instanceof NumericArrayObject) {
    newBuffer = newBuffer.buffer;
  }
  newBuffer = newBuffer.map(el => el - 1);
  env.local.range = newBuffer.length;

  const geom = env.local.geometry;
  const oldIdx = env.local.indexes;

  // 2) do we need to grow the attribute?
  if (oldIdx.count < newBuffer.length) {
    console.warn("Resizing index buffer for Line…");

    // decide between 16‑bit and 32‑bit
    const use32 = newBuffer.length > 30000;
    const ArrayCtor  = use32 ? Uint32Array  : Uint16Array;
    const AttrCtor   = use32 ? THREE.Uint32BufferAttribute : THREE.Uint16BufferAttribute;

    // allocate double the length
    const newCount = newBuffer.length * 2;
    const newArr   = new ArrayCtor(newCount);
    const newIdx   = new AttrCtor(newArr, 1);

    newIdx.setUsage(THREE.StreamDrawUsage);
    newIdx.set(newBuffer);      // copy your data in
    newIdx.needsUpdate = true;

    // swap it onto the geometry
    geom.setIndex(newIdx);

    // remember for next time
    env.local.indexes = newIdx;

  } else {
    // 3) no resize needed, just overwrite existing buffer
    oldIdx.set(newBuffer);
    oldIdx.needsUpdate = true;
  }

  // 4) always update draw range
  geom.setDrawRange(0, env.local.range);

  // 5) trigger a render
  env.wake(true);
};

g3dComplex.Line.destroy = (args, env) => {
  env.local.geometry.dispose();
  env.local.material.dispose();
}

g3dComplex.Line.reassign = (v, local) => {
      console.warn('Reassign geometry of Line');
      //
      const g = local.geometry;

      g.setAttribute('position', v.position);
      if (v.colored)
        g.setAttribute( 'color', v.colors );

      g.setIndex(local.indexes);
      g.setDrawRange(0, local.range);

      
      //if (local.geometry) local.geometry.dispose();
      //local.geometry = g;
      //local.line.geometry = g;
}

g3d.Line = async (args, env) => {
  
  var geometry;
  //let vertices;


    
    const points = await interpretate(args[0], env);

    

    
    if (points instanceof NumericArrayObject) { // convert back automatically
      geometry = new THREE.BufferGeometry()
      geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(points.buffer), 3 ) );
    } else {
      if (points.length == 0) return;

      if (Array.isArray(points[0][0])) {
        console.log('Multiple');

        const material = new THREE.LineBasicMaterial({
          linewidth: env.thickness,
          color: env.color,
          opacity: env.opacity,
          transparent: env.opacity < 1.0 ? true : false
        });        

        for (const p of points) {
          geometry = new THREE.BufferGeometry();
          geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(p.flat()), 3 ) );


          const line = new THREE.Line(geometry, material);
        
          if (!env.local.lines) env.local.lines = [];
          env.local.lines.push(line);

          
        
          env.mesh.add(line);          
        }

        material.dispose();
        //3D will

        return;

      } else {
        geometry = new THREE.BufferGeometry()
        geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(points.flat()), 3 ) );
      }
      
    }
    


    const material = new THREE.LineBasicMaterial({
      linewidth: env.thickness,
      color: env.color,
      opacity: env.opacity,
      transparent: env.opacity < 1.0 ? true : false
    });
    const line = new THREE.Line(geometry, material);

    env.local.line = line;

    env.mesh.add(line);
    env.local.line.geometry.computeBoundingBox();

    return line;

    //geometry.dispose();
    //material.dispose();
};

g3d.Line.update = async (args, env) => {
  if (env.local.lines) throw 'update of multiple lines is not supported!';

  let points = await interpretate(args[0], env);
  if (points instanceof NumericArrayObject) { // convert back automatically
    points = points.normal();
  }

  const positionAttribute = env.local.line.geometry.getAttribute( 'position' );

  positionAttribute.needsUpdate = true;

  for ( let i = 0; i < positionAttribute.count; i ++ ) {
    positionAttribute.setXYZ( i, ...(points[i]));
  }

  env.local.line.geometry.computeBoundingBox();
  env.local.line.geometry.computeBoundingSphere();

  env.wake(true);
}

g3d.Line.destroy = async (args, env) => {
  if (env.local.line) env.local.line.geometry.dispose();
  if (env.local.lines) env.local.lines.forEach((l) => l.geometry.dispose())
}

g3d.Line.virtual = true

let EffectComposer;
let RenderPass; 
let UnrealBloomPass;

let GUI;

g3d.ImageSize = () => "ImageSize"
g3d.Background = () => "Background"
g3d.AspectRatio = () => "AspectRatio"
g3d.Lighting = () => "Lighting"
g3d.Default = () => "Default"
g3d.None = () => false
g3d.Lightmap = () => "Lightmap"
g3d.Automatic = () => "Automatic" 

g3d.AnimationFrameListener = async (args, env) => {
  const dummy = await interpretate(args[0], env);

  const options = await core._getRules(args, {...env, hold:true});
  env.local.event = await interpretate(options.Event, env);
  
  const worker = {
    state: true,
    eval: () => {
      if (!env.local.worker.state) return;
      server.kernel.io.poke(env.local.event);
      env.local.worker.state = false;
    }
  };

  env.local.worker = worker;  
  env.Handlers.push(worker);
}

g3d.AnimationFrameListener.update = async (args, env) => {
  env.local.worker.state = true;
}

g3d.AnimationFrameListener.destroy = async (args, env) => {
  console.warn('AnimationFrameListener does not exist anymore');
  env.local.worker.eval = () => {}
}

g3d.AnimationFrameListener.virtual = true

let Water = false;
let Sky   = false;

g3d.Camera = (args, env) => {
  console.warn('temporary disabled');
  return;
  let pos = args;
  if (args.length === 0) pos = [3,3,1];
  env.cameraMesh.set(env.mesh, pos);
}



g3d.LightProbe = (args, env) => {
  //THREE.js light probe irradiance
}

g3d.DefaultLighting = (args, env) => {
  console.warn('temporary disabled');
  return;
  const lighting = [
    { type: "Ambient", color: [0.3, 0.2, 0.4] },
    {
      type: "Directional",
      color: [0.8, 0, 0],
      position: [2, 0, 2]
    },
    {
      type: "Directional",
      color: [0, 0.8, 0],
      position: [2, 2, 2]
    },
    {
      type: "Directional",
      color: [0, 0, 0.8],
      position: [0, 2, 2]
    }
  ];

  function addLight(l) {
    var color = new THREE.Color().setRGB(l.color[0], l.color[1], l.color[2]);
    var light;

    if (l.type === "Ambient") {
      light = new THREE.AmbientLight(color, 0.5);
    } else if (l.type === "Directional") {
      console.log('adding direction light');
      console.log(l);
      light = new THREE.DirectionalLight(color, 1);
      light.position.fromArray(l.position);

    } else if (l.type === "Spot") {
      light = new THREE.SpotLight(color);
      light.position.fromArray(l.position);
      light.target.position.fromArray(l.target);
      //light.target.updateMatrixWorld(); // This fixes bug in THREE.js
      light.angle = l.angle;
    } else if (l.type === "Point") {
      light = new THREE.PointLight(color);
      light.position.fromArray(l.position);

    } else {
      interpretate.alert("Error: Internal Light Error", l.type);
      return;
    }
    return light;
  } 

  lighting.forEach((el) => env.local.camera.add(addLight(el)) );

}

g3d.SkyAndWater = async (args, env) => {
  console.warn('temporary disabled');
  return;

  if (!Water) {
    //Water         = (await import('three/examples/jsm/objects/Water.js')).Water;
    //Sky           = (await import('three/examples/jsm/objects/Sky.js')).Sky;  
  }

  let options = await core._getRules(args, env);
  console.log('options:');
  options.dims = options.Dims || [10000, 10000];
  options.skyscale = options.Skyscale || 10000;
  options.elevation = options.Elevation ||  8;
  options.azimuth = options.Azimuth || 180;

  options.turbidity = options.Turbidity || 10;
  options.rayleigh = options.Rayleigh || 2;
  options.mieCoefficient = options.MieCoefficient || 0.005;
  options.mieDirectionalG = options.MieDirectionalG || 0.8;

  console.log(options);

  let sun = new THREE.Vector3();
  let water;
  // Water

  const waterGeometry = new THREE.PlaneGeometry(...options.dims);

  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load( 'https://cdn.statically.io/gh/JerryI/Mathematica-ThreeJS-graphics-engine/master/assets/waternormals.jpg', function ( texture ) {

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

      } ),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: true
    }
  );

  water.rotation.x = - Math.PI / 2;
  
  env.local.water = water;

  // Skybox

  const sky = new Sky();
  sky.scale.setScalar( options.skyscale );

  env.local.sky = sky;  

  const skyUniforms = sky.material.uniforms;

  skyUniforms[ 'turbidity' ].value = options.turbidity;
  skyUniforms[ 'rayleigh' ].value = options.rayleigh;
  skyUniforms[ 'mieCoefficient' ].value = options.mieCoefficient;
  skyUniforms[ 'mieDirectionalG' ].value = options.mieDirectionalG;

  const parameters = {
    elevation: options.elevation,
    azimuth: options.azimuth
  };



  env.local.scene.add( water );
  env.local.scene.add( sky );

  const pmremGenerator = new THREE.PMREMGenerator( env.local.renderer );
  let renderTarget;

  const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
  const theta = THREE.MathUtils.degToRad( parameters.azimuth );

  sun.setFromSphericalCoords( 1, phi, theta );

  sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
  water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

  if ( renderTarget !== undefined ) renderTarget.dispose();

  renderTarget = pmremGenerator.fromScene( sky );

  env.local.scene.environment = renderTarget.texture;  

  //every frame
  env.local.handlers.push(
    function() {
      env.local.water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
    }
  );
}

g3d.Sky = async (args, env) => {
  console.warn('temporary disabled');
  return;
  if (!Sky) {
    //Sky           = (await import('three/examples/jsm/objects/Sky.js')).Sky;  
  }

  let options = await core._getRules(args, env);
  console.log('options:');
  options.dims = options.Dims || [10000, 10000];
  options.skyscale = options.Skyscale || 10000;
  options.elevation = options.Elevation ||  8;
  options.azimuth = options.Azimuth || 180;

  options.turbidity = options.Turbidity || 10;
  options.rayleigh = options.Rayleigh || 2;
  options.mieCoefficient = options.MieCoefficient || 0.005;
  options.mieDirectionalG = options.MieDirectionalG || 0.8;

  console.log(options);

  let sun = new THREE.Vector3();

  // Skybox

  const sky = new Sky();
  sky.scale.setScalar( options.skyscale );

  env.local.sky = sky;  

  const skyUniforms = sky.material.uniforms;

  skyUniforms[ 'turbidity' ].value = options.turbidity;
  skyUniforms[ 'rayleigh' ].value = options.rayleigh;
  skyUniforms[ 'mieCoefficient' ].value = options.mieCoefficient;
  skyUniforms[ 'mieDirectionalG' ].value = options.mieDirectionalG;

  const parameters = {
    elevation: options.elevation,
    azimuth: options.azimuth
  };

  env.local.scene.add( sky );

  const pmremGenerator = new THREE.PMREMGenerator( env.local.renderer );
  let renderTarget;

  const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
  const theta = THREE.MathUtils.degToRad( parameters.azimuth );

  sun.setFromSphericalCoords( 1, phi, theta );

  sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
  env.local.sun = sun;
  //water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

  if ( renderTarget !== undefined ) renderTarget.dispose();

  renderTarget = pmremGenerator.fromScene( sky );

  env.local.scene.environment = renderTarget.texture;  
}

const makeEditorView = async (data, env = { global: {} }) => {
    //check by hash if there such object, if not. Ask server to create one with EditorView and store.
    const hash = String(interpretate.hash(data));
    let obj;
    let storage;

    if (!(hash in ObjectHashMap)) {
      obj = new ObjectStorage(hash);

      try {
        storage = await obj.get();
      } catch(err) {
        console.warn('Creating FE object by id '+hash);
        await server.kernel.io.fetch('CoffeeLiqueur`Extensions`Graphics3D`Private`MakeExpressionBox', [JSON.stringify(data), hash]);
        storage = await obj.get();
      }
      
    } else {
      obj = ObjectHashMap[hash];
    }

    if (!storage) storage = await obj.get();

    console.log("g3d: creating an object");
    console.log('frontend executable');


    const copy = env;
    
    const instance = new ExecutableObject('g3d-embeded-'+uuidv4(), copy, storage, true);
    instance.assignScope(copy);
    obj.assign(instance);

    await instance.execute();
    return instance;
  }


g3d['CoffeeLiqueur`Extensions`Graphics3D`Tools`WaterShader'] = async (args, env) => {
  
  
  if (!Water) {
    await interpretate.shared.THREEWater.load();
    Water = interpretate.shared.THREEWater.Water;
    //Water         = (await import('three/examples/jsm/objects/Water.js')).Water;
  }

  let options = await core._getRules(args, env);
  console.log('options:');


  console.log(options);
  options.dims = options.Size || [10000, 10000];

  let water;
  // Water

  const waterGeometry = new THREE.PlaneGeometry(...options.dims);

  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load( 'https://cdn.statically.io/gh/JerryI/Mathematica-ThreeJS-graphics-engine/master/assets/waternormals.jpg', function ( texture ) {

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

      } ),
      sunDirection: new THREE.Vector3(1,1,1),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: true
    }
  );

  water.rotation.x = - Math.PI / 2;
  
  env.local.water = water;

  env.global.scene.add( water );
  
  const sun = env.local.sun || (new THREE.Vector3(1,1,1));
  water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

  //every frame
  env.local.handlers.push(
    function() {
      env.local.water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
    }
  );
}  


g3d.Large = (args, env) => {
  return 1.0;
}

g3d.Medium = (args, env) => {
  return 0.7;
}

g3d.Small = (args, env) => {
  return 0.4;
}

function isMobile() {
    // 1) Best when available (Chromium etc.)
    if (navigator.userAgentData?.mobile != null) {
      return navigator.userAgentData.mobile;
    }

    // 2) Capability-based heuristic
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    const smallScreen = window.matchMedia?.("(max-width: 768px)").matches;
    const touch = navigator.maxTouchPoints > 0;

    // Common practical rule: coarse pointer + (touch or small screen)
    if (coarse && (touch || smallScreen)) return true;

    // 3) Last-resort UA fallback (older browsers)
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

const setImageSize = async (options, env) => {
let ImageSize;

if (options.ImageSize) {
  ImageSize = await interpretate(options.ImageSize, env);
  if (typeof ImageSize == 'number') {
    if (ImageSize < 10) {
      ImageSize = core.DefaultWidth * 2 * ImageSize;
    }
  } else {
    if (!(ImageSize instanceof Array)) {
      ImageSize = core.DefaultWidth
    }
  }

  if (!(ImageSize instanceof Array)) ImageSize = [ImageSize, ImageSize*0.618034];
} else if (env.imageSize) {
  if (Array.isArray(env.imageSize)) {
    ImageSize = env.imageSize;
  } else {
    ImageSize = [env.imageSize, env.imageSize*0.618034];
  }
} else {
  ImageSize = [core.DefaultWidth, core.DefaultWidth*0.618034];
}

    const mobileDetected = isMobile();
    if (mobileDetected) {
      console.warn('Mobile device detected!');
      const k = 2.0 / devicePixelRatio;
      ImageSize[0] = ImageSize[0] * k;
      if (ImageSize[0] > 250) ImageSize[0] = 250;
      ImageSize[1] = ImageSize[1] * k;
    }

return ImageSize;
}

const getControls = async (options) => {

}

let RTX = false;

const setupRTX = async () => {
if (RTX) return;

}

const setupRenderer = async () => {


}

const addDefaultLighting = (scene, RTX, pathtracing) => {
if (pathtracing) {
  /*const rectLight = new RTX.ShapedAreaLight( 0xffffff, 1.0,  10.0, 10.0 );
  rectLight.position.set( 5, 5, 0 );
  rectLight.lookAt( 0, 0, 0 );
  scene.add( rectLight )*/
  const texture = new RTX.GradientEquirectTexture();
  texture.topColor.set( 0xffffff );
  texture.bottomColor.set( 0x666666 );
  texture.update();
  scene.defaultEnvTexture = texture;
  scene.environment = texture;
  scene.background = texture;

  return;
}

// Wolfram Mathematica default lighting: 3 directional lights at 120° apart + ambient
// Light 1: Red-tinted, front (0°)
const light1 = new THREE.DirectionalLight(0xc99292, 1.5);
light1.position.set(0, 1, 2);
scene.add(light1);

// Light 2: Green-tinted, back-left (120°)
const light2 = new THREE.DirectionalLight(0x92c992, 1.5);
light2.position.set(-1.732, 1, -1);
scene.add(light2);

// Light 3: Blue-tinted, back-right (240°)
const light3 = new THREE.DirectionalLight(0x9292c9, 1.5);
light3.position.set(1.732, 1, -1);
scene.add(light3);

// Ambient light for fill
var hemiLight = new THREE.HemisphereLight( 0xe4f6ff, 0x080820, 2 );
scene.add( hemiLight );
}

g3d.PointLight = async (args, env) => {
const copy = {...env};
//const options = await core._getRules(args, {...env, hold: true});

//console.log(options);
//const keys = Object.keys(options);

let position = [0, 0, 10];
let color = 0xffffff; 

const options = await core._getRules(args, env);
const olength = Object.keys(options).length;
env.local.olength = olength;

if (args.length - olength > 0) color = await interpretate(args[0], copy); 

if (args.length - olength > 1) {

  position = await interpretate(args[1], env);

  if (position instanceof NumericArrayObject) {
    position = position.normal();
  }
  //position = [position[0], position[1], position[2]];
}


let intensity = 100; 
let distance = 0; //if (args.length > 3) distance = await interpretate(args[3], env);
let decay = 2; //if (args.length  > 4) decay = await interpretate(args[4], env);

if (typeof options.Intensity == 'number') {
  intensity = options.Intensity; 
}
if (typeof options.Distance == 'number') {
  distance = options.Distance; 
}
if (typeof options.Decay == 'number') {
  decay = options.Decay; 
}

const light = new THREE.PointLight(color, intensity, distance, decay);
light.castShadow = env.shadows;
light.position.set(...position);
light.shadow.bias = -0.01;

if (typeof options.ShadowBias == 'number') {
  light.shadow.bias = options.ShadowBias; 
}

env.local.light = light;
env.mesh.add(light);

return light;
}

g3d.PointLight.update = async (args, env) => {
  env.wake(false, true);

  //light.color.set
  if (args.length - env.local.olength > 1) {
    let pos = await interpretate(args[1], env);

    if (pos instanceof NumericArrayObject) {
      pos = pos.normal();
    }
    env.local.light.position.set(...pos); 
  } 
}

g3d.PointLight.destroy = (args, env) => {
  env.local.light.dispose()
}


g3d.PointLight.virtual = true

g3d.DirectionalLight = async (args, env) => {
  const copy = {...env};

  let position = [0, 0, 10];
  let target = [0, 0, 0];
  let color = 0xffffff;

  const options = await core._getRules(args, env);
  const olength = Object.keys(options).length;
  env.local.olength = olength;

  if (args.length - olength > 0) color = await interpretate(args[0], copy);

  if (args.length - olength > 1) {
    position = await interpretate(args[1], env);

    if (position instanceof NumericArrayObject) {
      position = position.normal();
    }

    if (position.length == 2) {
      target = position[1];
      position = position[0];
    }
  }

  let intensity = 2;

  if (typeof options.Intensity == 'number') {
    intensity = options.Intensity;
  }

  const light = new THREE.DirectionalLight(color, intensity);
  light.castShadow = env.shadows;
  light.position.set(...position);
  light.target.position.set(...target);
  light.shadow.bias = -0.01;

  if (typeof options.ShadowBias == 'number') {
    light.shadow.bias = options.ShadowBias;
  }

  light.shadow.mapSize.height = 1024;
  light.shadow.mapSize.width = 1024;

  if (typeof options.ShadowMapSize == 'number') {
    light.shadow.mapSize.height = options.ShadowMapSize;
    light.shadow.mapSize.width = options.ShadowMapSize;
  }

  env.local.light = light;
  env.mesh.add(light);
  env.mesh.add(light.target);

  return light;
}

g3d.DirectionalLight.update = async (args, env) => {
  env.wake(false, true);

  if (args.length - env.local.olength > 1) {
    let position = await interpretate(args[1], env);

    if (position instanceof NumericArrayObject) {
      position = position.normal();
    }

    if (position.length == 2) {
      let target = position[1];
      position = position[0];
      env.local.light.target.position.set(...target);
    }

    env.local.light.position.set(...position);
  }
}

g3d.DirectionalLight.destroy = (args, env) => {
  env.local.light.dispose();
}

g3d.DirectionalLight.virtual = true

g3d.SpotLight = async (args, env) => {
const copy = {...env};

const options = await core._getRules(args, env);
const olength = Object.keys(options).length;
env.local.olength = olength;
//console.log(options);
//const keys = Object.keys(options);

let color = 0xffffff; if (args.length-olength > 0) color = await interpretate(args[0], copy);

let position = [10, 100, 10];
let target = [0,0,0];



if (args.length-olength > 1) {
  position = await interpretate(args[1], env);
  if (position instanceof NumericArrayObject) {
    position = position.normal();
  }

  if (position.length == 2) {
    target = position[1];
    //target = [target[0], target[2], -target[1]];
    position = position[0];
  }
  //position = [position[0], position[2], -position[1]];
}

let angle = Math.PI/3; if (args.length-olength > 2) angle = await interpretate(args[2], env);

let intensity = 100; //if (args.length > 3) intensity = await interpretate(args[3], env);

if (typeof options.Intensity == 'number') {
  intensity = options.Intensity; 
}



let distance = 0; //if (args.length > 4) distance = await interpretate(args[4], env);

if (typeof options.Distance == 'number') {
  distance = options.Distance; 
}

let penumbra = 0; //if (args.length > 5) penumbra = await interpretate(args[5], env);

if (typeof options.Penumbra == 'number') {
  penumbra = options.Penumbra; 
}


let decay = 2; //if (args.length > 6) decay = await interpretate(args[6], env);

if (typeof options.Decay == 'number') {
  decay = options.Decay; 
}


const spotLight = new THREE.SpotLight( color, intensity, distance, angle, penumbra, decay );
spotLight.position.set(...position);
spotLight.target.position.set(...target);

spotLight.castShadow = env.shadows;
spotLight.shadow.bias = -0.01;

if (typeof options.ShadowBias == 'number') {
  spotLight.shadow.bias = options.ShadowBias; 
}

spotLight.shadow.mapSize.height = 1024;
spotLight.shadow.mapSize.width = 1024;

if (typeof options.ShadowMapSize == 'number') {
  spotLight.shadow.mapSize.height = options.ShadowMapSize; 
  spotLight.shadow.mapSize.width = options.ShadowMapSize; 
}

env.local.spotLight = spotLight;
env.mesh.add(spotLight);
env.mesh.add(spotLight.target);

return spotLight;
}

g3d.SpotLight.update = async (args, env) => {
env.wake(false, true);
const olength = env.local.olength;
//const options = await core._getRules(args, {...env, hold: true}); 

if (args.length-olength > 1) {
  let position = await interpretate(args[1], env);
  if (position instanceof NumericArrayObject) {
    position = position.normal();
  }
  if (position.length == 2) {
    let target = position[1];
    //target = [target[0], target[2], target[1]];
    position = position[0];
    //position = [position[0], position[2], -position[1]];

    if (env.Lerp) {
      if (!env.local.lerp1) {
        
        console.log('creating worker for lerp of movements..');
        const worker = {
          alpha: 0.05,
          target: new THREE.Vector3(...position),
          eval: () => {
            env.local.spotLight.position.lerp(worker.target, 0.05)
          }
        };

        env.local.lerp1 = worker;  

        env.Handlers.push(worker);
      }

      env.local.lerp1.target.fromArray(position);

      if (!env.local.lerp2) {
        
        console.log('creating worker for lerp of movements..');
        const worker = {
          alpha: 0.05,
          target: new THREE.Vector3(...target),
          eval: () => {
            env.local.spotLight.target.position.lerp(worker.target, 0.05)
          }
        };

        env.local.lerp2 = worker;  

        env.Handlers.push(worker);
      }

      env.local.lerp2.target.fromArray(target);  


    } else {
      env.local.spotLight.position.set(...position);
      env.local.spotLight.target.position.set(...target);
    }
  } else {

    //position = [position[0], position[2], -position[1]];

    if (env.Lerp) {
      if (!env.local.lerp1) {
        
        console.log('creating worker for lerp of movements..');
        const worker = {
          alpha: 0.05,
          target: new THREE.Vector3(...position),
          eval: () => {
            env.local.spotLight.position.lerp(worker.target, 0.05)
          }
        };

        env.local.lerp1 = worker;  

        env.Handlers.push(worker);
      }

      env.local.lerp1.target.fromArray(position);

            
    } else {
      env.local.spotLight.position.set(...position);
    }
  }
  


}

}

g3d.SpotLight.destroy = async (args, env) => {
console.log('SpotLight destoyed');
}

g3d.SpotLight.virtual = true



g3d.Shadows = async (args, env) => {
env.shadows = await interpretate(args[0], env);
}



g3d.HemisphereLight = async (args, env) => {
const copy = {...env};

const options = await core._getRules(args, env);

if (args.length > 0) await interpretate(args[0], copy); else copy.color = 0xffffbb;
const skyColor = copy.color;

if (args.length > 1) await interpretate(args[1], copy); else copy.color = 0x080820;
const groundColor = copy.color;

let intensity = 1; if (args.length > 2) intensity = await interpretate(args[2], env);
if (typeof options.Intensity == 'number') intensity = options.Intensity;

const hemiLight = new THREE.HemisphereLight( skyColor, groundColor, intensity );
env.global.scene.add( hemiLight );
}

g3d.MeshMaterial = async (args, env) => {
const mat = await interpretate(args[0], env);
env.material = mat;
}

g3d['CoffeeLiqueur`Extensions`Graphics3D`MeshMaterial'] = g3d.MeshMaterial

g3d.MeshPhysicalMaterial = () => THREE.MeshPhysicalMaterial
g3d.MeshLambertMaterial = () => THREE.MeshLambertMaterial
g3d.MeshPhongMaterial = () => THREE.MeshPhongMaterial
g3d.MeshToonMaterial = () => THREE.MeshToonMaterial

g3d.MeshFogMaterial = async (args, env) => {
  let density = 0.01;
  if (args.length > 0) {
    density = await interpretate(args[0], env);
  }
  function virt () {
    const fogMaterial = new RTX.FogVolumeMaterial();
    fogMaterial.density = density;
    return fogMaterial;
  };

  return virt;
}

let TransformControls = false

g3d.EventListener = async (args, env) => {
  const rules = await interpretate(args[1], env);

  const copy = {...env};

  let object = await interpretate(args[0], env);
  if (Array.isArray(object)) object = object[0];

  if (!TransformControls) {
    await interpretate.shared.THREETransformControls.load();
    TransformControls = interpretate.shared.THREETransformControls.TransformControls;
    //TransformControls = (await import('three/addons/controls/TransformControls.js')).TransformControls;
  }
  rules.forEach((rule)=>{
    g3d.EventListener[rule.lhs](rule.rhs, object, copy);
  });

  return null;
}

g3d.EventListener.transform = (uid, object, env) => {
  console.log(env);
  console.warn('Controls transform is enabled');
  const control = new TransformControls(env.camera, env.global.domElement);

  const gizmo = control.getHelper();

  const orbit = env.controlObject.o;

  control.attach(object); 

  env.global.scene.add(gizmo); 

  const updateData = throttle((x,y,z) => {
    server.kernel.emitt(uid, `<|"position"->{${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}}|>`, 'transform')
  });

  control.addEventListener( 'change', function(event) {
    updateData(object.position.x,object.position.y,object.position.z)
  } );

  control.addEventListener( 'dragging-changed', function ( event ) {
    console.log('changed');
    orbit.enabled = !event.value
  } );
};

g3d.EventListener.drag = (uid, object, env) => {
  console.log(env);
  console.warn('Controls transform is enabled');
  const control = new TransformControls(env.camera, env.global.domElement);

  const gizmo = control.getHelper();

  const orbit = env.controlObject.o;

  control.attach(object); 

  env.global.scene.add(gizmo); 

  const updateData = throttle((x,y,z) => {
    server.kernel.io.fire(uid, [x,y,z], 'drag')
  });

  control.addEventListener( 'change', function(event) {
    updateData(object.position.x,object.position.y,object.position.z)
  } );

  control.addEventListener( 'dragging-changed', function ( event ) {
    console.log('changed');
    orbit.enabled = !event.value
  } );
};

let RGBELoader;
let OrbitControls;
let FullScreenQuad;
let VariableTube;

let CSS2D = undefined;

const blobToBase64 = blob => {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  return new Promise(resolve => {
    reader.onloadend = () => {
      resolve(reader.result);
    };
  });
};

g3d['Graphics3D`Serialize'] = async (args, env) => {
  const opts = await core._getRules(args, env);
  let dom = env.element;

  if (opts.TemporalDOM) {
    dom = document.createElement('div');
    dom.style.pointerEvents = 'none';
    dom.style.opacity = 0;
    dom.style.position = 'absolute';

    document.body.appendChild(dom);
  }

  await interpretate(args[0], {...env, element: dom});

  const promise = new Deferred();
  console.log(env.global);

  env.global.renderer.domElement.toBlob(function(blob){
    promise.resolve(blob)
  }, 'image/png', 1.0);

  const blob = await promise.promise;

  Object.values(env.global.stack).forEach((el) => {
    el.dispose();
  });

  if (opts.TemporalDOM) {
    dom.remove();
  }

  const encoded = await blobToBase64(blob);
 
  return encoded;  
}



g3d['Graphics3D`toDataURL'] = async (args, env) => {
  const promise = new Deferred();
  console.log(env.global);

  env.local.animateOnce();
  env.local.renderer.domElement.toBlob(function(blob){
    promise.resolve(blob)
  }, 'image/png', 1.0);

  const blob = await promise.promise;
  const encoded = await blobToBase64(blob);
 
  return encoded;  
}

g3d['CoffeeLiqueur`Extensions`Graphics3D`Tools`toDataURL'] = g3d['Graphics3D`toDataURL']
g3d['CoffeeLiqueur`Extensions`Graphics3D`Tools`Serialize'] = g3d['Graphics3D`Serialize']

g3d.Top = () => [0,0,1000]
g3d.Bottom = () => [0,0,-1000]

g3d.Right = () => [1000,0,0]
g3d.Left = () => [-1000,0,0]

g3d.Front = () => [0,1000,0]
g3d.Back = () => [0,-1000,0]

g3d.Bold = () => 'Bold'
g3d.Bold.update = g3d.Bold;
g3d.Italic = () => 'Italic'
g3d.Italic.update = g3d.Italic;
g3d.FontSize = () => 'FontSize'
g3d.FontSize.update = g3d.FontSize;
g3d.FontFamily = () => 'FontFamily'
g3d.FontFamily.update = g3d.FontFamily;

async function processLabel(ref0, env) {
          let ref = ref0;
          let labelFallback = false;
          let offset = [0,0,0];

          if (ref == 'None') {
            const text = document.createElement( 'span' );
            let labelX = new CSS2D.CSS2DObject( text );
            text.className = 'g3d-label';
            return {offset: offset, element: labelX};
          }


          if (Array.isArray(ref)) {
           if (ref[0] == "HoldForm") {

            if (Array.isArray(ref[1])) {
              if (ref[1][0] == 'List') {
                
                const offsetDerived = await interpretate(ref[1][2], env);
                ref = ['HoldForm', ref[1][1]];
                if (Array.isArray(offsetDerived)) offset = offsetDerived;
              }
            }

            if (typeof ref[1] == 'string') {
              if (ref[1].charAt(0) == "'") {
                labelFallback = false;
                ref = ref[1];
              } else {
                labelFallback = true;
              }
            } else {
              labelFallback = true;
            }
            
           } else if (ref[0] == 'List') {
            const offsetDerived = await interpretate(ref[2], env);
            ref = ref[1];
            if (ref[0] == "HoldForm") {
              if (typeof ref[1] == 'string') {
                if (ref[1].charAt(0) == "'") {
                  labelFallback = false;
                  ref = ref[1];
                } else {
                  labelFallback = true;
                }
              } else {
                labelFallback = true;
              }              
            }
            if (Array.isArray(offsetDerived)) offset = offsetDerived;
           }
          }

          
          const text = document.createElement( 'span' );
          let labelX = new CSS2D.CSS2DObject( text );
          text.className = 'g3d-label';

          
          if (!labelFallback) {
            try {
              const content = await interpretate(ref, {...env});
              text.innerHTML = latexLikeToHTML(String(content));

            } catch(err) {
              console.warn('Err:', err);
              labelFallback = true;
            }
          }

          

          if (labelFallback) {
            console.warn('x-label: fallback to EditorView');
            await makeEditorView(ref, {...env, element:text});
          }


          return {offset: offset, element: labelX};
}

core.Graphics3D = async (args, env) => {  
//Lazy loading

await interpretate.shared.THREE.load();

if (!THREE) {
  THREE = interpretate.shared.THREE.THREE;
  OrbitControls = interpretate.shared.THREE.OrbitControls;
  RGBELoader = interpretate.shared.THREE.RGBELoader;
  CSS2D = interpretate.shared.THREE.CSS2D;
  VariableTube = await import('./../libs/tubes/index.js');
  VariableTube = VariableTube.VariableTube;
}



MathUtils     = THREE.MathUtils;

let sleeping = false;
let timeStamp = performance.now();

/**
 * @type {Object}
 */  
let options = await core._getRules(args, {...env, context: g3d, hold:true});


if (Object.keys(options).length === 0 && args.length > 1) {
  options = await core._getRules(args[1], {...env, context: g3d, hold:true});
}

console.warn(options);  


let noGrid = true;

let plotRange;

let viewPoint = [- 40, 20, 30];

if (options.ViewPoint) {
  const r = await interpretate(options.ViewPoint, {...env, context: g3d});
  if (Array.isArray(r)) {
    if (typeof r[0] == 'number' && typeof r[1] == 'number' && typeof r[2] == 'number') {
      viewPoint = [r[0], r[2], r[1]];
    }
  }
}

if (options.Axes) {
  console.warn(options.PlotRange);
  plotRange = await interpretate(options.PlotRange, env);
  noGrid = false;
}



const defaultMatrix = new THREE.Matrix4().set(
  1, 0, 0, 0,//
  0, 1, 0, 0,//
  0, 0, 1, 0,//
  0, 0, 0, 1);


let PathRendering = false;
if ('RTX' in options) {
  PathRendering = true;
  if (!RTX) {
    await interpretate.shared.THREERTX.load();
    RTX = interpretate.shared.THREERTX.RTX;
  }
  //RTX = (await import('three-gpu-pathtracer/build/index.module.js'));
} else if (options.Renderer) {
  const renderer = await interpretate(options.Renderer, env);
  if (renderer == 'PathTracing') {
    PathRendering = true;
    if (!RTX) {
      await interpretate.shared.THREERTX.load();
      RTX = interpretate.shared.THREERTX.RTX;
    }   
    //RTX = (await import('three-gpu-pathtracer/build/index.module.js'));
  }
}

if (!GUI && PathRendering) {
  GUI           = (await import('dat.gui')).GUI;  
}




  /**
   * @type {Object}
   */   
  env.local.handlers = [];
  env.local.prolog   = [];

  const Handlers = [];

/**
 * @type {HTMLElement}
 */
const container = env.element;

/**
 * @type {[Number, Number]}
 */
const ImageSize = await setImageSize(options, env); 

const params = 	{
  topColor: 0xffffff,
  bottomColor: 0x666666,
  multipleImportanceSampling: false,
  stableNoise: false,
  denoiseEnabled: true,
  denoiseSigma: 2.5,
  denoiseThreshold: 0.1,
  denoiseKSigma: 1.0,
  environmentIntensity: 1,
  environmentRotation: 0,
  environmentBlur: 0.0,
  backgroundBlur: 0.0,
  bounces: 5,
  sleepAfter: 1000,
  runInfinitely: false,
  fadeDuration: 300,
  stopAfterNFrames: 60,
  samplesPerFrame: 1,
  acesToneMapping: true,
  resolutionScale: 1.0,
  transparentTraversals: 20,
  filterGlossyFactor: 0.5,
  tiles: 1,
  renderDelay: 100,
  minSamples: 5,
  backgroundAlpha: 0,
  checkerboardTransparency: true,
  cameraProjection: 'Orthographic',
  enablePathTracing: true
};

if (options.MultipleImportanceSampling) {
  params.multipleImportanceSampling = await interpretate(options.MultipleImportanceSampling, env);
}

if ('EnablePathTracing' in options) {
  params.enablePathTracing = await interpretate(options.EnablePathTracing, env);
}

if ('AcesToneMapping' in options) {
  params.acesToneMapping = await interpretate(options.AcesToneMapping, env);
}

if (options.Bounces) {
  params.bounces = await interpretate(options.Bounces, env);
}

if ('FadeDuration' in options) {
  params.fadeDuration = await interpretate(options.FadeDuration, env);
}



if ('RenderDelay' in options) {
  params.renderDelay = await interpretate(options.RenderDelay, env);
}

if ('MinSamples' in options) {
  params.minSamples = await interpretate(options.MinSamples, env);
}

if ('EnvironmentIntensity' in options) {
  params.environmentIntensity = await interpretate(options.EnvironmentIntensity, env);
}

if ('SamplesPerFrame' in options) {
  params.samplesPerFrame = await interpretate(options.SamplesPerFrame, env);
}



if (options.ViewProjection) { 
  params.cameraProjection = await interpretate(options.ViewProjection, env);
}

if (options.Background) {
  const backgroundColor = await interpretate(options.Background, {...env, context:g3d});
  options.Background = backgroundColor;
  if (backgroundColor?.isColor == true) {
    params.backgroundAlpha = 1.0;
  }
  
}

if (!PathRendering) params.resolutionScale = 1.0;

if (PathRendering) {
  params.sleepAfter = 10000;
}

if (options.SleepAfter) {
  params.sleepAfter = await interpretate(options.SleepAfter, env);
}
//Setting GUI
let gui;
let guiContainer;

if (PathRendering) {
  gui = new GUI({ autoPlace: false, name: '...', closed:true });

  guiContainer = document.createElement('div');
  guiContainer.classList.add('graphics3d-controller');
  guiContainer.appendChild(gui.domElement);

  env.local.animateOnce = animateOnce;

  function takeScheenshot() {
    animateOnce();
    renderer.domElement.toBlob(function(blob){
      var a = document.createElement('a');
      var url = URL.createObjectURL(blob);
      a.href = url;
      a.download = 'screenshot.png';
      a.click();
    }, 'image/png', 1.0);
  }

  const button = { Save:function(){ takeScheenshot() }};
  gui.add(button, 'Save');
}




//Setting up renderer
let renderer, domElement, controls, ptRenderer, activeCamera, blitQuad, denoiseQuad;
let perspectiveCamera, orthoCamera, equirectCamera;
let envMap, envMapGenerator, scene;
let samplesEl;
let PT_PROGRAM_ID;
const planes = {near:0, far:2000};

let orthoWidth = 5;

if (options.OrthographicCameraWidth) {
    orthoWidth = await interpretate(options.OrthographicCameraWidth, env);
}

if (options.CameraNearPlane) {
    planes.near = await interpretate(options.CameraNearPlane, env);
}

if (options.CameraFarPlane) {
    planes.far = await interpretate(options.CameraFarPlane, env);
}

renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setClearColor( 0, 0 );
container.appendChild( renderer.domElement );
env.local.rendererContainer = renderer.domElement;

domElement = renderer.domElement;

env.local.domElement = domElement;
env.local.renderer = renderer;

//fix for translate-50% layout
const layoutOffset = {x:0, y:0};
if (container.classList.contains('slide-frontend-object')) {
  layoutOffset.x = -1.0;
}

//if (CSS2D) {
  const labelRenderer = new CSS2D.CSS2DRenderer({globalOffset: layoutOffset});
  labelRenderer.setSize( ImageSize[0], ImageSize[1] );
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.bottom = '0px';
  labelRenderer.domElement.style.marginTop = 'auto';
  labelRenderer.domElement.style.marginBottom = 'auto';
 // labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild( labelRenderer.domElement );
  env.local.labelContainer = labelRenderer.domElement;

  domElement = labelRenderer.domElement;
//}


if (ImageSize[0] > 250 && ImageSize[1] > 150 && PathRendering) {
  env.local.guiContainer = guiContainer;
  container.appendChild( guiContainer );
}

const aspect = ImageSize[0]/ImageSize[1];

if (PathRendering) {
  perspectiveCamera = new RTX.PhysicalCamera( 75, aspect, 0.025, 500 );
  perspectiveCamera.position.set( - 4, 2, 3 );
} else {
  perspectiveCamera = new THREE.PerspectiveCamera( 75, aspect, 0.025, 500 );
  if (options.PerspectiveCameraZoom) {
    perspectiveCamera.zoom = await interpretate(options.PerspectiveCameraZoom, env);
  }
  renderer.shadowMap.enabled = true;
}

let wakeFunction;

if (PathRendering) {
  wakeFunction = (updateScene, updateLighting) => {
    timeStamp = performance.now();
    env.local.updateSceneNext = updateScene == true;
    env.local.updateLightingNext = updateLighting == true;

    if (!sleeping) return;
    env.local.wakeThreadUp(); 
  }

} else {
  wakeFunction = () => {
    timeStamp = performance.now();
    if (!sleeping) return;
    env.local.wakeThreadUp(); 
  }
}



const orthoHeight = orthoWidth / aspect;
orthoCamera = new THREE.OrthographicCamera( orthoWidth / - 2, orthoWidth / 2, orthoHeight / 2, orthoHeight / - 2, planes.near, planes.far );

orthoCamera.position.set( ...viewPoint );

activeCamera = orthoCamera;

scene = new THREE.Scene();

if (PathRendering) {
  //equirectCamera = new RTX.EquirectCamera();
  //equirectCamera.position.set( - 4, 2, 3 );

  //ptRenderer = new RTX.PathTracingRenderer( renderer );
  ptRenderer = new RTX.WebGLPathTracer( renderer );
  //ptRenderer.enablePathTracing = params.enablePathTracing;
  ptRenderer.minSamples = params.minSamples;
  ptRenderer.renderDelay = params.renderDelay;
  ptRenderer.fadeDuration = params.fadeDuration;
  ptRenderer.multipleImportanceSampling = params.multipleImportanceSampling;
  //ptRenderer.setScene( scene, activeCamera ); 
} 

let controlObject = {
  init: (camera, dom) => {
    controlObject.o = new OrbitControls( camera, domElement );
    controlObject.o.addEventListener('change', wakeFunction);
    controlObject.o.target.set( 0, 1, 0 );
    controlObject.o.update();
  },

  dispose: () => {
    
  }
};



if (options.Controls) {

  if ((await interpretate(options.Controls, env)) === 'PointerLockControls') {
    await interpretate.shared.THREEPointerLockControls.load();
    const o = interpretate.shared.THREEPointerLockControls.PointerLockControls;
    //const o = (await import('three/addons/controls/PointerLockControls.js')).PointerLockControls;
    
  

    controlObject = {

      init: (camera, dom) => {
        controlObject.o = new o( camera, dom );
        scene.add( controlObject.o.getObject() );
        controlObject.o.addEventListener('change', wakeFunction);

        controlObject.onKeyDown = function ( event ) {
          // Prevent all default behavior immediately
          event.preventDefault();
          event.stopImmediatePropagation();
          
          // Skip if key is already being held (prevent repeat)
          if (event.repeat) return false;
          
          wakeFunction();
          switch ( event.code ) {
            

            case 'ArrowUp':
            case 'KeyW':
              controlObject.moveForward = true;
              break;
            case 'ArrowLeft':
            case 'KeyA':
              controlObject.moveLeft = true;
              break;
            case 'ArrowDown':
            case 'KeyS':
              controlObject.moveBackward = true;
              break;
            case 'ArrowRight':
            case 'KeyD':
              controlObject.moveRight = true;
              break;
            case 'Space':
              if ( controlObject.canJump === true ) controlObject.velocity.y += 20;
              controlObject.canJump = false;
              break;
          }
          return false;
        };

        controlObject.onKeyUp = function ( event ) {
          // Prevent all default behavior immediately
          event.preventDefault();
          event.stopImmediatePropagation();
          
          wakeFunction();
          switch ( event.code ) {
            case 'ArrowUp':
            case 'KeyW':
              controlObject.moveForward = false;
              break;
            case 'ArrowLeft':
            case 'KeyA':
              controlObject.moveLeft = false;
              break;
            case 'ArrowDown':
            case 'KeyS':
              controlObject.moveBackward = false;
              break;
            case 'ArrowRight':
            case 'KeyD':
              controlObject.moveRight = false;
              break;
          }
          return false;              
        };

        //env.local.handlers.push(controlObject.handler);
        // Add movement handler for player movement
        env.local.handlers.push(function playerMovementHandler() {
          if (!controlObject.o || !controlObject.o.isLocked) return;
          const now = performance.now();
          const delta = (now - (controlObject.prevTime || now)) / 1000;
          controlObject.prevTime = now;
          // Damping
          controlObject.velocity.x *= 0.9;
          controlObject.velocity.z *= 0.9;
          // Gravity
          controlObject.velocity.y -= 9.8 * 4 * delta; // 10x gravity for game feel
          // Direction
          controlObject.direction.z = Number(controlObject.moveForward) - Number(controlObject.moveBackward);
          controlObject.direction.x = Number(controlObject.moveRight) - Number(controlObject.moveLeft);
          controlObject.direction.normalize();
          // Acceleration
          if (controlObject.moveForward || controlObject.moveBackward) controlObject.velocity.z -= controlObject.direction.z * 100.0 * delta;
          if (controlObject.moveLeft || controlObject.moveRight) controlObject.velocity.x -= controlObject.direction.x * 100.0 * delta;
          // Move
          controlObject.o.moveRight(-controlObject.velocity.x * delta);
          controlObject.o.moveForward(-controlObject.velocity.z * delta);
          controlObject.o.getObject().position.y += (controlObject.velocity.y * delta);
          
          // Collision detection - raycast downward to find ground
          const playerPos = controlObject.o.getObject().position;
          const raycaster = new THREE.Raycaster();
          raycaster.set(playerPos, new THREE.Vector3(0, -1, 0));
          
          // Get all intersectable objects from the scene
          const intersects = raycaster.intersectObjects(scene.children, true);
          
          let groundLevel = 0.3; // Default ground level
          
          // Find the highest intersectable surface below the player
          for (let i = 0; i < intersects.length; i++) {
            const intersect = intersects[i];
            const intersectY = intersect.point.y;
            
            // Only consider surfaces below or very close to player
            if (intersectY <= playerPos.y + 0.1) {
              groundLevel = Math.max(groundLevel, intersectY + 0.3); // Player height offset
              break; // Take the first (closest) intersection
            }
          }
          
          // Ground check with collision detection
          if (playerPos.y <= groundLevel) {
            controlObject.velocity.y = 0;
            controlObject.o.getObject().position.y = groundLevel;
            controlObject.canJump = true;
          }
        });

        const inst = document.createElement('div');
        inst.style.width="100%";
        inst.style.height="100%";
        inst.style.top = "0";
        inst.style.position = "absolute";
        env.element.appendChild(inst);

        // Only add key listeners to document when pointer lock is active
        function addKeyListeners() {
          document.addEventListener( 'keydown', controlObject.onKeyDown );
          document.addEventListener( 'keyup', controlObject.onKeyUp );
        }
        function removeKeyListeners() {
          document.removeEventListener( 'keydown', controlObject.onKeyDown );
          document.removeEventListener( 'keyup', controlObject.onKeyUp );
        }

        inst.addEventListener( 'click', function () {
          controlObject.o.lock();
        } );

        controlObject.o.addEventListener( 'lock', function () {
          inst.style.display = 'none';
          addKeyListeners();
        } );

        controlObject.o.addEventListener( 'unlock', function () {
          inst.style.display = '';
          removeKeyListeners();
        } );
      },

      moveBackward: false,
      moveForward: false,
      moveLeft: false,
      moveRight: false,
      canJump: false,
      velocity: new THREE.Vector3(),
      direction: new THREE.Vector3(),

      dispose: () =>{

        document.removeEventListener( 'keydown', controlObject.onKeyDown );
        document.removeEventListener( 'keyup', controlObject.onKeyUp );
        
      }  
    };

   

          

  } 
}

env.local.controlObject = controlObject;




controlObject.init(activeCamera, domElement);
controls = controlObject.o;

env.local.controlObject = controlObject;
env.local.renderer = renderer;
env.local.domElement = domElement;

if (PathRendering) {
  controls.addEventListener( 'change', () => {
    ptRenderer.updateCamera();
  } ); 
} 



const group = new THREE.Group();

const allowLerp = false;
if (options.TransitionType) {
  const type = await interpretate(options.TransitionType, env);
  if (type === 'Linear') allowLerp = true;
}

const envcopy = {
  ...env,
  context: g3d,
  numerical: true,
  tostring: false,
  matrix: defaultMatrix,
  material: THREE.MeshPhysicalMaterial,
  color: new THREE.Color(1, 1, 1),
  opacity: 1,
  thickness: 1,
  roughness: 0.5,
  edgecolor: new THREE.Color(0, 0, 0),
  mesh: group,
  metalness: 0,
  emissive: undefined,
  arrowHeight: 30,
  arrowRadius: 30,
  reflectivity: 0.5,
  clearcoat: 0,
  shadows: false,
  Lerp: allowLerp,
  camera: activeCamera,
  controlObject: controlObject,

  fontSize: undefined,
  fontFamily: undefined,

  Handlers: Handlers,
  wake: wakeFunction,
  pointSize: 0.8/10.0,

  colorInherit: true,

  emissiveIntensity: undefined,
  roughness: undefined,
  metalness: undefined,
  ior: undefined,
  transmission: undefined,
  thinFilm: undefined,
  materialThickness: undefined,
  attenuationColor: undefined,
  attenuationDistance: undefined,
  opacity: undefined,
  clearcoat: undefined,
  clearcoatRoughness: undefined,
  sheenColor: undefined,
  sheenRoughness: undefined,
  iridescence: undefined,
  iridescenceIOR: undefined,
  iridescenceThickness: undefined,
  specularColor: undefined,
  specularIntensity: undefined,
  matte: undefined
}  

env.local.wakeThreadUp = () => {
  if (!sleeping) return;
  sleeping = false;
  console.warn("g3d >> waking up!");
  env.local.aid = requestAnimationFrame( animate );
}

env.global.renderer = renderer;
env.global.labelRenderer = labelRenderer;
env.global.domElement = domElement;
env.global.scene    = scene;
envcopy.camera   = activeCamera;
//activeCamera.layers.enableAll();

env.local.element  = container;

if (PathRendering)
  envcopy.PathRendering = true;

if (options.Prolog) {
  await interpretate(options.Prolog, envcopy);
}

if (options.Axes && plotRange) {
  console.log('Drawing grid...');

}

let noLighting = false;

if ('Lighting' in options) {
  if (options.Lighting) {
    if (options.Lighting[0] == 'List') {
      noLighting = false;
    } else {
      if (options.Lighting == "'Neutral'") {
        //neutralMaterial = true;
        envcopy.material = THREE.MeshBasicMaterial;
      } else {
        noLighting = true;
      }
      
    }
  } else {
    noLighting = true;
  }
}


await interpretate(args[0], envcopy);

if (options.Epilog) {
  interpretate(options.Epilog, envcopy);
}

/* GET RANGES */

let bbox;

// helper to test for [number, number]
const isNumRange = arr =>
  Array.isArray(arr) &&
  arr.length === 2 &&
  typeof arr[0] === 'number' &&
  typeof arr[1] === 'number';

if (Array.isArray(plotRange) && isNumRange(plotRange[0])) {
  // use X for any malformed axis
  const xRange = plotRange[0];
  const yRange = isNumRange(plotRange[1]) ? plotRange[1] : xRange;
  const zRange = isNumRange(plotRange[2]) ? plotRange[2] : xRange;
  const midX = 0.5*(xRange[1] + xRange[0]);
  const midY = 0.5*(yRange[1] + yRange[0]);
  const midZ = 0.5*(zRange[1] + zRange[0]);
  const s = 1.1;
  
  bbox = {
    min: { x: (xRange[0] - midX)*s + midX, y: (yRange[0] - midY)*s + midY, z: (zRange[0] - midZ)*s + midZ },
    max: { x: (xRange[1] - midX)*s + midX, y: (yRange[1] - midY)*s + midY, z: (zRange[1] - midZ)*s + midZ }
  };
}

// fallback if we didn’t get a valid bbox
if (!bbox) {
  bbox = new THREE.Box3().setFromObject(group);
}

if (options.Axes) {
  
  //envcopy.mesh.layers.enableAll();

  const ticksLabels = {
    x: [],
    y: [],
    z: []
  };
  

  if (true) {

    function niceTicks(min, max, targetCount = 8) {
  const span = max - min;
  if (span === 0) {
    return { step: 0, niceMin: min, niceMax: max, count: 0 };
  }
  // raw step
  const rawStep = span / targetCount;
  // magnitude = 10^floor(log10(rawStep))
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / mag;

  // pick nice fraction 1, 2, or 5 (or 10)
  let niceFrac;
  if (residual < 1.5)      niceFrac = 1;
  else if (residual < 3)   niceFrac = 2;
  else if (residual < 7)   niceFrac = 5;
  else                      niceFrac = 10;

  const step = niceFrac * mag;
  // expand domain to multiples of step
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const count = Math.round((niceMax - niceMin) / step);

  return { step, niceMin, niceMax, count };
}

// then for your bbox:
const xInfo = niceTicks(bbox.min.x, bbox.max.x, 8);
const yInfo = niceTicks(bbox.min.y, bbox.max.y, 8);
const zInfo = niceTicks(bbox.min.z, bbox.max.z, 8);

// now use xInfo.count, yInfo.count, zInfo.count
const divisions = [ xInfo.count, yInfo.count, zInfo.count ];

function computeTickValues({ niceMin, step, count }) {
  // how many decimal places do we need?
  // e.g. step = 0.01 → decimals = 2; step = 5   → decimals = 0
  const decimals = Math.max( 0, -Math.floor(Math.log10(step)) );

  const ticks = [];
  for (let i = 0; i <= count; i++) {
    let raw = niceMin + step * i;
    // round to exactly `decimals` places
    let rounded = Number(raw.toFixed(decimals));
    // clamp tiny negatives to +0
    if (Math.abs(rounded) < Number.EPSILON) rounded = 0;
    ticks.push(rounded);
  }
  return ticks;
}

const xTicks = computeTickValues(xInfo);
const yTicks = computeTickValues(yInfo);
const zTicks = computeTickValues(zInfo);

let singleSide = true;
if (options.Boxed) singleSide = false;



const tickHelperIZ = createATicks(
  bbox.max.x - bbox.min.x,
  bbox.max.y - bbox.min.y,
  divisions[2],
  false,
  singleSide
);

tickHelperIZ.position.set(
  (bbox.max.x + bbox.min.x) / 2,
  (bbox.max.y + bbox.min.y) / 2,
  bbox.max.z
);
tickHelperIZ.layers.set(14);
group.add(tickHelperIZ);

const tickHelperY = createATicks(
  bbox.max.x - bbox.min.x,
  bbox.max.z - bbox.min.z,
  divisions[1],
  singleSide,
  singleSide
);
tickHelperY.rotateX(Math.PI / 2);
tickHelperY.position.set(
  (bbox.max.x + bbox.min.x) / 2,
  bbox.min.y,
  (bbox.max.z + bbox.min.z) / 2
);
tickHelperY.layers.set(13);
group.add(tickHelperY);

const tickHelperIY = createATicks(
  bbox.max.x - bbox.min.x,
  bbox.max.z - bbox.min.z,
  divisions[1],
  singleSide,
  singleSide
);
tickHelperIY.rotateX(Math.PI / 2);
tickHelperIY.position.set(
  (bbox.max.x + bbox.min.x) / 2,
  bbox.max.y,
  (bbox.max.z + bbox.min.z) / 2
);
tickHelperIY.layers.set(12);
group.add(tickHelperIY);

const tickHelperX = createATicks(
  bbox.max.y - bbox.min.y,
  bbox.max.z - bbox.min.z,
  divisions[0],
  singleSide,
  singleSide
);
tickHelperX.rotateY(Math.PI / 2);
tickHelperX.rotateZ(Math.PI / 2);
tickHelperX.position.set(
  bbox.max.x,
  (bbox.max.y + bbox.min.y) / 2,
  (bbox.max.z + bbox.min.z) / 2
);
tickHelperX.layers.set(11);
group.add(tickHelperX);

const tickHelperIX = createATicks(
  bbox.max.y - bbox.min.y,
  bbox.max.z - bbox.min.z,
  divisions[0],
  singleSide,
  singleSide
);
tickHelperIX.rotateY(Math.PI / 2);
tickHelperIX.rotateZ(Math.PI / 2);
tickHelperIX.position.set(
  bbox.min.x,
  (bbox.max.y + bbox.min.y) / 2,
  (bbox.max.z + bbox.min.z) / 2
);
tickHelperIX.layers.set(10);
group.add(tickHelperIX);

const bboxCopy = {...bbox};

const margin = {
  x: 0.12 * (bbox.max.x - bbox.min.x),
  y: 0.12 * (bbox.max.y - bbox.min.y) ,
  z: 0.12 * (bbox.max.z - bbox.min.z) 
};

zTicks.slice(1, -1).forEach(zVal => {
  const span = document.createElement('span');
  span.className = 'g3d-label opacity-0';
  span.textContent = String(zVal);

  const labelObj = new CSS2D.CSS2DObject(span);
  // position on Z; X/Y zero because your group is already aligned
  labelObj.position.set(0, 0, zVal);
  labelObj.offset = [-0.7*margin.x,0.7*margin.y,0];
  group.add(labelObj);
  ticksLabels.z.push(labelObj);
});

// X‐axis labels
xTicks.slice(1, -1).forEach(xVal => {
  const span = document.createElement('span');
  span.className = 'g3d-label opacity-0';
  span.textContent = String(xVal);

  const labelObj = new CSS2D.CSS2DObject(span);
  // Y/Z zero, X at tick
  labelObj.position.set(xVal, 0, 0);
  labelObj.offset = [0,margin.y,0];
  group.add(labelObj);
  ticksLabels.x.push(labelObj);
});

// Y‐axis labels
yTicks.slice(1, -1).forEach(yVal => {
  const span = document.createElement('span');
  span.className = 'g3d-label opacity-0';
  span.textContent = String(yVal);

  const labelObj = new CSS2D.CSS2DObject(span);
  // X/Z zero, Y at tick
  labelObj.position.set(0, yVal, 0);
  labelObj.offset = [margin.x,0,0];
  group.add(labelObj);
  ticksLabels.y.push(labelObj);
}); 

    if (options.PlotLabel) {
      let labelFallback = false;

      if (Array.isArray(options.PlotLabel)) {
        if (options.PlotLabel[0][0] == "HoldForm") labelFallback = true;
      }
      if (!labelFallback) {
        try {
          const label = await interpretate(options.PlotLabel, {...env, context: g3d});
          if (label) {
            const element = document.createElement('div');
            element.innerHTML = latexLikeToHTML(String(label));
            element.style = `
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              text-align: center;
              font-size: small;
            `;
            element.className = 'g3d-label';
            container.appendChild(element);
          }
        } catch(err) {
          labelFallback = true;
        }
      }

      if (labelFallback) {
        console.warn('Non textural PlotLabel!');
        console.warn('Convert to text');

        const element = document.createElement('div');
        element.style = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          text-align: center;
          font-size: small;
        `;
        element.className = 'g3d-label';
        container.appendChild(element);      
        
        await makeEditorView(options.PlotLabel, {...env, element:element});
      }
    }

    if (options.AxesLabel) {
      options.AxesLabel = await interpretate(options.AxesLabel, {...env, context: g3d, hold:true});
      

      if (options?.AxesLabel?.length == 3) {
        if (options.AxesLabel[0]) {
          let ref = options.AxesLabel[0];

          let {offset, element} = await processLabel(ref, env);


          element.position.copy( new THREE.Vector3((bbox.min.x + bbox.max.x)/2.0 + offset[0], bbox.min.y + 1.0, bbox.min.z + offset[2])  );
          group.add(element);
          element.offset = [0, 3*(bbox.max.y - bbox.min.y)/divisions[1] + offset[1], 0];
          element.onlyVisible = true;
          ticksLabels.x.push(element);
        }

        if (options.AxesLabel[1]) {
          let ref = options.AxesLabel[1];
          let {offset, element} = await processLabel(ref, env);

          element.position.copy( new THREE.Vector3(bbox.min.x + 1.0, (bbox.min.y + bbox.max.y)/2.0 + offset[1], bbox.min.z + offset[2])  );
          group.add(element);
          element.offset = [3*(bbox.max.x - bbox.min.x)/divisions[0] + offset[0], 0, 0];
          element.onlyVisible = true;
          ticksLabels.y.push(element);
        }      

        if (options.AxesLabel[2]) {
          let ref = options.AxesLabel[2];
          let {offset, element} = await processLabel(ref, env);

          element.position.copy( new THREE.Vector3(bbox.min.x - 1.0, bbox.min.y + 1.0, (bbox.min.z + bbox.max.z)/2.0) + offset[2]  );
          group.add(element);
          element.offset = [-3*(bbox.max.x - bbox.min.x)/divisions[0] / 1.4 + offset[0], 3*(bbox.max.x - bbox.min.x)/divisions[0] / 1.4 + offset[1], 0];
          element.onlyVisible = true;
          ticksLabels.z.push(element);
        }  

      }
    }

    let gridHState = 0;
    let gridVState = 0;

function isOverlapping(elm1, elm2, tolerance = 0) {
  // grab their bounding boxes (includes all CSS transforms)
  const r1 = elm1 instanceof DOMRect ? elm1 : elm1.getBoundingClientRect();
  const r2 = elm2 instanceof DOMRect ? elm2 : elm2.getBoundingClientRect();

  // if one is entirely to the left, right, above or below the other, they do NOT overlap:
  if (r1.right  < r2.left  + tolerance) return false;
  if (r1.left   > r2.right - tolerance) return false;
  if (r1.bottom < r2.top   + tolerance) return false;
  if (r1.top    > r2.bottom- tolerance) return false;

  // otherwise there's some overlap
  return true;
}

function checkOverlap(elm1, elm2) {
  const rect1 = elm1.getBoundingClientRect();
  const rect2 = elm2.getBoundingClientRect();
  const offset = -1.0;



  return isOverlapping(rect1, rect2, 2)
}

function hideShowOverlapping(arr, onlyHide = false) {
  if (arr.length < 2) return;

  // determine orientation by comparing first→last horizontal vs vertical span
  const r0 = arr[0].element.getBoundingClientRect();
  const rN = arr[arr.length - 1].element.getBoundingClientRect();
  const vertical = Math.abs(r0.left - rN.left) < Math.abs(r0.top - rN.top);

  // start by showing every tick (step = 1)
  let step = 1;
  let widened;

  do {
    widened = false;

    // find the first j>=1 such that arr[0] overlaps arr[j*step]
    // these would be the first two *shown* ticks if step were fixed
    for (let j = 1; j * step < arr.length; j++) {
      if (checkOverlap(arr[0].element, arr[j * step].element, vertical)) {
        // they overlap → we need to widen spacing by a factor (j+1)
        step = step * (j + 1);
        widened = true;
        break;
      }
    }
    // repeat until no overlap at j=1
  } while (widened);

  // finally, hide any tick whose index is *not* a multiple of step
  arr.forEach((item, i) => {
    const keep = (i % step === 0);
    if (keep) {
      if (!onlyHide) item.element.classList.remove('opacity-0');
    } else {
      if (!item.onlyVisible) item.element.classList.add('opacity-0');
    }
  });
}


    let time = performance.now() - 500;

    const calcGrid = (ev) => {
      if (noGrid) return;
      if (performance.now() - time < 100) return;

      time = performance.now();
      const amp = 1.0;
      const ampZ = 1.0;

      const azimuth = controls.getAzimuthalAngle();
      const vertical = controls.getPolarAngle();

      orthoCamera.layers.disable(10);
      orthoCamera.layers.disable(11);
      orthoCamera.layers.disable(12);
      orthoCamera.layers.disable(13);
      orthoCamera.layers.disable(14);
      orthoCamera.layers.disable(15);

      //if (azimuth < 1.57 + 0.78 && azimuth > 1.57 - 0.78 ) 
      if (azimuth < 1.57  && azimuth > 0 && gridHState != 1) {
          orthoCamera.layers.enable(13);
          orthoCamera.layers.enable(11);
          ticksLabels.z.forEach((e) => 
            e.position.copy( new THREE.Vector3(bboxCopy.min.x * ampZ + e.offset[0], bboxCopy.min.y * ampZ - e.offset[1], e.position.z) )
          );

          ticksLabels.x.forEach((e) => 
            e.position.copy( new THREE.Vector3(e.position.x - e.offset[0], bboxCopy.min.y * amp - e.offset[1], bboxCopy.min.z * amp + e.offset[2]) )
          );

          ticksLabels.y.forEach((e) => 
            e.position.copy( new THREE.Vector3(bboxCopy.max.x * amp + e.offset[0], e.position.y, bboxCopy.min.z * amp) )
          ); 

         

          //console.error('Trigger!');

          //gridHState = 1;
      }

      if (azimuth < 1.57+1.57  && azimuth > 1.57 && gridHState != 2) {
        orthoCamera.layers.enable(11);
        orthoCamera.layers.enable(12);

        ticksLabels.z.forEach((e) => 
          e.position.copy( new THREE.Vector3(bboxCopy.max.x * ampZ - e.offset[0], bboxCopy.min.y * ampZ - e.offset[1], e.position.z) )
        );

        ticksLabels.y.forEach((e) => 
          e.position.copy( new THREE.Vector3(bboxCopy.max.x * amp + e.offset[0], e.position.y, bboxCopy.min.z * amp) )
        ); 

        ticksLabels.x.forEach((e) => 
          e.position.copy( new THREE.Vector3(e.position.x + e.offset[0], bboxCopy.max.y * amp + e.offset[1] ,bboxCopy.min.z * amp + e.offset[2]) )
        );

       

        //gridHState = 2;
      }

      if (azimuth < 0  && azimuth > -1.57  && gridHState !=3) {
        orthoCamera.layers.enable(13);
        orthoCamera.layers.enable(10);

        ticksLabels.z.forEach((e) => 
          e.position.copy( new THREE.Vector3(bboxCopy.min.x * ampZ + e.offset[0],bboxCopy.max.y * ampZ + e.offset[1], e.position.z) )
        );

        ticksLabels.x.forEach((e) => 
          e.position.copy( new THREE.Vector3(e.position.x+ e.offset[0], bboxCopy.min.y * amp - e.offset[1], bboxCopy.min.z * amp + e.offset[2]) )
        );

        ticksLabels.y.forEach((e) => 
          e.position.copy( new THREE.Vector3(bboxCopy.min.x* amp - e.offset[0], e.position.y, bboxCopy.min.z * amp) )
        );        
        //gridHState = 3;

        
        
      }

      if (azimuth < -1.57  && azimuth > -2*1.57 && gridHState != 4) {
        orthoCamera.layers.enable(10);
        orthoCamera.layers.enable(12);

        ticksLabels.z.forEach((e) => 
          e.position.copy( new THREE.Vector3(bboxCopy.max.x* ampZ - e.offset[0],bboxCopy.max.y* ampZ + e.offset[1], e.position.z) )
        );

        ticksLabels.x.forEach((e) => 
          e.position.copy( new THREE.Vector3(e.position.x, bboxCopy.max.y * amp + e.offset[1], bboxCopy.min.z * amp) )
        );

        ticksLabels.y.forEach((e) => 
          e.position.copy( new THREE.Vector3(bboxCopy.min.x * amp - e.offset[0], e.position.y, bboxCopy.min.z * amp) )
        ); 

        
        
        //gridHState = 4;
      }

      if (vertical > 1.57 && gridVState != 1) {
        orthoCamera.layers.enable(14);
        ticksLabels.x.forEach((e) => 
          e.position.copy( new THREE.Vector3(e.position.x, e.position.y, bboxCopy.max.z * amp) )
        );

        ticksLabels.y.forEach((e) => 
          e.position.copy( new THREE.Vector3(e.position.x, e.position.y, bboxCopy.max.z * amp) )
        ); 
        //gridVState = 1;
      } 
      
      if (vertical < 1.57 && gridVState != 2) {
        orthoCamera.layers.enable(15);
        ticksLabels.x.forEach((e) => 
          e.position.copy( new THREE.Vector3(e.position.x, e.position.y, bboxCopy.min.z * amp) )
        );

        ticksLabels.y.forEach((e) => 
          e.position.copy( new THREE.Vector3(e.position.x, e.position.y, bboxCopy.min.z * amp) )
        );         
        //gridVState = 2;
      }

      hideShowOverlapping(ticksLabels.x);
      hideShowOverlapping(ticksLabels.y);
      hideShowOverlapping(ticksLabels.z);

     // hideShowOverlapping([ticksLabels.x[0], ticksLabels.x[ticksLabels.x.length-1], ticksLabels.y[0], ticksLabels.y[ticksLabels.y.length-1]], true);

      //if (azimuth < 0.78 - 1.57  && azimuth > - 0.78 - 1.57 ) orthoCamera.layers.enable(11);
      //if (azimuth < 0.78 - 2*1.57  && azimuth > - 0.78 + 2*1.57 ) orthoCamera.layers.enable(13);
    };

    if (!noGrid) setTimeout(calcGrid, 100);

    controls.addEventListener('end', calcGrid);

    //if (!noGrid) {
      gui?.add({'Grid': !noGrid}, 'Grid').name('Grid').listen().onChange( (value) => {
        if (!value) { 
          orthoCamera.layers.disable(10);
          orthoCamera.layers.disable(11);
          orthoCamera.layers.disable(12);
          orthoCamera.layers.disable(13);
          orthoCamera.layers.disable(14);
          orthoCamera.layers.disable(15);

          //ticksLabels.x.forEach((el) => el.element.classList.add('opacity-0'));
          //ticksLabels.y.forEach((el) => el.element.classList.add('opacity-0'));
          //ticksLabels.z.forEach((el) => el.element.classList.add('opacity-0'));

          noGrid = true;
        } else {
          noGrid = false;
          calcGrid();
        }
      })
    //}
  }
}

//console.error(bbox);
group.position.set(-(bbox.min.x + bbox.max.x) / 2, -(bbox.min.y + bbox.max.y) / 2, -(bbox.min.z + bbox.max.z) / 2);
//throw 'fuk';
if (options.Boxed) {
  const boxLine = [
    [[bbox.min.x, bbox.min.y, bbox.min.z], [bbox.max.x, bbox.min.y, bbox.min.z], [bbox.max.x, bbox.max.y, bbox.min.z], [bbox.min.x, bbox.max.y, bbox.min.z], [bbox.min.x, bbox.min.y, bbox.min.z]],
    [[bbox.min.x, bbox.min.y, bbox.max.z], [bbox.max.x, bbox.min.y, bbox.max.z], [bbox.max.x, bbox.max.y, bbox.max.z], [bbox.min.x, bbox.max.y, bbox.max.z], [bbox.min.x, bbox.min.y, bbox.max.z]],
    [[bbox.min.x, bbox.min.y, bbox.min.z], [bbox.min.x, bbox.min.y, bbox.max.z]],
    [[bbox.max.x, bbox.min.y, bbox.min.z], [bbox.max.x, bbox.min.y, bbox.max.z]],
    [[bbox.max.x, bbox.max.y, bbox.min.z], [bbox.max.x, bbox.max.y, bbox.max.z]],
    [[bbox.min.x, bbox.max.y, bbox.min.z], [bbox.min.x, bbox.max.y, bbox.max.z]]
  ];

  for (const l of boxLine) {
    await interpretate(['Line', ['JSObject', l]], {...envcopy});
  };
}

if (options.Axes) {
  const length = Math.abs(Math.min(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z));
  const axesHelper = new THREE.AxesHelper( length/2.0 );
  axesHelper.position.set((bbox.max.x + bbox.min.x)/2.0, (bbox.max.y + bbox.min.y)/2.0, (bbox.max.z + bbox.min.z)/2.0);
  //axesHelper.rotateX(Math.Pi /2.0);
  group.add( axesHelper );
}

group.applyMatrix4(new THREE.Matrix4().set( 
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, -1, 0, 0,
  0, 0, 0, 1));

  let size = [bbox.max.x - bbox.min.x, bbox.max.z - bbox.min.z, bbox.max.y - bbox.min.y];
  let max = Math.max(...size);
  const maxSize = Math.max(...size);

if ('BoxRatios' in options) {

  const reciprocal = size.map((e) => 1.0/(e/max));

  console.warn('Rescaling....');

  let ratios = await interpretate(options.BoxRatios, env);
  ratios = [ratios[0], ratios[2], ratios[1]];

  max = Math.max(...ratios);
  ratios = ratios.map((e, index) => reciprocal[index] * e/max);

  
  console.log(max);
  if (maxSize > 80) {
    console.warn('Model is too large!');
    ratios = ratios.map((e) => (e / maxSize) * 10.0);
  }

  group.applyMatrix4(new THREE.Matrix4().makeScale(...ratios));
} else {
  let ratios = [1,1,1];
  if (maxSize > 80) {
    console.warn('Model is too large!');
    ratios = ratios.map((e) => (e / maxSize) * 10.0);
  }

  group.applyMatrix4(new THREE.Matrix4().makeScale(...ratios));
}

group.position.add(new THREE.Vector3(0,1,0));

scene.add(group);
//recalculate
bbox = new THREE.Box3().setFromObject(group);
//const sbox = new THREE.Box3().setFromObject(scene);
//console.log(bbox);

if (envcopy.camera.isOrthographicCamera) {
  console.warn('fitting camera...');
  const camera = envcopy.camera;

  console.log(bbox);
  const center = [bbox.max.x + bbox.min.x, bbox.max.y + bbox.min.y, bbox.max.z + bbox.min.z].map((e) => -e/2);
  const maxL = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
  console.log(maxL);
  console.log(center);
  //console.log(sbox);
  /*let scale = 2.99 / maxL;
  if (scale > 0.9) scale = 1;

  //scale = 1;
  
  scene.applyMatrix4((new THREE.Matrix4()).compose(new THREE.Vector3(0,center[1],0), new THREE.Quaternion(), new THREE.Vector3(1,1,1)));
  scene.applyMatrix4((new THREE.Matrix4()).compose(new THREE.Vector3(0,1,0), new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale)));
  //scene.applyMatrix4((new THREE.Matrix4()).compose(new THREE.Vector3(-center[0] * scale, -center[1] * scale, -center[2] * scale), new THREE.Quaternion(), new THREE.Vector3(1,1,1)));
  //scene.position.set(...center);
  //scene.scale.set(scale, scale, scale);
  //scene.position.set(...(center.map((e) => -e)));
  */

  camera.zoom = Math.min(orthoWidth / (bbox.max.x - bbox.min.x),
  orthoHeight / (bbox.max.y - bbox.min.y)) * 0.55 ;

  if (options.OrthographicCameraZoom) {
    camera.zoom = await interpretate(options.OrthographicCameraZoom, env);
  }

  camera.updateProjectionMatrix();
}


//console.error(new THREE.Box3().setFromObject(scene));

scene.updateMatrixWorld();

//console.error(new THREE.Box3().setFromObject(scene));



//add some lighting
if (noLighting) {
  //if ((await interpretate(options.Lighting, env)) === 'None')
  if (options.Background && PathRendering) {
    if (options.Background.isColor) {
      params.environmentIntensity = 0.0;
      const texture = new RTX.GradientEquirectTexture();
      texture.topColor.set( 0xffffff );
      texture.bottomColor.set( 0x666666 );
      texture.update();
      scene.defaultEnvTexture = texture;
      scene.environment = texture;
      scene.background = texture;
    }
  } else if (options.Background) {
    if (options.Background.isColor) {
      scene.background = options.Background;
    }
  }
} else {
  addDefaultLighting(scene, RTX, PathRendering);
}

if (options.Background && !PathRendering) {
  if (options.Background.isColor) {
    scene.background = options.Background;
  }
}

if (PathRendering) {
  ptRenderer.updateLights();
  envMapGenerator = new RTX.BlurredEnvMapGenerator( renderer ); 
}

let envMapPromise;

if ('Lightmap' in options) {
  const url = await interpretate(options.Lightmap, env);
  params.backgroundAlpha = 1.0;

  envMapPromise = new RGBELoader().setDataType( THREE.FloatType )
  .loadAsync(url)
  .then( texture => {

    if (PathRendering) {
      envMap = texture;
      updateEnvBlur();
    }

    if (PathRendering) return;

    const localEnv = pmremGenerator.fromEquirectangular( texture ).texture;

    scene.environment = localEnv;

    scene.background = localEnv;

    texture.dispose();
    pmremGenerator.dispose();

  } );
} 

if ('BackgroundAlpha' in options) {
  params.backgroundAlpha = await interpretate(options.BackgroundAlpha, env);
  if (params.backgroundAlpha < 1.0) {
    scene.background = null;
  }
}

  if (!PathRendering) {
    var pmremGenerator = new THREE.PMREMGenerator( renderer );
    pmremGenerator.compileEquirectangularShader();
  }

  if (PathRendering) {


    scene.environmentIntensity = params.environmentIntensity;
	  scene.backgroundIntensity = params.environmentIntensity;
    scene.backgroundAlpha = params.backgroundAlpha;

    if (params.backgroundAlpha < 1.0) {
      scene.background = null;
    }

    ptRenderer.setScene( scene, activeCamera ); 
    ptRenderer.updateEnvironment();
    ptRenderer.updateLights();
    /*var generator = new RTX.PathTracingSceneGenerator( scene );
    var sceneInfo = generator.generate( scene );
    var { bvh, textures, materials } = sceneInfo;

    var geometry = bvh.geometry;
    var material = ptRenderer.material;

    material.bvh.updateFrom( bvh );
    material.attributesArray.updateFrom(
      geometry.attributes.normal,
      geometry.attributes.tangent,
      geometry.attributes.uv,
      geometry.attributes.color,
    );

  material.materialIndexAttribute.updateFrom( geometry.attributes.materialIndex );
  material.textures.setTextures( renderer, 2048, 2048, textures );
  material.materials.updateFrom( materials, textures );*/
}

if ('Lightmap' in options)
  await Promise.all( [ envMapPromise ] );    






function onResize() {

  const w = ImageSize[0];
  const h = ImageSize[1];
  const scale = params.resolutionScale;
  const dpr = window.devicePixelRatio;

  if (PathRendering) {
    //ptRenderer.setSize( w * scale * dpr, h * scale * dpr );
    ptRenderer.reset();
  }

  renderer.setSize( w, h );
  renderer.setPixelRatio( window.devicePixelRatio * scale );

  const aspect = w / h;
  
  perspectiveCamera.aspect = aspect;
  perspectiveCamera.updateProjectionMatrix();

  const orthoHeight = orthoWidth / aspect;
  orthoCamera.top = orthoHeight / 2;
  orthoCamera.bottom = orthoHeight / - 2;
  orthoCamera.updateProjectionMatrix();

}

function reset() {
  if (PathRendering)
    ptRenderer.reset();
}

function updateEnvBlur() {


const generator = new RTX.BlurredEnvMapGenerator( renderer );
const blurredEnvMap = generator.generate( envMap, 0.35 );
scene.background = blurredEnvMap;
	scene.environment = blurredEnvMap;
  scene.environmentIntensity = params.environmentIntensity;
	  scene.backgroundIntensity = params.environmentIntensity;
    scene.backgroundAlpha = params.backgroundAlpha;

    if ( params.backgroundAlpha < 1.0 ) {

      scene.background = null;
  
    }
  generator.dispose();
  ptRenderer.updateEnvironment();

}

function updateCamera( cameraProjection ) {

  if ( cameraProjection === 'Perspective' ) {

    if ( activeCamera ) {

      perspectiveCamera.position.copy( activeCamera.position );
      perspectiveCamera.zoom = activeCamera.zoom;
    }

    activeCamera = perspectiveCamera;

  } else if ( cameraProjection === 'Orthographic' ) {

    if ( activeCamera ) {

      orthoCamera.position.copy( activeCamera.position );
      orthoCamera.zoom = activeCamera.zoom;
    }

    activeCamera = orthoCamera;

  } 

  controls.object = activeCamera;
  if (PathRendering)
    ptRenderer.camera = activeCamera;

  controls.update();

  env.local.camera   = activeCamera;
  envcopy.camera   = activeCamera;



  reset();

}

let animate;

animate = () => {
  animateOnce();

  if (performance.now() - timeStamp > params.sleepAfter && !params.runInfinitely) {
    sleeping = true;
    console.warn('g3d >> Sleeping...');
  } else {
    env.local.aid = requestAnimationFrame( animate );
  }

}  


function updateSettings() {
  wakeFunction();

  if (PathRendering) {
    //ptRenderer.renderSample();
    ptRenderer.bounces = params.bounces;
    scene.environmentIntensity = params.environmentIntensity;
	  scene.backgroundIntensity = params.environmentIntensity;
    scene.backgroundAlpha = params.backgroundAlpha;
  }

  activeCamera.updateMatrixWorld();

  if ( params.backgroundAlpha < 1.0 ) {

    scene.background = null;

  } else {

    scene.background = scene.environment;

  }
}

env.local.updateLightingNext = false;
env.local.updateSceneNext = false;

function animateOnce() {
  
  if (PathRendering) {
    //activeCamera.updateMatrixWorld();
    if (env.local.updateSceneNext) {
      //console.warn('set scene');
      ptRenderer.setScene(scene, activeCamera);
      env.local.updateSceneNext = false;
    }    
    if (env.local.updateLightingNext) {
      ptRenderer.updateLights();
      env.local.updateLightingNext = false;
    }
    
    if (params.samplesPerFrame > 1) {
      for (let j=0; j<params.samplesPerFrame; ++j) {
        ptRenderer.renderSample();
      }
    } else {
      //console.warn('render scene');
      ptRenderer.renderSample();
    }
    
    labelRenderer.render(scene, activeCamera);
  } else {
    renderer.render( scene, activeCamera );
    labelRenderer.render(scene, activeCamera);
  }

  for (let i=0; i<Handlers.length; ++i) {
    //if (Handlers[i].sleep) continue;
    Handlers[i].eval();
  }

  //added loop-handlers, void
  env.local.handlers.forEach((f)=>{
    f();
  });    
  /**/

  //env.wake();

  //samplesEl.innerText = `Samples: ${ Math.floor( ptRenderer.samples ) }`;

}


onResize();

updateCamera( params.cameraProjection );

if (PathRendering) {
  scene.backgroundAlpha = params.backgroundAlpha;

  const ptFolder = gui?.addFolder( 'Path Tracing' );

ptFolder?.add( params, 'runInfinitely');  


ptFolder?.add( params, 'samplesPerFrame', 1, 50, 1 );

ptFolder?.add( params, 'multipleImportanceSampling').onChange(() => {

  ptRenderer.multipleImportanceSampling = params.multipleImportanceSampling;
  ptRenderer.updateLights();
  ptRenderer.updateMaterials();

}); 


//const evFolder = gui.addFolder( 'Environment' );

ptFolder?.add( params, 'environmentIntensity', 0, 3, 0.1).onChange( () => {

  ptRenderer.reset();
  updateSettings();
  ptRenderer.updateEnvironment();

} ); 

ptFolder?.add( params, 'backgroundAlpha', 0, 1, 0.1).onChange( () => {

  ptRenderer.reset();
  updateSettings();
  ptRenderer.updateEnvironment();

} ); 



/*evFolder.addColor( params, 'topColor').onChange( () => {

  if (scene.defaultEnvTexture) {
    scene.defaultEnvTexture.topColor.set( params.topColor );
    scene.defaultEnvTexture.update();
    
    //ptRenderer.setScene(scene, activeCamera);
    ptRenderer.updateEnvironment();
  }

} ); 

evFolder.addColor( params, 'bottomColor').onChange( () => {

  if (scene.defaultEnvTexture) {
    scene.defaultEnvTexture.bottomColor.set( params.bottomColor );
    scene.defaultEnvTexture.update();
    
    //ptRenderer.setScene(scene, activeCamera);
    ptRenderer.updateEnvironment();
  }

} );*/

//evFolder.close();  


ptFolder?.add( params, 'bounces', 1, 30, 1 ).onChange( () => {

  ptRenderer.reset();
  updateSettings();

} );

}

const cameraFolder = gui?.addFolder( 'Camera' );
cameraFolder?.add( params, 'sleepAfter', 1000, 30000, 10 );
cameraFolder?.add( params, 'cameraProjection', [ 'Perspective', 'Orthographic' ] ).onChange( v => {

  updateCamera( v );
  updateSettings();

} );

cameraFolder?.add( params, 'acesToneMapping' ).onChange( value => {

  renderer.toneMapping = value ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  updateSettings();

} );

cameraFolder?.close();  

animate();

return env;
}

core.Graphics3D.destroy = (args, env) => {
  console.log('Graphics3D was removed');
  env.local.wakeThreadUp = () => {};
  env.local.controlObject.dispose();
  cancelAnimationFrame(env.local.aid);
  env.local.renderer.dispose();
  env.local.renderer.forceContextLoss()

  if (env.local.labelContainer) env.local.labelContainer.remove();
  if (env.local.guiContainer) env.local.guiContainer.remove();
  env.local.rendererContainer.remove();
}

core.Graphics3D.virtual = true

const numericAccelerator = {};
  numericAccelerator.TypeReal    = {}
  numericAccelerator.TypeInteger = {}

  const types = {
    Real64: {
      context: numericAccelerator.TypeReal,
      constructor: Float64Array
    },
    Real32: {
      context: numericAccelerator.TypeReal,
      constructor: Float32Array
    },
    Integer32: {
      context: numericAccelerator.TypeInteger,
      constructor: Int32Array
    },
    Integer64: {
      context: numericAccelerator.TypeInteger,
      constructor: BigInt64Array
    },
    Integer16: {
      context: numericAccelerator.TypeInteger,
      constructor: Int16Array
    },   
    Integer8: {
      context: numericAccelerator.TypeInteger,
      constructor: Int8Array
    },  
    UnsignedInteger32: {
      context: numericAccelerator.TypeInteger,
      constructor: Uint32Array
    },
    UnsignedInteger64: {
      context: numericAccelerator.TypeInteger,
      constructor: BigUint64Array      
    },
    UnsignedInteger16: {
      context: numericAccelerator.TypeInteger,
      constructor: Uint16Array      
    },   
    UnsignedInteger8: {
      context: numericAccelerator.TypeInteger,
      constructor: Uint8Array      
    }
  }

  function checkdims(array, size = []) {
    if (Array.isArray(array)) {
      size.push(array.length);
      return checkdims(array[0], size);
    }
    return size;
  }

  const WLNumber = new RegExp(/^(-?\d+)(.?\d*)(\*\^)?(\d*)/);
  const isInteger = window.isNumeric;

  function readArray(arr, env) {
    if (Array.isArray(arr[1])) {
      for (let i=1; i<arr.length; ++i) {
        readArray(arr[i], env)
      }

      return;
    }

    env.array.set(arr.slice(1).map((el) => {
      if (typeof el == 'string') {
        if (isInteger(el)) return parseInt(el); //for Integers
  
        if (WLNumber.test(el)) {
          //deconstruct the string
          let [begin, floatString, digits, man, power] = el.split(WLNumber);
        
          if (digits === '.')
            floatString += digits + '0';
          else
            floatString += digits;
        
          if (man)
            floatString += 'E' + power;
  
        
          return parseFloat(floatString);
        }
      }

      return el;
    }), env.index);
    env.index += arr.length - 1;
  }

  numericAccelerator.NumericArray = (args, env) => {
    //console.log(args);
    const type = types[interpretate(args[1])];
    //console.log('ACCELERATOR!');
    
    
    const dims = [];
    let size = (args[0].length - 1);
    dims.push(size);

    if (args[0][1][0] === 'List') {
      size = size * (args[0][1].length - 1);
      dims.push((args[0][1].length - 1));

      if (args[0][1][1][0] === 'List') {
        size = size * (args[0][1][1].length - 1);
        dims.push((args[0][1][1].length - 1));
      }
    }

    //const time = performance.now();
    //const benchmark = [];
    
    const array = new type.constructor(size);
    //benchmark.push(performance.now() - time);
    readArray(args[0], {index: 0, array: array});
    //benchmark.push(performance.now() - time);
    
    //benchmark.push(performance.now() - time);
    //console.warn(benchmark);
    return {buffer: array, dims: dims};
  }

numericAccelerator.NumericArray.update = numericAccelerator.NumericArray;

 
const imageTypes = {
  Real32: {
    constructor: Float32Array,
    convert: (array) => {
    
        const size = array.dims[0] * array.dims[1] * array.dims[2];
        const src = array.buffer;
        const data = new Uint8ClampedArray(size);
        let i;
        for (i = 0; i < size; i++) {
          const g = (src[i]*255) >>> 0;
          data[i] = g;
        } 
        return data;          

      console.error('This is not an image data!');
      throw array;
  }
  },

  Byte: {
    constructor: Uint8ClampedArray,
    convert: (array) => {
        return array.buffer;
  }
  }  
}

let chroma;

/**
 * Martin Röhlig
 * 3D volume rendering with WebGL / Three.js (exercise)
 * https://observablehq.com/@mroehlig/3d-volume-rendering-with-webgl-three-js
 */

const image3DVertexShader = `
in vec3 position;

// Uniforms.
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;

// Output.
out vec3 vOrigin; // Output ray origin.
out vec3 vDirection;  // Output ray direction.

void main() {
  // Compute the ray origin in model space.
  vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  // Compute ray direction in model space.
  vDirection = position - vOrigin;

  // Compute vertex position in clip space.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const image3DFragmentShader = `
precision highp sampler3D; // Precision for 3D texture sampling.
precision highp float; // Precision for floating point numbers.

uniform sampler3D dataTexture; // Sampler for the volume data texture.
uniform sampler2D colorTexture; // Sampler for the color palette texture.
uniform float samplingRate; // The sampling rate.
uniform float threshold; // Threshold to use for isosurface-style rendering.
uniform float alphaScale; // Scaling of the color alpha value.
uniform bool invertColor; // Option to invert the color palette.

in vec3 vOrigin; // The interpolated ray origin from the vertex shader.
in vec3 vDirection; // The interpolated ray direction from the vertex shader.

out vec4 frag_color; // Output fragment color.

// Sampling of the volume data texture.
float sampleData(vec3 coord) {
  return texture(dataTexture, coord).x;
}

// Sampling of the color palette texture.
vec4 sampleColor(float value) {
  // In case the color palette should be inverted, invert the texture coordinate to sample the color texture.
  float x = invertColor ? 1.0 - value : value;
  return texture(colorTexture, vec2(x, 0.5));
}

// Intersection of a ray and an axis-aligned bounding box.
// Returns the intersections as the minimum and maximum distance along the ray direction. 
vec2 intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
  vec3 tMin = (boxMin - rayOrigin) / rayDir;
  vec3 tMax = (boxMax - rayOrigin) / rayDir;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  float tNear = max(max(t1.x, t1.y), t1.z);
  float tFar = min(min(t2.x, t2.y), t2.z);

  return vec2(tNear, tFar);
}

// Volume sampling and composition.
// Note that the code is inserted based on the selected algorithm in the user interface.
vec4 compose(vec4 color, vec3 entryPoint, vec3 rayDir, float samples, float tStart, float tEnd, float tIncr) {
  // Composition of samples using maximum intensity projection.
  // Loop through all samples along the ray.
  float density = 0.0;
  for (float i = 0.0; i < samples; i += 1.0) {
    // Determine the sampling position.
    float t = tStart + tIncr * i; // Current distance along ray.
    vec3 p = entryPoint + rayDir * t; // Current position.

    // Sample the volume data at the current position. 
    float value = sampleData(p);      

    // Keep track of the maximum value.
    if (value > density) {
      // Store the value if it is greater than the previous values.
      density = value;
    }

    // Early exit the loop when the maximum possible value is found or the exit point is reached. 
    if (density >= 1.0 || t > tEnd) {
      break;
    }
  }

  // Convert the found value to a color by sampling the color palette texture.
  color.rgb = sampleColor(density).rgb;
  // Modify the alpha value of the color to make lower values more transparent.
  color.a = alphaScale * (invertColor ? 1.0 - density : density);

  // Return the color for the ray.
  return color;
}

void main() {
  // Determine the intersection of the ray and the box.
  vec3 rayDir = normalize(vDirection);
  vec3 aabbmin = vec3(-0.5);
  vec3 aabbmax = vec3(0.5);
  vec2 intersection = intersectAABB(vOrigin, rayDir, aabbmin, aabbmax);

  // Initialize the fragment color.
  vec4 color = vec4(0.0);

  // Check if the intersection is valid, i.e., if the near distance is smaller than the far distance.
  if (intersection.x <= intersection.y) {
    // Clamp the near intersection distance when the camera is inside the box so we do not start sampling behind the camera.
    intersection.x = max(intersection.x, 0.0);
    // Compute the entry and exit points for the ray.
    vec3 entryPoint = vOrigin + rayDir * intersection.x;
    vec3 exitPoint = vOrigin + rayDir * intersection.y;

    // Determine the sampling rate and step size.
    // Entry Exit Align Corner sampling as described in
    // Volume Raycasting Sampling Revisited by Steneteg et al. 2019
    vec3 dimensions = vec3(textureSize(dataTexture, 0));
    vec3 entryToExit = exitPoint - entryPoint;
    float samples = ceil(samplingRate * length(entryToExit * (dimensions - vec3(1.0))));
    float tEnd = length(entryToExit);
    float tIncr = tEnd / samples;
    float tStart = 0.5 * tIncr;

    // Determine the entry point in texture space to simplify texture sampling.
    vec3 texEntry = (entryPoint - aabbmin) / (aabbmax - aabbmin);

    // Sample the volume along the ray and convert samples to color.
    color = compose(color, texEntry, rayDir, samples, tStart, tEnd, tIncr);
  }

  // Return the fragment color.
  frag_color = color;
}
`;

const image3DComposeShader = `
vec4 compose(vec4 color, vec3 entryPoint, vec3 rayDir, float samples, float tStart, float tEnd, float tIncr) {
  // Composition of samples using maximum intensity projection.
  // Loop through all samples along the ray.
  float density = 0.0;
  for (float i = 0.0; i < samples; i += 1.0) {
    // Determine the sampling position.
    float t = tStart + tIncr * i; // Current distance along ray.
    vec3 p = entryPoint + rayDir * t; // Current position.

    // Sample the volume data at the current position. 
    float value = sampleData(p);      

    // Keep track of the maximum value.
    if (value > density) {
      // Store the value if it is greater than the previous values.
      density = value;
    }

    // Early exit the loop when the maximum possible value is found or the exit point is reached. 
    if (density >= 1.0 || t > tEnd) {
      break;
    }
  }

  // Convert the found value to a color by sampling the color palette texture.
  color.rgb = sampleColor(density).rgb;
  // Modify the alpha value of the color to make lower values more transparent.
  color.a = alphaScale * (invertColor ? 1.0 - density : density);

  // Return the color for the ray.
  return color;
}
`;

g3d['CoffeeLiqueur`Extensions`Graphics3D`Private`SampledColorFunction'] = async (args, env) => {
  const colors = await interpretate(args[0], env);
  let type = "RGB";
  if (colors[0].length > 3) {
    type = "RGBA";
  }

  return {colors: colors, type: type};
}

core.Image3D = async (args, env) => {

  await interpretate.shared.THREE.load();

  if (!THREE) {
    THREE = interpretate.shared.THREE.THREE;
    OrbitControls = interpretate.shared.THREE.OrbitControls;
    RGBELoader = interpretate.shared.THREE.RGBELoader;
    CSS2D = interpretate.shared.THREE.CSS2D;
    VariableTube = await import('./../libs/tubes/index.js');
    VariableTube = VariableTube.VariableTube;
  }

  if (!GUI) {
    GUI           = (await import('dat.gui')).GUI;  
  }

  const gui = new GUI({ autoPlace: false, name: '...', closed:true });


  if (!chroma) {
    chroma = (await import('chroma-js')).default;
  }

  const options = await core._getRules(args, {...env, context: g3d, hold:true});


  let data = await interpretate(args[0], {...env, context: [numericAccelerator, g3d]});



  let type = 'Real32';

  if (args.length - Object.keys(options).length > 1) {
    type = interpretate(args[1]);
  }

  console.log(args);

  type = imageTypes[type];




  let imageData;

  //if not typed array
  if (Array.isArray(data)) {
    console.warn('Will be slow. Not a typed array');
    data = {buffer: data.flat(Infinity), dims: checkdims(data)};
  }

  imageData = type.convert(data);
  

  console.warn('ImageSize');
  console.warn(data.dims);
  const height = data.dims[2];
  const width  = data.dims[1];
  const depth  = data.dims[0];

  const renderProps = {
    //rotations: Array(1) ["y"]
    speed: 0.0001,
    samplingRate: 1,
    threshold: 0.5054,
    palette: "Greys",
    invertColor: false,
    alphaScale: 1.1916
  };

  if ('SamplingRate' in options) {
    renderProps.samplingRate = await interpretate(options.SamplingRate, env);
  }

  if ('InvertColor' in options) {
    renderProps.invertColor = await interpretate(options.InvertColor, env);
  }

  if ('AlphaScale' in options) {
    renderProps.alphaScale = await interpretate(options.AlphaScale, env);
  }  

  if ('Palette' in options) {
    renderProps.palette = await interpretate(options.Palette, env);
  }   



  const volumeTexture = new THREE.Data3DTexture(
    imageData, // The data values stored in the pixels of the texture.
    height, // Width of texture.
    width, // Height of texture.
    depth // Depth of texture.
  );
  
  volumeTexture.format = THREE.RedFormat; // Our texture has only one channel (red).
  volumeTexture.type = THREE.UnsignedByteType; // The data type is 8 bit unsighed integer.
  volumeTexture.minFilter = THREE.LinearFilter; // Linear filter for minification.
  volumeTexture.magFilter = THREE.LinearFilter; // Linear filter for maximization.

   // Repeat edge values when sampling outside of texture boundaries.
  volumeTexture.wrapS = THREE.ClampToEdgeWrapping;
  volumeTexture.wrapT = THREE.ClampToEdgeWrapping;
  volumeTexture.wrapR = THREE.ClampToEdgeWrapping;  

  volumeTexture.needsUpdate = true;

  env.local.volumeTexture = volumeTexture;

  let colorScale = 'Spectral';

  let colorFunction;

  {
    const scale = chroma.scale(colorScale);

    colorFunction = (i, count) => {
    
      const colorvalue = scale(i / (count - 1.0)).rgb();
      colorvalue.push(255);
      return colorvalue;
    }
  }

  if ('ColorFunction' in options) {
    const c = await interpretate(options.ColorFunction, {...env, context:g3d});
    console.warn(c);
    if (typeof c == 'string') {
      switch(c) {
        case 'XRay':
          renderProps.invertColor = true;
          colorScale = 'Greys';
        break;

        case 'GrayLevelOpacity':
          colorScale = 'Greys';
        break;


      
        case 'Automatic':
        break;

        default:
          colorScale = c;
      }

      const scale = chroma.scale(colorScale);

      colorFunction = (i, count) => {
        
        const colorvalue = scale(i / (count - 1.0)).rgb();
        colorvalue.push(255);
        return colorvalue;
      }

    } else if (c.type) {
      //throw c.colors;
      switch(c.type) {
        case 'RGB':
          colorFunction = (value, count) => {
            
            const colorvalue = c.colors[value].map((cl) => Math.floor(cl*255.0));
            colorvalue.push(255);
            return colorvalue;
          }
        break;

        case 'RGBA':
          colorFunction = (value, count) => {
            //console.log(value);
            return c.colors[value].map((cl) => Math.floor(cl*255.0));
          }
        break;

        default:
          console.error(c);
          throw 'unknown color format';
      }

    }
  }

  // Create an array to hold the color values.
  const count = 256; // Number of colors in texture.
  const colorData = new Uint8Array(count * 4); // 4 = 4 color channels.
  
  // Loop through all pixels and assign color values.
  for (let i = 0; i < count; ++i) {
    let value = count; // Index value between 0 and 1
    let color = colorFunction(i, count);  // Index value to color conversion
    
    const stride = i * 4; // Array index
    colorData[stride] = color[0]; // Red
    colorData[stride + 1] = color[1]; // Green
    colorData[stride + 2] = color[2]; // Blue
    colorData[stride + 3] = color[3]; // Alpha
  }

  //console.warn(colorData);
  // Create texture from color data with width = color count and height = 1.
  const colorTexture = new THREE.DataTexture(colorData, count, 1);
  // Specify the texture format to match the stored data.
  colorTexture.format = THREE.RGBAFormat;
  colorTexture.type = THREE.UnsignedByteType;
  colorTexture.minFilter = THREE.LinearFilter; // Linear interpolation of colors.
  colorTexture.magFilter = THREE.LinearFilter; // Linear interpolation of colors.
  colorTexture.wrapS = THREE.ClampToEdgeWrapping;
  colorTexture.wrapT = THREE.ClampToEdgeWrapping;

  colorTexture.needsUpdate = true;

  env.local.colorTexture = colorTexture;


  const scene = new THREE.Scene();
  // Set the background color of the visualization.

  if ('Background' in options) {
    scene.background = await interpretate(options.Background, {...env, context: g3d});
  }
  


  const geometry = new THREE.BoxGeometry(1, 1, 1);

  // Create a mesh from the geometric description.
  const box = new THREE.Mesh(geometry);
  // Scale the mesh to reflect the aspect ratio of the volume.

  if ('BoxRatios' in options) {

    //const reciprocal = size.map((e) => 1.0/(e/max));
  
    console.warn('Rescaling....');
  
    let ratios = await interpretate(options.BoxRatios, env);
    if (Array.isArray(ratios)) {
      ratios = [-ratios[0], -ratios[1], ratios[2]];

      box.scale.set(...ratios);
    } else {
      box.scale.set(-1,-1,1);
    }
  } else {
    box.scale.set(-1,-1,1);
  }

  box.applyMatrix4(new THREE.Matrix4().set( 
    1, 0, 0, 0,
    0, 0, -1, 0,
    0, 1, 0, 0,
    0, 0, 0, 1));
  
  // Optionally, add an outline to the box.
  /*const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0x999999 })
  );
  box.add(line);*/



  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, // Shader language version.
    uniforms: {
      dataTexture: { value: volumeTexture }, // Volume data texture.
      colorTexture: { value: colorTexture }, // Color palette texture.
      cameraPosition: { value: new THREE.Vector3() }, // Current camera position.
      samplingRate: { value: renderProps.samplingRate }, // Sampling rate of the volume.
      threshold: { value: renderProps.threshold }, // Threshold for adjusting volume rendering.
      alphaScale: { value: renderProps.alphaScale }, // Alpha scale of volume rendering.
      invertColor: { value: renderProps.invertColor } // Invert color palette.
    },
    vertexShader: image3DVertexShader, // Vertex shader code.
    fragmentShader: image3DFragmentShader, // Fragment shader code.
    side: THREE.BackSide, // Render only back-facing triangles of box geometry.
    transparent: true, // Use alpha channel / alpha blending when rendering.
  });  

  env.local.material = material;

  box.material = material;

  

  scene.add(box);

  let ImageSize = [core.DefaultWidth,  core.DefaultWidth];

  if ('ImageSize' in options) {
    const size = await interpretate(options.ImageSize, env);
    if (Array.isArray(size)) {
      ImageSize = size;
    } else if (typeof size == 'number') {
      ImageSize = [size, size];
    }
  }


  

  const fov = 45; // Field of view.
  const aspect = ImageSize[0] / ImageSize[1]; // Aspect ratio of viewport.
  const near = 0.1; // Distance to near clip plane. 
  const far = 1000; // Distance to far clip plane.

  // Create the camera and set its position and orientation.
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(1, 1, -1); // Move to units back from origin in negative z direction. 
  camera.lookAt(new THREE.Vector3(0, 0, 0)); // Orient camera to origin.

  
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  renderer.setSize(ImageSize[0], ImageSize[1]); // Set size of visualization.
  renderer.setPixelRatio(devicePixelRatio); // Handle high resolution displays.

  env.element.appendChild(renderer.domElement);


  renderer.setClearColor( 0x000000, 0 );

  // Optionally, add a border arround the visualization.
  //renderer.domElement.style.border = "1px solid black";

  // Add mouse / touch control for zooming, panning and rotating the camera.
  const controls = new OrbitControls(camera, renderer.domElement);

  let timeout = performance.now();
  let sleeping = false;

  let animationLoop;

  const wakeFunction = () => {
    timeout = performance.now();
    if (sleeping) {
      console.log('wake');
      sleeping = false;
      animationLoop();
    }
  }

  gui.add( renderProps, 'alphaScale', 0., 2.).onChange( () => {
    material.uniforms.alphaScale.value = renderProps.alphaScale;
    wakeFunction();
  
  } );

  gui.add( renderProps, 'samplingRate', 0.1, 4.).onChange( () => {
    material.uniforms.samplingRate.value = renderProps.samplingRate;
    wakeFunction();
  
  } );

  gui.add( renderProps, 'invertColor').onChange( () => {
    material.uniforms.invertColor.value = renderProps.invertColor;
    wakeFunction();
  
  } );

  controls.addEventListener('change', wakeFunction);
  // Add an event listener to the controls to redisplay the visualization on user input.
  //controls.addEventListener("change", () => renderer.render(scene, camera));
  
  animationLoop = () => {
    if (material) {
      box.material.uniforms.cameraPosition.value.copy(camera.position);
    }

    // Re-render the scene with the camera.
    renderer.render(scene, camera);
    if (performance.now() - timeout > 100) {
      console.log('sleep');
      sleeping = true;
    } else {
      env.local.animation = requestAnimationFrame(animationLoop);
    }
  }

  


  const guiContainer = document.createElement('div');
  guiContainer.classList.add('graphics3d-controller');
  guiContainer.appendChild(gui.domElement);
      
  if (ImageSize[0] > 250 && ImageSize[1] > 150)
    env.element.appendChild( guiContainer );
  
  function takeScheenshot() {
    renderer.render(scene, camera);
    renderer.domElement.toBlob(function(blob){
      var a = document.createElement('a');
      var url = URL.createObjectURL(blob);
      a.href = url;
      a.download = 'screenshot.png';
      a.click();
    }, 'image/png', 1.0);
  }
  
  const button = { Save:function(){ takeScheenshot() }};
  gui.add(button, 'Save');  

  
  animationLoop();
}

core.Image3D.virtual = true;

core.Image3D.destroy = (args, env) => {
  console.warn('Dispose');
  cancelAnimationFrame(env.local.animation);
  env.local.material.dispose();
  env.local.colorTexture.dispose();
  env.local.volumeTexture.dispose();
}

g3d.Ball = g3d.Sphere

