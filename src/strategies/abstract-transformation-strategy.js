/**
 * Base class for transformation strategies.
 *
 * @abstract
 * @public
 */
export class AbstractTransformationStrategy {
    /**
     * @param {import("../transformer").LiquidishTransformer} transformer
     */
    constructor(transformer) {
        if (new.target === AbstractTransformationStrategy) {
            throw new TypeError(`Cannot construct ${new.target.name} instances directly`);
        }

        this.transformer = transformer;
    }

    /**
     * @returns {import("./base-transformation-strategy").Transformation[]}
     */
    getTransformations() {
        throw new Error('Not implemented');
    }

    /**
     * @param {string} comment
     * @returns {string}
     */
    comment(comment) {
        throw new Error('Not implemented');
    }

    /**
     * @param {string} component
     * @param {Record<string, string>} variables
     * @param {number} offset
     * @param {string} string
     * @returns {string}
     */
    render(component, variables, offset, string) {
        throw new Error('Not implemented');
    }

    /**
     * @param {string} itemName
     * @param {string} collectionName
     * @param {string} statement
     * @returns {string}
     */
    for(itemName, collectionName, statement) {
        throw new Error('Not implemented');
    }

    /**
     * @param {string} name
     * @param {string} op
     * @param {string} value
     * @returns {string}
     */
    if(name, op, value) {
        throw new Error('Not implemented');
    }

    /**
     * @param {string} name
     * @param {string} op
     * @param {string} value
     * @returns {string}
     */
    elsif(name, op, value) {
        throw new Error('Not implemented');
    }

    /**
     * @returns {string}
     */
    else() {
        throw new Error('Not implemented');
    }

    /**
     * @returns {string}
     */
    endif() {
        throw new Error('Not implemented');
    }

    /**
     * @param {string} name
     * @returns {string}
     */
    unless(name) {
        throw new Error('Not implemented');
    }

    /**
     * @returns {string}
     */
    endunless() {
        throw new Error('Not implemented');
    }

    /**
     * @param {string} variable
     * @returns {string}
     */
    variable(variable) {
        throw new Error('Not implemented');
    }
}
