import { LogicToken, Node, walkNodes } from "../transformer/parser.js";
import { LiquidishTransformer } from "../transformer/transformer.js";

export type MetaData = {
    isChildOnly?: boolean;
    defaults?: Record<string, any>;
    [key: string]: any;
};

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

            const nodeOutput = this.transformNode(node);

            if (nodeOutput === null) {
                return;
            }

            if (trimTextIndent && node.type === 'text') {
                output += nodeOutput.replace(/^\n+\s+/, '');
            } else {
                output += nodeOutput;
            }
        }

        return output;
    }

    protected abstract transformNode(node: Node): string | null;

    public abstract getLogicTokens(): LogicToken[];

    /**
     * Transformer methods
     */

    /**
     * Transforms a {% meta ... %} tag to the target language.
     */
    public abstract meta(meta: MetaData): string;

    /**
     * Transforms a {% comment %} ... {% endcomment %} tag to the target language.
     */
    public abstract comment(comment: string): string;

    /**
     * Transforms a {% render, ... %} tag to the target language.
     */
    public abstract render(component: string, variables: Record<string, string>): string;

    /**
     * Transforms a {% if ... %} tag to the target language.
     */
    public abstract if(name: string, op?: string, value?: string): string;

    /**
     * Transforms a {% elseif ... %} tag to the target language.
     */
    public abstract elseif(name: string, op?: string, value?: string): string;

    /**
     * Transforms a {% else %} tag to the target language.
     */
    public abstract else(): string;

    /**
     * Transforms a {% endif %} tag to the target language.
     */
    public abstract endif(): string;

    /**
     * Transforms a {% unless %} tag to the target language.
     */
    public abstract unless(name: string): string;

    /**
     * Transforms a {% endunless %} tag to the target language.
     */
    public abstract endunless(): string;

    /**
     * Transforms a {{ variable }} tag to the target language.
     */
    public abstract variable(variable: string): string;
}
