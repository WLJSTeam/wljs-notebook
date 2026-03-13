var node = {};

Object.defineProperty(node, "__esModule", {
  value: true
});
var default_1 = node.default = void 0;
const t1 = 6 / 29;
const t2 = 3 * t1 * t1;

const lrgb2rgb = x => Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)) || 0;

const lab2xyz = t => t > t1 ? t * t * t : t2 * (t - 4 / 29);

var _default = ({
  luminance,
  a,
  b
}) => {
  const baseY = (luminance + 16) / 116;
  const x = 0.96422 * lab2xyz(baseY + a / 500);
  const y = Number(lab2xyz(baseY));
  const z = 0.82521 * lab2xyz(baseY - b / 200);
  return {
    red: lrgb2rgb(3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
    green: lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
    blue: lrgb2rgb(0.0719453 * x - 0.2289914 * y + 1.4052427 * z)
  };
};

default_1 = node.default = _default;

function arrdims(arr) {
    if (arr.length === 0)                   return 0;
    if (arr[0].length === undefined)        return 1;
    if (arr[0][0].length === undefined)     return 2;
    if (arr[0][0][0].length === undefined)  return 3;
  } 

  
  
  core.PlotInteractivity = () => 'PlotInteractivity';

  core['System`Private`VertexInterpolants'] = () => {};
  core['Charting`DateTicksFunction'] = () => 'DateTicksFunction';
  core['Charting`ScaledTicks'] = (args, env) => {return({type:'ScaledTicks', args:args})};
  core['Charting`ScaledFrameTicks'] = (args, env) => {return({type:'ScaledFrameTicks', args:args})};
  core['DateListPlot'] = () => {};

  core['Graphics`DPR'] = () => {
    return window.devicePixelRatio;
  };

  core['Graphics`CaptureImage64'] = async (args, env) => {
    const canvas = env.element;
    const p = new Deferred();

    const rect = canvas.getBoundingClientRect();

    electronAPI.requestScreenshot({x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height)}, (r) => {
      p.resolve(r.slice('data:image/png;base64,'.length));
    });

    return p.promise;
  };
 

  
  
  let d3 = false;
  let interpolatePath = false;

  let g2d = {};
  g2d.name = "WebObjects/Graphics";

  const g2dComplex = {};
  g2dComplex.name = "GraphicsComplex 2D";


async function processLabel(ref0, gX, env, textFallback, nodeFallback) {
          let ref = ref0;
          let labelFallback = false;
          let offset = [0,0];

          console.warn(ref);

          if (ref == 'None') {
            return;
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


          
          if (!labelFallback) {
            try {
              const content = await interpretate(ref, env);
              textFallback(content, offset);
              return;

            } catch(err) {
              console.warn('Err:', err);
              labelFallback = true;
            }
          }

          

          if (labelFallback) {
            console.warn('x-label: fallback to EditorView');

            const node = await interpretate(['Inset', ref, ['JSObject', [env.xAxis.invert(0),env.yAxis.invert(0)]]], {...env, context:g2d, svg:gX});
            nodeFallback(node, offset);
            
          }

}

  g2d.Pane = async (args, env) => {
    throw args;
  };

  interpretate.contextExpand(g2d);

 //polyfill for symbols
 ["FaceForm", "ImageSizeAction", "ImageSizeRaw", "Selectable", "ViewMatrix", "CurrentValue", "FontColor", "Tiny", "VertexColors", "Antialiasing","Small", "Plot", "ListCurvePathPlot",  "ListLinePlot", "ListPlot", "Automatic", "Controls","All","TickLabels","FrameTicksStyle", "AlignmentPoint","AspectRatio","Axes","AxesLabel","AxesOrigin","AxesStyle","Background","BaselinePosition","BaseStyle","ColorOutput","ContentSelectable","CoordinatesToolOptions","DisplayFunction","Epilog","FormatType","Frame","FrameLabel","FrameStyle","FrameTicks","FrameTicksStyle","GridLines","GridLinesStyle","ImageMargins","ImagePadding","ImageSize","Full","LabelStyle","Method","PlotLabel","PlotRange","PlotRangeClipping","PlotRangePadding","PlotRegion","PreserveImageOptions","Prolog","RotateLabel","Ticks","TicksStyle", "TransitionDuration"].map((name)=>{
  g2d[name] = () => name;
  //g2d[name].destroy = () => name;
  g2d[name].update = () => name;
  
  });


  g2d.Spacer = () => {};

  core.GoldenRatio = () => 1.6180;

  g2d["Graphics`Canvas"] = async (args, env) => {
    //const copy = {...env};
    //modify local axes to transform correctly the coordinates of scaled container
    let t = {k: 1, x:0, y:0};
    env.onZoom.push((tranform) => {
      t = tranform;
    });

    const copy = {xAxis: env.xAxis, yAxis: env.yAxis};

    env.xAxis = (x) => {
      return 0;
    };

    env.yAxis = (y) => {
      return 0;
    };

    env.xAxis.invert = (x) => {
      const X = (x - t.x - env.panZoomEntites.left) / t.k;
      return copy.xAxis.invert(X);
    };

    env.yAxis.invert = (y) => {
      const Y = (y - t.y - env.panZoomEntites.top) / t.k;
      return copy.yAxis.invert(Y);
    };

    return env.panZoomEntites.canvas
  };

  g2d.HoldForm = async (args, env) => await interpretate(args[0], env);
  g2d.HoldForm.update = async (args, env) => await interpretate(args[0], env);
  //g2d.HoldForm.destroy = async (args, env) => await interpretate(args[0], env)

  g2d.SVGGroup = async (args, env) => {
    const group = env.svg.append("g");

    group.attr('opacity', env.opacity);

    const reset = {...env};
    reset.svg = group;

    reset.offset = {x: 0, y: 0};
    reset.color = 'rgb(68, 68, 68)';
    reset.stroke = undefined;
    reset.opacity = 1;
    reset.fontsize = 10;
    reset.fontfamily = 'sans-serif';
    reset.strokeWidth = 1.5;
    reset.pointSize = 0.023;
    reset.arrowHead = 1.0;

    delete reset.opacityRefs;
    delete reset.colorRefs;

    env.local.group = group;
    await interpretate(args[0], reset);

    if (env.opacityRefs) {
      env.opacityRefs[env.root.uid] = env.root;
    }

    return group;
  };

  g2d.SVGGroup.virtual = true; 
  
  g2d.SVGGroup.update = async (args, env) => {
    //update?..
  };  

  g2d.SVGGroup.updateOpacity = (args, env) => {
    env.local.group.attr("opacity", env.opacity);    
  }; 

  g2d.SVGGroup.destroy = (args, env) => {
    if (env.opacityRefs) {
      delete env.opacityRefs[env.root.uid];
    }    
    env.local.group.remove();
  }; 

  g2d.Scale = async (args, env) => {
    const scaling = await interpretate(args[1], env);
    const group = env.svg.append("g");

    let aligment;
    if (args.length > 2) {
      aligment = await interpretate(args[2], env);
    }
   // if (arrdims(pos) > 1) throw 'List arguments for Translate is not supported for now!';
    
    env.local.group = group;

    await interpretate(args[0], {...env, svg: group});

    let centre = group.node().getBBox();
    
    if (aligment) {
      centre.x = (env.xAxis(aligment[0]));
      centre.y = (env.yAxis(aligment[1]));
    } else {
      centre.x = (centre.x + centre.width / 2);
      centre.y = (centre.y + centre.height / 2);
    }

    env.local.aligment = aligment;

    let scale = undefined;
    if (typeof scaling === 'number') {
      scale = `translate(${centre.x}, ${centre.y}) scale(${scaling}) translate(${-centre.x}, ${-centre.y})`;
    } else if (Array.isArray(scaling)) {
      scale = `translate(${centre.x}, ${centre.y}) scale(${scaling[0]}, ${scaling[1]}) translate(${-centre.x}, ${-centre.y})`;
    }

    env.local.scale = scale;

    if (scale) group.attr("transform", scale);

    return group;
  };

  g2d.Scale.update = async (args, env) => {
    let scaling = await interpretate(args[1], env);

    if (scaling instanceof NumericArrayObject) { // convert back automatically
      scaling = scaling.normal();
    }    

    let aligment = env.local.aligment;
   // if (arrdims(pos) > 1) throw 'List arguments for Translate is not supported for now!';
    
    const group = env.local.group;


    let centre;
    centre = group.node().getBBox();
    
    if (aligment) {
      centre.x = (env.xAxis(aligment[0]));
      centre.y = (env.yAxis(aligment[1]));
    } else {
      centre.x = (centre.x + centre.width / 2);
      centre.y = (centre.y + centre.height / 2);
    }

    let scale = undefined;
    if (typeof scaling === 'number') {
      scale = `translate(${centre.x}, ${centre.y}) scale(${scaling}) translate(${-centre.x}, ${-centre.y})`;
    } else if (Array.isArray(scaling)) {
      scale = `translate(${centre.x}, ${centre.y}) scale(${scaling[0]}, ${scaling[1]}) translate(${-centre.x}, ${-centre.y})`;
    }

     

    var interpol_rotate = d3.interpolateString(env.local.scale, scale);

    env.local.group.maybeTransitionTween(env.transitionType, env.transitionDuration, 'transform' , function(d,i,a){ return interpol_rotate } );
  
    env.local.scale = scale;   

    return env.local.group;
  };

  //g2d.Translate.destroy = async (args, env) => {
   // const pos = await interpretate(args[1], env);
   // const obj = await interpretate(args[0], env);
  //}  

  g2d.Scale.virtual = true;  

  g2d.Scale.destroy = (args, env) => {
    console.log('nothing to destroy');
    //delete env.local.area;
  };
  //g2d.Scale.destroy = async (args, env) => await interpretate(args[0], env)  

  g2d.NamespaceBox = async (args, env) => await interpretate(args[1], env);
  g2d.DynamicModuleBox = async (args, env) => await interpretate(args[1], env);
  g2d.TagBox = async (args, env) => await interpretate(args[0], env);  
  g2d.DynamicModule = async (args, env) => await interpretate(args[1], env);
  g2d["Charting`DelayedClickEffect"] = async (args, env) => await interpretate(args[0], env);

  g2d.ColorProfileData = () => {};

  g2d.ParametricPlot = () => {};

  g2d.TransitionDuration = () => "TransitionDuration";
  g2d.TransitionType = () => "TransitionType";

  var assignTransition = (env) => {
    if ('transitiontype' in env) {
      switch (env.transitiontype) {
        case 'Linear':
          env.transitionType = d3.easeLinear;
        break;
        case 'CubicInOut':
          env.transitionType = d3.easeCubicInOut;
        break;
        default:
          env.transitionType = false;
      }
    }

    if (env.transitionduration) {
      env.transitionDuration = env.transitionduration;
    }
  };

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
        await server.kernel.io.fetch('CoffeeLiqueur`Extensions`Graphics`Private`MakeExpressionBox', [JSON.stringify(data), hash]);
        storage = await obj.get();
      }
      
    } else {
      obj = ObjectHashMap[hash];
    }

    if (!storage) storage = await obj.get();

    console.log("g2d: creating an object");
    console.log('frontend executable');


    const copy = env;
    
    const instance = new ExecutableObject('g2d-embeded-'+uuidv4(), copy, storage, true);
    instance.assignScope(copy);
    obj.assign(instance);

    await instance.execute();
    return instance;
  };

  g2d.Offset = async (args, env) => {
    if (args.length < 2) {
      const data = await interpretate(args[0], env);
      return [env.xAxis.invert(data[0])-env.xAxis.invert(0), env.yAxis.invert(data[1])-env.yAxis.invert(0)]
    }

    const list = await interpretate(args[1], env);

    /*env.offset = {
      x: env.xAxis(list[0]) - env.xAxis(0),
      y: env.yAxis(list[1]) - env.yAxis(0)
    };*/

    const offset = {
      x: list[0],
      y: list[1]
    };

    const data = await interpretate(args[0], {...env, offset:offset});
    if (Array.isArray(data)) {
      const res = [env.xAxis.invert(data[0]) - env.xAxis.invert(0) + offset.x, env.xAxis.invert(data[1]) + offset.y - env.xAxis.invert(0)];
      return res;
    }

    return data;
  };

  //g2d.Offset.destroy = g2d.Offset
  g2d.Offset.update = g2d.Offset;

  g2d.Dashing = async (args, env) => {
    const d = await interpretate(args[0], env);
    if (Array.isArray(d)) {
      if (d[0] == 0) {
        env.dasharray = [2,2];
        return;
      }
    } 
    env.dasharray = [2,0,0,0,2];
  };

  g2d.AbsoluteDashing = async (args, env) => {
    const arr = await interpretate(args[0], env);
    env.dasharray = arr;
  };

  let assignProto;
  
  assignProto = () => {
    d3.selection.prototype.maybeTransition = function(type, duration) {
      return type ? this.transition().ease(type).duration(duration) : this;
    };

    d3.selection.prototype.maybeTransitionTween = function(type, duration, d, func) {

      return type ? this.transition()
      .ease(type)
      .duration(duration).attrTween(d, func) : this.attr(d, func.apply(this.node(), this.data())(1.0));
    };

    assignProto = () => {};
  };

  function niceNumber(x) {
    if (typeof x === 'string') return x;
    if (typeof x !== 'number' || !isFinite(x)) return String(x);
    if (Number.isInteger(x)) return String(x);
  
    // Fixed with 2 decimals (trimmed)
    const fixed = trimFixed(x.toFixed(2));
  
    // Build a few scientific candidates with different fractional digits,
    // convert them to ×10ⁿ form, and pick the shortest.
    const sciCandidates = [];
    for (let frac = 0; frac <= 4; frac++) {
      const expStr = x.toExponential(frac);     // e.g. "1.23e+4"
      const sci = exponentialToSuperscript(expStr); // e.g. "1.23×10⁴"
      sciCandidates.push(sci);
    }
    const sciShortest = shortest(sciCandidates);
  
    return sciShortest.length < fixed.length ? sciShortest : fixed;
  }
  
  // --- helpers ---
  
  function trimFixed(s) {
    // Normalize "-0.00" -> "0"
    if (/^-?0(?:\.0+)?$/.test(s)) return "0";
    // Remove trailing zeros and possible trailing dot
    s = s.replace(/(\.\d*?[1-9])0+$/, '$1'); // "1.2300" -> "1.23"
    s = s.replace(/\.0+$/, '');              // "1.00"   -> "1"
    return s;
  }
  
  function exponentialToSuperscript(expStr) {
    // Parse "mantissa e exponent"
    // Examples: "1.2300e+04", "-3.0e-05"
    const m = /^(-?\d+(?:\.\d+)?)[eE]([+\-]?\d+)$/.exec(expStr);
    if (!m) return expStr; // fallback (shouldn't happen)
    let mantissa = m[1];
    let exponent = m[2];
  
    // Trim mantissa trailing zeros and dot
    mantissa = mantissa.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
    // Normalize "-0" -> "0"
    if (/^-?0(?:\.0+)?$/.test(mantissa)) mantissa = "0";
  
    // Normalize exponent: remove leading zeros, keep sign
    let sign = exponent.startsWith('-') ? '-' : (exponent.startsWith('+') ? '+' : '');
    let absExp = exponent.replace(/^[+\-]?0+/, '');
    if (absExp === '') absExp = '0';
  
    const superscript = toSuperscript(sign + absExp);
  
    // Compose "mantissa×10ⁿ"
    return `${mantissa}×10${superscript}`;
  }
  
  const SUP = {
    '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴',
    '5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
    '+':'⁺','-':'⁻'
  };
  
  function toSuperscript(s) {
    return [...s].map(c => SUP[c] ?? c).join('');
  }
  
  function shortest(arr) {
    return arr.reduce((a, b) => (b.length < a.length ? b : a));
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


  g2d.Complex = async (args, env) => {
    console.warn('Complex numbers are only supported as decoration');
    //[TODO] process ticks in the same way as Text with textContextSym
    const re = await interpretate(args[0], env);
    const im = await interpretate(args[1], env);
    if (re == 0) {
      if (im == 1) return 'i';
      if (im == -1) return '-i';
      if (im < 0) return '- i '+niceNumber(Math.abs(im));
      return 'i '+niceNumber(im);
    }

    if (im == 1) {
      return niceNumber(re) + ' + i';
    }
    if (im == -1) {
      return niceNumber(re) + ' - i';
    }

    if (im < 0) return niceNumber(re) + ' - i' + niceNumber(Math.abs(im));
    return niceNumber(re) + ' + i' + niceNumber(im);
  };
  
  const frameTicks = {};
  frameTicks.Rotate = async (args, env) => {
    return String(await interpretate(args[0], env));
  };

  g2d.Graphics = async (args, env) => {

    await interpretate.shared.d3.load();
    if (!d3) d3 = interpretate.shared.d3.d3;
    if (!interpolatePath) interpolatePath = interpretate.shared.d3['d3-interpolate-path'].interpolatePath;

    g2d.interpolatePath = interpolatePath;
    g2d.d3 = d3;

    assignProto();


    /**
     * @type {Object}
     */  
    
    let options = await core._getRulesReversed(args, {...env, context: g2d, hold:true});
   

    if (Object.keys(options).length == 0 && args.length > 1) {
      if (args[1][0] === 'List') {
        const opts = args[1].slice(1);
        if (opts[0][0] === 'List') {
          //console.warn(opts[0][1]);
          options = await core._getRulesReversed(opts[0].slice(1), {...env, context: g2d, hold:true});
        } else {
          options = await core._getRulesReversed(opts, {...env, context: g2d, hold:true});
        }
      } else {
        options = await core._getRulesReversed(await interpretate(args[1], {...env, context: g2d, hold:true}), {...env, context: g2d, hold:true});
      }
      
 
    }


    
    console.log(options);


    let label = options.PlotLabel;

    /**
     * @type {HTMLElement}
     */
    var container = env.element;

    /**
     * @type {[Number, Number]}
     */
    let ImageSize = await interpretate(options.ImageSize, {...env, context: g2d});
    if (typeof ImageSize === 'number') {
      if (ImageSize < 1) {
        ImageSize = 10000.0 * ImageSize / 2.0;
      }
    } else if (typeof ImageSize === 'string'){
      ImageSize = core.DefaultWidth;
    }   
    
    
    if (!ImageSize) {
      if (env.imageSize) {
        if (Array.isArray(env.imageSize)) {
          ImageSize = env.imageSize;
        } else {
          ImageSize = [env.imageSize, env.imageSize*0.618034];
        }
      } else {
        ImageSize = core.DefaultWidth;
      }
    }

    let rawImage = false;

    const mobileDetected = isMobile();
    if (mobileDetected) {
      console.warn('Mobile device detected!');
      const k = 2.0 / devicePixelRatio;
      if (typeof ImageSize == 'number') {
        ImageSize = ImageSize * k;
        if (ImageSize > 250) ImageSize = 250;
      } else if (typeof ImageSize[0] == 'number') {
        ImageSize[0] = ImageSize[0] * k;
        if (ImageSize[0] > 250) ImageSize[0] = 250;
        ImageSize[1] = ImageSize[1] * k;
      }

    }

    if (options.ImageSizeRaw) {
      const size = await interpretate(options.ImageSizeRaw, env);

      if (Array.isArray(size)) {
        if (typeof size[0] == 'number' && typeof size[1] == 'number') {
          ImageSize = size.map((s) => s / window.devicePixelRatio);
          rawImage = true;
        }
      } else {
        if (typeof size == 'number') {
          ImageSize = [size / window.devicePixelRatio, size*0.618034 / window.devicePixelRatio];
          rawImage = true;
        }
      }

    }

    let tinyGraph = false;
    let deviceFactor = devicePixelRatio;

    if (mobileDetected) {
      deviceFactor = 2.0;
    }

    if (ImageSize instanceof Array) {
      if (ImageSize[0] < 100*deviceFactor && !(options.PaddingIsImportant)) {
        tinyGraph = true;
      }
    } else {
      if (ImageSize < 100*deviceFactor && !(options.PaddingIsImportant)) {
        tinyGraph = true;
      }
    }




    //simplified version
    let axis = [false, false];
    let invertedTicks = false;
    let ticklengths = [5,5,5,5];
    let tickLabels = [true, false, true, false];
    let ticks = undefined;
    let framed = false;
    let axesstyle = undefined;
    let ticksstyle = undefined;

    if (options.Frame && !tinyGraph) {
      options.Frame = await interpretate(options.Frame, env);
      if (options.Frame === true) {
        framed = true;
      } else {
        if (options.Frame[0][0] === true) framed = true;
        if (options.Frame[0] === true) framed = true;  
        if (options.Frame[1]) {
          if (options.Frame[1][0] === true) {
            //framed = false; //TODO: FIXME Dirty HACK for TimeLinePlot to work
            axis = [true, false];
          }
        }
      }
    }

    
    
    if (options.Axes && !tinyGraph) {
      options.Axes = await interpretate(options.Axes, env);
      if (options.Axes === true) {
        axis = [true, true];
      } else if (Array.isArray(options.Axes)) { //TODO: FIXME Dirty HACK for TimeLinePlot to work
        
        //if (!options.Frame || (axis[0] && axis[1]))
          axis = options.Axes;

      }
    }  


    if (framed) {
      invertedTicks = true;
      axis = [true, true, true, true];
    }
    
    

    

  if (options.Ticks) {
      options.Ticks = await interpretate(options.Ticks, {...env, context: [frameTicks, g2d]});

      // keep your [left,right,bottom,top] convention
      if (!Array.isArray(ticks)) ticks = [true, false, true, false];

      // helpers
      // helpers
      const isTickPair = (e) => Array.isArray(e) && typeof e[0] === 'number';
      const isTickPairList = (v) => Array.isArray(v) && Array.isArray(v[0]) && isTickPair(v[0]);
        
      const normalizeSide = (val) => {
        if (Array.isArray(val)) return val.length === 0 ? false : val; // [] disables
        return val;
      };
      
      const expandAxis = (val) => {
          // [] disables both mirrored sides
          if (Array.isArray(val) && val.length === 0) return [false, false];
      
          // [[pos,label], ...] -> pass through + mirror
          if (isTickPairList(val)) return [val, val];
      
          // plain array of positions or mixed -> pass through + mirror
          if (Array.isArray(val)) return [val, val];
      
          // function/object(.type)/boolean/string -> mirror
          if (typeof val === 'function') return [val, val];
          if (val && typeof val === 'object' && val.type) return [val, val];
          if (val === true || val === false) return [val, val];
          if (typeof val === 'string' || typeof val === 'number') return [val, val];
      
          // fallback: disable
          return [false, false];
        };
      
      // --- primary shape: [left, bottom] ---
      // NOTE: interleave -> [left, right, bottom, top] = [L, B, L, B]
      if (Array.isArray(options.Ticks) && options.Ticks.length === 2) {
        const [L, B] = options.Ticks;
      
        const left   = normalizeSide(L);
        const bottom = normalizeSide(B);
      
        // allow [[number,string], ...] to pass through unchanged
        const leftSpec   = isTickPairList(left)   ? left   : left;
        const bottomSpec = isTickPairList(bottom) ? bottom : bottom;
      
        // interleave!
        ticks[0] = leftSpec;      // left
        ticks[1] = bottomSpec;    // right  (← where your labels should land)
        ticks[2] = leftSpec;      // bottom
        ticks[3] = bottomSpec;    // top
      }


      // --- other shapes still supported (kept for parity/back-compat) ---

      // single value -> all sides
      else if (Array.isArray(options.Ticks) && options.Ticks.length === 1) {
        const v = options.Ticks[0];
        const [a, b] = expandAxis(v);
        ticks = [a, b, a, b];
      }
    
      // explicit per-side [left,right,bottom,top]
      else if (Array.isArray(options.Ticks) && options.Ticks.length >= 3) {
        const cand = options.Ticks;
        const setSide = (i, val) => {
          if (Array.isArray(val)) ticks[i] = val.length === 0 ? false : val;
          else if (val === false || val === null) ticks[i] = false;
          else if (val !== undefined) ticks[i] = val;
        };
        setSide(0, cand[0]); // left
        setSide(1, cand[1]); // right
        setSide(2, cand[2]); // bottom
        setSide(3, cand[3]); // top
      }
    
      // boolean true/false for all
      else if (options.Ticks === true) {
        ticks = [true, true, true, true];
      } else if (options.Ticks === false) {
        ticks = [false, false, false, false];
      }
    
      // function/object with .type -> all sides
      else if (typeof options.Ticks === 'function' || (options.Ticks && typeof options.Ticks === 'object' && options.Ticks.type)) {
        ticks = [options.Ticks, options.Ticks, options.Ticks, options.Ticks];
      }
    
      // legacy shortcuts you already had
      if (Array.isArray(options.Ticks)) {
        if (options.Ticks[1]?.type && !options.Ticks[0]?.type) {
          ticks = [true, options.Ticks[1], true, false];
        }
        if (options.Ticks[0]?.type && !options.Ticks[1]?.type) {
          ticks = [options.Ticks[0], true, false, false];
        }
        if (options.Ticks[1]?.type && options.Ticks[0]?.type) {
          ticks = [options.Ticks[0], options.Ticks[1], false, false];
        }
      }
    }




    

    if (options.FrameTicks && framed && !tinyGraph) {
      options.FrameTicks = await interpretate(options.FrameTicks, {...env, context: [frameTicks, g2d]});
      //I HATE YOU WOLFRAM

      ticks = [true, true, true, true];


      //left,right,  bottom,top
      if (Array.isArray(options.FrameTicks)) {
        if (Array.isArray(options.FrameTicks[0])) {
          
          if (Array.isArray(options.FrameTicks[0][0])) {
            
            if (Number.isInteger(options.FrameTicks[0][0][0]) || (typeof options.FrameTicks[0][0] === 'string') || Array.isArray(options.FrameTicks[0][0][0])) {
              ticks[1] = options.FrameTicks[0][0];           
              ticks[3] = options.FrameTicks[0][1];              
              
              //, options.FrameTicks[1][0], options.FrameTicks[0][1], options.FrameTicks[1][1]];
            }
          } else {
            ticks[1] = options.FrameTicks[0][0];           
            ticks[3] = options.FrameTicks[0][1];            
          }
 

        }

        if (Array.isArray(options.FrameTicks[1])) {
          //console.error(options.FrameTicks[1]);
          if (Array.isArray(options.FrameTicks[1][0])) {
            
            if (Number.isInteger(options.FrameTicks[1][0][0]) || (typeof options.FrameTicks[1][0] === 'string') || Array.isArray(options.FrameTicks[1][0][0])) {
              ticks[0] = options.FrameTicks[1][0];
              ticks[2] = options.FrameTicks[1][1];              
              
              //, options.FrameTicks[1][0], options.FrameTicks[0][1], options.FrameTicks[1][1]];
            }

            if (options.FrameTicks[1][0].length == 0) ticks[0] = false;
            if (options.FrameTicks[1][1].length == 0) ticks[2] = false;

          } else  {
            ticks[0] = options.FrameTicks[1][0];
            ticks[2] = options.FrameTicks[1][1]; 
          }


        }        
      }


    }

    

    if (options.FrameTicks && !tinyGraph) {
      if (options.FrameTicks[2])
      if (options.FrameTicks[2][1]) {
        let t = options.FrameTicks[2][1];
        if (Array.isArray(t)) {
          t = t[1];
          if (Array.isArray(t)) {
            if (t[0] == 'Charting`getDateTicks') {
              framed = false;
              axis = [true, false]; //A hack for timelineplot
            }
          }
        }
      }
    }



    
    
    
    if (options.TickDirection) {
      const dir = await interpretate(options.TickDirection, env);
      if (dir === "Inward") invertedTicks = true;
      if (dir === "Outward") invertedTicks = false;
    }

    if (options.TickLengths) {
      options.TickLengths = await interpretate(options.TickLengths, env);
      if (!Array.isArray(options.TickLengths)) {
        ticklengths = [options.TickLengths, options.TickLengths, options.TickLengths, options.TickLengths];
      }
    }

    if (options.TickLabels && !tinyGraph) {
      options.TickLabels = await interpretate(options.TickLabels, env);
      if (!Array.isArray(options.TickLabels)) {
        tickLabels = [false, false, false, false];
      } else {
        tickLabels = options.TickLabels.flat();
      }      
    }

    //-----------------
    let margin = {top: 0, right: 0, bottom: 10, left: 40};
    let padding = {top: 0, right: 0, bottom: 15, left: 0};

    if (axis[2]) {
      margin.top = margin.bottom;
      margin.left = margin.right;
    }
    if (options.AxesLabel) {
      padding.bottom = 10;
      margin.top = 30;
      margin.right = 50;
      padding.right = 50;
    }

    if (framed) {
      padding.left = 40;
      padding.left = 30;
      margin.left = 30;
      margin.right = 40;
      margin.top = 30;
      //padding.top = 10;

      padding.bottom = 10;
      margin.bottom = 35;
    }

    if (options.ImagePadding) {
      console.log('padding: ');
      console.log(options.ImagePadding);
      options.ImagePadding = await interpretate(options.ImagePadding, env);
      console.log(options.ImagePadding);

      if (options.ImagePadding === 'None') {
        margin.top = 0;
        margin.bottom = 0;
        margin.left = 0;
        margin.right = 0;
      } else if (Number.isInteger(options.ImagePadding)) {
        margin.top = options.ImagePadding;
        margin.bottom = options.ImagePadding;
        margin.left = options.ImagePadding;
        margin.right = options.ImagePadding;
      } else if (Array.isArray(options.ImagePadding)) {
        if (Array.isArray(options.ImagePadding[0])) {
          if (Number.isInteger(options.ImagePadding[0][0])) margin.left = options.ImagePadding[0][0];
          if (Number.isInteger(options.ImagePadding[0][1])) margin.right = options.ImagePadding[0][1];
        }
        if (Array.isArray(options.ImagePadding[1])) {
          if (Number.isInteger(options.ImagePadding[1][0])) margin.bottom = options.ImagePadding[1][0];
          if (Number.isInteger(options.ImagePadding[1][1])) margin.top = options.ImagePadding[1][1];
        }
      } else if (options.ImagePadding === "All") ; else if (options.ImagePadding === false) {
        margin.top = 0;
        margin.bottom = 0;
        margin.left = 0;
        margin.right = 0;        
      }  else {
        console.error('given ImagePadding is not supported!');
      }
    }

    if (!options.Axes && !options.Frame && !options.ImagePadding && !options.AxesLabel) {
      console.warn('Axes are absent, removing padding...');
      margin.top = 0;
      margin.bottom = 0;
      margin.left = 0;
      margin.right = 0;
      padding.top = 0;
      padding.bottom = 0;
      padding.left = 0;
      padding.right = 0;     
    }



    if (tinyGraph) {
        console.warn('too small, removing padding...');
        margin.top = 0;
        margin.bottom = 0;
        margin.left = 0;
        margin.right = 0;
        padding.top = 0;
        padding.bottom = 0;
        padding.left = 0;
        padding.right = 0;  
    }
    


    let aspectratio = await interpretate(options.AspectRatio, env) || env.aspectRatio || 1;

    if (!(typeof aspectratio == 'number')) aspectratio = 1.0;

    //if only the width is specified
    if (!(ImageSize instanceof Array)) {
      aspectratio = (aspectratio * (ImageSize - margin.left - margin.right) + margin.top + margin.bottom)/(ImageSize);
      ImageSize = [ImageSize, ImageSize*aspectratio];
    }



    let width = ImageSize[0] - margin.left - margin.right;
    let height = ImageSize[1] - margin.top - margin.bottom;

    if (rawImage) {
      width = ImageSize[0];
      height = ImageSize[1];
    }

    if (width <0 || height < 0) {
      //overflow - remove all!
      margin.top = 0;
      margin.bottom = 0;
      margin.left = 0;
      margin.right = 0;
      padding = {top: 0, right: 0, bottom: 0, left: 0};
      width = ImageSize[0];
      height = ImageSize[1];
    }

    // append the svg object to the body of the page
    let svg;
    
    
    // if (env.inset) 
    //   svg = env.inset.append("svg");
    // else
      svg = d3.select(container).append("svg");

    if ('Background' in options) {
      
      options.Background = await interpretate(options.Background, {...env, context: g2d});
  
      if (options.Background) {
        svg.node().style.backgroundColor = options.Background;
        console.log('Background color:'+options.Background);
      }
    }

    if ('ViewBox' in options) {

      let boxsize = await interpretate(options.ViewBox, env);
      if (!(boxsize instanceof Array)) boxsize = [0,0,boxsize, boxsize*aspectratio];
      svg.attr("viewBox", boxsize);  
      env.viewBox = boxsize;   

    } else {
      svg.attr("width", width + margin.left + margin.right + padding.left)
         .attr("height", height + margin.top + margin.bottom + padding.bottom);


      env.svgWidth = width + margin.left + margin.right + padding.left;
      env.svgHeight = height + margin.top + margin.bottom + padding.bottom;
      env.clipWidth = width;
      env.clipHeight = height;
    }

    let svgDefs = svg.append('svg:defs');

    let clipOffset = 0;
    let clipMargin = 2; 
    let clipRangeZoom = 1;
    let clipRangeOffset = [0,0];

    if (framed) {
      clipOffset = 7;
      clipMargin = 0;
    }

    //make it focusable
    svg.attr('tabindex', '0');

    const listenerSVG = svg;

    
    
    svg = svg  
    .append("g")
      .attr("transform",
            "translate(" + (margin.left + padding.left) + "," + margin.top + ")");

    const clipId = "clp"+(Math.random().toFixed(4).toString().replace('.', ''));
    svg.append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", width - 2 * clipOffset + clipMargin)
    .attr("height", height - 2 * clipOffset + clipMargin)
    .attr("x", clipOffset - clipMargin)
    .attr("y", clipOffset - clipMargin);
    
    let range = [[-1.15,1.15],[-1.15,1.15]];
    let unknownRanges = true;

    if (options.PlotRange || env.plotRange) {
      const r = env.plotRange || (await interpretate(options.PlotRange, env));

      if (Number.isFinite(r[0][0])) {
        if (Number.isFinite(r[1][0])) {
          range = r;
          unknownRanges = false;
        } else {
          range[0] = r[0];
          range[1] = [-1.15,1.15];
        }
      }
    }

    if (framed) {
      clipRangeOffset = [10 * (range[0][1] - range[0][0])/width, 10 * (range[1][1] - range[1][0])/height];
      //avoid clipping of the frame
    }

    

    {
    
      const meanX = (range[0][0] + range[0][1])/2.0;
      const meanY = (range[1][0] + range[1][1])/2.0;
      
      if (!rawImage) {
        range = [
          [meanX + (range[0][0] - meanX)*clipRangeZoom - clipRangeOffset[0], meanX + (range[0][1] - meanX)*clipRangeZoom + clipRangeOffset[0]],
          [meanY + (range[1][0] - meanY)*clipRangeZoom - clipRangeOffset[1], meanY + (range[1][1] - meanY)*clipRangeZoom + clipRangeOffset[1]]
        ];
      }

    }    

    let transitionType = d3.easeLinear;

    if (options.TransitionType) {
      const type = await interpretate(options.TransitionType, {...env, context: g2d});
      switch (type) {
        case 'Linear':
          transitionType = d3.easeLinear;
        break;
        case 'CubicInOut':
          transitionType = d3.easeCubicInOut;
        break;
        default:
          transitionType = undefined;
      }
    }

    let niceTicks = false;
    if (options.NicerTicks) niceTicks = true;

    
    console.log(range);


    let gX = undefined;
    let gY = undefined;

    let gTX = undefined;
    let gRY = undefined;
    
    let x = d3.scaleLinear()
      .domain(range[0])
      .range([ 0, width ]);

    let xAxis = d3.axisBottom(x);
    let txAxis = d3.axisTop(x);

    console.log(axis);

    
    
    if (ticks) {
      if (!ticks[0]) {
        xAxis = xAxis.tickValues([]);
      } else {
        if (typeof ticks[0] === 'string') {
          switch(ticks[0]) {
            case 'Nice':
              niceTicks = true;
              break;
            case 'Automatic':
              break;
            
            case 'None':
              xAxis = xAxis.tickValues([]);
              break;

            case 'DateTicksFunction':
                //convert to a proper format
                x = d3.scaleTime()
                .domain(range[0].map(e => e*1000 - 2208996000*1000))
                .range([ 0, width ]);
                txAxis = d3.axisTop(x);
                xAxis = d3.axisBottom(x);
                const temp = x;
                x = (d) => temp(d*1000 - 2208996000*1000);
                x.copy = temp.copy; 
                x.range = temp.range; 
                x.domain = temp.domain;
                x.invert = temp.invert;
              break;
          }
        } else if (ticks[0]?.type) {
     
          switch(ticks[0].type) {
            case 'ScaledTicks':
               
               x = d3.scaleLinear()
               .domain(range[0]) // like [-3.926, 0]
               .range([0, width]); 

               //[TODO] covers only a few cases...
               const mathFunction = eval('Math.'+ticks[0].args[0][2].toLowerCase());

               const tickFormat = d => {
                 const val = mathFunction(d);
              
                 // Use log10(val) to estimate "scale" for precision decision
                 const absVal = Math.abs(val);
              
                 if (absVal < 0.01 || absVal > 1000) {
                   // Use exponential notation for very small/large values
                   return `${val.toExponential(1)}`;  // You can also use 1 decimal if preferred
                 } else if (absVal < 1) {
                   return val.toFixed(3); // e.g. 0.135
                 } else if (absVal < 10) {
                   return val.toFixed(2); // e.g. 2.72
                 } else if (absVal < 100) {
                   return val.toFixed(1); // e.g. 27.2
                 } else {
                   return val.toPrecision(3); // fallback for big values
                 }
               };

               xAxis = d3.axisBottom(x).tickFormat(tickFormat);

            break;
          }
        } else if (ticks[0] === true) {
          console.log('Default ticks');
        } else if (Array.isArray(ticks[0][0])) {
          
          const labels = ticks[0].map((el) => el[1]);
     
          xAxis = xAxis.tickValues(ticks[0].map((el) => el[0])).tickFormat(function (d, i) {
            return niceNumber(labels[i]);
          });
        } else {
          xAxis = xAxis.tickValues(ticks[0]);
        }  
      }    
    }

    if (ticks) {
      
      if (!ticks[2]) {
        txAxis = txAxis.tickValues([]);
      } else {
        
        if (typeof ticks[2] === 'string') {
          switch(ticks[2]) {
            case 'Nice':
              niceTicks = true;
              break;            
            case 'Automatic':
              break;
            
            case 'None':
              txAxis = txAxis.tickValues([]);
              break;

            case 'DateTicksFunction':
                x = d3.scaleTime()
                .domain(range[0].map(e => e*1000 - 2208996000*1000))
                .range([ 0, width ]);
                txAxis = d3.axisTop(x).ticks(4);
                xAxis = d3.axisBottom(x).ticks(4);
                const temp = x;
                x = (d) => temp(d*1000 - 2208996000*1000);
                x.copy = temp.copy; 
                x.range = temp.range; 
                x.domain = temp.domain;
                x.invert = temp.invert;

                
              break;
          }
        }else if (ticks[2]?.type) {
     
          switch(ticks[2].type) {
            case 'ScaledTicks':
               
               x = d3.scaleLinear()
               .domain(range[0]) // like [-3.926, 0]
               .range([0, width]); 

               //[TODO] covers only a few cases...
               const mathFunction = eval('Math.'+ticks[2].args[0][2].toLowerCase());

               const tickFormat = d => {
                 const val = mathFunction(d);
              
                 // Use log10(val) to estimate "scale" for precision decision
                 const absVal = Math.abs(val);
              
                 if (absVal < 0.01 || absVal > 1000) {
                   // Use exponential notation for very small/large values
                   return `${val.toExponential(1)}`;  // You can also use 1 decimal if preferred
                 } else if (absVal < 1) {
                   return val.toFixed(3); // e.g. 0.135
                 } else if (absVal < 10) {
                   return val.toFixed(2); // e.g. 2.72
                 } else if (absVal < 100) {
                   return val.toFixed(1); // e.g. 27.2
                 } else {
                   return val.toPrecision(3); // fallback for big values
                 }
               };

               txAxis = d3.axisTop(x).tickFormat(tickFormat);

            break;
          }
        } else if (ticks[2] === true) {
          console.log('Default ticks');
        } else if (Array.isArray(ticks[2][0])) {
   
          
          const labels = ticks[2].map((el) => el[1]);
          txAxis = txAxis.tickValues(ticks[2].map((el) => el[0])).tickFormat(function (d, i) {
            return niceNumber(labels[i]);
          });
        } else {
          txAxis = txAxis.tickValues(ticks[2]);
        }  
      }    
    }

    let gridLines = false;
    if (options.GridLines) {
      if (options.GridLines[1]) {
        gridLines = (options.GridLines[1] == 'Automatic');
      }
    }

    //throw tickLabels;
    // Define a custom locale where the "thousands" separator is a thin space
    const customLocale = d3.formatLocale({
      decimal: ".",          // decimal point
      thousands: "\u202F",   // thin space (U+202F)
      grouping: [3],         // group digits in 3s
      currency: ["", ""],    // currency prefix/suffix (not needed here)
    });

    // Create a formatter from this locale
    const format = customLocale.format(",");

    if (!tickLabels[0]) xAxis = xAxis.tickFormat(x => ``); else if (niceTicks) xAxis = xAxis.tickFormat(format);
    if (!tickLabels[1]) txAxis = txAxis.tickFormat(x => ``); else if (niceTicks) txAxis = txAxis.tickFormat(format);

    if (invertedTicks) {
      xAxis = xAxis.tickSizeInner(-ticklengths[0]).tickSizeOuter(0);
      txAxis = txAxis.tickSizeInner(-ticklengths[2]).tickSizeOuter(0);
    } else { 
      xAxis = xAxis.tickSizeInner(ticklengths[0]).tickSizeOuter(0);
      txAxis = txAxis.tickSizeInner(ticklengths[2]).tickSizeOuter(0); 
    }

 
    // Add Y axis
    let y = d3.scaleLinear()
    .domain(range[1])
    .range([ height, 0 ]);

    let yAxis = d3.axisLeft(y);
    let ryAxis = d3.axisRight(y);   

    if (ticks) {
      if (!ticks[1]) {
        yAxis = yAxis.tickValues([]);
      } else {
        if (typeof ticks[1] === 'string') {
          switch(ticks[1]) {
            case 'Nice':
              niceTicks = true;
              break;            
            case 'Automatic':
              break;
            
            case 'None':
              yAxis = yAxis.tickValues([]);
              break;

            case 'DateTicksFunction':
              y = d3.scaleTime()
              .domain(range[1].map(e => e*1000 - 2208996000*1000))
              .range([ 0, height ]);
              ryAxis = d3.axisRight(y);
              yAxis = d3.axisLeft(y);

              const proxy = y;
              y = (d) => proxy(d*1000 - 2208996000*1000);
              y.copy = proxy.copy; 
              y.range = proxy.range; 
              y.domain = proxy.domain;
              y.invert = proxy.invert;    
                    
              break;
          }
        }else if (ticks[1]?.type) {
     
          switch(ticks[1].type) {
            case 'ScaledTicks':
               
               y = d3.scaleLinear()
               .domain(range[1]) // like [-3.926, 0]
               .range([height, 0]); 

               //[TODO] covers only a few cases...
               const mathFunction = eval('Math.'+ticks[1].args[0][2].toLowerCase());

               const tickFormat = d => {
                 const val = mathFunction(d);
              
                 // Use log10(val) to estimate "scale" for precision decision
                 const absVal = Math.abs(val);
              
                 if (absVal < 0.01 || absVal > 1000) {
                   // Use exponential notation for very small/large values
                   return `${val.toExponential(1)}`;  // You can also use 1 decimal if preferred
                 } else if (absVal < 1) {
                   return val.toFixed(3); // e.g. 0.135
                 } else if (absVal < 10) {
                   return val.toFixed(2); // e.g. 2.72
                 } else if (absVal < 100) {
                   return val.toFixed(1); // e.g. 27.2
                 } else {
                   return val.toPrecision(3); // fallback for big values
                 }
               };

             yAxis = d3.axisLeft(y).tickFormat(tickFormat);

            break;
          }
        } else if (ticks[1] === true) {
          console.log('Default ticks');
        } else if (Array.isArray(ticks[1][0])) {
          const labels = ticks[1].map((el) => el[1]);
          yAxis = yAxis.tickValues(ticks[1].map((el) => el[0])).tickFormat(function (d, i) {
            return niceNumber(labels[i]);
          });
        } else {
          yAxis = yAxis.tickValues(ticks[1]);
        }  
      }    
    }


    if (ticks) {
      if (!ticks[3]) {
        ryAxis = ryAxis.tickValues([]);
      } else {
        if (typeof ticks[3] === 'string') {
          switch(ticks[3]) {
            case 'Nice':
              niceTicks = true;
              break;            
            case 'Automatic':
              break;
            
            case 'None':
              ryAxis = ryAxis.tickValues([]);
              break;

            case 'DateTicksFunction':
              y = d3.scaleTime()
              .domain(range[1].map(e => e*1000 - 2208996000*1000))
              .range([ 0, height ]);
              ryAxis = d3.axisRight(y);
              yAxis = d3.axisLeft(y);

              const proxy = y;
              y = (d) => proxy(d*1000 - 2208996000*1000);
              y.copy = proxy.copy; 
              y.range = proxy.range; 
              y.domain = proxy.domain;
              y.invert = proxy.invert; 
              break;
          }
        }else if (ticks[3]?.type) {
     
          switch(ticks[3].type) {
            case 'ScaledTicks':
               
               y = d3.scaleLinear()
               .domain(range[1]) // like [-3.926, 0]
               .range([height, 0]); 

               //[TODO] covers only a few cases...
               const mathFunction = eval('Math.'+ticks[1].args[0][2].toLowerCase());

               const tickFormat = d => {
                 const val = mathFunction(d);
              
                 // Use log10(val) to estimate "scale" for precision decision
                 const absVal = Math.abs(val);
              
                 if (absVal < 0.01 || absVal > 1000) {
                   // Use exponential notation for very small/large values
                   return `${val.toExponential(1)}`;  // You can also use 1 decimal if preferred
                 } else if (absVal < 1) {
                   return val.toFixed(3); // e.g. 0.135
                 } else if (absVal < 10) {
                   return val.toFixed(2); // e.g. 2.72
                 } else if (absVal < 100) {
                   return val.toFixed(1); // e.g. 27.2
                 } else {
                   return val.toPrecision(3); // fallback for big values
                 }
               };

               ryAxis = d3.axisRight(y).tickFormat(tickFormat);

            break;
          }
        } else if (ticks[3] === true) {
          console.log('Default ticks');
        } else if (Array.isArray(ticks[3][0])) {
          const labels = ticks[3].map((el) => el[1]);
          ryAxis = ryAxis.tickValues(ticks[3].map((el) => el[0])).tickFormat(function (d, i) {
            return niceNumber(labels[i]);
          });
        } else {
          ryAxis = ryAxis.tickValues(ticks[3]);
        }  
      }    
    }    


    if (!tickLabels[2]) yAxis = yAxis.tickFormat(x => ``); else if (niceTicks) yAxis = yAxis.tickFormat(format);
    if (!tickLabels[3]) ryAxis = ryAxis.tickFormat(x => ``); else if (niceTicks) ryAxis = ryAxis.tickFormat(format);    


    
    if (invertedTicks) {
      yAxis = yAxis.tickSizeInner(-ticklengths[1]).tickSizeOuter(0);
      ryAxis = ryAxis.tickSizeInner(-ticklengths[3]).tickSizeOuter(0);
    } else {
      yAxis = yAxis.tickSizeInner(ticklengths[1]).tickSizeOuter(0);
      ryAxis = ryAxis.tickSizeInner(ticklengths[3]).tickSizeOuter(0);      
    }


    let xGrid;
    let yGrid;
    

    if ((ticks || axis[0]) && gridLines) {
      
      if (axis[0]) {
        xGrid = (x) => (g) => g
        .selectAll('line')
        .data(x.ticks())
        .join('line')
        .attr('x1', d => x(d))
        .attr('x2', d => x(d))
        .attr('y1', 0)
        .attr('y2', height);
      }

      if (axis[1]) {
        yGrid = (y) => (g) => g
        .selectAll('line')
        .data(y.ticks())
        .join('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => y(d))
        .attr('y2', d => y(d));
      }
    }     

    //throw ticks;

    env.context = g2d;
    env.svg = svg.append("g");

    //added clip view

    if ('PlotRangeClipping' in options) {
      const clip = await interpretate(options.PlotRangeClipping, env);
      if (clip) {
        env.svg = env.svg.attr("clip-path", "url(#"+clipId+")").append('g');
      } else {
        env.svg = env.svg.append('g');
      }
    } else {
      env.svg = env.svg.attr("clip-path", "url(#"+clipId+")").append('g');
    }

    
    env.rootSVG = env.svg;

    env.xAxis = x;
    env.yAxis = y;     
    env.defs = svgDefs;
    env.xGrid = xGrid;
    env.yGrid = yGrid;
    env.numerical = true;
    env.tostring = false;
    env.offset = {x: 0, y: 0};
    env.color = 'rgb(68, 68, 68)';
    env.stroke = undefined;
    env.opacity = 1;
    env.fontsize = 10;
    env.fontfamily = 'sans-serif';
    env.strokeWidth = 1.5;
    env.pointSize = 0.023;
    env.arrowHead = 1.0;
    env.onZoom = [];
    env.transitionDuration = 50;
    env.transitionType = transitionType;
    env.plotRange = range;

    

    axesstyle = {...env};
    ticksstyle = {...env};

    if (options.AxesStyle) {
      await interpretate(options.AxesStyle, axesstyle);
    }

    if (options.FrameStyle) {
      console.warn('FrameStyle');
      console.log(options.FrameStyle);
      //console.log(JSON.stringify(axesstyle));
      await interpretate(options.FrameStyle, axesstyle);
      console.log(axesstyle);
    }    

    if (options.FrameTicksStyle) {
      await interpretate(options.FrameTicksStyle, ticksstyle);
    }

    let gGX;
    let gGY;

    let axesOrigin = [0, height];
    if (!framed) {
      const origin = await interpretate(options.AxesOrigin, {...env});

      if (Array.isArray(origin)) {
        if (typeof origin[0] == 'number' && typeof origin[1] == 'number') {
          if (origin[0] != 0 || origin[1] != 0) { //FUCK U Wolfram!
            axesOrigin[0] = x(origin[0]);
            axesOrigin[1] = y(origin[1]);
          }
        }
      }
    }

    if (yGrid) gGY = svg.append('g').attr('stroke', '#0000002e').attr('stroke-dasharray', '4 2').call(yGrid(y));
    if (xGrid) gGX = svg.append('g').attr('stroke', '#0000002e').attr('stroke-dasharray', '4 2').call(xGrid(x));

    if (axis[0]) gX = svg.append("g").attr("transform", "translate(0," + axesOrigin[1] + ")").call(xAxis).attr('font-size', ticksstyle.fontsize).style('color', ticksstyle.color);
    if (axis[2]) gTX = svg.append("g").attr("transform", "translate(0," + 0 + ")").call(txAxis).attr('font-size', ticksstyle.fontsize).style('color', ticksstyle.color);
    
    if (axis[1]) gY = svg.append("g").call(yAxis).attr("transform", "translate("+axesOrigin[0]+",0)").attr('font-size', ticksstyle.fontsize).style('color', ticksstyle.color);
    if (axis[3]) gRY = svg.append("g").attr("transform", "translate(" + width + ", 0)").call(ryAxis).attr('font-size', ticksstyle.fontsize).style('color', ticksstyle.color);



    let labelStyle = {...axesstyle};

    if (options.LabelStyle) {
      await interpretate(options.LabelStyle, labelStyle);
    }

    if (label) {
      let editorView = false;

      if (Array.isArray(label)) {
        if (label[0] == 'HoldForm') {
          editorView = true;
        }
      }

      try {
        if (!editorView) label = await interpretate(label, labelStyle);
      } catch(err) {
        console.warn(err);
        editorView = true;
      }

      if (editorView) {
        console.warn('Fallback to Inset');
        await interpretate(['Inset', options.PlotLabel, ['JSObject', [x.invert((width / 2) + labelStyle.offset.x), y.invert(0 - (margin.top / 2) + labelStyle.offset.y)]], 'Top'], {...env, context:g2d, svg:svg});
      } else {
        g2d.Text.PutText(svg.append("text")
                .attr("x", (width / 2) + labelStyle.offset.x)             
                .attr("y", 0 - (margin.top / 2) + labelStyle.offset.y)
                .attr("text-anchor", "middle") 
                .attr('fill', labelStyle.color)
                .style("font-size", labelStyle.fontsize)  
                .style("font-family", labelStyle.fontfamily),
                label, labelStyle
        );
      }
    }

    if (options.AxesLabel && !framed) {
      
      options.AxesLabel = await interpretate(options.AxesLabel, {...env, hold:true});

      if (Array.isArray(options.AxesLabel)) {
        //let temp = {...env};
        //let value = await interpretate(options.AxesLabel[0], temp);

        if (gX && options.AxesLabel[0]) {

          await processLabel(options.AxesLabel[0], gX, {...env}, (text, offsets) => {
            g2d.Text.PutText(gX.append("text")
              .attr("x", width + 15 + offsets[0])
              .attr("y", margin.bottom + offsets[1])
              .attr("font-size", axesstyle.fontsize)
              .attr("fill", axesstyle.color)
              .attr("text-anchor", "start")
            , text, axesstyle); 
          }, (node, offsets) => {
              node
              .attr("transform", `translate(${width + 15 + offsets[0]}, ${margin.bottom + offsets[1] - 10})`)
              .attr("font-size", axesstyle.fontsize)
              .attr("fill", axesstyle.color)
              .attr("text-anchor", "start");
          });
          
        }

        if (gY && options.AxesLabel[1]) {
          await processLabel(options.AxesLabel[1], gY, {...env}, (text, offsets) => {
            g2d.Text.PutText(gY.append("text")
              .attr("x", 0 + offsets[0])
          .attr("y", -margin.top/2 + offsets[1])
          .attr("font-size", axesstyle.fontsize)
          .attr("fill", axesstyle.color)
          .attr("text-anchor", "start")
            , text, axesstyle); 
          }, (node, offsets) => {
              node
              .attr("transform", `translate(${0 + offsets[0]}, ${-margin.top/2 + offsets[1]})`)
          .attr("font-size", axesstyle.fontsize)
          .attr("fill", axesstyle.color)
          .attr("text-anchor", "start");
          });

        }        
 
      }

    }

    if (options.FrameLabel && framed) {
     
      //throw(options.FrameLabel);

      options.FrameLabel = await interpretate(options.FrameLabel, {...env, hold:true});




      if (Array.isArray(options.FrameLabel)) {

        let lb = options.FrameLabel[0];
        let rt = options.FrameLabel[1];

        let flip = false;


        if (!Array.isArray(lb)) {
          lb = ["List", lb, "None"];
          flip = true;
        } else if (lb[0] != "List") {
          lb = ["List", lb, "None"];
          flip = true;
        } else if (Array.isArray(lb[2])) {
          if (lb[2][0] == 'List') {
            if (lb[2].length == 3) {
              lb = ["List", lb, "None"];
              flip = true;
            }
          } else if (lb[2][0] == 'HoldForm') {
            if (Array.isArray(lb[2][1])) {
              if (lb[2][1][0] == 'List') {
                if (lb[2][1].length == 3) {
                  lb = ["List", ['List', lb[1], lb[2][1]], "None"];
                  flip = true;
                }
              }
            }
          }
        }

        if (!Array.isArray(rt)) {
          rt = ["List", rt, "None"];
          flip = true;
        } else if (rt[0] != "List") {
          rt = ["List", rt, "None"];
          flip = true;
        } else if (Array.isArray(rt[2])) {
          if (rt[2][0] == 'List') {
            if (rt[2].length == 3) {
              rt = ["List", rt, "None"];
              flip = true;
            }
          } else if (rt[2][0] == 'HoldForm') {
            if (Array.isArray(rt[2][1])) {
              if (rt[2][1][0] == 'List') {
                if (rt[2][1].length == 3) {
                  rt = ["List", ['List', rt[1], rt[2][1]], "None"];
                  flip = true;
                }
              }
            }
          }
        }

        if (flip) { //flip axes if only plain list is provided
          [rt, lb] = [lb, rt];
        }
      

        if (lb[1] != 'None' && gY) {
          let ref = lb[1];
          //if (ref[0] == "List" && ref.length == 3) ref = [ref[1], ref[2]];

    
      

          await processLabel(ref, gY, {...env}, (text, offsets) => {
          g2d.Text.PutText(gY.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", -margin.left + offsets[0])
          .attr("x", -height/2 + offsets[1])
          .attr("font-size", axesstyle.fontsize)
          .attr("fill", axesstyle.color)
          .attr("text-anchor", "middle")
          , text, axesstyle); 
          }, (node, offsets) => {

          node
          .attr("transform", `rotate(-90) translate(${-height/2 + offsets[1]}, ${-margin.left + offsets[0]})`)
          .attr("font-size", axesstyle.fontsize)
          .attr("fill", axesstyle.color)
          .attr("text-anchor", "middle");

          });
        } 

        if (lb[2] != 'None' && gRY) {

          let ref = lb[2];
          //if (ref[0] == "List" && ref.length == 3) ref = [ref[1], ref[2]];

          await processLabel(ref, gRY, {...env}, (text, offsets) => {
          g2d.Text.PutText(gRY.append("text")
          .attr("x", 0 + offsets[0])
              .attr("y", margin.bottom + offsets[1])
              .attr("font-size", axesstyle.fontsize)
              .attr("fill", axesstyle.color)
              .attr("text-anchor", "middle")
          , text, axesstyle); 
          }, (node, offsets) => {

          node
          .attr("transform", `translate(${offsets[0]}, ${ margin.bottom + offsets[1]})`)
              .attr("font-size", axesstyle.fontsize)
              .attr("fill", axesstyle.color)
              .attr("text-anchor", "middle");

          });


        } 


 
        
        if (rt[2] != 'None' && gTX) {

          let ref = rt[2];
          //if (ref[0] == "List" && ref.length == 3) ref = [ref[1], ref[2]];

          await processLabel(ref, gTX, {...env}, (text, offsets) => {
          g2d.Text.PutText(gTX.append("text")
          .attr("x", width/2 + offsets[0])
          .attr("y", margin.bottom + offsets[1])
          .attr("font-size", axesstyle.fontsize)
          .attr("fill", axesstyle.color)
          .attr("text-anchor", "middle")
          , text, axesstyle); 
          }, (node, offsets) => {

          node
          .attr("transform", `translate(${width/2 + offsets[0]}, ${ margin.bottom + offsets[1]})`)
          .attr("font-size", axesstyle.fontsize)
          .attr("fill", axesstyle.color)
          .attr("text-anchor", "middle");

          });
        }
    

        if (rt[1] != 'None' && gX) {

          let ref = rt[1];
          //if (ref[0] == "List" && ref.length == 3) ref = [ref[1], ref[2]];

          await processLabel(ref, gX, {...env}, (text, offsets) => {
          g2d.Text.PutText(gX.append("text")
          .attr("x", width/2 + offsets[0])
          .attr("y", margin.bottom + offsets[1])
          .attr("font-size", axesstyle.fontsize)
          .attr("fill", axesstyle.color)
          .attr("text-anchor", "middle")
          , text, axesstyle); 
          }, (node, offsets) => {

          node
          .attr("transform", `translate(${width/2 + offsets[0]}, ${ margin.bottom + offsets[1]})`)
          .attr("font-size", axesstyle.fontsize)
          .attr("fill", axesstyle.color)
          .attr("text-anchor", "middle");

          });


        }   
         
        
 
      }

    } 
    //since FE object insolates env already, there is no need to make a copy

      
      if (options.TransitionDuration) {
        env.transitionDuration = await interpretate(options.TransitionDuration, env);
      }

      env.local.xAxis = x;
      env.local.yAxis = y;

      let GUIEnabled = false;


      if (options.Controls || (typeof options.Controls === 'undefined') && !tinyGraph && !mobileDetected) {
        //add pan and zoom
        if (typeof options.Controls === 'undefined') {
          GUIEnabled = true;
          addPanZoom(listenerSVG, svg, env.svg, gX, gY, gTX, gRY, gGX, gGY, xAxis, yAxis, txAxis, ryAxis, xGrid, yGrid, x, y, env);
          
        } else {
          if (await interpretate(options.Controls, env)) {
            GUIEnabled = true;
            addPanZoom(listenerSVG, svg, env.svg, gX, gY, gTX, gRY, gGX, gGY, xAxis, yAxis, txAxis, ryAxis, xGrid, yGrid, x, y, env);
            
          }
        }
      }


      env.local.listenerSVG = listenerSVG;

      env.panZoomEntites = {
        canvas: listenerSVG,
        svg: env.svg,
        left: margin.left + padding.left,
        top: margin.top,
        gX: gX,
        gY: gY,
        gTX: gTX,
        gRY: gRY,
        gGX: gGX,
        gGY: gGY,
        xGrid: xGrid,
        yGrid: yGrid,
        xAxis: xAxis,
        yAxis: yAxis,
        txAxis: txAxis,
        ryAxis: ryAxis,
        x: x,
        y: y
      };

      if (!env.inset && (width >= 160 && height >= 98) && GUIEnabled) ;

      const instancesKeys = Object.keys(env.global.stack);

      await interpretate(options.Prolog, env); 

   
      
      await interpretate(args[0], env);
      
      interpretate(options.Epilog, env);

      

      if (unknownRanges) {
        if (env.reRendered) {
          console.error('Something is wrong with ranges. We could not determine them properly');
          console.warn(env);
          return;
        }

        //throw 'fuck';
        svg.node().style.opacity = 0;
        console.warn('d3.js autoscale! Requires double evaluation!!!');
        //credits https://gist.github.com/mootari
        //thank you, nice guy
        
        

        const xsize = ImageSize[0] - (margin.left + margin.right);
        const ysize = ImageSize[1] - (margin.top + margin.bottom);

        let box = env.svg.node().getBBox();

        console.log([xsize, ysize]);
        console.log(box);

        if (box.width == 0 || box.height == 0) {
          for (let i = 0; i<12; ++i) {
            console.warn('Element is too small... Waiting for CSS reflow');
            console.log([box.width, box.height]);
            await delay(300);
            box = env.svg.node().getBBox();
            if (!(box.width == 0 && box.height == 0)) break;
          }
          if (box.width == 0 && box.height == 0) {
            svg.node().style.opacity = 1;
            console.log(svg.node());
            throw 'Plot range has zero size. Content is hidden probably'
          }
        }

        const plotRange = [[x.invert(box.x), x.invert(box.x + box.width)], [y.invert(box.height+box.y), y.invert(box.height+box.y - box.height)]];

        let aspectRatioEstiamted = (plotRange[1][1]-plotRange[1][0])/(plotRange[0][1]-plotRange[0][0]);
        if (!isFinite(aspectRatioEstiamted) || aspectRatioEstiamted < 0 || aspectRatioEstiamted > 3 || aspectRatioEstiamted < 1.0/3.0) aspectRatioEstiamted = undefined;
        console.warn('Kill all created instances');
        const created = Object.keys(env.global.stack).filter((i) => !instancesKeys.some(o => o === i));

        for (const i of created) {
          env.global.stack[i].dispose();
        }

        svg.remove();
        container.replaceChildren();

        return await g2d.Graphics(args, {...env, plotRange: plotRange, reRendered:true, aspectRatio: aspectRatioEstiamted});

        /*
        const scale = Math.min(xsize / box.width, ysize / box.height);

        console.log(scale);
        
        // Reset transform.
        let transform = d3.zoomTransform(listenerSVG);
        

        
        // Center [0, 0].
        transform = transform.translate(xsize / 2, ysize / 2);
        // Apply scale.
        transform = transform.scale(scale);
        // Center elements.
        transform = transform.translate(-box.x - box.width / 2, -box.y - box.height / 2);

        console.log(transform);
       
        
        reScale(transform, svg, env.svg, gX, gY, gTX, gRY, xAxis, yAxis, txAxis, ryAxis, x, y, env);

        if (env._zoom) {
          env._zoom.transform(listenerSVG, transform);
        }        */

        
      }

      

      return env;
  };

  g2d['Graphics`Serialize'] = async (args, env) => {
    const opts = await core._getRules(args, env);
    let dom = env.element;

    if (opts.TemporalDOM) {
      dom = document.createElement('div');
      dom.style.pointerEvents = 'none';
      dom.style.opacity = 0;
      dom.style.position = 'absolute';

      document.body.appendChild(dom);
    }

    const senv = await interpretate(args[0], {...env, element: dom});
    const str = await serialize(senv.element.firstChild).text();

    Object.values(env.global.stack).forEach((el) => {
      el.dispose();
    });

    if (opts.TemporalDOM) {
      dom.remove();
    }

    return str;
  };

  g2d.Graphics.update = (args, env) => { console.error('root update method for Graphics is not supported'); };
  g2d.Graphics.destroy = (args, env) => { 
    env.local.listenerSVG.remove(); 
    //if (env.local.guiContainer) env.local.guiContainer.remove(); 
    delete env.panZoomEntites;
    //console.error('Nothing to destroy...'); 
  };

  g2d.JoinForm = (args, env) => {
    env.joinform = interpretate(args[0], env);
    console.warn('JoinForm is not implemented!');
  };

  const curve = {};
  curve.BezierCurve = async (args, env) => {
    let points = await interpretate(args[0], env);
    var path = env.path; 

    const x = env.xAxis;
    const y = env.yAxis;

    points = points.map((p) => [x(p[0]), y(p[1])]);

    let indexLeft = points.length - 1;

    if (env.startQ) {
      path.moveTo(...points[0]);
    
      for (let i=1; i<points.length - 2; i+=3) {
          indexLeft -= 3;
          path.bezierCurveTo(...points[i], ...points[i+1], ...points[i+2]); 
      }

      env.startQ = false;
    } else {
      //path.moveTo(...points[0]);
    
      for (let i=0; i<points.length - 2; i+=3) {
          indexLeft -= 3;
          path.bezierCurveTo(...points[i], ...points[i+1], ...points[i+2]); 
      }     
    }


    if (indexLeft > 0) {
      path.quadraticCurveTo(...points[points.length - 2], ...points[points.length -1]);
    }    
  }; 

  g2d.Legended = async (args, env) => {
    throw 'Legended is not supported in the context of Graphics'
  };

  g2d.FaceForm = async (args, env) => {
 
    const copy = {...env, hold: true};
    const res = await interpretate(args[0], copy);

    if (Array.isArray(res)) {
      copy.hold = false;
      for (const i of res) {
        await interpretate(i, copy);
      }
    } 

    env.thickness = copy.thickness;
    env.width = copy.width;
    env.opacity = copy.opacity;
    env.color = copy.color;

  };

  curve.Line = async (args, env) => {
    let points = await interpretate(args[0], env);
    var path = env.path; 

    const x = env.xAxis;
    const y = env.yAxis;

    points = points.map((p) => [x(p[0]), y(p[1])]);

    if (env.startQ) {
      path.moveTo(...points[0]);
      for (let i =1; i<points.length; ++i)
        path.lineTo(...points[i]);      

      env.startQ = false;

      return;
    }

    for (let i =0; i<points.length; ++i)
      path.lineTo(...points[i]);

  };

  g2d.RegularPolygon = async (args, env) => {
    let n = 3;
    let radius = 1;
    let [cx, cy] = [0,0];
    let theta = Math.PI/2.0;
    
    if (args.length == 1) n = await interpretate(args[0], env);

    if (args.length == 2) {
      n = await interpretate(args[1], env);
      radius = await interpretate(args[0], env);
    }

    if (args.length == 3) {
      [cx, cy] = await interpretate(args[0], env);
      n = await interpretate(args[2], env);
      radius = await interpretate(args[1], env);
    }

    if (Array.isArray(radius)) {
      theta += radius[1];
      radius = radius[0];
    }
  
    const line = d3.line()
          .x(function(d) { return env.xAxis(d[0]) })
          .y(function(d) { return env.yAxis(d[1]) });



    
    const angleStep = (2 * Math.PI) / n;

          // Generate points
          const points = d3.range(n).map(i => {
            const angle = theta + i * angleStep; // rotate to start from top
            return [
              cx + radius * Math.cos(angle),
              cy + radius * Math.sin(angle)
            ];
          });


      const object = env.svg.append('path').datum(points)
      .attr("d", line)
      .attr("fill", env.color)
      .attr('fill-opacity', env.opacity)
      .attr('stroke-opacity', env.strokeOpacity || env.opacity)
      .attr("vector-effect", "non-scaling-stroke")
      .attr("stroke-width", env.strokeWidth)
      .attr("stroke", env.stroke || env.color);

      if (env.dasharray) {
        object.attr('stroke-dasharray', env.dasharray.join());
      }  

      env.local.polygon = object;
      return object;    
  };

  g2d.JoinedCurve = async (args, env) => {
    const path = d3.path();
    await interpretate(args[0], {...env, path: path, context: [curve, g2d], startQ: true});
    
    return env.svg.append("path")
    .attr("fill", "none")
    .attr("vector-effect", "non-scaling-stroke")
    .attr('opacity', env.opacity)
    .attr("stroke", env.color)
    .attr("stroke-width", env.strokeWidth)
    .attr("d", path); 
  };  

  g2d.CapForm = () => {};

  g2d.FilledCurve = async (args, env) => {
    const path = d3.path();
    await interpretate(args[0], {...env, path: path, context: [curve, g2d], startQ: true});
    
    return env.svg.append("path")
    .attr("fill", env.color)
    .attr("vector-effect", "non-scaling-stroke")
    .attr('opacity', env.opacity)
    .attr('fill-rule', 'evenodd')
    .attr("stroke", 'none')
    .attr("stroke-width", env.strokeWidth)
    .attr("d", path); 
  };

  const delay = (ms) => {
    return new Promise((res)=>{
      setTimeout(res, ms);
    })
  };

  g2d.Inset = async (args, env) => {
    let pos = [0,0];
    let size; 

    const opts = await core._getRules(args, env);
    const oLength = Object.keys(opts).length;
    
    if (args.length - oLength > 1) pos = (await interpretate(args[1], env));
    let opos;

    if (pos instanceof NumericArrayObject) { // convert back automatically
      pos = pos.normal();
    }

    if (args.length - oLength > 2) opos = await interpretate(args[2], env);
    //if (args.length - oLength > 3) size = await interpretate(args[3], env);

    


    const group = env.svg.append('g');

    const foreignObject = group.append('foreignObject');


    //const foreignObject = foreignObject.append('xhtml:canvas').attr('xmlns', 'http://www.w3.org/1999/xhtml').node();
    const stack = {};
    env.local.stack = stack;

    const copy = {global: {...env.global, stack: stack}, inset:true, element: foreignObject.node(), context: g2d};

    if (args.length - oLength > 3) {
      await interpretate(args[3], env);
    }

    if (opts.ImageSizeRaw) {
      size = opts.ImageSizeRaw;
    }

    if (size) {
      //if (typeof size === 'number') size = [size, size/1.6];
      //size = [Math.abs(env.xAxis(size[0]) - env.xAxis(0)), Math.abs(env.yAxis(size[1]) - env.yAxis(0))];

      foreignObject.attr('width', size[0]);
      foreignObject.attr('height', size[1]);      
      //copy.imageSize = size;
    } 
   
    //const instance = new ExecutableObject('feinset-'+uuidv4(), copy, args[0]);
    //instance.assignScope(copy);
  
    //await instance.execute();   

    let fallback = false; //fallback to EditorView
    if (args[0][0] == 'HoldForm') {
      if (Array.isArray(args[0][1])) {
        if (args[0][1][0] == 'Offload') ; else {
          fallback = true;
        }
      } else {
        fallback = true;
      }
    }
    if (args[0][0] == 'Legended') fallback = true;
 
    try {
      if (!fallback) await interpretate(args[0], copy);
    } catch(err) {
      console.warn(err);
      fallback = true;
    }



    if (fallback) {
      await makeEditorView(args[0], copy);
    }

    const child = foreignObject.node();

    await delay(100);

    
    
    const h = child.offsetHeight || child.firstChild?.offsetHeight || child.firstChild?.height;

    if (h < 10) {
      for (let u=0; u<20; ++u) {
        await delay(300);
        if ((child.offsetHeight || child.firstChild?.offsetHeight || child.firstChild?.height) > 30) break;
      }
    }


    let box = {width: child.offsetWidth || child.firstChild?.offsetWidth || child.firstChild?.width, height: child.offsetHeight || child.firstChild?.offsetHeight || child.firstChild?.height};
    

    if (box.width instanceof SVGAnimatedLength) {
      box.width = box.width.animVal.valueInSpecifiedUnits;
    }

    if (box.height instanceof SVGAnimatedLength) {
      box.height = box.height.animVal.valueInSpecifiedUnits;
    }

    console.warn(box);

    if ((box.width < 1 || !box.width) && box.height > 1) {
      //HACK: check if this is EditorView or similar
      console.warn('cm-scroller hack');
      await delay(100);
      const content = child.getElementsByClassName('cm-scroller');
      if (content.length > 0) {
        box.width = content[0].firstChild.offsetWidth;
        const h = content[0].firstChild.offsetHeight;
        if (h) box.height = Math.max(h, box.height);
      } else {
        box.width = box.height * 1.66;
      }
    }

    if (!size) {
      foreignObject.attr('width', box.width);
      foreignObject.attr('height', box.height); 
      //size = [box.width, box.height];     
    }


    if ('ViewMatrix' in opts) {
      if (!opts.ViewMatrix) {
        foreignObject.attr('x', 0);
        foreignObject.attr('y', 0); 

        return group;
      }
    }

    env.local.box = box;

 
    if (!opos || typeof opos == 'string') {
      switch(opos) {
        case 'Top':
          opos = [box.width/2, box.height];
        break;

        case 'Bottom':
          opos = [box.width/2, 0];
        break;

        case 'Left':
          opos = [0, box.height/2];
        break;

        case 'Right':
          opos = [box.width, box.height/2];
        break;

        default:
          opos = [box.width/2, box.height/2];
      }
      
      if (!pos) pos = [0,0];

      foreignObject.attr('x', env.xAxis(pos[0]) - opos[0])
                 .attr('y', env.yAxis(pos[1]) + opos[1] - box.height);

    } else {

      foreignObject.attr('x', env.xAxis(pos[0]) - opos[0])
                 .attr('y', env.yAxis(pos[1]) + opos[1] - box.height);

      //opos = [Math.abs(env.xAxis(opos[0]) - env.xAxis(0)), -Math.abs(env.yAxis(opos[1]) - env.yAxis(0))];
    }

  
    env.local.foreignObject = foreignObject;

    env.local.opos = opos;

    group.attr('opacity', env.opacity);
    if (env.opacityRefs) {
      env.opacityRefs[env.root.uid] = env.root;
    }

    env.local.group = group;

    
    return group;
  };

  g2d.Inset.update = async (args, env) => {
    let pos = await interpretate(args[1], env);

    if (pos instanceof NumericArrayObject) { // convert back automatically
      pos = pos.normal();
    }

    const opos = env.local.opos;
    const f = env.local.foreignObject;

    if (f)
    f.attr('x', env.xAxis(pos[0]) - opos[0])
     .attr('y', env.yAxis(pos[1]) + opos[1] - env.local.box.height);

    return f;
   
  };

  g2d.Inset.updateOpacity = (args, env) => {
    env.local.group.attr("opacity", env.opacity);    
  };

  g2d.Inset.destroy = async (args, env) => {
    if (env.opacityRefs) {
      delete env.opacityRefs[env.root.uid];
    }

    if(env.local.stack) Object.values(env.local.stack).forEach((el) => {
      if (!el.dead) el.dispose();
    });

    env.local.group?.remove();
  };

  g2d.Inset.virtual = true;

  const serialize = (svg) => {
    const xmlns = "http://www.w3.org/2000/xmlns/";
    const xlinkns = "http://www.w3.org/1999/xlink";
    const svgns = "http://www.w3.org/2000/svg";

    svg = svg.cloneNode(true);
    const fragment = window.location.href + "#";
    const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      for (const attr of walker.currentNode.attributes) {
        if (attr.value.includes(fragment)) {
          attr.value = attr.value.replace(fragment, "#");
        }
      }
    }
    svg.setAttributeNS(xmlns, "xmlns", svgns);
    svg.setAttributeNS(xmlns, "xmlns:xlink", xlinkns);
    const serializer = new window.XMLSerializer;
    const string = serializer.serializeToString(svg);
    return new Blob([string], {type: "image/svg+xml"});
  };

  const addPanZoom = (listener, raw, view, gX, gY, gTX, gRY, gGX, gGY, xAxis, yAxis, txAxis, ryAxis, xGrid, yGrid, x, y, env) => {


      console.log({listener, raw, view, gX, gY, gTX, gRY, xAxis, yAxis, txAxis, ryAxis, xGrid, yGrid, x, y, env});
      const zoom = d3.zoom().filter(filter).on("zoom", zoomed);
   
      listener.call(zoom);
      
      env._zoom = zoom;

      const resetZoom = () => {
        const transform = d3.zoomIdentity;
        
        listener.call(zoom.transform, transform);
        
        view.attr("transform", transform);

        if (gX) gX.call(xAxis.scale(x));
        if (gY) gY.call(yAxis.scale(y));
      
        if (gTX) gTX.call(txAxis.scale(x));
        if (gRY) gRY.call(ryAxis.scale(y));

        if (gGX) gGX.call(xGrid(x));
        if (gGY) gGY.call(yGrid(y));
      
        env.onZoom.forEach((h) => h(transform));
      };

      env._resetZoom = resetZoom;

      listener.node().addEventListener('contextmenu', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (window.electronAPI) {
          const res = await window.electronAPI.createMenu([
             {label:'Reset axes', ref:'reset'},
          ]);
          if (res === 'reset') {
            resetZoom();
          }
        } else {
          resetZoom();
        }
      });      

      function zoomed({ transform }) {
        
        view.attr("transform", transform);

        // Rescale axes
        const newX = transform.rescaleX(x);
        const newY = transform.rescaleY(y);

        if (gX) gX.call(xAxis.scale(newX));
        if (gY) gY.call(yAxis.scale(newY));
      
        if (gTX) gTX.call(txAxis.scale(newX));
        if (gRY) gRY.call(ryAxis.scale(newY));

        // Update grid lines
        if (gGX) gGX.call(xGrid(newX));
        if (gGY) gGY.call(yGrid(newY));
      
        env.onZoom.forEach((h) => h(transform));
      }
  
    
      // prevent scrolling then apply the default filter
      function filter(event) {
        event.preventDefault();
        return (!event.ctrlKey || event.type === 'wheel') && !event.button;
      }    
  };

  g2d.Texture = async (args, env) => {
    const image = await interpretate(args[0], {...env, offscreen: true});
    console.log('got it!');

    const img = await createImageBitmap(image);
    image.remove();


    const getter = (gl) => {
      if (!env.local.texture) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        env.local.texture = twgl.createTexture(gl, {
          src: img,
          flipY: false,
          minMag: gl.LINEAR, // Linear filtering
        });
        return env.local.texture;
      }

      return env.local.texture;
    };

    env.local.img = img;
    env.exposed.texture = {image: img, get: getter};

    
    return img;
  };

  g2d.Texture.destroy = (args, env) => {
    env.local.img.close();
  };

  g2d.Texture.virtual = true;

  g2d.SVGAttribute = async (args, env) => {
    const attrs = await core._getRules(args, env);
    let obj = await interpretate(args[0], env);
    
    Object.keys(attrs).forEach((a)=> {
      obj = obj.attr(a, attrs[a]);
    });

    env.local.object = obj;
    return obj;
  };

  g2d.SVGAttribute.update = async (args, env) => {
    const attrs = await core._getRules(args, env);
    //skipping evaluation of the children object
    let obj = env.local.object.maybeTransition(env.transitionType, env.transitionDuration);
    
    Object.keys(attrs).forEach((a)=> {
      obj = obj.attr(a, attrs[a]);
    });

    return obj;
  };  

  g2d.SVGAttribute.destroy = async (args, env) => {
    console.log('SVGAttribute: nothing to destroy');
  };

  g2d.SVGAttribute.virtual = true;


  g2d.LABColor =  async (args, env) => {
    let lab;
    if (args.length > 1)
      lab = [await interpretate(args[0], env), await interpretate(args[1], env), await interpretate(args[2], env)];
    else 
      lab = await interpretate(args[0], env);

    
    const color = default_1({luminance: 100*lab[0], a: 100*lab[1], b: 100*lab[2]});
    //console.log(lab);
    //console.log('LAB color');
    //console.log(color);
    
    env.color = "rgb("+Math.floor(color.red)+","+Math.floor(color.green)+","+Math.floor(color.blue)+")";
    if (args.length > 3) env.opacity = await interpretate(args[3], env);
    
    return env.color;   
  };

  g2d.LABColor.update = () => {};
 // g2d.LABColor.destroy = () => {}

 g2d.arrowGenerator = undefined;

 let arrow1;

 //[FIXME] curves are not supported!
 g2dComplex.BezierCurve = async (args, env) => {
  const data  = await interpretate(args[0], env);
  return data.filter((el) => !Array.isArray(el));
 };

 g2dComplex.Arrow = async (args, env) => {

  await interpretate.shared.d3.load();
  if (!arrow1) arrow1 = (await interpretate.shared.d3['d3-arrow']).arrow1;

  let data = await interpretate(args[0], env);


  if (!Array.isArray(data)) {
    //if not a numerical data, but some other curves
    let object;
    const uid = uuidv4();
    const arrow = arrow1()
    .id(uid)
    .attr("fill", env.color)
    .attr("stroke", "none").scale([env.arrowHead]);
  
    env.svg.call(arrow);

    object = data.attr("marker-end", "url(#"+uid+")");

    return object;
  }


  //difference case for verices

  if (!data[0][0]) {
      const uid = uuidv4();
      const arrow = arrow1()
      .id(uid)
      .attr("fill", env.color)
      .attr("stroke", "none").scale([env.arrowHead]);
    
      env.svg.call(arrow);


      const object = env.svg.append("path")
      .datum(data.map((index) => env.wgl.fallbackVertices[index-1]))
      .attr("fill", "none")
      .attr("vector-effect", "non-scaling-stroke")
      .attr('opacity', env.opacity)
      .attr("stroke", env.color)
      .attr("stroke-width", env.strokeWidth)
      .attr("d", d3.line()
        .x(function(d) { return d[0] })
        .y(function(d) { return d[1] })
        ).attr("marker-end", "url(#"+uid+")"); 

      return object;
    } else {

      console.log('Multiple isntances');
      console.log(data);

      const gr = env.svg.append("g");
      gr.attr("fill", "none")
      .attr('opacity', env.opacity)
      .attr("stroke", env.color)
      .attr("stroke-width", env.strokeWidth);

      const uid = uuidv4();
      const arrow = arrow1()
      .id(uid)
      .attr("fill", env.color)
      .attr("stroke", "none").scale([env.arrowHead]);
      env.svg.call(arrow);  

      data.forEach((dt) => {
              
        gr.append("path")
        .datum(dt.map((index) => env.wgl.fallbackVertices[index-1]))
        .attr("vector-effect", "non-scaling-stroke")
        .attr("d", d3.line()
          .x(function(d) { return d[0] })
          .y(function(d) { return d[1] })
          ).attr("marker-end", "url(#"+uid+")");      });

      return gr;
    }
 };

    

 g2d.Arrow = async (args, env) => {
   await interpretate.shared.d3.load();
   if (!arrow1) arrow1 = (await interpretate.shared.d3['d3-arrow']).arrow1;

   const x = env.xAxis;
   const y = env.yAxis;

   const uid = uuidv4();

   const arrow = arrow1(-(env.strokeWidth - 1.5)*1.5)
   .id(uid)
   .attr("fill", env.color)
   .attr("stroke", "none").scale([env.arrowHead]);

   env.local.marker = uid;
   //env.normalForm = true; //convert all numeric arrays to a normal form
   env.svg.call(arrow);

   let path = await interpretate(args[0], env);
   if (path instanceof NumericArrayObject) { // convert back automatically
    path = path.normal();
   }

   if (!Array.isArray(path)) {
    //if not a numerical data, but some other curves
    let object;
    let shift = 0;
    if (args.length > 1) {
      shift = await interpretate(args[1], env);
      shift = Math.max(Math.abs(x(shift)-x(0)), Math.abs(y(shift)-y(0)));


      const arr = d3.select(document.getElementById(uid));
      arr.attr('refX', parseFloat(arr.attr('refX')) + shift);
    }

    object = path.attr("marker-end", "url(#"+uid+")");
    

    return object;
  }



   env.local.line = d3.line()
     .x(function(d) { return env.xAxis(d[0]) })
     .y(function(d) { return env.yAxis(d[1]) });

  //console.warn(path);

  if (!path[0][0][0] && (typeof path[0][0][0] != 'number')) {
    //console.log('Condtions special');
    //console.warn(path);
     const object = env.svg.append("path")
     .datum(path)
     .attr("vector-effect", "non-scaling-stroke")
     .attr("fill", "none")
     .attr('opacity', env.opacity)
     .attr("stroke", env.color)
     .attr("stroke-width", env.strokeWidth)
     .attr("d", env.local.line
     ).attr("marker-end", "url(#"+uid+")"); 

     env.local.arrow = object;

     if (env.colorRefs) {
      env.colorRefs[env.root.uid] = env.root;
    }
    if (env.opacityRefs) {
      env.opacityRefs[env.root.uid] = env.root;
    }
   
     return object;
  } else {
    const object = [];
    //console.log('Condtions object');

    path.forEach((p) => {
      
      object.push(env.svg.append("path")
      .datum(p)
      .attr("vector-effect", "non-scaling-stroke")
      .attr("fill", "none")
      .attr('opacity', env.opacity)
      .attr("stroke", env.color)
      .attr("stroke-width", env.strokeWidth)
      .attr("d", env.local.line
      ).attr("marker-end", "url(#"+uid+")"));
    });


    env.local.arrows = object;

    return object;

  }



 };

 g2d.Arrow.update = async (args, env) => {
   env.xAxis;
   env.yAxis;


   let path = await interpretate(args[0], env);
   //console.log(path);
   if (path instanceof NumericArrayObject) { // convert back automatically
    path = path.normal();
   }

   //console.log(path);

   if (path[0][0][0]) throw('Arrows update method does not support multiple traces');

   //console.log(env.local);

   const object = env.local.arrow.datum(path).maybeTransitionTween(env.TransitionType, env.TransitionDuration, 'd', function (d) {
    var previous = d3.select(this).attr('d');
    var current = env.local.line(d);
    return interpolatePath(previous, current);
  });
   
   return object;
 };

 const dynSpace = {};

 dynSpace.DynamicName = async (args, env) => {
  const res = await interpretate(args[0], {...env, context: [g2d, dynSpace]});
  const label = await interpretate(args[1], env);
  env.contextSpace.put(label, res);

  return res;
 };

 dynSpace.DynamicLocation = async (args, env) => {
  const label = await interpretate(args[0], env);
  const object = await env.contextSpace.get(label);

  const bbox = object.node().getBBox();
  const pos = [bbox.x + bbox.width/2.0, bbox.y + bbox.height/2.0];

  pos[0] = env.xAxis.invert(pos[0]);
  pos[1] = env.yAxis.invert(pos[1]);

  return pos;
 };

 g2d.DynamicNamespace = async (args, env) => {
  const contextSpace = {
    names: {},
    que: {},
    get: async (name) => {
      if (name in contextSpace.names) {
        return contextSpace.names[name]
      } 

      const promise = new Deferred();
      if (!(name in contextSpace.que))
        contextSpace.que[name] = [];

      contextSpace.que[name].push(promise);

      return promise.promise;
    },
    put: (name, object) => {
      contextSpace.names[name] = object;

      if (name in contextSpace.que) {
        contextSpace.que[name].forEach((p) => p.resolve(object));
      }
    }
  };

  const copy = {...env, contextSpace: contextSpace, context: [dynSpace, g2d], hold:true};
  const list = (await interpretate(args[0], copy));

  const promises = [];
  const groups = [];
  if (Array.isArray(list)) {
    for (const i of list.reverse()) {
      const group = copy.svg.append('g');
      groups.push(group);
      //don't wait, go async we will figure out later
      promises.push(interpretate(i, {...copy, hold:false, svg: group}));
    }
  } else {
    promises.push(list);
  }

  await Promise.all(promises);

  // Re-append groups to reorder them in the DOM
  for (const group of groups) {
    copy.svg.node().prepend(group.node());
  }

  return 
 };

 g2d.Arrow.updateColor = (args, env) => {
  if (typeof env.local.marker == 'string') {
    env.local.marker = d3.select(document.getElementById(env.local.marker).firstChild);
    //throw(env.local.marker.node());
  }
  env.local.marker.attr("fill", env.color);
  if (Array.isArray(env.local.arrows)) {
    env.local.arrows.map((e) => e.attr("stroke", env.color));
  } else {
    env.local.arrow.attr("stroke", env.color);
  }
  
 };

  g2d.Arrow.updateOpacity = (args, env) => {
    if (typeof env.local.marker == 'string') {
      env.local.marker = d3.select(document.getElementById(env.local.marker).firstChild);
    }    
    env.local.marker.attr("opacity", env.opacity);
    if (Array.isArray(env.local.arrows)) {
      env.local.arrows.map((e) => e.attr("opacity", env.opacity));
    } else {
      env.local.arrow.attr("opacity", env.opacity);
    }    
  };

 g2d.Arrow.virtual = true;

 g2d.Arrow.destroy = async (args, env) => {
  if (env.colorRefs) {
    delete env.colorRefs[env.root.uid];
  }

  if (env.opacityRefs) {
    delete env.opacityRefs[env.root.uid];
  }

  if (Array.isArray(env.local.arrows)) {
    env.local.arrows.map((e)=>e.remove);
  } else {
    env.local?.arrow?.remove();
  }

  if (typeof env.local.marker == 'string') {
    const c = document.getElementById(env.local.marker);
    env.local.marker = d3.select(c?.firstChild);
    env.local.marker?.remove();
    c?.remove();
  } else {
    env.local?.marker?.remove();
  }
  
 };  



 g2d.ImageScaled = async (args, env) => {
    const offset = await interpretate(args[0], env);
    return [
      offset[0] * (env.plotRange[0][1] - env.plotRange[0][0]) + env.plotRange[0][0],
      offset[1] * (env.plotRange[1][1] - env.plotRange[1][0]) + env.plotRange[1][0]
    ];
 };

  g2d.Arrowheads = async (args, env) => {
    const head = (await interpretate(args[0], env));
    if (Array.isArray(head)) {
      env.arrowHead = 10.0*(head.flat())[0];
    } else {
      env.arrowHead = 10.0*head;
    }
  };

  //g2d.Arrowheads.destroy = async () => {};

  //g2d.Arrow.destroy = async () => {}
  const textContext = {};  

  textContext.Pane = (args, env) => {
    return interpretate(args[0], env);
  };

  textContext.Framed = (args, env) => {
    return interpretate(args[0], env);
  };

  g2d.DirectedInfinity = () => Infinity;
  g2d.Infinity = () => Infinity;

  textContext.NumberForm = async (args, env) => {
  const isNumeric = (x) => typeof x === "number" && isFinite(x);

  const formatWithPrecision = (num, n) => {
    try {
      const s = Number(num).toPrecision(n);
      return Object.is(num, -0) ? (s.replace(/^0/, "-0")) : s;
    } catch {
      return String(num);
    }
  };

  const formatWithFixed = (num, f) => {
    try {
      const s = Number(num).toFixed(f);
      if (Number(s) === 0 && (1 / Number(num)) === -Infinity) return "-" + s;
      return s;
    } catch {
      return String(num);
    }
  };

  const countDigits = (s) => (s.replace(/[^0-9]/g, "").length);

  // n can be Infinity. If so, always return fixed with f decimals.
  const formatWithNF = (num, n, f) => {
    const fixed = formatWithFixed(num, f);

    if (n === Infinity) return fixed;

    const digits = countDigits(fixed); // excludes sign and decimal point
    if (digits <= n) return fixed;

    // fall back to scientific with n significant digits
    const k = Math.max(0, n - 1); // toExponential(k) => total sig figs = k+1
    let exp;
    try {
      exp = Number(num).toExponential(k);
    } catch {
      return fixed;
    }
    if (Number(exp) === 0 && (1 / Number(num)) === -Infinity && !/^-/.test(exp)) {
      exp = "-" + exp;
    }
    return exp;
  };

  const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);
  const mapDeep = (val, fn) => {
    if (Array.isArray(val)) return val.map((x) => mapDeep(x, fn));
    if (isPlainObject(val)) {
      const out = {};
      for (const k of Object.keys(val)) out[k] = mapDeep(val[k], fn);
      return out;
    }
    return fn(val);
  };

  // Evaluate the expression to format
  const expr = await interpretate(args[0], env);

  // Parse spec: NumberForm[expr], NumberForm[expr, n], NumberForm[expr, {n, f}]
  let mode = "default";
  let n, f;

  if (args.length >= 2) {
    const spec = await interpretate(args[1], env);

    if (Array.isArray(spec) && spec.length >= 2) {
      const nRaw = spec[0];
      const fRaw = spec[1];

      // Support Infinity in multiple shapes
      const nNum = (nRaw === Infinity || nRaw === "Infinity") ? Infinity : Number(nRaw);
      const fNum = Number(fRaw);

      if ((Number.isFinite(nNum) || nNum === Infinity) && Number.isFinite(fNum)) {
        n = nNum;
        f = Math.max(0, Math.floor(fNum));
        mode = "nf";
      }
    } else if (spec === Infinity || spec === "Infinity" || Number.isFinite(Number(spec))) {
      n = (spec === Infinity || spec === "Infinity") ? Infinity : Number(spec);
      mode = "n";
    }
  }

  const formatter = (v) => {
    if (!isNumeric(v)) return v;

    switch (mode) {
      case "n": {
        if (n === Infinity) return v.toString(); // unlimited: show as-is
        return formatWithPrecision(v, Math.max(1, Math.floor(n)));
      }
      case "nf": {
        const nClamped = (n === Infinity) ? Infinity : Math.max(1, Math.floor(n));
        return formatWithNF(v, nClamped, f);
      }
      case "default":
      default:
        return v;
    }
  };

  return mapDeep(expr, formatter);
};


  g2d.Row = () => {
    throw 'Row inside Graphics context is not applicable'
  };




  textContext.Rotate = async (args, env) => {
    env.rotation = await interpretate(args[1], env);
    return await interpretate(args[0], env);
  };  

  const textContextSym = {};

  function detectNumbers(test) {
    //we need to go in depth
    if (!Array.isArray(test)) return false;
    if (test[0] == 'Rational') return true;
    if (test[0] == 'Complex')  return true;
    if (test[0] == 'Times') return true;
    if (test[0] == 'Sqrt') return true;
    if (test[0] == 'Exp') return true;
    if (test[0] == 'Log') return true;
    if (test[0] == 'Power') return true;
    if (test[0] == 'Plus') return true;
  }

  textContextSym.E = async (args, env) => {
    return '𝘦'
  };

  textContextSym.E.update = textContextSym.E;

  textContextSym.Pi = async (args, env) => {
    return 'π'
  };

  textContextSym.Pi.update = textContextSym.Pi;

  textContextSym.Infinity = async (args, env) => {
    return '∞'
  };

  textContextSym.Infinity.update = textContextSym.Infinity;

  textContextSym.Indeterminate = async (args, env) => {
    return '?'
  };

  textContextSym.Indeterminate.update = textContextSym.Indeterminate;

  textContextSym.DirectedInfinity = async (args, env) => {
    return '∞'
  };

  textContextSym.DirectedInfinity.update = textContextSym.DirectedInfinity;

  // Plus[a, b, c, ...]  ->  a + b + c ...
  textContextSym.Plus = async (args, env) => {
    const parts = await Promise.all(args.map(x => interpretate(x, env)));  

    const toNode = v =>
      v instanceof Node
        ? v
        : document.createTextNode(
            v == null
              ? ""
              : (typeof v === "object"
                  ? (() => { try { return JSON.stringify(v); } catch { return String(v); } })()
                  : String(v))
          );  

    const root = document.createElement("span");
    root.style.textWrap = "nowrap";  

    parts.forEach((p, i) => {
      if (i > 0) root.appendChild(document.createTextNode(" + "));
      root.appendChild(toNode(p));
    });  

    return root;
  };

  textContextSym.Plus.update = textContextSym.Plus;

  // Times[a, b, c, ...]  ->  a × b × c ...
  textContextSym.Times = async (args, env) => {
    const parts = await Promise.all(args.map(x => interpretate(x, env)));
    const toNode = v =>
      v instanceof Node
        ? v
        : document.createTextNode(
            v == null
              ? ""
              : (typeof v === "object" ? (() => { try { return JSON.stringify(v); } catch { return String(v); } })() : String(v))
          );

    const root = document.createElement("span");
    root.style.textWrap = "nowrap";
    parts.forEach((p, i) => {
      if (i > 0) root.appendChild(document.createTextNode(" × "));
      root.appendChild(toNode(p));
    });
    return root;
  };

  textContextSym.Times.update = textContextSym.Times;

  // Exp[x]  ->  e^x
  textContextSym.Exp = async (args, env) => {
    const [x] = await Promise.all(args.slice(0, 1).map(a => interpretate(a, env)));
    const toNode = v =>
      v instanceof Node
        ? v
        : document.createTextNode(
            v == null
              ? ""
              : (typeof v === "object" ? (() => { try { return JSON.stringify(v); } catch { return String(v); } })() : String(v))
          );

    const root = document.createElement("span");
    root.style.textWrap = "nowrap";

    const eNode = document.createTextNode("e");
    const sup = document.createElement("sup");
    sup.appendChild(toNode(x));

    root.appendChild(eNode);
    root.appendChild(sup);
    return root;
  };

  textContextSym.Exp.update = textContextSym.Exp;

  // Log[x]           -> ln(x)
  // Log[b, x]        -> log_b(x)  (b as subscript)
  textContextSym.Log = async (args, env) => {
    const vals = await Promise.all(args.slice(0, 2).map(a => interpretate(a, env)));
    const toNode = v =>
      v instanceof Node
        ? v
        : document.createTextNode(
            v == null
              ? ""
              : (typeof v === "object" ? (() => { try { return JSON.stringify(v); } catch { return String(v); } })() : String(v))
          );

    const root = document.createElement("span");
    root.style.textWrap = "nowrap";

    if (vals.length === 1) {
      // ln(x)
      root.appendChild(document.createTextNode("ln("));
      root.appendChild(toNode(vals[0]));
      root.appendChild(document.createTextNode(")"));
    } else {
      // log_b(x)
      const [b, x] = vals;
      root.appendChild(document.createTextNode("log"));
      const sub = document.createElement("sub");
      sub.appendChild(toNode(b));
      root.appendChild(sub);
      root.appendChild(document.createTextNode("("));
      root.appendChild(toNode(x));
      root.appendChild(document.createTextNode(")"));
    }
    return root;
  };

  textContextSym.Log.update = textContextSym.Log;

  // Sqrt[x]  -> √(x)
  textContextSym.Sqrt = async (args, env) => {
    const [x] = await Promise.all(args.slice(0, 1).map(a => interpretate(a, env)));
    const toNode = v =>
      v instanceof Node
        ? v
        : document.createTextNode(
            v == null
              ? ""
              : (typeof v === "object" ? (() => { try { return JSON.stringify(v); } catch { return String(v); } })() : String(v))
          );

    const root = document.createElement("span");
    root.style.textWrap = "nowrap";
    root.classList.add('sqroot');
    const rad = document.createElement('span');
    rad.classList.add('radicant');
    root.appendChild(rad.appendChild(toNode(x)));
    return root;
  };

  textContextSym.Sqrt.update = textContextSym.Sqrt;

  // Power[base, exp]  -> base^exp
  textContextSym.Power = async (args, env) => {
    const exp = await interpretate(args[1], {...env, compact:true});
    const base = await interpretate(args[0], env);
    //const [base, exp] = await Promise.all(args.slice(0, 2).map(a => interpretate(a, env)));
    
    const toNode = v =>
      v instanceof Node
        ? v
        : document.createTextNode(
            v == null
              ? ""
              : (typeof v === "object" ? (() => { try { return JSON.stringify(v); } catch { return String(v); } })() : String(v))
          );

    const root = document.createElement("span");
    root.style.textWrap = "nowrap";

    root.appendChild(toNode(base));
    const sup = document.createElement("sup");
    sup.style.lineHeight = 'unset';
    sup.style.top = '-0.25rem';
    sup.style.marginLeft = '0.05rem';
    sup.style.fontSize = '50%';
    sup.appendChild(toNode(exp));
    root.appendChild(sup);

    return root;
  };

  textContextSym.Power.update = textContextSym.Power;


  textContextSym.Complex = async (args, env) => {
    const [a, b] = await Promise.all(args.slice(0, 2).map(x => interpretate(x, env)));
    const root = document.createElement("span");
    root.style.textWrap = 'nowrap';

    if (a != 0) {
      if (a instanceof HTMLElement) {
        root.appendChild(a);
      } else {
        root.appendChild(document.createTextNode(a));
      }

      if (b != 0) root.appendChild(document.createTextNode(' + '));
    }

    if (b != 0) {
      if (b == 1) {
        root.appendChild(document.createTextNode('i'));
      } else {
        root.appendChild(document.createTextNode('i '));

        if (b instanceof HTMLElement) {
          root.appendChild(b);
        } else {
          root.appendChild(document.createTextNode(b));
        }
      }
    }
    return root;
  };

  textContextSym.Complex.update = textContextSym.Complex;

  textContextSym.Rational = async (args, env) => {
    const [a, b] = await Promise.all(args.slice(0, 2).map(x => interpretate(x, env)));
    const toNode = v =>
      v instanceof Node
        ? v
        : document.createTextNode(
            v == null
              ? ""
              : (typeof v === "object" ? (() => { try { return JSON.stringify(v); } catch { return  String(v); } })() : String(v))
          );

    const root = document.createElement("span");
    if (env.compact) {
      root.appendChild(toNode(a));
      root.appendChild(document.createTextNode('/'));
      root.appendChild(toNode(b));      
    } else {
      root.className = "fraction";
      root.innerHTML = `
        <table class="container" style="text-wrap: nowrap;">
          <tbody>
            <tr><td class="enumenator"></td></tr>
            <tr><td></td></tr>
          </tbody>
        </table>`;

      const [tdNum, tdDen] = root.querySelectorAll("td");
      tdNum.appendChild(toNode(a));
      tdDen.appendChild(toNode(b));
    }

    return root;
  };

  textContextSym.Rational.update = textContextSym.Rational;



  g2d.BaseStyle = () => 'BaseStyle';

  g2d.Text = async (args, env) => {
    const copy = {...env};
    copy.context = [textContext, g2d];

    let text = args[0];
    
    try {
      if (detectNumbers(text)) {
        copy.context.unshift(textContextSym);
        text = await interpretate(args[0], copy);
      } else {
        text = await interpretate(args[0], copy);
        env.local.text = text;
      }
    } catch(err) {
      console.warn('Error in interpreting input argument of Text. Is it an undefined variable?');
      env.local.object = {
        remove: () => {}
      };

      env.local.text = "";
      return await g2d.Inset([args[0], args[1]], {...env});
    }

    let coords = await interpretate(args[1], env);

    const opts = await core._getRules(args, {...env, hold: true});

    if (coords instanceof NumericArrayObject) { // convert back automatically
      coords = coords.normal();
    }

    let globalOffset = {x: 0, y: 0};

    if (opts.BaseStyle == "'Graphics'") {
      copy.color = 'black';
    }

    let object;
    
    if (text instanceof HTMLElement) {
      env.local.htmlQ = true;

      const selected = d3.select(text).style("font-family", copy.fontfamily)
        .style("font-size", copy.fontsize+'px')
        .style("opacity", copy.opacity)
        .style("color", copy.color);

      if (copy.fontweight) selected.style("font-weight", copy.fontweight);

      object = env.svg.append('foreignObject').attr('style', 'overflow: visible');
      object.node().appendChild(text);
      const child = object.node();

      //if (child.offsetHeight || child.firstChild?.offsetHeight || child.firstChild?.height) {
        const h = child.offsetHeight || child.firstChild?.offsetHeight || child.firstChild?.height;
        const w = (child.offsetWidth || child.firstChild?.offsetWidth || child.firstChild?.width);
        object.attr('width', w).attr('height', h);

        globalOffset.x = -Math.round(w/2); 
        globalOffset.y = -Math.round(h/2); 
      //}  
      
    } else {
      object = env.svg.append('text').attr("font-family", copy.fontfamily)
        .attr("font-size", copy.fontsize)
        .attr("opacity", copy.opacity)
        .attr("fill", copy.color);
      
      if (copy.fontweight) object.attr("font-weight", copy.fontweight);
    }

    

    //(args);

    if (args.length > 2) {
      
      let offset = [0,0];
      
      if (args[2][0] != 'Rule') offset = (await interpretate(args[2], {...env, plotRange:[[-1,1], [-1,1]]})).map((el => Math.round(el)));



      //console.error(offset);
      //console.error(globalOffset);


      const px = env.xAxis(coords[0]) + globalOffset.x;
      const py = env.yAxis(coords[1]) + globalOffset.y;

      object.attr("x", px).attr("y", py);

      if (copy.rotation) {
        const deg = Math.round(copy.rotation * 180 / Math.PI);
        object.attr("transform", `rotate(${deg}, ${px}, ${py})`);
      }

      if (offset[0] === 0) {
        object.attr("text-anchor", "middle");
      } else if (offset[0] > 0) {
        object.attr("text-anchor", "end");
      } else if (offset[0] < 0) {
        object.attr("text-anchor", "start");
      }
      
      if (offset[1] === 0) {
        object.attr("alignment-baseline", "middle");
      } else if (offset[1] > 0) {
        object.attr("alignment-baseline", "hanging");
      } else if (offset[1] < 0) {
        object.attr("alignment-baseline", "text-after");
      }        


    } else {

      const px = env.xAxis(coords[0]) + globalOffset.x;
      const py = env.yAxis(coords[1]) + globalOffset.y;

      object.attr("x", px).attr("y", py);

      if (copy.rotation) {
        const deg = Math.round(copy.rotation * 180 / Math.PI);
        object.attr("transform", `rotate(${deg}, ${px}, ${py})`);
      }

    }

    g2d.Text.PutText(object, text, env);

    env.local.object = object;

    if (env.colorRefs) {
      env.colorRefs[env.root.uid] = env.root;
    }
    if (env.opacityRefs) {
      env.opacityRefs[env.root.uid] = env.root;
    }

    return object;
  };

  g2d.Text.PutText = (object, raw, env) => {
    //parse the text
    if (!raw) return;
    let text = raw;
    if (typeof raw  === 'number') text = raw.toString();
    if (typeof text !=  'string') return;
    

    const tokens = [g2d.Text.TokensSplit(text.replaceAll(/\\([a-zA-z]+)/g, g2d.Text.GreekReplacer), g2d.Text.TextOperators)].flat(Infinity);


    object.html(tokens.shift());

    let token;
    let dy = 0;
    while((token = tokens.shift()) != undefined) {
      if (typeof token === 'string') {
        object.append('tspan').html(token).attr('font-size', env.fontsize).attr('dy', -dy);
        dy = 0;
      } else {
        dy = -env.fontsize*token.ky;
        object.append('tspan').html(token.data).attr('font-size', Math.round(env.fontsize*token.kf)).attr('dy', dy);
      }
    }
  };

  g2d.Text.TextOperators = [
    {
      type: 'sup',
      handler: (a) => a,
      regexp: /\^{([^{|}]*)}/,
      meta: {
        ky: 0.4,
        kf: 0.7
      }      
    },
    {
      type: 'sub',
      handler: (a) => a,
      regexp: /\_{([^{|}]*)}/,
      meta: {
        ky: -0.25,
        kf: 0.7
      }
    }  
  ];
  
  g2d.Text.GreekReplacer = (a, b, c) => {
    return "&" +
        b
          .toLowerCase()
          .replace("sqrt", "radic")
          .replace("degree", "deg") +
        ";";
  };
  
  g2d.Text.TokensSplit = (str, ops, index = 0) => {
    if (index === ops.length || index < 0) return str;
    const match = str.match(ops[index].regexp);
    if (match === null) return g2d.Text.TokensSplit(str, ops, index + 1);
    const obj = {type: ops[index].type, data: ops[index].handler(match[1]), ...ops[index].meta};
    return [g2d.Text.TokensSplit(str.slice(0, match.index), ops, index + 1), obj, g2d.Text.TokensSplit(str.slice(match.index+match[0].length), ops, 0)]
  };  

  g2d.Text.virtual = true;

  g2d.Text.updateColor = (args, env) => {
    env.local.object.attr("fill", env.color);
  };

  g2d.Text.updateOpacity = (args, env) => {
    env.local.object.attr("opacity", env.opacity);
  };  

  g2d.Text.update = async (args, env) => {
    let text;
    let coords = await interpretate(args[1], env);

    if (coords instanceof NumericArrayObject) { // convert back automatically
      coords = coords.normal();
    }


    if (env.local.htmlQ) {
      console.error('Update method for symbol-like elements is not supported in Text[]');
    } else {
      text = await interpretate(args[0], env);

      let trans;

      if (env.local.text != text) {
        trans = env.local.object
        .maybeTransition(env.transitionType, env.transitionDuration)
        .text(text)
        .attr("x", env.xAxis(coords[0]))
        .attr("y", env.yAxis(coords[1]));
      } else {
        trans = env.local.object
        .maybeTransition(env.transitionType, env.transitionDuration)
        .attr("x", env.xAxis(coords[0]))
        .attr("y", env.yAxis(coords[1]));
      }



      return trans;      
    }

  };   


  g2d.Text.destroy = (args, env) => {
    env.local.object.remove();
    delete env.local.object;

    if (env.colorRefs) {
      delete env.colorRefs[env.root.uid];
    }
    if (env.opacityRefs) {
      delete env.opacityRefs[env.root.uid];
    }
  };


  //g2d.Text.destroy = async (args, env) => {
    //for (const o of args) {
      //await interpretate(o, env);
    //}
  //}

  //transformation context to convert fractions and etc to SVG form
  g2d.Text.subcontext = {};
  //TODO

  g2d.FontSize = () => "FontSize";
  //g2d.FontSize.destroy = g2d.FontSize
  g2d.FontSize.update = g2d.FontSize;
  g2d.FontFamily = () => "FontFamily";
  //g2d.FontFamily.destroy = g2d.FontFamily
  g2d.FontFamily.update = g2d.FontFamily;
  
  g2d.Bold = () => "Bold";
  g2d.Bold.update = () => "Bold";

  g2d.Style = async (args, env) => {
    const copy = env;
    const options = await core._getRules(args, env);
    
    if (options.FontSize) {
      copy.fontsize = options.FontSize;
    }  

    if (options.FontColor) {
      copy.color = options.FontColor;
    }
  
    if (options.FontFamily) {
      copy.fontfamily = options.FontFamily;
    } 

    for(let i=1; i<(args.length - Object.keys(options).length); ++i) {
      const res = await interpretate(args[i], copy);
      if (res == 'Bold') copy.fontweight = 'bold';
    }
  
    return await interpretate(args[0], copy);
  };

  //g2d.Style.destroy = async (args, env) => {
    //const options = await core._getRules(args, env);  
   // return await interpretate(args[0], env);
  //}  
  
  g2d.Style.update = async (args, env) => {
    const options = await core._getRules(args, env);
    
    if (options.FontSize) {
      env.fontsize = options.FontSize;
    }  
  
    if (options.FontFamily) {
      env.fontfamily = options.FontFamily;
    } 
  
    return await interpretate(args[0], env);
  };  

  g2d.AnimationFrameListener = async (args, env) => {
    await interpretate(args[0], env);
    const options = await core._getRules(args, {...env, hold:true});
    env.local.event = await interpretate(options.Event, env);
    
    env.local.fire = () => {
      server.kernel.io.poke(env.local.event);
      performance.now();
    };

    /*if (options.Timeout) {
      const timeout = await interpretate(options.Timeout, env);
      env.timer = setInterval(() => {
        t = performance.now();
        if (t - lastStamp > timeout) {
          env.local.fire();
          console.warn('Violation of AnimationFrameListener interval. Took more than: ' + timeout + ' ms');
        }
      }, timeout);
    }*/

    window.requestAnimationFrame(env.local.fire);
  };

  g2d.AnimationFrameListener.update = async (args, env) => {
    window.requestAnimationFrame(env.local.fire);
  };

  g2d.AnimationFrameListener.destroy = async (args, env) => {
    console.warn('AnimationFrameListener does not exist anymore');
    if (env.timer) clearInterval(env.timer);
  };

  g2d.AnimationFrameListener.virtual = true;


  function replaceCanvasWithImage(gl) {
    // Get WebGL canvas
    const webglCanvas = gl.canvas;

    // Convert WebGL canvas to an image data URL
    const dataURL = webglCanvas.toDataURL("image/png");

    // Create an image element
    const img = new Image();
    img.src = dataURL;
    img.width = webglCanvas.width;
    img.height = webglCanvas.height;
    img.style.padding = 0;

    // Replace the WebGL canvas with the image
    const parent = webglCanvas.parentNode;
    parent.replaceChild(img, webglCanvas);

    return img;
  }

  function cleanupWebGL(gl) {
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) {
        ext.loseContext();
    }
  }

  const vs = `
    attribute vec2 position;
    uniform vec2 u_resolution;
    uniform bool u_vertexColor;
    uniform bool u_vertexTexture;
    uniform float u_pointSize;
    attribute vec4 color;
    varying vec4 v_color;

    attribute vec2 texcoord;
    varying vec2 v_texcoord;
    

    void main() {
        vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        if (u_vertexColor) v_color = color;  // Pass color to fragment shader
        if (u_vertexTexture) v_texcoord = texcoord; // Pass texture (if applicable)
        gl_PointSize = u_pointSize;
    }
  `;

  // Fragment Shader
  const fs = `
    precision mediump float;
    uniform vec4 u_color;
    uniform bool u_vertexColor;
    uniform bool u_vertexTexture;
    varying vec4 v_color;

    uniform sampler2D u_texture;
    varying vec2 v_texcoord;

    void main() {
        if (u_vertexColor) {
          gl_FragColor = v_color;
          return;
        }

        if (u_vertexTexture) {
          gl_FragColor = texture2D(u_texture, v_texcoord);
          return;
        }    
        
        gl_FragColor = u_color;
    }
  `;

  var twgl;
  
  g2d.GraphicsComplex = async (args, env) => {
    if (!twgl) twgl = (await import('./twgl.module-829cd4fc.js'));

    const dpi = 1.0; ///window.devicePixelRatio; (*no idea how to handle upscalling *)

    const vertices = (await interpretate(args[0], env)).map((p) => {
      return [env.xAxis(p[0]), env.yAxis(p[1])]; //[TODO] move to GPU!!!!!
    });

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const [x, y] of vertices) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    
    //const boundingBox = [[minX, minY], [maxX, maxY]];

    env.local.rect = env.svg.append('rect')
      .attr('x', minX)
      .attr('y', minY)
      .attr('width', maxX - minX)
      .attr('height', maxY - minY)
      .attr('opacity', 0); //Transparent rect to hold the place

    
    
    const opts = await core._getRules(args, env);
    const copy = {...env, context: [g2dComplex, g2d]};

    


    const canvas = env.svg.append('foreignObject').attr('width', env.clipWidth).attr('height', env.clipHeight).append('xhtml:canvas');
    canvas.attr('width', Math.round(env.clipWidth*dpi)).attr('height', Math.round(env.clipHeight*dpi));
    const gl = canvas.node().getContext('webgl', {
      premultipliedAlpha: false
      // Other configurations
    });

    const programInfo = twgl.createProgramInfo(gl, [vs, fs]);
    const ext = gl.getExtension('OES_element_index_uint');
    if (!ext) {
      console.error('TWGL: need OES_element_index_uint');

    }
    twgl.addExtensionsToContext(gl);

    copy.wgl = {gl, programInfo};

    copy.wgl.fallbackVertices = vertices;

    const opacity = env.opacity;

    const linearBuffers = {
      position: { numComponents: 2, data: vertices.flat(Infinity).map((e) => e*dpi) },
    };


    if (opts.VertexColors) {
      let vertexColors = [];

      copy.wgl.vertexColors = true;
      copy.wgl.fallbackColors = opts.VertexColors;

      switch(opts.VertexColors[0].length) {
        case 3:
          for (let i=0; i<opts.VertexColors.length; ++i) { //[TODO] move to GPU!!!!!
            const c = opts.VertexColors[i];
            vertexColors.push(...c, opacity);
          }
        break;

        case 4:
          vertexColors = opts.VertexColors.flat(Infinity);
        break;

        default:
          if (typeof opts.VertexColors[0] == 'string') { //[TODO] move to GPU!!!!!
            console.warn('FIXME: This is the worst case');
            
            for (let i=0; i<opts.VertexColors.length; ++i) {
              const c = d3.color(opts.VertexColors[i]);
              vertexColors.push(c.r/255.0, c.g/255.0, c.b/255.0, opacity);
            }            
          }
      }



      linearBuffers.color = {numComponents: 4, data: vertexColors};
    }

    //console.warn(vertexColors);


    if (opts.VertexTextureCoordinates) {
      const uv = opts.VertexTextureCoordinates.flat(Infinity);
      linearBuffers.texcoord = { numComponents: 2, data: uv};

      copy.wgl.vertexTexture = true;
    }

    

    const sharedBufferInfo = twgl.createBufferInfoFromArrays(gl, linearBuffers);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    

    gl.useProgram(programInfo.program);

    gl.enable(gl.BLEND);

    twgl.setBuffersAndAttributes(gl, programInfo, sharedBufferInfo);

    


    

    await interpretate(args[1], copy);

    const img = replaceCanvasWithImage(gl);
    cleanupWebGL(gl);

    img.style.opacity = env.opacity;

    env.local.img = img;

    if (env.opacityRefs) {
        env.opacityRefs[env.root.uid] = env.root;
    }

    return img;
  };

  g2d.GraphicsComplex.update = () => {
    throw('Updates of GraphicsComplex are not supported!');
  };

  g2d.GraphicsComplex.updateOpacity = (args, env) => {
    env.local.img.style.opacity = env.opacity;
  }; 

  g2d.GraphicsComplex.destroy = (args, env) => {
    if (env.opacityRefs) {
      delete env.opacityRefs[env.root.uid];
    }

    env.local.img.remove();
    env.local.rect.remove();
  };

  g2d.GraphicsComplex.virtual = true; //local memory for updates

  //g2d.GraphicsComplex.destroy = async (args, env) => {
    //await interpretate(args[0], env);
    //await interpretate(args[1], env);
  //}

  g2d.Medium = () => 0.8/10.0;
  g2d.Large = () => 1.1/10.0;
  g2d.Small = () => 0.5/10.0;
  g2d.Tiny = () => 0.2/10.0;

  //DO NOT CHANGE THIS LINE
  g2d.GraphicsGroup = async (args, env) => await interpretate(args[0], env);
  

  g2d.Invisible = async (args, env) => {
    const group = env.svg.append("g");
    group.attr('style', 'visibility:hidden');
    return await interpretate(args[0], {...env, svg: group});
  }; 

  //g2d.GraphicsGroup.destroy = async (args, env) => {
    //await interpretate(args[0], env);
  //}  

  g2d.Thickness = async (args, env) => {
    const t = await interpretate(args[0], env);
    if (typeof t == 'number') env.strokeWidth = t*30.0;
  };

  g2d.AbsoluteThickness = (args, env) => {
    env.strokeWidth = interpretate(args[0], env);
  };

  g2d.PointSize = async (args, env) => {
    env.pointSize = await interpretate(args[0], env);
  };

  g2d.Annotation = async (args, env) => {
    return await interpretate(args[0], {...env})
  };

  g2d.ZoomAt = async (args, env) => {
    let zoom = await interpretate(args[0], env);
    const dims = {

      width: env.xAxis((env.plotRange[0][0] + env.plotRange[0][1])/2.0),
      height: env.yAxis((env.plotRange[1][0] + env.plotRange[1][1])/2.0)
    };

    let translate = [(env.plotRange[0][0] + env.plotRange[0][1])/2.0, -(env.plotRange[1][0] + env.plotRange[1][1])/2.0];
    if (args.length > 1) {
      translate = await interpretate(args[1], env);
    }

    translate = [env.xAxis(translate[0]) , env.yAxis(translate[1]) ];
    console.log(translate);

    const o = env.panZoomEntites;

    console.log(env.svg.attr('transform'));

    const transform = d3.zoomIdentity.translate(dims.width, dims.height).scale(zoom).translate(-translate[0], -translate[1]);
    

    o.svg.maybeTransition(env.transitionType, env.transitionDuration).attr("transform", transform);
    if (o.gX)
      o.gX.maybeTransition(env.transitionType, env.transitionDuration).call(o.xAxis.scale(transform.rescaleX(o.x)));
    if (o.gY)
      o.gY.maybeTransition(env.transitionType, env.transitionDuration).call(o.yAxis.scale(transform.rescaleY(o.y)));

    // Update grid lines
    if (o.gGX) o.gGX.maybeTransition(env.transitionType, env.transitionDuration).call(o.xGrid(transform.rescaleY(o.x)));
    if (o.gGY) o.gGY.maybeTransition(env.transitionType, env.transitionDuration).call(o.yGrid(transform.rescaleY(o.y)));

    if (o.gTX)
      o.gTX.maybeTransition(env.transitionType, env.transitionDuration).call(o.txAxis.scale(transform.rescaleX(o.x)));
    if (o.gRY)
      o.gRY.maybeTransition(env.transitionType, env.transitionDuration).call(o.ryAxis.scale(transform.rescaleY(o.y))); 

    //env.svg.maybeTransition(env.transitionType, env.transitionDuration).call(
      


  };

  const rescaleRanges = (ranges, old, o, env) => {
    throw('not implemented');
  };

  g2d.Directive = async (args, env) => {
    const opts = await core._getRules(args, env);
    for (const o of Object.keys(opts)) {
      env[o.toLowerCase()] = opts[o];
    }

    //rebuild transition structure
    assignTransition(env);

    if ('PlotRange' in opts) {
      //recalculate the plot range
      const ranges = opts.PlotRange;
      rescaleRanges(ranges, env.plotRange, env.panZoomEntites);
    }

    for (let i=0; i<(args.length - Object.keys(opts).length); ++i) {
      await interpretate(args[i], env);
    }
  };

  //g2d.Directive.destroy = g2d.Directive

  g2d.EdgeForm = async (args, env) => {
    const copy = {...env, hold: true};
    const res = await interpretate(args[0], copy);

    if (Array.isArray(res)) {
      copy.hold = false;
      for (const i of res) {
        await interpretate(i, copy);
      }
    } 

    env.strokeWidth = copy.strokeWidth;
    
    env.strokeOpacity = copy.opacity;
    //hack. sorry
    if (copy.color !== 'rgb(68, 68, 68)')
      env.stroke = copy.color;
  };

  g2d.EdgeForm.update = async (args, env) => {

  };

  //g2d.EdgeForm.destroy = async (args, env) => {

  //}

  g2d.Opacity = async (args, env) => {
    env.opacity = await interpretate(args[0], env);
    env.exposed.opacity = env.opacity;

    if (env.root.child) {
      console.log('Dynamic env variable caught');

      const refs = {};
      env.exposed.opacityRefs = refs;
      env.local.refs = refs;
    }
    return env.opacity;
  };

  g2d.Opacity.update = async (args, env) => {
    const opacity = await interpretate(args[0], env);
    //update all mentioned refs
    const refs = Object.values(env.local.refs);
    for (const r of refs) {
      r.execute({method: 'updateOpacity', opacity: opacity});
    }
  };

  g2d.Opacity.destroy = (args, env) => {
    delete env.local.refs;
    //delete env.local;
  };  

  g2d.Opacity.virtual = true;

  g2d.GrayLevel = async (args, env) => {
    let level = await interpretate(args[0], env);
    if (level.length) {
      level = level[0];
    }

    level = Math.floor(level * 255);

    env.color = `rgb(${level},${level},${level})`;
    return env.color;
  };

  g2d.RGBColor = async (args, env) => {
    let colorCss;



    if (args.length == 3 || args.length == 4) {
      colorCss = "rgb(";
      colorCss += String(Math.floor(255 * (await interpretate(args[0], env)))) + ",";
      colorCss += String(Math.floor(255 * (await interpretate(args[1], env)))) + ",";
      colorCss += String(Math.floor(255 * (await interpretate(args[2], env)))) + ")";

    } else {
      let a = await interpretate(args[0], env);
      if (a instanceof NumericArrayObject) { // convert back automatically
        a = a.normal();
       }
      colorCss = "rgb(";
      colorCss += String(Math.floor(255 * a[0])) + ",";
      colorCss += String(Math.floor(255 * a[1])) + ",";
      colorCss += String(Math.floor(255 * a[2])) + ")";      
    }

    if (env.root.child) {
      console.log('Dynamic env variable caught');

      const refs = {};
      env.exposed.colorRefs = refs;
      env.local.refs = refs;
    }

    env.exposed.color = colorCss;

  

    return colorCss;
  };

  g2d.RGBColor.update = async (args, env) => {
    let colorCss;

    if (args.length == 3) {
      colorCss = "rgb(";
      colorCss += String(Math.floor(255 * (await interpretate(args[0], env)))) + ",";
      colorCss += String(Math.floor(255 * (await interpretate(args[1], env)))) + ",";
      colorCss += String(Math.floor(255 * (await interpretate(args[2], env)))) + ")";

    } else {
      let a = await interpretate(args[0], env);
      if (a instanceof NumericArrayObject) { // convert back automatically
        a = a.normal();
       }
      colorCss = "rgb(";
      colorCss += String(Math.floor(255 * a[0])) + ",";
      colorCss += String(Math.floor(255 * a[1])) + ",";
      colorCss += String(Math.floor(255 * a[2])) + ")";      
    }
    

    //update all mentioned refs
    const refs = Object.values(env.local.refs);
    for (const r of refs) {
      r.execute({method: 'updateColor', color: colorCss});
    }
  };

  g2d.RGBColor.destroy = (args, env) => {
    delete env.local.refs;
    //delete env.local;
  };

  //hope it wont lag anythting
  g2d.RGBColor.virtual = true;



  //g2d.RGBColor.destroy = (args, env) => {}
  //g2d.Opacity.destroy = (args, env) => {}
  //g2d.GrayLevel.destroy = (args, env) => {}
  
  //g2d.PointSize.destroy = (args, env) => {}
  //g2d.AbsoluteThickness.destroy = (args, env) => {}
  let hsv2hsl = (h,s,v,l=v-v*s/2, m=Math.min(l,1-l)) => [h,m?(v-l)/m:0,l];

  g2d.Hue = async (args, env) => {
      let color = await Promise.all(args.map(el => interpretate(el, env)));
      if (color.length < 3) {
        color = [color[0], 1,1];
      }
      color = hsv2hsl(...color);
      color = [color[0], (color[1]*100).toFixed(2), (color[2]*100).toFixed(2)];

      env.color = "hsl("+(3.14*100*color[0]).toFixed(2)+","+color[1]+"%,"+color[2]+"%)";

      if (env.root.child) {
        console.log('Dynamic env variable caught');
  
        const refs = {};
        env.exposed.colorRefs = refs;
        env.local.refs = refs;
      }
  
      env.exposed.color = env.color;

      return env.color;

  }; 

  g2d.Hue.update = async (args, env) => {
    let color = await Promise.all(args.map(el => interpretate(el, env)));

    if (color.length < 3) {
      color = [color[0], 1,1];
    }

    color = hsv2hsl(...color);
    color = [color[0], (color[1]*100).toFixed(2), (color[2]*100).toFixed(2)];

    const colorCss = "hsl("+(3.14*100*color[0]).toFixed(2)+","+color[1]+"%,"+color[2]+"%)";

      //update all mentioned refs
      const refs = Object.values(env.local.refs);
      for (const r of refs) {
        r.execute({method: 'updateColor', color: colorCss});
      }
    };

  g2d.Hue.destroy = (args, env) => {
      delete env.local.refs;
      //delete env.local;
  };    

  g2d.Hue.virtual = true;
  
  //g2d.Hue.destroy = (args, env) => {}

  g2d.CubicInOut = () => 'CubicInOut';
  g2d.Linear = () => 'Linear';


  //g2d.Tooltip.destroy = g2d.Tooltip

  g2dComplex.List = core.List; // for speed up searching

  var earcut;

  //not an instance. Just a plain object. Symbols must be bounded to GraphicsComplex
  g2dComplex.Polygon = async (args, env) => {
    let points = await interpretate(args[0], env);
    //console.log(points);
    //if (!env.vertices) throw('No vertices provided!');

    let color = d3.color(env.color);
      color = [color.r/255.0, color.g/255.0, color.b/255.0, env.opacity];

    //if this is a single polygon
    if (!points[0][0]) {
      points = [points];
    }

    

    const {gl, programInfo} = env.wgl;
    let bufferInfo; 
    
    switch(points[0].length) {
      case 3:
        bufferInfo = twgl.createBufferInfoFromArrays(gl, { indices:  points.flat(Infinity).map((index) => index-1)});
      break;

      case 4:
        // Handle Quad (4 points)
        {const temporalBuffer = [];
        for (let i=0; i<points.length; ++i) {
          const p = points[i];
          temporalBuffer.push(
            p[0]-1, p[1]-1, p[2]-1,
            p[0]-1, p[2]-1, p[3]-1
          );
        }

        bufferInfo = twgl.createBufferInfoFromArrays(gl, { 
          indices: temporalBuffer
        });}

      break;

      case 5:
        // Handle Pentagon (5 points)
        {
          const temporalBuffer = [];
          for (let i = 0; i < points.length; ++i) {
            const p = points[i];
            // Triangle fan for 5 vertices (assuming the first point is the center of the fan)
            temporalBuffer.push(
              p[0] - 1, p[1] - 1, p[2] - 1,
              p[0] - 1, p[2] - 1, p[3] - 1,
              p[0] - 1, p[3] - 1, p[4] - 1
            );
          }
      
          bufferInfo = twgl.createBufferInfoFromArrays(gl, {
            indices: temporalBuffer
          });
        }
        break;
      
      case 6:
        // Handle Hexagon (6 points)
        {
          const temporalBuffer = [];
          for (let i = 0; i < points.length; ++i) {
            const p = points[i];
            // Triangle fan for 6 vertices (assuming the first point is the center of the fan)
            temporalBuffer.push(
              p[0] - 1, p[1] - 1, p[2] - 1,
              p[0] - 1, p[2] - 1, p[3] - 1,
              p[0] - 1, p[3] - 1, p[4] - 1,
              p[0] - 1, p[4] - 1, p[5] - 1
            );
          }
      
          bufferInfo = twgl.createBufferInfoFromArrays(gl, {
            indices: temporalBuffer
          });
        }
        break;
    
      default:
        // Handle Arbitrary Polygon (N points)
        // Using earcut triangulation
        const fallbackVertices = env.wgl.fallbackVertices;
        const localIndices = [];
        if (!earcut) earcut = (await import('./earcut-09a28c82.js')).default;

        for (let poly of points) {
          
          poly = poly.map((index)=>index-1);

          const explicitVertices = poly.flatMap((index) => fallbackVertices[index]);
          
          
          localIndices.push(earcut(explicitVertices).map((index) => poly[index]));
          
        }


        bufferInfo = twgl.createBufferInfoFromArrays(gl, { 
          indices: localIndices.flat()
        });
    }
    
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

    if (env.wgl.vertexTexture) {

      if (!env.texture) throw 'Texture is not provided!';


      const texture = env.texture.get(gl);

      twgl.setUniforms(programInfo, {
        u_resolution: [gl.canvas.width, gl.canvas.height],
        u_texture: texture,
        u_vertexTexture: true
      });      

      if (env.wgl.fallbackVertices.length > 65535) {
        gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_INT, 0);
      } else {
        gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
      }
      return;
    }

   

    twgl.setUniforms(programInfo, {
      u_resolution: [gl.canvas.width, gl.canvas.height],
      u_color: color,
      u_vertexColor: Boolean(env.wgl.vertexColors)
    });

    if (env.wgl.fallbackVertices.length > 65535) {
      gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_INT, 0);
    } else {
      gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
    }

    return;
  };

  g2d.Deploy =  (args, env) => {
    return interpretate(args[0], env)
  };

  //this IS an instance
  g2d.Polygon = async (args, env) => {

    let points = await interpretate(args[0], env);

    if (points?.lhs) { //LIMITED SUPPORT
      //if this is a rule. Then this is a polygon with holes

      const line = d3.line()
          .x(function(d) { return env.xAxis(d[0]) })
          .y(function(d) { return env.yAxis(d[1]) });

      let outer = points.rhs;
      let holes = points.lhs; // array of arrays

      if (!Array.isArray(holes[0][0]) && outer.length == 1) {
        holes = [holes];
        outer = outer[0];
      }


      // Convert outer polygon to a closed path
      const outerPath = line([...outer, outer[0]]);

      // Convert each hole to a closed, reversed path
      const holePaths = holes.map(hole => {
        const reversed = [...hole].reverse();
        return line([...reversed, reversed[0]]);
      });

 

      // Combine paths (outer + holes)
      const fullPath = [outerPath, ...holePaths].join("");

      // Append the path to SVG
      env.local.area = env.svg.append("path")
        .attr("d", fullPath)
        .attr("fill", env.color)
        .attr("fill-rule", "evenodd") // This is key for holes!
        .attr("fill-opacity", env.opacity)
        .attr("stroke-opacity", env.strokeOpacity || env.opacity)
        .attr("vector-effect", "non-scaling-stroke")
        .attr("stroke-width", env.strokeWidth)
        .attr("stroke", env.stroke || env.color);
      

      return env.local.area;

    }

    if (points instanceof NumericArrayObject) { // convert back automatically
      points = data.normal();
    }
  
    env.local.line = d3.line()
          .x(function(d) { return env.xAxis(d[0]) })
          .y(function(d) { return env.yAxis(d[1]) });

    if (Array.isArray(points[0][0])) {
      console.log('most likely there are many polygons');
      const object = env.svg.append('g')
      .attr("fill", env.color)
      .attr('fill-opacity', env.opacity)
      .attr('stroke-opacity', env.strokeOpacity || env.opacity)
      .attr("vector-effect", "non-scaling-stroke")
      .attr("stroke-width", env.strokeWidth)
      .attr("stroke", env.stroke || env.color);

      if (env.texture) {
        env.local.area.attr("fill", 'url(#'+env.texture+')');
      }

      if (env.dasharray) {
        object.attr('stroke-dasharray', env.dasharray.join());
      }  

      points.forEach((e) => {
        e.push(e[0]);
        object.append("path")
          .datum(e)
          .attr("d", env.local.line);
      });

      env.local.polygons = object;
      return object;

    }
    
    points.push(points[0]);
    
    
  
    env.local.area = env.svg.append("path")
      .datum(points)
      .attr("fill", env.color)
      .attr('fill-opacity', env.opacity)
      .attr('stroke-opacity', env.strokeOpacity || env.opacity)
      .attr("vector-effect", "non-scaling-stroke")
      .attr("stroke-width", env.strokeWidth)
      .attr("stroke", env.stroke || env.color)
      .attr("d", env.local.line);

      //throw env;

    if (env.texture) {
      env.local.area.attr("fill", 'url(#'+env.texture+')');
    }

      if (env.dasharray) {
        env.local.area.attr('stroke-dasharray', env.dasharray.join());
      } 

    if (env.colorRefs) {
        env.colorRefs[env.root.uid] = env.root;
    }

    if (env.opacityRefs) {
        env.opacityRefs[env.root.uid] = env.root;
    }
    
    return env.local.area;
  };

  g2d.Polygon.updateColor = (args, env) => {
    if (env.local.polygons) {
      for (const p of env.local.polygons) {
        p.attr("fill", env.color);
      }
      return;
    }

    env.local.area.attr("fill", env.color);
  };

  g2d.Polygon.updateOpacity = (args, env) => {
    if (env.local.polygons) {
      for (const p of env.local.polygons) {
        p.attr("fill-opacity", env.opacity);
        p.attr('stroke-opacity', env.strokeOpacity || env.opacity);
      }
      return;
    }

    env.local.area.attr("fill-opacity", env.opacity);
    env.local.area.attr('stroke-opacity', env.strokeOpacity || env.opacity);
  }; 
  
  g2d.Polygon.update = async (args, env) => {
    let points = await interpretate(args[0], env);  

    if (points instanceof NumericArrayObject) { // convert back automatically
      points = points.normal();
    }

    if (env.local.polygons) {
      throw 'update method for many polygons in not supported'
    }    
  
    env.xAxis;
    env.yAxis;
  
    const object = env.local.area
          .datum(points)
          .maybeTransitionTween(env.transitionType, env.transitionDuration, 'd', function (d) {
            var previous = d3.select(this).attr('d');
            var current = env.local.line(d);
            return interpolatePath(previous, current);
          }); 
    
    return object;  
  };
  
  g2d.Polygon.destroy = (args, env) => {
    console.log('area destroyed');

    if (!env.local) return;
    if (env.colorRefs) {
      delete env.colorRefs[env.root.uid];
    }
    if (env.opacityRefs) {
      delete env.opacityRefs[env.root.uid];
    }
    if (env.local.area) {
      env.local.area.remove();
      delete env.local.area;
      return;
    }

    if (env.local.polygons) {
      env.local.polygons.remove();
      delete env.local.polygons;
    }    
  };
  
  g2d.Polygon.virtual = true; //for local memeory and dynamic binding

  g2d.IdentityFunction = async (args, env) => {
    return (await interpretate(args[0], env));
  };

  g2d.StatusArea = g2d.IdentityFunction;

  g2d["Charting`DelayedMouseEffect"] = g2d.IdentityFunction;

  g2dComplex.Line = async (args, env) => {
    //[TODO] fallback

    const data = await interpretate(args[0], env);
        //difference case for verices
    if (!data[0][0]) {

      const object = env.svg.append("path")
      .datum(data.map((index) => env.wgl.fallbackVertices[index-1]))
      .attr("fill", "none")
      .attr("vector-effect", "non-scaling-stroke")
      .attr('opacity', env.opacity)
      .attr("stroke", env.color)
      .attr("stroke-width", env.strokeWidth)
      .attr("d", d3.line()
        .x(function(d) { return d[0] })
        .y(function(d) { return d[1] })
        );
        
        if (env.dasharray) {
          object.attr('stroke-dasharray', env.dasharray.join());
        } 
  
      return object;
    } else {
      const gr = env.svg.append("g");
      gr.attr("fill", "none")
      .attr('opacity', env.opacity)
      .attr("stroke", env.color)
      .attr("stroke-width", env.strokeWidth);
  
      data.forEach((dt) => {
        gr.append("path")
        .datum(dt.map((index) => env.vertices[index-1]))
        .attr("vector-effect", "non-scaling-stroke")
        .attr("d", d3.line()
          .x(function(d) { return d[0] })
          .y(function(d) { return d[1] })
          ); 
      });
  
      return gr;
    }

    /*let points = await interpretate(args[0], env);
    //console.log(points);
    //if (!env.vertices) throw('No vertices provided!');

    let color = d3.color(env.color);
      color = [color.r/255.0, color.g/255.0, color.b/255.0, env.opacity];

    //if this is a single line segment
    if (points[0][0]) return;


    const {gl, programInfo} = env.wgl;
    let bufferInfo; 
    
    bufferInfo = twgl.createBufferInfoFromArrays(gl, { indices:  points.flat(Infinity).map((index) => index-1)});
    
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

    twgl.setUniforms(programInfo, {
      u_resolution: [gl.canvas.width, gl.canvas.height],
      u_color: color,
      u_vertexColor: Boolean(env.wgl.vertexColors)
    });

    gl.lineWidth(env.strokeWidth);

    gl.drawElements(gl.LINE_STRIP, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);*/
  };

  g2d.SplineKnots = () => "SplineKnots";
  g2d.SplineDegree = () => "SplineDegree";

  g2d.BSplineCurve = async (args, env) => {
    const options = await core._getRules(args, env);

    let input = await interpretate(args[0], env);
    const x = env.xAxis;
    const y = env.yAxis;
  
    // Convert control points to 2D or 3D with weight (optional)
    const controlPoints = input.map(pt => {
      if (pt.length === 3) return { x: pt[0], y: pt[1], w: pt[2] };
      return { x: pt[0], y: pt[1], w: 1.0 };
    });
  
    let degree = options.SplineDegree;
    if (typeof degree != 'number')
      degree = 3;

    const n = controlPoints.length - 1;
    const k = degree;
  
    // Create a default non-uniform knot vector if not provided
    let knots = options.SplineKnots;

    if (!Array.isArray(knots)) knots = (() => {
      const m = n + k + 1;
      let u = [];
      for (let i = 0; i <= m; i++) {
        if (i <= k) u.push(0);
        else if (i >= m - k) u.push(1);
        else u.push((i - k) / (m - 2 * k));
      }
      return u;
    })();
  
    // Evaluate the curve at a number of steps
    function N(i, k, t, knots) {
      if (k === 0) return (knots[i] <= t && t < knots[i + 1]) ? 1 : 0;
      const d1 = knots[i + k] - knots[i];
      const d2 = knots[i + k + 1] - knots[i + 1];
      const a = d1 ? (t - knots[i]) / d1 * N(i, k - 1, t, knots) : 0;
      const b = d2 ? (knots[i + k + 1] - t) / d2 * N(i + 1, k - 1, t, knots) : 0;
      return a + b;
    }
  
    function deBoor(t) {
      let numerator = { x: 0, y: 0 };
      let denominator = 0;
  
      for (let i = 0; i <= n; i++) {
        const b = N(i, k, t, knots) * controlPoints[i].w;
        numerator.x += b * controlPoints[i].x;
        numerator.y += b * controlPoints[i].y;
        denominator += b;
      }
  
      return [x(numerator.x / denominator), y(numerator.y / denominator)];
    }
  
    const path = d3.path();
    const steps = env.steps || 100;
    for (let j = 0; j <= steps; j++) {
      const t = knots[k] + ((knots[n + 1] - knots[k]) * j) / steps;
      const pt = deBoor(t);
      if (j === 0) path.moveTo(...pt);
      else path.lineTo(...pt);
    }
  
    return env.svg.append("path")
      .attr("fill", "none")
      .attr("vector-effect", "non-scaling-stroke")
      .attr('opacity', env.opacity)
      .attr("stroke", env.color)
      .attr("stroke-width", env.strokeWidth)
      .attr("d", path);
  };

  // de Casteljau evaluator for any degree
  const deCasteljau = (ctrl, t) => {
    let tmp = ctrl.map(p => [p[0], p[1]]);
    for (let r = 1; r < ctrl.length; r++) {
      for (let i = 0; i < ctrl.length - r; i++) {
        tmp[i][0] = (1 - t) * tmp[i][0] + t * tmp[i + 1][0];
        tmp[i][1] = (1 - t) * tmp[i][1] + t * tmp[i + 1][1];
      }
    }
    return tmp[0];
  };

  // draw a general-degree segment by sampling
  const drawSampled = (path, ctrl, samples = 48) => {
    for (let s = 1; s <= samples; s++) {
      const t = s / samples;
      const p = deCasteljau(ctrl, t);
      path.lineTo(p[0], p[1]);
    }
  };

g2d.BezierCurve = async (args, env) => {
  const options = await core._getRules(args, env);

  let points = await interpretate(args[0], env);
  const path = d3.path();

  const degreeOpt = (options && Number.isInteger(options.SplineDegree)) ? options.SplineDegree : 3;
  const deg = Math.max(1, degreeOpt); // at least a line

  const x = env.xAxis;
  const y = env.yAxis;

  // map to screen space
  points = points.map(p => [x(p[0]), y(p[1])]);

  if (points.length < 2) return null;


  path.moveTo(points[0][0], points[0][1]);

  // Each segment consumes "deg" control points AFTER the current start
  // (since the start is the path's current point); end point is the last of the group.
  let i = 1; // index into points after the initial start point
  while (i + deg - 1 < points.length) {
    const remaining = points.length - i;

    if (deg === 3 && remaining >= 3) {
      // cubic: [C1, C2, End]
      path.bezierCurveTo(
        points[i][0], points[i][1],
        points[i + 1][0], points[i + 1][1],
        points[i + 2][0], points[i + 2][1]
      );
      i += 3;
    } else if (deg === 2 && remaining >= 2) {
      // quadratic: [C, End]
      path.quadraticCurveTo(
        points[i][0], points[i][1],
        points[i + 1][0], points[i + 1][1]
      );
      i += 2;
    } else {
      // any other degree (or not enough points left for native call): sample
      const take = Math.min(deg, remaining);
      const ctrl = [ /* current start */ path._currentPoint || points[i - 1] ]
        .concat(points.slice(i, i + take));

      // Ensure current start is the last point we drew to:
      // (Path2D doesn't expose it; keep track manually)
      // We can store it ourselves after each draw.
      drawSampled(path, ctrl, Math.max(24, take * 12));

      // update synthetic current point to the segment end
      const end = ctrl[ctrl.length - 1];
      path._currentPoint = [end[0], end[1]];

      i += take;
    }
  }

  // Handle any final leftover points (1 => line, 2 => quadratic, >=3 => sampled)
  const leftover = points.length - i;
  if (leftover === 1) {
    path.lineTo(points[i][0], points[i][1]);
  } else if (leftover === 2) {
    path.quadraticCurveTo(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
  } else if (leftover > 2) {
    const ctrl = [path._currentPoint || points[i - 1]].concat(points.slice(i));
    drawSampled(ctrl, Math.max(24, leftover * 12));
  }

  return env.svg.append("path")
    .attr("fill", "none")
    .attr("vector-effect", "non-scaling-stroke")
    .attr("opacity", env.opacity)
    .attr("stroke", env.color)
    .attr("stroke-width", env.strokeWidth)
    .attr("d", path);
};



  g2d.Line = async (args, env) => {

    env.offset;
    
    let data = await interpretate(args[0], env);
    //(data);

    
    if (data instanceof NumericArrayObject) { // convert back automatically
      data = data.normal();
    }
    
    const x = env.xAxis;
    const y = env.yAxis;

    let object;


    switch(arrdims(data)) {
      case 0:
        //empty
        object = env.svg.append("path")
        .datum([])
        .attr("fill", "none")
        .attr("vector-effect", "non-scaling-stroke")
        .attr('opacity', env.opacity)
        .attr("stroke", env.color)
        .attr("stroke-width", env.strokeWidth)
        .attr("d", d3.line()
          .x(function(d) { return x(d[0]) })
          .y(function(d) { return y(d[1]) })
          );  
        
        if (env.dasharray) {
          object.attr('stroke-dasharray', env.dasharray.join());
        }

      break;        
      case 2:
        if (env.returnPath) {
          object = null;
          throw 'Not implemented!';
        } else {
          object = env.svg.append("path")
          .datum(data)
          .attr("vector-effect", "non-scaling-stroke")
          .attr("fill", "none")
          .attr('opacity', env.opacity)
          .attr("stroke", env.color)
          .attr("stroke-width", env.strokeWidth)
          .attr("d", d3.line()
            .x(function(d) { return x(d[0]) })
            .y(function(d) { return y(d[1]) })
            ); 
          
          if (env.dasharray) {
            object.attr('stroke-dasharray', env.dasharray.join());
          }  
        } 
      break;
    
      case 3:
        console.log(data);

        object = data.map((d)=>{
         
          const o = env.svg.append("path")
          .datum(d).join("path")
          .attr("vector-effect", "non-scaling-stroke")
          .attr("fill", "none")
          .attr("stroke", env.color)
          .attr("stroke-width", env.strokeWidth)
          .attr("d", d3.line()
            .x(function(d) { return x(d[0]) })
            .y(function(d) { return y(d[1]) })
            );

          if (env.dasharray) {
            o.attr('stroke-dasharray', env.dasharray.join());
          }
          return o;
        });    
      break;
    } 

    env.local.nsets = data.length;

    env.local.line = d3.line()
        .x(function(d) { return env.xAxis(d[0]) })
        .y(function(d) { return env.yAxis(d[1]) });

    env.local.object = object;

    if (env.colorRefs) {
      env.colorRefs[env.root.uid] = env.root;
    }

    if (env.opacityRefs) {
      env.opacityRefs[env.root.uid] = env.root;
    }    

    //[TODO]:fixme
    if (Array.isArray(object)) return object[0];
    return object;
  };

  //g2d.Line.destroy = (args, env) => {
    //console.warn('Line was destroyed');
  //}

  g2d.Line.updateColor = (args, env) => {
    if (Array.isArray(env.local.object)) {
      env.local.object.forEach((o) => o.style("stroke", env.color));
      return;
    }
    env.local.object.style("stroke", env.color);
  };

  g2d.Line.updateOpacity = (args, env) => {
    if (Array.isArray(env.local.object)) {
      env.local.object.forEach((o) => o.style("opacity", env.opacity));
      return;
    }
    env.local.object.style("opacity", env.opacity);
  };




  g2d.Line.update = async (args, env) => {
    let data = await interpretate(args[0], env);
    //console.warn(data);
    //console.log(data);

    if (data instanceof NumericArrayObject) { // convert back automatically
      data = data.normal();
     }

    const x = env.xAxis;
    const y = env.yAxis;

    let stored = env.local.object;

    

    let obj;


    switch(arrdims(data)) {
      case 0:
        //empty

        obj = stored
        .datum([])
        .maybeTransitionTween(env.transitionType, env.transitionDuration, 'd', function (d) {
          var previous = d3.select(this).attr('d');
          var current = env.local.line(d);
          return interpolatePath(previous, current);
        }); 

      break;
      case 2:
        //animate equal

        //animate the rest
        obj = stored
        .datum(data)
        .maybeTransitionTween(env.transitionType, env.transitionDuration, 'd', function (d) {
          var previous = d3.select(this).attr('d');
          var current = env.local.line(d);
          return interpolatePath(previous, current);
        }); 

          /*.attrTween('d', function (d) {
            var previous = d3.select(this).attr('d');
            var current = env.local.line(d);
            return interpolatePath(previous, current);
          }); */

      break;
    
      case 3:
        for (let i=0; i < Math.min(data.length, env.local.nsets); ++i) {
          console.log('upd 1');
          obj = stored[i]
          .datum(data[i])
          .maybeTransitionTween(env.transitionType, env.transitionDuration, 'd', function (d) {
            var previous = d3.select(this).attr('d');
            var current = env.local.line(d);
            return interpolatePath(previous, current);
          }); 
        }
        if (data.length > env.local.nsets) {
          console.log('upd 2');
          for (let i=env.local.nsets; i < data.length; ++i) {
            obj = env.svg.append("path")
            .datum(data[i])
            .attr("fill", "none")
            .attr("stroke", env.color)
            .attr("stroke-width", env.strokeWidth)
            .maybeTransition(env.transitionType, env.transitionDuration)          
            .attr("d", d3.line()
              .x(function(d) { return x(d[0]) })
              .y(function(d) { return y(d[1]) })
              ); 
              
            stored.push(obj);
          }
        }

        if (data.length < env.local.nsets) {
          console.log('upd 3');
          for (let i=data.length; i < env.local.nsets; ++i) {
            obj = stored[i].datum(data[0])
            .join("path")
            .maybeTransition(env.transitionType, env.transitionDuration)
            .attr("d", env.local.line);            
          }
        }

        
      break;
    }    

    env.local.nsets = Math.max(data.length, env.local.nsets);

    return obj;

  };

  g2d.Line.virtual = true;

  g2d.Line.destroy = (args, env) => {

    //delete env.local.area;
    if (!env.local) return;
    if (!env.local.object) return;
    if (Array.isArray(env.local.object)) {
      env.local.object.forEach((o) => o.remove());
    } else {
      env.local.object.remove();
    }
    
    delete env.local.object;
  };

  g2d.Circle = async (args, env) => {
    if (args.length > 2) {
      env.local.arcQ = true;
      return await g2d._arc(args, env);
    }

    let data = await interpretate(args[0], env);
    if (data instanceof NumericArrayObject) { // convert back automatically
      data = data.normal();
    }

    let radius = [1, 1]; 

    if (args.length > 1) {
      radius = await interpretate(args[1], env);
      if (!Array.isArray(radius)) radius = [radius, radius];
    }

    //console.warn(args);

    const x = env.xAxis;
    const y = env.yAxis;

    env.local.coords = [x(data[0]), y(data[1])];
    env.local.r = [x(radius[0]) - x(0), Math.abs(y(radius[1]) - y(0))];
    //throw env.local.r;
    const object = env.svg
    .append("ellipse")
    .attr("vector-effect", "non-scaling-stroke")
      .attr("cx",  x(data[0]))
      .attr("cy", y(data[1]) )
      .attr("rx", env.local.r[0])
      .attr("ry", env.local.r[1])
      .style("stroke", env.color)
      .attr("vector-effect", "non-scaling-stroke")
      .attr("stroke-width", env.strokeWidth)
      .style("fill", 'none')
      .style("opacity", env.opacity);

    env.local.object = object;

    if (env.dasharray) {
      object.attr('stroke-dasharray', env.dasharray.join());
    }

    if (env.colorRefs) {
      env.colorRefs[env.root.uid] = env.root;
    }
    if (env.opacityRefs) {
      env.opacityRefs[env.root.uid] = env.root;
    }

    return object;
  };

  g2d.Circle.updateColor = (args, env) => {
    env.local.object.style("stroke", env.color);
  };

  g2d.Circle.updateOpacity = (args, env) => {
    env.local.object.style("opacity", env.opacity);
  };  

  g2d.Circle.update = async (args, env) => {
    let data = await interpretate(args[0], env);

    if (data instanceof NumericArrayObject) { // convert back automatically
      data = data.normal();
    }

    let radius = 1; 

    if (args.length > 1) {
      radius = await interpretate(args[1], env);
      if (!Array.isArray(radius)) radius = [radius, radius];
    }   

    const x = env.xAxis;
    const y = env.yAxis; 

    //env.local.coords = [x(data[0]), y(data[1])];
    env.local.r = [x(radius[0]) - x(0), Math.abs(y(radius[1]) - y(0))];

   

    env.local.object.maybeTransition(env.transitionType, env.transitionDuration)
    .attr("cx", x(data[0]) )
    .attr("cy", y(data[1]) )
    .attr("rx", env.local.r[0])
    .attr("ry", env.local.r[1]);

    return env.local.object;
  };

  g2d.Circle.destroy = (args, env) => {
    if (env.local.arcQ) {
      return;
    }
    env.local.object.remove();
    if (env.colorRefs) {
      delete env.colorRefs[env.root.uid];
    }
    if (env.opacityRefs) {
      delete env.opacityRefs[env.root.uid];
    }
  };

  g2d.Circle.virtual = true;

  const deg = function(rad) { return rad * 180 / Math.PI };
  const rad = function (deg) { return deg * Math.PI / 180 };

  function getEllipsePointForAngle(cx, cy, rx, ry, phi, theta) {
    const { abs, sin, cos } = Math;
    
    const M = abs(rx) * cos(theta),
          N = abs(ry) * sin(theta);  
    
    return [
      cx + cos(phi) * M - sin(phi) * N,
      cy + sin(phi) * M + cos(phi) * N
    ];
  }

  function getEndpointParameters(cx, cy, rx, ry, phi, theta, dTheta) {
  
    const [x1, y1] = getEllipsePointForAngle(cx, cy, rx, ry, phi, theta);
    const [x2, y2] = getEllipsePointForAngle(cx, cy, rx, ry, phi, theta + dTheta);
    
    const fa = Math.abs(dTheta) > Math.PI ? 1 : 0;
    const fs = dTheta > 0 ? 1 : 0;
    
    return { x1, y1, x2, y2, fa, fs }
  }  
  
  function getCenterParameters(x1, y1, x2, y2, fa, fs, rx, ry, phi) {
    const { abs, sin, cos, sqrt } = Math;
    const pow = n => Math.pow(n, 2);
  
    const sinphi = sin(phi), cosphi = cos(phi);
  
    // Step 1: simplify through translation/rotation
    const x =  cosphi * (x1 - x2) / 2 + sinphi * (y1 - y2) / 2,
          y = -sinphi * (x1 - x2) / 2 + cosphi * (y1 - y2) / 2;
  
    const px = pow(x), py = pow(y), prx = pow(rx), pry = pow(ry);
    
    // correct of out-of-range radii
    const L = px / prx + py / pry;
  
    if (L > 1) {
      rx = sqrt(L) * abs(rx);
      ry = sqrt(L) * abs(ry);
    } else {
      rx = abs(rx);
      ry = abs(ry);
    }

    // Step 2 + 3: compute center
    const sign = fa === fs ? -1 : 1;
    const M = sqrt((prx * pry - prx * py - pry * px) / (prx * py + pry * px)) * sign;

    const _cx = M * (rx * y) / ry,
          _cy = M * (-ry * x) / rx;

    const cx = cosphi * _cx - sinphi * _cy + (x1 + x2) / 2,
          cy = sinphi * _cx + cosphi * _cy + (y1 + y2) / 2;

    // Step 4: compute θ and dθ
    const theta = vectorAngle(
      [1, 0],
      [(x - _cx) / rx, (y - _cy) / ry]
    );

    let _dTheta = deg(vectorAngle(
        [(x - _cx) / rx, (y - _cy) / ry],
        [(-x - _cx) / rx, (-y - _cy) / ry]
    )) % 360;

    if (fs === 0 && _dTheta > 0) _dTheta -= 360;
    if (fs === 1 && _dTheta < 0) _dTheta += 360;
  
    return { cx, cy, theta, dTheta: rad(_dTheta) };
}

function vectorAngle ([ux, uy], [vx, vy]) {
  const { acos, sqrt } = Math;
  const sign = ux * vy - uy * vx < 0 ? -1 : 1,
        ua = sqrt(ux * ux + uy * uy),
        va = sqrt(vx * vx + vy * vy),
        dot = ux * vx + uy * vy;

  return sign * acos(dot / (ua * va));
}

g2d.Annulus = async (args, env) => {
// Assuming this code is inside an async function

// Interpret the center data, radii, and angles from the arguments
let data = await interpretate(args[0], env);
let radii = await interpretate(args[1], env);

// Ensure radii is an array with [outerRadius, innerRadius]
if (!Array.isArray(radii)) radii = [radii, radii];

let angles = (await interpretate(args[2], env)).map((a) => (2.0*Math.PI - a));

// Extract axis scaling functions
const x = env.xAxis;
const y = env.yAxis;

// Destructure outer and inner radii
const [outerRadius, innerRadius] = radii;

// Calculate scaled radii
const rxOuter = x(outerRadius) - x(0);
const ryOuter = Math.abs(y(outerRadius) - y(0));

const rxInner = x(innerRadius) - x(0);
const ryInner = Math.abs(y(innerRadius) - y(0));

// Extract center coordinates
const cx = x(data[0]);
const cy = y(data[1]);

// Extract start and end angles
const [startAngle, endAngle] = angles;

// Determine if the arc is greater than 180 degrees
const deltaAngle = endAngle - startAngle;
const largeArcFlag = deltaAngle > Math.PI ? 0 : 1;

// Sweep flag (1 for clockwise, 0 for counter-clockwise)
// Adjust based on how your angles are defined
const sweepFlag = 0;

// Calculate coordinates for the outer arc
const x1Outer = cx + rxOuter * Math.cos(startAngle);
const y1Outer = cy + ryOuter * Math.sin(startAngle);

const x2Outer = cx + rxOuter * Math.cos(endAngle);
const y2Outer = cy + ryOuter * Math.sin(endAngle);

// Calculate coordinates for the inner arc
const x1Inner = cx + rxInner * Math.cos(endAngle);
const y1Inner = cy + ryInner * Math.sin(endAngle);

const x2Inner = cx + rxInner * Math.cos(startAngle);
const y2Inner = cy + ryInner * Math.sin(startAngle);

// Construct the SVG path for the annulus
const pathData = [
  `M ${x1Outer} ${y1Outer}`, // Move to start of outer arc
  `A ${rxOuter} ${ryOuter} 0 ${largeArcFlag} ${sweepFlag} ${x2Outer} ${y2Outer}`, // Outer arc
  `L ${x1Inner} ${y1Inner}`, // Line to start of inner arc
  `A ${rxInner} ${ryInner} 0 ${largeArcFlag} ${1} ${x2Inner} ${y2Inner}`, // Inner arc
  'Z' // Close path
].join(' ');

// Create and append the SVG path for the annulus
const object = env.svg.append("path") 
  .attr("vector-effect", "non-scaling-stroke")
  .style("fill", env.color)
  .style("opacity", env.opacity) 
  .attr("d", pathData);

return object;
};



  g2d._arc = async (args, env) => {
    let data = await interpretate(args[0], env);
    let radius = await interpretate(args[1], env);
      if (!Array.isArray(radius)) radius = [radius, radius];
    
    let angles = (await interpretate(args[2], env)).map((a) => 2*Math.PI - a);

    const x = env.xAxis;
    const y = env.yAxis;

    //env.local.coords = [x(data[0]), y(data[1])];
    //env.local.r = [x(radius[0]) - x(0), Math.abs(y(radius[1]) - y(0))];
    const ellipse = {
      cx: x(data[0]),
      cy: y(data[1]),

      phi: 0,
      rx: x(radius[0]) - x(0),
      ry: Math.abs(y(radius[1]) - y(0)),
      start: angles[0],
      delta: angles[1]-angles[0]
    };



    const { x1, y1, x2, y2, fa, fs } = getEndpointParameters(
      ellipse.cx,
      ellipse.cy,
      ellipse.rx,
      ellipse.ry,
      ellipse.phi,
      ellipse.start,
      ellipse.delta
    );

    const { cx, cy, theta, dTheta } = getCenterParameters(
      x1,
      y1,
      x2,
      y2,
      fa,
      fs,
      ellipse.rx,
      ellipse.ry,
      ellipse.phi
    );  

   // console.log({x: x(data[0]), xorg: data[0], r: env.local.r, rorg: radius});

    const object = env.svg.append("path") 
      .attr("vector-effect", "non-scaling-stroke")
      .style('stroke', env.stroke || env.color)
      .style('stroke-width', env.strokeWidth)
      .style("opacity", env.opacity) 
      .attr("d",
        `M ${cx} ${cy}
         L ${x1} ${y1}
         A ${ellipse.rx} ${ellipse.ry} ${deg(ellipse.phi)} ${fa} ${fs} ${x2} ${y2}
         Z`); 

    object.style("fill", env.filled ? env.color : 'none');
      
    return object;
  };

  g2dComplex.Disk = async (args, env) => {
    if (args.length > 2) {
      throw('Graphics complex with arcs is not supported');
    }

    let data = await interpretate(args[0], env);
    let radius = 1; 

    if (args.length > 1) {
      radius = await interpretate(args[1], env);
      if (Array.isArray(radius)) radius = (radius[0] + radius[1])/2.0;
    }

    //console.warn(args);

    const x = env.xAxis;
    env.yAxis;

    if (!data[0]) {
      //single vertice
      const vertex = env.wgl.fallbackVertices[data-1];
      const coords = [vertex[0], vertex[1]];
      const r = x(radius) - x(0);

      const object = env.svg
      .append("circle")
      .attr("vector-effect", "non-scaling-stroke")
        .attr("cx", coords[0])
        .attr("cy", coords[1])
        .attr("r", r)
        .style("stroke", 'none')
        .style("fill", env.color)
        .style("opacity", env.opacity);

  
      return object;

    } else {
      const object = [];
      const r = x(radius) - x(0);

      data.map((index) => env.wgl.fallbackVertices[index-1]).map((disk) => {
        object.push(env.svg
        .append("circle")
        .attr("vector-effect", "non-scaling-stroke")
          .attr("cx", disk[0])
          .attr("cy", disk[1])
          .attr("r", r)
          .style("stroke", 'none')
          .style("fill", env.color)
          .style("opacity", env.opacity));
      });

      return object;
    }

  };


  g2d.Disk = async (args, env) => {
    if (args.length > 2) {
      return await g2d._arc(args, {...env, filled:true});
    }

    let data = await interpretate(args[0], env);

    if (data instanceof NumericArrayObject) { // convert back automatically
      data = data.normal();
    }    
    
    let radius = [1, 1]; 

    if (args.length > 1) {
      radius = await interpretate(args[1], env);
      if (!Array.isArray(radius)) radius = [radius, radius];
    }

    //console.warn(args);

    const x = env.xAxis;
    const y = env.yAxis;

    env.local.coords = [x(data[0]), y(data[1])];
    env.local.r = [x(radius[0]) - x(0), Math.abs(y(radius[1]) - y(0))];
    //throw env.local.r;
    const object = env.svg
    .append("ellipse")
    .attr("vector-effect", "non-scaling-stroke")
      .attr("cx",  x(data[0]))
      .attr("cy", y(data[1]) )
      .attr("rx", env.local.r[0])
      .attr("ry", env.local.r[1])
      .style("stroke", env.stroke)
      .attr("stroke-width", env.strokeWidth)
      .style("fill", env.color)
      .style("opacity", env.opacity);

    env.local.object = object;

    if (env.colorRefs) {
      env.colorRefs[env.root.uid] = env.root;
    }
    if (env.opacityRefs) {
      env.opacityRefs[env.root.uid] = env.root;
    }

    return object;
  };

  g2d.Disk.update = async (args, env) => {
    let data = await interpretate(args[0], env);

    if (data instanceof NumericArrayObject) { // convert back automatically
      data = data.normal();
    }

    //console.log(data);
    let radius = env.local.r; 

    if (args.length > 1) {
      radius = await interpretate(args[1], env);
      if (!Array.isArray(radius)) radius = [radius, radius];
    }

    const x = env.xAxis;
    const y = env.yAxis;     

    env.local.coords = [x(data[0]), y(data[1])];
    env.local.r = [x(radius[0]) - x(0), Math.abs(y(radius[1]) - y(0))];

    //console.warn(args);

 
    
    env.local.object.maybeTransition(env.transitionType, env.transitionDuration)
    .attr("cx",  env.local.coords[0])
    .attr("cy", env.local.coords[1])
    .attr("rx", env.local.r[0])
    .attr("ry", env.local.r[1]);
  };

  g2d.Disk.updateColor = (args, env) => {
    env.local.object.style("fill", env.color);
  };

  g2d.Disk.updateOpacity = (args, env) => {
    env.local.object.style("opacity", env.opacity);
  };  

  g2d.Disk.virtual = true;

  g2d.Disk.destroy = (args, env) => {
 
    if (!env.local) return;
    if (!env.local.object) return;
    if (env.colorRefs) {
      delete env.colorRefs[env.root.uid];
    }
    if (env.opacityRefs) {
      delete env.opacityRefs[env.root.uid];
    }
    env.local.object.remove();
    
    delete env.local.object;
    //delete env.local.area;
  };
  
  g2dComplex.Point = async (args, env) => {
    let points = await interpretate(args[0], env);
    //console.log(points);
    //if (!env.vertices) throw('No vertices provided!');

    let color = d3.color(env.color);
      color = [color.r/255.0, color.g/255.0, color.b/255.0, env.opacity];

    //if this is a single point segment
    if (points[0][0]) {
      return;
    }

    


    const {gl, programInfo} = env.wgl;
    let bufferInfo;
    
    let indices = points.flat(Infinity).map(i => i - 1);

    if (env.wgl.fallbackVertices.length > 65535) {
      console.warn('Vertex buffer is too large and may not be indexed correctly');
      bufferInfo = twgl.createBufferInfoFromArrays(gl, {
        indices: new Uint32Array(indices)
      });
    } else {
      bufferInfo = twgl.createBufferInfoFromArrays(gl, {
        indices: new Uint16Array(indices)
      });
    }

    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

    twgl.setUniforms(programInfo, {
      u_resolution: [gl.canvas.width, gl.canvas.height],
      u_color: color,
      u_pointSize: env.pointSize * window.devicePixelRatio * 100.0 * 2.0,
      u_vertexColor: Boolean(env.wgl.vertexColors)
    });

    if (env.wgl.fallbackVertices.length > 65535) {
      gl.drawElements(gl.POINTS, bufferInfo.numElements, gl.UNSIGNED_INT, 0);
    } else {
      gl.drawElements(gl.POINTS, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
    } 

  };

  g2d.Point = async (args, env) => {
    let data = await interpretate(args[0], env);
    if (data instanceof NumericArrayObject) { // convert back automatically
      data = data.normal();
     }
    const x = env.xAxis;
    const y = env.yAxis;

      const dp = arrdims(data);
      if (dp === 0) {
          data = [];
      } else {
        if (dp < 2) {
          data = [data];
        }
      }



 

    /*const object = env.svg.append('g')
    .selectAll()
    .data(data)
    .enter()
    .append("circle")
    .attr("vector-effect", "non-scaling-stroke")
    .attr('class', "dot-"+uid)
      .attr("cx", function (d) { return x(d[0]); } )
      .attr("cy", function (d) { return y(d[1]); } )
      .attr("r", env.pointSize*100)
      .style("fill", env.color)
      .style("opacity", env.opacity);*/

    const object = env.svg.append('g')
    .style("stroke-width", env.pointSize*100*2)
    .style("stroke-linecap", "round")
    .style("stroke", env.color)
    .style("opacity", env.opacity);

    if (env.colorRefs) {
      env.colorRefs[env.root.uid] = env.root;
    }
    if (env.opacityRefs) {
      env.opacityRefs[env.root.uid] = env.root;
    }

    const points = [];

    data.forEach((d, vert) => {

      
        points.push(
         object.append("path")
        .attr("d", `M ${x(d[0])} ${y(d[1])} l 0.0001 0`)
        .attr("vector-effect", "non-scaling-stroke")
        );
      
    });

    env.local.points = points;
    env.local.object = object;
    
    return object;
  }; 

  g2d.Point.updateColor = (args, env) => {
    env.local.object.style("stroke", env.color);
  };

  g2d.Point.updateOpacity = (args, env) => {
    env.local.object.style("opacity", env.opacity);
  };    

  g2d.Point.update = async (args, env) => {
    let data = await interpretate(args[0], env);

    if (data instanceof NumericArrayObject) { // convert back automatically
      data = data.normal();
    }
    
    const dp = arrdims(data);
    if (dp === 0) {
        data = [];
    } else {
      if (dp < 2) {
        data = [data];
      }
    }
  
    const x = env.xAxis;
    const y = env.yAxis;

    let object;
  
    const u = env.local.object;

    const minLength = Math.min(env.local.points.length, data.length);

    let prev = [0,0];

    for (let i=env.local.points.length; i<data.length; i++) {
      if (i-1 >= 0) prev = data[i-1];

      object = u.append("path")
      .attr("d", `M ${x(prev[0])} ${y(prev[1])} l 0.0001 0`)
      .attr("vector-effect", "non-scaling-stroke");

      env.local.points.push(object);

      object = object.maybeTransition(env.transitionType, env.transitionDuration)
      .attr("d", `M ${x(data[i][0])} ${y(data[i][1])} l 0.0001 0`);
    }
    for (let i=env.local.points.length; i>data.length; i--) {
      object = env.local.points.pop();

      object.remove(); 
    }
    for (let i=0; i < minLength; i++) {
      object = env.local.points[i].maybeTransition(env.transitionType, env.transitionDuration)
      .attr("d", `M ${x(data[i][0])} ${y(data[i][1])} l 0.0001 0`);
    }

    return object;
  };

  //g2d.Point.destroy = (args, env) => {interpretate(args[0], env)}

  g2d.Point.virtual = true;  

  g2d.Point.destroy = (args, env) => {

    if (!env.local) return;
    if (!env.local.object) return;

    if (env.colorRefs) 
      delete env.colorRefs[env.root.uid];

    if (Array.isArray(env.local.object)) {
      env.local.object.forEach((o) => o.remove());
    } else {
      env.local.object.remove();
    }
    
    delete env.local.object;
  };

  const getCanvas = (env) => {

    let t = {k: 1, x:0, y:0};
    env.onZoom.push((tranform) => {
      t = tranform;
    });

    const copy = {xAxis: env.xAxis, yAxis: env.yAxis};

    env.xAxis = (x) => {
      return 0;
    };

    env.yAxis = (y) => {
      return 0;
    };

    env.xAxis.invert = (x) => {
      const X = (x - t.x - env.panZoomEntites.left) / t.k;
      return copy.xAxis.invert(X);
    };

    env.yAxis.invert = (y) => {
      const Y = (y - t.y - env.panZoomEntites.top) / t.k;
      return copy.yAxis.invert(Y);
    };

    return env.panZoomEntites.canvas
  };

  g2d.EventListener = async (args, env) => {
    const rules = await interpretate(args[1], env);
    const copy = {...env};

    let object = await interpretate(args[0], copy);

    if (!object) {
      object = getCanvas(copy);
    } else {
      if (Array.isArray(object)) object = object[0];
    }

    if (!object.on_list) object.on_list = {};

    rules.forEach((rule)=>{
      g2d.EventListener[rule.lhs](rule.rhs, object, copy);
    });

    return null;
  };

  g2d.EventListener.update = async (args, env) => {
    console.log('EventListener does not support updates');
  };
  
  g2d.EventListener.onload = (uid, object, env) => {

    console.log('onload event generator');
    server.kernel.emitt(uid, `True`, 'onload');
  };  

  g2d.MiddlewareListener = async (args, env) => {
    const options = await core._getRules(args, env);
    const name = await interpretate(args[1], env);
    const uid = await interpretate(args[2], env);
    console.log(args);
    env.local.middleware = g2d.MiddlewareListener[name](uid, options, env);

    return (await interpretate(args[0], env));
  };

  g2d.MiddlewareListener.update = (args, env) => {
    return interpretate(args[0], env);
  };

  //g2d.MiddlewareListener.destroy = (args, env) => {
    //return interpretate(args[0], env);
  //}  

  g2d.MiddlewareListener.end = (uid, params, env) => {
    const threshold = params.Threshold || 1.0;
    
    server.kernel.emitt(uid, `True`, 'end');
    console.log("pre Fire");

    return (object) => {
      let state = false;
      

      return object.then((r) => r.tween(uid, function (d) {
        return function (t) {
          if (t >= threshold && !state) {
            server.kernel.emitt(uid, `True`, 'end');
            state = true;
          }
        }
      }))
    }
  };

  g2d.MiddlewareListener.endtransition = g2d.MiddlewareListener.end;

  //g2d.EventListener.destroy = (args, env) => {interpretate(args[0], env)}

  g2d.EventListener.drag = (uid, object, env) => {
    const xAxis = env.xAxis;
    const yAxis = env.yAxis;

    let bbox = null;

    object.classed("cursor-pointer", true);

    function dragstarted(event, d) {
      // `this` is the DOM element being dragged
      bbox = this.getBBox();  // Always gives visual bounds in screen coordinates
    }

    const updatePos = throttle((x, y) => {
      server.kernel.io.fire(uid, [x, y], 'drag');
    });

    function dragged(event, d) {
      if (!bbox) return;

      // Align mouse position to the center of the element
      const x = event.x - bbox.width / 2 - bbox.x;
      const y = event.y - bbox.height / 2 - bbox.y;

      d3.select(this)
        .raise()
        .attr("transform", `translate(${x},${y})`);

      updatePos(xAxis.invert(event.x), yAxis.invert(event.y));
    }

    function dragended(event, d) {
      // Optional: finalize drag
    }

    object.call(
      d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );
  };

g2d.EventListener.dragsignal = (uid, object, env) => {
  console.log('dragsignal event generator');
  console.log(env.local);

  object.classed("cursor-pointer", true);

  let t = { k: 1, x: 0, y: 0 };
  env.onZoom.push((transform) => {
    t = transform;
  });

  const xAxisinvert = (x) => {
    const X = (x - t.x - env.panZoomEntites.left) / t.k;
    return env.xAxis.invert(X);
  };

  const yAxisinvert = (y) => {
    const Y = (y - t.y - env.panZoomEntites.top) / t.k;
    return env.yAxis.invert(Y);
  };

  const svgNode = env.panZoomEntites.canvas.node();

  let offset = [0, 0]; // offset from cursor to element center

  const updatePos = throttle((x, y) => {
    server.kernel.io.fire(uid, [x, y], 'dragsignal');
  });

  function onMouseMove(e) {
    const coords = d3.pointer(e, svgNode);
    const x = coords[0] + 0* offset[0];
    const y = coords[1] + 0*offset[1];

    updatePos(xAxisinvert(x), yAxisinvert(y));
  }

  function onMouseUp() {
    svgNode.removeEventListener("mousemove", onMouseMove);
    svgNode.removeEventListener("mouseup", onMouseUp);
  }

  function onMouseDown(e) {
    e.stopPropagation();
    e.preventDefault();

    // Use `this` to refer to the clicked DOM node
    const bbox = e.target.getBBox();
    const center = [
      bbox.x + bbox.width / 2,
      bbox.y + bbox.height / 2
    ];

    const pointer = d3.pointer(e, svgNode);
    offset = [
      center[0] - pointer[0],
      center[1] - pointer[1]
    ];

    // Fire the first event immediately, adjusted to center
    const adjX = pointer[0] ;
    const adjY = pointer[1] ;
    updatePos(xAxisinvert(adjX), yAxisinvert(adjY));

    svgNode.addEventListener("mousemove", onMouseMove);
    svgNode.addEventListener("mouseup", onMouseUp);
  }

  object.on("mousedown", onMouseDown);
};

  g2d.EventListener.dragall = (uid, object, env) => {

    console.log('drag event generator');
    console.log(env.local);
    const xAxis = env.xAxis;
    const yAxis = env.yAxis;

    function dragstarted(event, d) {
      //d3.select(this).raise().attr("stroke", "black");
      updatePos(xAxis.invert(event.x), yAxis.invert(event.y), "dragstarted");
    }

    const updatePos = throttle((x,y,t) => {
      server.kernel.io.fire(uid, [String(t), [x,y]], 'dragall');
    });
  
    function dragged(event, d) {
      //d3.select(this).attr("cx", d.x = event.x).attr("cy", d.y = event.y);
      updatePos(xAxis.invert(event.x), yAxis.invert(event.y), "dragged");
    }
  
    function dragended(event, d) {
      //d3.select(this).attr("stroke", null);
      updatePos(xAxis.invert(event.x), yAxis.invert(event.y), "dragended");
    }
  
    object.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
  };


  g2d.EventListener.click = (uid, object, env) => {

    console.log('click event generator');
    console.log(env.local);
    const xAxis = env.xAxis;
    const yAxis = env.yAxis;

    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'click');
    });
  
    function clicked(event, p) {
      if (!event.altKey)
        updatePos(xAxis.invert(p[0]), yAxis.invert(p[1]));
    }

    object.classed("cursor-pointer", true);
  
    if ('click' in object.on_list) {
      object.on_list.click.push((e)=>clicked(e, d3.pointer(e)));
    } else {
      object.on_list.click = [
        (e)=>clicked(e, d3.pointer(e))
      ];
      object.on("click", (e)=>{
        for (let i=0; i<object.on_list.click.length; ++i) object.on_list.click[i](e);
      });
    }
  };  

  g2d.EventListener.mousedown = (uid, object, env) => {

    console.log('mousedown event generator');
    console.log(env.local);
    const xAxis = env.xAxis;
    const yAxis = env.yAxis;

    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'mousedown');
    });
  
    function clicked(event, p) {
      //if (event.altKey)
        updatePos(xAxis.invert(p[0]), yAxis.invert(p[1]));
    }
  
    object.on("mousedown", (e)=>clicked(e, d3.pointer(e)));
  };  

  g2d.EventListener.mouseup = (uid, object, env) => {

    console.log('mouseup event generator');
    console.log(env.local);
    const xAxis = env.xAxis;
    const yAxis = env.yAxis;

    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'mouseup');
    });
  
    function clicked(event, p) {
      //if (event.altKey)
        updatePos(xAxis.invert(p[0]), yAxis.invert(p[1]));
    }
  
    object.on("mouseup", (e)=>clicked(e, d3.pointer(e)));
  };  

  g2d.EventListener.altclick = (uid, object, env) => {

    console.log('click event generator');
    console.log(env.local);
    const xAxis = env.xAxis;
    const yAxis = env.yAxis;

    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'altclick');
    });
  
    function clicked(event, p) {
      if (event.altKey)
        updatePos(xAxis.invert(p[0]), yAxis.invert(p[1]));
    }
  
    if ('click' in object.on_list) {
      object.on_list.click.push((e)=>clicked(e, d3.pointer(e)));
    } else {
      object.on_list.click = [
        (e)=>clicked(e, d3.pointer(e))
      ];
      object.on("click", (e)=>{
        for (let i=0; i<object.on_list.click.length; ++i) object.on_list.click[i](e);
      });
    }
  };  

  g2d.EventListener.capturekeydown = (uid, object, env) => {
    //console.error('You cannot listen keys from the SVG element!');
    let focus;
    let enabled = true;
    const el = object;
    //force focus
    focus = () => {
      if (!enabled) return;
      el.node().focus();
      enabled = false;
    };

    const addClickListener = (func) => {
      if ('click' in object.on_list) {
        object.on_list.click.push(func);
      } else {
        object.on_list.click = [
          func
        ];
        object.on("click", (e)=>{
          for (let i=0; i<object.on_list.click.length; ++i) object.on_list.click[i](e);
        });
      }
    };

    addClickListener(focus);

    el.on('blur', ()=>{
      enabled = true;
    });

    //console.error(el.on);

    el.node().addEventListener('keydown', (e) => {
      //console.log(e);
      server.kernel.emitt(uid, '"'+e.code+'"', 'capturekeydown');
      e.preventDefault();
    });
  };  

  g2d.EventListener.keydown = (uid, object, env) => {
    //console.error('You cannot listen keys from the SVG element!');
    let focus;
    let enabled = true;
    const el = object;
    //force focus
    focus = () => {
      if (!enabled) return;
      el.node().focus();
      enabled = false;
    };

    const addClickListener = (func) => {
      if ('click' in object.on_list) {
        object.on_list.click.push(func);
      } else {
        object.on_list.click = [
          func
        ];
        object.on("click", (e)=>{
          for (let i=0; i<object.on_list.click.length; ++i) object.on_list.click[i](e);
        });
      }
    };

    addClickListener(focus);

    el.on('blur', ()=>{
      enabled = true;
    });

    el.addEventListener('keydown', (e) => {
      //console.log(e);
      server.kernel.emitt(uid, '"'+e.code+'"', 'keydown');
      //e.preventDefault();
    });
  };  

  g2d.EventListener.mousemove = (uid, object, env) => {

    console.log('mouse event generator');
    console.log(env.local);
    const xAxis = env.xAxis;
    const yAxis = env.yAxis;

    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'mousemove');
    });
  
    function moved(arr) {
      updatePos(xAxis.invert(arr[0]), yAxis.invert(arr[1]));
    }
  
    object.on("mousemove", (e) => moved(d3.pointer(e)));
  };   

  g2d.EventListener.mouseover = (uid, object, env) => {

    console.log('mouse event generator');
    console.log(env.local);
    const xAxis = env.xAxis;
    const yAxis = env.yAxis;

    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'mouseover');
    });
  
    function moved(arr) {
      updatePos(xAxis.invert(arr[0]), yAxis.invert(arr[1]));
    }
  
    object.on("mouseover", e => moved(d3.pointer(e)));
  };   

  g2d.EventListener.zoom = (uid, object, env) => {

    console.log('zoom event generator');
    console.log(env.local);

    const updatePos = throttle(k => {
      server.kernel.io.fire(uid, k, 'zoom');
    });

    function zoom(e) {
      console.log();
      updatePos(e.transform.k);
    }
  
    object.call(d3.zoom()
        .on("zoom", zoom));
  }; 


  
  g2d.Rotate = async (args, env) => {
    const degrees = await interpretate(args[1], env);
    let aligment;
    if (args.length > 2) {
      aligment = await interpretate(args[2], env);
      env.local.aligment = aligment;
    }

    if (!env.svg) return await interpretate(args[0], {}); //fuckedup case, when rotate is passed to FrameTicks
    const group = env.svg.append("g");
    
    env.local.group = group;

    await interpretate(args[0], {...env, svg: group});

    let centre = group.node().getBBox();
    
    if (aligment) {
      centre.x = (env.xAxis(aligment[0]));
      centre.y = (env.yAxis(aligment[1]));
    } else {
      centre.x = (centre.x + centre.width / 2);
      centre.y = (centre.y + centre.height / 2);
    }


    const rotation = "rotate(" + (-degrees / Math.PI * 180.0) + ", " + 
    centre.x + ", " + centre.y + ")";

    group.attr("transform", rotation);

    env.local.rotation = rotation;
  };

  g2d.Rotate.update = async (args, env) => {
    const degrees = await interpretate(args[1], env);

    let centre;
    centre = env.local.group.node().getBBox();
    
    if (env.local.aligment) {
      centre.x = (env.xAxis(env.local.aligment[0]));
      centre.y = (env.yAxis(env.local.aligment[1]));
      //console.log({x: env.xAxis(env.local.aligment[0]) - env.xAxis(0), y:env.yAxis(env.local.aligment[1]) - env.yAxis(0),

        //x0: centre.width / 2, y0: centre.height / 2
      //});
    } else {
      centre.x = (centre.x + centre.width / 2);
      centre.y = (centre.y + centre.height / 2);
    }
       
    const rotation = "rotate(" + (-degrees / Math.PI * 180.0) + ", " + (centre.x ) + ", " + (centre.y ) + ")";

    var interpol_rotate = d3.interpolateString(env.local.rotation, rotation);

    env.local.group.maybeTransitionTween(env.transitionType, env.transitionDuration, 'transform' , function(d,i,a){ return interpol_rotate } );
  
    env.local.rotation = rotation;
  };

  g2d.Rotate.virtual = true;

  g2d.Rotate.destroy = (args, env) => {
    console.log('nothing to destroy');
    //delete env.local.area;
  };

  g2d.GraphicsBoxOptions = () => {};
  g2d.StrokeForm = () => {};
  g2d.FontOpacity = () => {};

  g2d.GeometricTransformation = async (args, env) => {
    let matrix = await interpretate(args[1], env);
    const group = env.svg.append("g");

   // if (arrdims(pos) > 1) throw 'List arguments for Translate is not supported for now!';
    
    env.local.group = group;

    const xAxis = env.xAxis;
    const yAxis = env.yAxis;  

    if (matrix.length > 3) {
      //could be translation?

      for (let m of matrix) {
        if (!Array.isArray(m)) continue;

        const g = group.append("g");
        m = m[0];


          if (typeof m[0] != 'number') continue;
          if (typeof m[1] != 'number') continue;

          m = [xAxis(m[0])- xAxis(0), yAxis(m[1])- yAxis(0)];

          g.attr("transform", `translate(${m.join(',')})`); 

        await interpretate(args[0], {...env, svg: g});
      }

      return group;

    } else {

      await interpretate(args[0], {...env, svg: group});


      console.warn(matrix);

      if (matrix.length == 2 ) {

        matrix[0][0][1] = -matrix[0][0][1];
        matrix[0][1][0] = -matrix[0][1][0];

        matrix[0] = matrix[0].flat(Infinity);
        matrix[1] = [xAxis(matrix[1][0])- xAxis(0), yAxis(matrix[1][1])- yAxis(0)];
        return group.attr("transform", `matrix(${matrix[0].join(',')},${matrix[1].join(',')})`); 
      } else {
        matrix[0][1] = -matrix[0][1];
        matrix[1][0] = -matrix[1][0];

        matrix = matrix.flat(Infinity);
        return group.attr("transform", `matrix(${matrix.join(',')})`); 
      }

      //return group//.attr("transform", `translate(${xAxis(-matrix[1][0]) - 0*xAxis(0)}, ${yAxis(-matrix[1][1]) - 0*yAxis(0)})`);
    }
  };

  g2d.Translate = async (args, env) => {
    let pos = await interpretate(args[1], env);
    const group = env.svg.append("g");

    env.local.group = group;

    const xAxis = env.xAxis;
    const yAxis = env.yAxis;  

    if (pos instanceof NumericArrayObject) { 
      pos = pos.normal();
    }

    



   if (Array.isArray(pos[0])) {
    
    

    const firstGroup = group.append("g");
    const subgroups = [firstGroup];
    env.local.subgroups = subgroups;

    firstGroup.attr("transform", `translate(${xAxis(pos[0][0]) - xAxis(0)}, ${yAxis(pos[0][1]) - yAxis(0)})`);
    const childGroup = firstGroup.append('g');

    await interpretate(args[0], {...env, svg: childGroup});

    for (let i = 1; i<pos.length; ++i) {
      const g = group.append("g");
      const p = pos[i];
      subgroups.push(g);
      g.attr("transform", `translate(${xAxis(p[0]) - xAxis(0)}, ${yAxis(p[1]) - yAxis(0)})`);
      g.append(() => childGroup.clone(true).node());
    }

    return group;
   }  else {
    group.attr("transform", `translate(${xAxis(pos[0]) - xAxis(0)}, ${yAxis(pos[1]) - yAxis(0)})`);
   }

    await interpretate(args[0], {...env, svg: group});

    return group;
  };

  g2d.Translate.update = async (args, env) => {
    let pos = await interpretate(args[1], env);

    if (pos instanceof NumericArrayObject) { // convert back automatically
      pos = pos.normal();
    }    

    const xAxis = env.xAxis;
    const yAxis = env.yAxis;

    if (env.local.subgroups) {
      for (let i=0; i<env.local.subgroups.length; ++i) {
        const p = pos[i];
        env.local.subgroups[i].maybeTransition(env.transitionType, env.transitionDuration).attr("transform", `translate(${xAxis(p[0])- xAxis(0)}, ${yAxis(p[1]) - yAxis(0)})`);
      }

      return;
    }

    return env.local.group.maybeTransition(env.transitionType, env.transitionDuration).attr("transform", `translate(${xAxis(pos[0])- xAxis(0)}, ${yAxis(pos[1]) - yAxis(0)})`);
  };

  //g2d.Translate.destroy = async (args, env) => {
   // const pos = await interpretate(args[1], env);
   // const obj = await interpretate(args[0], env);
  //}  

  g2d.Translate.virtual = true;  

  g2d.Translate.destroy = (args, env) => {
    //delete env.local.area;
    env.local.group.remove();
  };


  g2d.Center = () => 'Center';
  g2d.Center.update = g2d.Center;

  g2d.Top = () => 'Top';
  g2d.Top.update = g2d.Top;

  g2d.Bottom = () => 'Bottom';
  g2d.Bottom.update = g2d.Bottom;

  g2d.Left = () => 'Left';
  g2d.Left.update = g2d.Left;  

  g2d.Right = () => 'Right';
  g2d.Right.update = g2d.Right;

  g2d.Degree = () => Math.PI/180.0;
  //g2d.Degree.destroy = g2d.Degree
  g2d.Degree.update = g2d.Degree;

  g2d.RoundingRadius = () => "RoundingRadius";
  g2d.RoundingRadius.update = () => "RoundingRadius";

  g2d.Rectangle = async (args, env) => {
    let from = await interpretate(args[0], env);
    let to = await interpretate(args[1], env);

    const opts = await core._getRules(args, env);


    if (from instanceof NumericArrayObject) { // convert back automatically
      from = from.normal();
    }     

    if (to instanceof NumericArrayObject) { // convert back automatically
      to = to.normal();
    }  

    if (from[1] > to[1]) {
      const t = from[1];
      from[1] = to[1];
      to[1] = t;
    }

    if (from[0] > to[0]) {
      const t = from[0];
      from[0] = to[0];
      to[0] = t;
    }

    const x = env.xAxis;
    const y = env.yAxis;

    from[0] = x(from[0]);
    from[1] = y(from[1]);
    to[0] = x(to[0]);
    to[1] = y(to[1]);

    /*if (from[0] > to[0]) {
      const t = from[0];
      from[0] = to[0];
      to[0] = t;
    }*/


    

    const size = [Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1])];



    env.local.rect = env.svg.append('rect')
    .attr('x', from[0])
    .attr('y', from[1] - size[1])
    .attr('width', size[0])
    .attr('height', size[1])
    .attr("vector-effect", "non-scaling-stroke")
    .attr('stroke', env.stroke)
    .attr("stroke-width", env.strokeWidth)
    .attr('opacity', env.opacity)
    .attr('fill', env.color);

    if (opts.RoundingRadius) {
      if (typeof opts.RoundingRadius == "number") {
        env.local.rect.attr('rx', 50 *  opts.RoundingRadius / 0.75);
      } else if (Array.isArray(opts.RoundingRadius)) {
        env.local.rect.attr('rx', 50 *  opts.RoundingRadius[0] / 0.75);
        env.local.rect.attr('ry', 50 *  opts.RoundingRadius[1] / 0.75);
      }
    }

    if (env.dasharray) {
      env.local.rect.attr('stroke-dasharray', env.dasharray.join());
    }

    if (env.colorRefs) {
      env.colorRefs[env.root.uid] = env.root;
    }
    if (env.opacityRefs) {
      env.opacityRefs[env.root.uid] = env.root;
    }

    return env.local.rect;
     
  };

  g2d.Rectangle.updateColor = (args, env) => {
    env.local.rect.attr('fill', env.color);
  };

  g2d.Rectangle.updateOpacity = (args, env) => {
    env.local.rect.attr('opacity', env.opacity);
  };  

  //g2d.Rectangle.destroy = async (args, env) => {
    //await interpretate(args[0], env);
    //await interpretate(args[1], env);
  //}
  
  g2d.Rectangle.update = async (args, env) => {
    let from = await interpretate(args[0], env);
    let to = await interpretate(args[1], env);

    const opts = await core._getRules(args, env);


    if (from instanceof NumericArrayObject) { // convert back automatically
      from = from.normal();
    }     

    if (to instanceof NumericArrayObject) { // convert back automatically
      to = to.normal();
    }     
    
    if (from[1] > to[1]) {
      const t = from[1];
      from[1] = to[1];
      to[1] = t;
    }

    if (from[0] > to[0]) {
      const t = from[0];
      from[0] = to[0];
      to[0] = t;
    }

    const x = env.xAxis;
    const y = env.yAxis;

    from[0] = x(from[0]);
    from[1] = y(from[1]);
    to[0] = x(to[0]);
    to[1] = y(to[1]);

    /*if (from[0] > to[0]) {
      const t = from[0];
      from[0] = to[0];
      to[0] = t;
    }

    if (from[1] > to[1]) {
      const t = from[1];
      from[1] = to[1];
      to[1] = t;
    }*/

    

    const size = [Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1])];



    env.local.rect.maybeTransition(env.transitionType, env.transitionDuration)
    .attr('x', from[0])
    .attr('y', from[1] - size[1]) 
    .attr('width', size[0])
    .attr('height', size[1]);

    if (opts.RoundingRadius) {
      if (typeof opts.RoundingRadius == "number") {
        env.local.rect.attr('rx', 50 * opts.RoundingRadius / 0.75);
      } else if (Array.isArray(opts.RoundingRadius)) {
        env.local.rect.attr('rx', 50 * opts.RoundingRadius[0] / 0.75);
        env.local.rect.attr('ry', 50 * opts.RoundingRadius[1] / 0.75);
      }
    }
  };

  g2d.Rectangle.virtual = true;

  g2d.Rectangle.destroy = (args, env) => {
    console.log('nothing to destroy');
    if (!env.local) return;
    if (!env.local.rect) return;
    if (env.colorRefs) {
      delete env.colorRefs[env.root.uid];
    }
    if (env.opacityRefs) {
      delete env.opacityRefs[env.root.uid];
    }
    env.local.rect.remove();

    delete env.local.rect;
    //delete env.local.area;
  };

  // StadiumShape[{{x1,y1},{x2,y2}}, r]
  // represents a stadium (capsule) of radius r between the points {x1,y1} and {x2,y2}. 

  g2d.StadiumShape = async (args, env) => {
    // args[0] -> {{x1,y1},{x2,y2}}
    // args[1] -> r
    let pts = await interpretate(args[0], env);
    let r   = await interpretate(args[1], env); 

    await core._getRules(args, env); 

    if (pts instanceof NumericArrayObject) {
      pts = pts.normal();
    }
    if (r instanceof NumericArrayObject) {
      r = r.normal();
    } 

    // Radius should be a scalar
    if (Array.isArray(r)) {
      r = r[0];
    } 

    let from = pts[0];
    let to   = pts[1];  

    if (from instanceof NumericArrayObject) {
      from = from.normal();
    }
    if (to instanceof NumericArrayObject) {
      to = to.normal();
    } 

    const x = env.xAxis;
    const y = env.yAxis;  

    // Convert to screen coordinates
    const p1 = [x(from[0]), y(from[1])];
    const p2 = [x(to[0]),   y(to[1])];  

    // Convert radius from data space to screen space (approx via x-axis scale)
    let screenR = 0;
    if (typeof r === "number") {
      screenR = Math.abs(x(from[0] + r) - x(from[0]));
    } 

    const d = makeStadiumPath(p1, p2, screenR); 

    env.local.stadium = env.svg.append('path')
      .attr('d', d)
      .attr("vector-effect", "non-scaling-stroke")
      .attr('fill', env.color)
      .attr('stroke', env.stroke)
      .attr('stroke-width', env.strokeWidth)
      .attr('opacity', env.opacity);  

    if (env.dasharray) {
      env.local.stadium.attr('stroke-dasharray', env.dasharray.join());
    } 

    if (env.colorRefs) {
      env.colorRefs[env.root.uid] = env.root;
    }
    if (env.opacityRefs) {
      env.opacityRefs[env.root.uid] = env.root;
    } 

    return env.local.stadium;
  };  


  // Helper: build SVG path data for a stadium between p1 and p2 in screen coords
  function makeStadiumPath(p1, p2, r) {
    const x1 = p1[0], y1 = p1[1];
    const x2 = p2[0], y2 = p2[1]; 

    // Degenerate case: draw a circle
    if (r === 0 || (x1 === x2 && y1 === y2)) {
      if (r === 0) return `M ${x1} ${y1} Z`;
      const leftX  = x1 - r;
      const rightX = x1 + r;
      return [
        `M ${leftX} ${y1}`,
        `A ${r} ${r} 0 1 0 ${rightX} ${y1}`,
        `A ${r} ${r} 0 1 0 ${leftX} ${y1}`,
        'Z'
      ].join(' ');
    } 

    const dx  = x2 - x1;
    const dy  = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy); 

    const ux = dx / len;
    const uy = dy / len;  

    // Normal vector (perpendicular)
    const nx = -uy;
    const ny =  ux; 

    // Four rectangle corners (offset along normal)
    const p1aX = x1 + nx * r;
    const p1aY = y1 + ny * r;
    const p2aX = x2 + nx * r;
    const p2aY = y2 + ny * r;
    const p2bX = x2 - nx * r;
    const p2bY = y2 - ny * r;
    const p1bX = x1 - nx * r;
    const p1bY = y1 - ny * r; 

    // Semicircle at p1: p1a -> p1b
    // Semicircle at p2: p2b -> p2a
    // Use rx=ry=r, large-arc-flag=0, sweep-flag=1 (180° arc)
    return [
      'M', p1aX, p1aY,
      'A', r, r, 0, 0, 1, p1bX, p1bY,
      'L', p2bX, p2bY,
      'A', r, r, 0, 0, 1, p2aX, p2aY,
      'Z'
    ].join(' ');
  } 


  g2d.StadiumShape.updateColor = (args, env) => {
    if (!env.local || !env.local.stadium) return;
    env.local.stadium.attr('fill', env.color);
  };  

  g2d.StadiumShape.updateOpacity = (args, env) => {
    if (!env.local || !env.local.stadium) return;
    env.local.stadium.attr('opacity', env.opacity);
  };  

  g2d.StadiumShape.update = async (args, env) => {
    let pts = await interpretate(args[0], env);
    let r   = await interpretate(args[1], env); 

    await core._getRules(args, env); 

    if (pts instanceof NumericArrayObject) {
      pts = pts.normal();
    }
    if (r instanceof NumericArrayObject) {
      r = r.normal();
    } 

    if (Array.isArray(r)) {
      r = r[0];
    } 

    let from = pts[0];
    let to   = pts[1];  

    if (from instanceof NumericArrayObject) {
      from = from.normal();
    }
    if (to instanceof NumericArrayObject) {
      to = to.normal();
    } 

    const x = env.xAxis;
    const y = env.yAxis;  

    const p1 = [x(from[0]), y(from[1])];
    const p2 = [x(to[0]),   y(to[1])];  

    let screenR = 0;
    if (typeof r === "number") {
      screenR = Math.abs(x(from[0] + r) - x(from[0]));
    } 

    const d = makeStadiumPath(p1, p2, screenR); 

    env.local.stadium
      .maybeTransition(env.transitionType, env.transitionDuration)
      .attr('d', d);
  };  

  g2d.StadiumShape.virtual = true;  

  g2d.StadiumShape.destroy = (args, env) => {
    console.log('StadiumShape destroy');
    if (!env.local || !env.local.stadium) return; 

    if (env.colorRefs) {
      delete env.colorRefs[env.root.uid];
    }
    if (env.opacityRefs) {
      delete env.opacityRefs[env.root.uid];
    } 

    env.local.stadium.remove();
    delete env.local.stadium;
  };


  // Triangle[{p1,p2,p3}] OR Triangle[{{p11,p12,p13}, ...}]
  // args.length is always 1; args[0] is either one triangle or an array of triangles.
  g2d.Triangle = async (args, env) => {
    const triList = await _triangle__normalizeInput(args, env);
  
    const x = env.xAxis;
    const y = env.yAxis;
  
    const toScreenTri = (tri) => tri.map(([px, py]) => [x(px), y(py)]);
    const toPointsAttr = (tri) => tri.map(([sx, sy]) => `${sx},${sy}`).join(' ');
  
    if (!env.local) env.local = {};
    env.local.triGroup = env.svg.append('g');
  
    const screenTris = triList.map(toScreenTri);
  
    let selection = env.local.triGroup.selectAll('polygon').data(screenTris);
  
    const enter = selection.enter()
      .append('polygon')
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('stroke', env.stroke)
      .attr('stroke-width', env.strokeWidth)
      .attr('opacity', env.opacity)
      .attr('fill', env.color)
      .attr('points', d => toPointsAttr(d));
  
    if (env.dasharray) {
      enter.attr('stroke-dasharray', env.dasharray.join());
    }
  
    env.local.triangles = enter.merge(selection);
  
    if (env.colorRefs) env.colorRefs[env.root.uid] = env.root;
    if (env.opacityRefs) env.opacityRefs[env.root.uid] = env.root;
  
    return env.local.triGroup;
  };

  g2d.Tooltip = async (args, env) => {
    const data = await interpretate(args[0], env);
    let tooltipTimeout = null;
    let tooltipEl = null;
    let tool = null;

    const showTooltip = async (node) => {
      if (tooltipEl) return;

      tooltipEl = document.createElement('div');
      tooltipEl.classList.add('wljs-tooltip', 'text-sm', 'dark:invert', 'dark:hue-rotate-180','dark:contrast-75','dark:brightness-5', 'bg-white','dark:win:contrast-100');
      tooltipEl.style.position = 'absolute';
      tooltipEl.style.zIndex = '9999';
      tooltipEl.style.padding = '4px 8px';
      tooltipEl.style.borderRadius = '0.25rem';
      //tooltipEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      tooltipEl.style.pointerEvents = 'none';

      // Position tooltip above the element
      const rect = node.getBoundingClientRect();
      console.warn(rect);
      tooltipEl.style.left = `${rect.left + window.scrollX}px`;
      tooltipEl.style.top = `${rect.top + window.scrollY - 30}px`;

      document.body.appendChild(tooltipEl);

      // Render tooltip content from args[0]
      try {
        tool = await interpretate(args[1], { element: tooltipEl });
        if (typeof tool == 'number' || typeof tool == 'string') {
          tooltipEl.innerText = tool;
          tool = {destroy: () => {}};
        }
      } catch(err) {
        tool = null;
      }
    };

    const hideTooltip = () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
      if (tooltipEl) {
        if (tool) {
          tool.destroy();
          tool = null;
        } 
        tooltipEl.remove();
        tooltipEl = null;
      }
    };

    /*env.element.addEventListener('mouseenter', () => {
      tooltipTimeout = setTimeout(showTooltip, 300);
    });

    env.element.addEventListener('mouseleave', hideTooltip);*/
    if (data instanceof d3.selection) {
      data.on('mouseenter', () => {
        tooltipTimeout = setTimeout(()=>showTooltip(data.node()), 300);
      });
      data.on('mouseleave', hideTooltip);
    } else if (Array.isArray(data)) {
      data.forEach((test) => {
        if (test instanceof d3.selection) {
          test.on('mouseenter', () => {
            tooltipTimeout = setTimeout(()=>showTooltip(test.node()), 300);
          });
          test.on('mouseleave', hideTooltip);
        }
      });
    } 

    return data;
  };

  g2d.Tooltip.update = core.Tooltip;

 // g2d.Tooltip.destroy = g2d.Tooltip;
  
  g2d.Triangle.updateColor = (args, env) => {
    if (env.local?.triGroup) {
      env.local.triGroup.selectAll('polygon').attr('fill', env.color);
    }
  };
  
  g2d.Triangle.updateOpacity = (args, env) => {
    if (env.local?.triGroup) {
      env.local.triGroup.selectAll('polygon').attr('opacity', env.opacity);
    }
  };
  
  g2d.Triangle.update = async (args, env) => {
    const triList = await _triangle__normalizeInput(args, env);
  
    const x = env.xAxis;
    const y = env.yAxis;
  
    const toScreenTri = (tri) => tri.map(([px, py]) => [x(px), y(py)]);
    const toPointsAttr = (tri) => tri.map(([sx, sy]) => `${sx},${sy}`).join(' ');
  
    const screenTris = triList.map(toScreenTri);
  
    let selection = env.local.triGroup.selectAll('polygon').data(screenTris);
  
    selection.exit().remove();
  
    const enter = selection.enter()
      .append('polygon')
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('stroke', env.stroke)
      .attr('stroke-width', env.strokeWidth)
      .attr('opacity', env.opacity)
      .attr('fill', env.color);
  
    if (env.dasharray) {
      enter.attr('stroke-dasharray', env.dasharray.join());
    }
  
    selection = enter.merge(selection);
  
    selection
      .maybeTransition(env.transitionType, env.transitionDuration)
      .attr('points', d => toPointsAttr(d));
  };
  
  g2d.Triangle.virtual = true;
  
  g2d.Triangle.destroy = (args, env) => {
    if (env.colorRefs) delete env.colorRefs[env.root.uid];
    if (env.opacityRefs) delete env.opacityRefs[env.root.uid];
  
    if (env.local?.triGroup) {
      env.local.triGroup.remove();
      delete env.local.triGroup;
    }
    if (env.local?.triangles) delete env.local.triangles;
  };
  
  // --- helpers ---
  
  async function _triangle__normalizeInput(args, env) {
    // args[0] is either [p1,p2,p3] or [[p11,p12,p13], ...]
    let v = await interpretate(args[0], env);
    if (v instanceof NumericArrayObject) v = v.normal();
  
    // Convert NumericArrayObject points and deep arrays to plain arrays
    const normPoint = (p) => {
      if (p instanceof NumericArrayObject) return p.normal();
      return Array.isArray(p) ? p : [p[0], p[1]]; // fallback, though p should be [x,y]
    };
  
    // Detect if v is a single triangle (triplet of points) or an array of triangles
    const isPoint = (p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number';
    const looksLikeSingleTriangle =
      Array.isArray(v) &&
      v.length === 3 &&
      v.every(isPoint);
  
    const triListRaw = looksLikeSingleTriangle ? [v] : v;
  
    // Ensure every point is normalized to [x, y]
    return triListRaw.map(tri => tri.map(normPoint));
  }


  //plugs
  g2d.Void = (args, env) => {};

  g2d.Identity              = g2d.Void;
  g2d.Scaled                = async (args, env) => {
      if (args.length == 1) {
        const data = await interpretate(args[0], env);
        return [data[0]*(env.plotRange[0][1] - env.plotRange[0][0]) + env.plotRange[0][0], data[1]*(env.plotRange[1][1] - env.plotRange[1][0]) + env.plotRange[1][0]];
      } else {
        const data = await interpretate(args[0], env);
        const relative = await interpretate(args[1], env);
        return [data[0]*(env.plotRange[0][1] - env.plotRange[0][0]) + relative[0], data[1]*(env.plotRange[1][1] - env.plotRange[1][0])  + relative[1]];
      }
  };
  g2d.Scaled.update = g2d.Scaled;
  g2d.GoldenRatio           = g2d.Void;
  g2d.None                  = () => false;

  g2d.AbsolutePointSize     = g2d.Void;
  g2d.CopiedValueFunction   = g2d.Void;

  g2d.Raster = async (args, env) => {
    if (env.image) return await interpretate(args[0], env);
    //TODO THIS SUCKS

    const data = await interpretate(args[0], {...env, context: g2d, nfast:true, numeric:true});
    console.log(args);
    const height = data.length;
    const width = data[0].length;
    const rgb = data[0][0].length;

    const x = env.xAxis;
    const y = env.yAxis;    

    let ranges = [[0, width],[0, height]];
    if (args.length > 1) {
      const optsRanges = await interpretate(args[1], env);
      ranges[0][0] = optsRanges[0][0];
      ranges[0][1] = optsRanges[1][0];
      ranges[1][0] = optsRanges[0][1];
      ranges[1][1] = optsRanges[1][1];      
    }
    if (args.length > 2) {
      await interpretate(args[2], env);
      //not implemented
      console.warn('scaling is not implemented!');
    }



    const rectWidth = Math.abs((x(ranges[0][1]) - x(ranges[0][0])) / width);
    const rectHeight = Math.abs((y(ranges[1][1]) - y(ranges[1][0])) / height);

    const stepX = (ranges[0][1] - ranges[0][0]) / width;
    const stepY = (ranges[1][1] - ranges[1][0]) / height;

    const group = env.svg;

    if (!rgb) {
      for (let i=0; i<height; ++i) {
        for (let j=0; j<width; ++j) {

          group.append('rect')
          .attr('x', x(stepX * j + ranges[0][0]))
          .attr('y', y(stepY * i + ranges[1][0])-rectHeight)
          .attr('width', rectWidth)
          .attr('height', rectHeight)
          .attr('opacity', env.opacity)
          .attr('fill', `rgb(${Math.floor(255*data[i][j])}, ${Math.floor(255*data[i][j])}, ${Math.floor(255*data[i][j])})`);
          
        }
      }  
      return;
    }

    if (rgb === 2) {
      for (let i=0; i<height; ++i) {
        for (let j=0; j<width; ++j) {

          group.append('rect')
          .attr('x', x(stepX * j + ranges[0][0]))
          .attr('y', y(stepY * i + ranges[1][0])-rectHeight)
          .attr('width', rectWidth)
          .attr('height', rectHeight)
          .attr('opacity', data[i][j][1])
          .attr('fill', `rgb(${Math.floor(255*data[i][j][0])}, ${Math.floor(255*data[i][j][0])}, ${Math.floor(255*data[i][j][0])})`);
          
        }
      }  
      return;
    }    

    if (rgb === 3) {
      for (let i=0; i<height; ++i) {
        for (let j=0; j<width; ++j) {

          group.append('rect')
          .attr('x', x(stepX * j + ranges[0][0]))
          .attr('y', y(stepY * i + ranges[1][0])-rectHeight)
          .attr('width', rectWidth)
          .attr('height', rectHeight)
          .attr('opacity', env.opacity)
          .attr('fill', `rgb(${Math.floor(255*data[i][j][0])}, ${Math.floor(255*data[i][j][1])}, ${Math.floor(255*data[i][j][2])})`);
          
        }
      } 
      return;
    }

    if (rgb === 4) {
      for (let i=0; i<height; ++i) {
        for (let j=0; j<width; ++j) {

          group.append('rect')
          .attr('x', x(stepX * j + ranges[0][0]))
          .attr('y', y(stepY * i + ranges[1][0])-rectHeight)
          .attr('width', rectWidth)
          .attr('height', rectHeight)
          .attr('opacity', data[i][j][3])
          .attr('fill', `rgb(${Math.floor(255*data[i][j][0])}, ${Math.floor(255*data[i][j][1])}, ${Math.floor(255*data[i][j][2])})`);
          
        }
      } 
      return;
    }    
  };

  //g2d.Raster.destroy = () => {}
  g2d.Magnification = () => "Magnification";
  g2d.ColorSpace = () => "ColorSpace";
  g2d.Interleaving = () => "Interleaving";
  g2d.MetaInformation = () => "MetaInformation";
  g2d.ImageResolution = () => "ImageResolution";

  g2d.DateObject = () => {
    console.warn('Date Object is not supported for now');
  };

  const numericAccelerator = {};
  numericAccelerator.TypeReal    = {};
  numericAccelerator.TypeInteger = {};

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
  };

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
        readArray(arr[i], env);
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
  };

  numericAccelerator.NumericArray.update = numericAccelerator.NumericArray;

  //numericAccelerator.List = (args, env) => args



  function moveRGBAReal(src, dest, size) {
    var i, j = 0;
    for (i = 0; i < size << 2; ) {
        dest[i++] = ((src[j++] * 255) >>> 0);
        dest[i++] = ((src[j++] * 255) >>> 0);
        dest[i++] = ((src[j++] * 255) >>> 0);
        dest[i++] = ((src[j++] * 255) >>> 0);
    }    
  }

  function moveRGBReal(src, dest, size) {
    var i, j = 0;
    const destW = new Uint32Array(dest.buffer);
    const alpha = 0xFF000000;  // alpha is the high byte. Bits 24-31
    for (i = 0; i < size; i++) {
        destW[i] = alpha + ((src[j++] * 255) >>> 0) + (((src[j++] * 255) >>> 0) << 8) + (((src[j++] * 255) >>> 0) << 16);
    }    
  }  

  function moveRGBReal2(src, dest, size) {
    var i, j = 0;
    const destW = new Uint32Array(dest.buffer);
    const alpha = 0xFF000000;  // alpha is the high byte. Bits 24-31
    for (i = 0; i < size; i++) {
        destW[i] = alpha + ((src[j++] * 255) >>> 0) + (((src[j++] * 255) >>> 0) << 8);
    }    
  }  

  function moveRGBRealTransposed(src, dest, size) {
    const destW = new Uint32Array(dest.buffer);
    const alpha = 0xFF000000;

    const offsetG = size;       // Green starts after Red
    const offsetB = size * 2;   // Blue starts after Green

    for (let i = 0; i < size; i++) {
        const red   = (src[i] * 255) >>> 0;
        const green = (src[offsetG + i] * 255) >>> 0;
        const blue  = (src[offsetB + i] * 255) >>> 0;

        destW[i] = alpha + red + (green << 8) + (blue << 16);
    }
}  

  function moveGrayReal(src, dest, size) {
    var i;
    const destW = new Uint32Array(dest.buffer);
    const alpha = 0xFF000000;  // alpha is the high byte. Bits 24-31
    for (i = 0; i < size; i++) {
        const g = (src[i]*255) >>> 0;
        destW[i] = alpha + (g << 16) + (g << 8) + g;
    }    
  }

  function moveRGB(src, dest, size) {
    var i, j = 0;
    const destW = new Uint32Array(dest.buffer);
    const alpha = 0xFF000000;  // alpha is the high byte. Bits 24-31
    for (i = 0; i < size; i++) {
        destW[i] = alpha + src[j++] + (src[j++] << 8) + (src[j++] << 16);
    }    
  }

  function moveRGBTransposed(src, dest, size) {
    const destW = new Uint32Array(dest.buffer);
    const alpha = 0xFF000000;
  
    const offsetG = size;       // Green starts after Red
    const offsetB = size * 2;   // Blue starts after Green
  
    for (let i = 0; i < size; i++) {
      const red   = src[i];
      const green = src[offsetG + i];
      const blue  = src[offsetB + i];
  
      destW[i] = alpha + red + (green << 8) + (blue << 16);
    }
  }

  function moveRGBATransposed(src, dest, size) {
    const destW = new Uint32Array(dest.buffer);
  
    const offsetG = size;        // Green starts after Red
    const offsetB = size * 2;    // Blue starts after Green
    const offsetA = size * 3;    // Alpha starts after Blue
  
    for (let i = 0; i < size; i++) {
      const r = src[i];
      const g = src[offsetG + i];
      const b = src[offsetB + i];
      const a = src[offsetA + i];
  
      destW[i] = (a << 24) + r + (g << 8) + (b << 16);
    }
  }

  function moveRGB2(src, dest, size) {
    var i, j = 0;
    const destW = new Uint32Array(dest.buffer);
    const alpha = 0xFF000000;  // alpha is the high byte. Bits 24-31
    for (i = 0; i < size; i++) {
        destW[i] = alpha + src[j++] + (src[j++] << 8);
    }    
  }  

  function moveGray(src, dest, size) {
    var i;
    const destW = new Uint32Array(dest.buffer);
    const alpha = 0xFF000000;  // alpha is the high byte. Bits 24-31
    for (i = 0; i < size; i++) {
        const g = src[i];
        destW[i] = alpha + (g << 16) + (g << 8) + g;
    }    
  }  

  function moveGrayBits(src, dest, size) {
    var i;
    const destW = new Uint32Array(dest.buffer);
    const alpha = 0xFF000000;  // alpha is the high byte. Bits 24-31
    for (i = 0; i < size; i++) {
        const g = src[i] << 8;
        destW[i] = alpha + (g << 16) + (g << 8) + g;
    }    
  }   

  const imageTypes = {
    Byte: {
      constructor: Uint8Array,
      convert: (array) => {
        if (array.dims.length === 3) {
          if (array.dims[2] === 4) {
            //console.error(array);
            const rgba = new Uint8ClampedArray(array.buffer);
            //moveRGB(array.buffer, rgba, size);
            return rgba;
            //return array.buffer;
          }

          if (array.dims[2] === 3) {
            const size = array.dims[0] * array.dims[1];
            const rgba = new Uint8ClampedArray(size << 2);
            moveRGB(array.buffer, rgba, size);
            return rgba;
          }
          
          if (array.dims[2] === 2) {
            const size = array.dims[0] * array.dims[1];
            const rgba = new Uint8ClampedArray(size << 2);
            moveRGB2(array.buffer, rgba, size);
            return rgba;
          }

          console.error(array);
          throw 'It must be RGB or RGBA or RG!';
        }

        if (array.dims.length === 2) {
          const size = array.dims[0] * array.dims[1];
          const rgba = new Uint8ClampedArray(size << 2);
          moveGray(array.buffer, rgba, size);
          return rgba;          
        }

        throw 'This is not an image data!';
      },

      convert_nonInterleaved: (array) => {
        const channels = array.dims[0];

        if (channels === 3 || channels === 4) {
          const size = array.dims[2] * array.dims[1];
          const rgba = new Uint8ClampedArray(size << 2);
      
          if (channels === 3) {
            moveRGBTransposed(array.buffer, rgba, size);
          } else {
            moveRGBATransposed(array.buffer, rgba, size);
          }
      
          return rgba;
        }

        console.error(array);
      
        throw 'convert_nonInterleaved has limited support';
      }      
    },

    Bit: {
      constructor: Uint8Array,
      convert: (array) => {
        const size = array.dims[0] * array.dims[1];
        const rgba = new Uint8ClampedArray(size << 2);
        moveGrayBits(array.buffer, rgba, size);
        return rgba;  
      }
    },

    Real32: {
      constructor: Float32Array,
      convert: (array) => {
        if (array.dims.length === 3) {
          if (array.dims[2] === 4) {
            const size = array.dims[0] * array.dims[1];
            const rgba = new Uint8ClampedArray(size << 2);
            moveRGBAReal(array.buffer, rgba, size);
            return rgba;
          }

          if (array.dims[2] === 3) {
            const size = array.dims[0] * array.dims[1];
            const rgba = new Uint8ClampedArray(size << 2);
            moveRGBReal(array.buffer, rgba, size);
            return rgba;
          }

          if (array.dims[2] === 2) {
            const size = array.dims[0] * array.dims[1];
            const rgba = new Uint8ClampedArray(size << 2);
            moveRGBReal2(array.buffer, rgba, size);
            return rgba;
          }



          console.error(array);
          throw 'It must be RGB or RGBA or RG!';
        }

        if (array.dims.length === 2) {
          const size = array.dims[0] * array.dims[1];
          const rgba = new Uint8ClampedArray(size << 2);
          moveGrayReal(array.buffer, rgba, size);
          return rgba;          
        }

        throw 'This is not an image data!';
      },

      convert_nonInterleaved: (array) => {
        if (array.dims[0] === 3) { 
          const size = array.dims[2] * array.dims[1];
          const rgba = new Uint8ClampedArray(size << 2);
          moveRGBRealTransposed(array.buffer, rgba, size);
          return rgba;
        }

        throw 'convert_nonInterleaved has a limited support';
      }
    },

    Real64: {
      contructor: Float64Array,
      convert: (array) => {
        if (array.dims.length === 3) {
          if (array.dims[2] === 4) {
            const size = array.dims[0] * array.dims[1];
            const rgba = new Uint8ClampedArray(size << 2);
            moveRGBAReal(array.buffer, rgba, size);
            return rgba;
          }
          if (array.dims[2] === 3) {
            const size = array.dims[0] * array.dims[1];
            const rgba = new Uint8ClampedArray(size << 2);
            moveRGBReal(array.buffer, rgba, size);
            return rgba;
          }

          if (array.dims[2] === 2) {
            const size = array.dims[0] * array.dims[1];
            const rgba = new Uint8ClampedArray(size << 2);
            moveRGBReal2(array.buffer, rgba, size);
            return rgba;
          }

          console.error(array);
          throw 'It must be RGB or RGBA!';
        }

        if (array.dims.length === 2) {
          const size = array.dims[0] * array.dims[1];
          const rgba = new Uint8ClampedArray(size << 2);
          moveGrayReal(array.buffer, rgba, size);
          return rgba;          
        }

        throw 'This is not an image data!';
      }
    }
  };





  g2d.Antialiasing = () => 'Antialiasing';

  var imageContext = {};
  imageContext.EventListener = async (args, env) => {
    const rules = await interpretate(args[1], env);
    const copy = {...env};

    const object = env.local.canvas;

    rules.forEach((rule)=>{
      imageContext.EventListener[rule.lhs](rule.rhs, object, copy);
    });

    return null;
  };

  imageContext.EventListener.click = (uid, canvas, env) => {
    const dpr = window.devicePixelRatio;
    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'click');
    });
  
    function clicked(event) {
      if (!event.altKey)
        updatePos(event.offsetX*dpr, event.offsetY*dpr);
    }

    canvas.addEventListener("click", clicked);
  };

  imageContext.EventListener.altclick = (uid, canvas, env) => {
    const dpr = window.devicePixelRatio;
    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'altclick');
    });
  
    function clicked(event) {
      if (event.altKey)
        updatePos(event.offsetX*dpr, event.offsetY*dpr);
    }

    canvas.addEventListener("click", clicked);
  }; 

  imageContext.EventListener.mouseup = (uid, canvas, env) => {
    const dpr = window.devicePixelRatio;
    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'mouseup');
    });
  
    function clicked(event) {
      updatePos(event.offsetX*dpr, event.offsetY*dpr);
    }

    canvas.addEventListener("mouseup", clicked);
  };  

  imageContext.EventListener.mousedown = (uid, canvas, env) => {
    const dpr = window.devicePixelRatio;
    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'mousedown');
    });
  
    function clicked(event) {
      updatePos(event.offsetX*dpr, event.offsetY*dpr);
    }

    canvas.addEventListener("mousedown", clicked);
  }; 
  
  imageContext.EventListener.mousemove = (uid, canvas, env) => {
    const dpr = window.devicePixelRatio;
    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'mousemove');
    });
  
    function clicked(event) {
      updatePos(event.offsetX*dpr, event.offsetY*dpr);
    }

    canvas.addEventListener("mousemove", clicked);
  };  

  imageContext.EventListener.mouseover = (uid, canvas, env) => {
    const dpr = window.devicePixelRatio;
    const updatePos = throttle((x,y) => {
      server.kernel.io.fire(uid, [x,y], 'mouseover');
    });
  
    function clicked(event) {
      updatePos(event.offsetX*dpr, event.offsetY*dpr);
    }

    canvas.addEventListener("mouseover", clicked);
  };  

  g2d.Image = async (args, env) => {
    const options = await core._getRules(args, {...env, context: g2d, hold:true});

    //const time = performance.now();
    //const benchmark = [];


    let data = await interpretate(args[0], {...env, context: [numericAccelerator, g2d]});

    if (data instanceof HTMLCanvasElement) {
      if (!env.offscreen) env.element.appendChild(data);
      env.local.canvas = data;
      return data;
    }
    //benchmark.push(`${performance.now() - time} passed`);

    let type = 'Real32';

    if (args.length - Object.keys(options).length > 1) {
      type = interpretate(args[1]);
    }

    type = imageTypes[type];

    let imageData;
    let interleaving = true;
    if ('Interleaving' in options) interleaving = interpretate(options.Interleaving, {});



    //if not typed array
    if (Array.isArray(data)) {
      console.warn('Will be slow. Not a typed array');
      data = {buffer: data.flat(Infinity), dims: checkdims(data)};
    }

    if (interleaving) {
      console.warn(type);
      imageData = type.convert(data);
    } else {
      imageData = type.convert_nonInterleaved(data);
    }
    
    //benchmark.push(`${performance.now() - time} passed`);

   
    env.local.type = type;

    console.log('ImageSize');
    console.log(data.dims);
    let width, height;
    
    if (interleaving) {
      height = data.dims[0];
      width  = data.dims[1];
    } else {
      height = data.dims[1];
      width  = data.dims[2];      
    }

    env.local.interleaving = interleaving;

    env.local.dims = data.dims;

    //console.log({imageData, width, height});

    imageData = new ImageData(new Uint8ClampedArray(imageData), width, height);
    //benchmark.push(`${performance.now() - time} passed`);

    let ImageSize = options.ImageSize;
    ImageSize = await interpretate(options.ImageSize, {...env, context: g2d});

    if (options.Magnification) {
      //options.Magnification = await interpretate(options.Magnification, env);
      const mag = await interpretate(options.Magnification, {...env, context: g2d});
      ImageSize = Math.floor(width * mag);
    }



    if (!ImageSize) {
      if (env.imageSize) {
        ImageSize = env.imageSize;
      } else {
        ImageSize = width;
      }
    }

    if (Array.isArray(ImageSize)) {
      if (typeof ImageSize[0] != 'number') {
        ImageSize = [width, height];
      }
    } else {
      if (typeof ImageSize != 'number') {
        ImageSize = width;
      }      
    }

    //only width can be controlled!
    if (Array.isArray(ImageSize)) ImageSize = ImageSize[0];

    const target_width = Math.floor(ImageSize);
    const target_height = Math.floor((height / width) * (ImageSize));    

    console.warn('ImageSize');
    console.warn({target_width, target_height});

    env.local.targetDims = [target_height, target_width];


    let ctx;
    const dpi = window.devicePixelRatio;

    // if (env.inset) {
    //   const foreignObject = env.inset.append('foreignObject')
    //   .attr('width', target_width)
    //   .attr('height', target_height);


    
    //   const canvas = foreignObject.append('xhtml:canvas')
    //   .attr('xmlns', 'http://www.w3.org/1999/xhtml').node();

    //   canvas.width = target_width;
    //   canvas.height = target_height;

    //   canvas.style.width = target_width / dpi + 'px';
    //   canvas.style.height = target_height / dpi + 'px';

    //   ctx = canvas.getContext('2d');
    // } else {
      var canvas = document.createElement("canvas");
      canvas.width = target_width;
      canvas.height = target_height;      
      if (!env.offscreen) env.element.appendChild(canvas);
      canvas.style.width = target_width / dpi + 'px';
      canvas.style.height = target_height / dpi + 'px';
      ctx  = canvas.getContext("2d");
    //}

    env.local.ctx = ctx;
    env.local.canvas = canvas;

    if('Antialiasing' in options) {
      ctx.imageSmoothingEnabled = await interpretate(options.Antialiasing, {...env, context: g2d});
    }
    
    //canvas.getContext('2d').scale(dpi, dpi);

    //benchmark.push(`${performance.now() - time} passed`);

    if (target_width != width || target_height != height) {
      env.local.resized = true;
      console.warn('Resizing might be slow');
      imageData = await createImageBitmap(imageData);
      ctx.drawImage(imageData, 0,0, target_width, target_height);
    } else {
      ctx.putImageData(imageData,0,0);
    }

    
    
    //benchmark.push(`${performance.now() - time} passed`);

    //console.warn(benchmark);
    if (options.Epilog) {
      interpretate(options.Epilog, {...env, context: [imageContext, g2d]});
    }

    return canvas;
};

g2d.Image.update = async (args, env) => {
  let data = await interpretate(args[0], {...env, context: [numericAccelerator, g2d]});
    //if not typed array
    if (Array.isArray(data)) {
      console.warn('Image:update: not a typed array. It will be slow...');
      data = {buffer: data.flat(Infinity), dims: checkdims(data)};
    }    

    if (!env.local.interleaving) {
      throw 'Update with no interleaving is not supported!';
    }

    let imageData = env.local.type.convert(data);
    imageData = new ImageData(new Uint8ClampedArray(imageData), env.local.dims[1], env.local.dims[0]);
    
    if (env.local.resized) {
      imageData = await createImageBitmap(imageData);
      env.local.ctx.clearRect(0, 0, env.local.targetDims[1], env.local.targetDims[0]);
      env.local.ctx.drawImage(imageData, 0,0, env.local.targetDims[1], env.local.targetDims[0]);
    } else {
      env.local.ctx.putImageData(imageData,0,0);
    }
  
  
};

g2d.Image.destroy = (args, env) => {
  env.local?.canvas?.remove();
};


let runOptcodes;

core['Canvas2D`Private`ctx'] = async (args, env) => {
  if (!env.root.parent) throw 'ctx cannot be executed without parent node'
  if (env.root.parent.firstName != 'Image') {
    console.error(env.root.parent);
    throw 'parent node is not Image';
  }

  //hijack options from Image
  const opts = await core._getRules(env.root.parent.virtual.slice(1), {...env, hold:true, context: [g2d, imageContext]});

  //normal execution
  const optCodes = await interpretate(args[1], env);

  if (!runOptcodes) runOptcodes = (await import('./canvas2d-cc6ed9aa.js')).runOptcodes;

  const canvas = document.createElement("canvas");
  opts.ImageResolution = await interpretate(opts.ImageResolution, env);

  if (typeof opts.ImageResolution[0] != 'number') {
    opts.ImageResolution = [500,500];
  } 

    canvas.width = opts.ImageResolution[0];
    canvas.height = opts.ImageResolution[1];
  
  const ctx = canvas.getContext("2d");

  env.local.ctx = ctx;
  env.local.canvas = canvas;

  if (opts.Prolog) {
    await interpretate(opts.Prolog, {...env, context: [imageContext, g2d]});
  }

  const dpr = window.devicePixelRatio || 1;

  // but keep CSS size at logical px
  canvas.style.width = opts.ImageResolution[0]/dpr + "px";
  canvas.style.height = opts.ImageResolution[1]/dpr + "px";  


  env.local.refmap = new Map();
  await runOptcodes(env.local.ctx, optCodes, env.local.refmap);

  if (opts.Epilog) {
    await interpretate(opts.Epilog, {...env, context: [imageContext, g2d]});
  }

  return canvas;     
};

core['Canvas2D`Private`ctx'].virtual = true;

core['Canvas2D`Private`ctx'].update = async (args, env) => {
  const optCodes = await interpretate(args[1], env);
  await runOptcodes(env.local.ctx, optCodes, env.local.refmap);
};

core['Canvas2D`Private`ctx'].destroy = (args, env) => {
  env.local.canvas.remove();
  env.local.refmap.clear();
};

g2d.Image.virtual = true;
g2d.Graphics.virtual = true;


g2d.GraphicsGroupBox = g2d.GraphicsGroup;
g2d.GraphicsComplexBox = g2d.GraphicsComplex;
g2d.DiskBox = g2d.Disk;
g2d.LineBox = g2d.Line;
