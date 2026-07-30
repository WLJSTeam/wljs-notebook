import { c as classDiagram_default, C as ClassDB, a as classRenderer_v3_unified_default, s as styles_default } from './chunk-V7JOEXUC-4708f460.js';
import { _ as __name } from './mermaid.core-ad8d5d2d.js';
import './chunk-5VM5RSS4-ccbf8a0d.js';
import './chunk-XXDRQBXY-07b12966.js';
import './chunk-VR4S4FIN-280dd29a.js';
import './chunk-32BRIVSS-e3d52ada.js';

// src/diagrams/class/classDiagram-v2.ts
var diagram = {
  parser: classDiagram_default,
  get db() {
    return new ClassDB();
  },
  renderer: classRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.class) {
      cnf.class = {};
    }
    cnf.class.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};

export { diagram };
