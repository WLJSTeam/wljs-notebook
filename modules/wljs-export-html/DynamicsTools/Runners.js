const BlackBox = {};

let cryptoHash = async (message) => {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await window.crypto.subtle.digest("SHA-1", msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
}

if (!(window?.crypto?.subtle)) {
    cryptoHash = async () => {
        interpretate.alert('Crypto features are not available in non-secured context. Please run an app locally or use reverse proxy with TSL.');
        throw 'Crypto features are not available in non-secured context';
    }
}

function flattenDeep(arr) {
  return arr.reduce((acc, val) => 
    Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), 
  []);
}

function separateTypes(vector) {
  return vector.reduce((acc, val, idx) => {
    if (typeof val === 'string') {
      acc.categorical.push({ index: idx, value: val });
    } else {
      acc.numerical.push({ index: idx, value: val });
    }
    return acc;
  }, { numerical: [], categorical: [] });
}

function categoricalMatchScore(vector, targetCats) {
  return targetCats.reduce((score, cat) => {
    return vector[cat.index] === cat.value ? score + 1 : score;
  }, 0);
}

function groupByMatchingCategoricals(basis, targetCats) {
  const groups = new Map();
  for (let i = 0; i < basis.length; i++) {
    const vector = basis[i];
    const score = categoricalMatchScore(vector, targetCats);
    if (!groups.has(score)) groups.set(score, []);
    groups.get(score).push(i); // store index
  }
  return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
}

function getNumericalVector(vector, indices) {
  return indices.map(i => vector[i]);
}
function isArray(val) {
  return Array.isArray(val);
}

function zeroLike(val) {
  if (!isArray(val)) return 0;
  return val.map(zeroLike);
}

function add(a, b) {
  if (!isArray(a)) return a + b;
  return a.map((ai, i) => add(ai, b[i]));
}

function scale(val, factor) {
  if (!isArray(val)) return val * factor;
  return val.map(v => scale(v, factor));
}

function weightedAverage(values, weights) {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let sum = zeroLike(values[0]);
  for (let i = 0; i < values.length; i++) {
    sum = add(sum, scale(values[i], weights[i]));
  }
  return scale(sum, 1 / totalWeight);
}

function distance(p1, p2) {
  return Math.sqrt(p1.reduce((sum, v, i) => sum + (v - p2[i]) ** 2, 0));
}

function isString(val) {
  return typeof val === 'string' || val instanceof String;
}

function decomposeString(str) {
  const regex = /(\d*\.?\d+|\D+)/g;
  const parts = str.match(regex);
  const template = [];
  const numbers = [];
  
  for (const part of parts) {
    if (/^\d*\.?\d+$/.test(part)) {
      numbers.push(parseFloat(part));
      template.push(null);
    } else {
      template.push(part);
    }
  }
  return { template, numbers };
}

function recomposeString(template, numbers) {
  let numIndex = 0;
  return template.map(t => t === null ? numbers[numIndex++] : t).join('');
}

async function interpolateMultilinear(query, basisVectors, hashMapGet, interpolation=true) {
  const { numerical: queryNum, categorical: queryCat } = separateTypes(query);
  const queryNumOnly = queryNum.map(n => n.value);
  const numIndices = queryNum.map(n => n.index);

  const catGroups = groupByMatchingCategoricals(basisVectors, queryCat);
  let matchingIndices = null;
  for (const [score, group] of catGroups) {
    if (group.length >= 2) {
      matchingIndices = group;
      break;
    }
  }

  if (!matchingIndices) throw new Error("No matching basis found.");

  const points = matchingIndices.map(i => getNumericalVector(basisVectors[i], numIndices));
  const values = await Promise.all(matchingIndices.map(i => hashMapGet(i)));

  const d = queryNumOnly.length;
  let K = Math.pow(2, d);
  K = Math.min(K, matchingIndices.length);

  const withDist = points.map((p, i) => ({
    index: i,
    dist: distance(queryNumOnly, p),
  }));

  withDist.sort((a, b) => a.dist - b.dist);
  const nearest = withDist.slice(0, K);
  const weights = nearest.map(({ dist }) => dist === 0 ? 1e6 : 1 / dist);
  const nearestValues = nearest.map(({ index }) => values[index]);

  const firstVal = nearestValues[0];
  

  if (isString(firstVal)) {
    const decomposed = nearestValues.map(str => decomposeString(str));

    const firstTemplateStr = JSON.stringify(decomposed[0].template);
const allTemplatesMatch = decomposed.every(d => JSON.stringify(d.template) === firstTemplateStr);
if (!allTemplatesMatch) {
  console.error('Output string differs. Cannot interpolate!');
  // Fallback: return value from the nearest neighbor
  return nearestValues[0];
}

    const numericValues = decomposed.map(d => d.numbers);
    const interpolatedNums = weightedAverage(numericValues, weights);
    const rounded = interpolatedNums.map(n => Number(n.toFixed(2)));

    return recomposeString(decomposed[0].template, rounded);

  } else if (Array.isArray(firstVal)) {
    if (!interpolation) return firstVal;

    let result; 
    try {
      result = weightedAverage(nearestValues, weights);
    } catch(err) {
      console.warn("Could not interpolate, returning nearest:", err);
      result = nearestValues[0];
    }
    
    return result;

  } else {
    if (!interpolation) return firstVal;

    let result; 
    try {
      result = weightedAverage(nearestValues, weights);
    } catch(err) {
      console.warn("Could not interpolate, returning nearest:", err);
      result = nearestValues[0];
    }
    
    return result;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

BlackBox.WidgetStateMachine = class {
  constructor() {
    this.map = new Map();
    this.state = [];
    this.symbols = null;
    this.eventsMap = new Map();
    this.enableInterpolation = true;
    this._pending = new Map();
  }

  async init(machineData) {
    const string = await interpretate.unzlib64String(machineData.CompressedMap);
    const parsed = JSON.parse(string);


    this.map = new Map(parsed);
    this.symbols = machineData.Symbols;

    

    if ('Interpolation' in machineData) {
      this.enableInterpolation = machineData.Interpolation;
    }

    if (machineData.Basis) {
      this.basis = machineData.Basis;
      this.flattenbasis = machineData.Basis.map((el) => flattenDeep(el));
    }
    
    this.state = [...machineData.InitialValues];
    this.eventsMap = new Map();
    const self = this;

    console.warn(self);
    
    machineData.Events.forEach((el, index) => {
      self.eventsMap.set(el[0]+'::'+el[1], index);
    });

    const hash = await cryptoHash(JSON.stringify(this.state));
    const dump = this.map.get(hash); 

    if (!dump) {
      
      for (let i=0; i<this.symbols.length; ++i) {
        console.warn(machineData.Symbols[i]);
        core[machineData.Symbols[i]].hashData = -1;
      }      
    } else {
      for (let i=0; i<this.symbols.length; ++i) {
        console.warn(machineData.Symbols[i]);
        core[machineData.Symbols[i]].hashData = dump[i][1];
      }
    }

    delete machineData.CompressedMap;
    return this;
  }

  async run(evId, payload, pattern) {
    const uid = `${evId}::${pattern}`;
    if (!this.eventsMap.has(uid)) return;

    // grab or create the pending record
    let rec = this._pending.get(uid);
    if (!rec) {
      rec = { lastArgs: null, frameRequested: false };
      this._pending.set(uid, rec);
    }

    // overwrite with the newest call
    rec.lastArgs = [evId, payload, pattern];

    // if we haven't asked for an rAF yet, do it now
    if (!rec.frameRequested) {
      rec.frameRequested = true;
      requestAnimationFrame(async () => {
        // when the frame hits, pull the last args
        const [ id, pl, pat ] = rec.lastArgs;
        await this.scheldule(id, pl, pat);

        // clean up so next run() will schedule again
        this._pending.delete(uid);
      });
    }
  }

  async scheldule(evId, payload, pattern) {
    const uid = evId+'::'+pattern;
    if (!this.eventsMap.has(uid)) return;
    const index = this.eventsMap.get(uid);
    this.state[index] = payload;
    
    const hash = await cryptoHash(JSON.stringify(this.state));

    const symbols = this.symbols.map((e => core[e]));
    let dump;
    
    if (this.map.has(hash)) dump = this.map.get(hash);

    for (let symbolIndex=0; symbolIndex<symbols.length; ++symbolIndex) {
      const symbol = symbols[symbolIndex];
 

      if (!dump) {
        console.log("Hash miss. Taking the nearest");
        const interpolated = await this.interpolate(symbolIndex);
        if (interpolated[1] != symbol.data[1]) {

          if (typeof symbol.data == 'string') { //fixme
            if (symbol.data.slice(1,-1) == interpolated[1]) continue;
          }
          symbol.data = interpolated;
          

          for (const inst of Object.values(symbol.instances)) {
              if (inst.dead) continue;
              inst.update();
          }              
        }
      } else {
        if (symbol.dataHash != dump[symbolIndex][1] && symbol.data[1] != dump[symbolIndex][0]) {

          if (typeof symbol.data == 'string') { //fixme
            if (symbol.data.slice(1,-1) == dump[symbolIndex][0]) continue;
          }

          switch(dump[symbolIndex][2]) {
            case 'PackedArray':
              const packedArray = interpretate.deserializeWXF(base64ToArrayBuffer(dump[symbolIndex][0]));
              symbol.data = packedArray;
            break;

            default:
              symbol.data = ['JSObject', structuredClone(dump[symbolIndex][0])];
          }
          
          symbol.dataHash = dump[symbolIndex][1];

 
          for (const inst of Object.values(symbol.instances)) {
              if (inst.dead) continue;
              inst.update();
          }           
        }
      }


    }

  }

  async interpolate (symbolIndex) {
    if (!this.basis) throw 'no basis';

    const self = this;;

    const flatState = flattenDeep(this.state);
    const int = this.enableInterpolation;

    const interpolated = await interpolateMultilinear(flatState, this.flattenbasis, async (index) => {
      const hash = await cryptoHash(JSON.stringify(self.basis[index]));
      const val = self.map.get(hash);

      switch(val[symbolIndex][2]) {
            case 'PackedArray':
              const packedArray = interpretate.deserializeWXF(base64ToArrayBuffer(val[symbolIndex][0]));
              if (!int) return packedArray[1];
              return packedArray[1].normal(); //have to convert to perform interpoaltion
            break;

            default:
              return structuredClone(val[symbolIndex][0]);
      }

      
    }, int); 

     return ['JSObject', interpolated];

  }
}

function base64ToArrayBuffer(base64) {
    var binaryString = atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}


BlackBox.StateMachine = class {
  constructor() {
    this.map = new Map();
    this.state = [];
    this.symbol = null;
    this.eventsMap = new Map();
    this.enableInterpolation = true;
  }

  async init(machineData) {
    const string = await interpretate.unzlib64String(machineData.CompressedMap);
    const parsed = JSON.parse(string);

    this.map = new Map(parsed);
    this.symbol = machineData.Symbol;

    if (machineData.Basis) {
      this.basis = machineData.Basis;
      this.flattenbasis = machineData.Basis.map((el) => flattenDeep(el));
    }

    if ('Interpolation' in machineData) {
      this.enableInterpolation = machineData.Interpolation;
    }
    
    this.state = [...machineData.InitialValues];
    this.eventsMap = new Map();
    const self = this;
    
    machineData.Events.forEach((el, index) => {
      self.eventsMap.set(el[0]+'::'+el[1], index);
    });

    delete machineData.CompressedMap;
    return this;
  }

  async run(evId, payload, pattern) {
    const uid = evId+'::'+pattern;
    if (!this.eventsMap.has(uid)) return;
    const index = this.eventsMap.get(uid);
    this.state[index] = payload;
    
    const hash = await cryptoHash(JSON.stringify(this.state));
    const symbol = core[this.symbol];
    

    if (!this.map.has(hash)) {
      console.log("Hash miss. Attempting to interpolate");
      symbol.data = await this.interpolate();
    } else {
      symbol.data = ['JSObject', structuredClone(this.map.get(hash))];
    }

    
    

    for (const inst of Object.values(symbol.instances)) {
      if (inst.dead) continue;
      await inst.update();
    };
  }

  async interpolate () {
    if (!this.basis) throw 'no basis';

    const self = this;;
    const int = this.enableInterpolation;

    const flatState = flattenDeep(this.state);
    console.log(flatState);
    const interpolated = await interpolateMultilinear(flatState, this.flattenbasis, async (index) => {
      const hash = await cryptoHash(JSON.stringify(self.basis[index]));
      return structuredClone(self.map.get(hash));
    }, int);

    return ['JSObject', interpolated];

  }
}

BlackBox.PavlovMachine = class {
  constructor() {
    this.map = new Map();
    this.eventsMap = new Map();
  }

  async init(machineData) {
    const string = await interpretate.unzlib64String(machineData.CompressedMap);
    const parsed = JSON.parse(string);

    this.map = new Map(parsed);


    
    this.eventsMap = new Map();
    const self = this;
    
    machineData.Events.forEach((el) => {
      self.eventsMap.set(el[0]+'::'+el[1]);
    });

    delete machineData.CompressedMap;
    return this;
  }

  async run(evId, payload, pattern) {
    const uid = evId+'::'+pattern;
    if (!this.eventsMap.has(uid)) return;
    
    const hash = await cryptoHash(JSON.stringify([evId, pattern, payload]));
    if (!this.map.has(hash)) return;
    
    const global = {};
    const local = {};
    interpretate(JSON.parse(this.map.get(hash)), {global: global, local: local});
  }
}    

BlackBox.AnimationMachine = class {
  constructor() {

  }

  async init(machineData) {
    const string = await interpretate.unzlib64String(machineData.Compressed);
    const parsed = JSON.parse(string);

    this.values = parsed;
    this.count = 0;
    this.parity = true;

    this.symbol = machineData.Symbol;
    this.hash = machineData.HashState;
    this.eventId = machineData.Event[0];
    

    return this;
  }

  async run(evId, payload, pattern) {
    if (this.eventId != evId) return;
    
    const symbol = core[this.symbol];
    symbol.data = ['JSObject', structuredClone(this.values[this.count])];

    for (const inst of Object.values(symbol.instances)) {
      if (inst.dead) continue;
      await inst.update();
    };        

    if (!this.parity) this.count++;
    this.parity = !this.parity; //animate on 2
    if (this.values.length == this.count) this.count = 0;
  }
} 

// Publish before web components mount; attach immediately when a server already exists.
globalThis.WLJS_BLACK_BOXES = BlackBox;
if (globalThis.server) globalThis.server.BlackBox = BlackBox;
