import { aj as _, ak as Color } from './mermaid.core-ad8d5d2d.js';

/* IMPORT */
/* MAIN */
const channel = (color, channel) => {
    return _.lang.round(Color.parse(color)[channel]);
};
/* EXPORT */
var channel$1 = channel;

export { channel$1 as c };
