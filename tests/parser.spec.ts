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
                indentation: 0,
            }
        ];

        expect(parseLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should parse a liquid string', () => {
        const input = `{% meta isChildOnly %}{% render "component" %}{% if some.nested.variable %}{% render "componentB" %}{% endif %}`;

        const expected = [
            {
                type: 'meta',
                indentation: 0,
                parameters: 'isChildOnly',
            },
            {
                type: 'render',
                indentation: 0,
                parameters: `"component"`,
            },
            {
                type: 'if',
                indentation: 0,
                parameters: 'some.nested.variable',
                statements: [
                    {
                        type: 'render',
                        indentation: 0,
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
                indentation: 0,
                statements: [
                    {
                        type: 'if',
                        indentation: 0,
                        parameters: 'some.nested.variable',
                        statements: [
                            {
                                type: 'render',
                                indentation: 0,
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
                indentation: 0,
                parameters: 'some.nested.variable',
                statements: [
                    {
                        type: 'render',
                        indentation: 0,
                        parameters: `"component"`,
                    },
                    {
                        type: 'if',
                        indentation: 0,
                        parameters: 'some.other.variable',
                        statements: [
                            {
                                type: 'render',
                                indentation: 0,
                                parameters: `"componentB"`,
                            }
                        ]
                    },
                    {
                        type: 'elseif',
                        indentation: 0,
                        parameters: 'some.other.variable',
                        statements: [
                            {
                                type: 'variable',
                                indentation: 0,
                                parameters: `my.var`,
                            },
                            {
                                type: 'if',
                                indentation: 0,
                                parameters: 'some.other.variable',
                                statements: [
                                    {
                                        type: 'render',
                                        indentation: 0,
                                        parameters: `"componentD"`,
                                    },
                                    {
                                        type: 'else',
                                        indentation: 0,
                                        statements: [
                                            {
                                                type: 'render',
                                                indentation: 0,
                                                parameters: `"componentE"`,
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                type: 'else',
                                indentation: 0,
                                statements: [
                                    {
                                        type: 'render',
                                        indentation: 0,
                                        parameters: `"componentF"`,
                                    },
                                    {
                                        type: 'if',
                                        indentation: 0,
                                        parameters: 'some.other.variable',
                                        statements: [
                                            {
                                                type: 'render',
                                                indentation: 0,
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
    it('should tokenize a liquid string', () => {
        const input = `{% meta isChildOnly %}{% render "component" %}{% if true %}{% render "component" %}{% endif %}`;

        const expected = [
            {
                type: 'meta',
                indentation: 0,
                parameters: 'isChildOnly',
            },
            {
                type: 'render',
                indentation: 0,
                parameters: '"component"',
            },
            {
                type: 'if',
                indentation: 0,
                parameters: 'true',
            },
            {
                type: 'render',
                indentation: 0,
                parameters: '"component"',
            },
            {
                type: 'endif',
                indentation: 0,
            },
        ];

        expect(tokenizeLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should tokenize a liquid string with variables', () => {
        const input = `{% meta isChildOnly %}\n\t{% render "component" %}\n\t{% if true %}\n\t\t{% render "component" %}\n\t\t{{ variable }}\n\t{% endif %}`;

        const expected = [
            {
                type: 'meta',
                indentation: 0,
                parameters: 'isChildOnly',
            },
            {
                type: 'text',
                indentation: 0,
                value: '\n\t',
            },
            {
                type: 'render',
                indentation: 1,
                parameters: '"component"',
            },
            {
                type: 'text',
                indentation: 1,
                value: '\n\t',
            },
            {
                type: 'if',
                indentation: 1,
                parameters: 'true',
            },
            {
                type: 'text',
                indentation: 1,
                value: '\n\t\t',
            },
            {
                type: 'render',
                indentation: 2,
                parameters: '"component"',
            },
            {
                type: 'text',
                indentation: 2,
                value: '\n\t\t',
            },
            {
                type: 'variable',
                indentation: 2,
                parameters: 'variable',
            },
            {
                type: 'text',
                indentation: 2,
                value: '\n\t',
            },
            {
                type: 'endif',
                indentation: 1,
            }
        ];

        expect(tokenizeLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should tokenize a liquid string with comments', () => {
        const input = `\t{% comment %}\n\t\tThis is a comment\n\t{% endcomment %}`;

        const expected = [
            {
                type: 'text',
                indentation: 0,
                value: `\t`
            },
            {
                type: 'comment',
                indentation: 1,
            },
            {
                type: 'text',
                indentation: 1,
                value: `\n\t\tThis is a comment\n\t`
            },
            {
                type: 'endcomment',
                indentation: 1,
            }
        ];

        expect(tokenizeLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should tokenize a liquid string with unless', () => {
        const input = `{% unless variable %}Here's some text 🧐{% endunless %}`;

        const expected = [
            { type: 'unless', indentation: 0, parameters: 'variable' },
            { type: 'text', indentation: 0, value: `Here's some text 🧐` },
            { type: 'endunless', indentation: 0, }
        ];

        expect(tokenizeLiquid(input, defaultLogicTokens)).toEqual(expected);
    });

    it('should tokenize a liquid string with whitespace control', () => {
        const input = `\n{%- if variable -%}\nHere's some text 🧐{% endunless %}`;

        const expected = [
            { type: 'text', indentation: 0, value: `` },
            { type: 'if', indentation: 0, parameters: 'variable', whitespaceCommandPre: '-', whitespaceCommandPost: '-' },
            { type: 'text', indentation: 0, value: `Here's some text 🧐` },
            { type: 'endunless', indentation: 0, }
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

        const nextStatement = findNextStatementInIfStatement(ifNode)!;
        expect(nextStatement.type).toBe('elseif');
        expect(nextStatement.parameters).toBe(`some.other.variable == 'x'`);

        const nextNextStatement = findNextStatementInIfStatement(<ParentNode>nextStatement)!;
        expect(nextNextStatement.type).toBe('else');

        const nextNextNextStatement = findNextStatementInIfStatement(<ParentNode>nextNextStatement);
        expect(nextNextNextStatement).toBe(null);
    });
});
