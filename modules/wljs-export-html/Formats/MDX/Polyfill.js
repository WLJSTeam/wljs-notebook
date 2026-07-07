/* Polyfill for React based websites. It replaces server object and redirect all output to buffers */
/* add it to the head tag using any CDN */

//setting up global virtual server
const server = {};
window.server = server;

let promises;
let symbols;
let preloadedSymbols;
let eventsPool;

server._disposeSymbols = (symbols) => {
  if (!symbols) return;
  let copy = Object.keys(symbols ?? {});
  copy.forEach(sym => {
    delete core[sym]
    delete symbols[sym];
  });
  return copy;
} 


server.loadKernel = async (payload) => {
    if (!payload) return;

    console.warn('Loading kernels...');

    const virtualMachinesData = await interpretate(payload, {});
    const virtualMachines = [];

    for (const machine of virtualMachinesData) {
      const bbox = new server.BlackBox[machine.Class]();
      await bbox.init(machine);

      virtualMachines.push(bbox);
    }

    const length = virtualMachines.length;

    server.kernel = {
      io: {
        fire: (evId, payload, pattern="Default") => {
          for (let i=0; i<length; ++i)
            virtualMachines[i].run(evId, payload, pattern);
        },

        poke: (evId) => {
          for (let i=0; i<length; ++i)
            virtualMachines[i].run(evId, true, 'Default');
        }
      },
      emitt: () => {
        console.warn('Emitt is not supported');
      }
    } 

    return true;
} 

server.loadObjects = (result) => {
    interpretate(result.objects, {hold:true}).then((i) => {
        console.warn('Objects loaded!');
        Object.keys(i).forEach((oName) => {
          console.log('Object ' + oName + ' was loaded');
          const obj = new ObjectStorage(oName);
          obj.cache = i[oName];
          obj.cached = true;
        });

        Object.keys(promises).forEach((key) => {
          if (Array.isArray(promises[key])) {
            console.log('request ' + key + ' promise resolved');
            promises[key].forEach((el) => el.resolve(i[key]));
          } else {
            promises[key].resolve(i[key]);
          }
        })
      });

      interpretate(result.symbols, {hold:true}).then((i) => {
        console.warn('Symbols loaded!');
        Object.keys(i).forEach((oName) => {
          console.log('Symbol ' + oName + ' was loaded');

          preloadedSymbols[oName] = true;
          
          core[oName] = async (args, env) => {
            const data = await interpretate(core[oName].data, env);
            return data;
          }
          core[oName].data = i[oName]
          core[oName] = async (args, env) => {
            console.log('IE: calling our symbol...');
            //evaluate in the context
            const data = await interpretate(core[oName].data, env);

            if (env.root && !env.novirtual) core[oName].instances[env.root.uid] = env.root; //if it was evaluated insdide the container, then, add it to the tracking list
            //if (env.hold) return ['JSObject', core[name].data];
            if (args.length > 0) {
              const key = await interpretate(args[0], env);
              return data[key];
            }
        
            return data;
          }
        
          core[oName].update = async (args, env) => {
            //evaluate in the context
            //console.log('IE: update was called...');
            const aQ = args.length > 0;
        
            //cache good for numerics
            if (env.useCache && !aQ) {
              if (!core[oName].cached || core[oName].currentData != core[oName].data) {
                core[oName].cached = await interpretate(core[oName].data, env);
                core[oName].currentData = core[oName].data; //just copy the reference
                //console.log('cache miss');
              } 
        
              return core[oName].cached;
            }
        
            const data = await interpretate(core[oName].data, env);
            if (aQ) {
              const key = await interpretate(args[0], env);
              return data[key];
            }
            //if (env.hold) return ['JSObject', data];
            return data;
          }  
        
          core[oName].destroy = async (args, env) => {
        
            delete core[oName].instances[env.root.uid];
            console.warn(env.root.uid + ' was destroyed')
            console.warn('external symbol was destoryed');
          }  
        
          core[oName].data = structuredClone(i[oName]); //get the data
        
          core[oName].virtual = true;
          core[oName].instances = {};

        });

        Object.keys(symbols).forEach((key) => {
          if (symbols[key].resolve) {
            console.log('request ' + key + ' promise resolved');
            symbols[key].resolve(i[key]);
          }
        });
      });
      
      
}

server.flushEvents = () => {
    eventsPool.forEach((ev) => {
        if (ev[0] == 'fire') {
          server.kernel.io.fire(ev[1], ev[2], ev[3]);
        } else if (ev[0] == 'poke') {
          server.kernel.io.poke(ev[1]);
        }
    });
    eventsPool = [];
}

server.resetIO = () => {
    console.warn('Virtual server hard reset');

    server._disposeSymbols(symbols);
    server._disposeSymbols(preloadedSymbols);

    promises = {};
    symbols =  {};
    preloadedSymbols = {};

    eventsPool = [];

    server.kernel = {
        io: {
          fire(uid, payload, pattern="Default") {
            eventsPool.push(['fire', uid, payload, pattern]);
          },
          poke(uid) {
            eventsPool.push(['poke', uid]);
          }
        },
        emitt: () => {
          console.warn('Emitt is not supported');
        }
    };

    server.io = {};

    server.ask = (what) => {
        const p = new Deferred();
        
        if (what.length < 42) {
          console.error('Unknown command');
          console.error(what);
          return false;
        }
        //throw what;
        const offset = 'CoffeeLiqueur`Extensions`FrontendObject`Internal`GetObject["'.length;
        if (Array.isArray(promises[what.slice(offset,-2)])) {
          promises[what.slice(offset,-2)].push(p);
        } else {
          promises[what.slice(offset,-2)] = [p];
        }
        
        return p.promise;
      }

      server.getSymbol = (name) => {
        const p = new Deferred();

        console.warn('Asking for symbol' + name);

        symbols[name] = p;
        return p.promise;
      }   
}


//Polyfills for WLJSIO package

interpretate.anonymous = async (d, org) => {
    //TODO Check if it set delayed or set... if set, then one need only to cache it
    console.log('Anonimous symbol: ' + JSON.stringify(d));  
  
    let name;
    let associationQ = false;
    //check it is a plain symbol
    if (d instanceof Array) {
      name = d[0];
      associationQ = true;
    } else {
      name = d;   //symbol
    }
  
    let data;
    const p = new Deferred();

    console.warn('Asking for symbol' + name);

    symbols[name] = p;
    data = await p.promise;
    
  
    //if it is OK
  
    core[name] = async (args, env) => {
      console.log('IE: calling our symbol...');
      //evaluate in the context
      // 
      const data = await interpretate(core[name].data, env);

      if (args) if (args.length > 0) {
          const key = await interpretate(args[0], env);
          return data[key];
      }
  
      if (env.root && !env.novirtual) core[name].instances[env.root.uid] = env.root; //if it was evaluated insdide the container, then, add it to the tracking list
      //if (env.hold) return ['JSObject', core[name].data];
  
      return data;
    }
  
    core[name].update = async (args, env) => {
      //evaluate in the context
      //console.log('IE: update was called...');
      if (args) if (args.length > 0) {
          const data = await interpretate(core[element].data, env);
          const key = await interpretate(args[0], env);
          return data[key];
      }
  
      //cache good for numerics
      if (env.useCache) {
        if (!core[name].cached || core[name].currentData != core[name].data) {
          core[name].cached = await interpretate(core[name].data, env);
          core[name].currentData = core[name].data; //just copy the reference
          //console.log('cache miss');
        } 
  
        return core[name].cached;
      }
  
      const data = await interpretate(core[name].data, env);
      //if (env.hold) return ['JSObject', data];
      return data;
    }  
  
    core[name].destroy = async (args, env) => {
  
      delete core[name].instances[env.root.uid];
      console.warn(env.root.uid + ' was destroyed')
      console.warn('external symbol was destoryed');
    }  
  
    core[name].data = data; //get the data
  
    core[name].virtual = true;
    core[name].instances = {};
  
    //interpretate it AGAIN!
    return interpretate(d, org);
  }


//Polyfills fro WLJSIO package
core.Offload = (args, env) => {
  if (args.length > 1) {
      //alternative path - checking options
      //do it in ugly superfast way
      if (args[1][1] === "'Static'") {
          if (args[1][2] && args[1][2] != 'False') {
              return interpretate(args[0], {...env, static: true});
          }
      } else if (args.length > 2) {
          if (args[2][1] === "'Static'") {
              if (args[2][2] && args[2][2] != 'False') {
                  return interpretate(args[0], {...env, static: true});
              }                
          }
      }
  }

  return interpretate(args[0], env);
}

core.Offload.update = (args, env) => {
  
  if (args.length > 1) {
      //alternative path - checking options
      //do it in ugly superfast way

      //Volitile -> False -> Reject updates

      //low-level optimizations, we dont' need to spend time on parsing options
      
      if (args[1][1] === "'Volatile'") {
          if (!args[1][2] || args[1][2] != 'True') {
              console.log('Update was rejected (Nonvolatile)');
              return;
          }
      } else if (args.length > 2) {
 
          if (args[2][1] === "'Volatile'") {
              if (!args[2][2] || args[2][2] != 'True') {
                  console.log('Update was rejected (Nonvolatile)');
                  return;
              }                
          }
      }
  }

  return interpretate(args[0], env);
}
