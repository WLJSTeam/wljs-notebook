import {
  EditorView,
  Decoration,
  ViewPlugin,
  WidgetType,
  MatchDecorator
} from "@codemirror/view";

const GreekMatcher = new MatchDecorator({
  regexp: /\\\[(\w+)\]/g,
  decoration: (match) => {
    //console.log(match);
    return Decoration.replace({
      widget: new GreekWidget(match[1])
    })
  }
});

export const Greekholder = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.Greekholder = GreekMatcher.createDeco(view);
    }
    update(update) {
      this.Greekholder = GreekMatcher.updateDeco(update, this.Greekholder);
    }
  },
  {
    decorations: instance => instance.Greekholder,
    provide: plugin => EditorView.atomicRanges.of(view => {
      return view.plugin(plugin)?.Greekholder || Decoration.none
    })
  }
);

const pr = (elt, match, group1, group2) => {
  switch (group1) {
    case 'flat': return '&flat;';
    case 'sharp': return '&sharp;';
    case 'sqrt': return '&radic;';
    case 'partiald': return '&part;';
    case 'doublestruckn': return '&#8469;';
    case 'thinspace': return ' ';
    case 'del': return '&nabla;';
    case 'infinity': return '&infin;';
    case 'undirectededge': return '&harr;';
    case 'twowayrule': return '&harr;';
    case 'directededge': return '&rarr;';
    case 'suchthat': return '&#8715;';
    case 'coproduct': return '∐';
    case 'element': return '&#8712;';
    case 'invisiblecomma': return ' ';
    case 'transpose': return '&#7488;';
    case 'degree': return '&deg;';
    case 'capital': 
      if (group2.length == 1) return group2.toUpperCase();
      return '&'+group2.charAt(0).toUpperCase() + group2.slice(1)+';';

    case 'curly': 
      elt.style.fontStyle = 'italic';
      if (group2.length == 1) return group2;
      return '&' + group2 + ';';

    case 'formal': 
      elt.style.color = '#91794a';
      if (group2.length == 1) return group2;
      return '&' + group2 + ';';

    case 'curlycapital': 
      elt.style.textTransform = 'uppercase';
      elt.style.fontStyle = 'italic';
      if (group2.length == 1) return group2;
      return '&' + group2 + ';';

    case 'formalcapital': 
      elt.style.textTransform = 'uppercase';
      elt.style.color = '#91794a';
      if (group2.length == 1) return group2;
      return '&' + group2 + ';';


    case 'scriptcapital': 
      elt.style.textTransform = 'uppercase';
      elt.style.color = '#4a916e';
      elt.style.fontFamily = 'cursive';
      if (group2.length == 1) return group2;
      return '&el'+group2+';'; 

    case 'doublestruckcapital':
      return '&'+group2.toUpperCase()+'opf;';     

    case 'doublestruck':
      return '&'+group2+'opf;';     

    case 'script': 
      elt.style.color = '#4a916e';
      elt.style.fontFamily = 'cursive';
      if (group2.length == 1) return group2;
      return '&el'+group2+';'; 

    default: return '&'+match+';';
  }
};

const regexp = /(sqrt|undirectededge|directededge|transpose|degree|doublestruckcapital|doublestruck|curlycapital|formalcapital|scriptcapital|capital|curly|formal|script|.*)(.*)/;


export const processGreeksAll = (elt, str, mode=true) => {
  
  if (mode) {
    const result = str.toLowerCase().match(regexp);
    elt.innerHTML = pr(elt, result[0], result[1], result[2]);
  } else {

    elt.innerHTML = str.replaceAll(/\\\[(\w+)\]/g, (match) => {
      return '&'+match.toLowerCase().slice(2,-1)+';'
    })
  }
}

export const processGreeks = (elt, str, mode=true) => {
  
  if (mode) {
    const result = str.toLowerCase().match(regexp);
    elt.innerHTML = pr(elt, result[0], result[1], result[2]);
  } else {

    elt.innerHTML = str.replace(/\\\[(\w+)\]/, (match) => {
      return '&'+match.toLowerCase().slice(2,-1)+';'
    })
  }
}

class GreekWidget extends WidgetType {
  constructor(name) {
    //console.log('created');
    super();
    this.name = name;
  }

  eq(other) {
    return this.name === other.name;
  }

  toDOM() {
    //console.log('to DOM');
    let elt = document.createElement("span");
    
    processGreeks(elt, this.name);


    return elt;
  }
  ignoreEvent() {
    return false;
  }
}

const ArrowMatcher = new MatchDecorator({
  regexp: /(->|<-)/g,
  decoration: (match) =>
    Decoration.replace({
      widget: new ArrowWidget(match[1])
    })
});
export const Arrowholder = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.Arrowholder = ArrowMatcher.createDeco(view);
    }
    update(update) {
      this.Arrowholder = ArrowMatcher.updateDeco(update, this.Arrowholder);
    }
  },
  {
    decorations: (instance) => instance.Arrowholder,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => {
        return view.plugin(plugin)?.Arrowholder || Decoration.none;
      })
  }
);

class ArrowWidget extends WidgetType {
  constructor(dir) {
    super();
    this.dir = dir;
    //this.instance = Math.random();
  }
  eq(other) {
    return this.dir === other.dir;
  }
  toDOM() {
    let elt = document.createElement("span");
    //console.log(this.dir);
    if (this.dir === "->") {
      elt.innerText = "→";
    } else {
      elt.innerText = "←";
    }

    return elt;
  }
  ignoreEvent() {
    return false;
  }
}
