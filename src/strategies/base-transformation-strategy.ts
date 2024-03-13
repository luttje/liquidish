import { CancellationRequestedError } from "../transformer/cancellation-requested-error.js";
import { LogicToken, LogicTokenFlags, Node, ParentNode, SelfClosingNode, TextNode } from "../transformer/parser.js";
import { buildVariablesScope, isNumericString } from "../utils.js";
import { AbstractTransformationStrategy, IfStatementBlock, MetaData } from "./abstract-transformation-strategy.js";

export const defaultLogicTokens: LogicToken[] = [
    { type: 'comment', flags: LogicTokenFlags.OpensScope },
    { type: 'endcomment', flags: LogicTokenFlags.ClosesScope },
    { type: 'if', flags: LogicTokenFlags.OpensScope },
    { type: 'elseif', flags: LogicTokenFlags.OpensScope | LogicTokenFlags.ClosesScope },
    { type: 'elsif', flags: LogicTokenFlags.OpensScope | LogicTokenFlags.ClosesScope },
    { type: 'else', flags: LogicTokenFlags.OpensScope | LogicTokenFlags.ClosesScope },
    { type: 'endif', flags: LogicTokenFlags.ClosesScope },
    { type: 'unless', flags: LogicTokenFlags.OpensScope },
    { type: 'endunless', flags: LogicTokenFlags.ClosesScope },
    { type: 'for', flags: LogicTokenFlags.OpensScope },
    { type: 'endfor', flags: LogicTokenFlags.ClosesScope },
    { type: 'meta' },
    { type: 'render' },
];

/**
 * Prevent users from using reserved keywords
 */
function sanityCheckReservedKeywords(variables?: Record<string, any>) {
    if (!variables) {
        return;
    }

    for (const key of Object.keys(variables)) {
        if (key !== '___') {
            continue;
        }

        const value = variables[key];

        if (value === 'dont-show-it' || value === 'show-it') {
            throw new Error('The variable name "___" with the value "dont-show-it" or "show-it" is reserved');
        }
    }
}

/**
 *
 * Available transformations:
 *
 */

/**
 * Custom transformations (wont be transformed to ISPConfig's template language)
 */

// {% meta {
//   "isChildOnly": true,
//   "defaults": {
//     "parameter": "value"
//   }
// } %}
// export const regexForMeta = /{%\s*meta\s*?(?:\s*\s*((?:[^%]+?|%(?!}))*))*?\s*%}/g;
// addDefaultTransform('meta', regexForMeta, (transformer, metaString) => {
//     let meta: MetaData = {};

//     try {
//         meta = JSON.parse(metaString);
//     } catch (e) {
//         throw new Error(`Invalid JSON in meta tag: ${metaString}`);
//     }

//     sanityCheckReservedKeywords(meta.defaults);

//     return [
//         meta,
//     ];
// });

// {% render 'COMPONENT' %}
// {% render 'COMPONENT', variable: 'value', another: 'value' %}
// {% render 'render-json-component.liquid', {
//     "slot": "{{ logout_txt }} {{ cpuser }}",
//     "attributes": [
//         ["id", "logout-button"],
//         ["data-load-content", "login/logout.php"]
//     ]
// }
// NOTE: For simplicty sake the JSON cannot contain %}
export const regexForRender = /((?:'[^']+?)'|"(?:[^']+?)"){1}(?:\s*,\s*((?:[^%]+?|%(?!}))*))?/;
export const regexForVariableString = /(\w+):\s*((?:"(?:[^"\\]|\\.)*?"|'(?:[^'\\]|\\.)*?'|\d+\.\d+|\d+|true|false|null))/g;

// {% for item in items %}
//     {{ item[0] }}="{{ item[1] }}"
// {% endfor %}
// export const regexForLoopFor = /\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}(.*?)\{%\s*endfor\s*%\}/gs;
// addDefaultTransform('for', regexForLoopFor, (transformer, itemName, collectionName, statement) => {
//     const scope = transformer.getScope();

//     // trim only leading whitespace
//     statement = statement.replace(/^\s+/, '');

//     // Check if statement is a nested for loop, if it is, throw an error
//     if (refreshedRegex(regexForLoopFor).test(statement + ' {% endfor %}')) {
//         throw new Error('Nested for loops are not supported');
//     }

//     if (!Array.isArray(scope[collectionName])) {
//         throw new Error(`The collection ${collectionName} is not an array. It's a ${typeof scope[collectionName]} (in ${transformer.getPath()})}`);
//     }

//     return [
//         itemName,
//         collectionName,
//         statement
//     ];
// });

/**
 * Variable
 */
// `{{ VARIABLE }}`
// export const regexForVariable = /{{\s*([\w\.]+?(?:\[[^\]]*?\])*)?\s*}}/g;
// addDefaultTransform('variable', regexForVariable);

/**
 * If-statement
 */
// `{% if VARIABLE OPERATOR 'VALUE' %} ... {% elsif ... %} ... {% else %} {% endif %}`
// `{% if VARIABLE OPERATOR "VALUE" %} ... {% endif %}`
// `{% if VARIABLE %} ... {% endif %}`

// addDefaultTransform('if', regexForFirstIfThroughLastEndif, (transformer, input) => {
//     const tokens = tokenizeLiquid(input);
//     const parsed = parseTokens(tokens);

//     console.log(parsed);
//     // return [
//     //     parsed
//     // ];
//     return [];
// });

/**
 * @public
 */
export abstract class BaseTransformationStrategy extends AbstractTransformationStrategy {
    /**
     * @inheritdoc
     */
    override getLogicTokens(): LogicToken[] {
        return [
            ...defaultLogicTokens,
        ];
    }

    protected transformNode(node: Node): string {
        switch (node.type) {
            case 'comment':
                return this.parseComment(<ParentNode>node);
            case 'meta':
                return this.parseMeta(<ParentNode>node);
            case 'render':
                return this.parseRender(<SelfClosingNode>node);
            case 'for':
                return this.parseFor(<ParentNode>node);
            case 'if':
                return this.parseIf(<ParentNode>node);
            case 'unless':
                return this.parseUnless(<ParentNode>node);
            case 'variable':
                return this.parseVariable(<SelfClosingNode>node);
            case 'text':
                return (<TextNode>node).value;
            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    protected parseComment(node: ParentNode): string {
        return this.comment(this.statementsToText(node.statements));
    }

    protected parseMeta(node: SelfClosingNode): string {
        const metaData = JSON.parse(node.parameters);
        return this.meta(metaData);
    }

    protected parseRender(node: SelfClosingNode): string {
        const parameters = node.parameters;
        const matches = parameters.match(regexForRender);

        if (!matches) {
            throw new Error(`Invalid render statement: ${parameters}`);
        }

        let component = matches[1];
        const variablesString = matches[2];

        const variables = {};

        if (variablesString) {
            // Try parse it as JSON
            try {
                const parsed = JSON.parse(variablesString);

                sanityCheckReservedKeywords(parsed);

                if (typeof parsed === 'object') {
                    for (const [key, value] of Object.entries(parsed)) {
                        variables[key] = value;
                    }
                }
            } catch (e) {
                // It's not JSON, so it's a string with key-value pairs
                let match;

                while ((match = regexForVariableString.exec(variablesString)) !== null) {
                    const name = match[1];
                    let value = match[2]
                    const quoteType = value[0];
                    value = value.slice(1, -1);

                    // Unescape the value
                    value = value.replace(new RegExp(`\\\\${quoteType}`, 'g'), quoteType);

                    variables[name] = value;
                }
            }
        }

        component = component.slice(1, -1); // trim quotes

        return this.render(component, variables);
    }

    protected parseFor(node: ParentNode): string {
        const [itemName, collectionName, statement] = this.parseForItemNameCollectionNameAndStatement(node);
        return this.for(itemName, collectionName, statement);
    }

    protected parseIf(node: ParentNode): string {
        // Go through the if statement and parse it into a more usable format
        const blocks: IfStatementBlock[] = [];

        let currentBlock: IfStatementBlock = {
            type: 'if',
            name: '',
            op: '',
            value: '',
            statements: '',
        };

        for (const child of node.statements) {
            if (child.type === 'text') {
                currentBlock.statements += (<TextNode>child).value;
                continue;
            }

            const text = this.statementsToText(child.statements);

            switch (child.type) {
                case 'if':
                    blocks.push(currentBlock);
                    currentBlock = {
                        type: 'if',
                        name: text,
                        op: '',
                        value: '',
                        statements: '',
                    };
                    break;
                case 'elseif':
                case 'elsif':
                    blocks.push(currentBlock);
                    currentBlock = {
                        type: 'elseif',
                        name: text,
                        op: '',
                        value: '',
                        statements: '',
                    };
                    break;
                case 'else':
                    blocks.push(currentBlock);
                    currentBlock = {
                        type: 'else',
                        statements: '',
                    };
                    break;
                default:
                    throw new Error(`Unknown if statement block type: ${child.type}`);
            }
        }
    }

    protected parseUnless(node: ParentNode): string {
        const [name, statements] = this.parseUnlessNameAndStatements(node);
        return this.unless(name, statements);
    }

    protected parseVariable(node: SelfClosingNode): string {
        return this.variable(node.parameters);
    }

    /**
     * @inheritdoc
     */
    override meta(meta: MetaData): string {
        if (meta.isChildOnly && this.transformer.isRoot()) {
            throw new CancellationRequestedError();
        }

        // We check the entire scope, and place the default values in the current scope (so they get popped off when the file is done)
        var scope = this.transformer.getScope();
        var currentScope = this.transformer.peekScope();

        for (const [key, value] of Object.entries(meta.defaults || {})) {
            if (scope[key] === undefined) {
                buildVariablesScope(value, key, currentScope);
            }
        }

        return '';
    }

    protected performIf(actual: any, op: string, expected: string): boolean {
        const isTruthy = (value: any) => {
            if (value === undefined || value === null) {
                return false;
            }

            if (typeof value === 'string') {
                return value.length > 0;
            } else if (typeof value === 'number') {
                return value !== 0;
            } else if (typeof value === 'boolean') {
                return value;
            } else if (Array.isArray(value)) {
                return value.length > 0;
            } else if (typeof value === 'object' && value !== null) {
                return true;
            }

            return false;
        }

        switch (op) {
            case undefined:
                return isTruthy(actual);
            case '==':
                // If both are numeric strings or one is a numeric string and the other is a number, compare as numbers
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) == Number(expected);
                }
                return actual == expected;
            case '!=':
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) != Number(expected);
                }
                return actual != expected;
            case '>':
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) > Number(expected);
                }
                return actual > expected;
            case '<':
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) < Number(expected);
                }
                return actual < expected;
            case '>=':
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) >= Number(expected);
                }
                return actual >= expected;
            case '<=':
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) <= Number(expected);
                }
                return actual <= expected;
            default:
                throw new Error(`Invalid operator: ${op}`);
        }
    }
}
