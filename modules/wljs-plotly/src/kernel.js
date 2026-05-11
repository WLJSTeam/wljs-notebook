  Array.prototype.max = function() {
    return Math.max.apply(null, this);
  };
  
  Array.prototype.min = function() {
    return Math.min.apply(null, this);
  };

  function arrDepth(arr) {
    if (arr[0].length === undefined)        return 1;
    if (arr[0][0].length === undefined)     return 2;
    if (arr[0][0][0].length === undefined)  return 3;
  } 

  function transpose(matrix) {
    let newm = structuredClone(matrix);
    for (var i = 0; i < matrix.length; i++) {
      for (var j = 0; j < i; j++) {
   
        newm[i][j] = matrix[j][i];
        newm[j][i] = matrix[i][j];
      }
    } 
    return newm;
  } 
  let plotly = {};

  let Plotly = false;

  plotly.DateObject = async (args, env) => {
    const list = await interpretate(args[0], env);
    switch(list.length) {
      case 1:
        return new Date(list[0]);
      case 2:
        return new Date(list[0], list[1]-1);
      case 3:
        return new Date(list[0], list[1]-1, list[2]);
      case 4:
        return new Date(list[0], list[1]-1, list[2], list[3]);
      case 5:
        return new Date(list[0], list[1]-1, list[2], list[3], list[4]);
      case 6:
        return new Date(list[0], list[1]-1, list[2], list[3], list[4], list[5]);
      case 7:
        return new Date(list[0], list[1]-1, list[2], list[3], list[4], list[5], list[6]);
      default:
        return new Date();
    }
  } 

  const iPlotlyNewPlot = async (args, env) => {
    if (!Plotly) Plotly = await import('plotly.js-dist-min');

    const options = await core._getRules(args, env);
    const copy = {...env, context: plotly};


    let data = await interpretate(args[0], copy);
    if (data instanceof NumericArrayObject) {
      data = data.normal();
    }
    const layout = await interpretate(args[1], copy);
    if (layout.ImageSize && !(layout.width) && !(layout.height)) {
      let imageSize = layout.ImageSize;
      delete layout.ImageSize;

      if (typeof imageSize === 'number') {
        if (imageSize < 1) {
          imageSize = 10000.0 * imageSize / 2.0;
        }
      } else if (typeof imageSize === 'string'){
        imageSize = core.DefaultWidth;
      }  

      if (!Array.isArray(imageSize)) {
        imageSize = [imageSize, imageSize * 0.67];
      }

      layout.width = imageSize[0];
      layout.height = imageSize[1];
    }

    Plotly.newPlot(env.element, data, layout);
    env.local.instance = env.element;

    if (options.SystemEvent) {
      server.kernel.io.poke(options.SystemEvent);
    }

  }

  iPlotlyNewPlot.destroy = (args, env) => {
    Plotly.purge(env.local.instance);
    console.warn('Plotly destroyed!');
  }

  iPlotlyNewPlot.virtual = true;


  core["CoffeeLiqueur`Extensions`Plotly`Private`iPlotlyNewPlot"] = iPlotlyNewPlot

  //legacy support
  core["Plotly`newPlot"] = iPlotlyNewPlot;
  core["PlotlyNewPlot"] = iPlotlyNewPlot;



  core["CoffeeLiqueur`Extensions`Plotly`Private`iPlotlyAddTraces"] = async (args, env) => {
    console.warn(env.local);
    const traces = await interpretate(args[0], {...env, context: plotly});
    Plotly.addTraces(env.local.instance, traces);
  }

  core["CoffeeLiqueur`Extensions`Plotly`Private`iPlotlyRemoveTraces"] = async (args, env) => {
    const traces = await interpretate(args[0], env);
    Plotly.deleteTraces(env.local.instance, traces);
  }

  core["CoffeeLiqueur`Extensions`Plotly`Private`iPlotlyExtendTraces"] = async (args, env) => {
    const copy = {...env, context: plotly};
    const traces = await interpretate(args[0], copy);
    const arr = await interpretate(args[1], copy);
    Plotly.extendTraces(env.local.instance, traces, arr);
  }

  core["CoffeeLiqueur`Extensions`Plotly`Private`iPlotlyReact"] = async (args, env) => {
    const copy = {...env, context: plotly};
    let data = await interpretate(args[0], copy);
    if (data instanceof NumericArrayObject) {
      data = data.normal();
    }
    const layout = await interpretate(args[1], copy);

    Plotly.react(env.local.instance, data, layout);
  }  

  core["CoffeeLiqueur`Extensions`Plotly`Private`iPlotlyRestyle"] = async (args, env) => {
    const copy = {...env, context: plotly};
    let data = await interpretate(args[0], copy);
    if (data instanceof NumericArrayObject) {
      data = data.normal();
    }

    if (args.length < 2) {
      Plotly.restyle(env.local.instance, data);
      return;
    }

    const traces = await interpretate(args[1], copy);
    Plotly.restyle(env.local.instance, data, traces); 
  }  
  
  core["CoffeeLiqueur`Extensions`Plotly`Private`iPlotlyRelayout"] = async (args, env) => {
    const lay = await interpretate(args[0], {...env, context: plotly});
    Plotly.relayout(env.local.instance, lay); 
  }   

  core["CoffeeLiqueur`Extensions`Plotly`Private`iPlotlyAnimate"] = async (args, env) => {
    const copy = {...env, context: plotly};
    const traces = await interpretate(args[0], copy);
    const arr = await interpretate(args[1], copy);
    Plotly.animate(env.local.instance, traces, arr);
  }  

  core["CoffeeLiqueur`Extensions`Plotly`Private`iPlotlyPrependTraces"] = async (args, env) => {
    const copy = {...env, context: plotly};
    const traces = await interpretate(args[0], copy);
    const arr = await interpretate(args[1], copy);
    Plotly.prependTraces(env.local.instance, traces, arr);
  }
  
  const iListPlotly =  async function(args, env) {
      if (!Plotly) Plotly = await import('plotly.js-dist-min');
 
      env.numerical = true;
      let arr = await interpretate(args[0], {...env, context: plotly});
      if (arr instanceof NumericArrayObject) {
        arr = arr.normal();
      }
      let newarr = [];

      let options = {};
      if (args.length > 1) options = await core._getRules(args, env);

      console.log('options');
      console.log(options);

      switch(arrDepth(arr)) {
        case 1:
          newarr.push({y: arr, mode: 'markers'});
        break;
        case 2:
          if (arr[0].length === 2) {
            console.log('1 XY plot');
            let t = transpose(arr);
      
            newarr.push({x: t[0], y: t[1], mode: 'markers'});
          } else {
            console.log('multiple Y plot');
            arr.forEach(element => {
              newarr.push({y: element, mode: 'markers'}); 
            });
          }
        break;
        case 3:
          arr.forEach(element => {
            let t = transpose(element);
            newarr.push({x: t[0], y: t[1], mode: 'markers'}); 
          });
        break;      
      }

      Plotly.newPlot(env.element, newarr, {autosize: false, width: core.DefaultWidth, height: core.DefaultWidth*0.618034, margin: {
          l: 30,
          r: 30,
          b: 30,
          t: 30,
          pad: 4
        }});
      
      if (!('RequestAnimationFrame' in options)) return;
      
          console.log('request animation frame mode');
          const list = options.RequestAnimationFrame;
          const event = list[0];
          const symbol = list[1];
          const depth = arrDepth(arr);
          
          const request = function() {
            core.FireEvent(["'"+event+"'", 0]);
          }

          const renderer = async function(args2, env2) {
            let arr2 = await interpretate(args2[0], env2);
            let newarr2 = [];
      
            switch(depth) {
              case 1:
                newarr2.push({y: arr2});
              break;
              case 2:
                if (arr2[0].length === 2) {
                 
                  let t = transpose(arr2);
            
                  newarr2.push({x: t[0], y: t[1]});
                } else {
         
                  arr2.forEach(element => {
                    newarr2.push({y: element}); 
                  });
                }
              break;
              case 3:
                arr2.forEach(element => {
   
                   let newEl = transpose(element);
                  newarr2.push({x: newEl[0], y: newEl[1]}); 
                });
              break;      
            }

            Plotly.animate(env.element, {
              data: newarr2
            }, {
              transition: {
                duration: 30
              },
              frame: {
                duration: 0,
                redraw: false
              }
            });

            requestAnimationFrame(request);
          } 
          console.log('assigned to the symbol '+symbol);
          core[symbol] = renderer;
          request();
    }


    iListPlotly.destroy = ()=>{};
    iListPlotly.virtual = true;

    core['CoffeeLiqueur`Extensions`Plotly`Private`iListPlotly'] = iListPlotly;

    //legacy
    core['ListPlotly'] = iListPlotly;
    

    const iListLinePlotly = async function(args, env) {
      if (!Plotly) Plotly = await import('plotly.js-dist-min');
      console.log('listlineplot: getting the data...');
      let options = await core._getRules(args, env);


      let arr = await interpretate(args[0], {...env, numerical: true, context: plotly});
      if (arr instanceof NumericArrayObject) {
        arr = arr.normal();
      }
      console.log('listlineplot: got the data...');
      //console.log(arr);
      let newarr = [];

      console.log(options);
      /**
       * @type {[Number, Number]}
       */
      let ImageSize = options.ImageSize || [core.DefaultWidth, 0.618034*core.DefaultWidth];
  
      const aspectratio = options.AspectRatio || 0.618034;
  
      //if only the width is specified
      if (!(ImageSize instanceof Array)) ImageSize = [ImageSize, ImageSize*aspectratio];
  
      console.log('Image size');
      console.log(ImageSize);         

      switch(arrDepth(arr)) {
        case 1:
          newarr.push({y: arr});
        break;
        case 2:
          if (arr[0].length === 2) {
            console.log('1 XY plot');
            let t = transpose(arr);
            console.log(t);
      
            newarr.push({x: t[0], y: t[1]});
          } else {
            console.log('multiple Y plot');
            arr.forEach(element => {
              newarr.push({y: element}); 
            });
          }
        break;
        case 3:
          arr.forEach(element => {
             
             let newEl = transpose(element);
            newarr.push({x: newEl[0], y: newEl[1]}); 
          });
        break;      
      }

      Plotly.newPlot(env.element, newarr, {autosize: false, width: ImageSize[0], height: ImageSize[1], margin: {
          l: 30,
          r: 30,
          b: 30,
          t: 30,
          pad: 4
        }});  

        env.local.element = env.element;
    }   

    iListLinePlotly.update = async (args, env) => {
      env.numerical = true;
      console.log('listlineplot: update: ');
      console.log(args);
      console.log('interpretate!');
      let arr = await interpretate(args[0], env);
      if (arr instanceof NumericArrayObject) {
        arr = arr.normal();
      }
      console.log(arr);    

      let newarr = [];

      let minmax = {x:[0], y:[0]};

      switch(arrDepth(arr)) {
        case 1:
          newarr.push({y: arr});
          minmax.x = [0, arr.length];
          minmax.y = [arr.min(), arr.max()];

        break;
        case 2:
          if (arr[0].length === 2) {
            console.log('1 XY plot');
            let t = transpose(arr);
      
            newarr.push({x: t[0], y: t[1]});

            minmax.x = [t[0].min(), t[0].max()];
            minmax.y = [t[1].min(), t[1].max()];

          } else {
            console.log('multiple Y plot');
            arr.forEach(element => {
              newarr.push({y: element}); 
            });
          }
        break;
        case 3:
          arr.forEach(element => {
            let newEl = transpose(element);
            
            newarr.push({x: newEl[0], y: newEl[1]}); 
          });
        break;      
      }

      console.log("plotly with a new data: ");
      console.log(newarr);
      console.log("env");
      console.log(env);




      Plotly.animate(env.local.element, {
        data: newarr,
      }, {
        transition: {
          duration: 100,
          easing: 'cubic-in-out'
        },
        frame: {
          duration: 100
        }
      });     
    }
    
    iListLinePlotly.destroy = ()=>{};

    iListLinePlotly.virtual = true

    core['CoffeeLiqueur`Extensions`Plotly`Private`iListLinePlotly'] = iListLinePlotly;

    //legacy
    core['ListLinePlotly'] = iListLinePlotly;
