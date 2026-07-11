import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
  snippetCompletion
} from "@codemirror/autocomplete";

import {language} from "@codemirror/language"

import { keymap, ViewPlugin } from "@codemirror/view";

import {StateField} from "@codemirror/state";

import { EditorSelection } from "@codemirror/state";

import {
  syntaxTree,
  IndentContext,
  getIndentUnit,
  indentUnit,
  indentString,
  getIndentation,
  matchBrackets
} from "@codemirror/language";

import { StreamLanguage, Language, ParseContext, LanguageState } from "@codemirror/language";


function newESC() {
  return ({ state, dispatch }) => {
    if (state.readOnly) return false;
    let changes = state.changeByRange((range) => {
      let { from, to } = range;
      //if (atEof) from = to = (to <= line.to ? line : state.doc.lineAt(to)).to

      return {
        changes: { from, to, insert: "EC" },
        range: EditorSelection.cursor(from + 2)
      };
    });

    dispatch(
      state.update(changes, { scrollIntoView: true, userEvent: "input" })
    );
    return true;
  };
}

function Completions(context, defaultFunctions) {
  let word = context.matchBefore(/\w*/);
  if (word.from === word.to && !context.explicit) return null;
  //console.log(defaultFunctions);
  return {
    from: word.from,
    options: defaultFunctions.data
  };
}

// used pattern building blocks
var Identifier = "[a-zA-Z\\$][a-zA-Z0-9\\$]*";
var pBase = "(?:\\d+)";
var pFloat = "(?:\\.\\d+|\\d+\\.\\d*|\\d+)";
var pFloatBase = "(?:\\.\\w+|\\w+\\.\\w*|\\w+)";
var pPrecision = "(?:`(?:`?" + pFloat + ")?)";

// regular expressions
var reBaseForm = new RegExp(
  "(?:" +
    pBase +
    "(?:\\^\\^" +
    pFloatBase +
    pPrecision +
    "?(?:\\*\\^[+-]?\\d+)?))"
);
var reFloatForm = new RegExp(
  "(?:" + pFloat + pPrecision + "?(?:\\*\\^[+-]?\\d+)?)"
);
var reIdInContext = new RegExp(
  "(?:`?)(?:" + Identifier + ")(?:`(?:" + Identifier + "))*(?:`?)"
);

let builtins = [];
let builtinsLocalQ = [];

const builtinsSpecial = [
  "True",
  "False",
  "All",
  "None",
  "Null",
  "Full",
  "$Failed",
  "Automatic",
  "$Aborted"
];

let localVariables = {};

function tokenBase(stream, state) {
  let localVars = {};
  var ch;

  // get next character
  ch = stream.next();

  // string
  if (ch === '"') {
    state.tokenize = tokenString;
    return state.tokenize(stream, state);
  }

  // comment
  if (ch === "(") {
    if (stream.eat("*")) {
      state.commentLevel++;
      state.tokenize = tokenComment;
      return state.tokenize(stream, state);
    }
  }

  // go back one character
  stream.backUp(1);

  // look for numbers
  // Numbers in a baseform
  if (stream.match(reBaseForm, true, false)) {
    return "number";
  }

  // Mathematica numbers. Floats (1.2, .2, 1.) can have optionally a precision (`float) or an accuracy definition
  // (``float). Note: while 1.2` is possible 1.2`` is not. At the end an exponent (float*^+12) can follow.
  if (stream.match(reFloatForm, true, false)) {
    return "number";
  }

  // usage
  if (
    stream.match(
      /([a-zA-Z\$][a-zA-Z0-9\$]*(?:`[a-zA-Z0-9\$]+)*::usage)/,
      true,
      false
    )
  ) {
    return "meta";
  }

  // message
  if (
    stream.match(
      /([a-zA-Z\$][a-zA-Z0-9\$]*(?:`[a-zA-Z0-9\$]+)*::[a-zA-Z\$][a-zA-Z0-9\$]*):?/,
      true,
      false
    )
  ) {
    return "string.special";
  }

  // this makes a look-ahead match for something like variable:{_Integer}
  // the match is then forwarded to the mma-patterns tokenizer.
  if (
    stream.match(
      /([a-zA-Z\$][a-zA-Z0-9\$]*\s*:)/,
      true,
      false
    )
  ) {
    return "variableName.special";
  }

  // catch variables which are used together with Blank (_), BlankSequence (__) or BlankNullSequence (___)
  // Cannot start with a number, but can have numbers at any other position. Examples
  // blub__Integer, a1_, b34_Integer32
  if (
    stream.match(
      /[a-zA-Z\$][a-zA-Z0-9\$]*_+[a-zA-Z\$][a-zA-Z0-9\$]*/,
      true,
      false
    )
  ) {
    return "variableName.special";
  }
  if (stream.match(/[a-zA-Z\$][a-zA-Z0-9\$]*_+/, true, false)) {
    return "variableName.special";
  }
  if (stream.match(/_+[a-zA-Z\$][a-zA-Z0-9\$]*/, true, false)) {
    return "variableName.special";
  }

  // Named characters in Mathematica, like \[Gamma].
  if (stream.match(/\\\[[a-zA-Z\$][a-zA-Z0-9\$]*\]/, true, false)) {
    return "character";
  }

  // Match all braces separately
  if (stream.match(/(?:\[|\]|{|}|\(|\))/, true, false)) {
    return "bracket";
  }

  // Catch Slots (#, ##, #3, ##9 and the V10 named slots #name). I have never seen someone using more than one digit after #, so we match
  // only one.
  if (stream.match(/(?:#[a-zA-Z\$][a-zA-Z0-9\$]*|#+[0-9]?)/, true, false)) {
    return "variableName.constant";
  }

  // Literals like variables, keywords, functions
  if (stream.match(reIdInContext, true, false)) {
    if (builtinsSpecial.indexOf(stream.current()) > -1) return "className";
    if (builtins.length == 0) return "keyword";
    const bmatch = builtins.indexOf(stream.current());
    if (bmatch > -1) {
      if (builtinsLocalQ[bmatch]) return "labelName";
      return "keyword";
    }

    return "function";
  }

  // operators. Note that operators like @@ or /; are matched separately for each symbol.
  if (
    stream.match(
      /(?:\\|\+|\-|\*|\/|,|;|\.|:|@|~|=|>|<|&|\||_|`|'|\^|\?|!|%)/,
      true,
      false
    )
  ) {
    return "operator";
  }

  // everything else is an error
  stream.next(); // advance the stream.
  return "error";
}

function tokenString(stream, state) {
  var next,
    end = false,
    escaped = false;
  while ((next = stream.next()) != null) {
    if (next === '"' && !escaped) {
      end = true;
      break;
    }
    escaped = !escaped && next === "\\";
  }
  if (end && !escaped) {
    state.tokenize = tokenBase;
  }
  return "string";
}

function tokenComment(stream, state) {
  var prev, next;
  while (state.commentLevel > 0 && (next = stream.next()) != null) {
    if (prev === "(" && next === "*") state.commentLevel++;
    if (prev === "*" && next === ")") state.commentLevel--;
    prev = next;
  }
  if (state.commentLevel <= 0) {
    state.tokenize = tokenBase;
  }
  return "comment";
}

var refToGlobalVars = {};

const mathematica = {
  name: "mathematica",
  extendVariables: function (symbol) {
    //not implemented
  },
  startState: function () {
    //.log("tocken string");


    return { tokenize: tokenBase, commentLevel: 0, localVars: {} };
  },
  token: function (stream, state) {
    if (stream.eatSpace()) return null;
    return state.tokenize(stream, state);
  },
  languageData: {
    commentTokens: { block: { open: "(*", close: "*)" } }
  }
};

export let wolframLanguage = {};

const trackedEditors = new Set();

function freshLanguageState(state) {
  let lang = state.facet(language);
  if (!lang) return null;

  let vpTo = Math.min(3000 /* Work.InitViewport */, state.doc.length);
  let parseState = ParseContext.create(lang.parser, state, { from: 0, to: vpTo });

  // same logic as LanguageState.init
  if (!parseState.work(20 /* Work.Apply */, vpTo)) parseState.takeTree();
  return new LanguageState(parseState);
}

function reparseKeepingFragments(view) {

  let field = view.state.field(Language.state, false);
  if (!field) return false;

  let next = freshLanguageState(view.state);
  if (!next) return false;
  view.dispatch({ effects: Language.setState.of(next) });
  return true;
}

const stateTracker = ViewPlugin.fromClass(
  class {
    constructor(view) {
      trackedEditors.add(view);
      this.view = view;
      //console.warn(trackedEditors.values());
    }
    destroy() {
      trackedEditors.delete(this.view);
    }
  },
);

wolframLanguage.of = (vocabulary, trackedQ=true) => {

  return [
    StreamLanguage.define(mathematica),
    autocompletion({
      override: [
        async (ctx) => Completions(ctx, vocabulary)
        //snippetCompletion('mySnippet(${one}, ${two})', {label: 'mySnippet'})
      ]
    }),
    ...(trackedQ ? [stateTracker] : []),
    keymap.of([{ key: "Escape", run: newESC() }])
  ];  
}

let refreshTimeout = null;

const reparse = () => {
    console.warn('refresh syntax highlighting');
    trackedEditors.values().forEach((view) => reparseKeepingFragments(view));
    refreshTimeout = null;
};

wolframLanguage.refresh = () => {
  
  
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }
  
  refreshTimeout = setTimeout(reparse, 1000);
}

wolframLanguage.reBuild = (vocabulary) => {
  builtins = vocabulary.map((e) => e.label);
  builtinsLocalQ = vocabulary.map((e) => e.type == 'keyword' ? false : true);
}



