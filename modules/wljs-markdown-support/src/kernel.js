
let Marked;
let Renderer;

async function runModuleSnippetsInOrder(snippets, afterAll) {
  for (const code of snippets) {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    try {
      await import(url);               // waits for full evaluation
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (afterAll) afterAll();
}

await window.interpretate.shared.Marked.load();
Marked = window.interpretate.shared.Marked.default;
Renderer = window.interpretate.shared.Marked.Renderer;

const renderer = new Renderer();
const linkRenderer = renderer.link;
renderer.link = (href, title, text) => {
  const localLink = href.startsWith(`${location.protocol}//${location.hostname}`);
  const html = linkRenderer.call(renderer, href, title, text);
  return localLink ? html : html.replace(/^<a /, `<a target="_blank" rel="noreferrer noopener nofollow" `);
};

/*const renderer = new Marked.Renderer();
const linkRenderer = renderer.link;
renderer.link = (href, title, text) => {
  const localLink = href.startsWith(`${location.protocol}//${location.hostname}`);
  const html = linkRenderer.call(renderer, href, title, text);
  return localLink ? html : html.replace(/^<a /, `<a target="_blank" rel="noreferrer noopener nofollow" `);
};*/

let katex;

const codemirror = window.SupportedCells['codemirror'].context; 


await window.interpretate.shared.katex.load();
katex = window.interpretate.shared.katex.default;

const splitStringIntoChunks0 = (str, chunkSize) => {
  if (!str || chunkSize <= 0) return [];
  
  const chunks = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, Math.min(i + chunkSize, str.length)));
  }
  return chunks;
}

const pasteFile = {
  transaction: (ev, view, id, length) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      const channel = view.dom.ocellref.origin.channel;
      server._emitt(channel, `<|"Channel"->"${id}", "Length"->${length}, "CellType"->"md"|>`, 'Forwarded["CM:PasteEvent"]');
    }
  },

  file: (ev, view, id, name, result) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      if (result.length > 5 * 1024 * 1024) {
        const chunks = splitStringIntoChunks0(result, 5 * 1024 * 1024);
        chunks.forEach((chunk, index) => {
          server.emitt(id, `<|"Data"->"${chunk}", "Name"->"${name}", "Chunk"->${index+1}, "Chunks"->${chunks.length}|>`, 'Chunk');
        });
      } else {
        server.emitt(id, `<|"Data"->"${result}", "Name"->"${name}"|>`, 'File');
      }
    }
  }
}

const pasteDrop = {
  transaction: (ev, view, id, length) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      const channel = view.dom.ocellref.origin.channel;
      server._emitt(channel, `<|"Channel"->"${id}", "Length"->${length}, "CellType"->"md"|>`, 'Forwarded["CM:DropEvent"]');
    }
  },

  file: (ev, view, id, name, result) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      if (result.length > 5 * 1024 * 1024) {
        const chunks = splitStringIntoChunks0(result, 5 * 1024 * 1024);
        chunks.forEach((chunk, index) => {
          server.emitt(id, `<|"Data"->"${chunk}", "Name"->"${name}", "Chunk"->${index+1}, "Chunks"->${chunks.length}|>`, 'Chunk');
        });
      } else {
        server.emitt(id, `<|"Data"->"${result}", "Name"->"${name}"|>`, 'File');
      }
    }
  }
}

function inlineKatex(options) {
  return {
    name: 'inlineKatex',
    level: 'inline',
    start(src) { return src.indexOf('$'); },
    tokenizer(src, tokens) {
      const match = src.match(/^\$+([^$\n]+?)\$+/);
      if (match) {
        return {
          type: 'inlineKatex',
          raw: match[0],
          text: match[1].trim()
        };
      }
    },
    renderer(token) {
      console.warn('inlineKatex');
      return katex.renderToString(token.text.replaceAll('\\\\', '\\'), options);
    }
  };
}

function mark(options) {
  return {
    name: 'mark',
    level: 'inline',
    start(src) { return src.indexOf('=='); },
    tokenizer(src, tokens) {
      const match = src.match(/^==+([^=\n]+?)==+/);
      if (match) {
        return {
          type: 'mark',
          raw: match[0],
          text: match[1].trim()
        };
      }
    },
    renderer(token) {
      console.warn('mark');
      return '<mark>'+token.text+'</mark>';
    }
  };
}

function bookmark(parent) {
  return {
    name: 'bookmark',
    level: 'inline',
    start(src) { return src.indexOf('@bookmark'); },
    tokenizer(src, tokens) {
      const match = src.match(/^@bookmark/);
      if (match) {
        parent.bookmark();

        return {
          type: 'bookmark',
          raw: match[0]
        };
      }
    },
    renderer(token) {
      console.warn('bookmark');
      return `<div style="color: rgb(200 0 0)">
   <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 6.2C5 5.07989 5 4.51984 5.21799 4.09202C5.40973 3.71569 5.71569 3.40973 6.09202 3.21799C6.51984 3 7.07989 3 8.2 3H15.8C16.9201 3 17.4802 3 17.908 3.21799C18.2843 3.40973 18.5903 3.71569 18.782 4.09202C19 4.51984 19 5.07989 19 6.2V21L12 16L5 21V6.2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>
</svg>   
      </div>`;
    }
  };
}

const feReg = new RegExp(/FrontEndExecutable\[([^\[|\]]+)\]/g);

function feObjects(options, string) {
  const feReplacer = (match, index) => {
    const uid = match.slice(19,-1);
    const obj = {uid: uid, elementId: 'femarkdown-'+uuidv4()};
    options.buffer.push(obj);
    return `<div class="markdown-feobject" id="${obj.elementId}"></div>`;
  }

  return string.replace(feReg, feReplacer);
}

function blockKatex(options) {
  return {
    name: 'blockKatex',
    level: 'block',
    start(src) { return src.indexOf('\n$$'); },
    tokenizer(src, tokens) {
      const match = src.match(/^\$\$\n([^$]+?)\n\$\$/);
      if (match) {
        return {
          type: 'blockKatex',
          raw: match[0],
          text: match[1].trim()
        };
      }
    },
    renderer(token) {
      
      console.warn('blockKatex');
      return `<p style="padding-top: 1em; padding-bottom: 1em;">${katex.renderToString(token.text.replaceAll('\\\\', '\\'), {displayMode: true})}</p>`;
    }
  };
}


const admonitionExtension = (parent) => {return {
  name: 'admonition',
  level: 'block', // Define it as a block-level token
  start(src) {
    // Locate the position where `:::` starts
    return src.indexOf(/:::/);
  },
  tokenizer(src, tokens) {
    const rule = /^:::(\w+)\n([\s\S]*?)\n:::/; 
    const match = rule.exec(src);

    //console.warn(match);

    if (match) {
      const innerTokens = [];
      this.lexer.blockTokens(match[2].trim(), innerTokens);

      if (match[1] === 'todo') {
        const count = (match[2].match(/^-\s\[\s\]\s/gm) || []).length;
        parent.todo(count);
         
      }

      return {
        type: 'admonition',
        raw: match[0], // Full matched string
        kind: match[1], // Extract admonition type (e.g., warning)
        inner: innerTokens, // Extract inner content
      };
    }
  },
  renderer(token) {
    const inner = this.parser.parse(token.inner);

    return `<div class="text-sm admonition ${token.kind}">
              <strong>${token.kind.toUpperCase()}</strong>
              <p>${inner}</p>
            </div>`;
  }
}};


const TexOptions = {
  throwOnError: false
};


//marked.use({extensions: [inlineKatex(TexOptions), blockKatex(TexOptions), feObjects()], renderer});

function fixArrowBug(text) {
  if (text.charAt(0) == '>') {
    return text.slice(1);
  }
  return text;
}

function unicodeToChar(text) {
  return text.replace(/\\:[\da-f]{4}/gi, 
         function (match) {
              return String.fromCharCode(parseInt(match.replace(/\\:/g, ''), 16));
         });
}


let todoCount = -1;
let todoDOM = {};
let iconsParentElement = undefined;

const checkIconsContainer = () => {
  if (iconsParentElement) return;

  if (!iconsParentElement) {
    iconsParentElement = document.getElementsByTagName('main');
    if (!iconsParentElement) {
      iconsParentElement = document.body;
    } else {
      iconsParentElement = iconsParentElement[0];
    }
  }

  const c = document.createElement('div');
  c.classList.add('gap-x-1');
  c.style = "margin-top: 0.5rem;right: 1.5rem;position: fixed;display: flex;flex-direction: row;";

  iconsParentElement.appendChild(c);
  iconsParentElement = c;
}

const updateTodo = () => {
  if (!todoDOM.button) {
    if (_todoList.length == 0) return;

    console.warn('Initialization of automatic TODO list');
    const el = `
<button class="p-0.5 bg-gray-50 text-gray-500 rounded flex items-center flex-row gap-x-1" id="todolist_marked" style="color: rgb(230, 167, 0);">
<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="m20.215 2.387-8.258 10.547-2.704-3.092a1 1 0 1 0-1.506 1.316l3.103 3.548a1.5 1.5 0 0 0 2.31-.063L21.79 3.62a1 1 0 1 0-1.575-1.233zM20 11a1 1 0 0 0-1 1v6.077c0 .459-.021.57-.082.684a.364.364 0 0 1-.157.157c-.113.06-.225.082-.684.082H5.923c-.459 0-.57-.022-.684-.082a.363.363 0 0 1-.157-.157c-.06-.113-.082-.225-.082-.684V5.5a.5.5 0 0 1 .5-.5l8.5.004a1 1 0 1 0 0-2L5.5 3A2.5 2.5 0 0 0 3 5.5v12.577c0 .76.082 1.185.319 1.627.224.419.558.753.977.977.442.237.866.319 1.627.319h12.154c.76 0 1.185-.082 1.627-.319.42-.224.754-.558.978-.977.236-.442.318-.866.318-1.627V12a1 1 0 0 0-1-1z" fill="currentColor"></path></svg> <span id="todolist_counter" class="text-sm">3</span>
  </button>   
    `;

    checkIconsContainer();
    iconsParentElement.insertAdjacentHTML("beforeend", el);

    todoDOM.button = document.getElementById("todolist_marked");
    todoDOM.counter = document.getElementById("todolist_counter");
    todoDOM.button.addEventListener('click', () => {
      todoDOM.element.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
    });
  }

  const newValue = _todoList.reduce((acc, el) => (acc + el.count), 0);
  
  if (newValue == todoCount) return;

  if (newValue == 0) {
    todoDOM.button.remove();
    todoDOM.button = undefined;
    return;
  }

  todoDOM.element = _todoList[0].ref.element;


  todoCount = newValue;
  todoDOM.counter.innerText = newValue;
}

const _todoList = [];
const todoList = {
  push: (element) => {
    if (!element) return;

    _todoList.push(element);
    updateTodo();
  },

  remove: (element) => {
    if (!element) return;

    const index = _todoList.indexOf(element);
    if (index > -1) {
      _todoList.splice(index, 1);
      updateTodo();
    }
  }
}

let bookmarkElement = undefined;
let bookmarkElementRef = undefined;

const bookmarkAssign = (element) => {
  if (!bookmarkElement) {
    const element = `<button class="p-0.5 bg-gray-50 text-gray-500 rounded" id="bookmark_marked" style="color: rgba(230, 0, 0, 0.7);">
<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 6.2C5 5.07989 5 4.51984 5.21799 4.09202C5.40973 3.71569 5.71569 3.40973 6.09202 3.21799C6.51984 3 7.07989 3 8.2 3H15.8C16.9201 3 17.4802 3 17.908 3.21799C18.2843 3.40973 18.5903 3.71569 18.782 4.09202C19 4.51984 19 5.07989 19 6.2V21L12 16L5 21V6.2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
</svg>
  </button>`;

    checkIconsContainer();
    iconsParentElement.insertAdjacentHTML('beforeend', element);

    bookmarkElement = document.getElementById("bookmark_marked");
    bookmarkElement.addEventListener('click', () => {
      bookmarkElementRef.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" })
    });
  }

  bookmarkElementRef = element;

  if (!bookmarkElementRef) {
    bookmarkElement.remove();
    bookmarkElement = undefined;
    return;
  }


}

const scriptsReg = new RegExp(/<(?:[^>:\s]+:)?script\b[^>]*>([\s\S]*?)<\/(?:[^>:\s]+:)?script>/gi);
const replacer = (arr) => {
        return function (match, p1, p2, /* …, */ pN, offset, string, groups) {
        arr.push(p1);
        return '';
        }
      }

class MarkdownCell {
    origin = {}
    feObjects = []
    envs = []


    todoListObject = undefined

    bookmark() {
      const self = this;
      bookmarkAssign(self.element);
    }

    todo(number = 1) {
      if (number == 0) return;

      const self = this;
      this.todoListObject = {
        ref: self,
        count: number
      };

      todoList.push(this.todoListObject);
    }

    dispose() {
      todoList.remove(this.todoListObject);
      delete this.element;

      console.warn('Markdown cell dispose...');
      for (const env of this.envs) {
        for (const obj of Object.values(env.global.stack))  {
          console.log('dispose');
          obj.dispose();
        }
      }
    }

    static async renderToHTML(data) {
      const marked = new Marked({async: true, renderer, extensions: [admonitionExtension({}), inlineKatex({}), mark(), blockKatex({})]});
      return await marked.parse(fixArrowBug(unicodeToChar(data)));
    }
    
    constructor(parent, data) {
      console.log('marked data:::');
      //console.log(data);
      const self = this;
      
      const marked = new Marked({async: true, renderer, extensions: [bookmark(self), admonitionExtension(self), inlineKatex(TexOptions), mark(), blockKatex(TexOptions)]});

      const scripts = [];
      const inputString = data.replace(scriptsReg, replacer(scripts));

      marked.parse(feObjects({buffer: self.feObjects}, fixArrowBug(unicodeToChar(inputString)))).then(async (res) => {


        parent.element.innerHTML = res.replace(/RVJSEvent\["([^"]+)","([^"]+)"\]/g, '');

        await runModuleSnippetsInOrder(scripts);

        self.feObjects.forEach(async (el) => {
          const cuid = Date.now() + Math.floor(Math.random() * 10009);
          var global = {call: cuid};

          console.warn('loading executable on a markdown field...');
          console.log(el.uid);
          
      
          let env = {global: global, element: document.getElementById(el.elementId)}; 
          console.log("Marked: creating an object");


          console.log('forntend executable');

          let obj;
          console.log('check cache');
          if (ObjectHashMap[el.uid]) {
              obj = ObjectHashMap[el.uid];
          } else {
              obj = new ObjectStorage(el.uid);
          }
          console.log(obj);
      
          const copy = env;
          const store = await obj.get();
          const instance = new ExecutableObject('marked-static-'+uuidv4(), copy, store, true);
          instance.assignScope(copy);
          obj.assign(instance);
      
          instance.execute();          
      
          self.envs.push(env);     
        });
      });

      parent.element.classList.add('markdown', 'margin-bottom-fix');
      this.element = parent.element;

      return this;
    }
  }




  window.SupportedLanguages.push({
    check: (r) => {return(r[0].match(/\w*\.(md)$/) != null)},
    plugins: [codemirror.markdown(), codemirror.DropPasteHandlers(pasteDrop, pasteFile), codemirror.EditorView.editorAttributes.of({class: 'clang-markdown'}), codemirror.EditorView.contentAttributes.of({ spellcheck: 'true' })],
    name: codemirror.markdownLanguage.name
  });

  window.SupportedCells['markdown'] = {
    view: MarkdownCell
  };


  class LaTeXCell {
    dispose() {
      delete this.element;
    }
    
    constructor(parent, data) {
      console.log('latex data:::');
      //console.log(data);
      const self = this;

      
      parent.element.innerHTML = katex.renderToString(unicodeToChar(data), {displayMode: true})
      
      

      parent.element.classList.add('markdown', 'margin-bottom-fix');
      this.element = parent.element;

      return this;
    }
  }

  window.SupportedCells['latex'] = {
    view: LaTeXCell
  };

  window.SupportedCells['katex'] = {
    view: LaTeXCell
  };  

const applyAnchorPoint = (el, anchor = 'Center') => {
  let x = 'Center';
  let y = 'Center';

  if (Array.isArray(anchor)) {
    const [horizontal, vertical] = anchor;

    if (horizontal === 'Left' || horizontal === 'Right') x = horizontal;
    if (vertical === 'Top' || vertical === 'Bottom') y = vertical;
  } else {
    switch (anchor) {
      case 'Top':
      case 'Bottom':
        y = anchor;
        break;

      case 'Left':
      case 'Right':
        x = anchor;
        break;

      case 'Center':
      default:
        break;
    }
  }

  el.style.justifyContent =
    x === 'Left' ? 'flex-start' :
    x === 'Right' ? 'flex-end' :
    'center';

  el.style.alignItems =
    y === 'Top' ? 'flex-start' :
    y === 'Bottom' ? 'flex-end' :
    'center';
};

const texContext = {};
texContext.Left = () => "Left"
texContext.Right = () => "Right"
texContext.Center = () => "Center"
texContext.Top = () => "Top"
texContext.Bottom = () => "Bottom"
texContext.Alignment = () => "AnchorPoint"
texContext.AlignmentPoint = () => "AnchorPoint"

const tex = async (args, env) => {
  const data = await interpretate(args[0], env);
  const opts = await core._getRules(args, {...env, context: texContext});

  env.local.el = document.createElement('div');
  env.local.el.style.display = 'flex';

  applyAnchorPoint(env.local.el, opts.AnchorPoint);

  if (opts.ImageSize) {
    let size = opts.ImageSize;
    if (!Array.isArray(size)) size = [size, size * 0.76];

    if (typeof size[0] == 'number') {
      if (size[0] < 3.0) {
        size[0] *= 800.0;
        size[1] *= 800.0;
      }

      env.local.el.style.width = size[0] + 'px';
      env.local.el.style.height = size[1] + 'px';
    }
  }

  env.local.el.innerHTML = katex.renderToString(
    unicodeToChar(data.replaceAll('\\\\', '\\')),
    { displayMode: true }
  );

  env.element.appendChild(env.local.el);
};

tex.update = async (args, env) => {
  const data = await interpretate(args[0], env);

  env.local.el.innerHTML = katex.renderToString(
    unicodeToChar(data.replaceAll('\\\\', '\\')),
    { displayMode: true }
  );
};

tex.virtual = true;

tex.destroy = (args, env) => {
  env.local.el.remove();
};

/* it is anyway meant to be global, so we define it in all contexts */
core.TeXView = tex;
core['CoffeeLiqueur`Extensions`MarkdownCells`TeXView'] = tex;
core['CoffeeLiqueur`Extensions`MarkdownCells`Private`TeXView'] = tex;