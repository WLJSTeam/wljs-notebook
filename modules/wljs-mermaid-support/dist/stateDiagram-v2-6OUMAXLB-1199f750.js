import { s as stateDiagram_default, S as StateDB, b as stateRenderer_v3_unified_default, a as styles_default } from './chunk-EX3LRPZG-c1d12601.js';
import { _ as __name } from './mermaid.core-ad8d5d2d.js';
import './chunk-XXDRQBXY-07b12966.js';
import './chunk-VR4S4FIN-280dd29a.js';
import './chunk-32BRIVSS-e3d52ada.js';

// src/diagrams/state/stateDiagram-v2.ts
var diagram = {
  parser: stateDiagram_default,
  get db() {
    return new StateDB(2);
  },
  renderer: stateRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.state) {
      cnf.state = {};
    }
    cnf.state.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};

export { diagram };
