let mainPath = '../src/transformer';
let strategiesPath = '../src/strategies';

if (process.env.TEST_TYPE === 'esm') {
    mainPath = '../dist/index.es.js';
    strategiesPath = '../dist/strategies.es.js';
}

const { LiquidishTransformer } = await import(mainPath);
const {
    ISPConfigTransformationStrategy,
    PHPTransformationStrategy
} = await import(strategiesPath);

globalThis.LiquidishTransformer = LiquidishTransformer;

globalThis.ISPConfigTransformationStrategy = ISPConfigTransformationStrategy;
globalThis.PHPTransformationStrategy = PHPTransformationStrategy;
