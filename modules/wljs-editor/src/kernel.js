import { EditorView, minimalSetup } from "codemirror";

import {language} from "@codemirror/language"


import {javascriptLanguage, javascript } from "@codemirror/lang-javascript"

import {markdownLanguage, markdown} from "@codemirror/lang-markdown"

import {htmlLanguage, html} from "@codemirror/lang-html"

import {search, searchKeymap} from "@codemirror/search"

import {cssLanguage, css} from "@codemirror/lang-css"

import {indentWithTab, indentMore, indentLess} from "@codemirror/commands" 
 
import { MatchDecorator, WidgetType, keymap } from "@codemirror/view"

import {syntaxTree, syntaxTreeAvailable, Language, LanguageState, ParseContext} from "@codemirror/language"
import {linter} from "@codemirror/lint"

import {Tree} from "@lezer/common"


//import rainbowBrackets from 'rainbowbrackets'

/*import { phraseEmphasis } from './../JSLibs/markword/phraseEmphasis';
import { heading, headingRE } from './../JSLibs/markword/heading';
import { wordmarkTheme } from './../JSLibs/markword/wordmarkTheme';
import { link } from './../JSLibs/markword/link';
import { listTask } from './../JSLibs/markword/listTask';
import { image } from './../JSLibs/markword/image';
import { blockquote } from './../JSLibs/markword/blockquote';
import { codeblock } from './../JSLibs/markword/codeblock';
import { webkitPlugins } from './../JSLibs/markword/webkit';

import { frontMatter } from './../JSLibs/markword/frontMatter';*/

import {
  highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor,
  rectangularSelection, crosshairCursor, placeholder,
  highlightActiveLineGutter, lineNumbers
} from "@codemirror/view"

import {tags} from "@lezer/highlight"

import { EditorState, Compartment, Facet, StateField, StateEffect, Prec, EditorSelection } from "@codemirror/state"
import { syntaxHighlighting, indentOnInput, bracketMatching, HighlightStyle, foldGutter} from "@codemirror/language"
import { history, historyKeymap } from "@codemirror/commands"
import { highlightSelectionMatches } from "@codemirror/search"
import { autocompletion, closeBrackets, acceptCompletion } from "@codemirror/autocomplete"
import {tooltips} from "@codemirror/view";

import {
  Decoration,
  ViewPlugin
} from "@codemirror/view"

import {StreamLanguage} from "@codemirror/language"
import {spreadsheet} from "@codemirror/legacy-modes/mode/spreadsheet"

import { wolframLanguage } from "../libs/priceless-mathematica/src/mathematica/mathematica"

import { DropPasteHandlers } from "../libs/priceless-mathematica/src/mathematica/dropevents";

import { Greekholder } from "../libs/priceless-mathematica/src/sugar/misc"

import {FractionBoxWidget} from "../libs/priceless-mathematica/src/boxes/fractionbox"
import {SqrtBoxWidget} from "../libs/priceless-mathematica/src/boxes/sqrtbox"
import {SubscriptBoxWidget} from "../libs/priceless-mathematica/src/boxes/subscriptbox"
import {SupscriptBoxWidget} from "../libs/priceless-mathematica/src/boxes/supscriptbox"
import {GridBoxWidget} from "../libs/priceless-mathematica/src/boxes/gridbox"

import {ViewBoxWidget} from "../libs/priceless-mathematica/src/boxes/viewbox"
import {BoxBoxWidget} from "../libs/priceless-mathematica/src/boxes/boxbox"
import {TemplateBoxWidget} from "../libs/priceless-mathematica/src/boxes/templatebox"

import { cellTypesHighlight } from "../libs/priceless-mathematica/src/sugar/cells"


const languageConf = new Compartment

const readWriteCompartment = new Compartment

const extras = []

/// A default highlight style (works well with light themes).
const defaultHighlightStyle = HighlightStyle.define([
  {tag: tags.meta,
   color: "var(--editor-key-meta)"},
  {tag: tags.link,
   textDecoration: "underline"},
  {tag: tags.heading,
   textDecoration: "underline",
   fontWeight: "bold"},
  {tag: tags.emphasis,
   fontStyle: "italic"},
  {tag: tags.strong,
   fontWeight: "bold"},
  {tag: tags.strikethrough,
   textDecoration: "line-through"},
  {tag: tags.keyword,
   color: "var(--editor-key-keyword)"},
  {tag: [tags.atom, tags.bool, tags.url, tags.contentSeparator, tags.labelName],
   color: "var(--editor-key-atom)"},
  {tag: [tags.literal, tags.inserted],
   color: "var(--editor-key-literal)"},
  {tag: [tags.string, tags.deleted],
   color: "var(--editor-key-string)"},
  {tag: [tags.regexp, tags.escape, tags.special(tags.string)],
   color: "var(--editor-key-escape)"},
  {tag: tags.definition(tags.variableName),
   color: "var(--editor-key-variable)"},
  {tag: tags.local(tags.variableName),
   color: "var(--editor-local-variable)"},
  {tag: [tags.typeName, tags.namespace],
   color: "var(--editor-key-type)"},
  {tag: tags.className,
   color: "var(--editor-key-class)"},
  {tag: [tags.special(tags.variableName), tags.macroName],
   color: "var(--editor-special-variable)"},
  {tag: tags.definition(tags.propertyName),
   color: "var(--editor-key-property)"},
  {tag: tags.comment,
   color: "var(--editor-key-comment)"},
  {tag: tags.invalid,
   color: "var(--editor-key-invalid)"}
])



const EditorAutocomplete = {data: []};
EditorAutocomplete.extend = (list) => {
  EditorAutocomplete.data.push(...list);
  wolframLanguage.reBuild(EditorAutocomplete.data);
}

EditorAutocomplete.replaceAll = (list) => {
  EditorAutocomplete.data = list;
  wolframLanguage.reBuild(EditorAutocomplete.data);
}

EditorAutocomplete.refresh = () => {
  wolframLanguage.refresh();
}

const unknownLanguage = StreamLanguage.define(spreadsheet);
const regLang = new RegExp(/^[\w]*\.[A-Za-z_]+/);

function checkDocType(str) {
  const r = regLang.exec(str);

  const arr = Object.values(window.SupportedLanguages);

  for (let i=0; i<arr.length; ++i) {
    //console.log(arr[i]);
    //console.log(arr[i].check(r));
    if (arr[i].check(r)) return arr[i];
  }



  /*switch(r[1]) {
    case 'js': 
      return {type: javascriptLanguage.name, lang: javascript()}; 
    case 'md':
      return {type: markdownLanguage.name, lang: markdownPlugins};
    case 'html':
    case 'htm':
    case 'wsp':
      return {type: htmlLanguage.name, lang: html()};
  }*/

  return {plugins: [unknownLanguage, EditorView.editorAttributes.of({class: 'clang-generic'})], name: 'spreadsheet', legacy: true};
}


const legacyLangNameFacet = Facet.define();


class BracketWidget extends WidgetType {
  constructor(ch, height, color) {
    //console.log('created');
    super();
    this.ch = ch;
    this.color = color;
    this.cssClass = getClass(height);
  }

  eq(other) {
   // return false;
   //console.log('test', (this.ch == other.ch && this.cssClass == other.cssClass && this.color == other.color));
    return (this.ch == other.ch && this.cssClass == other.cssClass && this.color == other.color);
  }

  updateDOM(dom, view) {
    if (dom.ch != this.ch) return false;
   // console.log('update DOM');
    //console.warn(this.cssClass);
    if (dom.cssClass != this.cssClass) {
      //check if DOM height is undefined 
      if (!(this.cssClass === false)) dom.firstChild.className = this.cssClass;
      dom.cssClass = this.cssClass;
    }
    if (dom.color != this.color) {
      if (this.color) dom.firstChild.style.backgroundColor = this.color; else dom.firstChild.style.backgroundColor = '';
      dom.color = this.color;
    }
    return true;
  }
  
  destroy(dom) {
    //console.log('remove DOM');
    dom.remove();
  }

  toDOM() {
    //console.log('to DOM');
    const wrapper = document.createElement('span');
    wrapper.classList.add('cm-tex');
    //if (this.height) wrapper.style.height = this.height+'px';
    //wrapper.style.background = 'red';
    wrapper.style.verticalAlign = 'baseline';
    
    //wrapper.innerText = this.ch;
    //wrapper.style.display = "inline-block";
    const el = document.createElement('span');
    if (this.color) el.style.backgroundColor = this.color;
    const c = this.cssClass;
    //el.classList.add('delimsizing');
    if (c) {
      el.className = c;
    } 

    el.innerText = this.ch;
    wrapper.ch = this.ch;
    wrapper.appendChild(el);
    wrapper.cssClass = c;
    wrapper.color = this.color;
    return wrapper;
  }
  ignoreEvent() {
    return false;
  }
}

var getClass = (height) => {
  if (!height) return false; //height == 0, DOM read error
  //normal DOM height
  if (height > 70) return 's4';
  if (height > 50) return 's3';
  if (height > 25) return 's2';
  if (height > 15) return 's1';
  if (height > 8) return 's0';
  //DOM height == -1, i.e. element does not exists -> fallback
}

function bracketDeco(ch, height, from, to, color) {
  const d = Decoration.replace({
    widget: new BracketWidget(ch, height, color),
    inclusiveStart: false,
    inclusiveEnd: false
  });


  return d.range(from, to);
}

const decorationsSeeker = ViewPlugin.fromClass(class {
  decorations = [];
  ranges;

  constructor(view) {
    //console.log('construct ranges');
    this.ranges = this.getRanges(view);
    let selected = view.state.selection.ranges[0]
    if (selected && view.hasFocus) selected = selected.from;

    const [brackets, mismatch] = this.iterateTree(view, selected);
    this.brackets = brackets;
    //this.mismatch = mismatch;
    const decorations = brackets.map(([ch, h, from, to, color]) => {
      return bracketDeco(ch, h, from, to, color)
    });


    if (syntaxTreeAvailable(view.state)) {for (const m of mismatch) {
      decorations.push(bracketDeco(m.ch, 0, m.from, m.to, "var(--editor-key-invalid)"));
    } }

    this.decorations = Decoration.set(decorations, true);
    //return this.decorations
  }

  update(update) {
    //console.log('check ranges');
    let unknownDomSizes = false;

    //console.log(update.docChanged || update.focusChanged || update.geometryChanged || update.heightChanged || update.selectionSet);
    if (update.heightChanged || update.selectionSet) {
      for (let i=0; i<this.brackets.length; ++i) {
        if (this.brackets[i][1] == 0) {
          unknownDomSizes = true;
          break;
        }
      }
      /*if (!unknownDomSizes) for (let i=0; i<this.mismatch.length; ++i) {
        if (this.mismatch[i][1] == 0) {
          unknownDomSizes = true;
          break;
        }
      }*/
    }

    if (!update.selectionSet && !update.focusChanged && !update.geometryChanged && !update.docChanged && !unknownDomSizes) return;
    //console.log('update ranges for sure');
    let selected = update.view.state.selection.ranges[0]
    if (selected && update.view.hasFocus) selected = selected.from;
    //const time = performance.now();
    this.ranges = this.getRanges(update.view);
    const [brackets, mismatch] = this.iterateTree(update.view, selected);
    this.brackets = brackets;
    const decorations = brackets.map(([ch, h, from, to, c]) => {
      return bracketDeco(ch, h, from, to, c)
    });

    if (syntaxTreeAvailable(update.view.state)) for (const m of mismatch) {
      decorations.push(bracketDeco(m.ch, 0, m.from, m.to, "var(--editor-key-invalid)"));
    }

    this.decorations = Decoration.set(decorations, true);
    //console.log(performance.now() - time);
    //return this.decorations
  }


  iterateTree(view, cur) {
    const tree = syntaxTree(view.state);
  
    const ranges = this.ranges;
    const { doc } = view.state;
    const pairs = []
    const stack = []
    const missmatched = []

    const openToClose = { "(": ")", "[": "]", "{": "}" }
    const closeToOpen = { ")": "(", "]": "[", "}": "{" }

    tree.iterate({
      enter(node) {
        if (node.name !== "bracket") {
          return true
        }
        
        for (let j=0; j<ranges.length;++j) {
          if (node.from >= ranges[j][0] && node.to <= ranges[j][1]) return false;
        }

        const ch = doc.sliceString(node.from, node.to)
        if (ch.length !== 1) return

        const expectedClose = openToClose[ch]
        if (expectedClose) {
          stack.push({from: node.from, to: node.to, open: ch, expectedClose})
          return
        }

        const neededOpen = closeToOpen[ch]
        if (!neededOpen) return

        const top = stack[stack.length - 1]
        if (top && top.open === neededOpen) {
          stack.pop()
          pairs.push({
            open: {from: top.from, to: top.to, ch: top.open},
            close: {from: node.from, to: node.to, ch},
            color: (cur == top.from || cur == node.from) ? '#f6debe' : null
          })

        
        } else {
          missmatched.push({
            from: node.from,
            to: node.to,
            ch
          })
        }
      }
    });

    while (stack.length) {
      const o = stack.pop()
      missmatched.push({
        from: o.from,
        to: o.to,
        ch: o.open
      })
    }    

    const filtered = [];

    for (let i=0; i<pairs.length; ++i) {
      let height = -1;
      const pair = pairs[i];
      for (let j=0; j<ranges.length; ++j) {
        if (ranges[j][0] >= pair.open.to && ranges[j][1] <= pair.close.from) {
          if (ranges[j][2]) {
            height = Math.max(height, Math.round(ranges[j][2]));
          } else {
            height = Math.max(height, 0)
          }
        }
      }
      if (height >= -1) {
        filtered.push(
          [pair.open.ch, height, pair.open.from, pair.open.to, pair.color],
          [pair.close.ch, height, pair.close.from, pair.close.to, pair.color]       
        );
      }
    }    

    return [filtered, missmatched];
  }

  getRanges(view) {
   const ranges = [];
   const rangeSets = view.state.facet(EditorView.atomicRanges).map((f)=>f(view));
    for (let i=0; i<rangeSets.length; ++i) {
      if (rangeSets[i].size > 0) {
          const cursor = rangeSets[i].iter();
          let v;
          do {
            v = cursor.value;
            if (!v) break;
            //get some properties of v.widget...
            if (v.widget.visibleValue) {
              const pos = v.widget.visibleValue.pos;
              ranges.push([pos, pos+v.widget.visibleValue.length, v.widget?.DOMElement?.offsetHeight]);
            }
            cursor.next();
          } while(v);
      }
    };    

    return ranges;
  }


},     {
    decorations: (instance) => instance.decorations
  });  


const autoLanguage = EditorState.transactionExtender.of(tr => {
  if (!tr.docChanged) return null
  let docType = checkDocType(tr.newDoc.line(1).text);

  if (docType.legacy) {
    //hard to distinguish...


    const la = tr.startState.facet(language);
    if (!la) {
      if (tr.startState.facet(legacyLangNameFacet) == docType.name) return null;
    } else {
      if (la.name == docType.name) return null;
    }
    
    console.log('switching... to '+docType.name);
    //if (docType.prolog) docType.prolog(tr);
    return {
      effects: languageConf.reconfigure(docType.plugins)
    }

  } else {
    //if it is the same

    if (docType.name === tr.startState.facet(language).name) return null;

    console.log('switching... to '+docType.name);
    //if (docType.prolog) docType.prolog(tr);
    return {
      effects: languageConf.reconfigure(docType.plugins)
    }
  }
})


//----





//----
 

function stringToHash(string) {
             
  let hash = 0;
   
  if (string.length == 0) return hash;
   
  for (let i = 0; i < string.length; i++) {
      let char = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
  }
   
  return hash;
}

let compactWLEditor = null;
let selectedEditor = undefined;

const EditorSelected = {
  type: (e) => {
    const editor = e || selectedEditor;

    if (!editor) return '';
    if (!editor.viewState) return '';
    console.log();
    return checkDocType(editor.state.doc.line(1).text).name;
  },
  cursor: (e) => {
    const editor = e || selectedEditor;

    if (!editor) return '';
    if (!editor.viewState) return '';
    const ranges = editor.viewState.state.selection.ranges;
    if (!ranges.length) return false;  
    const selection = ranges[0];
    return [selection.from, selection.to];  
  },
  getContent: (e) => {
    const editor = e || selectedEditor;

    if (!editor) return '';
    if (!editor.viewState) return '';
    return editor.state.doc.toString();
  },  
  get: (e) => {
    const editor = e || selectedEditor;


    if (!editor) return '';
    if (!editor.viewState) return '';
    const ranges = editor.viewState.state.selection.ranges;
    if (!ranges.length) return '';

    const selection = ranges[0];
    console.log('yoko');
    console.log(selection);
    console.log(editor.state.doc.toString().slice(selection.from, selection.to));
    console.log('processing');
    return editor.state.doc.toString().slice(selection.from, selection.to);
  },

  set: (data, e) => {
    const editor = e || selectedEditor;

    if (!editor) return;
    if (!editor.viewState) return;
    const ranges = editor.viewState.state.selection.ranges;
    if (!ranges.length) return;

    const selection = ranges[0];

    console.log('result');
      console.log(data);
      editor.dispatch({
        changes: {...selection, insert: data}
      });
  },

  currentEditor: () => {
    return selectedEditor;
  },

  setContent: (data, e) => {
    const editor = e || selectedEditor;

    if (!editor) return;
    if (!editor.viewState) return;


    console.log('result');
      console.log(data);
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.viewState.state.doc.length
        , insert: data}
      });
  }
}

compactWLEditor = (args) => {
  let editor = new EditorView({
  doc: args.doc,
  extensions: [
    keymap.of([
      { key: "Tab", run: function (editor, key) {
        return acceptCompletion(editor);
      } },
      { key: "Enter", preventDefault: true, run: function (editor, key) { 
        return true;
      } }
    ]),  
    keymap.of([
      { key: "Shift-Enter", preventDefault: true, run: function (editor, key) { 
        args.eval();
        return true;
      } },
      { key: "Ctrl-Enter", mac: "Cmd-Enter", stopPropagation:true, preventDefault: true, run: function (editor, event) { 
        event.stopPropagation();
        args.evalNext();
        return false;
      } },
      { key: "Ctrl-Shift-Enter", mac: "Cmd-Shift-Enter", stopPropagation:true, preventDefault: true, run: function (editor, event) { 
        event.stopPropagation();
        args.evalToWindow();
        return false;
      } }
    ]),    
    args.extensions || [],   
    minimalSetup,
    editorCustomThemeCompact,  
    tooltips({parent: document.getElementsByTagName('main')[0] || document.body, position: "absolute"}),
    syntaxHighlighting(defaultHighlightStyle, { fallback: false }),    
    wolframLanguage.of(EditorAutocomplete),
    FractionBoxWidget(compactWLEditor),
    SqrtBoxWidget(compactWLEditor),
    SubscriptBoxWidget(compactWLEditor),
    SupscriptBoxWidget(compactWLEditor),
    GridBoxWidget(compactWLEditor),
    ViewBoxWidget(compactWLEditor),
    BoxBoxWidget(compactWLEditor),
    TemplateBoxWidget(compactWLEditor),
    //bracketMatching(),
    decorationsSeeker,
    //rainbowBrackets(),
    Greekholder,
    extras,
    
    EditorView.updateListener.of((v) => {
      if (v.docChanged) {
        args.update(v.state.doc.toString());
      }
      if (v.selectionSet) {
        //console.log('selected editor:');
        //console.log(v.view);
        selectedEditor = v.view;
      }
    })
  ],
  parent: args.parent
  });

  editor.viewState.state.config.eval = args.eval;
  return editor;
}

compactWLEditor.state = (args) => {
  let state = EditorState.create({
    doc: args.doc,
    extensions: [
      keymap.of([
        { key: "Tab", run: function (editor, key) {
          return acceptCompletion(editor);
        } },
        { key: "Enter", preventDefault: true, run: function (editor, key) { 
          return true;
        } }
      ]),  
      keymap.of([
        { key: "Shift-Enter", preventDefault: true, run: function (editor, key) { 
          args.eval();
          return true;
        } },
        { key: "Ctrl-Enter", mac: "Cmd-Enter", stopPropagation:true, preventDefault: true, run: function (editor, event) { 
          event.stopPropagation();
          args?.evalNext();
          return false;
        } },
        { key: "Ctrl-Shift-Enter", mac: "Cmd-Shift-Enter", stopPropagation:true, preventDefault: true, run: function (editor, event) { 
        event.stopPropagation();
        args?.evalToWindow();
        return false;
      } }
      ]),    
      args.extensions || [],   
      minimalSetup,
      editorCustomThemeCompact,  
      syntaxHighlighting(defaultHighlightStyle, { fallback: false }),    
      wolframLanguage.of(EditorAutocomplete),
      FractionBoxWidget(compactWLEditor),
      SqrtBoxWidget(compactWLEditor),
      SubscriptBoxWidget(compactWLEditor),
      SupscriptBoxWidget(compactWLEditor),
      GridBoxWidget(compactWLEditor),
      ViewBoxWidget(compactWLEditor),
      BoxBoxWidget(compactWLEditor),
      TemplateBoxWidget(compactWLEditor),
      //bracketMatching(),
      decorationsSeeker,
      //rainbowBrackets(),
      Greekholder,
      extras,
      
      EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          args.update(v.state.doc.toString());
        }
        if (v.selectionSet) {
          //console.log('selected editor:');
          //console.log(v.view);
          selectedEditor = v.view;
        }
      })
    ]
    });
  
  
    state.config.eval = args.eval;
    return state;  
}

const splitStringIntoChunks = (str, chunkSize) => {
  if (!str || chunkSize <= 0) return [];
  
  const chunks = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, Math.min(i + chunkSize, str.length)));
  }
  return chunks;
}

const wlDrop = {
    transaction: (ev, view, id, length) => {
      console.log(view.dom.ocellref);
      selectedEditor = view;
      if (view.dom.ocellref) {
        const channel = view.dom.ocellref.origin.channel;
        server._emitt(channel, `<|"Channel"->"${id}", "Length"->${length}, "CellType"->"wl"|>`, 'Forwarded["CM:DropEvent"]');
      }
    },

    pasteTypeAsk: async (view, choise) => {
      console.log('asking a user');
      if (view.dom.ocellref) {
        const uid = view.dom.ocellref.origin.uid;
        const res = await server.io.fetch('CoffeeLiqueur`Extensions`FileUploader`Private`askUserToChoose', [uid, choise]);
        console.log(res);
        return res;
      }
    },

    insertPath: (view, pathsArray) => {
      selectedEditor = view;
      if (view.dom.ocellref) {
        const channel = view.dom.ocellref.origin.channel;
        server._emitt(channel, `<|"JSON"->"${encodeURIComponent(JSON.stringify(pathsArray.map(encodeURIComponent)))}", "CellType"->"wl"|>`, 'Forwarded["CM:InsertFilePaths"]');
      }
    },

    pastePath: (view, pathsArray) => {
      selectedEditor = view;
      if (view.dom.ocellref) {
        const channel = view.dom.ocellref.origin.channel;
        server._emitt(channel, `<|"JSON"->"${encodeURIComponent(JSON.stringify(pathsArray.map(encodeURIComponent)))}", "CellType"->"wl"|>`, 'Forwarded["CM:DropFilePaths"]');
      }
    },

    file: (ev, view, id, name, result) => {
      //console.log(view.dom.ocellref);
      //console.log(result);
      if (view.dom.ocellref) {
        //throw result.length;
        if (result.length > 5 * 1024 * 1024) {
          const chunks = splitStringIntoChunks(result, 5 * 1024 * 1024);
          chunks.forEach((chunk, index) => {
            server.emitt(id, `<|"Data"->"${chunk}", "Name"->"${name}", "Chunk"->${index+1}, "Chunks"->${chunks.length}|>`, 'Chunk');
          });
        } else {
          server.emitt(id, `<|"Data"->"${result}", "Name"->"${name}"|>`, 'File');
        }
      }
    }
}

const wlPaste = {
  transaction: (ev, view, id, length) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      const channel = view.dom.ocellref.origin.channel;
      server._emitt(channel, `<|"Channel"->"${id}", "Length"->${length}, "CellType"->"wl"|>`, 'Forwarded["CM:PasteEvent"]');
    }
  },

  pasteTypeAsk: async (view, choise) => {
      if (view.dom.ocellref) {
        const uid = view.dom.ocellref.origin.uid;
        return await server.io.fetch('CoffeeLiqueur`Extensions`FileUploader`Private`askUserToChoose', [uid, choise]);
      }
  },

  insertPath: (view, pathsArray) => {
      selectedEditor = view;
      if (view.dom.ocellref) {
        const channel = view.dom.ocellref.origin.channel;
        server._emitt(channel, `<|"JSON"->"${encodeURIComponent(JSON.stringify(pathsArray.map(encodeURIComponent)))}", "CellType"->"wl"|>`, 'Forwarded["CM:InsertFilePaths"]');
      }
  },

  pastePath: (view, pathsArray) => {
      selectedEditor = view;
      if (view.dom.ocellref) {
        const channel = view.dom.ocellref.origin.channel;
        server._emitt(channel, `<|"JSON"->"${encodeURIComponent(JSON.stringify(pathsArray.map(encodeURIComponent)))}", "CellType"->"wl"|>`, 'Forwarded["CM:DropFilePaths"]');
      }
  },  

  file: (ev, view, id, name, result) => {
    console.log(view.dom.ocellref);
    if (view.dom.ocellref) {
      if (result.length > 5 * 1024 * 1024) {
        const chunks = splitStringIntoChunks(result, 5 * 1024 * 1024);
        chunks.forEach((chunk, index) => {
          server.emitt(id, `<|"Data"->"${chunk}", "Name"->"${name}", "Chunk"->${index+1}, "Chunks"->${chunks.length}|>`, 'Chunk');
        });
      } else {
        server.emitt(id, `<|"Data"->"${result}", "Name"->"${name}"|>`, 'File');
      }
    }
  }
}

const wlCellPaste = (ev, view, content) => {
  console.log(view.dom.ocellref);
  if (view.dom.ocellref) {
    const channel = view.dom.ocellref.origin.channel;
    const uid = view.dom.ocellref.origin.uid;
    server._emitt(channel, `<|"CellUID"->"${uid}", "Content"->"${content}", "CellType"->"wl"|>`, 'Forwarded["CM:PasteCellEvent"]');
  }  
}

const wlPasteCrappy1 = (ev, view, content) => {
  console.log(view.dom.ocellref);
  if (view.dom.ocellref) {
    const channel = view.dom.ocellref.origin.channel;
    const uid = view.dom.ocellref.origin.uid;
    server._emitt(channel, `<|"CellUID"->"${uid}", "Content"->"${encodeURIComponent(content)}", "CellType"->"wl"|>`, 'Forwarded["CM:PasteCrappy1Event"]');
  }  
}

const wlPasteCrappy2 = (ev, view, content) => {
  console.log(view.dom.ocellref);
  if (view.dom.ocellref) {
    const channel = view.dom.ocellref.origin.channel;
    const uid = view.dom.ocellref.origin.uid;
    server._emitt(channel, `<|"CellUID"->"${uid}", "Content"->"${encodeURIComponent(content)}", "CellType"->"wl"|>`, 'Forwarded["CM:PasteCrappy2Event"]');
  }  
}



const mathematicaPlugins = [
  wolframLanguage.of(EditorAutocomplete), 
  //Prec.lowest(autoHeightBrackets),
  FractionBoxWidget(compactWLEditor),
  SqrtBoxWidget(compactWLEditor),
  SubscriptBoxWidget(compactWLEditor),
  SupscriptBoxWidget(compactWLEditor),
  GridBoxWidget(compactWLEditor),
  ViewBoxWidget(compactWLEditor),
  BoxBoxWidget(compactWLEditor),  
  TemplateBoxWidget(compactWLEditor),
  //bracketMatching(),
  //rainbowBrackets(),
  decorationsSeeker,
  Greekholder,
  extras,
  DropPasteHandlers(wlDrop, wlPaste, wlCellPaste, wlPasteCrappy1, wlPasteCrappy2)
]



import { defaultKeymap } from "@codemirror/commands";

let editorCustomTheme = EditorView.theme({
  "&.cm-focused": {
    outline: "1px dashed var(--editor-outline)", 
    background: 'inherit'
  },
  ".cm-line": {
    padding: 0,
    'padding-left': '2px',
    'align-items': 'center'
  },
  ".cm-activeLine": {
    'background-color': 'transparent'
  },
/*
  ".rainbow-bracket-red": { color: 'var(--editor-bracket-1)' },
  ".rainbow-bracket-orange": { color: 'var(--editor-bracket-2)' },
  ".rainbow-bracket-yellow": { color: 'var(--editor-bracket-3)' },
  ".rainbow-bracket-green": { color: 'var(--editor-bracket-4)' },
  ".rainbow-bracket-blue": { color: 'var(--editor-bracket-5)' },
  ".rainbow-bracket-indigo": { color: 'var(--editor-bracket-6)' },
  ".rainbow-bracket-violet": { color: 'var(--editor-bracket-7)' },

  ".rainbow-bracket-red > span": { color: 'var(--editor-bracket-1-a)' },
  ".rainbow-bracket-orange > span": { color: 'var(--editor-bracket-2-a)' },
  ".rainbow-bracket-yellow > span": { color: 'var(--editor-bracket-3-a)' },
  ".rainbow-bracket-green > span": { color: 'var(--editor-bracket-4-a)' },
  ".rainbow-bracket-blue > span": { color: 'var(--editor-bracket-5-a)' },
  ".rainbow-bracket-indigo > span": { color: 'var(--editor-bracket-6-a)' },
  ".rainbow-bracket-violet > span": { color: 'var(--editor-bracket-7-a)' }
*/
});

let editorCustomThemeCompact = EditorView.theme({
  "&.cm-focused": {
    outline: "1px dashed var(--editor-outline)",
    background: 'inherit'
  },
  ".cm-line": {
    padding: 0,
    'padding-left': '2px',
    'align-items': 'center'
  },
  ".cm-activeLine": {
    'background-color': 'transparent'
  },
  ".cm-scroller": {
    'line-height': 'inherit',
    'overflow-x': 'overlay',
    'overflow-y': 'overlay',
    'align-items': 'initial'
  },
  ".cm-content": {
    "padding": '0px 0'
  },

  ".rainbow-bracket-red": { color: 'var(--editor-bracket-1)' },
  ".rainbow-bracket-orange": { color: 'var(--editor-bracket-2)' },
  ".rainbow-bracket-yellow": { color: 'var(--editor-bracket-3)' },
  ".rainbow-bracket-green": { color: 'var(--editor-bracket-4)' },
  ".rainbow-bracket-blue": { color: 'var(--editor-bracket-5)' },
  ".rainbow-bracket-indigo": { color: 'var(--editor-bracket-6)' },
  ".rainbow-bracket-violet": { color: 'var(--editor-bracket-7)' },

  ".rainbow-bracket-red > span": { color: 'var(--editor-bracket-1-a)' },
  ".rainbow-bracket-orange > span": { color: 'var(--editor-bracket-2-a)' },
  ".rainbow-bracket-yellow > span": { color: 'var(--editor-bracket-3-a)' },
  ".rainbow-bracket-green > span": { color: 'var(--editor-bracket-4-a)' },
  ".rainbow-bracket-blue > span": { color: 'var(--editor-bracket-5-a)' },
  ".rainbow-bracket-indigo > span": { color: 'var(--editor-bracket-6-a)' },
  ".rainbow-bracket-violet > span": { color: 'var(--editor-bracket-7-a)' }

});

let globalCMFocus = false;

const EditorExtensionsMinimal = [
  () => highlightSpecialChars(),
  () => history({minDepth: 40}),
  () => drawSelection(),
  () => dropCursor(),
  () => indentOnInput(),
  //() => bracketMatching(),
  //() => closeBrackets(),
  () => EditorView.lineWrapping,
  () => autocompletion(),
  () => tooltips({parent: document.getElementsByTagName('main')[0] || document.body, position: "absolute"}),
  () => syntaxHighlighting(defaultHighlightStyle, { fallback: false }),
  () => highlightSelectionMatches()
] 

const EditorParameters = {

};

const EditorExtensions = [
  () => highlightSpecialChars(),
  () => history({minDepth: 40}),
  () => drawSelection(),
  () => dropCursor(),
  (self) => originFacet.of(self),
  () => {
      if (EditorParameters["gutter"])
        return lineNumbers();

      return [];
    },
  () => indentOnInput(),
  //() => bracketMatching(),
 // () => test(),
  //() => closeBrackets(),
  () => EditorView.lineWrapping,
  () => autocompletion(),
  () => tooltips({parent: document.getElementsByTagName('main')[0] || document.body, position: "absolute"}),
  () => syntaxHighlighting(defaultHighlightStyle, { fallback: false }),
  () => highlightSelectionMatches(),
  () => cellTypesHighlight,
  () => placeholder('Type WL Expression / .md / .js'),

  () => EditorState.allowMultipleSelections.of(true),
  
  (self, initialLang) => languageConf.of(initialLang),
  () => readWriteCompartment.of(EditorState.readOnly.of(false)),
  () => autoLanguage, 

  () => search(),
  
  (self, initialLang) => keymap.of([
    { key: "Tab", run: function (editor, key) {
      const res = acceptCompletion(editor);
      if (!res) return indentMore(editor);
      return res;
    }, shift: indentLess },
    { key: "Backspace", run: function (editor, key) { 
      if(editor.state.doc.length === 0) { self.origin.remove(); return true; }  
    } },                     
    { key: "ArrowUp", run: function (editor, key) {  
      //console.log('arrowup');
      //console.log(editor.state.selection.ranges[0]);
      if (editor.state.selection.main.head == 0) {
        console.log('focus prev');
        self.origin.focusPrev();
        return;
      }

    } },
    { key: "ArrowDown", run: function (editor, key) { 

      //console.log(editor.state.selection.ranges[0]);
      if  (editor.state.selection.main.head === editor.state.doc.length) {
        console.log('focus next');
        self.origin.focusNext();
        return;
      }

    } },
    { key: "Shift-Enter", preventDefault: true, run: function (editor, key) { 
      console.log(editor.state.doc.toString()); 
      self.origin.eval(editor.state.doc.toString()); 
    } },
    { key: "Ctrl-Enter", mac: "Cmd-Enter", stopPropagation: true, preventDefault: true, run: function (editor, event) { 
      event.stopPropagation();
      console.log(editor.state.doc.toString()); 
      self.origin.evalNext(editor.state.doc.toString()); 
      return false;
    } },
    { key: "Ctrl-Shift-Enter", mac: "Cmd-Shift-Enter", stopPropagation:true, preventDefault: true, run: function (editor, event) { 
        event.stopPropagation();
        self.origin.evalToWindow(editor.state.doc.toString());
        return false;
      } }
    , ...defaultKeymap, ...historyKeymap, ...searchKeymap
  ]),
  
  (self, initialLang) => EditorView.updateListener.of((v) => { 
    if (v.docChanged) {
      //TODO: TOO SLOW FIXME!!!
      self.origin.save(encodeURIComponent(v.state.doc.toString()));
    }
    if (v.selectionSet) {
      //console.log('selected editor:');
      //console.log(v.view);
      selectedEditor = v.view;
      const selection = v.state.selection.main;
      self.origin?.updateSelection(selection.from, selection.to);
    }
    
  }),
  () => editorCustomTheme
];

function unicodeToChar(text) {
  return text.replace(/\\:[\da-f]{4}/gi, 
         function (match) {
              return String.fromCharCode(parseInt(match.replace(/\\:/g, ''), 16));
         });
}

const originFacet = Facet.define();


class CodeMirrorCell {
    origin = {}
    editor = {}
    trash = []

    forceFocusNext() {
      globalCMFocus = true;
    }

    focus(dir) {
      if (dir > 0) {
        this.editor.dispatch({selection: {anchor: 0}});
      } else if (dir < 0) {
        this.editor.dispatch({selection: {anchor: this.editor.state.doc.length}});
      }
        
      this.editor.focus();
    }


    setContent (data) {
      console.warn('content mutation!');
      if (!this.editor.viewState) return;
  
  const editor = this.editor;
      console.log('result');
      console.log(data);
      /*this.editor.dispatch({
        changes: {
          from: 0,
          to: editor.viewState.state.doc.length
        , insert: ''}
    });  */ //FIXED already

      this.editor.dispatch({
          changes: {
            from: 0,
            to: editor.viewState.state.doc.length
          , insert: data}
      });
    }
  
    addDisposable(el) {
      this.trash.push(el);
    }
    
    dispose() {
      this.editor.destroy();
    }

    readOnly(state) {
      this.editor.dispatch({
        effects: readWriteCompartment.reconfigure(EditorState.readOnly.of(state))
      })
    }
    
    constructor(parent, data) {
      this.origin = parent;
      const origin = this.origin;
      
      const type = checkDocType(data);
      const initialLang = type.plugins;

      const self = this;

      this.origin.element.ocellref = self;

      const extensions = EditorExtensions.map((e) => e(self, initialLang));

      if (parent.noneditable) extensions.push(EditorView.editable.of(false));
      //if (type.className) extensions.push(EditorView.editorAttributes.of({class: type.className}))

      const editor = new EditorView({
        doc: unicodeToChar(data),
        extensions: extensions,
        parent: this.origin.element
      });

      
      this.editor = editor;
      this.editor.dom.ocellref = self;

      this.editor.viewState.state.config.eval = () => {
        origin.eval(this.editor.state.doc.toString());
      };
  
      if(globalCMFocus) editor.focus();
      globalCMFocus = false;  

      
      
      return this;
    }
  }

  core.ReadOnly = () => "ReadOnly"

  /* FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME */
  /* FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME */
  /* FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME */
  /* FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME FIXME */

  function unicodeToChar2(text) {
    return text.replace(/\\\\:[\da-f]{4}/gi, 
           function (match) {
                return String.fromCharCode(parseInt(match.replace(/\\\\:/g, ''), 16));
           }).replaceAll('\\:F74E', 'I').replace(/\\:[\da-f]{4}/gi, 
            function (match) {
                 return String.fromCharCode(parseInt(match.replace(/\\:/g, ''), 16));
            }).replace(/\\\|([\da-f]{4,6})/gi, function (match, hex) {
      return String.fromCodePoint(parseInt(hex, 16));
    });
  }

  //I HATE YOU WOLFRAM!!!

  //for dynamics
  core.EditorView = async (args, env) => {
    //cm6 inline editor (editable or read-only)
    
    let textData = await interpretate(args[0], env);



    textData = unicodeToChar2(textData);
    console.log('UNICODE Disaster');
    const options = await core._getRules(args, env);



    let evalFunction = () => {};

    let updateFunction = () => {};
    let state = textData;

    const ext = [];
    if (options.ReadOnly) {
      ext.push(EditorState.readOnly.of(true))
    }
    //console.warn(options);
    if ('Selectable' in options) {
      if (!options.Selectable)
        ext.push(EditorView.editable.of(false));
    }

    if (options.ForceUpdate) {
      env.local.forceUpdate = options.ForceUpdate
    }

    if (options.FullReset) {
      env.local.fullReset = options.FullReset;
    }

    if (options.ImageSize) {
      if (Array.isArray(options.ImageSize)) {
        env.element.style.width = options.ImageSize[0] + 'px';
        env.element.style.height = options.ImageSize[1] + 'px';
      } else {
        env.element.style.width = options.ImageSize + 'px';
      }
    }

    if (options.KeepMaxHeight) {
      env.local.height = 0;
      env.local.heightKeeper = setInterval(() => {
        const newHeight = Math.max(env.local.height, env.element.offsetHeight);
        if (!env.element.offsetHeight) return;
        if (env.local.height != newHeight && newHeight > 100) {
          env.local.height = newHeight;
          env.element.style.minHeight = env.local.height + 'px';
        }
      }, 1000);
    }

    if (options.KeepMaxWidth) {
      env.local.width = 0;
      env.local.widthKeeper = setInterval(() => {
        const newWidth = Math.max(env.local.width, env.element.offsetWidth);
        if (!env.element.offsetWidth) return;
        if (env.local.width != newWidth && newWidth > 100) {
          env.local.width = newWidth;
          env.element.style.minWidth = env.local.width + 'px';
        }
      }, 1000);
    }    

    if (options.Event) {
      //then it means this is like a slider
      updateFunction = (data) => {
        state = data;
        
        if (env.local.skip) {
          env.local.skip = false;
          return;
        }

        console.log('editor view emitt data: '+data); //[FIXME] move to a new API
        server.kernel.emitt(options.Event, '"'+data.replaceAll('\\\"', '\\\\\"').replaceAll('\"', '\\"')+'"', 'Input');
      }

      evalFunction = () => {
        server.kernel.emitt(options.Event, '"'+state.replaceAll('\\\"', '\\\\\"').replaceAll('\"', '\\"')+'"', 'Evaluate');
      }
      
    }



    if (env.local && false) {
      //if it is running in a container
      env.local.editor = compactWLEditor({doc: textData, parent: env.element, eval: evalFunction, update: updateFunction, extensions: ext});
    } else {
      env.local.editor = compactWLEditor({doc: textData, parent: env.element, eval: evalFunction, update: updateFunction, extensions: ext});
    }

    env.element.style.verticalAlign = "inherit";
    
  }

  core.StripOnInput = async () => {
    
  }

  core.EditorView.update = async (args, env) => {
    if (!env.local.editor) return;
    const textData = unicodeToChar2(await interpretate(args[0], env));
    console.log('editor view: dispatch');
    if (env.local.forceUpdate && false) { //option was removed since we fixed it
      env.local.editor.dispatch({
        changes: {from: 0, to: env.local.editor.state.doc.length, insert: ''}
      });
      env.local.editor.dispatch({
        changes: {from: 0, to: 0, insert: textData}
      });
    } else {
      env.local.skip = true;
      if (env.local.fullReset) {
        console.log('Editor full reset!!!');
        env.local.editor.dispatch({
          changes: {from: 0, to: env.local.editor.state.doc.length, insert: ''}
        });
      }
      env.local.editor.dispatch({
        changes: {from: 0, to: env.local.editor.state.doc.length, insert: textData}
      });
    }

  }

  core.EditorView.destroy = async (args, env) => {
    if (env.local.heightKeeper) {
      clearInterval(env.local.heightKeeper);
    }

    if (env.local.widthKeeper) {
      clearInterval(env.local.widthKeeper);
    }
    
    env.local.editor.destroy();

  }

  core.EditorView.virtual = true

  core.PreviewCell = (element, data) => {

  }
  
  window.SupportedLanguages.push({
    check: (r) => {return (r === null)},
    legacy: true, 
    plugins: mathematicaPlugins,
    name: 'mathematica'
  });

  window.SupportedLanguages.push({
    check: (r) => {return(r[0].match(/\w+\.(wl|wls)$/) != null)},
    plugins:  mathematicaPlugins,
    legacy: true, 
    name: 'mathematica'
  });


  window.SupportedCells['codemirror'] = {
    view: CodeMirrorCell,
    context: {
      EditorAutocomplete: EditorAutocomplete,
      javascriptLanguage: javascriptLanguage,
      javascript: javascript,
      markdownLanguage: markdownLanguage,
      markdown: markdown,
      htmlLanguage: htmlLanguage,
      html: html,
      cssLanguage: cssLanguage,
      css: css,
      syntaxTree: syntaxTree,
      linter: linter,
      EditorView: EditorView,
      EditorState: EditorState,
      highlightSpecialChars: highlightSpecialChars,
      syntaxHighlighting: syntaxHighlighting,
      defaultHighlightStyle: defaultHighlightStyle,
      editorCustomTheme: editorCustomTheme,
      foldGutter: foldGutter,
      Facet: Facet,
      Compartment: Compartment,
      mathematicaPlugins: mathematicaPlugins,
      legacyLangNameFacet: legacyLangNameFacet,
      DropPasteHandlers: DropPasteHandlers,
      EditorExtensionsMinimal: EditorExtensionsMinimal,
      EditorParameters: EditorParameters,
      EditorExtensions: EditorExtensions,
      StateField: StateField,
      StateEffect: StateEffect,
      Decoration: Decoration,
      Prec: Prec,
      EditorSelection: EditorSelection,
      keymap: keymap,
      ViewPlugin: ViewPlugin,
      WidgetType: WidgetType,
      originFacet: originFacet,
      MatchDecorator: MatchDecorator
    }
  };


  if (window.OfflineMode)
    extras.push(EditorState.readOnly.of(true))

function uuidv4() {
      return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
      );
}    

core.CellView = async (args, env) => {
  const opts = await core._getRules(args, env);

  if (!opts.Display) opts.Display = 'codemirror';

  const data = await interpretate(args[0], env);

  const container = {
    element: env.element,
    uid: uuidv4()
  };

  if (opts.Style) {
    env.element.style = opts.Style;
  }
  if (opts.Class) {
    env.element.classList.add(...(opts.Class.split(' ')))
  }

  if (opts.ImageSize) {
    if (Array.isArray(opts.ImageSize)) {
      env.element.style.width = opts.ImageSize[0] + 'px';
      env.element.style.height = opts.ImageSize[1] + 'px';
    } else {
      env.element.style.width = opts.ImageSize + 'px';
    }
  }
  

  env.local.cell = new window.SupportedCells[opts.Display].view(container, data);
}

core.CellView.virtual = true;

core.CellView.destroy = async (args, env) => {
  env.local.cell.dispose();
}

const editorHashMap = {};

core.FrontEditorSelected = async (args, env) => {
  console.log('check');
  const op = await interpretate(args[0], env);
  const options = await core._getRules(args, env);
  let editor = undefined;

  if (options.Editor) {
    editor = editorHashMap[options.Editor];
    console.log('Editor');
    console.log(options.Editor);
    console.log(editor);
  }

  

  switch(op) {
    case 'Get':
      return EditorSelected.get(editor);
    break;

    case 'Set':
      let data = await interpretate(args[1], env);
      //if (data.charAt(0) == '"') data = data.slice(1,-1);
      EditorSelected.set(data, editor);
    break;

    case 'GetDoc':
      return EditorSelected.getContent(editor);
    break;

    case 'SetDoc':
      let data2 = await interpretate(args[1], env);
      //if (data2.charAt(0) == '"') data2 = data2.slice(1,-1);
      EditorSelected.setContent(data2, editor);
    break;

    case 'Cursor':
      return EditorSelected.cursor(editor);
    break;

    case 'Type':
      return EditorSelected.type(editor);
    break;    

    case 'Editor':
      const key = uuidv4();
      editorHashMap[key] = EditorSelected.currentEditor();
      return key;
    break;
  }
}

//context anti-aliases
core['CoffeeLiqueur`Extensions`EditorView`FrontEditorSelected'] = core.FrontEditorSelected;
core['CoffeeLiqueur`Extensions`EditorViewMinimal`FrontEditorSelected'] = core.FrontEditorSelected;


class ShellCell {
    
  dispose() {

  }
  
  constructor(parent, data) {
    this.origin = parent;
    const result = document.createElement('div');
    result.classList.add(...('flex sc-b max-h-60 text-sm overflow-y-scroll'.split(' ')));
    result.style.overflowAnchor = 'auto';
    result.style.flexDirection = 'column-reverse';
    result.innerText = data;
    this.origin.element.appendChild(result);
    
    return this;
  }
}

window.SupportedCells['shell'] = {
  view: ShellCell
};
