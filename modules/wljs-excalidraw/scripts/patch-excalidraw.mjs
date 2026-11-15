import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(
  moduleDir,
  "node_modules",
  "@excalidraw",
  "excalidraw",
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(packageDir, "package.json"), "utf8"),
);

if (packageJson.version !== "0.17.6") {
  throw new Error(
    `Unsupported @excalidraw/excalidraw version ${packageJson.version}; expected 0.17.6`,
  );
}

const replaceOnce = (source, before, after, label) => {
  if (source.includes(after)) {
    return source;
  }

  const first = source.indexOf(before);
  if (first === -1 || source.indexOf(before, first + before.length) !== -1) {
    throw new Error(`Could not uniquely locate ${label}`);
  }

  return source.slice(0, first) + after + source.slice(first + before.length);
};

// The development bundle stores each webpack module as an escaped eval string.
const encodeEvalSource = (source) => JSON.stringify(source).slice(1, -1);

const oldNormalizeText = `const normalizeText = text => {
  return text // replace tabs with spaces so they render and measure correctly
  .replace(/\\t/g, "        ") // normalize newlines
  .replace(/\\r?\\n|\\r/g, "\\n");
};`;

const newNormalizeText = `// char map for subscripts/superscripts
const zipIt = (from, to) => {
  const src = [...from];
  const dst = [...to];
  if (src.length !== dst.length) {
    throw new Error(\`zipIt: length mismatch (\${src.length} vs \${dst.length})\`);
  }
  return new Map(src.map((c, i) => [c, dst[i]]));
};
const SUP = zipIt(
  "0123456789+-=()abcdefghijklmnoprstuvwxyzABDEGHIJKLMNOPRTUVW",
  "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ",
);
const SUB = zipIt(
  "0123456789+-=()aehijklmnoprstuvx",
  "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ",
);
const SCRIPT_RE = /([\\p{L}\\p{N}])([\\^_])\\{([^{}]+)\\}/gu;
const convertScript = (match, base, op, body) => {
  const map = op === "^" ? SUP : SUB;
  let out = "";
  for (const c of body) {
    const mapped = map.get(c);
    if (mapped === undefined) return match;
    out += mapped;
  }
  return base + out;
};
const normalizeEOL = str => {
  return str.replace(/\\r?\\n|\\r/g, "\\n");
};
const normalizeText = text => {
  // replace tabs with spaces so they render and measure correctly
  const normalized = normalizeEOL(text).replace(/\\t/g, "        ");
  // cheap pre-check: skip the regex entirely for the common case
  if (!normalized.includes("{")) return normalized;
  // convert tex-like sub/superscripts to unicode equivalents - little helper for non-technical users
  return normalized.replace(SCRIPT_RE, convertScript);
};`;

const oldOnInput = `    editable.oninput = () => {
      onChange((0,_textElement__WEBPACK_IMPORTED_MODULE_6__.normalizeText)(editable.value));
    };`;

const newOnInput = `    editable.oninput = () => {
      const normalized = (0,_textElement__WEBPACK_IMPORTED_MODULE_6__.normalizeText)(editable.value);
      if (editable.value !== normalized) {
        const selectionStart = editable.selectionStart;
        editable.value = normalized;
        // put the cursor at some position close to where it was before
        // normalization (otherwise it'll end up at the end of the text)
        editable.selectionStart = selectionStart;
        editable.selectionEnd = selectionStart;
      }
      onChange(editable.value);
    };`;

const developmentPath = path.join(packageDir, "dist", "excalidraw.development.js");
let development = fs.readFileSync(developmentPath, "utf8");
development = replaceOnce(
  development,
  encodeEvalSource(
    '/* harmony export */   "normalizeText": () => (/* binding */ normalizeText),',
  ),
  encodeEvalSource(
    '/* harmony export */   "normalizeEOL": () => (/* binding */ normalizeEOL),\n' +
      '/* harmony export */   "normalizeText": () => (/* binding */ normalizeText),',
  ),
  "the normalizeEOL export in the development bundle",
);
development = replaceOnce(
  development,
  encodeEvalSource(oldNormalizeText),
  encodeEvalSource(newNormalizeText),
  "normalizeText in the development bundle",
);
development = replaceOnce(
  development,
  encodeEvalSource(oldOnInput),
  encodeEvalSource(newOnInput),
  "the WYSIWYG input handler in the development bundle",
);
fs.writeFileSync(developmentPath, development);

const productionPath = path.join(packageDir, "dist", "excalidraw.production.min.js");
let production = fs.readFileSync(productionPath, "utf8");
production = replaceOnce(
  production,
  'var y,x,w=function(e){return e.replace(/\\t/g,"        ").replace(/\\r?\\n|\\r/g,"\\n")}',
  'var y,x,wljsZipIt=function(e,t){var n=[...e],r=[...t];if(n.length!==r.length)throw new Error("zipIt: length mismatch (".concat(n.length," vs ").concat(r.length,")"));return new Map(n.map((function(e,n){return[e,r[n]]})))},wljsSup=wljsZipIt("0123456789+-=()abcdefghijklmnoprstuvwxyzABDEGHIJKLMNOPRTUVW","⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ"),wljsSub=wljsZipIt("0123456789+-=()aehijklmnoprstuvx","₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ"),wljsScriptRe=/([\\p{L}\\p{N}])([\\^_])\\{([^{}]+)\\}/gu,wljsConvertScript=function(e,t,n,r){for(var o="",i="^"===n?wljsSup:wljsSub,a=0;a<r.length;a++){var l=i.get(r[a]);if(void 0===l)return e;o+=l}return t+o},wljsNormalizeEOL=function(e){return e.replace(/\\r?\\n|\\r/g,"\\n")},w=function(e){var t=wljsNormalizeEOL(e).replace(/\\t/g,"        ");return t.includes("{")?t.replace(wljsScriptRe,wljsConvertScript):t}',
  "normalizeText in the production bundle",
);
production = replaceOnce(
  production,
  'C.oninput=function(){n((0,h.bG)(C.value))}',
  'C.oninput=function(){var e=(0,h.bG)(C.value);if(C.value!==e){var t=C.selectionStart;C.value=e,C.selectionStart=t,C.selectionEnd=t}n(C.value)}',
  "the WYSIWYG input handler in the production bundle",
);
fs.writeFileSync(productionPath, production);

const typesPath = path.join(packageDir, "types", "element", "textElement.d.ts");
let types = fs.readFileSync(typesPath, "utf8");
types = replaceOnce(
  types,
  "export declare const normalizeText: (text: string) => string;",
  "export declare const normalizeEOL: (str: string) => string;\n" +
    "export declare const normalizeText: (text: string) => string;",
  "the normalizeEOL type export",
);
fs.writeFileSync(typesPath, types);

console.log("Patched @excalidraw/excalidraw@0.17.6 text normalization");
