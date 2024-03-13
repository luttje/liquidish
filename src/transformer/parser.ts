import { getIndentationFromLineStart } from "../utils.js";
import { LiquidishTransformer } from "./transformer.js";

export type TransformParser = (transformer: LiquidishTransformer, ...args: any[]) => any[];

export const regexForVariable = /{{(-?)\s*([\w\.]+?(?:\[[^\]]*?\])*)?\s*(-?)}}/g;
export const regexForTokens = /({%(-?)\s*(LOGIC_TOKENS)\s*(.*?)\s*?(-?)%})|(VARIABLE)|(.+?)(?={%|\{\{|$)/gs;
export const regexForTokensGroupLogic = 1;
export const regexForTokensGroupLogicWhitespaceCommandPre = 2;
export const regexForTokensGroupLogicType = 3;
export const regexForTokensGroupLogicParameters = 4;
export const regexForTokensGroupLogicWhitespaceCommandPost = 5;
export const regexForTokensGroupText = 10;
export const regexForTokensGroupVariable = 6;
export const regexForTokensGroupVariableWhitespaceCommandPre = 7;
export const regexForTokensGroupVariableName = 8;
export const regexForTokensGroupVariableWhitespaceCommandPost = 9;

export type WhitespaceCommand = '-';

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

export type TokenBase = {
    type: string;
    indentation: number;
    whitespaceCommandPre?: WhitespaceCommand;
    whitespaceCommandPost?: WhitespaceCommand;
};

export type TextToken = {
    type: 'text';
    value: string;
} & TokenBase;

export type LiquidToken = {
    type: string;
    parameters?: string;
} & TokenBase;

export type Token = TextToken | LiquidToken;

export function isLiquidToken(token: Token): token is LiquidToken {
    return (token as LiquidToken).type !== 'text';
}

export function isTextToken(token: Token): token is TextToken {
    return (token as TextToken).type === 'text';
}

export type NodeBase = {
    type: string;
    indentation: number;
    whitespaceCommandPre?: WhitespaceCommand;
    whitespaceCommandPost?: WhitespaceCommand;
};

export type ParentNode = {
    parameters?: string;
    statements: Node[];
} & NodeBase;

export type SelfClosingNode = {
    parameters?: string;
} & NodeBase;

export type TextNode = {
    type: 'text';
    value: string;
} & NodeBase;

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
    const tokens: Token[] = [];
    let match: RegExpExecArray;

    const regex = buildLogicTokenRegex(logicTokens);

    while ((match = regex.exec(input)) !== null) {
        const indentation = getIndentationFromLineStart(input, match.index);
        const whitespaceCommandPre = match[regexForTokensGroupLogicWhitespaceCommandPre] as WhitespaceCommand;
        const whitespaceCommandPost = match[regexForTokensGroupLogicWhitespaceCommandPost] as WhitespaceCommand;
        let newToken: Token;

        if (match[regexForTokensGroupLogic]) {
            const parameters = match[regexForTokensGroupLogicParameters] !== ''
                ? match[regexForTokensGroupLogicParameters]
                : null;

            let type = match[regexForTokensGroupLogicType];
            type = typeRenaming[type] || type;

            tokens.push(newToken = {
                type,
                indentation,
                ...(whitespaceCommandPre && { whitespaceCommandPre }),
                ...(whitespaceCommandPost && { whitespaceCommandPost }),
                ...(parameters && { parameters })
            });
        } else if (match[regexForTokensGroupVariable]) {
            tokens.push(newToken = {
                type: 'variable',
                indentation,
                ...(whitespaceCommandPre && { whitespaceCommandPre }),
                ...(whitespaceCommandPost && { whitespaceCommandPost }),
                parameters: match[regexForTokensGroupVariableName].trim(),
            });
        } else if (match[regexForTokensGroupText]) {
            tokens.push(newToken = {
                type: 'text',
                indentation,
                ...(whitespaceCommandPre && { whitespaceCommandPre }),
                ...(whitespaceCommandPost && { whitespaceCommandPost }),
                value: match[regexForTokensGroupText]
            });
        } else {
            throw new Error('Unknown token type');
        }

        // Look before the token we just added to see if we need to trim whitespace
        if (tokens.length > 1) {
            const previousToken = tokens[tokens.length - 2];

            if (whitespaceCommandPre === '-' ) {
                if (isTextToken(previousToken)) {
                    previousToken.value = previousToken.value.trimEnd();
                    newToken.indentation = 0;
                }
            }

            if (isLiquidToken(previousToken) && previousToken.whitespaceCommandPost === '-') {
                newToken.indentation = 0;
                if (isTextToken(newToken)) {
                    newToken.value = newToken.value.trimStart();
                }
            }
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
                statements: [],
                indentation: token.indentation
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
                indentation: token.indentation,
                value: token.value,
            });
        } else {
            currentBlock.statements.push(<SelfClosingNode>{
                type: token.type,
                indentation: token.indentation,
                ...(token.parameters && { parameters: token.parameters }),
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
