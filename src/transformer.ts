import { AbstractTransformationStrategy } from "./strategies/abstract-transformation-strategy.js";
import { Transformation } from "./strategies/base-transformation-strategy.js";
import { TransformParser } from "./transformer/parser.js";
import { StrategyBuilder } from "./transformer/strategy-builder.js";

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

    private transformRegexes: Transformation[];

    /**
     * Used to store nested scopes for variables
     */
    private variableScopes: Record<string, any>[];

    /**
     * Used to keep track of the current file being transformed
     */
    private basePath: string | null;

    constructor(options: LiquidishTransformerOptions = {}) {
        if (!options.strategyBuilder) {
            throw new Error('No strategy builder provided');
        }

        this.showComments = options.showComments || false;

        this.strategy = options.strategyBuilder(this);

        this.transformRegexes = this.strategy.getTransformations() || [];

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

    /**
     * Transform the provided contents using the given strategy.
     */
    transformContents({ contents, regex, strategyMethodName, parseFunction }: TransformContentsOptions): string {
        const transformer = this;

        if (parseFunction) {
            contents = contents.replace(regex, function (match, ...args) {
                const parsed = parseFunction(transformer, ...args);

                // append the offset and the string to the parsed array
                parsed.push(args[args.length - 2], args[args.length - 1]);

                return transformer.strategy[strategyMethodName](...parsed);
            });
        } else {
            contents = contents.replace(regex, function (match, ...args) {
                return transformer.strategy[strategyMethodName](...args);
            });
        }

        return contents;
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
     * Transforms the provided contents to the format provided by the strategy.
     */
    transform(contents: string, path?: string): string {
        if (path) {
            this.basePath = path;
        }

        for (const { strategyMethodName, regex, parseFunction } of this.transformRegexes) {
            if (contents.match(regex)) {
                contents = this.transformContents({
                    contents,
                    regex,
                    strategyMethodName,
                    parseFunction,
                });
            }
        }

        return contents;
    }
}
