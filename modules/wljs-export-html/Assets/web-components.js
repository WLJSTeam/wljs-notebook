/* Polyfill for React based websites. It replaces server object and redirect all output to buffers */
/* add it to the head tag using any CDN */

//setting up global virtual server
const server = {};
window.server = server;

let promises;
let symbols;
let preloadedSymbols;
let eventsPool;
let resolveReady;
let readyPromise = Promise.resolve({ok: true});

server.beginLoad = () => {
  readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });
  return readyPromise;
}

server.whenReady = () => readyPromise;

server.finishLoad = (error = null) => {
  resolveReady?.({ok: !error, error});
  resolveReady = null;
}

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

server.loadObjects = async (result) => {
    const loadObjects = interpretate(result.objects, {hold:true}).then((i) => {
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

    const loadSymbols = interpretate(result.symbols, {hold:true}).then((i) => {
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
            if (args) if (args.length > 0) {
              const key = await interpretate(args[0], env);
              return data[key];
            }
        
            return data;
          }
        
          core[oName].update = async (args, env) => {
            //evaluate in the context
            //console.log('IE: update was called...');
            let aQ = false;

            if (args) aQ = args.length > 0;
        
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

    await Promise.all([loadObjects, loadSymbols]);
    return true;
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

    const requestObject = (uid) => {
      const p = new Deferred();
      promises ??= {};

      if (Array.isArray(promises[uid])) {
        promises[uid].push(p);
      } else {
        promises[uid] = [p];
      }

      return p.promise;
    }

    server.io = {
      fetch(command, args = []) {
        if (command !== 'CoffeeLiqueur`Extensions`FrontendObject`Internal`GetObject') {
          return Promise.reject(new Error(`Unsupported static server request: ${command}`));
        }

        return requestObject(String(args[0]));
      }
    };

    server.ask = (what) => {
        if (what.length < 42) {
          console.error('Unknown command');
          console.error(what);
          return false;
        }
        //throw what;
        const offset = 'CoffeeLiqueur`Extensions`FrontendObject`Internal`GetObject["'.length;
        return requestObject(what.slice(offset,-2));
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

const cx = (...xs) => xs.filter(Boolean).join(" ");

const DefaultClasses = {
  downloadButton: {
    a: "p-2 text-xs w-full flex text-gray-600 my-2",
  },
  codeBlock: {
    wrapper: "bg-gray-15 mx-2",
    pre: undefined,
    code: {
      Input: "block input-cell-border",
      Output: "block",
    },
    placeholder: "opacity-0",
  },
};



function svgIconMarkup() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5 ml-auto">
      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
        d="M17 17h.01m.39-3h.6c.932 0 1.398 0 1.765.152a2 2 0 0 1 1.083 1.083C21 15.602 21 16.068 21 17s0 1.398-.152 1.765a2 2 0 0 1-1.083 1.083C19.398 20 18.932 20 18 20H6c-.932 0-1.398 0-1.765-.152a2 2 0 0 1-1.083-1.083C3 18.398 3 17.932 3 17s0-1.398.152-1.765a2 2 0 0 1 1.083-1.083C4.602 14 5.068 14 6 14h.6m5.4 1V4m0 11-3-3m3 3 3-3"/>
    </svg>
  `;
}

/**
 * <wljs-store json="..." kernel="..." notebook="..."></wljs-store>
 */
// wljs-store.js

class WLJSStore extends HTMLElement {
  connectedCallback() {
    this._run();
  }
  disconnectedCallback() {
    console.warn('Store was disconnected');
  }

  async _run() {
    // 1) ensure WLJS libs exist first

    // 2) now safe to do original store logic
    const virtualServer = window.server;
    if (!virtualServer) return;

    virtualServer.beginLoad?.();
    virtualServer.resetIO?.();

    let loadError = null;

    try {
      const jsonUrl = this.getAttribute("json");
      const kernelUrl = this.getAttribute("kernel");

      if (jsonUrl) {
        const res = await fetch(jsonUrl);
        if (!res.ok) throw new Error(`Failed to load WLJS store: ${res.status} ${res.statusText}`);
        const objects = await res.json();
        await virtualServer.loadObjects?.(objects);
      }

      if (kernelUrl) {
        const kres = await fetch(kernelUrl);
        if (!kres.ok) throw new Error(`Failed to load WLJS kernel: ${kres.status} ${kres.statusText}`);
        const kernelMesh = await kres.json();
        await virtualServer.loadKernel?.(kernelMesh);
      }

      virtualServer.flushEvents?.();
      this.dispatchEvent(new CustomEvent('loaded', {
		      bubbles: true,
		      cancelable: true
      }));
    } catch (error) {
      loadError = error;
      console.error('[WLJSStore] load error:', error);
      this.dispatchEvent(new CustomEvent('loaderror', {
        bubbles: true,
        detail: error
      }));
    } finally {
      virtualServer.finishLoad?.(loadError);
    }
  }
}

if (!customElements.get("wljs-store")) customElements.define("wljs-store", WLJSStore);


/**
 * <wljs-html>ENCODED_HTML</wljs-html>
 * or <wljs-html value="ENCODED_HTML"></wljs-html>
 */
class WLJSHTML extends HTMLElement {
  static get observedAttributes() {
    return ["value", "encoded"];
  }

  async connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  _getSourceText() {
    if (this.hasAttribute("encoded")) return decodeURIComponent(this.innerHTML.trim() ?? ""); 
    const script = this.querySelector('script[type="text/plain"]');
    if (script) return script.textContent.trim() ?? "";
    return this.textContent.trim() ?? "";
    }  

  _render() {
    //throw this._getSourceText();
    this.innerHTML = this._getSourceText();
  }
}
if (!customElements.get("wljs-html")) customElements.define("wljs-html", WLJSHTML);

/**
 * <wljs-editor type="Input|Output" display="..." fade></wljs-editor>
 * Content is the encoded cell source.
 *
 * Attributes:
 * - display: used to pick window.SupportedCells[display]
 * - type: "Input" or "Output" (for class selection)
 * - fade: presence enables fade behavior (like opts.Fade)
 * - print: if display === "print" (same behavior)
 */

function decodeMaybe(v) {
  if (v == null) return "";
  const s = String(v);
  try { return decodeURIComponent(s).trim(); } catch { return s; }
}



class WLJSEditor extends HTMLElement {
  static get observedAttributes() {
    return ["display", "type", "fade", "encoded", "editable", "lazy"];
  }

  async connectedCallback() {

    this._mounted = true;
    this._instance = null;

    if (this.hasAttribute("lazy")) {
      this._setupLazyLoading();
    } else {
      requestAnimationFrame(() => this._mount());
    }
  }

  disconnectedCallback() {
    this._mounted = false;
    this._teardown();
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  _setupLazyLoading() {
    this._observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this._instance) {
            this._mount();
            // Once mounted, we can disconnect the observer
            if (this._observer) {
              this._observer.disconnect();
              this._observer = null;
            }
          }
        });
      },
      {
        rootMargin: "500px", // Start loading slightly before element is visible
        threshold: 0.01
      }
    );

    this._observer.observe(this);
  }

  _getSourceText() {
    if (this.hasAttribute("encoded")) return decodeURIComponent(this.textContent.trim() ?? ""); 
    const script = this.querySelector('script[type="text/plain"]');
    if (script) return script.textContent.trim() ?? "";
    return this.textContent.trim() ?? "";
    }

  async _mount() {
    if (!this._mounted) return;

    const ready = await window.server?.whenReady?.();
    if (!this._mounted || ready?.ok === false) return;

    const display = this.getAttribute("display");
    if (display === "print") return;

    const SupportedCells = window.SupportedCells;
    if (!SupportedCells || !SupportedCells[display] || !SupportedCells[display].view) {
      // If no renderer, keep raw text as-is.
      return;
    }

    const decoded = this._getSourceText();

    this.replaceChildren();
    this.classList.add('wljs-mounted');
    const host = this;

    const editable = this.getAttribute("editable");

    const event = new CustomEvent('ready', {
	    bubbles: true,
	    cancelable: true
    });
    this.dispatchEvent(event);

    // Instantiate the view
    try {
      const ViewCtor = SupportedCells[display].view;
      this._instance = new ViewCtor({ updateSelection: () => {}, save: () => {}, element: host, noneditable: (!editable) }, decoded);
      if (display == 'codemirror') {
        const inst = this._instance?.editor;
        const event = new CustomEvent('codemirrorReady', {
	        bubbles: true,
	        cancelable: true,
          detail: inst
        }); 
        this.dispatchEvent(event);       
      }
    } catch (e) {
      console.error("[WLJSEditor] mount error:", e);
      return;
    }

    // Optional fade behavior: toggles a class on <pre>
    if (this._instance?.editor && this.hasAttribute("fade")) {
      this.classList.add("h-fade-20");
      const self = this;

      this._onFocusIn = () => self.classList.remove("h-fade-20");
      this._onFocusOut = () => self.classList.add("h-fade-20");

      this.addEventListener("focusin", this._onFocusIn);
      this.addEventListener("focusout", this._onFocusOut);
    }
  }

  _teardown() {
    if (this._onFocusIn) this.removeEventListener("focusin", this._onFocusIn);
    if (this._onFocusOut) this.removeEventListener("focusout", this._onFocusOut);
    this._onFocusIn = null;
    this._onFocusOut = null;

    try { this._instance?.dispose?.(); } catch (e) { console.error(e); }
    this._instance = null;
    const event = new CustomEvent('destoyed', {
	    bubbles: true,
	    cancelable: true
    });
    this.dispatchEvent(event);
  }
}

if (!customElements.get("wljs-editor")) customElements.define("wljs-editor", WLJSEditor);

/**
 * <wljs-assets>ENCODED_HTML_WITH_STYLE_AND_SCRIPT</wljs-assets>
 *
 * Behavior:
 * - appends <style> contents as real <style> elements (tagged for cleanup)
 * - executes each <script> body in order via AsyncFunction, providing:
 *   api.registerCleanup(fn), api.element, api.exports, api.index
 * - calls all registered cleanup functions + removes appended styles on disconnect/update
 */
class WLJSAssets extends HTMLElement {
  static get observedAttributes() {
    return ["value", "encoded"];
  }

  async connectedCallback() {
    this._mounted = true;
    this._disposers = [];
    this._renderAndRun();
  }

  disconnectedCallback() {
    this._mounted = false;
    this._cleanup();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._renderAndRun();
  }

  _cleanup() {
    // run disposers LIFO
    for (let i = this._disposers.length - 1; i >= 0; i--) {
      try {
        this._disposers[i]();
      } catch (e) {
        console.error(e);
      }
    }
    this._disposers = [];

    // remove appended styles
    this.querySelectorAll('[data-wljs-style="1"]').forEach((n) => n.remove());
  }

  _getSourceText() {
    if (this.hasAttribute("encoded")) return decodeURIComponent(this.textContent.trim() ?? ""); 
    const script = this.querySelector('script[type="text/plain"]');
    if (script) return script.textContent.trim() ?? "";
    return this.textContent.trim() ?? "";
    } 

  _renderAndRun() {
    this._cleanup();

    //const encoded = this.getAttribute("value") ?? this.textContent ?? "";
    const decoded = this._getSourceText();
    if (!decoded) return;

    const tpl = document.createElement("template");
    tpl.innerHTML = decoded;

    // 1) append styles
    tpl.content.querySelectorAll("style").forEach((styleNode) => {
      const el = document.createElement("style");
      el.dataset.wljsStyle = "1";
      el.textContent = styleNode.textContent || "";
      this.appendChild(el);
    });

    // 2) run scripts in order
    const scripts = Array.from(tpl.content.querySelectorAll("script"));
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

    const runOne = (code, index) => {
      const localDisposers = [];
      const registerCleanup = (fn) => {
        if (typeof fn === "function") {
          localDisposers.push(fn);
          this._disposers.push(fn);
        }
      };

      const api = Object.freeze({
        registerCleanup,
        element: this,
        exports: Object.create(null),
        index,
      });

      const body = `
        try {
          ${code}
        } catch (e) {
          console.error("[WLJSAssets] script #${index} error:", e);
        }
      `;

      try {
        const fn = new AsyncFunction("api", "el", body);
        fn(api, this);
      } catch (e) {
        console.error("[WLJSAssets] build/run error for script #"+index+":", e);
      }
    };

    scripts.forEach((s, i) => {
      const code = s.textContent || "";
      if (code.trim()) runOne(code, i);
    });
  }
}
if (!customElements.get("wljs-assets")) customElements.define("wljs-assets", WLJSAssets);

// --- helpers ---
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
