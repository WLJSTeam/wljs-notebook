core.SlientPing = () => {
  console.log('Ppspsp... server is there');
}

class fakeSocket {

q = []

isFakeSocket = true

send = (expr) => {
  console.warn('No connection to a kernel... keeping in a pocket');
  this.q.push(expr)
}

constructor() {

}
}  

const promises = {}

class ServerIO {
  format = "ExpressionJSON";
  headSymbol = "EventFire";

  constructor(server, opts = {}) {
    this.server = server;
  }

  fire(uid, object, pattern = "Default") { //regular event call
    const data = encodeURIComponent(JSON.stringify(object));

    //!!
    //!! Send binary structure as optcodes
    //!! opt-code-fire-event [0] argument-count-[2] WXF-Encoded-Array-Of-2-objects-[...]
    
    this.server.socket.send(this.headSymbol+'["'+uid+'", "'+pattern+'", WLJSIOImport["'+data+'"]]');
  }

  poke(uid) { //superfast just send a dummy message (can be used for calling animation frame)
    this.server.socket.send(this.headSymbol+'["'+uid+'", True]');
  }

  request(ev, object, pattern = "Default") { //the same as event call, but returns the result
    const uid = uuidv4();

    const promise = new Deferred();
    promises[uid] = promise;

    const data = encodeURIComponent(JSON.stringify(object));
    this.server.socket.send('WLJSIORequest["'+uid+'"]["'+ev+'", "'+pattern+'", WLJSIOImport["'+data+'"]]');

    return promise.promise     
  }

  fetch(symbol, args=false) { //fetch any symbol value
    const uid = uuidv4();

    const promise = new Deferred();
    promises[uid] = promise;

    if (args) {
      const data = encodeURIComponent(JSON.stringify(args));
      this.server.socket.send('WLJSIOFetch["'+uid+'"]['+symbol+', WLJSIOImport["'+data+'"]]');
      return promise.promise     
    }

    this.server.socket.send('WLJSIOFetch["'+uid+'"]['+symbol+']');
    
    return promise.promise     
  }

  dispose() {

  }
}

//Server API
window.Server = class {
 
  socket = new fakeSocket();  

  trackedSymbols = {};
  name = 'Unknown';
  event;

  kernel;

  onMessage(event) {
    const uid = Math.floor(Math.random() * 100);
    const global = {call: uid};
    interpretate(JSON.parse(event.data), {global: global});
  }
  
  constructor(name = "Unknown") {
    console.warn('Server was constructed with name '+name);
    this.name = name;
    this.kernel = this;

    this.self = this;

    this.io = new ServerIO(this);
  }

  init(opts) {
    //opts: socket
    //opts: kernel

    if (!opts.socket) throw('Socket is not provided!');
    
    this.kernel = this;

    const self = this;

    if (opts.kernel) {
      console.log('kernel object was provided');
      this.kernel = opts.kernel;
    }

    if (this.socket.isFakeSocket) {
      console.warn('Sending all quered messages');

      this.socket.q.forEach((message)=>{
        opts.socket.send(message);
      });
    } 

    this.socket = opts.socket;

    
  }

  dispose() {
    //
    console.warn('Disposing all tracked symbols');
    Object.keys(this.trackedSymbols).forEach((sym) => {
      delete core[sym];
    });

    if (this.io) {
      this.io.dispose();
    }
  }

  //evaluate something on the master kernel and make a promise for the reply
  ask(expr, mode = undefined) { // DEPRICATED!!! needs to keep to support legacy code (NOT SECURE)
    const uid = uuidv4();

    const promise = new Deferred();
    promises[uid] = promise;
    console.log('Asking expr');
    console.log(expr);

    if (mode == 'callback') {
      this.socket.send('WLJSIOPromiseCallback["'+uid+'", ""]['+expr+']');
    } else {
      this.socket.send('WLJSIOPromise["'+uid+'", ""]['+expr+']');
    }
    

    return promise.promise 
  };
  //fire event on the secondary kernel (your working area) (no reply)
  emitt(uid, data, type = 'Default') { // DEPRICATED!!! needs to keep to support legacy code (NOT SECURE)
    this.socket.send('EventFire["'+uid+'", "'+type+'", '+data+']');
  };

  _emitt(uid, data, type) { // DEPRICATED!!! needs to keep to support legacy code (NOT SECURE)
    //unescaped version
    console.log({uid:uid, data:data, type:type});
    this.socket.send('EventFire["'+uid+'", '+type+', '+data+']');
  };    

  send(expr) { //// DEPRICATED!!! needs to keep to support legacy code (NOT SECURE)
    this.socket.send(expr);
  };

  getSymbol(expr) {
    const uid = uuidv4();

    const promise = new Deferred();
    promises[uid] = promise;
    //not implemented
    //console.error('askKernel is not implemented');
    //console.log('NotebookPromiseKernel["'+uid+'", ""][Hold['+expr+']]');
    this.socket.send('WLJSIOGetSymbol["'+uid+'", ""][Hold['+expr+']]');

    return promise.promise     
  }

  addTracker(name) {
    console.warn('added tracker for '+name);
    this.socket.send('WLJSIOAddTracking['+name+']')
  }
}

core.WLJSIOUpdateSymbol = async (args, env) => {
  const name = interpretate(args[0], env);
  //console.log("update");
  //update
  core[name].data = args[1];

  //console.log('instance list');
  //console.log(core[name].instances);

  for (const inst of Object.values(core[name].instances)) {
      await inst.update();
  };
}

core.WLJSIOPromiseResolve = (args, env) => {
  const uid = interpretate(args[0], env);
  if (args[1] == '$Failed') {
    promises[uid].reject(args[1]);
  } else {
    promises[uid].resolve(args[1]);
  }
  console.log('promise resolved! : ' + uid);
  delete promises[uid];
}

core.FireEvent = function(args, env) {
  const key = interpretate(args[0], env);
  const data = interpretate(args[1], env);

  server.kernel.emitt(key, data);
}

core.KernelFire = function(args, env) {
  const data = interpretate(args[0], env);

  server.talkKernel(data);
}

core.KernelEvaluate = function(args, env) {
  const data = interpretate(args[0], env);

  server.askKernel(data);
}

core.TalkMaster = async(args, env) => {
  const data = await interpretate(args[0], env);
  const wrapper = await interpretate(args[1], env);
  server.send(wrapper + '["' + JSON.stringify(data).replace(/"/gm, "\\\"") + '"]');
}

core.TalkKernel = async(args, env) => {
  const data = await interpretate(args[0], env);
  const wrapper = await interpretate(args[1], env);
  server.kernel.send(wrapper + '["' + JSON.stringify(data).replace(/"/gm, "\\\"") + '"]');
}

const bjtag = decodeURIComponent('%3Cscript%20type%3D%22module%22%3E');
const ejtsg = decodeURIComponent('%3C%2Fscript%3E');

core.WLXEmbed = async (args, env) => {
  const options = await core._getRules(args, {...env, hold:true});
  let html = await interpretate(args[0], env);

  if (Array.isArray(html)) {
    html = html.join('\n');   
  }

  setInnerHTML(env.element, html);

  if ('SideEffect' in options) {
    await interpretate(options.SideEffect, env);
  }
}   

core.WLXEmbed.destroy = async (args, env) => {
  await core._getRules(args, {...env});
  await interpretate(args[0], env);
}

let tryreload;
let attempts = 0;

tryreload = (failed) => {
  /*var state = history.state || {};
  var reloadCount = state.reloadCount || 0;
  if (performance.navigation.type === 1) { // Reload
      state.reloadCount = ++reloadCount;
      history.replaceState(state, null, document.URL);
  } else if (reloadCount) {
      reloadCount = 0;
      delete state.reloadCount;
      history.replaceState(state, null, document.URL);
  }


  if (reloadCount > 3) {
      reloadCount = 0;
      delete state.reloadCount;
      history.replaceState(state, null, document.URL);
      failed();
      return;
  }*/

  document.body.style.filter = "blur(10px)";
  attempts++;

  if (attempts > 5) {
    failed();
    return;
  }

  console.warn('Checking connection...');

  setTimeout(() => {
    fetch(window.location.protocol+'//'+window.location.host+'/ping').then((res)=>{
      if (res.status === 200) {
        console.warn('Reloading...');
        window.location.reload();
      } else {
        console.warn('Checking connection... FAILED');
        setTimeout(() => tryreload(failed), 500);
      }
    }, (rej)=>{
      console.warn('Checking connection... FAILED');
      setTimeout(() => tryreload(failed), 500);
    });

    
  }, 3000);

}
