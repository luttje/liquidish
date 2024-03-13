import { describe, it, expect, vi } from 'vitest';
import { LiquidishTransformer } from '../src/transformer/transformer';
import { fixturesPath } from './test-utils';
import { PHPTransformationStrategy } from '../src/strategies/php-transformation-strategy';

function getPHPTransformer() {
    return new LiquidishTransformer({
        strategyBuilder: (transformer) => new PHPTransformationStrategy(transformer)
    });
}

describe('README Examples', () => {
    it('Metadata', () => {
        const transformer = getPHPTransformer();

        const inputCancelled = transformer.transform(`{% meta {
            "isChildOnly": true
        } %}`);

        expect(inputCancelled).toBeNull();

        transformer.pushToScope({ 'path': 'some/path' });
        const input = transformer.transform(`{% meta {
            "defaults": {
                "isChildOnly": true,
                "parameter": "value"
            }
        } %}`, 'some/path');
        const topScope = transformer.getScope();

        expect(input).toBe('');
        expect(topScope).toMatchObject({ isChildOnly: true, parameter: 'value' });
    });

    it('Whitespace control', () => {
        const transformer = getPHPTransformer();
        transformer.pushToScope({ 'value_that_is_true': true });
        transformer.pushToScope({ 'my_variable': 'Contents of my variable' });

        const input = transformer.transform(`{% if value_that_is_true %}\n\t{{ my_variable }}\n{% endif %} !`);
        const expected = `\n\tContents of my variable\n !`;
        expect(input).toEqual(expected);

        const inputControlled = transformer.transform(`{%- if value_that_is_true %}\n\t{{- my_variable }}\n{%- endif -%} !`);
        const expectedControlled = `Contents of my variable!`;

        expect(inputControlled).toEqual(expectedControlled);
    });
});
