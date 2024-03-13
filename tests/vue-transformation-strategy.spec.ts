import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { fixturesPath, readFixtureFile } from './test-utils';
import { LiquidishTransformer } from '../src/transformer/transformer';
import { VueTransformationStrategy } from '../src/strategies/vue-transformation-strategy';

function getVueTransformer() {
    return new LiquidishTransformer({
        strategyBuilder: (transformer) => new VueTransformationStrategy(transformer)
    });
}
function getVueConfigTransform(contents: string, path?: string) {
    path = path ?? fixturesPath;
    return getVueTransformer().transform(contents, path);
}

describe('VueJS Transformation Strategy', () => {
    it('should transform variables', () => {
        const transformed = getVueConfigTransform(`{{ VARIABLE }}`);
        expect(transformed).toBe('{{ VARIABLE }}');
    });

    it('should transform if-statments', () => {
        const transformed = getVueConfigTransform(`{% if VARIABLE %}A{% elsif VARIABLE %}B{% else %}C{% endif %}`);
        expect(transformed).toBe('<div v-if="$VARIABLE">A</div><div v-else-if="$VARIABLE">B</div><div v-else>C</div>');
    });

    it('should transform unless-statments', () => {
        const transformed = getVueConfigTransform(`{% unless VARIABLE %}A{% endunless %}`);
        expect(transformed).toBe('<div v-if="!VARIABLE">A</div>');
    });

    it('should transform custom pre tags', () => {
        const transformer = getVueTransformer();
        transformer.pushToScope({ 'cool': 'You' });

        const transformed = transformer.transform(`{% pre %}{{ cool }}{% endpre %}`);
        expect(transformed).toBe('<span v-pre>You</span>');
    });
});
