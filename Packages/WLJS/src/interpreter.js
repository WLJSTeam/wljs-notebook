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

const wxfTextEncoder = new TextEncoder();
const wxfTextDecoder = new TextDecoder("utf-8");
const wxfLittleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
const wxfMinSafeInteger = BigInt(Number.MIN_SAFE_INTEGER);
const wxfMaxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);
const wxfNumericArrayTypes = {
    0:  { constructor: Int8Array,       size: 1, getter: "getInt8" },
    16: { constructor: Uint8Array,      size: 1, getter: "getUint8" },
    1:  { constructor: Int16Array,      size: 2, getter: "getInt16" },
    17: { constructor: Uint16Array,     size: 2, getter: "getUint16" },
    2:  { constructor: Int32Array,      size: 4, getter: "getInt32" },
    18: { constructor: Uint32Array,     size: 4, getter: "getUint32" },
    3:  { constructor: BigInt64Array,   size: 8, getter: "getBigInt64" },
    19: { constructor: BigUint64Array,  size: 8, getter: "getBigUint64" },
    34: { constructor: Float32Array,    size: 4, getter: "getFloat32" },
    35: { constructor: Float64Array,    size: 8, getter: "getFloat64" }
};

function readNumericArray(dataView, offset, length, type) {
    const info = wxfNumericArrayTypes[type];

    if (!info) {
        throw new Error(`Unsupported numeric array type: ${type}`);
    }

    const rawLength = length * info.size;
    if (!Number.isSafeInteger(rawLength) || offset + rawLength > dataView.byteLength) {
        throw new Error("Unexpected end of buffer while reading numeric array.");
    }

    const start = dataView.byteOffset + offset;

    // WXF numbers are little-endian. Reuse the input storage whenever the host
    // byte order and alignment allow it; image-sized byte arrays are always
    // zero-copy. Misaligned multi-byte arrays need one compact copy because JS
    // typed-array constructors reject unaligned byte offsets.
    if (info.size === 1 || (wxfLittleEndian && start % info.size === 0)) {
        return new info.constructor(dataView.buffer, start, length);
    }

    if (wxfLittleEndian) {
        const bytes = dataView.buffer.slice(start, start + rawLength);
        return new info.constructor(bytes, 0, length);
    }

    const arr = new info.constructor(length);
    {
        for (let i = 0; i < length; ++i) {
            arr[i] = dataView[info.getter](offset + i * info.size, true);
        }
    }
    return arr;
}

function readString(dataView, offset, length) {
    let bytes = new Uint8Array(dataView.buffer, dataView.byteOffset + offset, length);
    return wxfTextDecoder.decode(bytes);
}

class WXFByteWriter {
    constructor(capacity = 64) {
        this.buffer = new Uint8Array(capacity);
        this.view = null;
        this.offset = 0;
    }

    ensure(length) {
        const required = this.offset + length;
        if (required <= this.buffer.length) return;

        const next = new Uint8Array(Math.max(required, this.buffer.length * 2));
        next.set(this.buffer);
        this.buffer = next;
        if (this.view) this.view = new DataView(next.buffer);
    }

    dataView() {
        return this.view || (this.view = new DataView(this.buffer.buffer));
    }

    u8(value) {
        this.ensure(1);
        this.buffer[this.offset++] = value;
    }

    i16(value) {
        this.ensure(2);
        this.dataView().setInt16(this.offset, value, true);
        this.offset += 2;
    }

    u16(value) {
        this.ensure(2);
        this.dataView().setUint16(this.offset, value, true);
        this.offset += 2;
    }

    i32(value) {
        this.ensure(4);
        this.dataView().setInt32(this.offset, value, true);
        this.offset += 4;
    }

    u32(value) {
        this.ensure(4);
        this.dataView().setUint32(this.offset, value, true);
        this.offset += 4;
    }

    i64(value) {
        this.ensure(8);
        this.dataView().setBigInt64(this.offset, value, true);
        this.offset += 8;
    }

    u64(value) {
        this.ensure(8);
        this.dataView().setBigUint64(this.offset, value, true);
        this.offset += 8;
    }

    f32(value) {
        this.ensure(4);
        this.dataView().setFloat32(this.offset, value, true);
        this.offset += 4;
    }

    f64(value) {
        this.ensure(8);
        this.dataView().setFloat64(this.offset, value, true);
        this.offset += 8;
    }

    bytes(value) {
        this.ensure(value.byteLength);
        this.buffer.set(value, this.offset);
        this.offset += value.byteLength;
    }

    varuint(value) {
        this.ensure(wxfVaruintSize(value));
        do {
            const byte = value % 128;
            value = Math.floor(value / 128);
            this.buffer[this.offset++] = byte + (value ? 128 : 0);
        } while (value);
    }

    finish() {
        if (this.offset === this.buffer.byteLength) return this.buffer.buffer;
        return this.buffer.buffer.slice(0, this.offset);
    }
}

function wxfVaruintSize(value) {
    let size = 1;
    while (value >= 128) {
        value = Math.floor(value / 128);
        ++size;
    }
    return size;
}

function wxfNumberPayloadSize(value) {
    if (!Number.isFinite(value)) return 6; // symbol Null
    if (!Object.is(value, -0) && Number.isSafeInteger(value)) {
        if (value >= -128 && value <= 127) return 2;
        if (value >= -32768 && value <= 32767) return 3;
        if (value >= -2147483648 && value <= 2147483647) return 5;
    }
    return 9;
}

function initialWXFCapacity(value) {
    if (value === null || value === undefined) return 8;

    switch (typeof value) {
        case "boolean": return value ? 8 : 9;
        case "number":
            if (!Number.isFinite(value)) return 8;
            if (!Object.is(value, -0) && Number.isSafeInteger(value)) {
                if (value >= -128 && value <= 127) return 4;
                if (value >= -32768 && value <= 32767) return 5;
                if (value >= -2147483648 && value <= 2147483647) return 7;
            }
            return 11;
        case "bigint": {
            if (value >= -9223372036854775808n && value <= 9223372036854775807n) return 11;
            const digits = value.toString().length;
            return 3 + wxfVaruintSize(digits) + digits;
        }
        case "string":
            // UTF-8 is at least one byte per UTF-16 code unit for ASCII-heavy
            // protocol traffic. The writer grows only if non-ASCII needs more.
            return Math.max(8, 3 + wxfVaruintSize(value.length) + value.length);
    }

    if (ArrayBuffer.isView(value)) {
        const type = getWXFNumericArrayType(value);
        if (type !== undefined) {
            return 5 + wxfVaruintSize(value.length) + value.byteLength;
        }
    }

    if (Array.isArray(value)) {
        // Every supported value occupies at least two bytes. This is exact for
        // the common large list of Int8-range numbers and never over-allocates.
        const minimum = 9 + wxfVaruintSize(value.length) + value.length * 2;

        // Homogeneous ordinary float/wider-integer arrays are also common.
        // Size those exactly so serialization needs neither growth buffers nor
        // a final trimming copy. Int8-range lists already use the exact minimum
        // and deliberately skip this extra traversal.
        if (value.length && typeof value[0] === "number") {
            const elementSize = wxfNumberPayloadSize(value[0]);
            if (elementSize !== 2) {
                // Sample across the list rather than making serialization walk
                // every element twice. Homogeneous numerical data gets one
                // exact allocation; mixed data safely falls back to growth.
                const samples = Math.min(value.length, 8);
                for (let i = 1; i < samples; ++i) {
                    const item = value[Math.floor(i * (value.length - 1) / (samples - 1))];
                    if (typeof item !== "number" || wxfNumberPayloadSize(item) !== elementSize) {
                        return minimum;
                    }
                }
                return 9 + wxfVaruintSize(value.length) + value.length * elementSize;
            }
        }
        return minimum;
    }

    return 64;
}

function writeWXFText(writer, token, value) {
    const bytes = wxfTextEncoder.encode(value);
    writer.u8(token);
    writer.varuint(bytes.byteLength);
    writer.bytes(bytes);
}

function writeWXFSymbol(writer, value) {
    writeWXFText(writer, 115, value); // "s"
}

function writeWXFNull(writer) {
    writeWXFSymbol(writer, "Null");
}

function writeWXFNumber(writer, value) {
    if (!Number.isFinite(value)) {
        writeWXFNull(writer);
        return;
    }

    if (!Object.is(value, -0) && Number.isSafeInteger(value)) {
        if (value >= -128 && value <= 127) {
            writer.ensure(2);
            writer.buffer[writer.offset++] = 67; // "C"
            writer.buffer[writer.offset++] = value & 0xff;
            return;
        }

        if (value >= -32768 && value <= 32767) {
            writer.ensure(3);
            writer.buffer[writer.offset++] = 106; // "j"
            writer.dataView().setInt16(writer.offset, value, true);
            writer.offset += 2;
            return;
        }

        if (value >= -2147483648 && value <= 2147483647) {
            writer.ensure(5);
            writer.buffer[writer.offset++] = 105; // "i"
            writer.dataView().setInt32(writer.offset, value, true);
            writer.offset += 4;
            return;
        }

        writer.ensure(9);
        writer.buffer[writer.offset++] = 76; // "L"
        writer.dataView().setBigInt64(writer.offset, BigInt(value), true);
        writer.offset += 8;
        return;
    }

    writer.ensure(9);
    writer.buffer[writer.offset++] = 114; // "r"
    writer.dataView().setFloat64(writer.offset, value, true);
    writer.offset += 8;
}

function writeWXFBigInt(writer, value) {
    const minInt64 = -9223372036854775808n;
    const maxInt64 = 9223372036854775807n;

    if (value >= minInt64 && value <= maxInt64) {
        writer.ensure(9);
        writer.buffer[writer.offset++] = 76; // "L"
        writer.dataView().setBigInt64(writer.offset, value, true);
        writer.offset += 8;
        return;
    }

    writeWXFText(writer, 73, value.toString()); // "I"
}

function getWXFNumericArrayType(value) {
    if (value instanceof Int8Array) return 0;
    if (value instanceof Uint8Array || value instanceof Uint8ClampedArray) return 16;
    if (value instanceof Int16Array) return 1;
    if (value instanceof Uint16Array) return 17;
    if (value instanceof Int32Array) return 2;
    if (value instanceof Uint32Array) return 18;
    if (typeof BigInt64Array !== "undefined" && value instanceof BigInt64Array) return 3;
    if (typeof BigUint64Array !== "undefined" && value instanceof BigUint64Array) return 19;
    if (value instanceof Float32Array) return 34;
    if (value instanceof Float64Array) return 35;
    return undefined;
}

function getWXFNumericArrayObjectMetadata(value) {
    const data = value.buffer;
    const type = ArrayBuffer.isView(data)
        ? getWXFNumericArrayType(data)
        : undefined;
    if (type === undefined) {
        throw new TypeError("NumericArrayObject.buffer must be a supported TypedArray.");
    }

    const dims = value.dims;
    if (!Array.isArray(dims) || dims.length === 0) {
        throw new TypeError("NumericArrayObject.dims must be a non-empty array.");
    }

    let length = 1;
    for (let i = 0; i < dims.length; ++i) {
        const dimension = dims[i];
        if (!Number.isSafeInteger(dimension) || dimension < 0) {
            throw new RangeError("NumericArrayObject dimensions must be non-negative safe integers.");
        }
        length *= dimension;
        if (!Number.isSafeInteger(length)) {
            throw new RangeError("NumericArrayObject dimensions exceed JavaScript's safe integer range.");
        }
    }
    if (length !== data.length) {
        throw new RangeError(
            `NumericArrayObject dimensions require ${length} elements, but its buffer has ${data.length}.`
        );
    }

    return { data, dims, type };
}

function writeWXFNumericArrayData(writer, value, type) {
    if (wxfLittleEndian || value.BYTES_PER_ELEMENT === 1) {
        writer.bytes(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
        return;
    }

    for (let i = 0; i < value.length; ++i) {
        switch (type) {
            case 1: writer.i16(value[i]); break;
            case 17: writer.u16(value[i]); break;
            case 2: writer.i32(value[i]); break;
            case 18: writer.u32(value[i]); break;
            case 3: writer.i64(value[i]); break;
            case 19: writer.u64(value[i]); break;
            case 34: writer.f32(value[i]); break;
            case 35: writer.f64(value[i]); break;
        }
    }
}

function writeWXFNumericArray(writer, value, type, dims) {
    writer.u8(194); // numeric array
    writer.u8(type);
    if (dims) {
        writer.varuint(dims.length);
        for (let i = 0; i < dims.length; ++i) writer.varuint(dims[i]);
    } else {
        writer.varuint(1); // TypedArrays are rank-one arrays
        writer.varuint(value.length);
    }
    writeWXFNumericArrayData(writer, value, type);
}

function writeWXFValue(writer, value) {
    if (value === null || value === undefined) {
        writeWXFNull(writer);
        return;
    }

    switch (typeof value) {
        case "boolean":
            writeWXFSymbol(writer, value ? "True" : "False");
            return;
        case "string":
            writeWXFText(writer, 83, value); // "S"
            return;
        case "number":
            writeWXFNumber(writer, value);
            return;
        case "bigint":
            writeWXFBigInt(writer, value);
            return;
    }

    if (value instanceof NumericArrayObject) {
        const metadata = getWXFNumericArrayObjectMetadata(value);
        writeWXFNumericArray(writer, metadata.data, metadata.type, metadata.dims);
        return;
    }

    const numericArrayType = ArrayBuffer.isView(value)
        ? getWXFNumericArrayType(value)
        : undefined;

    if (numericArrayType !== undefined) {
        writeWXFNumericArray(writer, value, numericArrayType);
        return;
    }

    if (Array.isArray(value)) {
        writer.u8(102); // "f"
        writer.varuint(value.length);
        writeWXFSymbol(writer, "List");
        for (let i = 0; i < value.length; ++i) {
            const item = value[i];
            if (typeof item === "number") writeWXFNumber(writer, item);
            else writeWXFValue(writer, item);
        }
        return;
    }

    if (typeof value === "object") {
        const keys = Object.keys(value);
        writer.u8(65); // "A"
        writer.varuint(keys.length);
        for (const key of keys) {
            writer.u8(45); // "-"
            writeWXFText(writer, 83, key);
            writeWXFValue(writer, value[key]);
        }
        return;
    }

    writeWXFNull(writer);
}

function writeWXFVaruintToBuffer(buffer, offset, value) {
    do {
        const byte = value % 128;
        value = Math.floor(value / 128);
        buffer[offset++] = byte + (value ? 128 : 0);
    } while (value);
    return offset;
}

function serializeWXFTextValue(token, value) {
    const encoded = wxfTextEncoder.encode(value);
    const output = new Uint8Array(3 + wxfVaruintSize(encoded.byteLength) + encoded.byteLength);
    output[0] = 56; // "8"
    output[1] = 58; // ":"
    output[2] = token;
    const offset = writeWXFVaruintToBuffer(output, 3, encoded.byteLength);
    output.set(encoded, offset);
    return output.buffer;
}

function serializeWXFFiniteNumber(value) {
    let size;
    let token;
    if (!Object.is(value, -0) && Number.isSafeInteger(value)) {
        if (value >= -128 && value <= 127) {
            const output = new Uint8Array(4);
            output[0] = 56;
            output[1] = 58;
            output[2] = 67;
            output[3] = value & 0xFF;
            return output.buffer;
        }
        if (value >= -32768 && value <= 32767) {
            size = 5;
            token = 106;
        } else if (value >= -2147483648 && value <= 2147483647) {
            size = 7;
            token = 105;
        } else {
            size = 11;
            token = 76;
        }
    } else {
        size = 11;
        token = 114;
    }

    const output = new ArrayBuffer(size);
    const bytes = new Uint8Array(output);
    const view = new DataView(output);
    bytes[0] = 56;
    bytes[1] = 58;
    bytes[2] = token;
    if (token === 106) view.setInt16(3, value, true);
    else if (token === 105) view.setInt32(3, value, true);
    else if (token === 76) view.setBigInt64(3, BigInt(value), true);
    else view.setFloat64(3, value, true);
    return output;
}

function serializeWXFNumericArrayValue(value, type, dims) {
    const rank = dims ? dims.length : 1;
    let metadataSize = wxfVaruintSize(rank);
    if (dims) {
        for (let i = 0; i < dims.length; ++i) metadataSize += wxfVaruintSize(dims[i]);
    } else {
        metadataSize += wxfVaruintSize(value.length);
    }

    const output = new Uint8Array(4 + metadataSize + value.byteLength);
    output[0] = 56; // "8"
    output[1] = 58; // ":"
    output[2] = 194; // numeric array
    output[3] = type;
    let dataOffset = writeWXFVaruintToBuffer(output, 4, rank);
    if (dims) {
        for (let i = 0; i < dims.length; ++i) {
            dataOffset = writeWXFVaruintToBuffer(output, dataOffset, dims[i]);
        }
    } else {
        dataOffset = writeWXFVaruintToBuffer(output, dataOffset, value.length);
    }

    if (wxfLittleEndian || value.BYTES_PER_ELEMENT === 1) {
        output.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), dataOffset);
    } else {
        const writer = new WXFByteWriter(output.byteLength);
        writer.buffer = output;
        writer.offset = dataOffset;
        writeWXFNumericArrayData(writer, value, type);
    }
    return output.buffer;
}

function serializeWXF(value) {
    if (value === null || value === undefined) return serializeWXFTextValue(115, "Null");

    switch (typeof value) {
        case "boolean":
            return serializeWXFTextValue(115, value ? "True" : "False");
        case "string":
            return serializeWXFTextValue(83, value);
        case "number":
            return Number.isFinite(value)
                ? serializeWXFFiniteNumber(value)
                : serializeWXFTextValue(115, "Null");
        case "bigint":
            if (value >= -9223372036854775808n && value <= 9223372036854775807n) {
                const output = new ArrayBuffer(11);
                const bytes = new Uint8Array(output);
                bytes[0] = 56;
                bytes[1] = 58;
                bytes[2] = 76;
                new DataView(output).setBigInt64(3, value, true);
                return output;
            }
            return serializeWXFTextValue(73, value.toString());
    }

    if (value instanceof NumericArrayObject) {
        const metadata = getWXFNumericArrayObjectMetadata(value);
        return serializeWXFNumericArrayValue(metadata.data, metadata.type, metadata.dims);
    }

    if (ArrayBuffer.isView(value)) {
        const type = getWXFNumericArrayType(value);
        if (type !== undefined) return serializeWXFNumericArrayValue(value, type);
    }

    const writer = new WXFByteWriter(initialWXFCapacity(value));
    writer.u8(56); // "8"
    writer.u8(58); // ":"
    writeWXFValue(writer, value);
    return writer.finish();
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

function wxfInteger64ToJS(value) {
    return value >= wxfMinSafeInteger && value <= wxfMaxSafeInteger
        ? Number(value)
        : value;
}

function wxfBigRealToNumber(value) {
    const exponentIndex = value.indexOf("*^");
    let mantissa = exponentIndex === -1 ? value : value.slice(0, exponentIndex);
    const precisionIndex = mantissa.indexOf("`");
    if (precisionIndex !== -1) mantissa = mantissa.slice(0, precisionIndex);

    const exponent = exponentIndex === -1 ? "" : `e${value.slice(exponentIndex + 2)}`;
    return Number.parseFloat(mantissa + exponent);
}

function deserializeWXFGeneral(buffer) {
    let dataView;
    if (buffer instanceof ArrayBuffer) {
        dataView = new DataView(buffer);
    } else if (ArrayBuffer.isView(buffer)) {
        dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
        throw new TypeError("WXF input must be an ArrayBuffer or an ArrayBuffer view.");
    }

    let offset;
    if (dataView.byteLength >= 2 && dataView.getUint16(0, true) === 0x3A38) {
        offset = 2; // "8:"
    } else if (
        dataView.byteLength >= 3 &&
        dataView.getUint8(0) === 56 &&
        dataView.getUint8(1) === 67 &&
        dataView.getUint8(2) === 58
    ) {
        const compressedBytes = new Uint8Array(
            dataView.buffer,
            dataView.byteOffset + 3,
            dataView.byteLength - 3
        );
        const uncompressedBytes = unzlibSync(compressedBytes);
        dataView = new DataView(
            uncompressedBytes.buffer,
            uncompressedBytes.byteOffset,
            uncompressedBytes.byteLength
        );
        offset = 0;
    } else {
        throw new Error("Invalid or unsupported WXF header.");
    }

    // Fixed-width scalar messages are common in high-frequency streams. Return
    // them before creating the recursive parser and its text/varint closures.
    const rootToken = dataView.getUint8(offset++);
    switch (rootToken) {
        case 67:
            return dataView.getInt8(offset);
        case 106:
            return dataView.getInt16(offset, true);
        case 105:
            return dataView.getInt32(offset, true);
        case 76:
            return wxfInteger64ToJS(dataView.getBigInt64(offset, true));
        case 114:
            return dataView.getFloat64(offset, true);
        default:
            --offset;
    }

    function readVaruint() {
        let byte = dataView.getUint8(offset++);
        let value = byte & 0x7F;
        if (!(byte & 0x80)) return value;

        let multiplier = 128;
        do {
            byte = dataView.getUint8(offset++);
            value += (byte & 0x7F) * multiplier;
            if (!Number.isSafeInteger(value)) {
                throw new Error("WXF varint exceeds JavaScript's safe integer range.");
            }
            multiplier *= 128;
        } while (byte & 0x80);
        return value;
    }

    function readText() {
        const length = readVaruint();
        const value = readString(dataView, offset, length);
        offset += length;
        return value;
    }

    // `inline` replaces the former options objects. It avoids one allocation
    // for every member of ordinary Lists and Associations.
    function parseWXF(inline = false) {
        if (offset >= dataView.byteLength) {
            throw new Error("Unexpected end of buffer.");
        }

        const token = dataView.getUint8(offset++);
        switch (token) {
            case 102: { // "f" - function
                const length = readVaruint();
                const head = parseWXF(false);

                if (head === "List") {
                    const args = new Array(length);
                    for (let i = 0; i < length; ++i) args[i] = parseWXF(true);
                    return inline ? args : ['JSObject', args];
                }

                if (inline) {
                    const args = new Array(length);
                    for (let i = 0; i < length; ++i) args[i] = parseWXF(true);
                    return fwxf[head](args);
                }

                const expression = new Array(length + 1);
                expression[0] = head;
                for (let i = 0; i < length; ++i) expression[i + 1] = parseWXF(false);
                return expression;
            }
            case 67: // "C" - signed 8-bit integer
                return dataView.getInt8(offset++);
            case 106: { // "j" - signed 16-bit integer
                const value = dataView.getInt16(offset, true);
                offset += 2;
                return value;
            }
            case 105: { // "i" - signed 32-bit integer
                const value = dataView.getInt32(offset, true);
                offset += 4;
                return value;
            }
            case 76: { // "L" - signed 64-bit integer
                const value = dataView.getBigInt64(offset, true);
                offset += 8;
                return wxfInteger64ToJS(value);
            }
            case 114: { // "r" - IEEE double-precision real
                const value = dataView.getFloat64(offset, true);
                offset += 8;
                return value;
            }
            case 73: // "I" - arbitrary-precision integer
                return BigInt(readText());
            case 82: // "R" - arbitrary-precision real
                return wxfBigRealToNumber(readText());
            case 83: { // "S" - string
                const value = readText();
                return inline ? value : "'" + value + "'";
            }
            case 66: { // "B" - binary string
                const length = readVaruint();
                const bytes = new Uint8Array(
                    dataView.buffer,
                    dataView.byteOffset + offset,
                    length
                );
                offset += length;
                return inline ? bytes : ['JSObject', bytes];
            }
            case 193: // packed array
            case 194: { // numeric array
                const arrayType = dataView.getUint8(offset++);
                const rank = readVaruint();
                const dims = new Array(rank);
                let length = 1;
                for (let i = 0; i < rank; ++i) {
                    const dimension = readVaruint();
                    dims[i] = dimension;
                    length *= dimension;
                    if (!Number.isSafeInteger(length)) {
                        throw new Error("WXF numeric array is too large for JavaScript.");
                    }
                }

                const array = readNumericArray(dataView, offset, length, arrayType);
                offset += array.byteLength;
                const numericArray = new NumericArrayObject(array, dims);
                return inline ? numericArray.normal() : ['JSObject', numericArray];
            }
            case 45: // rule
            case 58: // delayed rule
                return [parseWXF(inline), parseWXF(inline)];
            case 65: { // association
                const length = readVaruint();
                const assoc = {};
                for (let i = 0; i < length; ++i) {
                    const keyvalue = parseWXF(true);
                    assoc[keyvalue[0]] = keyvalue[1];
                }
                return inline ? assoc : ['JSObject', assoc];
            }
            case 115: // "s" - symbol
                return readText();
            default:
                throw new Error(`Unknown token: ${token} at offset ${offset - 1}`);
        }
    }

    return parseWXF(false);
}

function deserializeWXF(buffer) {
    if (buffer && buffer.byteLength === 4 && buffer.buffer === undefined) {
        const bytes = new Uint8Array(buffer);
        if (bytes[0] === 56 && bytes[1] === 58 && bytes[2] === 67) {
            return bytes[3] << 24 >> 24;
        }
    }
    return deserializeWXFGeneral(buffer);
}

interpretate.serializeWXF = serializeWXF;
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

var InstancesHashMap = {}

window.InstancesHashMap = InstancesHashMap

let garbageTimeout = false;

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
