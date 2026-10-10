const aflatten = (ary) => ary.flat(Infinity);

import {unzlibSync, zlibSync} from 'fflate';


class Deferred {
  promise = {}
  reject = {}
  resolve = {}          

  constructor() {
    this.promise = new Promise((resolve, reject)=> {
      this.reject = reject
      this.resolve = resolve
    });
  }
}  

const chunkArray = (arr, size) => {
  if (size <= 0) throw new Error("Size must be greater than zero.");
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

const insertHeads = (arr, head) => {
  if (Array.isArray(arr[0])) {
    return [head, ...arr.map((el) => insertHeads(el, head))];
  } else {
    return [head, ...arr];
  }
}

class NumericArrayObject {
  dims;
  buffer;

  constructor(buffer, dims) {
    this.buffer = buffer;
    this.dims = dims;

    return this;
  }

  toJSON() {
    return this.normal()
  }

  normal() {
    let chunked = Array.from(this.buffer);
    
    for (let i = this.dims.length-1; i>0; --i) {
      chunked = chunkArray(chunked, this.dims[i]);
    }   
    
    return chunked;
  }

  static Q(obj) {
    return (obj instanceof NumericArrayObject)
  }
}

window.NumericArrayObject = NumericArrayObject;

class Complex {
  constructor(re, im) {
      this.re = re;
      this.im = im;
  }

  static isComplex(obj) {
    return (obj instanceof Complex)
  }

  add(complex) {
      return new Complex(this.re + complex.re, this.im + complex.im);
  }

  subtract(complex) {
      return new Complex(this.re - complex.re, this.im - complex.im);
  }

  multiply(complex) {
      const re = this.re * complex.re - this.im * complex.im;
      const im = this.re * complex.im + this.im * complex.re;
      return new Complex(re, im);
  }

  divide(complex) {
      const denominator = complex.re ** 2 + complex.im ** 2;
      const re = (this.re * complex.re + this.im * complex.im) / denominator;
      const im = (this.im * complex.re - this.re * complex.im) / denominator;
      return new Complex(re, im);
  }
}

function isNumeric(value) {
  return /^-?\d+$/.test(value);
}

const WLNumber = new RegExp(/^(-?\d+)(.?\d*)(\*\^)?(\d*)/);

window.Complex = Complex;
window.Deferred = Deferred;
window.aflatten = aflatten;

window.isNumeric = isNumeric;

var interpretate = (d, env = {}) => {        

  if (typeof d === 'undefined') {
    console.log('undefined object');
    return d;
  }

  const stringQ = typeof d === 'string';
  //console.log(d);
  //console.log(stringQ);
  //real string
  if (stringQ) {
    if (d.charAt(0) == "'") return d.slice(1, -1);
    if (isNumeric(d)) return parseInt(d); //for Integers
  
    if (WLNumber.test(d)) {

      //deconstruct the string
      let [begin, floatString, digits, man, power] = d.split(WLNumber);
    
      if (digits === '.')
        floatString += digits + '0';
      else
        floatString += digits;
    
      if (man)
        floatString += 'E' + power;


    
      return parseFloat(floatString);
    }

    //in safe mode just convert unknown symbols into a string
    //if (!env.unsafe) return d;
    //if not. it means this is a symbol
  }
  if (typeof d === 'number') {
    return d; 
  }

  //console.log('type '+String(typeof d)+' of '+JSON.stringify(d));

  //if not a JSON array, probably a promise object or a function
  if (!(d instanceof Array) && !stringQ) return d;


  //console.log(env);


  //reading the structure of Wolfram ExpressionJSON
  let name;
  let args;

  if (stringQ) {
    //symbol
    name = d;
    args = undefined;
  } else {
    //subvalue
    name = d[0];
    args = d.slice(1, d.length);
  }

  //console.log("interpreting...");
  //console.log(name);
  //console.log(name);

  //checking the scope
  if ('scope' in env) 
    if (name in env.scope) 
      return env.scope[name](args, env);



  //checking the context
  if ('context' in env) {
    if (Array.isArray(env.context)) {
      //go one by one
      for (let cc=0; cc<env.context.length; ++cc) {
        if (!(name in env.context[cc])) continue;
        
        if (env['method']) {
          if (!env.context[cc][name][env.method]) return console.error('method '+env['method']+' is not defined for '+name);
          return env.context[cc][name][env.method](args, env);
        }
  
        //fake frontendexecutable
        //to bring local vars and etc
        if ('virtual' in env.context[cc][name] && !(env.novirtual)) {
          const obj = new ExecutableObject('virtual-'+uuidv4(), env, d);
          let virtualenv = obj.assignScope();
          //console.log('virtual env');
          obj.firstName = name;
          //console.log(virtualenv);
          return env.context[cc][name](args, virtualenv);    
        }
  
        return env.context[cc][name](args, env);        
      }

    } else if (name in env.context) {
      //checking the method
      if (env['method']) {
        if (!env.context[name][env.method]) return console.error('method '+env['method']+' is not defined for '+name);
        return env.context[name][env.method](args, env);
      }

      //fake frontendexecutable
      //to bring local vars and etc
      if ('virtual' in env.context[name] && !(env.novirtual)) {
        const obj = new ExecutableObject('virtual-'+uuidv4(), env, d);
        let virtualenv = obj.assignScope();
        //console.log('virtual env');
        obj.firstName = name;
        //console.log(virtualenv);
        return env.context[name](args, virtualenv);    
      }

      return env.context[name](args, env);
    }
  }

  //just go over all contextes defined to find the symbol
  const c = interpretate.contextes;

  for (let i = 0; i < c.length; ++i) {
    if (name in c[i]) {
      //console.log('symbol '+name+' was found in '+c[i].name);

      if (env['method']) {
        if (!c[i][name][env.method]) return console.error('method '+env['method']+' is not defined for '+name);
        return c[i][name][env.method](args, env);
      }

      //fake frontendexecutable
      //to bring local vars and etc
      if ('virtual' in c[i][name] && !(env.novirtual)) {
        const obj = new ExecutableObject('virtual-'+uuidv4(), env, d);
        let virtualenv = obj.assignScope();
        //console.log('virtual env');

        obj.firstName = name;
        //console.log(virtualenv);        
        return c[i][name](args, virtualenv);    
      }     

      return c[i][name](args, env);    
    }
  };

  return (interpretate.anonymous(d, env));          
};

const hashCode2 = function (s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
};

// Small helper to mix two 32-bit ints
const mix = (acc, value) => {
  // a tiny avalanche-ish mixer
  acc = (acc ^ value) | 0;
  acc = Math.imul(acc, 0x45d9f3b) | 0;
  acc = (acc ^ (acc >>> 16)) | 0;
  return acc;
};

interpretate.hashv2 = (d) => {
  if (typeof d === 'undefined') {
    console.log('undefined object');
    return hashCode2('undefined');
  }

  const stringQ = typeof d === 'string';

  // real string
  if (stringQ) {
    if (d.charAt(0) == "'") return hashCode2(d.slice(1, -1));
    if (isNumeric(d)) return hashCode2(String(parseInt(d))); // for Integers

    if (WLNumber.test(d)) {
      let [begin, floatString, digits, man, power] = d.split(WLNumber);

      if (digits === '.')
        floatString += digits + '0';
      else
        floatString += digits;

      if (man)
        floatString += 'E' + power;

      return hashCode2(String(parseFloat(floatString)));
    }

    // symbol or normal string
    return hashCode2(d);
  }

  if (typeof d === 'number') {
    return hashCode2(String(d));
  }

  if (typeof d === 'boolean') {
    return d ? hashCode2('true') : hashCode2('false');
  }

  if (d === null) {
    return hashCode2('null');
  }

  // if not a JSON array, probably a promise object or a function
  if (!(d instanceof Array)) return hashCode2(String(d));

  // Array hashing (order-sensitive + tagged)
  // Start with a tag + length to reduce structural collisions
  let h = mix(hashCode2('Array'), d.length | 0);

  for (let i = 0; i < d.length; i++) {
    const eh = interpretate.hashv2(d[i]);
    // incorporate index so equal elements in different positions differ
    h = mix(h, (Math.imul(31, eh) + i) | 0);
  }

  return h | 0;
};


const hashCode = function(s) {
  return s.split("").reduce(function(a, b) {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
}

interpretate.hash = (d) => {
  if (typeof d === 'undefined') {
    console.log('undefined object');
    return hashCode('undefined');
  }

  const stringQ = typeof d === 'string';

  //real string
  if (stringQ) {
    if (d.charAt(0) == "'") return hashCode(d.slice(1, -1));
    if (isNumeric(d)) return hashCode(String(parseInt(d))); //for Integers
  
    if (WLNumber.test(d)) {
      
      //deconstruct the string
      let [begin, floatString, digits, man, power] = d.split(WLNumber);
    
      if (digits === '.')
        floatString += digits + '0';
      else
        floatString += digits;
    
      if (man)
        floatString += 'E' + power;


    
      return hashCode(String(parseFloat(floatString)));
    }
  }
  if (typeof d === 'number') {
    return hashCode(String(d)); 
  }

  //console.log('type '+String(typeof d)+' of '+JSON.stringify(d));

  //if not a JSON array, probably a promise object or a function
  if (!(d instanceof Array) && !stringQ) return hashCode(String(d));


  //console.log(env);


  //reading the structure of Wolfram ExpressionJSON

  if (stringQ) {
    //symbol
    return hashCode(d);
  } else {
    //subvalue
    return d.map((e) => interpretate.hash(e)).reduce((accumulator, currentValue) => {
  return accumulator + currentValue
},0);
  }
}

interpretate.cnt = 0;

//contexes, so symbols names might be duplicated, therefore one can specify the propority context in env variable
interpretate.contextes = [];
//add new context
interpretate.contextExpand = (context) => {
  console.log(context.name + ' was added to the contextes of the interpreter');
  interpretate.contextes.push(context);
}

//shared libraries
interpretate.shared = {}
interpretate.shared = class {
  constructor (key, loader) {
    this.key = key;
    const self = this;

    self.load = async () => {
      await loader(self);
      self.load = async () => {console.log('Already loaded!')};
    };

    interpretate.shared[key] = this;
  }
};

interpretate.unzlibSync = (args) => unzlibSync(args)
interpretate.unzlib64String = async (input) => {
    const decoded = atob(input);
    return new TextDecoder().decode(unzlibSync(Uint8Array.from(decoded, c => c.charCodeAt(0))));
}


interpretate.zlib64String = async (input) => {
    const encoded = zlibSync(new TextEncoder().encode(input));

    // Convert Uint8Array to binary string without exceeding stack
    let binary = '';
    for (let i = 0; i < encoded.length; i++) {
        binary += String.fromCharCode(encoded[i]);
    }

    return btoa(binary);
};

function readVarint(dataView, offset) {
    let value = 0, shift = 0, byte = 0;
    do {
        byte = dataView.getUint8(offset++);
        value |= (byte & 0x7F) << shift;
        shift += 7;
    } while (byte & 0x80);
    return { value, offset };
}

function readNumericArray(dataView, offset, length, type) {
    let arr;
    let rawLength;
    switch (type) {
        case 0: // int8
            arr = new Int8Array(dataView.buffer, offset, length);
            rawLength = length;
            break;
        
        case 16:
            arr = new Uint8Array(dataView.buffer, offset, length);
            rawLength = length;
            break;
        
        case 1: // int16
            arr = new Int16Array(dataView.buffer.slice(offset), 0, length);
            rawLength = length * 2;
            break;
        
        case 17:
            arr = new Uint16Array(dataView.buffer.slice(offset), 0, length);
            rawLength = length * 2;
            break;
        
         case 2: // 
            arr = new Int32Array(dataView.buffer.slice(offset), 0, length);
            rawLength = length * 4;
            break;
        
        case 18:
            arr = new Uint32Array(dataView.buffer.slice(offset), 0, length);
            rawLength = length * 4;
            break; 
        
        case 3: // 
            arr = new Int64Array(dataView.buffer.slice(offset), 0, length);
            rawLength = length * 8;
            break;
        
        case 19:
            arr = new Uint64Array(dataView.buffer.slice(offset), 0, length);
            rawLength = length * 8;
            break;        
        
        case 34:
            arr = new Float32Array(dataView.buffer.slice(offset), 0, length);
            rawLength = length * 4;        
            break;
        
        case 35:
            arr = new Float64Array(dataView.buffer.slice(offset), 0, length);
            rawLength = length * 8;
            //console.log(length);
            break;
        default:
            throw new Error(`Unsupported numeric array type: ${type}`);
    }
    return {array: arr, length: rawLength};
}

function readString(dataView, offset, length) {
    let decoder = new TextDecoder("utf-8");
    let bytes = new Uint8Array(dataView.buffer, offset, length);
    return decoder.decode(bytes);
}

//a tiny math library of functions
//as a replacement for window.interpretate (too slow for updates)
const fwxf = {};

fwxf.Ration = (args) => {
    return args[0]/args[1];
}

fwxf.Rational = (args) => {
    return args[0]/args[1];
}

fwxf.Sin = (args) => {
    if (args.length > 1) {
        return args.map(Math.sin)
    }
    
    return Math.sin(args[0])
}

fwxf.Cos = (args) => {
    if (args.length > 1) {
        return args.map(Math.cos)
    }
    
    return Math.cos(args[0])
}

fwxf.Tan = (args) => {
    if (args.length > 1) {
        return args.map(Math.tan)
    }
    
    return Math.tan(args[0])
}

fwxf.Sqrt = (args) => {
    if (args.length > 1) {
        return args.map(Math.sqrt)
    }
    
    return Math.sqrt(args[0])
}

fwxf.Times = (args) => {
    let product = 1;
    for (let i=0; i<args.length; ++i) {
        const a = args[i];
        if (typeof a == 'number') {
            product *= a;
            continue;
        } 
        
        product *= fwxf[a]();
    }

    return product;
}

fwxf.Plus = (args) => {
    let sum = 0;
    for (let i=0; i<args.length; ++i) {
        const a = args[i];
        if (typeof a == 'number') {
            sum += a;
            continue;
        } 
        
        sum += fwxf[a]();
    }

    return sum;
}

fwxf.Pow = (args) => {
    if (args.length > 1) {
        const p = args[args.length - 1];
        return args.map((el) => Math.pow(el, p))
    }
    
    return Math.pow(args[0], args[1])
}

fwxf.Pi = (args) => Math.PI 
fwxf.E = (args) => Math.E

function deserializeWXF(buffer) {
    let dataView = new DataView(buffer);
    let offset = 0;

    // Parse the WXF version header
    if (dataView.getUint8(offset++) !== 56 || dataView.getUint8(offset++) !== 58) {
        throw new Error("Invalid WXF header.");
    }
    
    //console.log("WXF version header recognized.");

    function parseWXF(opts = {}) {
        if (offset >= dataView.byteLength) {
          throw new Error("Unexpected end of buffer.");
        }

        let token = dataView.getUint8(offset++);
        //console.log(`Processing token: ${token}`);

        switch (token) {
            case 102: { // "f" - function
                let { value: length, offset: newOffset } = readVarint(dataView, offset);
                offset = newOffset;
                let head = parseWXF();
                let args = [];
              
                //optimizations for numerical Lists bypass all checks
                if (head == "List") {
                  for (let i = 0; i < length; i++) {
                      args.push(parseWXF({...opts, listQ: true}));
                  }
                  
                  if (opts.listQ || opts.assocQ) return args;
                  return ['JSObject', args];   
                  
                }

                
                
                //process arguments, bypass all checks
                for (let i = 0; i < length; i++) {
                  args.push(parseWXF(opts));
                }      
                
                //optimization for lists again!
                //if bump into non number, but a simbol being inside a list
                if (opts.listQ || opts.assocQ) {
                    return fwxf[head](args); //run a tiny math library to calculate beforehand
                    //window.interpretate is too slow for updates
                }
                
                return [head, ...args];
                
            }
            case 67: { // "C" - signed 8-bit integer
                return dataView.getInt8(offset++);
            }
            case 106: { // "j" - signed 16-bit integer
                let value = dataView.getInt16(offset, true);
                offset += 2;
                return value;
            }
            case 105: { // "i" - signed 32-bit integer
                let value = dataView.getInt32(offset, true);
                offset += 4;
                return value;
            }
            case 114: { // "r" - IEEE double-precision real
                let value = dataView.getFloat64(offset, true);
                offset += 8;
                return value;
            }
            case 82: { // 'R' - string like Real number with precision
                let { value: length, offset: newOffset } = readVarint(dataView, offset);
                offset = newOffset;
                let str = readString(dataView, offset, length);
                offset += length;

                return parseFloat(str.split('`')); //ignore precision
            }
            case 83: { // "S" - string
                let { value: length, offset: newOffset } = readVarint(dataView, offset);
                offset = newOffset;
                let str = readString(dataView, offset, length);
                offset += length;

                if (opts.listQ || opts.assocQ) { //if inside list, just paste JS object directly
                    return str;
                }

                return "'"+str+"'";
            }
            case 193: // "Á" - packed array
            case 194: { // "Â" - numeric array
                let arrayType = dataView.getUint8(offset++);
                let rank = dataView.getUint8(offset++);
                let dims = [];
                let length = 1;
                for (let i=0; i<rank; ++i) {
                  let { value: len, offset: newOffset } =readVarint(dataView, offset)
                  //const len = dataView.getUint8(offset++);
                  offset = newOffset;
                  
                  length *= len;
                  dims.push(len);
                }
                //let { value: length, offset: newOffset } = readVarint(dataView, offset);
                //console.log({value: length, offset: length, dims: dims});
                //offset = newOffset;
                let array = readNumericArray(dataView, offset, length, arrayType);
                offset += array.length;

                if (opts.listQ || opts.assocQ) { //mixure of lists and (packed) arrays FIXME //cannot treat!
                    return (new NumericArrayObject(array.array, dims)).normal();
                }

                return ['JSObject', new NumericArrayObject(array.array, dims)];
            }
            case 45: { // rule in association
                return [parseWXF(opts), parseWXF(opts)];
            }

            case 65: { // "A" - association
                let assoc = {};
                let { value: length, offset: newOffset } = readVarint(dataView, offset);
                offset = newOffset;
                for (let i = 0; i < length; i++) {
                    let keyvalue = parseWXF({...opts, assocQ:true});
                    //let value = parseWXF();
                    assoc[keyvalue[0]] = keyvalue[1];
                }

                if (opts.listQ || opts.assocQ) return assoc;

                return ['JSObject', assoc];
            }
            case 67: { // "C" - signed 8-bit integer
                return dataView.getInt8(offset++);
            }
            case 115: { // "s" - symbol
                let { value: length, offset: newOffset } = readVarint(dataView, offset);
                offset = newOffset;
                let symbol = readString(dataView, offset, length);
                offset += length;
                // Return as a symbol object or just the string for now
                return symbol;
            }
            default:
                throw new Error(`Unknown token: ${token} at offset ${offset - 1}`);
        }
    }

    try {
        return parseWXF();
    } catch (error) {
        console.error(`Deserialization error: ${error.message}`);
        throw error;
    }
}

interpretate.deserializeWXF = deserializeWXF;

interpretate.handleMessage = (event) => {
    const uid = Math.floor(Math.random() * 100);
    const global = {call: uid};
    if (event.data instanceof ArrayBuffer) {
        //console.warn('Captured binary frame!');
        const parsed = deserializeWXF(event.data);
        //console.log(parsed);
        interpretate(parsed, {global: global});
    } else {
        //console.warn('Captured text frame!');
        interpretate(JSON.parse(event.data), {global: global});
    }
}


interpretate.anonymous = async (d, org) => {
  throw('Unknown symbol '+ JSON.stringify(d));
}

function jsonStringifyRecursive(obj) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
              // Circular reference found, discard key
              return;
          }
          // Store value in our collection
          cache.add(value);
      }
      return value;
  }, 4);
}


var InstancesHashMap = {}

window.InstancesHashMap = InstancesHashMap

let garbageTimeout = false;

const renewGarbageTimer = () => {
  if (garbageTimeout) clearTimeout(garbageTimeout);
  garbageTimeout = setTimeout(collectGarbage, 10000);
}

const collectGarbage = () => {
  console.log('collecting garbage...');
  if (window.OfflineMode) return;
  Object.keys(ObjectHashMap).forEach((el)=>{
    ObjectHashMap[el].garbageCollect();
  });
}



//instance of FrontEndExecutable object
class ExecutableObject {
  env = {}          

  //uid (not unique) (global)
  uid = ''
  //uid (unique) (internal)
  instance = ''    
  
  _proxies = new Set()

  dead = false
  virtual = false

  //local scope
  local = {}

  assignScope() {
    this.env.local = this.local;
    return this.env;
  }

  //run the code inside
  /*async execute() {
    console.log('executing manually '+this.uid+'....');
    //console.log(this.virtual);
    return interpretate(this.virtual, this.env);
  }*/

  async execute(props) {
    //console.log('executing manually '+this.uid+'....');
    //console.log(this.virtual);
    if (!props)
      return interpretate(this.virtual, this.env);
    else  
      return interpretate(this.virtual, {...this.env, ...props});
  }  

  //dispose the object 
  //direction: NONE
  dispose() {
    if (this.dead) return;
    this.dead = true;

   // console.log('DESTORY: ' + this.uid);
    if (this.static) {
      delete InstancesHashMap[this.instance];
      return;
    }
    //change the mathod of interpreting
    this.env.method = 'destroy';

    //if (this.virtual) console.log('virtual type was disposed'); else console.log('normal container was destoryed');

    //unregister from the storage class
    //if (!this.virtual) this.storage.dropref(this);

    //no need of this since we can destory them unsing env.global.stack
    let content = this.virtual;
    //if (!this.virtual) content = this.storage.get(this.uid); else content = this.virtual;

    //pass local scope
    this.env.local = this.local;    
    //the link between objects will be dead automatically

    //evaluate destructor
    interpretate(content, this.env);

    delete InstancesHashMap[this.instance];
  }         

  //update the state of it and recompute all objects inside
  //direction: BOTTOM -> TOP
  update(top) {
    //console.log('updating frontend object...'+this.uid);
    //bubble up by 1
    if (this.parent instanceof ExecutableObject && !(this.child instanceof ExecutableObject)) return this.parent.update(); 

    //change the method of interpreting 
    this.env.method = 'update';
    //pass local scope
    this.env.local = this.local;
    //console.log('interprete...'+this.uid);

    let content;
    if (!this.virtual) 
      content = this.storage.get(this.uid); else content = this.virtual;

    return interpretate(content, this.env);
  }

  constructor(uid, env, virtual = false, s = false) {
    //console.log('constructing the instance of '+uid+'...');

    this.static = s; // defines if object is a static one (works as storage)
    this.uid = uid;
    this.env = {...env, exposed: env};

    this.instance = uuidv4();

    this.env.element = this.env.element || 'body';
    //global scope
    //making a stack-call only for executable objects
    this.env.global.stack = this.env.global.stack || {};
    this.env.global.stack[uid] = this;

    this.env.root = this.env.root || {};

    //middleware handler (identity)
    this.local.middleware = (a) => a;

    //for virtual functions
    if (virtual) {
      //console.log('virtual object detected!');
      //console.log('local storage is enabled');
      //console.log(virtual);
      this.virtual = virtual;
    } else {
      if (uid in ObjectHashMap) this.storage = ObjectHashMap[uid]; else this.storage = new ObjectStorage(uid);
      this.storage.assign(this);
    }

    //if the root one is an executable & it is allowed to have non static
    if (this.env.root instanceof ExecutableObject && !this.env.static) {
      //connecting together
      //console.log('connection between two: '+this.env.root.uid + ' and a link to '+this.uid);
      if (!this.env.root.static) { //reject static one
        const root = this.env.root;

        if (typeof virtual == "string") { //most probably a proxy or dynamic symbol
          if (!(root._proxies.has(virtual))) {
            root._proxies.add(virtual);
            this.parent = this.env.root;
            this.env.root.child = this; 
          }          
        } else {
          this.parent = this.env.root;
          this.env.root.child = this; 
        }
      }
    }

    this.env.root = this;

    InstancesHashMap[this.instance] = this;

    //global hook-functions
    if (this.env.global.hooks) {
      const obj = this;
      this.env.global.hooks.forEach((hook) => {
        hook(obj)
      });
    }

    return this;
  }           
};

window.ExecutableObject = ExecutableObject


class jsRule {
  // Constructor
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }
}



function uuidv4() { 
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

window.uuidv4 = uuidv4

function downloadByURL(url, name) {
  var link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', name);
  link.click();
  link.remove();
}

window.downloadByURL = downloadByURL

var setInnerHTML = function(elm, html) {
  elm.innerHTML = html;
  Array.from(elm.querySelectorAll("script")).forEach( oldScript => {
    const newScript = document.createElement("script");
    Array.from(oldScript.attributes)
      .forEach( attr => newScript.setAttribute(attr.name, attr.value) );
    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
  
  return elm;         
};

var setInnerHTMLAsync = async function(elm, html) {
  elm.innerHTML = html;
  Array.from(elm.querySelectorAll("script")).forEach( oldScript => {
    const newScript = document.createElement("script");
    Array.from(oldScript.attributes)
      .forEach( attr => newScript.setAttribute(attr.name, attr.value) );
    if (!newScript.src && newScript.type == 'module') {
      newScript.removeAttribute('type');
      newScript.appendChild(document.createTextNode('{\n'+oldScript.innerHTML+'\n}'));
    } else {
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
    }
    
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
  
  return elm;         
};

window.setInnerHTML = setInnerHTML
window.setInnerHTMLAsync = setInnerHTMLAsync

function openawindow(url, target='_self') {
  const fake = document.createElement('a');
  fake.target = target;
  fake.href = url;
  fake.click();
}

window.openawindow = openawindow

interpretate.throttle = 30;

// Throttle function: Input as function which needs to be throttled and delay is the time interval in milliseconds
function throttle(cb, delay = () => interpretate.throttle) {
    let shouldWait = false
    let waitingArgs
    const timeoutFunc = () => {
      if (waitingArgs == null) {
        shouldWait = false
      } else {
        cb(...waitingArgs)
        waitingArgs = null
        setTimeout(timeoutFunc, delay())
      }
    }         

    return (...args) => {
      if (shouldWait) {
        waitingArgs = args
        return
      }         

      cb(...args)
      shouldWait = true
      setTimeout(timeoutFunc, delay())
    }
}

interpretate.alert = (msg) => {
  if (!window.electronAPI) {
    alert(msg);
    return;
  }
  electronAPI.showMessageBox({type:'info', message:String(msg)}, console.log);
}

interpretate.confirm = (msg, cbk) => interpretate.confirmAsync(msg).then((r) => cbk(r == true))

interpretate.confirmAsync = async (msg) => {
  if (!window.electronAPI) return confirm(msg);
  const p = Deferred();
  electronAPI.showMessageBox({type:'question', noLink:true,message:String(msg), buttons:['Cancel', 'OK']}, (r)=>{p.resolve(r.response == 1)});
  return p.promise;
}

window.throttle = throttle;
window.interpretate = interpretate;