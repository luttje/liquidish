import { AbstractTransformationStrategy } from "../strategies/abstract-transformation-strategy.js";
import { LogicToken, TransformParser, parseLiquid } from "./parser.js";
import { StrategyBuilder } from "./strategy-builder.js";
import { CancellationRequestedError } from './cancellation-requested-error.js';

export type LiquidishTransformerOptions = {
    strategyBuilder?: StrategyBuilder;
    showComments?: boolean;
};

export type TransformContentsOptions = {
    contents: string;
    regex: RegExp;
    strategyMethodName: string;
    parseFunction?: TransformParser;
};

/**
 * The LiquidishTransformer is responsible for transforming the contents of a
 * file from a given format to the format provided by the strategy.
 *
 * @public
 */
export class LiquidishTransformer {

    public showComments: boolean;

    private strategy: AbstractTransformationStrategy;

    /**
     * Used to store nested scopes for variables
     */
    private variableScopes: Record<string, any>[];

    /**
     * The tokens that are used to identify logic in the input file
     */
    private logicTokens: LogicToken[];

    /**
     * Used to keep track of the current file being transformed
     */
    private basePath: string | null;

    private currentIndentation: number;

    constructor(options: LiquidishTransformerOptions = {}) {
        if (!options.strategyBuilder) {
            throw new Error('No strategy builder provided');
        }

        this.showComments = options.showComments || false;

        this.strategy = options.strategyBuilder(this);

        this.logicTokens = this.strategy.getLogicTokens();

        this.variableScopes = [];

        this.basePath = null;
    }

    public getStrategy(): AbstractTransformationStrategy {
        return this.strategy;
    }

    /**
     * Create a new scope object and push it onto the stack
     */
    pushToScope(variables: Record<string, any>): Record<string, any> {
        this.variableScopes.push(variables);

        return this.variableScopes[this.variableScopes.length - 1];
    }

    /**
     * Get the topmost scope from the stack
     */
    peekScope(): Record<string, any>  {
        return this.variableScopes[this.variableScopes.length - 1];
    }

    /**
     * Remove the topmost scope from the stack
     */
    popScope(): Record<string, any> {
        // Remove the topmost scope from the stack
        if (this.variableScopes.length > 0) {
            const pop = this.variableScopes.pop();

            return pop;
        }

        return {};
    }

    /**
     * Return the entire scope as a flat key and value map, letting
     * later scopes override earlier ones.
     */
    getScope(): Record<string, any|any[]> {
        const scope = {};

        for (const s of this.variableScopes) {
            for (const [key, value] of Object.entries(s)) {
                scope[key] = value;
            }
        }

        return scope;
    }

    setCurrentIndentation(indentation: number): void {
        this.currentIndentation = indentation;
    }

    getCurrentIndentation(): number {
        return this.currentIndentation;
    }

    /**
     * Get the current path of the file being transformed
     */
    getPath(): string {
        const topScope = this.peekScope();

        if (topScope?.path) {
            return topScope.path;
        }

        return this.basePath;
    }

    /**
     * Returns whether the transformer is currently transforming the root file
     * and not a child file.
     */
    isRoot(): boolean {
        return this.basePath === this.getPath();
    }

    /**
     * Transforms the provided contents to the format provided by the strategy.
     */
    transform(contents: string, path?: string): string {
        if (path) {
            this.basePath = path;
        }

        const ast = parseLiquid(contents, this.logicTokens);

        try {
            return this.strategy.transform(ast);
        } catch (e) {
            if (e instanceof CancellationRequestedError) {
                return null;
            }

            throw e;
        }
    }
}
