import {
    EditorView,
    Decoration,
    ViewPlugin,
    WidgetType,
    MatchDecorator
  } from "@codemirror/view";
  import { isCursorInside } from "./utils";

import { processGreeksAll } from "../sugar/misc";

  import { BallancedMatchDecorator2, matchArguments  } from "./matcher";
  
  import { keymap } from "@codemirror/view";

  import { Mma } from "./../mma-uncompress/src/mma";
   
  import { EditorSelection } from "@codemirror/state";
  
  import { Balanced } from "node-balanced";
  
  var compactCMEditor; 
  
  export function GridBoxWidget(viewEditor) {
    compactCMEditor = viewEditor;
    return [
      //mathematicaMathDecoration,
      placeholder,
      //keymap.of([{ key: "Ctrl-m", run: snippet() }])
    ];
  }
  
  const itemBox = /"(.+)"\(\*VB\[\*\)\(\*\*\)\(\*\,\*\)\(\*\"([\w:\d=+-/]*)/;

  
  class EditorWidget {
  
    constructor(visibleValue, view, tbody, ref) {
      this.view = view;
      this.visibleValue = visibleValue;
      const self = this;

      const cuid = uuidv4();
      let globalScope = {call: cuid, EditorWidget: self, allowCellHighlighting: false};

      //ref.push(self);

      this.tbody = tbody;

      this.args = matchArguments(visibleValue.str, /\(\*\|\|\*\)/gm).map((arg, index)=>{
        if (index % 2 != 0) return arg;
        return {...arg, body: matchArguments(arg.body, /\(\*\|\*\)/gm)}
      });

      if (!Array.isArray(this.args[this.args.length-1].body)) {
        this.decorator = this.args.pop();
      }
  
      //console.warn(this.args);
      //return;
      //return;
      const args = this.args;
 
  
      console.log('creating InstanceWidget');
  
      for (let i = 0; i < this.args.length; i+=2) {
        const tr        = document.createElement("tr");
        const cols = this.args[i].body;
  
        for (let j = 0; j < cols.length; j+=2) {
          const td = document.createElement("td");
          let text = cols[j].body;

          if (j ==  0 && i ==  0) text = text.slice(2);
          if (j ==  0 && i !=  0) text = text.slice(1);

          if (j == cols.length-1 && i == this.args.length-1) text = text.slice(0,-2);
          if (j == cols.length-1 && i != this.args.length-1) text = text.slice(0,-1);

          
          
          if (text.charAt(0) != '"') {
    
            cols[j].editor = compactCMEditor({
              doc: text,
              parent: td,
              eval: () => {
                view.viewState.state.config.eval();
              },
              evalNext: () => {
                view.viewState.state.config.evalNext();
              },
              update: (upd) => this.applyChanges(upd, i,j),
              extensions: [
                keymap.of([
                  { key: "ArrowLeft", run: function (editor, key) {  
                    if (globalScope.disableCellSelecting) return;
                    if (editor.state.selection.main.head == 0 && !editor.stringOnly)
                      if (j - 2 >= 0) {
                        if (cols[j-2].editor.stringOnly) return;
                        cols[j-2].editor.dispatch({selection:{anchor:cols[j-2].editor.state.doc.length}});
                        cols[j-2].editor.focus();
                        
                        return;
                      } else {
                        view.dispatch({selection: {anchor: self.visibleValue.pos}});
                        view.focus();

                        
                        return;
                      }
                    
                    
                  } }, 
                  { key: "ArrowRight", run: function (editor, key) {  
                    if (globalScope.disableCellSelecting) return;
                    if (editor.state.selection.main.head == editor.state.doc.length && !editor.stringOnly)
                      if (j + 2 < cols.length) {
                        if (cols[j+2].editor.stringOnly) return;
                        cols[j+2].editor.dispatch({selection:{anchor:0}});
                        cols[j+2].editor.focus();
                  
                        return;
                      } else {
                        //view.focus();
                        view.dispatch({selection: {anchor: self.visibleValue.pos + self.visibleValue.length}});
                        view.focus();

                       
                        return;
                      }
                    
                     
                  } },             
                  { key: "ArrowUp", run: function (editor, key) {  
                    if (globalScope.disableCellSelecting) return;
                    //if (editor?.editorLastCursor === editor.state.selection.ranges[0].to)
                      if (i - 2 >= 0) {
                        args[i-2].body[j].editor.focus();
                        
                        return;
                      } else {
                        //view.focus();
                      }
                    
                    //editor.editorLastCursor = editor.state.selection.ranges[0].to;  
                  } },             
                  { key: "ArrowDown", run: function (editor, key) {  
                    if (globalScope.disableCellSelecting) return;
                    //if (editor?.editorLastCursor === editor.state.selection.ranges[0].to)
                      if (i + 2 < args.length) {
                        args[i+2].body[j].editor.focus();
                        
                        return;
                      } else {
                        //view.focus();
                      }
                    
                    //editor.editorLastCursor = editor.state.selection.ranges[0].to;  
                  } }

                  
                ]),

                EditorView.domEventHandlers({
                    blur: (ev, v) => {
                      if (globalScope.allowCellHighlighting) td.style.backgroundColor = '';
             
                    },
                    focus: (ev,v) => {
                      if (globalScope.disableCellSelecting) {
                        v.contentDOM.setAttribute("contenteditable","false");
                        return;
                      }
                      if (!globalScope.allowCellHighlighting) return;
                      const hue = Math.floor(Math.random() * 360); // Random hue between 0 and 359
                      td.style.backgroundColor = `hsl(${hue}, 100%, 90%)`;
                    }
                  })
              ] 
            });
          } else {
            cols[j].editor = {
              destroy: () => {},
              focus: () => {},
              dispatch: () => {},
              stringOnly: true
            };

            const itemDesc = text.match(itemBox);

            if (itemDesc) {  //stylize the text
              //td.innerHTML = itemDesc[1];
              processGreeksAll(td, itemDesc[1], false);
              td.classList.add('selectable', 'sm-controls');
              //throw(itemDesc);

              const decoded = Mma.DecompressDecode(itemDesc[2]);
              const json = Mma.toArray(decoded.parts[0]);
              const cuid = uuidv4();
              let global = {call: cuid};
              let env = {global: global, element: td}; //Created in CM6
              interpretate(json, env);    

            } else {
              processGreeksAll(td, text.slice(1,-1), false);
              td.classList.add('selectable', 'sm-controls');
            }
          }


          //remove unnecesary
          delete cols[j].body;
  
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }   
      
      //console.log(this.args);

      if (this.decorator) {
        //console.log(this.decorator);
        const decoded = Mma.DecompressDecode(this.decorator.body.slice(2,-2));
        const json = Mma.toArray(decoded.parts[0]);
        
        let env = {global: globalScope, element: tbody}; //Created in CM6
        this.interpretated = interpretate(json, env);
      }
  
      
    }
  
    applyChanges(update, i,j) {
      
      const args = this.args;
      const parent = this.args[i].body;

      const relative1 = this.visibleValue.argsPos;
      const relative2 = this.args[i].from;

      let text = update;

      if (j ==  0 && i ==  0) text = '{{'+text;
      if (j ==  0 && i !=  0) text = '{'+text;

      if (j == parent.length-1 && i == args.length-1) text = text+'}}';
      if (j == parent.length-1 && i != args.length-1) text = text+'}';      

      const oldLength = parent[j].length;
      const changes = {from: relative1 + relative2 + parent[j].from, to: relative1 + relative2 + parent[j].from + oldLength, insert: text};
   
      const delta = text.length - oldLength;
      //shift the next in a row
      for (let jj=j+1; jj<parent.length; jj+=1) {
        parent[jj].from += delta;
      }

      //shift the next in the col
      for (let ii=i+1; ii<args.length; ii+=1) {
        args[ii].from += delta;
      }

      this.args[i].length += delta;

      this.visibleValue.length = this.visibleValue.length + delta;

      //apply 
      parent[j].length = text.length;


      //console.log(changes);
      //console.log(this.args);
  
      this.view.dispatch({changes: changes});      
    }
  
  
    update(visibleValue) {
      //console.log('Update instance: new ranges & arguments');
      console.log('We cant verify if changes were applied from the widget itself!');
      this.visibleValue.pos = visibleValue.pos;
      this.visibleValue.argsPos = visibleValue.argsPos;
      //this.visibleValue.args = visibleValue.args;
    }
  
    destroy() {
      console.warn('destroy Instance of Widget!');
      for (let i = 0; i < this.args.length; i+=2) {
        const cols = this.args[i].body;
  
        for (let j = 0; j < cols.length; j+=2) {
          cols[j].editor.destroy();
        }
      }
    }
  }
  
  class Widget extends WidgetType {
    constructor(visibleValue, ref, view) {
      super();
      this.view = view;
      this.visibleValue = visibleValue;
      this.reference = ref;
      //console.log('construct');
    }
  
    eq(other) {
      return false;
      return this.visibleValue.str === other.visibleValue.str;
    }
  
    updateDOM(dom, view) {
      //console.log(this.visibleValue);
      //console.log(this);
      console.log('update widget DOM');
      this.DOMElement = dom;
      dom.EditorWidget.update(this.visibleValue);
  
      return true
    }
  
    toDOM(view) {
      console.log('Create a new one!');
  
      let span = document.createElement("span");
      span.classList.add('matrix');
  
      const table      = document.createElement("table");
      table.classList.add('container');
      span.appendChild(table);
      
      const tbody      = document.createElement("tbody");
      table.appendChild(tbody);
  
      span.EditorWidget = new EditorWidget(this.visibleValue, view, tbody, []);
      const self = this;
      
      this.reference.push({destroy: () => {
        self.destroy(span);
      }});  

      this.DOMElement = span;
  
      return span;
    }

    skipPosition(pos, oldPos, selected) {
      if (oldPos.from != oldPos.to || selected) return pos;

      if (pos.from - oldPos.from > 0) {
        this.DOMElement.EditorWidget.args[0].body[0].editor.dispatch({selection: {anchor: 0}});
        this.DOMElement.EditorWidget.args[0].body[0].editor.focus();
      } else {
        const args = this.DOMElement.EditorWidget.args;
        //console.log(this.DOMElement.EditorWidget);
        const editor = args[args.length - 1].body[args[args.length - 1].body.length - 1].editor;
        editor.dispatch({selection: {anchor: editor.state.doc.length}});
        editor.focus();
      }
  
      return oldPos;
    }    
  
    ignoreEvent() {
      return true;
    }
  
    destroy(dom) {
      dom.EditorWidget.destroy();
    }
  }
  
  const matcher = (ref, view) => {
    return new BallancedMatchDecorator2({
      tag: 'GB',
      decoration: (match) => {
        
        return Decoration.replace({
          widget: new Widget(match, ref, view)
        });
      }
    });
  };
  
  const placeholder = ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.disposable = [];
        this.placeholder = matcher(this.disposable, view).createDeco(view);
      }
      update(update) {
        //console.log('update Deco');
        //console.log(this.disposable );
        this.placeholder = matcher(this.disposable, update).updateDeco(
          update,
          this.placeholder
        );
      }
      destroy() {
        //console.log("removed holder");
        //console.log("disposable");
        //console.log(this.disposable);
        this.disposable.forEach((el) => {
          el.destroy();
        });
      }
    },
    {
      decorations: (instance) => instance.placeholder,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => {
          var _a;
        
          return (
            ((_a = view.plugin(plugin)) === null || _a === void 0
              ? void 0
              : _a.placeholder) || Decoration.none
          );
        })
    }
  );
