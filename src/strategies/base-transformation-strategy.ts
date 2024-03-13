import { CancellationRequestedError } from "../transformer/cancellation-requested-error.js";
import { LogicToken, LogicTokenFlags, Node, ParentNode, SelfClosingNode, TextNode, findNextStatementInIfStatement, isParentNode, regexForVariable, walkNodes } from "../transformer/parser.js";
import { buildVariablesScope, isNumericString, readComponentWithIndentation, unescapeValue } from "../utils.js";
import { AbstractTransformationStrategy, MetaData } from "./abstract-transformation-strategy.js";

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

// ! NOTE: For simplicty sake the JSON cannot contain %}
export const regexForRender = /((?:'[^']+?)'|"(?:[^']+?)"){1}(?:\s*,\s*((?:[^%]+?|%(?!}))*))?/;
export const regexForVariableString = /(\w+):\s*((?:"(?:[^"\\]|\\.)*?"|'(?:[^'\\]|\\.)*?'|\d+\.\d+|\d+|true|false|null))/g;

// item in items
export const regexForLoopFor = /(\w+)\s+in\s+(\w+)/;

// `VARIABLE OPERATOR 'VALUE'`
export const regexForIf = /([\w\.]+)(?:\s+(\S+)\s*((?:'[^']*?')|(?:"[^"]*?")))?/;

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

    protected transformNode(node: Node): string | null {
        this.transformer.setCurrentIndentation(node.indentation);

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
                // These are handled by if
                return null;
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
        const matches = node.parameters.match(regexForLoopFor);
        const itemName = matches[1];
        const collectionName = matches[2];

        return this.for(itemName, collectionName, node.statements);
    }

    protected parseIf(node: ParentNode): string {
        const scope = this.transformer.getScope();

        let output = '';

        // The first node is the if-statement, the last node in the statements array may be and else/elseif-statement, inside that the same pattern repeats
        let currentNode = node;
        let isOutputting = true;

        while (currentNode) {
            if (currentNode.type === 'else') {
                if (isOutputting) {
                    output += this.else();
                    output += this.statementsToText(currentNode.statements);
                }

                // Else is always the last statement in an if-statement
                break;
            }

            const matches = currentNode.parameters.match(regexForIf);
            const name = matches[1];
            const op = matches[2];
            const value = matches[3] ? unescapeValue(matches[3]) : undefined;

            if (scope[name] !== undefined) {
                isOutputting = false;
            }

            if (isOutputting) {
                if (currentNode.type === 'if') {
                    output += this.if(name, op, value);
                } else if (currentNode.type === 'elseif') {
                    output += this.elseif(name, op, value);
                } else {
                    throw new Error(`Unknown node type: ${currentNode.type}`);
                }

                output += this.statementsToText(currentNode.statements, true);
            } else {
                const result = this.performIf(scope[name], op, value);

                if (result) {
                    output += this.statementsToText(currentNode.statements, true);
                    console.log(`[${output}]`);
                    break;
                }
            }

            currentNode = findNextStatementInIfStatement(currentNode);
        }

        if (isOutputting) {
            output += this.endif();
        }

        return output;
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

        let output = this.unless(name);
        output += this.statementsToText(node.statements);
        output += this.endunless();

        return output;
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

    /**
     * @inheritdoc
     */
    protected for(itemName: string, collectionName: string, statements: Node[]): string {
        const scope = this.transformer.getScope();

        if (!Array.isArray(scope[collectionName])) {
            throw new Error(`The collection ${collectionName} is not an array. It's a ${typeof scope[collectionName]} (in ${this.transformer.getPath()})}`);
        }

        /** @type {any[]} */
        const collection = scope[collectionName];

        return collection.map(item => {
            const variables = {};
            buildVariablesScope(item, itemName, variables);

            this.transformer.pushToScope(variables);

            const transformed = this.transformer.transform(this.statementsToText(statements, false, true));

            // Clean up the scope after processing a block/component
            this.transformer.popScope();

            return transformed;
        }).join('');
    }

    /**
     * @inheritdoc
     */
    override render(component: string, variables: Record<string, string>): string {
        const indentation = this.transformer.getCurrentIndentation();
        const { contents, path } = readComponentWithIndentation(this.transformer.getPath(), component, indentation);

        this.transformer.pushToScope({
            ...variables,
            path
        });

        const transformed = this.transformer.transform(contents);

        // Clean up the scope after processing a block/component
        this.transformer.popScope();

        return transformed;
    }
}
