import resolve from '@rollup/plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import {terser} from 'rollup-plugin-terser';
export default {
    input: './esm/index.js',
    output: {
        file: './min.js',
        format: 'iife',
        name: 'jscrudapi'
    },
    plugins: [
        resolve(),
        babel({presets: ['@babel/preset-env']}),
        terser()
    ]
};
