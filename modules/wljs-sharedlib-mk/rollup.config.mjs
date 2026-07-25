import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json";

import terser from '@rollup/plugin-terser';

export default [{

  input: 'src/kernel.js',
  
  output: [
    {
      file: 'dist/kernel.min.js',
      format: "es",
      strict: false,
      manualChunks: () => 'merged',
      plugins: [terser()]
    },
    {
      dir: 'dist/',
      format: "es",
      strict: false
    }
  ],
  plugins    : [
  nodeResolve({
    jsnext: true,
    main: false
  }),
  json(),
  commonjs({transformMixedEsModules:true})
  ]
},{

  input: 'src/lazy.js',
  
  output: [
    {
      dir: 'dist/',
      format: "es",
      strict: false
    }
  ],
  plugins    : [
  nodeResolve({
    jsnext: true,
    main: false
  }),
  json(),
  commonjs({transformMixedEsModules:true})
  ]
}];