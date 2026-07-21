import {
  EditorView,
  Decoration,
  ViewPlugin,
  WidgetType,
  MatchDecorator
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state"
import { isCursorInside } from "./utils";

import { processGreeksAll } from "../sugar/misc";

import { BallancedMatchDecorator2, matchArguments } from "./matcher";

import { keymap } from "@codemirror/view";
 
import { EditorSelection } from "@codemirror/state";

import { Balanced } from "node-balanced";

var compactCMEditor; 


function findRegion(offset, from, to, point) {
  let left = 0;
  let right = from.length - 1;
  console.log('testing');
  console.log(point);
  console.log(from.map((el) => el + offset));
  console.log(to.map((el) => el + offset));

  while (left <= right) {
      let mid = Math.floor((left + right) / 2);

      if (from[mid] + offset <= point && point <= to[mid] + offset) {
          return mid; // Point P is in the region [from[mid], to[mid]]
      } else if (point < from[mid] + offset) {
          right = mid - 1;
      } else {
          left = mid + 1;
      }
  }

  return -1; // Point P does not belong to any region
}

export function FractionBoxWidget(viewEditor) {
  compactCMEditor = viewEditor;
  const ref = {};
  return [
    //mathematicaMathDecoration,


    /*EditorState.transactionFilter.of((tr) => {
      console.log(tr);
      console.log(ref.placeholder);//.placeholder.chunk[0]);
      if (tr.selection && ref.placeholder) {
        if (tr.selection.ranges[0].from == tr.selection.ranges[0].to && ref.placeholder.placeholder.chunk[0]) {
          console.log(tr.changes.sections[0]);
          console.log({pos: ref.placeholder.placeholder.chunk[0].from, chunk: ref.placeholder.placeholder.chunk[0].to});
          
          if (findRegion(ref.placeholder.placeholder.chunkPos[0], ref.placeholder.placeholder.chunk[0].from, ref.placeholder.placeholder.chunk[0].to, tr.selection.ranges[0].from) > -1) {
            return false;
          }
        }
      }
      // return false;
      return tr
    }),*/

    placeholder(ref),
    keymap.of([{ key: "Ctrl-/", run: snippet() }])
  ];
}

function snippet() {
  return ({ state, dispatch }) => {
    if (state.readOnly) return false;
    let changes = state.changeByRange((range) => {
      let { from, to } = range;
      //if (atEof) from = to = (to <= line.to ? line : state.doc.lineAt(to)).to
      const prev = state.sliceDoc(from, to);
      if (prev.length === 0) {
        return {
          changes: { from, to, insert: "(*FB[*)((_)(*,*)/(*,*)(_))(*]FB*)" },
          range: EditorSelection.cursor(from)
        };
      }
      return {
        changes: { from, to, insert: "(*FB[*)(("+prev+")(*,*)/(*,*)(_))(*]FB*)" },
        range: EditorSelection.cursor(from)
      };
    });

    dispatch(
      state.update(changes, { scrollIntoView: true, userEvent: "input" })
    );
    return true;
  };
}

class EditorWidget {

  constructor(visibleValue, view, enumenator, denumenator, ref, placeholder) {
    this.view = view;
    this.visibleValue = visibleValue;
    this.placeholder = placeholder;

    this.args = matchArguments(visibleValue.str, /\(\*,\*\)/gm);

    const self = this;
    //ref.push(self);
    //console.log(visibleValue);

    console.log('creating InstanceWidget');

    let topEditor, bottomEditor;

    let activeEditor = true;

    const topDoc = self.args[0].body.slice(2,-1);
    if (topDoc.charAt(0) == '"') {
      if (!(/\(\*/.exec(topDoc))) {
        activeEditor = false;
      }
    }

    if (activeEditor) {
      topEditor = compactCMEditor({
        doc: topDoc,
        parent: enumenator,
        update: (upd) => this.applyChanges(upd, 0),
        eval: () => {
          view.viewState.state.config.eval();
        },
        evalNext: () => {
          view.viewState.state.config.evalNext();
        },
        extensions: [
          keymap.of([
            { key: "ArrowLeft", run: function (editor, key) {  
              if (editor.state.selection.main.head == 0) {
                
  
                view.dispatch({selection: {anchor: self.visibleValue.pos}});
                view.focus();
                
                return;
              } 
              
            } }, 
            { key: "ArrowRight", run: function (editor, key) {  
              if (editor.state.selection.main.head == editor.state.doc.length) {
                bottomEditor.dispatch({selection: {anchor: 0}});
                bottomEditor.focus();
    
                return;
              }
               
            } },             
            { key: "ArrowDown", run: function (editor, key) {  
              bottomEditor.focus();
              
            } }
          ]),
          EditorView.domEventHandlers({
            blur: (ev, v) => {
              enumenator.style.backgroundColor = '';
            },
            focus: (ev,v) => {
              const hue = Math.floor(Math.random() * 360); // Random hue between 0 and 359
              enumenator.style.backgroundColor = `hsl(${hue}, 100%, 90%)`;
            }
          })
        ]
      });
    } else {
      topEditor = {destroy:() => {}, setState:(newState) => {
        if (typeof newState == 'string') {
          processGreeksAll(enumenator.firstChild, newState.slice(1,-1), false);
        } else {
          enumenator.innerHTML = '';
          this.topEditor = new EditorView({
            newState,
            parent: enumenator
          });
        }
      }};
      const sp = document.createElement('span');
      processGreeksAll(sp, topDoc.slice(1,-1), false);
      enumenator.appendChild(sp);
    }
    

    activeEditor = true;

    const bottomDoc = self.args[2].body.slice(1,-2);
    if (bottomDoc.charAt(0) == '"') {
      if (!(/\(\*/.exec(bottomDoc))) {
        activeEditor = false;
      }
    }

    if (activeEditor) {
      bottomEditor = compactCMEditor({
        doc: bottomDoc,
        parent: denumenator,
        update: (upd) => this.applyChanges(upd, 2),
        eval: () => {
          view.viewState.state.config.eval();
        },
        evalNext: () => {
          view.viewState.state.config.evalNext();
        },
        extensions: [
          keymap.of([
            { key: "ArrowLeft", run: function (editor, key) {  
              if (editor.state.selection.main.head == 0) {
                //const range = self.placeholder.placeholder.placeholder;
                topEditor.dispatch({selection: {anchor: topEditor.state.doc.length}});
                topEditor.focus();
        
                return;
              } 
              
            } }, 
            { key: "ArrowRight", run: function (editor, key) {  
              if (editor.state.selection.main.head == editor.state.doc.length) {
                
                view.dispatch({selection: {anchor: self.visibleValue.pos + self.visibleValue.length}});
                view.focus();
              
  
                
                return;
              }
             
            } },             
            { key: "ArrowUp", run: function (editor, key) {  
              topEditor.focus();
              
            } }
          ]),
          EditorView.domEventHandlers({
            blur: (ev, v) => {
              denumenator.style.backgroundColor = '';
            },
            focus: (ev,v) => {
              const hue = Math.floor(Math.random() * 360); // Random hue between 0 and 359
              denumenator.style.backgroundColor = `hsl(${hue}, 100%, 90%)`;
            }
          })     
        ]  
      });  
    } else {
      bottomEditor = {destroy:() => {}, setState:(newState) => {
        if (typeof newState == 'string') {
          processGreeksAll(denumenator.firstChild, newState.slice(1,-1), false);
        } else {
          denumenator.innerHTML = '';
          this.bottomEditor = new EditorView({
            newState,
            parent: denumenator
          });
        }
      }};
      const sp = document.createElement('span');
      processGreeksAll(sp, bottomDoc.slice(1,-1), false);
      denumenator.appendChild(sp);      
    }
    

    self.args[0].length = self.args[0].body.length;
    self.args[2].length = self.args[2].body.length;

    //dont store strings...
    delete self.args[2].body;
    delete self.args[1].body;
    delete self.args[0].body;


    
    this.topEditor = topEditor;
    this.bottomEditor = bottomEditor;

    
  }

  applyChanges(update, pos) {
    const args = this.args;
    const relative = this.visibleValue.argsPos;

    if (pos == 0) {
      //uppder one
      const data = '(('+update+')';
      const changes = {from: relative + args[0].from, to: relative + args[0].from + args[0].length, insert: data};

      //update an imprint
      this.visibleValue.str = this.visibleValue.str.substring(0, args[0].from).concat(data, this.visibleValue.str.substring(args[0].from + args[0].length));

      //shift other positions
      const delta = data.length - args[0].length;

      args[0].to = args[0].to + delta;
      args[2].from = args[2].from + delta;

      args[0].length = data.length;

      this.visibleValue.length = this.visibleValue.length + delta;

      //console.log(changes);

      this.view.dispatch({changes: changes});
    } else {
      const data = '('+update+'))';

      const changes = {from: relative + args[2].from, to: relative + args[2].from + args[2].length, insert: data};
      //update an imprint
      this.visibleValue.str = this.visibleValue.str.substring(0, args[2].from).concat(data, this.visibleValue.str.substring(args[2].from + args[2].length));


      //shift other positions
      const delta = (data.length - args[2].length);
      args[2].to = args[2].to + delta;
      args[2].length = data.length;

      this.visibleValue.length = this.visibleValue.length + delta;

      //console.log(changes);

      this.view.dispatch({changes: changes});
      //lower one
    }
  }


  update(visibleValue, placeholder) {
    //console.log('Update instance: new ranges & arguments');
    
    if (this.visibleValue.str != visibleValue.str) {
      console.warn('Out of sync');
      const self = this;
      const view = this.view;
      this.visibleValue = visibleValue;

      //rematch all
      this.args = matchArguments(visibleValue.str, /\(\*,\*\)/gm);

      //console.log(visibleValue);
  
      console.log('recreating InstanceWidget');

      let topState, bottomState;

      let activeEditor = true;
      const topDoc = self.args[0].body.slice(2,-1);

      if (topDoc.charAt(0) == '"') {
        if (!(/\(\*/.exec(topDoc))) {
          activeEditor = false;
        }
      }
  
      if (activeEditor) {
        topState = compactCMEditor.state({
          doc: topDoc,
          update: (upd) => self.applyChanges(upd, 0),
          eval: () => {
            view.viewState.state.config.eval();
          },
          evalNext: () => {
            view.viewState.state.config.evalNext();
          },
          extensions: [
            keymap.of([
              { key: "ArrowLeft", run: function (editor, key) {  
                if (editor.state.selection.main.head == 0) {
                 
                  view.dispatch({selection: {anchor: self.visibleValue.pos}});
                  view.focus();
              
                  return;
                } 
                
              } }, 
              { key: "ArrowRight", run: function (editor, key) {  
                if (editor.state.selection.main.head == editor.state.doc.length) {
                  self.bottomEditor.dispatch({selection: {anchor: 0}});
                  self.bottomEditor.focus();
            
                  return;
                }
                  
              } },             
              { key: "ArrowDown", run: function (editor, key) {  
                self.bottomEditor.focus();
               
              } }
            ])
          ]
        });
      } else {
        topState = topDoc;
      }

      activeEditor = true;
      const bottomDoc = self.args[2].body.slice(1,-2);

      if (bottomDoc.charAt(0) == '"') {
        if (!(/\(\*/.exec(bottomDoc))) {
          activeEditor = false;
        }
      }
  
      if (activeEditor) {  
        bottomState = compactCMEditor.state({
          doc: bottomDoc,
  
          update: (upd) => self.applyChanges(upd, 2),
          eval: () => {
            self.view.viewState.state.config.eval();
          },
          evalNext: () => {
            self.view.viewState.state.config.evalNext();
          },
          extensions: [
            keymap.of([
              { key: "ArrowLeft", run: function (editor, key) {  
                if (editor.state.selection.main.head == 0) {
                  //const range = self.placeholder.placeholder.placeholder;
                  self.topEditor.dispatch({selection: {anchor: self.topEditor.state.doc.length}});
                  self.topEditor.focus();
                 
                  return;
                } 
                
              } }, 
              { key: "ArrowRight", run: function (editor, key) {  
                if (editor.state.selection.main.head == editor.state.doc.length) {
                  
                  view.dispatch({selection: {anchor: self.visibleValue.pos + self.visibleValue.length}});
                  view.focus();
                
    
                  return;
                }
                 
              } },             
              { key: "ArrowUp", run: function (editor, key) {  
                self.topEditor.focus();
               
              } }
            ])        
          ]  
        });         
      } else {
        bottomState = bottomDoc;
      }
  
       

      this.topEditor.setState(topState);
      this.bottomEditor.setState(bottomState);

      console.log(self);
  
      self.args[0].length = self.args[0].body.length;
      self.args[2].length = self.args[2].body.length;

      return;
    }


    this.visibleValue.pos = visibleValue.pos;
    this.placeholder = placeholder;
    this.visibleValue.argsPos = visibleValue.argsPos;
  }

  destroy() {
    //console.warn('destroy Instance of Widget!');
    this.topEditor.destroy();
    this.bottomEditor.destroy();
  }
}

class Widget extends WidgetType {
  constructor(visibleValue, ref, view, placeholder) {
    super();
    this.view = view;
    this.visibleValue = visibleValue;
    this.reference = ref;
    this.placeholder = placeholder;
    //console.log(atomicInstance);
    //console.log('construct');
  }

  eq(other) {
    return false;
    return this.visibleValue.str === other.visibleValue.str;
  }

  updateDOM(dom, view) {
    //console.log(this.visibleValue);
    //console.log(this);
    //console.log('update widget DOM');
    this.DOMElement = dom;

    dom.EditorWidget.update(this.visibleValue, this);

    return true
  }

  skipPosition(pos, oldPos, selected) {
    if (oldPos.from != oldPos.to || selected) return pos;
    //this.DOMElement.EditorWidget.wantedPosition = pos;
    if (pos.from - oldPos.from > 0) {
      //this.DOMElement.EditorWidget.topEditor.dispatch()
      this.DOMElement.EditorWidget.topEditor.dispatch({selection: {anchor: 0}});
      this.DOMElement.EditorWidget.topEditor.focus();
      //this.DOMElement.EditorWidget.topEditor.focus();
    } else {
      const editor = this.DOMElement.EditorWidget.bottomEditor;
      editor.dispatch({selection: {anchor: editor.state.doc.length}});
      editor.focus();
      //this.DOMElement.EditorWidget.bottomEditor.focus();
    }

    return oldPos;
  }

  toDOM(view) {
    console.log('Create a new one!');

    let span = document.createElement("span");
    span.classList.add('fraction');

    //console.log(this.visibleValue.args);

    const table      = document.createElement("table");
    table.classList.add('container');
    span.appendChild(table);
    
    const tbody      = document.createElement("tbody");
    table.appendChild(tbody);

    const tre        = document.createElement("tr");
    const trd        = document.createElement("tr");
    tbody.appendChild(tre);
    tbody.appendChild(trd);

    const enumenator  = document.createElement("td");
    enumenator.classList.add('enumenator');
    tre.appendChild(enumenator);

    const denumenator = document.createElement("td");
    trd.appendChild(denumenator);

    const self = this;

    span.EditorWidget = new EditorWidget(this.visibleValue, view, enumenator, denumenator, [], this);
    

    this.DOMElement = span;
      
    this.reference.push({destroy: () => {
      self.destroy(span);
    }});

    return span;
  }

  ignoreEvent() {
    return true;
  }

  destroy(dom) {
    //console.warn('destroy WindgetType')
    dom.EditorWidget.destroy();
  }
}

const matcher = (ref, view, placeholder) => {
  return new BallancedMatchDecorator2({
    tag: 'FB',
    decoration: (match) => {
      //console.log(match);
      return Decoration.replace({
        widget: new Widget(match, ref, view, placeholder)
      });
    }
  });
};

const placeholder = (ref) => ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.disposable = [];
      this.placeholder = matcher(this.disposable, view, this).createDeco(view);
      ref.placeholder = this;
      //ref.view = view});
    }
    update(update) {
      //console.log('update Deco');
      //console.log(this.disposable );
      this.placeholder = matcher(this.disposable, update, this).updateDeco(
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
        //console.warn(view);
      
        return (
          ((_a = view.plugin(plugin)) === null || _a === void 0
            ? void 0
            : _a.placeholder) || Decoration.none
        );
      })
  }
);
