import { c as createFlowDiagram, s as styles_default } from './chunk-PUDLZKDR-0a7838d2.js';
import { _ as __name } from './mermaid.core-ad8d5d2d.js';
import './chunk-5VM5RSS4-ccbf8a0d.js';
import './chunk-XXDRQBXY-07b12966.js';
import './chunk-VR4S4FIN-280dd29a.js';
import './chunk-32BRIVSS-e3d52ada.js';
import './channel-d472645b.js';

// src/diagrams/swimlanes/styles.ts
var getStyles = /* @__PURE__ */ __name((options) => `${styles_default(options)}
  .swimlane.cluster rect {
    stroke: ${options.clusterBorder} !important;
  }
  [data-look="neo"].cluster rect {
    filter: none;
  }
`, "getStyles");
var styles_default2 = getStyles;

// src/diagrams/swimlanes/swimlanesDiagram.ts
var diagram = createFlowDiagram({ defaultLayout: "swimlane", styles: styles_default2 });

export { diagram };
