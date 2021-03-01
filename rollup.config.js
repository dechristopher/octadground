import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/octadground.js',
      format: 'iife',
      name: 'Octadground',
    },
    {
      file: 'dist/octadground.min.js',
      format: 'iife',
      name: 'Octadground',
      plugins: [
        terser({
          safari10: true,
        }),
      ],
    },
  ],
  plugins: [
    typescript(),
    commonjs({
      extensions: ['.js', '.ts'],
    }),
  ],
};
