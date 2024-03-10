import { cleandir } from "rollup-plugin-cleandir";
import { defineConfig } from 'rollup';

export default defineConfig({
    plugins: [
        cleandir(),
    ],
    input: {
        index: 'src/index.js',
        strategies: 'src/strategies/index.js',
    },
    output: [
        {
            dir: 'dist',
            format: 'esm',
            entryFileNames: '[name].[format].js',
        },
    ],
});
