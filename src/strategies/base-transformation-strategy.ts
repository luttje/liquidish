import { CancellationRequestedError } from "../transformer/cancellation-requested-error.js";
import { LogicToken, LogicTokenFlags, Node, ParentNode, SelfClosingNode, TextNode, findNextStatementInIfStatement, isParentNode, regexForVariable, walkNodes } from "../transformer/parser.js";
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
// `VARIABLE OPERATOR 'VALUE'`
export const regexForIf = /([\w\.]+)(?:\s+(\S+)\s*((?:'[^']*?')|(?:"[^"]*?")))?/;

function unescapeValue(value: string): string {
    const quoteType = value[0];

    if (quoteType !== '"' && quoteType !== "'") {
        return value;
    }

    value = value.slice(1, -1);

    // Unescape the value
    value = value.replace(new RegExp(`\\\\${quoteType}`, 'g'), quoteType);

    return value;
}

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
            case 'elseif':
            case 'else':
                // TODO: Should we not try transform earlier?
                console.warn(`The node type "${node.type}" is not supported by the transformation strategy`);
                return '';
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
                    const value = unescapeValue(match[2]);

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
        const matches = node.parameters.match(regexForIf);
        const name = matches[1];
        const op = matches[2];
        const value = matches[3] ? unescapeValue(matches[3]) : undefined;

        const scope = this.transformer.getScope();
        // Check the first if-statement (node) to see if the name is defined in the current scope
        // If it is and it's a truthy value, return the statements (not showing the if-statement)
        // If it is and it's a falsy value, `findNextStatementInIfStatement` will return the next elseif/else-statement
        // Check again if that is a truthy value, if it is, return the statements (not showing the elseif/else-statement)
        // Repeat that until we find a truthy value or we reach the end of the if-statement
        // If the name is not defined in the current scope, return the if-statement as is using this.if

        if (scope[name] !== undefined) {
            // if (this.performIf(scope[name], op, value)) {
            //     return this.statementsToText(node.statements, true);
            // }

            // const nextStatement = findNextStatementInIfStatement(node);

            // if (nextStatement) {
            //     return 'x'+this.transformNode(nextStatement);
            // }

            // return '';
        }

        let ifStatementBlocks: IfStatementBlock[] = [];

        // The first node is the if-statement, the last node in the statements array may be and else/elseif-statement, inside that the same repeats

        // ifStatementBlocks.push({
        //     type: 'if',
        //     name,
        //     op,
        //     value,
        //     statements: this.statementsToText(node.statements, true),
        // });

        let currentNode = node;

        while (currentNode) {
            if (currentNode.type === 'else') {
                ifStatementBlocks.push({
                    type: 'else',
                    statements: this.statementsToText(currentNode.statements, true),
                });

                break;
            }

            const matches = currentNode.parameters.match(regexForIf);
            const name = matches[1];
            const op = matches[2];
            const value = matches[3] ? unescapeValue(matches[3]) : undefined;

            ifStatementBlocks.push({
                type: currentNode.type as 'if' | 'elseif' | 'else',
                name,
                op,
                value,
                statements: this.statementsToText(currentNode.statements, true),
            });

            currentNode = findNextStatementInIfStatement(currentNode);
        }

        return this.if(ifStatementBlocks);
    }

    protected parseUnless(node: ParentNode): string {
        const matches = node.parameters.match(regexForIf);
        const name = matches[1];
        const op = matches[2];
        const value = matches[3] ? unescapeValue(matches[3]) : undefined;

        const scope = this.transformer.getScope();

        if (scope[name] !== undefined) {
            if (!this.performIf(scope[name], op, value)) {
                return this.statementsToText(node.statements, true);
            }

            const nextStatement = findNextStatementInIfStatement(node);

            if (nextStatement) {
                return this.transformNode(nextStatement);
            }

            return '';
        }

        return this.unless(name, this.statementsToText(node.statements));
    }

    protected parseVariable(node: SelfClosingNode): string {
        const scope = this.transformer.getScope();
        const name = node.parameters;

        // If the variable is defined in the current scope, use it
        if (scope[name] !== undefined) {
            const variable = scope[name];

            // We may have been passed a variable, try parse it
            const matches = new RegExp(regexForVariable.source, 'g').exec(variable);

            if (!matches) {
                return variable;
            }

            return variable.replace(regexForVariable, (match, name) => {
                return this.variable(name);
            });
        }

        return this.variable(name);
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
