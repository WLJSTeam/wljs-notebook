import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json";
import path from "node:path";
import { fileURLToPath } from "node:url";

import terser from '@rollup/plugin-terser';

const codeMirrorVendorRoot = fileURLToPath(new URL('./vendor', import.meta.url));

function vendoredCodeMirror() {
  return {
    name: 'vendored-codemirror',

    async resolveId(source, importer, options) {
      if (!source.startsWith('@codemirror/')) return null;

      const vendoredSource = path.join(codeMirrorVendorRoot, source);
      const resolved = await this.resolve(vendoredSource, importer, {
        ...options,
        skipSelf: true
      });

      if (!resolved) {
        this.error(`Unable to resolve vendored CodeMirror module: ${source}`);
      }

      return resolved;
    }
  };
}

export default [{

  input: 'src/kernel.js',
  
  output: [{
    file: 'dist/kernel.min.js',
    format: "es",
    strict: false,
    manualChunks: () => 'merged',
    plugins: [terser()]
  },{
    dir: 'dist/',
    format: "es",
    strict: false
  }],
  plugins    : [
  vendoredCodeMirror(),
  nodeResolve({
    jsnext: true,
    main: false
  }),
  json(),
  commonjs({transformMixedEsModules:true})
  ]
}

];
