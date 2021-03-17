import resolve from '@rollup/plugin-node-resolve';
export default {
    input: './esm/index.js',
    output: {
        file: './index.js',
        format: 'esm',
    },
    plugins: [
        resolve()
    ]
};