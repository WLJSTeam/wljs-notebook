

function templateEngine(template, data) {
  return template.replace(/#(\w+)/g, (match, p1) => {
    return data[p1] !== undefined ? data[p1] : match;
  });
}

core.CreateUUID = async () => {
  return uuidv4();
}

const winScript = async (args, env) => {
  const uid = await interpretate(args[0], env);
  env.local.onblur = () => server.kernel.io.fire(uid, true, 'Blur');
  env.local.onfocus = () => server.kernel.io.fire(uid, true, 'Focus');
  addEventListener("blur", env.local.onblur);
  addEventListener("focus", env.local.onfocus);
  server.kernel.io.fire(uid, true, '_Mounted');
}

winScript.destroy = (args, env) => {
  removeEventListener("blur", env.local.onblur);
  removeEventListener("focus", env.local.onfocus);
  delete env.local.onblur; delete env.local.onfocus;
}

winScript.virtual = true;

core['CoffeeLiqueur`Extensions`InputsOutputs`Private`winScript'] = winScript;

core['HTMLView`TemplateProcessor'] = async (args, env) => {
  const obj = await interpretate(args[0], env);
  env.htmlContent.text = templateEngine(env.htmlContent.text, obj);
}

core['CoffeeLiqueur`Extensions`InputsOutputs`Tools`TemplateProcessor'] = core['HTMLView`TemplateProcessor'];

core['HTMLView`WLXProcessor'] = async (args, env) => {
  env.local.wlxEnvs = [];
  const string = env.htmlContent.text;
  env.htmlContent.function = async (setContent) => {
    await window.SupportedCells['wlx'].view.hydrate(string, env.local.wlxEnvs, setContent)
  };
}

core['HTMLView`WLXProcessor'].destroy = (args, env) => {
  console.log('wlx processor disposed');
  window.SupportedCells['wlx'].view.dispose(env.local.wlxEnvs);
  delete env.local.wlxEnvs;
}

core['HTMLView`WLXProcessor'].virtual = true;

core['CoffeeLiqueur`Extensions`InputsOutputs`Tools`WLXProcessor'] = core['HTMLView`WLXProcessor'];

core['HTMLView`InlineJSModule'] = async (args, env) => {
  let str = await interpretate(args[0], env);

  if (str.includes('<script>')) {
    str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  const newScript = document.createElement("script");
  newScript.appendChild(document.createTextNode('{\n'+str+'\n}'));

  env.element.appendChild(newScript);
}

core['CoffeeLiqueur`Extensions`InputsOutputs`Tools`InlineJSModule'] = core['HTMLView`InlineJSModule'];
core['CoffeeLiqueur`Extensions`InputsOutputs`Tools`AnonymousJavascript'] = core['HTMLView`InlineJSModule'];

core.HTMLView = async (args, env) => {
  
  let html = await interpretate(args[0], env);
  //env.uiInstanceId = uuidv4();
  const options = await core._getRules(args, {...env, hold:true});

  if (Array.isArray(html)) html = html.join('\n');

  env.htmlContent = {text: html};


  

  if ('Prolog' in options) {
    await interpretate(options.Prolog, env);
  }
  
  let element;

  if (env.htmlContent.function) {
    await env.htmlContent.function(async (content) => {
      element = await setInnerHTMLAsync(env.element, content);
    });
    console.warn('Complex processing');
  } else {
    element = await setInnerHTMLAsync(env.element, env.htmlContent.text);
  }

  //html = replaceContextPlaceholders(html, {env: env});

  if ('Epilog' in options) {
    console.log('Epilog');
    await interpretate(options.Epilog, {...env, element: element});
  }
}   

core['CoffeeLiqueur`Extensions`InputsOutputs`HTMLView'] = core.HTMLView // a bug


core.Prolog = () => "Prolog"
core.Epilog = () => "Epilog"



core["CoffeeLiqueur`Extensions`InputsOutputs`Private`HandleGroup"] = async (args, env) => {
  const data = await interpretate(args[0], {...env, hold:true});

  const doc = env.element.querySelectorAll('[data-type="group"]')[0];
  for (const fe of data) {
      const el = document.createElement('div');
      doc.appendChild(el);
      await interpretate(fe, {...env, element: el});
  }
}

//legacy
core["Notebook`Kernel`Inputs`Private`HandleGroup"] = core["CoffeeLiqueur`Extensions`InputsOutputs`Private`HandleGroup"];


core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementCallback"] = async (args, env) => {
  const data = await interpretate(args[1], env);
  const uid = await interpretate(args[0], env);

  env.local.uid = uid;
  const el = core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementCallback"][uid];
  env.local.el = el;

  if (el) {
    el.init(data, env);
  }
}

core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementCallback"].update = async (args, env) => {
  const data = await interpretate(args[1], env);
  env.local.el.update(data, env);
}

core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementCallback"].destroy = (args, env) => {
  console.log('InternalElementCallback destroyed!');
  delete env.local.el;
  delete core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementCallback"][env.local.uid];
}

core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementCallback"].virtual = true;

core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementUpdate"] = async (args, env) => {
  const data = await interpretate(args[0], env);
  const name = await interpretate(args[1], env);
  const field = await interpretate(args[2], env);

  env.local.element = env.element.querySelectorAll(`[data-type="${name}"]`)[0];
  env.local.field   = field;
  env.local.element[field] = data;
}

core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementUpdate"].update = async (args, env) => {
  const data = await interpretate(args[0], env);
  env.local.element[env.local.field] = data;
}

core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementUpdate"].destroy = () => {
  console.log('InternalElementUpdate destroyed!');
}

core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementUpdate"].virtual = true;

//legacy
core["Notebook`Kernel`Inputs`Private`InternalElementUpdate"] = core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalElementUpdate"]; 

core.InternalWLXDestructor = async (args, env) => {
    const uid = await interpretate(args[0], env);
    env.local.uid = uid;
    console.log('Registered an instance');
}

core.InternalWLXDestructor.destroy = async (args, env) => {
    console.log(env.local.uid);
    if (!core.InternalWLXDestructor[env.local.uid])
    (core.InternalWLXDestructor[env.local.uid])(env);
    console.log('Removed an instance');
}

core.InternalWLXDestructor.virtual = true

core["CoffeeLiqueur`Extensions`InputsOutputs`Private`InternalWLXDestructor"] = core.InternalWLXDestructor;



//legacy
core.InternalHandleGroup = async (args, env) => {
    const uid = await interpretate(args[0], env);
    const data = await interpretate(args[1], {...env, hold:true});

    const doc = document.getElementById(uid);
    for (const fe of data) {
        const el = document.createElement('div');
        doc.appendChild(el);
        await interpretate(fe, {...env, element: el});
    }
}

core.InternalHandleTextView = async (args, env) => {
    const data = await interpretate(args[0], env);
    const uid = await interpretate(args[1], env);

    env.local.element = document.getElementById(uid);
    env.local.element.value = data; 
}

core.InternalHandleTextView.update = async (args, env) => {
    const data = await interpretate(args[0], env);
    env.local.element.value = data;
}

core.InternalHandleTextView.destroy = async (args, env) => {
    console.log('InternalHandleTextView destroyed!');
 
}

core.InternalHandleTextView.virtual = true;

core.InternalHandleHTMLView = async (args, env) => {
    const data = await interpretate(args[0], env);
    const uid = await interpretate(args[1], env);

    env.local.element = document.getElementById(uid);
    env.local.element.innerHTML = data; 
}

core.InternalHandleHTMLView.update = async (args, env) => {
    const data = await interpretate(args[0], env);
    env.local.element.innerHTML = data;
}

core.InternalHandleHTMLView.destroy = async (args, env) => {
    console.log('InternalHandleHTMLView destroyed!');
}

core.InternalHandleHTMLView.virtual = true;

window.base64ArrayBuffer = (arrayBuffer) => {
    var base64    = ''
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

    var bytes         = new Uint8Array(arrayBuffer)
    var byteLength    = bytes.byteLength
    var byteRemainder = byteLength % 3
    var mainLength    = byteLength - byteRemainder

    var a, b, c, d
    var chunk

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
      d = chunk & 63               // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength]

      a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3)   << 4 // 3   = 2^2 - 1

      base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

      a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

      base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }

    return base64
}


const atoms = {};


function isDOM(el) {
  return el instanceof Element
}
const quantity = {}
quantity.MixedUnit = core.List

    quantity.Power = (args, env) => {
      const string = interpretate(args[0], env);
      const power = interpretate(args[1], env);

      const container = document.createElement('span');
      const sup = document.createElement('sup');
      if (isDOM(string)) {
        container.appendChild(string);
      } else {
        container.innerText = string;
      }

      if (isDOM(string)) {
        sup.appendChild(power);
      } else {
        sup.innerText = power;
      }

      container.appendChild(sup);
      
      return container;
    }


    quantity.Times = (args, env) => {
      const a = args.map((el) => interpretate(el, env));
      const doc = document.createElement('span');

      a.forEach((el, index) => {
        if (isDOM(el)) {
          doc.appendChild(el);
        } else {
          const item = document.createElement('text');
          item.innerText = el;
          doc.appendChild(item);
        } 
        if (index < a.length - 1) {
          const sep = document.createElement('text');
          sep.innerHTML = "&middot;";
          doc.appendChild(sep);
        }
      });

      return doc;
    }

atoms['Quantity'] = async (data, env, element) => {
    //console.warn(data);
    
    element.classList.add('selectable');
    
    if (data[0] == 'Association') {
      const keys = Object.keys(await interpretate(data, {hold:true}));
      const ul = document.createElement('ul');
      for (const i of keys) {
        const li = document.createElement('li');
        li.innerText = i;
        ul.appendChild(li);
      }
      
      ul.style.maxHeight = '4rem';
      element.style.overflowY = 'scroll';
      element.appendChild(ul);

    } else if (data[0] == 'Quantity') {
      const value = await interpretate(data[1], env);
      //const span = document.createElement('span');
      const label = await interpretate(data[2], {...env, context: quantity});
      if (label instanceof Element) {
        element.innerText = `${value} `;
        element.appendChild(label);
      } else {
        element.innerText = `${value} ${label}`;
      }

      
      
    } 

    return true;

  }

atoms['Entity'] = async (data, env, element, store) => {

  return await atoms.Blank(data, env, element, store, interpretate.hashv2)
}


atoms['DateObject'] = async (data, env, element) => {
    //console.warn(data);
    const value = await interpretate(data[1], env);
    const [y, m, d, h = 0, min = 0, s = 0] = value;

    const date = new Date(
      y ?? 0,
      ((m ?? 1) - 1),  // default month to Jan if missing
      d ?? 1,          // default day to 1 if missing
      h,
      min,
      s
    );


    element.classList.add('text-xs', 'text-left', 'text-gray-800', 'selectable');
    const timeElement = document.createElement('div');
    timeElement.innerText = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    element.appendChild(timeElement);

    const dateElement = document.createElement('span');
    dateElement.innerText = date.toLocaleDateString();
    element.appendChild(dateElement);   
    
    return true;
  }

atoms['Missing'] = async () => {
  return true;
}

atoms['$Failed'] = async (data, contextEnv, element, store) => {
  element.innerText = "$Failed";
  return true;
}

atoms['Graphics'] = async (data, contextEnv, element, store) => {
    //check by hash if there such object, if not. Ask server to create one with EditorView and store.
    contextEnv.heavyLoad = true;

    let env = {global: {}, element: element}; 
 

    console.log('frontend executable');

      
    const copy = env;
    
    const instance = new ExecutableObject('dataset-stored-'+uuidv4(), copy, data, true);
    instance.assignScope(copy);
      
    instance.execute();
    store.instances.push(instance);
    
    //element.classList.add('frontend-view');
    return true;
  }

atoms['Graphics3D'] = atoms['Graphics'];
atoms['Image'] =  atoms['Graphics'];
atoms['Image3D'] =  atoms['Graphics'];
atoms['Sound'] =  atoms['Graphics'];
atoms['FrontEndExecutable'] =  atoms['Graphics'];


atoms.List = async (data, env, element, store, hashFunction) => {
  const reqursionDepth = (env.reqursionDepth || 1) + 1;

  if (reqursionDepth > 4) {
    element.innerText = "...";
    return true;
  }

  //if (data.length < 4) return false;
  

  if (reqursionDepth > 2) {
    const button = document.createElement('button');
    button.innerText = "...";
    button.className = 'sm-controls rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50';
    button.addEventListener('click', () => {
      button.remove();
      atoms.List(data, {...env, reqursionDepth: reqursionDepth-2}, element, store, hashFunction);
    });
    element.appendChild(button);

    return true;
  }

  const wrapper = document.createElement('div');
  const table = document.createElement('table');
  table.className = "divide-y w-full divide-gray-200";
  table.style.textAlign = "right";
  wrapper.style.maxHeight = "9rem";
  wrapper.classList.add('overflow-y-scroll');

  if (env.tableBorders) {
    element.classList.add('ring-1', 'ring-inset', 'ring-gray-400');
    wrapper.style.margin = "0.25rem";
  }

  for (const item of data.slice(1)) {
    const tr = document.createElement('tr');
    tr.className = "px-2 py-1 whitespace-nowrap text-sm ";

    const td = document.createElement('td');
    tr.appendChild(td);
    table.appendChild(tr);
    await renderCell(0, 0, item, {...env, reqursionDepth: reqursionDepth, tableBorders:true}, td, store, hashFunction);
  }

  wrapper.appendChild(table);
  element.appendChild(wrapper);

  return true;
}

atoms.Association = async (data, env, element, store, hashFunction) => {
  const reqursionDepth = (env.reqursionDepth || 1) + 1;

  if (reqursionDepth > 4) {
    element.innerText = "...";
    return true;
  }

  if (reqursionDepth > 2) {
    const button = document.createElement('button');
    button.innerText = "...";
    button.className = 'sm-controls rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50';
    button.addEventListener('click', () => {
      button.remove();
      atoms.Association(data, {...env, reqursionDepth: reqursionDepth-2}, element, store, hashFunction);
    });
    element.appendChild(button);

    return true;
  }

  const wrapper = document.createElement('div');
  const table = document.createElement('table');
  table.className = "divide-y w-full divide-gray-200";
  table.style.textAlign = "right";
  wrapper.style.maxHeight = "8rem";
  wrapper.classList.add('overflow-y-scroll');

  if (env.tableBorders) {
    element.classList.add('ring-1', 'ring-inset', 'ring-gray-400');
    wrapper.style.margin = "0.25rem";
  }

  const assoc = await interpretate(data, {...env, contenxt: datasetContext, hold:true});
  const rows = [];
  for (const key of Object.keys(assoc)) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    const td = document.createElement('td');

    tr.appendChild(th);
    tr.appendChild(td);
    th.classList.add(...("px-2 py-1 text-start font-medium text-gray-500 uppercase".split(' '))); 
    th.innerText = String(key);
    await renderCell(0, 0, assoc[key], {...env, reqursionDepth: reqursionDepth}, td, store, hashFunction);
    table.appendChild(tr);
  }

  wrapper.appendChild(table);
  element.appendChild(wrapper);

  return true;

}

atoms.Blank = async (data, contextEnv, element, store, hashFunction = interpretate.hash) => {
  //check by hash if there such object, if not. Ask server to create one with EditorView and store.
  contextEnv.heavyLoad = true;
  let hf = hashFunction || interpretate.hash;
  const hash = String(hf(data));

  let obj;
  let storage;

  if (!(hash in ObjectHashMap)) {
    obj = new ObjectStorage(hash);
    obj.doNotCollect = true;
    store.objects.push(obj);

    try {
      storage = await obj.get();
    } catch(err) {
      console.warn('Creating FE object by id '+hash);
      await server.kernel.io.fetch('CoffeeLiqueur`Extensions`InputsOutputs`Private`DatasetMakeBox', [JSON.stringify(data), hash]);
      storage = await obj.get();
    }
    
  } else {
    obj = ObjectHashMap[hash];
  }

  if (!storage) storage = await obj.get();

  let env = {global: {}, element: element}; 
  console.log("Dataset: creating an object");
  console.log('frontend executable');

    
  const copy = env;

  const instance = new ExecutableObject('dataset-stored-'+uuidv4(), copy, storage, true);
  instance.assignScope(copy);
  obj.assign(instance);
    
  instance.execute();
  store.instances.push(instance);
  
  //element.classList.add('frontend-view');
  return true;
}



const WLNumber = new RegExp(/^(-?\d+)(.?\d*)(\*\^)?(\d*)/);

const parseBasicAtoms = (d) => {
  const stringQ = typeof d === 'string';
  //console.log(d);
  //console.log(stringQ);
  //real string
  if (stringQ) {
    if (d.charAt(0) == "'") return d.slice(1, -1);
    if (isNumeric(d)) return parseInt(d); //for Integers
  
    if (WLNumber.test(d)) {
      console.log(d);
      //deconstruct the string
      let [begin, floatString, digits, man, power] = d.split(WLNumber);
    
      if (digits === '.')
        floatString += digits + '0';
      else
        floatString += digits;
    
      if (man)
        floatString += 'E' + power;

      console.log(floatString);
    
      return parseFloat(floatString);
    }
  }

  if (typeof d === 'number') {
    return d; 
  }

  return false;
}

const sortCellValue = (cell) => {
  if (cell === undefined || cell === null) return null;
  if (typeof cell === 'number') return cell;
  if (typeof cell === 'boolean') return cell ? 1 : 0;
  if (typeof cell === 'string') {
    const basic = parseBasicAtoms(cell);
    if (typeof basic === 'number') return basic;
    if (typeof basic === 'string') return basic.toLowerCase();
    return cell.toLowerCase();
  }
  if (Array.isArray(cell) && cell[0] === 'DateObject' && Array.isArray(cell[1])) {
    let parts = cell[1];
    if (parts[0] === 'List') parts = parts.slice(1);
    const [y = 0, m = 1, d = 1, h = 0, min = 0, s = 0] = parts;
    return new Date(y, m - 1, d, h, min, s).getTime();
  }
  if (Array.isArray(cell) && cell[0] === 'Quantity') {
    const val = parseBasicAtoms(cell[1]);
    if (typeof val === 'number') return val;
  }
  return null;
}

const compareCells = (a, b) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

const renderCell = async (row, col, ocell, env, td, store, hashFunction) => {
  let cell = ocell;

  if (typeof cell === 'undefined') {
    return
  }

  let basic = parseBasicAtoms(cell);
  if (basic) {
    td.classList.add('selectable');

    if (typeof basic == 'string') {
      //basic = basic.replaceAll('\n', '<br/>')
      td.classList.remove('whitespace-nowrap');
      td.style.color = 'var(--editor-key-string)';
      //td.style.display = 'inline-block';
      //td.style.maxWidth = '10rem';
    } else {
      
      td.style.color = 'var(--editor-key-literal)';
    }

    td.innerText = basic;
    
    return;
  }

  if (cell === true) {
    td.innerText = '✅'; 
    return;
  }

  if (cell === false) {
    td.innerText = '❌';
    return;
  }


  //if an object (association turned by accident due to absence of types system)
  if (typeof cell == 'object' && !Array.isArray(cell)) {
    cell = ['Association'];
    for (const key of Object.keys(ocell)) {
      cell.push(['Rule', "'"+String(key)+"'", ocell[key]]);
    }
  } else {
    //check the head
    if (parseBasicAtoms(cell[0])) {
      //if it is list turned into JS list by accident
      cell.unshift('List');
    }
  }

  //complex guys
  const head = cell[0];
  if (head in atoms) {
    const result = await atoms[head](cell, env, td, store, hashFunction);
    if (result) return;
  }


  //if not using cached or create editors
  await atoms.Blank(cell, env, td, store, hashFunction);
  
} 


/*

Entity["Country", "Afghanistan"] -> <|Entity["AdministrativeDivision", {"Badakhshan", "Afghanistan"}] 

*/

const datasetContext = {}
datasetContext.Entity = (args, env) => {
  const lastArg = args[args.length-1];
  const basicAtom = parseBasicAtoms(lastArg);
  if (basicAtom) return String(basicAtom);

  return lastArg.slice(1).map(parseBasicAtoms).join(' ');
}

datasetContext.Missing = (args, env) => {
  return 'Missing'
}

datasetContext.$Failed = (args, env) => {
  return '$Failed'
}

datasetContext.Association = async function(args, env) {
  let rules = {};
  if (env.hold) {
      for (const el of args) {
          if (el instanceof Array) {
              if (el[0] === 'Rule') {
                  let key = el[1];
                  const basicAtomQ = parseBasicAtoms(key);

                  if (key in datasetContext || key in core || basicAtomQ) {
                    key = interpretate(key, {
                      ...env,
                      hold: false
                    });
                  } else {
                    if (Array.isArray(key)) {
                      if (key[0] in datasetContext || key[0] in core) {
                        key = interpretate(key, {
                          ...env,
                          hold: false
                        });
                      } else {
                        key = String(key);
                      }
                    } else {
                      key = String(key);
                    }
                  }

                  rules[key] = el[2]
              }
          }
      };
  } else {
      for (const el of args) {
          if (el instanceof Array) {
              if (el[0] === 'Rule') {
                  let key = el[1];
                  const basicAtomQ = parseBasicAtoms(key);

                  if (key in datasetContext || key in core || basicAtomQ) {
                    key = interpretate(key, {
                      ...env,
                      hold: false
                    });
                  } else {
                    if (Array.isArray(key)) {
                      if (key[0] in datasetContext || key[0] in core) {
                        key = interpretate(key, {
                          ...env,
                          hold: false
                        });
                      } else {
                        key = String(key);
                      }
                    } else {
                      key = String(key);
                    }
                  }

                  rules[key] = await interpretate(el[2], env);                
              }
          }
      };
  }

  return rules;
}

function arraysEqualUnorderedFast(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;

  const countMap = new Map();

  for (const item of arr1) {
    countMap.set(item, (countMap.get(item) || 0) + 1);
  }

  for (const item of arr2) {
    if (!countMap.has(item)) return false;
    countMap.set(item, countMap.get(item) - 1);
    if (countMap.get(item) < 0) return false;
  }

  return true;
}

core.Dataset = async (args, env) => {


  const options = await core._getRules(args, env);
  

  const data = await interpretate(args[0], {...env, hold:true, context: datasetContext});
  
  let hashFunction = interpretate.hash;
  if (env?.options?.HashFunction == 'V2') hashFunction = interpretate.hashv2;
  

  
  //console.log(data);

  
  let headerCols;
  let headerRows;

  let rows = [];

  const rowsReprocess = async (d) => {
    let newRows;
    if (Array.isArray(d)) {
      
      await Promise.all(d.map(async (item, index) => {
        if (item[0] != 'Association' && item[0] != 'List') {
          d[index] = item; //Skip if it is 1D array
        } else {
          d[index] = await interpretate(item, {...env, hold:true, contenxt:datasetContext});
        }
      }));
  
      if (Array.isArray(d[0])) {
        if(options.TableHeadings) {
          headerCols = options.TableHeadings
        }

        newRows = await Promise.all(d.map(async (row) => {
          return Promise.all(row.map(async (cell) => cell));
        }));
        
      } else {
        if (typeof d[0] != 'object') {
          newRows = d.map((e) => [e]);
        } else {
          headerCols = Object.keys(d[0]);

          newRows = await Promise.all(d.map(async (row) => {
            return Promise.all(headerCols.map(async (col) => row[col]));
          }));
        }
      }
    } else {
      headerRows = Object.keys(d);
      newRows = await Promise.all(headerRows.map(async (row) => await interpretate(d[row], {...env, hold:true, context:datasetContext})));    
  
      if (Array.isArray(newRows[0])) {
        
        
        newRows = await Promise.all(newRows.map(async (row) => {
          return Promise.all(row.map(async (cell) => cell));
        }));
      } else {
        headerCols = Object.keys(newRows[0]);

        newRows = await Promise.all(newRows.map(async (row) => {
          return Promise.all(headerCols.map(async (col) => row[col]));
        }));
      }
    }

    return newRows;
  }

  if (Array.isArray(data)) {
    await Promise.all(data.map(async (item, index) => {
      if (item[0] != 'Association' && item[0] != 'List') {
        data[index] = item; //Skip if it is 1D array
      } else {
        data[index] = await interpretate(item, {...env, hold:true, context:datasetContext});
      }
    }));

    if (Array.isArray(data[0])) {
      if(options.TableHeadings) {
        headerCols = options.TableHeadings
      }

      rows = await Promise.all(data.map(async (row) => {
        return Promise.all(row.map(async (cell) => cell));
      }));
      
    } else {
      if (typeof data[0] != 'object') {
        //prbably 1D array
        rows = data.map((e) => [e]);
      } else {
   
        headerCols = Object.keys(data[0]);
        
        rows = await Promise.all(data.map(async (row) => {
          return Promise.all(headerCols.map(async (col) => row[col]));
        }));
      }
    }
  } else {
    headerRows = Object.keys(data);

    let oneDimArrayQ = false;
    rows = await Promise.all(headerRows.map(async (row) => {
      if (data[row][0] != 'Association' && data[row][0] != 'List') {
        console.log(data[row]);
        oneDimArrayQ = true;
        return data[row]; //probably 1D array
      } else {
        return await interpretate(data[row], {...env, hold:true, context:datasetContext})
      }
      
    })); 

    console.log(oneDimArrayQ);
    
    if (oneDimArrayQ) {
      rows = rows.map((el) => [el]);
    }

    if (Array.isArray(rows[0])) {
      rows = await Promise.all(rows.map(async (row) => {
        return Promise.all(row.map(async (cell) => cell));
      }));
    } else {
      //console.warn(rows[0]);
      headerCols = Object.keys(rows[0]);

      if (!arraysEqualUnorderedFast(Object.keys(rows[0]), Object.keys(rows[1]))) {
          console.log('Different keys for associations! Fallback to a single dimension');
          rows = rows.map((el) => [el]);
          oneDimArrayQ = true;
          headerCols = undefined;
      } else {

        if (oneDimArrayQ) {
          console.log('1D');
        }
        rows = await Promise.all(rows.map(async (row) => {
          return Promise.all(headerCols.map(async (col) => row[col]));
        }));
      }

    }
  }

  const element = env.element;
  element.classList.add(...("sm-controls cursor-default rounded-md 0 py-1 pl-3 bg-gray-50 pr-2 text-left text-gray-500 ring-1 ring-inset ring-gray-400 text-xs".split(' ')));

  const container_1 = document.createElement('div');
  container_1.classList.add(...("-m-1.5 overflow-x-auto".split(' ')));
  
  const container_2 = document.createElement('div');
  container_2.classList.add(...("p-1.5 inline-block align-middle".split(' ')));  

  const container_3 = document.createElement('div');
  container_3.classList.add("overflow-hidden"); 

  const table = document.createElement('table');
  table.classList.add(...("block max-h-60 overflow-y-scroll sc-b pr-2 divide-y divide-gray-200".split(' ')));  

  table.style.wordBreak = 'normal';
  table.style.wordWrap = 'initial';   
  table.style.resize = 'both';
  table.style.maxWidth = Math.max((window.innerWidth - 200 * window.devicePixelRatio), 300) + 'px';

  let resizeAllowed = false;

  table.addEventListener('mousedown', () => {
    if (resizeAllowed) return;
    resizeAllowed = true;
    table.style.height = table.clientHeight + 'px';
    table.style.maxWidth = '';
    table.classList.remove('max-h-60');
    console.log('class removed');
  })

  if (options.ImageSize) {
    if (Array.isArray(options.ImageSize)) {
        if (typeof options.ImageSize[0] === 'number') table.style.width = options.ImageSize[0] + 'px';
        if (typeof options.ImageSize[1] === 'number') table.style.height = options.ImageSize[1] + 'px';
    } else {
        if (typeof options.ImageSize === 'number') table.style.width = options.ImageSize + 'px';
    }
  }

  let thead;

  if (headerCols) {
    thead = document.createElement('thead');
    thead.classList.add(...("sticky top-0 bg-gray-100".split(' ')));
    const tr = document.createElement('tr');
    thead.appendChild(tr);

    if (headerRows) {
      const th = document.createElement('th');
      th.classList.add(...("px-2 py-1 text-start text-xs font-medium text-gray-500 uppercase".split(' '))); 
      tr.appendChild(th);
    }

    let sortCol = -1;
    let sortDir = 0; // 0=none, 1=asc, -1=desc
    const thElements = [];

    headerCols.forEach((c, colIndex) => {
      const th = document.createElement('th');
      th.classList.add(...("px-2 py-1 text-start text-xs font-medium text-gray-500 uppercase cursor-pointer select-none".split(' '))); 
      th.style.userSelect = 'none';
      const label = document.createElement('span');
      label.innerText = c;
      const arrow = document.createElement('span');
      arrow.style.marginLeft = '4px';
      arrow.innerText = '';
      th.appendChild(label);
      th.appendChild(arrow);
      th.addEventListener('click', () => {
        if (sortCol === colIndex) {
          sortDir = sortDir === 1 ? -1 : sortDir === -1 ? 0 : 1;
        } else {
          sortCol = colIndex;
          sortDir = 1;
        }
        thElements.forEach((h, idx) => {
          h.arrow.innerText = idx === sortCol && sortDir !== 0 ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
        });
        if (totalParts > 1) {
          env.local.callback = async (data) => {
            rows = await rowsReprocess(data);
            rows.forEach((r, i) => { r._origIdx = i; });
            pagination = Math.ceil(rows.length / pageSize);
            currentPart = 0;
            totalOffset = 0;
            page = 0;
            offset = 0;
            viewPort.rebuild(rows, windowSize);
            table.scrollTop = 0;
          };
          console.log('sorting call');
          console.log(env.local.event)
          server.kernel.io.fire(env.local.event, [colIndex + 1, sortDir], 'Sort');
          return;
        } else {
          if (sortDir === 0) {
            rows.sort((a, b) => a._origIdx - b._origIdx);
          } else {
            rows.sort((a, b) => sortDir * compareCells(sortCellValue(a[colIndex]), sortCellValue(b[colIndex])));
          }
        }
        page = 0;
        offset = 0;
        viewPort.rebuild(rows, windowSize);
        table.scrollTop = 0;
      });
      thElements.push({th, arrow});
      tr.appendChild(th);
    });
  }



  const tbody = document.createElement('tbody');
  tbody.classList.add(...("max-h-10 divide-y divide-gray-200".split(' ')));

  let rowsDOM;

  const store = {
    instances: [],
    objects: []
  };

  env.local.store = store;

  let totalLength = 0;
  let totalOffset = 0;
  let currentPart = 0;
  let totalParts = 1;

  let offset = 0;
  let page = 0;
  const windowSize = 50;
  const extendSize = 20;
  let pageSize = 200;
  const threshold = 15;
  
  const viewPort = {};

  let pagination = Math.ceil(rows.length / pageSize);

  viewPort.rebuild = (rows, window = 50) => {    
    store.instances.forEach((el) => el.dispose());
    store.instances = [];
    
    rowsDOM = undefined;
    //offset = offset;
    tbody.replaceChildren();
    
    viewPort.update(rows, window, page)
  };
  
  viewPort.update = (rows, window = 50) => {    
    if (!rowsDOM) {
      rowsDOM = new Array(window).fill(null);
    }

    viewPort.operate(rows, 0, window, page * pageSize, (row, i) => {
      if (rowsDOM[i]) {
        tbody.replaceChild(row, rowsDOM[i]);
      } else {
        tbody.appendChild(row);
      }

      rowsDOM[i] = row;      
    });
    
  }

  viewPort.extend = (rows, number) => {
    offset += number;
    
    viewPort.operate(rows, windowSize + offset - number, windowSize + offset, page * pageSize, (row, i) => {
      tbody.appendChild(row);
      rowsDOM.push(row);      
    });
  }



  viewPort.operate = async (rows, initial, window, offset, effect) => {
    for (let i=initial; i<window && (i+offset)<rows.length; ++i) {
      const row = document.createElement('tr');
      row.classList.add("hover:bg-gray-200");

      if (headerRows) {
        const td = document.createElement('td');
        td.classList.add(...("px-2 py-1 whitespace-nowrap text-sm font-medium text-gray-800".split(' ')));
        td.innerText = headerRows[i+offset];
        row.appendChild(td);
      }

      for (let index=0; index<rows[i+offset].length; ++index) {
        const cell = rows[i+offset][index];
        const td = document.createElement('td');
        td.classList.add(...("px-2 py-1 whitespace-nowrap text-sm text-gray-800".split(' ')));
        //console.warn({pos: i+offset, index, cell});
        await renderCell(i+offset, index, cell, env, td, store, hashFunction);
        row.appendChild(td); 
      }

      effect(row, i)
    }    
  }

  offset = 0;
  rows.forEach((r, i) => { r._origIdx = i; });
  viewPort.rebuild(rows, windowSize);

  container_1.appendChild(container_2);
  container_2.appendChild(container_3);
  container_3.appendChild(table);
  if (thead) table.appendChild(thead);
  table.appendChild(tbody);

  if (pagination > 1 || env?.options?.Parts) {
    const paginator = document.createElement('div');
    paginator.classList.add(...('py-1 border-solid items-center h-6 px-1 mb-1 w-full flex flex-row-reverse gap-x-2'.split(' ')));
    paginator.style.borderTop = "1px solid #999";
    const prevButton = document.createElement('button');
    prevButton.style.transform = "rotate(180deg)";
    prevButton.innerHTML = `<svg class="w-3 h-3 text-gray-500 hover:text-gray-400" viewBox="0 0 24 24" fill="none" >
<path fill-rule="evenodd" clip-rule="evenodd" d="M5.46484 3.92349C4.79896 3.5739 4 4.05683 4 4.80888V19.1911C4 19.9432 4.79896 20.4261 5.46483 20.0765L19.1622 12.8854C19.8758 12.5108 19.8758 11.4892 19.1622 11.1146L5.46484 3.92349ZM2 4.80888C2 2.55271 4.3969 1.10395 6.39451 2.15269L20.0919 9.34382C22.2326 10.4677 22.2325 13.5324 20.0919 14.6562L6.3945 21.8473C4.39689 22.8961 2 21.4473 2 19.1911V4.80888Z" fill="currentColor"/>
</svg>`;

    const toStart = document.createElement('button');
    
    toStart.innerHTML = `<svg class="w-3 h-3 text-gray-500 hover:text-gray-400" viewBox="0 0 24 24" fill="none" >
<path fill-rule="evenodd" clip-rule="evenodd" d="M18.3956 19.7691C19.0541 20.2687 20 19.799 20 18.9724L20 5.02764C20 4.20106 19.0541 3.73137 18.3956 4.23095L9.20476 11.2033C8.67727 11.6035 8.67727 12.3965 9.20476 12.7967L18.3956 19.7691ZM22 18.9724C22 21.4521 19.1624 22.8612 17.1868 21.3625L7.99598 14.3901C6.41353 13.1896 6.41353 10.8104 7.99599 9.60994L17.1868 2.63757C19.1624 1.13885 22 2.5479 22 5.02764L22 18.9724Z" fill="currentColor"/>
<path d="M2 3C2 2.44772 2.44772 2 3 2C3.55228 2 4 2.44772 4 3V21C4 21.5523 3.55228 22 3 22C2.44772 22 2 21.5523 2 21V3Z" fill="currentColor"/>
</svg>`;    

    const toEnd = document.createElement('button');
    toEnd.style.transform = "rotate(180deg)";
    toEnd.innerHTML = toStart.innerHTML;     

    const nextButton = document.createElement('button');
    nextButton.innerHTML = prevButton.innerHTML;   

    const progress = document.createElement('span');
    progress.classList.add('mr-auto');

    totalLength = rows.length;
    totalOffset = 0;

    const updateField = (page) => {
      const current = Math.min((page + 1) * pageSize + totalOffset, totalLength);
      progress.innerText = `${current}/${totalLength}`;
    }

    

    paginator.appendChild(toEnd);
    paginator.appendChild(nextButton);
    paginator.appendChild(prevButton);
    paginator.appendChild(toStart);

    paginator.appendChild(progress);

    if (env.options) if (env.options.Parts) {
      const warning = document.createElement('span');
      warning.innerText = "Data is partially on Kernel";
      paginator.appendChild(warning);
      totalLength = env.options.Total;
      totalParts  = env.options.Parts;

      pageSize = Math.min(pageSize, rows.length);

      env.local.callback = () => {};
      env.local.event = env.options.RequestEvent;

      core[env.options.RequestCallback] = async (args) => {
        //console.error(args);
        console.log('callback from server');
        const t = await interpretate(args[0], {...env, hold:true});
        env.local.callback(t);
      }
    };

    updateField(0);

    let block = false;

    
    toStart.addEventListener('click', ()=>{
      if (block) return;
      page = 0;
      offset = 0;
      viewPort.rebuild(rows, windowSize);
      updateField(page);
      table.scrollTop = 0;
    });

    toEnd.addEventListener('click', ()=>{
      if (block) return;
      page = pagination - 1;
      offset = 0;
      viewPort.rebuild(rows, windowSize);
      updateField(page);
      table.scrollTop = table.scrollHeight - table.clientHeight - 10;
    });

    nextButton.addEventListener('click', ()=>{
      if (block) return;
      if (page === pagination - 1) {

        if (currentPart === totalParts - 1) return;
        currentPart = currentPart + 1;
        totalOffset += rows.length;

        page = 0;
        offset = 0;

        //callback
        env.local.callback = async (data) => {
          //console.error(data);
          rows = await rowsReprocess(data);
          rows.forEach((r, i) => { r._origIdx = i; });
          pagination = Math.ceil(rows.length / pageSize);

          viewPort.rebuild(rows, windowSize);
          updateField(page);
          table.scrollTop = 0;
          block = false;
        };

        //request new page
        block = true;
        //console.log();
        server.kernel.io.fire(env.local.event, currentPart + 1, 'Part');

        return;
      }

      page += 1;
      offset = 0;
      viewPort.rebuild(rows, windowSize);
      updateField(page);
      table.scrollTop = 0;
    });

    prevButton.addEventListener('click', ()=>{
      if (block) return;

      if (page === 0) {
        if (currentPart === 0) return;
        currentPart = currentPart - 1;
        totalOffset -= rows.length;

        page = 0;
        offset = 0;

        //callback
        env.local.callback = async (data) => {
          //console.error(data);
          rows = await rowsReprocess(data);
          rows.forEach((r, i) => { r._origIdx = i; });
          pagination = Math.ceil(rows.length / pageSize);

          viewPort.rebuild(rows, windowSize);
          updateField(page);
          table.scrollTop = 0;
          block = false;
        };

        //request new page
        block = true;
        //console.log();
        server.kernel.io.fire(env.local.event, currentPart + 1, 'Part');

        return;
      }

      page -= 1;
      offset = 0;
      viewPort.rebuild(rows, windowSize);
      updateField(page);
      table.scrollTop = table.scrollHeight - table.clientHeight - 10;
    });    
    
    
    
    container_1.appendChild(paginator);
  }


  table.addEventListener('scroll', () => {
    //console.log([table.scrollTop + table.clientHeight, table.scrollHeight]);
    if (table.scrollTop + table.clientHeight >= table.scrollHeight - 10.0) {
      if (offset + windowSize >= pageSize) return;
      
      let size = extendSize;
      if (size + offset + windowSize >= rows.length) {
        size = rows.length - windowSize - offset;
      }
      console.log('scroll overflow');

      if (size >= 0)
        viewPort.extend(rows, size);
    }
  });

  element.appendChild(container_1);
  env.local.container_1 = container_1;
}

core.Dataset.destroy = (args, env) => {
  env.element.classList.remove(...("sm-controls cursor-default rounded-md 0 py-1 pl-3 bg-gray-50 pr-2 text-left text-gray-500 ring-1 ring-inset ring-gray-400 text-xs".split(' ')));
  env.local.container_1.remove();
  env.local.store.instances.forEach((el) => {
    el.dispose();
  });
  
  env.local.store.objects.forEach((el) => {
    el.doNotCollect = false;
    //el.garbageCollect();
  });
}

core.Dataset.virtual = true

core.Missing = () => undefined

core.TableHeadings = () => "TableHeadings"

const tbView = async (args, env) => {
  //throw args;
  let schema = await interpretate(args[1], env);

  const rowsReprocess = async (d) => {
    let data = d;
    for (let i=0; i<data.length; ++i) {
      data[i] = await interpretate(data[i], {...env, hold:true});
    }
    return data;
  }

  let   rows = await rowsReprocess(await interpretate(args[0], {...env, hold:true}));

  let   heading = await interpretate(args[2], env);
  const requestSymbol = await interpretate(args[3], env);
  const requestEvent  = await interpretate(args[4], env);
  const trueLength  = await interpretate(args[5], env);
  const partsNumber = await interpretate(args[6], env);
  const partSize = rows.length;


  const length = rows.length;
  
  const element = env.element;
  element.classList.add(...("sm-controls cursor-default rounded-md 0 py-1 pl-3 bg-gray-50 pr-2 text-left text-gray-500 ring-1 ring-inset ring-gray-400 text-xs".split(' ')));

  const container_1 = document.createElement('div');
  container_1.classList.add(...("-m-1.5 overflow-x-auto".split(' ')));
  
  const container_2 = document.createElement('div');
  container_2.classList.add(...("p-1.5 inline-block align-middle".split(' ')));  

  const container_3 = document.createElement('div');
  container_3.classList.add("overflow-hidden"); 

  const table = document.createElement('table');
  table.classList.add(...("block max-h-60 overflow-y-scroll sc-b pr-2 divide-y divide-gray-200".split(' ')));  

  table.style.wordBreak = 'normal';
  table.style.wordWrap = 'initial';   
  table.style.resize = 'both';
  table.style.maxWidth = Math.max((window.innerWidth - 200 * window.devicePixelRatio), 300) + 'px';

  let resizeAllowed = false;

  table.addEventListener('mousedown', () => {
    if (resizeAllowed) return;
    resizeAllowed = true;
    table.style.height = table.clientHeight + 'px';
    table.style.maxWidth = '';
    table.classList.remove('max-h-60');
    console.log('class removed');
  })

  let thead;

  thead = document.createElement('thead');
  thead.classList.add(...("sticky top-0 bg-gray-100".split(' ')));
  const tr = document.createElement('tr');
  thead.appendChild(tr);

  {
    const th = document.createElement('th');
    th.classList.add(...("px-2 py-1 text-start text-xs font-medium text-gray-500 uppercase".split(' '))); 
    th.innerText = '/';
    tr.appendChild(th);    
  }

  let sortCol = -1;
  let sortDir = 0; // 0=none, 1=asc, -1=desc
  const thElements = [];

  heading.forEach((c, colIndex) => {
    const th = document.createElement('th');
    th.classList.add(...("px-2 py-1 text-start text-xs font-medium text-gray-500 uppercase cursor-pointer select-none".split(' '))); 
    th.style.userSelect = 'none';
    const label = document.createElement('span');
    label.innerText = c;
    const arrow = document.createElement('span');
    arrow.style.marginLeft = '4px';
    arrow.innerText = '';
    th.appendChild(label);
    th.appendChild(arrow);
    th.addEventListener('click', () => {
      if (sortCol === colIndex) {
        sortDir = sortDir === 1 ? -1 : sortDir === -1 ? 0 : 1;
      } else {
        sortCol = colIndex;
        sortDir = 1;
      }
      thElements.forEach((h, idx) => {
        h.arrow.innerText = idx === sortCol && sortDir !== 0 ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      });
      if (totalParts > 1) {
        env.local.callback = async (data) => {
          rows = await rowsReprocess(data);
          rows.forEach((r, i) => { r._origIdx = i; });
          pagination = Math.ceil(rows.length / pageSize);
          currentPart = 0;
          totalOffset = 0;
          page = 0;
          offset = 0;
          viewPort.rebuild(rows, windowSize);
          table.scrollTop = 0;
        };
        server.kernel.io.fire(env.local.event, [colIndex + 1, sortDir], 'Sort');
        return;
      } else {
        if (sortDir === 0) {
          rows.sort((a, b) => a._origIdx - b._origIdx);
        } else {
          rows.sort((a, b) => sortDir * compareCells(sortCellValue(a[colIndex]), sortCellValue(b[colIndex])));
        }
      }
      page = 0;
      offset = 0;
      viewPort.rebuild(rows, windowSize);
      table.scrollTop = 0;
    });
    thElements.push({th, arrow});
    tr.appendChild(th);
  });



  const tbody = document.createElement('tbody');
  tbody.classList.add(...("max-h-10 divide-y divide-gray-200".split(' ')));

  container_1.appendChild(container_2);
  container_2.appendChild(container_3);
  container_3.appendChild(table);
  table.appendChild(thead);
  table.appendChild(tbody);

  let rowsDOM;

  const store = {
    instances: [],
    objects: []
  };

  env.local.store = store;

  let totalLength = 0;
  let totalOffset = 0;
  let currentPart = 0;
  let totalParts = 1;

  let offset = 0;
  let page = 0;
  const windowSize = 50;
  const extendSize = 20;
  let pageSize = 200;
  const threshold = 15;
  
  const viewPort = {};

  let pagination = Math.ceil(rows.length / pageSize);
  let maxDigits = String(trueLength).length;

  viewPort.rebuild = (rows, window = 50) => {    
    store.instances.forEach((el) => el.dispose());
    store.instances = [];
    
    rowsDOM = undefined;
    //offset = offset;
    tbody.replaceChildren();
    
    viewPort.update(rows, window, page)
  };
  
  viewPort.update = (rows, window = 50) => {    
    if (!rowsDOM) {
      rowsDOM = new Array(window).fill(null);
    }

    viewPort.operate(rows, 0, window, page * pageSize, (row, i) => {
      if (rowsDOM[i]) {
        tbody.replaceChild(row, rowsDOM[i]);
      } else {
        tbody.appendChild(row);
      }

      rowsDOM[i] = row;      
    });
    
  }

  viewPort.extend = (rows, number) => {
    offset += number;
    //maxDigits = String(rows.length+page * pageSize+offset+1).length;
    
    viewPort.operate(rows, windowSize + offset - number, windowSize + offset, page * pageSize, (row, i) => {
      tbody.appendChild(row);
      rowsDOM.push(row);      
    });
  }



  viewPort.operate = async (rows, initial, window, offset, effect) => {
    for (let i=initial; i<window && (i+offset)<rows.length; ++i) {
      const row = document.createElement('tr');
      row.classList.add("hover:bg-gray-200");

      const td = document.createElement('td');
      td.classList.add(...("px-2 py-1 text-start text-xs font-medium text-gray-500".split(' ')));
      td.innerText = String(i+offset+1+(currentPart)*partSize).padStart(maxDigits, "0");
      row.appendChild(td);

      for (let index=0; index<rows[i+offset].length; ++index) {
        const cell = rows[i+offset][index];
        const td = document.createElement('td');
        td.classList.add(...("px-2 py-1 whitespace-nowrap text-sm text-gray-800".split(' ')));
       // console.warn({pos: i+offset, index, cell});
        await renderTabularCell(i+offset, index, cell, env, td, store, schema);
        row.appendChild(td);  
      } 

      effect(row, i)
    }    
  }

  offset = 0;
  rows.forEach((r, i) => { r._origIdx = i; });
  viewPort.rebuild(rows, windowSize);



  if (true) {
    const paginator = document.createElement('div');
    paginator.classList.add(...('py-1 border-solid items-center h-6 px-1 mb-1 w-full flex flex-row-reverse gap-x-2'.split(' ')));
    paginator.style.borderTop = "1px solid #999";
    const prevButton = document.createElement('button');
    prevButton.style.transform = "rotate(180deg)";
    prevButton.innerHTML = `<svg class="w-3 h-3 text-gray-500 hover:text-gray-400" viewBox="0 0 24 24" fill="none" >
<path fill-rule="evenodd" clip-rule="evenodd" d="M5.46484 3.92349C4.79896 3.5739 4 4.05683 4 4.80888V19.1911C4 19.9432 4.79896 20.4261 5.46483 20.0765L19.1622 12.8854C19.8758 12.5108 19.8758 11.4892 19.1622 11.1146L5.46484 3.92349ZM2 4.80888C2 2.55271 4.3969 1.10395 6.39451 2.15269L20.0919 9.34382C22.2326 10.4677 22.2325 13.5324 20.0919 14.6562L6.3945 21.8473C4.39689 22.8961 2 21.4473 2 19.1911V4.80888Z" fill="currentColor"/>
</svg>`;

    const toStart = document.createElement('button');
    
    toStart.innerHTML = `<svg class="w-3 h-3 text-gray-500 hover:text-gray-400" viewBox="0 0 24 24" fill="none" >
<path fill-rule="evenodd" clip-rule="evenodd" d="M18.3956 19.7691C19.0541 20.2687 20 19.799 20 18.9724L20 5.02764C20 4.20106 19.0541 3.73137 18.3956 4.23095L9.20476 11.2033C8.67727 11.6035 8.67727 12.3965 9.20476 12.7967L18.3956 19.7691ZM22 18.9724C22 21.4521 19.1624 22.8612 17.1868 21.3625L7.99598 14.3901C6.41353 13.1896 6.41353 10.8104 7.99599 9.60994L17.1868 2.63757C19.1624 1.13885 22 2.5479 22 5.02764L22 18.9724Z" fill="currentColor"/>
<path d="M2 3C2 2.44772 2.44772 2 3 2C3.55228 2 4 2.44772 4 3V21C4 21.5523 3.55228 22 3 22C2.44772 22 2 21.5523 2 21V3Z" fill="currentColor"/>
</svg>`;    

    const toEnd = document.createElement('button');
    toEnd.style.transform = "rotate(180deg)";
    toEnd.innerHTML = toStart.innerHTML;     

    const nextButton = document.createElement('button');
    nextButton.innerHTML = prevButton.innerHTML;   

    const progress = document.createElement('span');
    progress.classList.add('mr-auto');

    totalLength = rows.length;
    totalOffset = 0;

    if (partsNumber == 1) {
      toEnd.classList.add('hidden');
      toStart.classList.add('hidden');
      nextButton.classList.add('hidden');
      prevButton.classList.add('hidden');
    }

    const updateField = (page) => {
      const current = Math.min((page + 1) * pageSize + totalOffset, totalLength);
      progress.innerText = `${current}/${totalLength}`;
    }

    

    paginator.appendChild(toEnd);
    paginator.appendChild(nextButton);
    paginator.appendChild(prevButton);
    paginator.appendChild(toStart);

    paginator.appendChild(progress);

   
      const warning = document.createElement('span');
      warning.innerText = "Data is on Kernel";
      paginator.appendChild(warning);
      totalLength = trueLength;
      totalParts  = partsNumber;

      pageSize = Math.min(pageSize, rows.length);

      env.local.callback = () => {};
      env.local.event = requestEvent;

      core[requestSymbol] = async (args) => {
        //console.error(args);
        const t = await interpretate(args[0], {...env, hold:true});
        env.local.callback(t);
      }


    updateField(0);

    let block = false;

    
    toStart.addEventListener('click', ()=>{
      if (block) return;
      if (currentPart !== 0) {
        block = true;
        env.local.callback = async (data) => {
          rows = await rowsReprocess(data);
          rows.forEach((r, i) => { r._origIdx = i; });
          pagination = Math.ceil(rows.length / pageSize);
          currentPart = 0;
          totalOffset = 0;
          page = 0;
          offset = 0;
          viewPort.rebuild(rows, windowSize);
          updateField(page);
          table.scrollTop = 0;
          block = false;
        };
        server.kernel.io.fire(env.local.event, 1, 'Part');
        return;
      }
      page = 0;
      offset = 0;
      viewPort.rebuild(rows, windowSize);
      updateField(page);
      table.scrollTop = 0;
    });

    toEnd.addEventListener('click', ()=>{
      if (block) return;
      if (currentPart !== totalParts - 1) {
        block = true;
        env.local.callback = async (data) => {
          rows = await rowsReprocess(data);
          rows.forEach((r, i) => { r._origIdx = i; });
          pagination = Math.ceil(rows.length / pageSize);
          currentPart = totalParts - 1;
          totalOffset = totalLength - rows.length;
          page = pagination - 1;
          offset = 0;
          viewPort.rebuild(rows, windowSize);
          updateField(page);
          table.scrollTop = table.scrollHeight - table.clientHeight - 10;
          block = false;
        };
        server.kernel.io.fire(env.local.event, totalParts, 'Part');
        return;
      }
      page = pagination - 1;
      offset = 0;
      viewPort.rebuild(rows, windowSize);
      updateField(page);
      table.scrollTop = table.scrollHeight - table.clientHeight - 10;
    });

    nextButton.addEventListener('click', ()=>{
      if (block) return;
      if (page === pagination - 1) {

        if (currentPart === totalParts - 1) return;
        currentPart = currentPart + 1;
        totalOffset += rows.length;

        page = 0;
        offset = 0;

        //callback
        env.local.callback = async (data) => {
          //console.error(data);
          rows = await rowsReprocess(data);
          rows.forEach((r, i) => { r._origIdx = i; });
          pagination = Math.ceil(rows.length / pageSize);

          viewPort.rebuild(rows, windowSize);
          updateField(page);
          table.scrollTop = 0;
          block = false;
        };

        //request new page
        block = true;
        //console.log();
        server.kernel.io.fire(env.local.event, currentPart + 1, 'Part');

        return;
      }

      page += 1;
      offset = 0;
      viewPort.rebuild(rows, windowSize);
      updateField(page);
      table.scrollTop = 0;
    });

    prevButton.addEventListener('click', ()=>{
      if (block) return;

      if (page === 0) {
        if (currentPart === 0) return;
        currentPart = currentPart - 1;
        totalOffset -= rows.length;

        page = 0;
        offset = 0;

        //callback
        env.local.callback = async (data) => {
          //console.error(data);
          rows = await rowsReprocess(data);
          rows.forEach((r, i) => { r._origIdx = i; });
          pagination = Math.ceil(rows.length / pageSize);

          viewPort.rebuild(rows, windowSize);
          updateField(page);
          table.scrollTop = 0;
          block = false;
        };

        //request new page
        block = true;
        //console.log();
        server.kernel.io.fire(env.local.event, currentPart + 1, 'Part');

        return;
      }

      page -= 1;
      offset = 0;
      viewPort.rebuild(rows, windowSize);
      updateField(page);
      table.scrollTop = table.scrollHeight - table.clientHeight - 10;
    });    
    
    
    
    container_1.appendChild(paginator);
  }


  table.addEventListener('scroll', () => {
    //console.log([table.scrollTop + table.clientHeight, table.scrollHeight]);
    if (table.scrollTop + table.clientHeight >= table.scrollHeight - 10.0) {
      if (offset + windowSize >= pageSize) return;
      
      let size = extendSize;
      if (size + offset + windowSize >= rows.length) {
        size = rows.length - windowSize - offset;
      }
      console.log('scroll overflow');

      if (size >= 0)
        viewPort.extend(rows, size);
    }
  });

  element.appendChild(container_1);
  env.local.container_1 = container_1;
}

tbView.virtual = true;
tbView.destroy = (args, env) => {
  env.element.classList.remove(...("sm-controls cursor-default rounded-md 0 py-1 pl-3 bg-gray-50 pr-2 text-left text-gray-500 ring-1 ring-inset ring-gray-400 text-xs".split(' ')));
  env.local.container_1.remove();
  env.local.store.instances.forEach((el) => {
    el.dispose();
  });
  
  env.local.store.objects.forEach((el) => {
    el.doNotCollect = false;
    //el.garbageCollect();
  });
}

const tbasicTypes = {};
tbasicTypes['Boolean'] = async (td, data, env, store) => {
  const res = await interpretate(data, env);
  if (res) {
    td.innerText = '✅'; 
  } else {
    td.innerText = '❌';
  }
}
tbasicTypes['String'] = async (td, data, env, store) => {
    td.classList.add('selectable');
    td.style.color = 'var(--editor-key-string)';
    const r = await interpretate(data, env);
    if (typeof r == 'string') td.innerText = await interpretate(data, env);
}
tbasicTypes['Real'] = async (td, data, env, store) => {
    td.classList.add('selectable');
    td.style.color = 'var(--editor-key-literal)';
    const r = await interpretate(data, env);
    if (typeof r == 'number') td.innerText = r.toString();
}
tbasicTypes['NumberExpression'] = tbasicTypes['Real'];
tbasicTypes['Real64'] = tbasicTypes['Real'];
tbasicTypes['Real32'] = tbasicTypes['Real'];
tbasicTypes['Integer64'] = async (td, data, env, store) => {
    td.classList.add('selectable');
    td.style.color = 'var(--editor-key-literal)';
    const r = await interpretate(data, env);
    if (typeof r == 'number') td.innerText = String(r);
}
tbasicTypes['InertExpression'] = async (td, data, env, store) => {
  await atoms.Blank(data, env, td, store, interpretate.hashv2)
}

    

var renderTabularCell = async (row, col, ocell, env, td, store, schema) => {
  const type = schema[col];

  switch (type[0]) {
    case 'Generic':
      await tbasicTypes[type[1]](td, ocell, env, store);
    break;

    /*case 'Entity':
      await atoms['Entity'](ocell, env, td);
    break;*/

    case 'Date':
      await atoms['DateObject'](ocell, env, td);
    break;

    case 'Quantity':
      await atoms['Quantity'](ocell, env, td);
    break;    

    case 'ListVector':
      await atoms['List'](ocell, env, td, store, interpretate.hashv2);
    break;      

    default:
      await atoms.Blank(ocell, env, td, store, interpretate.hashv2)

  } 
} 

core['CoffeeLiqueur`Extensions`InputsOutputs`Private`tbView'] = tbView; 