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
    const data = interpretate.serializeWXF([1, uid, object, pattern]);
    this.server.socket.send(data);
  }

  poke(uid) { //superfast just send a dummy message (can be used for calling animation frame)
    const data = interpretate.serializeWXF([2, uid]);
    this.server.socket.send(data);
  }

  request(ev, object, pattern = "Default") { //the same as event call, but returns the result
    const uid = uuidv4();

    const promise = new Deferred();
    promises[uid] = promise;

    const data = interpretate.serializeWXF([3, uid, ev, object, pattern]);
    this.server.socket.send(data);

    return promise.promise     
  }

  fetch(symbol, args=false) { //fetch any symbol value
    const uid = uuidv4();

    const promise = new Deferred();
    promises[uid] = promise;

    if (args) {
      const data = interpretate.serializeWXF([5, uid, symbol, args]);
      this.server.socket.send(data);
      return promise.promise     
    }

    const data = interpretate.serializeWXF([4, uid, symbol]);
    this.server.socket.send(data);
    
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

  getSymbol(expr) {
    console.warn('requested '+expr);
    return this.io.fetch('WLJSIOGetSymbol', [expr]);    
  }

  addTracker(name) {
    console.warn('added tracker for '+name);
    return this.io.fetch('WLJSIOAddTracking', [name]);    
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
  console.log('Resolve!');
  const uid = interpretate(args[0], env);
  if (args[1] == '$Failed') {
    promises[uid].reject(args[1]);
  } else {
    promises[uid].resolve(args[1]);
  }
  console.log('promise resolved! : ' + uid);
  delete promises[uid];
}


let attempts = 0;

window.tryreload = (failed) => {
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
        setTimeout(() => window.tryreload(failed), 500);
      }
    }, (rej)=>{
      console.warn('Checking connection... FAILED');
      setTimeout(() => window.tryreload(failed), 500);
    });

    
  }, 3000);

}
