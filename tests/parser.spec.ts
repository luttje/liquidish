import { describe, it, expect, vi } from 'vitest';
import { ParentNode, findNextStatementInIfStatement, parseLiquid, tokenizeLiquid, walkNodes } from '../src/transformer/parser';
import { defaultLogicTokens } from '../src/strategies/base-transformation-strategy';

describe('parseLiquid', () => {
    it('should parse a text liquid string', () => {
        const input = `This is a % simple string %\n\nasd`;

        const expected = [
            {
                type: 'text',
                value: 'This is a % simple string %\n\nasd',
            }
        ];

        expect(parseLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should parse a simple liquid string', () => {
        const input = `{% meta isChildOnly %}{% render "component" %}{% if some.nested.variable %}{% render "componentB" %}{% endif %}`;

        const expected = [
            {
                type: 'meta',
                parameters: 'isChildOnly',
            },
            {
                type: 'render',
                parameters: `"component"`,
            },
            {
                type: 'if',
                parameters: 'some.nested.variable',
                statements: [
                    {
                        type: 'render',
                        parameters: `"componentB"`,
                    }
                ]
            }
        ];

        expect(parseLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should parse a liquid string where an if is contained in a comment', () => {
        const input = `{% comment %}{% if some.nested.variable %}{% render "componentB" %}{% endif %}{% endcomment %}`;

        const expected = [
            {
                type: 'comment',
                statements: [
                    {
                        type: 'if',
                        parameters: 'some.nested.variable',
                        statements: [
                            {
                                type: 'render',
                                parameters: `"componentB"`,
                            }
                        ]
                    }
                ]
            }
        ];

        expect(parseLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should parse complex nested liquid strings', () => {
        const input =
            `{% if some.nested.variable %}`
                + `{% render "component" %}`
                + `{% if some.other.variable %}`
                    + `{% render "componentB" %}`
                + `{% endif %}`
            + `{% elseif some.other.variable %}`
                + `{{ my.var }}`
                + `{% if some.other.variable %}`
                    + `{% render "componentD" %}`
                + `{% else %}`
                    + `{% render "componentE" %}`
                + `{% endif %}`
            + `{% else %}`
                + `{% render "componentF" %}`
                + `{% if some.other.variable %}`
                    + `{% render "componentG" %}`
                + `{% endif %}`
            + `{% endif %}`;

        const expected = [
            {
                type: 'if',
                parameters: 'some.nested.variable',
                statements: [
                    {
                        type: 'render',
                        parameters: `"component"`,
                    },
                    {
                        type: 'if',
                        parameters: 'some.other.variable',
                        statements: [
                            {
                                type: 'render',
                                parameters: `"componentB"`,
                            }
                        ]
                    },
                    {
                        type: 'elseif',
                        parameters: 'some.other.variable',
                        statements: [
                            {
                                type: 'variable',
                                parameters: `my.var`,
                            },
                            {
                                type: 'if',
                                parameters: 'some.other.variable',
                                statements: [
                                    {
                                        type: 'render',
                                        parameters: `"componentD"`,
                                    },
                                    {
                                        type: 'else',
                                        statements: [
                                            {
                                                type: 'render',
                                                parameters: `"componentE"`,
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                type: 'else',
                                statements: [
                                    {
                                        type: 'render',
                                        parameters: `"componentF"`,
                                    },
                                    {
                                        type: 'if',
                                        parameters: 'some.other.variable',
                                        statements: [
                                            {
                                                type: 'render',
                                                parameters: `"componentG"`,
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                ]
            }
        ];

        const parsed = parseLiquid(input, defaultLogicTokens);
        expect(parsed).toEqual(expected);
        expect(parsed.length).toBe(1); // The if is the only top-level statement, all other statements are nested. Related ifelse/else are the last in the statements array.
    });
});

describe('tokenizeLiquid', () => {
    it('should tokenize a simple liquid string', () => {
        const input = `{% meta isChildOnly %}{% render "component" %}{% if true %}{% render "component" %}{% endif %}`;

        const expected = [
            { type: 'meta', parameters: 'isChildOnly' },
            { type: 'render', parameters: '"component"' },
            { type: 'if', parameters: 'true' },
            { type: 'render', parameters: '"component"' },
            { type: 'endif' }
        ];

        expect(tokenizeLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should tokenize a simple liquid string with variables', () => {
        const input = `{% meta isChildOnly %}\n\t{% render "component" %}\n\t{% if true %}\n\t\t{% render "component" %}\n\t\t{{ variable }}\n\t{% endif %}`;

        const expected = [
            { type: 'meta', parameters: 'isChildOnly' },
            { type: 'text', value: '\n\t' },
            { type: 'render', parameters: '"component"' },
            { type: 'text', value: '\n\t' },
            { type: 'if', parameters: 'true' },
            { type: 'text', value: '\n\t\t' },
            { type: 'render', parameters: '"component"' },
            { type: 'text', value: '\n\t\t' },
            { type: 'variable', parameters: 'variable' },
            { type: 'text', value: '\n\t' },
            { type: 'endif' }
        ];

        expect(tokenizeLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should tokenize a simple liquid string with comments', () => {
        const input = `\t{% comment %}\n\t\tThis is a comment\n\t{% endcomment %}`;

        const expected = [
            {
                type: 'text',
                value: `\t`
            },
            { type: 'comment' },
            {
                type: 'text',
                value: `\n\t\tThis is a comment\n\t`
            },
            { type: 'endcomment' }
        ];

        expect(tokenizeLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should tokenize a simple liquid string with unless', () => {
        const input = `{% unless variable %}Here's some text 🧐{% endunless %}`;

        const expected = [
            { type: 'unless', parameters: 'variable' },
            { type: 'text', value: `Here's some text 🧐` },
            { type: 'endunless' }
        ];

        expect(tokenizeLiquid(input, defaultLogicTokens)).toEqual(expected);
    });
});

describe('walkNodes', () => {
    it('should walk through all nodes', () => {
        const input =
            `{% if some.nested.variable %}`
                + `{% render "component" %}`
                + `{% if some.other.variable %}`
                    + `{% render "componentB" %}`
                + `{% endif %}`
            + `{% elseif some.other.variable == 'x' %}`
                + `{% render "componentC" %}`
                + `{% if some.other.variable %}`
                    + `{% render "componentD" %}`
                + `{% else %}`
                    + `{% render "componentE" %}`
                + `{% endif %}`
            + `{% else %}`
                + `{% render "componentF" %}`
                + `{% if some.other.variable %}`
                    + `{% render "componentG" %}`
                + `{% endif %}`
            + `{% endif %}`;

        const parsed = parseLiquid(input, defaultLogicTokens);

        const callback = vi.fn();
        walkNodes(parsed[0], callback);

        expect(callback).toHaveBeenCalledTimes(14);
    });
});

describe('findNextStatementInIfStatement', () => {
    it('should find the next statement in an if-statement', () => {
        const input =
            `{% if some.nested.variable %}`
                + `{% render "component" %}`
                + `{% if some.other.variable %}`
                    + `{% render "componentB" %}`
                + `{% endif %}`
            + `{% elseif some.other.variable == 'x' %}`
                + `{% render "componentC" %}`
                + `{% if some.other.variable %}`
                    + `{% render "componentD" %}`
                + `{% else %}`
                    + `{% render "componentE" %}`
                + `{% endif %}`
            + `{% else %}`
                + `{% render "componentF" %}`
                + `{% if some.other.variable %}`
                    + `{% render "componentG" %}`
                + `{% endif %}`
            + `{% endif %}`;

        const parsed = parseLiquid(input, defaultLogicTokens);

        const ifNode = (<ParentNode>parsed[0]);

        const nextStatement = findNextStatementInIfStatement(ifNode);
        expect(nextStatement.type).toBe('elseif');
        expect(nextStatement.parameters).toBe(`some.other.variable == 'x'`);

        const nextNextStatement = findNextStatementInIfStatement(<ParentNode>nextStatement);
        expect(nextNextStatement.type).toBe('else');

        const nextNextNextStatement = findNextStatementInIfStatement(<ParentNode>nextNextStatement);
        expect(nextNextNextStatement).toBe(null);
    });
});
