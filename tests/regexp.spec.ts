import { describe, it, expect } from 'vitest';
import { assertMatch } from './test-utils';
import {
    regexForIf,
    regexForLoopFor,
    regexForRender,
    regexForVariableString,
} from '../src/strategies/base-transformation-strategy';

describe('RegExp Tests for render', () => {
    it('render regex should match parameters', () => {
        const metaJson = {
            isChildOnly: true,
            defaults: {
                parameter: 'value',
            },
        };
        assertMatch(regexForRender, `'component', ${JSON.stringify(metaJson)}`);
    });
});

describe('RegExp Tests for if', () => {
    it('if regex should match if statements', () => {
        assertMatch(regexForIf, 'VARIABLE');

        assertMatch(regexForIf, 'complex.human.name == \'Anne\'');
        assertMatch(regexForIf, 'complex.human.name == "Anne"');

        // With operators and values
        assertMatch(regexForIf, 'VARIABLE OPERATOR "VALUE"');
        assertMatch(regexForIf, 'VARIABLE OPERATOR \'VALUE\'');

        // Matches with empty value
        assertMatch(regexForIf, 'VARIABLE OPERATOR ""');
        assertMatch(regexForIf, `VARIABLE OPERATOR ''`);
        assertMatch(regexForIf, `VARIABLE != '' \nVARIABLE2 == 'review'\n\n`);
        assertMatch(regexForIf, `VARIABLE != '' \nVARIABLE2 == 'review'\n\n`);
        assertMatch(regexForIf, `VARIABLE >= '' \nVARIABLE2 == 'review'\n\n`);
        assertMatch(regexForIf, `VARIABLE <= '' \nVARIABLE2 == "review"\n\n`);
        assertMatch(regexForIf, `VARIABLE <= "" \nVARIABLE2 == "review"\n\n`);
        assertMatch(regexForIf, `VARIABLE > '' \nVARIABLE2 == 'review'\n\n`);
        assertMatch(regexForIf, `VARIABLE < '' \nVARIABLE2 == 'review'\n\n`);

        // Try with some weird or missing spaces
        assertMatch(regexForIf, 'VARIABLE OPERATOR "VALUE"');
        assertMatch(regexForIf, 'VARIABLE OPERATOR "VALUE"');
        assertMatch(regexForIf, 'VARIABLE OPERATOR"VALUE"');
        assertMatch(regexForIf, 'VARIABLE OPERATOR "VALUE"');
    });
});

describe('RegExp Tests for loop-for', () => {
    it('loop-for regex should match loop-for statements', () => {
        assertMatch(regexForLoopFor, 'VARIABLE in ARRAY');
        assertMatch(regexForLoopFor, 'VARIABLE in ARRAY VARIABLE in ARRAY');
    });
});

describe('RegExp Tests for variable strings', () => {
    it('variable string regex should match variable strings', () => {
        assertMatch(regexForVariableString, 'key: \'string\'');
        assertMatch(regexForVariableString, 'anotherKey: "string"');
        assertMatch(regexForVariableString, 'ints: 42');
        assertMatch(regexForVariableString, 'floats: 3.14');
        assertMatch(regexForVariableString, 'bools: true');
        assertMatch(regexForVariableString, 'bools: false');
        assertMatch(regexForVariableString, 'nulls: null');
        assertMatch(regexForVariableString, 'nulls: null, key: \'string\'');
        assertMatch(regexForVariableString, 'key: \'string\', anotherKey: "string", ints: 42, floats: 3.14, bools: true, false, nulls: null');
    });
});
