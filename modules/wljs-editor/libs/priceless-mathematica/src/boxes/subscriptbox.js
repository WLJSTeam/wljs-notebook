import {
  EditorView,
  Decoration,
  ViewPlugin,
  WidgetType,
  MatchDecorator
} from "@codemirror/view";
import { isCursorInside } from "./utils";

import { processGreeksAll } from "../sugar/misc";

import { BallancedMatchDecorator2, matchArguments } from "./matcher";

import { keymap } from "@codemirror/view";
 
import { EditorSelection } from "@codemirror/state";

import { Balanced } from "node-balanced";

var compactCMEditor; 

export function SubscriptBoxWidget(viewEditor) {
  compactCMEditor = viewEditor;
  return [
    //mathematicaMathDecoration,
    placeholder,
    keymap.of([{ key: "Ctrl--", run: snippet() }])
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
          changes: { from, to, insert: "(*SbB[*)Subscript[_(*|*),(*|*)_](*]SbB*)" },
          range: EditorSelection.cursor(from)
        };
      }
      return {
        changes: { from, to, insert: "(*SbB[*)Subscript["+ prev +"(*|*),(*|*)_](*]SbB*)" },
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

  constructor(visibleValue, view, head, sub, ref) {
    this.view = view;
    this.visibleValue = visibleValue;
    const self = this;

    this.args = matchArguments(visibleValue.str, /\(\*\|\*\)/gm);

    //console.log(visibleValue);

    console.log('creating InstanceWidget');

    let topEditor, bottomEditor;

    console.log(self.visibleValue);
    let activeEditor = true;

    const topDoc = self.args[0].body.slice(10);
    if (topDoc.charAt(0) == '"') {
      if (!(/\(\*/.exec(topDoc))) {
        activeEditor = false;
      }
    }

    if (activeEditor) {
      topEditor = compactCMEditor({
        doc: topDoc,
        parent: head,
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
                view.dispatch({selection: {anchor: self.visibleValue.pos }});
                view.focus();
                
                return;
              }
             
            } },   
            { key: "ArrowRight", run: function (editor, key) {  
              if (editor.state.selection.main.head == editor.state.doc.length) {
                if (bottomEditor.passiveMode) { 
                    
                    return;
                }                
                bottomEditor.dispatch({selection:{anchor: 0}});
                bottomEditor.focus();
                
              
                return;
              }
                
            } },

            { key: "ArrowDown", run: function (editor, key) {  
              if (bottomEditor.passiveMode) { 
                    return;
              }                
              bottomEditor.focus();
            } },

            EditorView.domEventHandlers({
            blur: (ev, v) => {
              head.style.backgroundColor = '';
            },
            focus: (ev,v) => {
              const hue = Math.floor(Math.random() * 360); // Random hue between 0 and 359
              head.style.backgroundColor = `hsl(${hue}, 100%, 90%)`;
            }
          })
          ])
        ]
      });
    } else {
      topEditor = {passiveMode:true, destroy:() => {}, setState:(newState) => {
        if (typeof newState == 'string') {
          processGreeksAll(head.firstChild, newState.slice(1,-1), false);
        } else {
          head.innerHTML = '';
          this.topEditor = new EditorView({
            newState,
            parent: head
          });
        }
      }};
      const sp = document.createElement('span');
      sp.style.color = "#777";
      processGreeksAll(sp, topDoc.slice(1,-1), false);
      head.appendChild(sp);
    }

    activeEditor = true;

    const bottomDoc = self.args[2].body.slice(0, -1);
    if (bottomDoc.charAt(0) == '"') {
      if (!(/\(\*/.exec(bottomDoc))) {
        activeEditor = false;
      }
    }    

    if (activeEditor) {
      bottomEditor = compactCMEditor({
        doc: bottomDoc,
        parent: sub,
        update: (upd) => this.applyChanges(upd, 2),
        eval: () => {
          view.viewState.state.config.eval();
        },
        evalNext: () => {
          view.viewState.state.config.evalNext();
        },
        extensions: [
          keymap.of([
            { key: "ArrowRight", run: function (editor, key) {  
              if (editor.state.selection.main.head == editor.state.doc.length) {
                view.dispatch({selection: {anchor: self.visibleValue.pos + self.visibleValue.length}});
                view.focus();
                
                return;
              }
             
            } },   
            { key: "ArrowLeft", run: function (editor, key) {  
              if (editor.state.selection.main.head == 0) {
                if (topEditor.passiveMode) {
                  
                  return;
                }
                topEditor.dispatch({selection:{anchor: topEditor.state.doc.length}});
                topEditor.focus();
                
                return;
              }

              
            } },

            { key: "ArrowUp", run: function (editor, key) {  
                if (topEditor.passiveMode) {
                  return;
                }              
              topEditor.focus();
            } },

            EditorView.domEventHandlers({
            blur: (ev, v) => {
              sub.style.backgroundColor = '';
            },
            focus: (ev,v) => {
              const hue = Math.floor(Math.random() * 360); // Random hue between 0 and 359
              sub.style.backgroundColor = `hsl(${hue}, 100%, 90%)`;
            }
          })
          ])
        ]            
      });
    } else {
      bottomEditor = {passiveMode:true, destroy:() => {}, setState:(newState) => {
        if (typeof newState == 'string') {
          processGreeksAll(sub.firstChild, newState.replaceAll('"',''), false);
        } else {
          sub.innerHTML = '';
          this.bottomEditor = new EditorView({
            newState,
            parent: sub
          });
        }
      }};

      const sp = document.createElement('span');
      sp.style.color = "#777";
      processGreeksAll(sp, bottomDoc.replaceAll('"',''), false);
      sub.appendChild(sp);
    }

    //if (focusNext) bottomEditor.focus();
    //focusNext = false;    
    
    this.topEditor = topEditor;
    this.bottomEditor = bottomEditor;

    self.args[0].length = self.args[0].body.length;
    self.args[2].length = self.args[2].body.length;

    //dont store strings...
    delete self.args[2].body;
    delete self.args[1].body;
    delete self.args[0].body;
    
    //ref.push(self);
  }

  applyChanges(update, pos) {
    const args = this.args;
    const relative = this.visibleValue.argsPos;

    if (pos == 0) {
      //uppder one
      const data = 'Subscript['+update;
      const changes = {from: relative + args[0].from, to: relative + args[0].from + args[0].length, insert: data};

      //console.error('Before');
      //console.warn(this.visibleValue.str);
      //console.warn(changes);
      

      //update imprint string
      this.visibleValue.str = this.visibleValue.str.substring(0, args[0].from).concat(data, this.visibleValue.str.substring(args[0].from + args[0].length));

      //console.warn(this.visibleValue.str)

      //shift other positions
      args[0].to = args[0].to + (data.length - args[0].length);
      args[2].from = args[2].from + (data.length - args[0].length);

      const delta = data.length - args[0].length;
      args[0].length = data.length;

      this.visibleValue.length = this.visibleValue.length + delta;

      
      
      //console.log(changes);

      this.view.dispatch({changes: changes});
    } else {
      const data = update+']';

      const changes = {from: relative + args[2].from, to: relative + args[2].from + args[2].length, insert: data};

      //update imprint string to compare later changes
      this.visibleValue.str = this.visibleValue.str.substring(0, args[2].from).concat(data, this.visibleValue.str.substring(args[2].from + args[2].length));


      //shift other positions
      args[2].to = args[2].to + (data.length - args[2].length);
      const delta = data.length - args[2].length;
      args[2].length = data.length;

      //console.log(changes);
      this.visibleValue.length = this.visibleValue.length + delta;

      this.view.dispatch({changes: changes});
      //lower one
    }
  }


  update(visibleValue) {
    //console.log('Update instance: new ranges & arguments');
    

    if (this.visibleValue.str != visibleValue.str) {
      console.warn('Out of sync');
      const self = this;
      const view = this.view;
      this.visibleValue = visibleValue;

      //rematch all
      this.args = matchArguments(visibleValue.str, /\(\*\|\*\)/gm);
  
      //console.log(visibleValue);
  
      console.log('recreating InstanceWidget');
  
      let topState, bottomState;
  
      console.log(self.visibleValue);
      let activeEditor = true;
      const topDoc = self.args[0].body.slice(10);

      if (topDoc.charAt(0) == '"') {
        if (!(/\(\*/.exec(topDoc))) {
          activeEditor = false;
        }
      }
  
      if (activeEditor) {
        topState = compactCMEditor.state({
          doc: topDoc,
          update: (upd) => self.applyChanges(upd, 0),
          extensions: [
            keymap.of([
              { key: "ArrowLeft", run: function (editor, key) {  
                if (editor.state.selection.main.head == 0) {
                  view.dispatch({selection: {anchor: self.visibleValue.pos }});
                  view.focus();
                  
                  return;
                }
                
              } },   
              { key: "ArrowRight", run: function (editor, key) {  
                if (editor.state.selection.main.head == editor.state.doc.length) {
                  if (self.bottomEditor.passiveMode) { 
                    
                    return;
                  }

                  self.bottomEditor.dispatch({selection:{anchor: 0}});
                  self.bottomEditor.focus();
                  
                
                  return;
                }
                
              } },
    
              { key: "ArrowDown", run: function (editor, key) {  
                if (self.bottomEditor.passiveMode) { 
                    return;
                }
                self.bottomEditor.focus();
              } }
            ])
          ]
        });
      } else {
        topState = topDoc;
      }

      activeEditor = true;
      const bottomDoc = self.args[2].body.slice(0, -1);

      if (bottomDoc.charAt(0) == '"') {
        if (!(/\(\*/.exec(bottomDoc))) {
          activeEditor = false;
        }
      }
  
      if (activeEditor) {
        bottomState = compactCMEditor.state({
          doc: bottomDoc,
          update: (upd) => self.applyChanges(upd, 2),
          extensions: [
            keymap.of([
              { key: "ArrowRight", run: function (editor, key) {  
                if (editor.state.selection.main.head == editor.state.doc.length) {
                  view.dispatch({selection: {anchor: self.visibleValue.pos + self.visibleValue.length}});
                  view.focus();
          
                  return;
                }
                
              } },   
              { key: "ArrowLeft", run: function (editor, key) {  
                if (editor.state.selection.main.head == 0) {
                  if (self.topEditor.passiveMode) {
                    
                    return;
                  }
                  self.topEditor.dispatch({selection:{anchor: self.topEditor.state.doc.length}});
                  self.topEditor.focus();
                  
                  return;
                }
                  
                
              } },
    
              { key: "ArrowUp", run: function (editor, key) {  
                if (self.topEditor.passiveMode) { 
                    return;
                }
                self.topEditor.focus();
              } }
            ])
          ]            
        });
      } else {
        bottomState = bottomDoc;
      }
      
  
      //if (focusNext) bottomEditor.focus();
      //focusNext = false;    
      
      this.topEditor.setState(topState);
      this.bottomEditor.setState(bottomState);
  
      self.args[0].length = self.args[0].body.length;
      self.args[2].length = self.args[2].body.length;

      return;
    }

    this.visibleValue.pos = visibleValue.pos;
    this.visibleValue.argsPos = visibleValue.argsPos;
    //this.visibleValue.args = visibleValue.args;
  }

  destroy() {
    console.warn('destroy Instance of Widget!');
    this.topEditor.destroy();
    this.bottomEditor.destroy();
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

  skipPosition(pos, oldPos, selected) {
    if (oldPos.from != oldPos.to || selected) return pos;

    const p = this.DOMElement.EditorWidget;
    if (p.topEditor.passiveMode || p.bottomEditor.passiveMode) return pos;

    if (pos.from - oldPos.from > 0) {
      //this.DOMElement.EditorWidget.topEditor.dispatch()
      if (p.topEditor.passiveMode) return oldPos;

      p.topEditor.dispatch({selection: {anchor: 0}});
      p.topEditor.focus();
      //this.DOMElement.EditorWidget.topEditor.focus();
    } else {
      if (p.bottomEditor.passiveMode) return oldPos;
      const editor = p.bottomEditor;
      editor.dispatch({selection: {anchor: editor.state.doc.length}});
      editor.focus();
      //this.DOMElement.EditorWidget.bottomEditor.focus();
    }  

    return oldPos;
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

    const span = document.createElement("span");
    const head = document.createElement("span");
    head.classList.add("subscript-tail");
    
    const sub = document.createElement("sub");
    sub.classList.add("subscript-tail");

    span.appendChild(head);
    span.appendChild(sub);

    span.EditorWidget = new EditorWidget(this.visibleValue, view, head, sub, []);

    const self = this;
      
    this.reference.push({destroy: () => {
      self.destroy(span);
    }});

    this.DOMElement = span;

    return span;
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
    tag: 'SbB',
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
