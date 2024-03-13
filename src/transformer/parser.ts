import { LiquidishTransformer } from "./transformer.js";

export type TransformParser = (transformer: LiquidishTransformer, ...args: any[]) => any[];

export const regexForVariable = /{{\s*([\w\.]+?(?:\[[^\]]*?\])*)?\s*}}/g;
export const regexForTokens = /({%\s*(LOGIC_TOKENS)\s*(.*?)\s*?%})|(VARIABLE)|(.+?)(?={%|\{\{|$)/gs;
export const regexForTokensGroupLogic = 1;
export const regexForTokensGroupLogicType = 2;
export const regexForTokensGroupLogicParameters = 3;
export const regexForTokensGroupText = 6;
export const regexForTokensGroupVariable = 4;
export const regexForTokensGroupVariableName = 5;

export enum LogicTokenFlags {
    None = 0,
    OpensScope = 1,
    ClosesScope = 2
};

export type LogicToken = {
    type: string;
    flags?: LogicTokenFlags;
};

export const typeRenaming = {
    elsif: 'elseif'
};

export type TextToken = {
    type: 'text';
    value: string;
};

export type LiquidToken = {
    type: string;
    parameters?: string;
};

export type Token = TextToken | LiquidToken;

export function isLiquidToken(token: Token): token is LiquidToken {
    return (token as LiquidToken).type !== 'text';
}

export function isTextToken(token: Token): token is TextToken {
    return (token as TextToken).type === 'text';
}

export type ParentNode = {
    type: string;
    parameters?: string;
    statements: Node[];
};

export type SelfClosingNode = {
    type: string;
    parameters?: string;
};

export type TextNode = {
    type: 'text';
    value: string;
};

export type Node = ParentNode | SelfClosingNode | TextNode;

export function isParentNode(node: Node): node is ParentNode {
    return (node as ParentNode).statements !== undefined;
}

export function isSelfClosingNode(node: Node): node is SelfClosingNode {
    return (node as SelfClosingNode).type !== undefined;
}

export function isTextNode(node: Node): node is TextNode {
    return (node as TextNode).value !== undefined;
}

export function buildLogicTokenRegex(logicTokens: LogicToken[]) {
    const logicTokensRegex = logicTokens.map(token => token.type).join('|');

    return new RegExp(
        regexForTokens.source
            .replace('LOGIC_TOKENS', logicTokensRegex)
            .replace('VARIABLE', regexForVariable.source),
        regexForTokens.flags
    );
}

export function tokenizeLiquid(input: string, logicTokens: LogicToken[]): Token[] {
    const tokens = [];
    let match;

    const regex = buildLogicTokenRegex(logicTokens);

    while ((match = regex.exec(input)) !== null) {
        if (match[regexForTokensGroupLogic]) {
            const parameters = match[regexForTokensGroupLogicParameters] !== ''
                ? match[regexForTokensGroupLogicParameters]
                : null;

            let type = match[regexForTokensGroupLogicType];
            type = typeRenaming[type] || type;

            tokens.push({
                type,
                ...(parameters && { parameters })
            });
        } else if (match[regexForTokensGroupVariable]) {
            tokens.push(<SelfClosingNode>{
                type: 'variable',
                parameters: match[regexForTokensGroupVariableName].trim(),
            });
        } else if (match[regexForTokensGroupText]) {
            tokens.push(<TextNode>{
                type: 'text',
                value: match[regexForTokensGroupText]
            });
        }
    }

    return tokens;
}

export function parseTokens(tokens: Token[], logicTokens: LogicToken[]): Node[] {
    const root = <ParentNode>{
        type: 'root',
        statements: []
    };
    const stack: Node[] = [root];

    const opensScope = [];
    const closesScope = [];

    logicTokens.forEach(token => {
        if (token.flags & LogicTokenFlags.OpensScope) {
            opensScope.push(token.type);
        }

        if (token.flags & LogicTokenFlags.ClosesScope) {
            closesScope.push(token.type);
        }
    });

    tokens.forEach(token => {
        let currentBlock = stack[stack.length - 1];

        if (!isParentNode(currentBlock)) {
            throw new Error(`Can only open a scope in a parent node. Current block is ${currentBlock.type}!`);
        }

        if (opensScope.includes(token.type)) {
            const newNode: ParentNode = {
                type: token.type,
                statements: []
            };

            if (isLiquidToken(token) && token.parameters) {
                newNode.parameters = token.parameters;
            }

            currentBlock.statements.push(newNode);

            if (closesScope.includes(token.type)) {
                stack.pop();
            }

            stack.push(newNode);
        } else if (closesScope.includes(token.type)) {
            stack.pop();
        } else if (isTextToken(token)) {
            currentBlock.statements.push(<TextNode>{
                type: 'text',
                value: token.value
            });
        } else {
            currentBlock.statements.push(<SelfClosingNode>{
                type: token.type,
                ...(token.parameters && { parameters: token.parameters })
            });
        }
    });

    return root.statements;
}

/**
 * Finds the next statement in this if-statement by looking for the next elsif or else
 * inside the current if-statement.
 */
export function findNextStatementInIfStatement(ifNode: ParentNode): ParentNode | null {
    // It will also be at the end of the statements
    if (ifNode.statements.length === 0) {
        return null;
    }

    const lastStatement = ifNode.statements[ifNode.statements.length - 1];

    if (lastStatement.type !== 'else' && lastStatement.type !== 'elseif') {
        return null;
    }

    return <ParentNode>lastStatement;
}

/**
 * Given a root node and callback function, this function will go through each node, calling the callback function.
 */
export function walkNodes(root: Node, callback: (node: Node) => void) {
    callback(root);

    if (isParentNode(root)) {
        root.statements.forEach(statement => {
            walkNodes(statement, callback);
        });
    }
}

export function parseLiquid(input: string, logicTokens: LogicToken[]) {
    const tokens = tokenizeLiquid(input, logicTokens);
    return parseTokens(tokens, logicTokens);
}
