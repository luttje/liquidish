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

    protected statementsToText(statements: Node[], exceptLastIfToken: boolean = false, trimTextIndent: boolean = false): string {
        let output = '';

        for (let i = 0; i < statements.length; i++) {
            const node = statements[i];

            if (exceptLastIfToken && (node.type === 'elseif' || node.type === 'else')) {
                continue;
            }

            walkNodes(node, (node) => {
                const nodeOutput = this.transformNode(node);

                if (nodeOutput === null) {
                    return;
                }

                if (trimTextIndent && node.type === 'text') {
                    output += nodeOutput.replace(/^\n+\s+/, '');
                } else {
                    output += nodeOutput;
                }
            });
        }

        return output;
    }

    protected abstract transformNode(node: Node): string | null;

    public abstract getLogicTokens(): LogicToken[];

    public abstract meta(meta: MetaData): string;

    public abstract comment(comment: string): string;

    public abstract render(component: string, variables: Record<string, string>): string;

    public abstract if(statementBlocks: IfStatementBlock[]): string;

    public abstract unless(name: string, statements: string): string;

    public abstract variable(variable: string): string;
}
