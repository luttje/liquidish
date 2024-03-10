import { AbstractTransformationStrategy } from "./strategies/abstract-transformation-strategy";

/**
 * @typedef {Object} TransformParser
 * @type {function}
 * @param {LiquidishTransformer} transformer
 * @param {any[]} args
 * @returns {any[]}
 */

/**
 * @typedef {Object} StrategyBuilder
 * @type {function}
 * @param {LiquidishTransformer} transformer
 * @returns {AbstractTransformationStrategy}
 */

/**
 * @typedef {Object} LiquidishTransformerOptions
 * @property {StrategyBuilder} [strategyBuilder]
 * @property {boolean} [showComments]
 */

/**
 * The LiquidishTransformer is responsible for transforming the contents of a
 * file from a given format to the format provided by the strategy.
 *
 * @public
 */
export class LiquidishTransformer {
    /**
     * @param {LiquidishTransformerOptions} options
     */
    constructor(options = {}) {
        if (!options.strategyBuilder) {
            throw new Error('No strategy builder provided');
        }

        this.showComments = options.showComments || false;

        /**
         * @type {AbstractTransformationStrategy}
         * @private
         */
        this.strategy = options.strategyBuilder(this);

        /**
         * @type {import("./strategies/base-transformation-strategy").Transformation[]}
         * @private
         */
        this.transformRegexes = this.strategy.getTransformations() || [];

        /**
         * Used to store nested scopes for variables
         * @type {Record<string, any>[]}
         * @private
         */
        this.variableScopes = [];

        /**
         * Used to keep track of the current file being transformed
         * @type {string|null}
         * @private
         */
        this.basePath = null;
    }

    /**
     * Create a new scope object and push it onto the stack
     *
     * @param {Record<string, any>} variables
     * @returns {Record<string, any>}
     */
    pushToScope(variables) {
        this.variableScopes.push(variables);

        return this.variableScopes[this.variableScopes.length - 1];
    }

    /**
     * Get the topmost scope from the stack
     *
     * @returns {Record<string, any>}
     */
    peekScope() {
        return this.variableScopes[this.variableScopes.length - 1];
    }

    /**
     * Remove the topmost scope from the stack
     *
     * @returns {Record<string, any>}
     */
    popScope() {
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
     *
     * @returns {Record<string, any|any[]>}
     */
    getScope() {
        /** @type {Record<string, any|any[]>} */
        const scope = {};

        for (const s of this.variableScopes) {
            for (const [key, value] of Object.entries(s)) {
                scope[key] = value;
            }
        }

        return scope;
    }

    /**
     * @typedef {Object} TransformContentsOptions
     * @property {string} contents
     * @property {RegExp} regex
     * @property {string} strategyMethodName
     * @property {TransformParser|undefined} parseFunction
     */

    /**
     * Transform the provided contents using the given strategy.
     *
     * @param {TransformContentsOptions} options
     * @returns {string}
     */
    transformContents({ contents, regex, strategyMethodName, parseFunction }) {
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
     *
     * @returns {string}
     */
    getPath() {
        const topScope = this.peekScope();

        if (topScope?.path) {
            return topScope.path;
        }

        return this.basePath;
    }

    /**
     * Transforms the provided contents to the format provided by the strategy.
     *
     * @param {string} contents
     * @param {string|null} path
     * @returns {string}
     */
    transform(contents, path = null) {
        if (path) {
            this.basePath = path;
        }

        for (const { strategyMethodName, regex, parseFunction } of this.transformRegexes) {
            if (Array.isArray(regex)) {
                for (const r of regex) {
                    if (contents.match(r)) {
                        contents = this.transformContents({
                            contents,
                            regex: r,
                            strategyMethodName,
                            parseFunction,
                        });
                    }
                }
            } else {
                if (contents.match(regex)) {
                    contents = this.transformContents({
                        contents,
                        regex,
                        strategyMethodName,
                        parseFunction,
                    });
                }
            }
        }

        // Clean up the scope after processing a block/component
        this.popScope();

        return contents;
    }
}
