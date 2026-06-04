;;
function __emptyFalse(a) {
  if (a === '') return false;
  return a;
}

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

//CELL TYPES / LANGUAGES
window.SupportedCells = {};
window.SupportedLanguages = [];
//GLobals
window.Extensions = [];

window.CellHashStorage = {};

const CellHash = {
  add: (obj) => {
    CellHashStorage[obj.uid] = obj;
  },

  get: (uid) => {
    return CellHashStorage[uid];
  },

  remove: (uid) => {
    CellHashStorage[uid] = undefined;
  },

}

const Notebook = {};
      Notebook.add = (sign, list) => {
        
        if (sign in Notebook) {
          if (list) Notebook[sign].Cells = list;
          return Notebook[sign];
        }
        Notebook[sign] = {
          element: document.getElementById("container-"+sign),
          Cells: []
        };
        if (list) Notebook[sign].Cells = list;
        return Notebook[sign];
      }

core.CellHash = CellHash;
core.Notebook = Notebook;

let currentCell;

let forceFocusNew = false;
let focusDirection = 1;

const focusable = class {
  origin;
  element;
  handler = {};
  action = {};
  skipOutputs = false;

  constructor(obj) {
    this.origin = obj.origin;
    this.element = obj.element;
    this.handler = obj.handler;

    obj.origin.inner.focusable.push(this);
  }

  findIndex() {
    return this.origin.inner.focusable.indexOf(this)
  }

  focusNext() {
    const i = this.findIndex();
    if (this.origin.inner.focusable.length-1 == i) {
      this.origin.focusNext(this.skipOutputs, i+1);
      return;
    }

    this.origin.inner.focusable[i+1].focus(this.skipOutputs);
  }

  focusPrev() {
    const i = this.findIndex();
    if (i == 0) {
      const prev = this.origin;

      if (prev.display.editor && !prev.invisible && !prev.props["Locked"]) {
        prev.focus(-1);
      } else {
        //go futher
        console.warn('further');
        prev.focusPrev(false, -1);
      }

      return;
    }

    this.origin.inner.focusable[i-1].focus(this.skipOutputs);
  }

  focus(skipOutputs=false, backwards=false) {
    this.skipOutputs = skipOutputs;
    this.backwards = backwards;

    console.log('Focused!');
    if (this.handler.onfocus) this.handler.onfocus(this);
  }

  blur(skipOutputs=false, forced=false) {
    this.skipOutputs = skipOutputs;
    if (this.handler.onblur) this.handler.onblur(this);
  }
}

window.CellWrapper = class {
  uid = ''
  notebook = ''
  type = "Input"
  element;
  inner = {
    focusable: []
  };

  static forceFocusNew = () => {
    forceFocusNew = true;
  }

  static inputSaveDelay = 180

  static epilog = []
  static prolog = []
  static focusable = focusable

  static remove = (uid, ev) => {
    CellHash.get(uid).dispose();
  }

  static scrollTo = (uid, opts = {}) => {
    CellHash.get(uid).scrollTo(opts);
  }

  static morph = (uid, template, props) => {
    CellHash.get(uid).morph(template, props);
  }

  static getCell = (uid) => {
    return CellHash.get(uid);
  }

  static moveToContainer = (uid, element) => {
    const cell = CellHash.get(uid);
    element.appendChild(cell.element);
  }

  static setContent = (uid, content) => {
    CellHash.get(uid).setContent(content);
  }

  static toggleCell = (uid) => {
    CellHash.get(uid).toggle(true);
  }

  static vanishCell = (uid) => {
    CellHash.get(uid).vanish();
  }

  static fadeCell = (uid) => {
    CellHash.get(uid).fade(true);
  }

  static lockCell = (uid) => {
    CellHash.get(uid).lock();
  }  

  

  static setInit = (uid, state) => {
    CellHash.get(uid).setInit(state);
  }

  static unhideAll = (nid) => {
    const list = Notebook[nid].Cells; 
    if (!list) return;
    
    list.forEach((h) => {
      const cell = CellHash.get(h);
      if (cell.type == 'Input' && !cell.invisible) {
        cell.toggle(false);
      }
    });
  }

  channel;

  focusNext(skipOutputs = false, findex = 0, skipFocusable = false) {
    //console.log(this.inner.focusable);
    if (this.inner.focusable[findex] && !skipFocusable) {
      this.inner.focusable[findex].focus(skipOutputs, true);
      return;
    }

    console.log('next');
    console.log('skip outputs?: ', skipOutputs);
    focusDirection = 1;

    const list = Notebook[this.notebook].Cells; 

    const pos = list.indexOf(this.uid);
    if (pos + 1 < list.length) {
      const next = CellHash.get(list[pos + 1]);
      console.log([next.display.editor, (!skipOutputs || (next.type == 'Input')), !next.invisible, !next.props["Locked"]]);
      if (next.display.editor && (!skipOutputs || (next.type == 'Input')) && !next.invisible && !next.props["Locked"]) {
        
        next.focus(1);
      } else {
        //go futher
        if (skipFocusable) next.focusNext(skipOutputs, 0, true); else next.focusNext();
      }
    } else {
      CellWrapper.forceFocusNew();
      this.addCellAfter();
    }
  }

  focus(dir) {
    if (!this.display.editor) return;

    const self = this;
    if (self.props["Hidden"] && self.type == 'Input') {
      //temporary unhide it
      self.toggle(false);
      self.display.focus(dir);

      function leftFocus() {
        self.toggle(false);
        self.element.removeEventListener('focusout', leftFocus);
      }

      self.element.addEventListener('focusout', leftFocus);            
    } else if (self.props["Fade"] && self.type == 'Input') {
      //temporary unhide it
      self.fade(false);
      self._fade_block = true;
      self.display.focus(dir);

      function leftFocus() {
        self.fade(false);
        self._fade_block = false;
        self.element.removeEventListener('focusout', leftFocus);
      }

      self.element.addEventListener('focusout', leftFocus);       
    } {
      self.display.focus(dir);
    }
  }

  focusPrev(startpoint, findex = 99) {
    console.log('prev');
    focusDirection = -1;


    const list = Notebook[this.notebook].Cells; 

    const pos = list.indexOf(this.uid);

    if (pos - 1 >= 0) {
      const prev = CellHash.get(list[pos - 1]);

      let _index = findex;
      if (_index == 99) _index = this.inner.focusable.length-1;

      if (prev.inner.focusable[_index]) {
        prev.inner.focusable[_index].focus(false, false);
        return;
      }

      if (prev.display.editor && !prev.invisible && !prev.props["Locked"]) {
        prev.focus(-1);
      } else {
        //go futher
        prev.focusPrev();
      }
      
    }
  }

  vanish() {
    this.group.classList.toggle('invisible-cell');
    if (this.invisible) {
      this.invisible  = false;
      if (this.display.editor) {
        this.display.readOnly(false);
      }       
    } else {
      this.invisible = true;
      if (this.display.editor) {
        this.display.readOnly(true);
      }       
    }
  }

  fade() {
    if (this.type == 'Output') return;
    const wrapper = document.getElementById(this.uid);
    wrapper.classList.toggle('h-fade-20');

    if (!this.props["Fade"]) {
      this.setProp('Fade', true);
    } else {
      this.setProp('Fade', false);
    }    
  }

  lock() {
    if (this.type == 'Output') return;
    const wrapper = document.getElementById(this.uid);
    wrapper.classList.toggle('blur');

    if (!this.props["Locked"]) {
      this.setProp('Locked', true);
      if (this.display.editor) {
        this.display.readOnly(true);
      }
    } else {
      this.setProp('Locked', false);
      if (this.display.editor) {
        this.display.readOnly(false);
      }      
    }    
  }  
  
  toggle(jump = true) {
    if (this.type == 'Output') return;

    const list = Notebook[this.notebook].Cells; 
    const pos = list.indexOf(this.uid);

    if (!(pos + 1 < list.length) && !(this.props["Hidden"] === true)) {
      //alert('There are no output cells to be hidden');
      return;
    }
    if (CellHash.get(list[pos + 1]).type != 'Output' && !(this.props["Hidden"] === true)) {
      //alert('There are no output cells to be hidden');
      return;
    }

    const wrapper = document.getElementById(this.uid);
    wrapper.classList.toggle('hidden');

    if (!this.props["Hidden"]) {
      this.setProp('Hidden', true);
    } else {
      this.setProp('Hidden', false);
    }

    if (jump) this.focusNext(true);

    return true;
  }

  //private
  _listeners = {}

  _event(type, data) {
    if (this._listeners[type])
      this._listeners[type].forEach((el) => el(data));
  }
  //end of private

  addEventListener(type, handler) {
    if (!Array.isArray(this._listeners[type])) this._listeners[type] = [];
    this._listeners[type].push(handler);
  }

  setProp(key, value) {
    this.props[key] = value;
    const uid = this.uid;
    server.emitt(this.channel, '"'+JSON.stringify({Cell: uid, Key: key, Value: value}).replace(/"/gm, "\\\"")+'"', "SetProperty");
    this._event('property', {key: key, value: value, self:this});
  }

  addCellAfter() {
    server.emitt(this.channel, '"'+this.uid+'"', 'AddAfter');
    this._event('addafter', {uid: this.uid, self:this});
  }

  addCellBefore() {
    server.emitt(this.channel, '"'+this.uid+'"', 'AddBefore');
    this._event('addbefore', {uid: this.uid, self:this});
  }  

  findInput() {
    const self = this;
    if (this.type == 'Input') return self;
    const list = Notebook[this.notebook].Cells;
    return CellHash.get(list[list.indexOf(self.uid)-1]).findInput();
  }

  save(content) {
    //const fixed = content.replaceAll('\\\"', '\\\\\"').replaceAll('\"', '\\"');
    this.throttledSave(content);
    this._event('saved', {uid: this.uid, self:this});
  }

  updateSelection(from, to) {
    this.throttledSelection(from, to)
  }
  
  constructor(template, input, list, eventid, meta = {}) {

    this.uid         = input["Hash"];
    this.channel     = eventid;
    //this.state       = input["State"];
    this.type        = input["Type"];
    this.notebook    = input["Notebook"];
    this.invisible   = input["Invisible"];
    this.props       = input["Props"];

    const oldNotebook = (Notebook[input["Notebook"]]);

    let _list = [];
    if (oldNotebook) {
      _list = [...oldNotebook.Cells];
    }

    const notebook = Notebook.add(input["Notebook"], list); 
    const pos  = notebook.Cells.indexOf(this.uid);
    console.log(pos);

     console.log('position: '+ pos);
     console.log(this.uid);
     console.log('in the list');
     console.log(notebook.Cells);

    CellHash.add(this);

    const self = this;


    this.throttledSelection = throttle((from, to) => {
      server.io.fire(self.uid, [from+1, to], 'Selection');
    }, 300);

    this.throttledSave = throttle((content) => {
      server.emitt(self.channel, '{"'+self.uid+'","'+(content)+'"}', "UpdateCell");
    }, CellWrapper.inputSaveDelay);

    CellWrapper.prolog.forEach((f) => f({cell: self, props: input, event: eventid}));

    if (pos == 0) {
      
      if (notebook.Cells.length > 0) {
        console.log('First cell! (added before the first one)');
        notebook.element.insertAdjacentHTML('afterbegin', template);
      } else {
        console.log('First cell!');
        notebook.element.insertAdjacentHTML('beforeend', template);
      }

    } else {
      let next;
      if (!meta["IgnoreList"]) next = notebook.Cells[pos + 1];
    
      let parent = notebook.Cells[pos - 1];  

      if (next) next   = CellHash.get(  next);
                parent = CellHash.get(parent);
      
      if (parent.type == 'Input' && this.type == 'Input') {
        console.log('Insert after input input cell');
        document.getElementById('group-' + parent.uid).insertAdjacentHTML('afterend', template);

        if (next) {
          if (next.type == "Output") {
            //find all kids and move them
            const currentKids = document.getElementById('children-' + this.uid);
            const starting = _list.indexOf(parent.uid);
            let iterator = starting + 1;

            while(iterator < _list.length) {
              const o = CellHash.get(_list[iterator]);
              if (o.type === 'Input') break;

              const node = o.group;
              currentKids.appendChild(node);
              iterator ++ ;
            }
          }
        } 

      } else if (parent.type == 'Input' && this.type == 'Output') {
        console.log('Insert after input output cell');
        document.getElementById('children-' + parent.uid).insertAdjacentHTML('beforeend', template);

      } else if (parent.type == 'Output' && this.type == 'Input') {
        console.log('Insert after output input cell');
        //find input parent first
        const inputparent = parent.findInput();

        if (next) {
          if (next.type == 'Input') {
            document.getElementById('group-' + inputparent.uid).insertAdjacentHTML('afterend', template);
          } else {
            //the most complecated case. We need to break a chain
            console.warn('Restructuring cells...');
            //insert after the parent input firstly
            document.getElementById('group-' + inputparent.uid).insertAdjacentHTML('afterend', template);
            //now we need to move all kids starting from prev

            const currentKids = document.getElementById('children-' + this.uid);
            //move kids starting from ...
            const starting = _list.indexOf(next.uid);
            let iterator = starting;

            while(iterator < _list.length) {
              const o = CellHash.get(_list[iterator]);
              if (o.type === 'Input') break;

              const node = o.group;
              currentKids.appendChild(node);
              iterator ++ ;
            }

          }
        } else {
          document.getElementById('group-' + inputparent.uid).insertAdjacentHTML('afterend', template);
        }

      } else if (parent.type == 'Output' && this.type == 'Output') {
        console.log('Insert after output output cell');
        document.getElementById('group-' + parent.uid).insertAdjacentHTML('afterend', template);

      } else {
        console.error(parent);
        console.error(this);
        throw('Unexpected value!');
      }

      
    }

    this.group       = document.getElementById('group-' + input["Hash"]);

    this.element = document.getElementById(this.uid);
    this.display = new window.SupportedCells[input["Display"]].view(this, input["Data"]);  

    if (!notebook.focusedFirst && meta["FocusFirst"]) {
      if (this.type == 'Input' && this.display.editor && !(this.props["Locked"] || this.invisible || this.props["Hidden"])) {
        notebook.focusedFirst = true;
        if (!this.props["Fade"]) this.display.editor.focus();
      }
    }

    if (this.props["Locked"] || this.invisible) {
      if (this.display.editor) {
        this.display.readOnly(true);
      } 
    } 

    if (this.type == 'Input') {
      this.element.addEventListener('focusin', ()=>{
        //call on cell focus event
        
        server.io.fire(self.uid, true, 'Focus');
        
        if (!self._fade_block && self.props["Fade"]) {

          self.fade(true);

          function leftFocus() {
            self.fade(false);
            self.element.removeEventListener('focusout', leftFocus);
          }
    
          self.element.addEventListener('focusout', leftFocus);  
        }
        currentCell = self;
      });
    } else {
      this.element.addEventListener('focusin', ()=>{
        //call on cell focus event
        
        server.io.fire(self.uid, true, 'Focus');
      });
    }

    CellWrapper.epilog.forEach((f) => f({cell: self, props: input, event: eventid}));

    this._event('epilog', {self:this});


    //force focus flag
    if (forceFocusNew && this.type == 'Input') {
      console.warn('focus input cell - i');
      forceFocusNew = false;
      if (this.display?.editor) this.display?.focus(-1);
    }

    //setTimeout(() => self.group.classList.remove('-translate-x-6'), 50);
    
    
    return this;
  }

  setInit(state) {
    const icon = document.getElementById('gi-'+this.uid);
    if (state) {
      icon.classList.remove('hidden');
    } else {
      icon.classList.add('hidden');
    }
  }

  scrollTo(opts = {}) {
    this.element.scrollIntoView(opts)
  }

  setContent(content) {
    
    if (!this.display.editor) return;
    if (this.display.setContent) {
      this.display.setContent(content);
      this._event('contentmutate', {self:this});
    }
  }

  morph(template, input) {
    const notebook = Notebook[this.notebook]; 
    const pos  = notebook.Cells.indexOf(this.uid);
    const inputparent = this.findInput();

    const self = this;
    const eventid = this.channel;

    CellWrapper.prolog.forEach((f) => f({cell: self, props: input, event: eventid, morph: true}));

    const afterInputParent = document.getElementById('group-' + inputparent.uid);
    //temporary move
    afterInputParent.parentNode.appendChild(this.element);
    this.element.id = this.element.id + 'temporal';

    //remove original group
    this.group.remove();

    //add new template on its place
    document.getElementById('group-' + inputparent.uid).insertAdjacentHTML('afterend', template);
    this.group = document.getElementById('group-' + this.uid);

    //insert original into a new container
    const dummy = document.getElementById(this.uid);
    dummy.after(this.element);

    //copy styles
    const templateClass = dummy.className;
    this.element.className = templateClass;

    //remove template's version
    dummy.remove();

    //restore uid
    this.element.id = this.uid;

    //fuckmylife
    //move kids

    const currentKids = document.getElementById('children-' + this.uid);
    //move kids starting from ...
    const starting = notebook.Cells.indexOf(this.uid);
    let iterator = starting + 1;

    while(iterator < notebook.Cells.length) {
      const o = CellHash.get(notebook.Cells[iterator]);
      if (o.type === 'Input') break;

      const node = o.group;
      currentKids.appendChild(node);
      iterator ++ ;
    }

    this.type = 'Input';

    this.element.addEventListener('focusin', ()=>{
      //call on cell focus event

      server.io.fire(self.uid, true, 'Focus');

      currentCell = self;
    });

    CellWrapper.epilog.forEach((f) => f({cell: self, props: input, event: eventid, morph: true}));
    self.display.editor.focus();
    this._event('morph', {self:this});
  }

  eval(content) {
    if (this.type == "Output") console.warn('Output cell cannot be evaluated, but we will try to convert it');
    server.emitt(this.channel, '"'+this.uid+'"', 'Evaluate');  
    this._event('eval', {self:this});
  }  

  evalToWindow() {
    if (this.type == "Output") console.warn('Output cell cannot be evaluated, but we will try to convert it');
    server.emitt(this.channel, '"'+this.uid+'"', 'ProjectOrUpdate');  
    this._event('eval', {self:this});    
  }

  evalNext(content) {
    if (this.type == "Output") console.warn('Output cell cannot be evaluated, but we will try to convert it');
    //jump to the next
    this.focusNext(true, 0, true);
    server.emitt(this.channel, '"'+this.uid+'"', 'Evaluate');  
    this._event('eval', {self:this});
  }  
  
  dispose() {
    this._event('beforedispose', {self:this});
    const group = this.group;
    group.classList.add('scale-50');

    

    //remove from the list
    const list = Notebook[this.notebook].Cells; 
    const pos = list.indexOf(this.uid);

    list.splice(pos, 1);
    //remove hash
    CellHash.remove(this.uid);

    //remove dom holders
    setTimeout(() => {
      this.display.dispose();
      group.remove();
      this._event('afterdispose', {self:this});
    }, 100);
  }
  
  remove(jump = true, direction = -1) {
    server.emitt(this.channel, '"'+this.uid+'"', 'RemoveCell');
    if (jump) {
      if (this.type == 'Output') {
        if (direction < 0) this.focusPrev(); else this.focusNext();
      } else {
        if (direction < 0) {
          this.focusPrev();
        } else {
          this.focusNext(true);
        }
      }
    }
  }


};;

window.WindowWrapperSupplimentary = class {
  dispose() {
    this?.display?.dispose();
    this.element.remove();
  }

  constructor(input) {
    this.element = document.createElement('div');
    this.element.classList.add('hidden');
    document.body.appendChild(this.element);

    this.display = new window.SupportedCells[input["Display"]].view(this, input["Data"]);  
  }
}
const windows = new Map();
window.WindowWrapper = class {
  uid = ''
  element;

  channel;

  focus() {
    if (!this.display.editor) return;
    this.display.editor.focus();
  }

  dispose() {
    console.log('Window was disposed');
    windows.delete(this.uid);
    removeEventListener("beforeunload", this.unloader);
    delete this.unloader;
    this?.display?.dispose();
  }
  
  constructor(template, input, list, eventid, meta = {}) {

    this.uid         = input["Hash"];
    this.channel     = eventid;
    this.state       = input["State"];
    this.type        = input["Type"];

    const self = this;

    const container = document.getElementById('container-'+this.uid);

    this.unloader = () => {
      console.log('unloaded!'); self.dispose();
    }

    addEventListener("beforeunload", this.unloader);

    //dispose already existing cells
    if (windows.has(this.uid)) {
      windows.get(this.uid).dispose();
    }

    windows.set(this.uid, self);

    this.throttledSave = throttle((content) => {
      console.warn('editing inside window is not permitted');
    }, 150);

    this.updateSelection = () => {};
    this.save = () => {};

    container.innerHTML = "";
    container.insertAdjacentHTML('beforeend', template);

    this.group       = document.getElementById('group-' + input["Hash"]);

    this.element = document.getElementById(this.uid);
    this.display = new window.SupportedCells[input["Display"]].view(this, input["Data"]);  

    //if (this.type == 'Input') {
      this.element.addEventListener('focusin', ()=>{
        //call on cell focus event
        server.io.fire(self.uid, true, 'Focus');
        currentCell = self;
      });
    //}

    //CellWrapper.epilog.forEach((f) => f({cell: self, props: input, event: eventid}));

    //global JS event
    const newCellEvent = new CustomEvent("newWindowCreated", { detail: self });
    window.dispatchEvent(newCellEvent);

    //setTimeout(() => self.group.classList.remove('-translate-x-6'), 50);
    return this;
  }
}