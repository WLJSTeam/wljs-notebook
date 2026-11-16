const exLoader = async (self) => {
  self["Excalidraw"] = (await import('./main-f1c5696b.js').then(function (n) { return n.m; }));
};

const reactLoader = async (self) => {
  self.React = (await import('./index-ee444178.js').then(function (n) { return n.i; }));
  self.ReactDOM = (await import('./index-90f5c2e9.js').then(function (n) { return n.i; }));
};

new interpretate.shared(
  "Excalidraw",
  exLoader
);  

new interpretate.shared(
  "React",
  reactLoader
); 


let ExcalidrawLib;
let React;
let ReactDOM;

const excalidrawStyleId = 'wljs-excalidraw-overrides';
const excalidrawStyles = `
  .excalidraw {
    --color-selection: var(--system-accent-color);
    --color-primary: var(--system-accent-color);
    --color-primary-darker: var(--system-accent-color);
    --color-primary-darkest: var(--system-accent-color);
    --color-primary-light: var(--system-accent-color-25);
    --color-primary-light-darker: var(--system-accent-color-25);
    --color-brand-hover: var(--system-accent-color);
    --color-brand-active: var(--system-accent-color);
    --color-on-primary-container: var(--system-accent-color);
    --color-surface-primary-container: var(--system-accent-color-25);
    --color-logo-icon: var(--system-accent-color);
    --color-logo-text: var(--system-accent-color);
    --color-promo: var(--system-accent-color);
    accent-color: var(--system-accent-color);
  }

  .excalidraw .sidebar-trigger {
    display: none !important;
  }

  .excalidraw-textEditorContainer::selection {
    color: var(--system-accent-color);
  }

  .excalidraw-textEditorContainer {
    caret-color: black;
  }
`;

const ensureExcalidrawStyles = () => {
  let style = document.getElementById(excalidrawStyleId);

  if (!style) {
    style = document.createElement('style');
    style.id = excalidrawStyleId;
    style.type = 'text/css';
    document.head.appendChild(style);
  }

  if (style.textContent !== excalidrawStyles) {
    style.textContent = excalidrawStyles;
  }

  // Keep the overrides after Excalidraw's runtime-injected stylesheet.
  if (style.parentNode !== document.head || style !== document.head.lastElementChild) {
    document.head.appendChild(style);
  }
};

const codemirror = window.SupportedCells['codemirror'].context; 

function throttle(func, ms) {

  let isThrottled = false,
    savedArgs,
    savedThis;

  function wrapper() {

    if (isThrottled) { // (2)
      savedArgs = arguments;
      savedThis = this;
      return;
    }

    func.apply(this, arguments); // (1)

    isThrottled = true;

    setTimeout(function() {
      isThrottled = false; // (3)
      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs);
        savedArgs = savedThis = null;
      }
    }, ms);
  }

  return wrapper;
}


class ImgRep {
  env = { global: {} }
  frame = {}
  unref = false
  notebook = false
  data;
  id;

  constructor(id, notebook) {
    console.log('create image');
    this.id = id;
    this.notebook = notebook;
    return this;
  }

  async upload(payload) {
    console.log('upload image');
    const key = this.id + '-edraw';
    await server.io.fetch('CoffeeLiqueur`Extensions`Excalidraw`Private`upload', [key, JSON.stringify(payload), this.notebook]);     
  }

  async get() {
    if (this.data) return;
    console.log('get image');
    const key = this.id + '-edraw';
    const data = await server.io.fetch('CoffeeLiqueur`Extensions`Excalidraw`Private`get', [key, this.notebook]);
    this.data = JSON.parse(await interpretate(data, {}));
  }

  async dispose(removeFromServer = false) {
    console.log('disposing...');
    const key = this.id + '-edraw';
    this.data = undefined;
    if (removeFromServer) await server.io.fetch('CoffeeLiqueur`Extensions`Excalidraw`Private`dispose', [key, this.notebook]); 
  }

  static async dispatch(globalStore, files, notebook = false) {
    console.log(files);
    for (const v of Object.values(globalStore)) {
      v.unref = true;
    }

    for (const k of Object.keys(files)) {
      if (globalStore[k]) {
        globalStore[k].unref = false;
      } else { try {
          const img = new ImgRep(k, notebook);
          await img.upload(files[k]);
          globalStore[k] = img;
        } catch(err) {
          console.error(err);
        }
      }
    }
    
    for (const k of Object.keys(globalStore)) {
      const o = globalStore[k];
      if (o.unref) {
        o.dispose(true);
        delete globalStore[k];
      }
    }
  }

  static fetchAll = async (store, scene, notebook = false) => {
    const objects = {};
    for (const el of scene) {
      if (el.type != 'image') continue;
      const id = el.fileId;
    
      if (!store[id]) {
        try {
          const img = new ImgRep(id, notebook);
          await img.get();
          objects[id] = img.data;
          store[id] = img;
        } catch(err) {
          console.error(err);
        }
      } else {
        objects[id] = store[id].data;
      }
    }    

    return objects;
  }
}

const base64 = {
    decode: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
    encode: b => btoa(String.fromCharCode(...new Uint8Array(b))),
    decodeToString: s => new TextDecoder().decode(base64.decode(s)),
    encodeString: s => base64.encode(new TextEncoder().encode(s)),
};

const ExcalidrawWindow = (scene, cchange, files) => () => {
  React.useState("");
  const [excalidrawAPI, setExcalidrawAPI] = React.useState(null);

  const UIOptions = {
    canvasActions: {
      loadScene: true,
      saveToActiveFile: true,
      help: false,
      toggleTheme: false,
      changeViewBackgroundColor: false
    },
    saveToActiveFile: true,
    toggleTheme:false
  };

  return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        "div",
        {
          style: { height: "60vh", minHeight: "400px"},
        },
        React.createElement(ExcalidrawLib.Excalidraw, {UIOptions:UIOptions, initialData: {elements: scene, files:files, appState: {viewBackgroundColor: 'transparent', zenModeEnabled: true}}, onChange: cchange, excalidrawAPI : (api) => setExcalidrawAPI(api)}),
      ),
    );
};

const matcher = new codemirror.MatchDecorator({
  regexp: /!!\[[^\]^\[]*\]/g,
  maxLength: Infinity,
  decoration: (match, view) => {
   
    return codemirror.Decoration.replace({
      widget: new ExcalidrawWidget(match[0], view)
    })
  }
});

const excalidrawHolder = codemirror.ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.excalidrawHolder = matcher.createDeco(view);
    }
    update(update) {
      this.excalidrawHolder = matcher.updateDeco(update, this.excalidrawHolder);
    }
  },
  {
    decorations: instance => instance.excalidrawHolder,
    provide: plugin => codemirror.EditorView.atomicRanges.of(view => {
      return view.plugin(plugin)?.excalidrawHolder || codemirror.Decoration.none
    })
  }
);  

window.SupportedLanguages.filter((el) => (el.name == codemirror.markdownLanguage.name)).forEach((c) => {
  c.plugins.push(excalidrawHolder);
});

class ExcalidrawWidget extends codemirror.WidgetType {
  constructor(match, view) {
    //console.log('created');
    super();
    this.match = match;
    this.view = view;
  }

  eq(other) {
    return false;
  }

  updateDOM(dom) {
    dom.ExcalidrawWidget = this;
    return true;
  }

  updateContent(data, dom) {
    if (!dom || dom.ExcalidrawWidget !== this) return false;

    let from;
    try {
      // MatchDecorator may move this widget without recreating it.
      from = this.view.posAtDOM(dom);
    } catch (error) {
      console.warn('Excalidraw widget is no longer attached to the editor', error);
      return false;
    }

    const to = from + this.match.length;
    const current = this.view.state.doc.sliceString(from, to);
    if (current !== this.match) {
      console.error('Refusing to overwrite a stale Excalidraw range');
      return false;
    }

    const newData = '!![1:'+base64.encodeString(data)+']';
    if (newData === current) return true;

    this.view.dispatch({changes: {from, to, insert: newData}});
    return true;
  }

  toDOM(view) {
    const match = this.match;

    let elt = document.createElement("div");
    elt.ExcalidrawWidget = this;
    const origin = view.state.facet(codemirror.originFacet)[0].origin;

    if (!origin.excalidrawImages) origin.excalidrawImages = {};
    const globalStore = origin.excalidrawImages;

    const notebook = origin?.notebook;


    elt.excalidrawImages = globalStore;

    const mount = async (element, data) => { 
      if (!ExcalidrawLib) {
        if (!window.interpretate.shared.Excalidraw) {
          element.innerHTML = `<span style="color:red">No shared library ExcalidrawLib found</span>`;
          return;
        }
        await window.interpretate.shared.Excalidraw.load();
        ExcalidrawLib = window.interpretate.shared.Excalidraw.Excalidraw.default;
      }

      ensureExcalidrawStyles();

      if (!React) {
        if (!window.interpretate.shared.React) {
          element.innerHTML = `<span style="color:red">No shared library React found</span>`;
          return;
        }
        await window.interpretate.shared.React.load();
        React = window.interpretate.shared.React.React.default;
        ReactDOM = window.interpretate.shared.React.ReactDOM.default;
        
      }
    
      const excalidrawWrapper = element;
      const root = ReactDOM.createRoot(excalidrawWrapper);
      element.reactRoot = root;
      console.log('React Render!');

      const dom = element;

      let previous = '';
      const change = (elements, appState, files) => {
        
        ImgRep.dispatch(globalStore, files, notebook);

        if (!dom.ExcalidrawWidget) return;
        const string = JSON.stringify(elements);
        if (string != previous) {
          if (dom.ExcalidrawWidget.updateContent(string, dom)) {
            previous = string;
            console.log('save');
          }
        }
      };
    
      const cchange = throttle(change, 700);
      
      let scene;
      
      try {
        if (data.charAt(3) == '1' && data.charAt(4) == ':') {
          scene = JSON.parse(base64.decodeToString(data.slice(5,-1)));
        } else {
          console.warn('legacy');
          scene = JSON.parse(data.slice(2));
        }
        
      } catch(e) {
        console.error(e);
        dom.innerHTML = `<span style="color:red; padding: 0.5rem;">Error while parsing expression</span>`;
        return;
      }
    
      console.log('Mount!');
    
      dom.addEventListener('keypress', (ev) => {
    
          if (ev.shiftKey && ev.key == "Enter") {
            console.log(ev);
            //if (debounce) return;
            const origin = view.state.facet(codemirror.originFacet)[0].origin;
            console.log('EVAL');
            origin.eval(view.state.doc.toString());
            debounce = true;
    
          }
      });

      ImgRep.fetchAll(globalStore, scene, notebook).then((files) => {
        root.render(React.createElement(ExcalidrawWindow(scene, cchange, files)));
      });

    };


    let mounted = false;
    if (!origin.props["Hidden"]) {
      mount(elt, match);
      mounted = true;
  
    }
  
    origin.addEventListener('property', (ev) => {
      if (ev.key != 'Hidden') return;
      if (ev.value) {
        if (mounted) {
          elt.reactRoot.unmount();
          console.warn('Unmount react');
          mounted = false;
        }
      } else {
        if (!mounted) {
          mount(elt, elt.ExcalidrawWidget.match);
          mounted = true;
        }
      }
    });   

    return elt;
  }
  ignoreEvent(ev) {
    return true;
  }

  destroy(dom) {
    console.log('Excalidraw widget was destroyed');
    dom.ExcalidrawWidget = undefined;
    if (!dom.reactRoot) return;
    dom.reactRoot.unmount();
  }
}  



var generateSVG = async (data) => {
  if (!ExcalidrawLib) {
    await window.interpretate.shared.Excalidraw.load();
    ExcalidrawLib = window.interpretate.shared.Excalidraw.Excalidraw.default;  
    //ExcalidrawLib = (await import('@excalidraw/excalidraw')).default;
  }

  let decoded;
  try {
    if (data.charAt(1) == '1' && data.charAt(2) == ':') {
      decoded = JSON.parse(base64.decodeToString(data.slice(3,-1)));
    } else {
      console.warn('legacy');
      decoded = JSON.parse(data);
    }    
    

  } catch (e) {

    return `<span style="color:red">${e}</span>`;
  }

  let store = {};
  const imgs = await ImgRep.fetchAll(store, decoded);

  const svg = await ExcalidrawLib.exportToSvg({
    elements: decoded,
    appState: {exportBackground: false},
    exportWithDarkMode: false,
    files: imgs
  });

  for (const o of Object.values(store)) {
    o.dispose(false);
  }

  store = null;

  svg.removeAttribute('width');
  svg.removeAttribute('height');
  const stringed = svg.outerHTML;
  svg.remove();

  return stringed;
};

core['Internal`Kernel`EXJSEvaluator'] = async (args, env) => {
  let data = await interpretate(args[0], env);

  if (!Array.isArray(data)) {
    data = [data];
  }  

  const result = [];
  for (const a of data) {
    const r = await generateSVG(a);
    result.push(r);
  }
  
  return result;
};
