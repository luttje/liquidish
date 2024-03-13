import { LogicToken, Node, walkNodes } from "../transformer/parser.js";
import { LiquidishTransformer } from "../transformer/transformer.js";

export type MetaData = {
    isChildOnly?: boolean;
    defaults?: Record<string, any>;
    [key: string]: any;
};

export type IfStatementBlockBase = {
    type: string;
    statements: string;
};

export type IfStatementBlockIf = {
    type: 'if';
    name: string;
    op?: string;
    value?: string;
} & IfStatementBlockBase;

export type IfStatementBlockElseIf = {
    type: 'elseif';
    name: string;
    op?: string;
    value?: string;
} & IfStatementBlockBase;

export type IfStatementBlockElse = {
    type: 'else';
} & IfStatementBlockBase;

export type IfStatementBlock = IfStatementBlockIf | IfStatementBlockElseIf | IfStatementBlockElse;

/**
 * Base class for transformation strategies.
 *
 * @public
 */
export abstract class AbstractTransformationStrategy {
    protected transformer: LiquidishTransformer;

    constructor(transformer: LiquidishTransformer) {
        this.transformer = transformer;
    }

    public transform(ast: Node[]): string {
        let output = '';

        for (const node of ast) {
            output += this.transformNode(node);
        }

        return output;
    }

    protected statementsToText(statements: Node[]): string {
        let output = '';

        for (const node of statements) {
            walkNodes(node, (node) => {
                output += this.transformNode(node);
            });
        }

        return output;
    }

    protected abstract transformNode(node: Node): string;

    public abstract getLogicTokens(): LogicToken[];

    public abstract meta(meta: MetaData): string;

    public abstract comment(comment: string): string;

    public abstract render(component: string, variables: Record<string, string>): string;

    public abstract for(itemName: string, collectionName: string, statements: string): string;

    public abstract if(statementBlocks: IfStatementBlock[]): string;

    public abstract unless(name: string, statements: string): string;

    public abstract variable(variable: string): string;
}
