window.ObjectHashMap = {}
//storage for the frontend objects / executables
let garbageCollector = true;

window.ObjectStorage = class {
    refs = {}
    uid = ''
    cached = false
    cache = []
    doNotCollect = false
  
    garbageCollect() {
      console.warn('garbage collector started...');
      let toBeRemoved = true;
      const refs = this.refs;
      Object.keys(refs).forEach((key) => {
        if (refs[key].dead) {
          delete refs[key];
        } else {
          toBeRemoved = false;
        }
      });

      if (toBeRemoved && !this.doNotCollect && garbageCollector) {
        console.warn('No active refs. Removing...');
        delete ObjectHashMap[this.uid];
        this.cached = false;
        delete this.cache;
        delete this.refs;
      }
    }         
  
    constructor(uid) {
      this.uid = uid;
      ObjectHashMap[uid] = this;
      //check garbage
      //renewGarbageTimer();
    }           
  
    //assign an instance of FrontEndExecutable to it
    assign(obj) {
      this.refs[obj.instance] = obj;
    }         
  
    //remove a reference to the instance of FrontEndExecutable
    dropref(obj) {
      console.log('dropped ref: ' + obj.instance);
      delete this.refs[obj.instance];
    }         
  
    //update the data in the storage and go over all assigned objects
    update(newdata) {
      this.cache = newdata;
      Object.keys(this.refs).forEach((ref)=>{
        //console.log('Updating... ' + this.refs[ref].uid);
        this.refs[ref].update();
      });
    }         
  
    //just get the object (if not in the client -> ask for it and wait)
    get() {
      if (this.cached) return this.cache;
      const self = this;
      //throw('Object not found!');

      let target = server;

      const promise = new Deferred();
      console.log(target);
      getObject(target, self.uid).then((result) => {
        self.cache = result;
        self.cached = true;
        //console.log('resolved');
        //console.log(self.cache);
        promise.resolve(self.cache);
      }, (rejected) => {
        console.warn('Rejected! Trying evaluation server instance');
        target = server.kernel;
        
        if (typeof target != 'object') {
          console.error('Object not found on both Frontend & Evaluation Kernel: '+self.uid);
          console.warn(rejected);
          promise.reject('Object not found');
          return;
        }
        
        getObject(target, self.uid).then((result) => {
            self.cache = result;
            self.cached = true;
            //console.log('resolved');
            //console.log(self.cache);
            promise.resolve(self.cache);
        }, (rejected) => {
            console.error('Did not manage to get frontend object '+self.uid);
            console.warn(rejected);
            promise.reject('Object not found');
        });
      })

      return promise.promise;
    }
}



//firstly ask server.kernel.ask()
//if not an object or return $Failed, ask server.ask()

core['CoffeeLiqueur`Extensions`FrontendObject`Internal`Compressed'] = async (args, env) => {
  let string = args[0].slice(1,-1);
  string = await interpretate.unzlib64String(string);

  return await interpretate(JSON.parse(string), env);
}

//Extend Server Class
function getObject(server, id) {
    //console.log(server);
    return server.ask('CoffeeLiqueur`Extensions`FrontendObject`Internal`GetObject["'+id+'"]'); 
}

core.FrontEndVirtual = async (args, env) => {
  const copy = {...env};
  const store = args[0];
  const instance = new ExecutableObject('fevirtual-'+uuidv4(), copy, store);
  instance.assignScope(copy);


  return await instance.execute();
}


//element will be provided in 
core.FrontEndExecutable = async (args, env) => {
    console.log('executable object');
    const uid = await interpretate(args[0], env);

    let obj;
    console.log('check cache');
    if (ObjectHashMap[uid]) {
        obj = ObjectHashMap[uid];
    } else {
        obj = new ObjectStorage(uid);
    }
    //console.log(obj);

    const copy = {...env};
    let store;
    try {
      if (env.element) {
        let loadingMessage = false;
        const timer = setTimeout(() => {
          if (!env.element) return;
          loadingMessage = true;
          env.element.classList.add('floading');
        }, 50);

        store = await obj.get();
        clearTimeout(timer);
        if (loadingMessage) env.element.classList.remove('floading');
      } else {
        store = await obj.get();
      }

      
    } catch (err) {
      console.error(err);
      if (env.element) {
        env.element.innerText = err;
        env.element.style.color = "rgb(255, 85, 85)";
        env.element.style.background = "rgba(255, 179, 179, 0.2)";
        env.element.classList.add('px-2', 'py-1', 'rounded-md', 'text-xs');
        env.element.classList.remove('floading');
      }
    }

    const instance = new ExecutableObject('static-'+uuidv4(), copy, store, true); // STATIC
    instance.assignScope(copy);
    obj.assign(instance);

    return await instance.execute();
}

core.FrontEndExecutable.destroy = async (args, env) => {
  console.warn("Nothing to do. Will be purged automatically...");
}

//bug fix when importing an old format notebook, context gets lost
core["Global`FrontEndExecutable"] = core.FrontEndExecutable;

const protectedObjects = new Map();

const garbageCollect = () => {
  if (!garbageCollector) return;
  const list = Object.keys(ObjectHashMap);
  for (let i=0; i<list.length; i++) {
    const uid = list[i];
    if (protectedObjects.has(uid)) continue;
    ObjectHashMap[uid].garbageCollect();
  }  
}


core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"] = async (args, env) => {
  const type = await interpretate(args[0], env);
  return core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"][type](args.slice(1), env);
}


core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"].GarbageCollector = async (args, env) => {
  garbageCollector = await interpretate(args[0], env);
  if (garbageCollector) console.warn('Garbage collection was enabled!'); else console.warn('Garbage collection was disabled!');
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"].Protect = async (args, env) => {
  const list = await interpretate(args, env);
  list.forEach((e) => protectedObjects.set(e, true));
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"].Unprotect = async (args, env) => {
  const list = await interpretate(args, env);
  list.forEach((e) => protectedObjects.delete(e));
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"].GetAll = async (args, env) => {
  garbageCollect();
  const list = Object.values(ObjectHashMap);
  const message = [];
  for (let i=0; i<list.length; i++) {
    message.push(['Rule', "'"+list[i].uid+"'", list[i].cache]);
  }
  message.unshift('Association');
  //console.log(message);
  return message;
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"].GetAllUids = async (args, env) => {
  garbageCollect();
  const list = Object.values(ObjectHashMap);
  const message = [];
  for (let i=0; i<list.length; i++) {
    message.push("'"+list[i].uid+"'");
  }
  message.unshift('List');
  console.log(message);
  return message;
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"].GetById = async (args, env) => {
  const uid = await interpretate(args[0], env);
  const opts = await core._getRules(args, env);

  if ('MonitorEvent' in opts) {
    server.emitt(opts['MonitorEvent'], '"'+uid+'"');
  }

  const message = ObjectHashMap[uid].cache;
  
  console.log(message);//WL can't import empty arrays
  if (message.length) return message;
  return false;
}


core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"].GetAllSymbols = async (args, env) => {
  //garbageCollect();
  const list = Object.keys(server.kernel.trackedSymbols);
  const message = [];
  for (let i=0; i<list.length; i++) {
    if (Object.keys(core[list[i]].instances).length == 0) {
      console.warn('Dead symbol: '+list[i] + ' found!');
      if (!garbageCollector) {
        console.warn('keeping since gabrbage collector is disabled');
      } else {
        continue;
      }
    }
    message.push(['Rule', "'"+list[i]+"'", core[list[i]].data]);
  }
  message.unshift('Association');

  return message;
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"].GetAllSymbolsNames = async (args, env) => {
  //garbageCollect();
  const list = Object.keys(server.kernel.trackedSymbols);
  const message = [];
  for (let i=0; i<list.length; i++) {
    if (Object.keys(core[list[i]].instances).length == 0) {
      console.warn('Dead symbol: '+list[i] + ' found!');
      if (!garbageCollector) {
        console.warn('keeping since gabrbage collector is disabled');
      } else {
        continue;
      }
    }
    message.push("'"+list[i]+"'");
  }
  message.unshift('List');
  console.log(message);
  return message;
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`ExtractJSON"] = (args, env) => {
  const s = interpretate(args[0], env);
  return JSON.parse(decodeURIComponent(window.atob(s)));
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`ExtractJSONCompressed"] = async (args, env) => {
  let s = interpretate(args[0], env);
  s = await interpretate.unzlib64String(s);

  return JSON.parse(s);
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`ExtractCompressed"] = async (args, env) => {
  let s = interpretate(args[0], env);
  s = await interpretate.unzlib64String(s);

  const parsed = JSON.parse(s);
  return await interpretate(parsed, env);
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"].GetSymbolByName = async (args, env) => {
  //garbageCollect();
  const name = await interpretate(args[0], env);
  const opts = await core._getRules(args, env);

  if ('MonitorEvent' in opts) {
    server.emitt(opts['MonitorEvent'], '"'+name+'"');
  }

  const s = core[name].data;
  if (Array.isArray(s)) {
    if (s[0] == 'JSObject') {
      const str = JSON.stringify(s[1]);
      if (str.length < 1024)
        return ["CoffeeLiqueur`Extensions`FrontendObject`Tools`ExtractJSON", "'"+window.btoa(encodeURIComponent(str))+"'"];

      const compressedGzip = await interpretate.zlib64String(str); 
      return ["CoffeeLiqueur`Extensions`FrontendObject`Tools`ExtractJSONCompressed", "'"+compressedGzip+"'"];
    }
  }

  if (Array.isArray(s)) {
    if (s[0] == 'CoffeeLiqueur`Extensions`FrontendObject`Tools`ExtractCompressed') {
      return s; //already compressed
    }
  }

  //estiamte length
  const estimate = JSON.stringify(s);
  if (estimate.length > 1024) {
    const compressedGzip = await interpretate.zlib64String(estimate); 
    return ["CoffeeLiqueur`Extensions`FrontendObject`Tools`ExtractCompressed", "'"+compressedGzip+"'"];
  }
 
  return s;
}

core["CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects"].Get = async (args, env) => {
  //garbageCollect();
  //const list = Object.values(ObjectHashMap);
  const uid = await interpretate(args[0], env);
  if (ObjectHashMap[uid]) { 
    return ObjectHashMap[uid].cache;
  } else {
    console.error('UIObjects get could not find an object');
    return ['$Failed'];
  }
}
