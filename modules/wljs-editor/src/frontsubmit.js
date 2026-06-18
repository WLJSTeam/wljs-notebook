core.FSAskKernelSocket = async (args, env) => {
    return await server.kernel.ask('Global`$Client');
}

core.FSAsk = async (args, env) => {
    const result = await interpretate(args[0], env);
    const uid = await interpretate(args[1], env);
    console.warn("A request from kernel server");
    //console.log(result);
    //console.log(JSON.stringify(result));

    server.kernel.emitt(uid, '"' + encodeURIComponent(JSON.stringify(result)) + '"');
}

const references = {};

core.FrontInstanceReference = (args, env) => {
    if (env.hold) {
      console.log('Held FrontInstanceReference expression!');
      return ["FrontInstanceReference", ...args];
    }
  
    const uid = interpretate(args[0], env);
  
    //an exception if no instance provided
    if (!env.root) {
      console.log('No instance provided!!!');
      console.log('Attaching env only');
  
      references[uid] = {
        noInstanceQ: true,
        env: env
      };
  
      return null;
    }
  
  
    const inst = env.root.instance;
  
    console.log('instance '+inst+' is referenced as '+uid);

    references[uid] = env;
  
  
    return null;
  }
  
core.FrontInstanceReference.update = (args, env) => {
    //void
}
  
core.FrontInstanceReference.destroy = (args, env) => {
  //FIXME: Probably will never be called!!!
    const uid = interpretate(args[0], env);
    console.log('dispose instancereference for instance '+env.root.instance);

    delete references[uid];
}  

//alias
core['CoffeeLiqueur`Extensions`Communication`FrontInstanceReference'] = core.FrontInstanceReference

var delay = ms => new Promise(r => setTimeout(r, ms));

core['CoffeeLiqueur`Extensions`Communication`Private`execJS'] = async (args, env) => {
  const expr = await interpretate(args[0], env);
  return await eval('(function () {\n'+expr+'\n})()');
}

core['CoffeeLiqueur`Extensions`Communication`Private`exec'] = async (args, env) => {
    const expr = args[0];
    const uid = interpretate(args[1], env);

    if (uid in references) {
        let r = references[uid];

        if (r.noInstanceQ) {
            r = r.env;
            console.log('plain env. No instance specified'); 
            //will be normally disposed
            const copy = {...r};
            //merge the scope
            copy.scope = {...copy.scope, ...env.scope};
    
            return (await interpretate(expr, copy))
        }

        if (r.root.dead) {
          console.log('instance is dead!');
          delete references[uid];
          return undefined;
        }

        //~~NOneeed: create an independent stack
        //will be normally disposed
        const copy = {...r};
      
        //merge the scope
        copy.scope = {...copy.scope, ...env.scope};
  
        //if sleeping?
        if (copy.wake) copy.wake();

        return (await interpretate(expr, copy));  
    } else {
      for (let i=0; i<10; ++i) {
        console.log('Reference not found. Retry...');
        await delay(5);
        if (uid in references) {
          let r = references[uid];

          if (r.noInstanceQ) {
              r = r.env;
              console.log('plain env. No instance specified'); 
              //will be normally disposed
              const copy = {...r};
              //merge the scope
              copy.scope = {...copy.scope, ...env.scope};
          
              return (await interpretate(expr, copy))
          }

          if (r.root.dead) {
            console.log('instance is dead!');
            delete references[uid];
            return undefined;
          }

          //~~NOneeed: create an independent stack
          //will be normally disposed
          const copy = {...r};
        
          //merge the scope
          copy.scope = {...copy.scope, ...env.scope};
        
          //if sleeping?
          if (copy.wake) copy.wake();

          return (await interpretate(expr, copy));  
        }
      }
    }
}


const instancesGroups = {};

core.FrontInstanceGroup = async (args, env) => {
  const uid = interpretate(args[0], env);
  //throw env.global.stack;
  const stack = {};
  instancesGroups[uid] = stack; //replace stack with a new one, cuz anyway it will be manually disposed.

  const result = await interpretate(args[1], {...env, global: {...env.global, stack: stack}});

  

  /*const after = Object.keys(env.global.stack);
  instancesGroups[uid] = after.filter(x => !before.includes(x)).map((e)=>env.global.stack[e]);*/
  

  return result;
}
//alias
core['CoffeeLiqueur`Extensions`Communication`FrontInstanceGroup'] = core.FrontInstanceGroup

core['CoffeeLiqueur`Extensions`Communication`Private`groupRemove'] = (args, env) => {
  const uid = interpretate(args[0], env); 
  const g = instancesGroups[uid];
  if (!g) return;

  Object.values(g).forEach((el) => {
    el.dispose();
  });

  delete instancesGroups[uid];
}

core['CoffeeLiqueur`Extensions`Communication`Private`groupRemoveAll'] = async (args, env) => {
    const uids = await interpretate(args[0], env); 

    for (const k of uids) {
        const g = instancesGroups[k];
        if (!g) continue;
        Object.values(g).forEach((el) => {
          el.dispose();
        });
    
        delete instancesGroups[k];
    }
}

