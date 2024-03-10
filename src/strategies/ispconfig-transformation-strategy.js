import { BaseTransformationStrategy } from './base-transformation-strategy';
import { buildVariablesScope, getIndentationFromLineStart, readComponentWithIndentation } from '../utils';
import { LiquidishTransformer } from "../transformer";

/**
 * @type {import('./base-transformation-strategy').Transformation[]}
 * @internal
 */
const defaultTransformations = [];

/**
 * Adds a transformation regex to the list of regexes.
 *
 * @internal
 * @param {string} strategyMethodName The name of the related method in the transformation strategy
 * @param {RegExp} regex The regex to add
 * @param {function(LiquidishTransformer, ...any): {}|null} [parseFunction]  The function to use for parsing the match. What it returns will be given to the strategy method. If null, the matched groups will be given to the strategy method directly.
 */
function addDefaultTransform(strategyMethodName, regex, parseFunction = null) {
    defaultTransformations.push({ regex, strategyMethodName, parseFunction });
}

/**
 * Loops that are run at runtime by the ISPConfig template engine.
 */
// `{% loop VARIABLE %}`
addDefaultTransform('loop', /{%\s*loop\s*(\w+)\s*%}/g);
// `{% endloop %}`
addDefaultTransform('endloop', /{%\s*endloop\s*%}/g);

/**
 * Dyninclude
 */
// {% dyninclude 'COMPONENT' %}
addDefaultTransform('dyninclude', /{%\s*dyninclude\s*((?:'[^']+?)'|"(?:[^']+?)"){1}\s*%}/g);

/**
 * Hook
 */
// {% hook 'HOOKNAME' %}
addDefaultTransform('hook', /{%\s*hook\s*((?:'[^']+?)'|"(?:[^']+?)"){1}\s*%}/g);

/**
 * @augments BaseTransformationStrategy
 * @public
 */
export class ISPConfigTransformationStrategy extends BaseTransformationStrategy {
    /**
     * @inheritdoc
     * @override
     */
    getTransformations() {
        return [
            ...super.getTransformations(),
            ...defaultTransformations,
        ];
    }

    /**
     * @inheritdoc
     */
    comment(comment) {
        if (this.transformer.showComments === true) {
            return `<!--${comment}-->`;
        }

        return '';
    }

    /**
     * @inheritdoc
     */
    render(component, variables, offset, string) {
        const { contents, path } = readComponentWithIndentation(this.transformer.getPath(), component, getIndentationFromLineStart(string, offset));

        this.transformer.pushToScope({
            ...variables,
            path
        });

        return this.transformer.transform(contents);
    }

    /**
     * @inheritdoc
     */
    for(itemName, collectionName, statement) {
        const scope = this.transformer.getScope();

        if (!Array.isArray(scope[collectionName])) {
            if (scope[collectionName] === undefined) {
                // This will happen when vite transforms the file.
                return '';
            }

            throw new Error(`The collection ${collectionName} is not an array. It's a ${typeof scope[collectionName]} (in ${this.transformer.getPath()})}`);
        }

        /** @type {any[]} */
        const collection = scope[collectionName];

        return collection.map(item => {
            const variables = {};
            buildVariablesScope(item, itemName, variables);

            this.transformer.pushToScope(variables);

            return this.transformer.transform(statement);
        }).join('');
    }

    /**
     * @inheritdoc
     */
    if(name, op, value) {
        if (op && value) {
            return `{tmpl_if name="${name}" op="${op}" value="${value}"}`;
        }

        return `{tmpl_if name="${name}"}`;
    }

    /**
     * @inheritdoc
     */
    elsif(name, op, value) {
        if (op && value) {
            return `{tmpl_elseif name="${name}" op="${op}" value="${value}"}`;
        }

        return `{tmpl_elseif name="${name}"}`;
    }

    /**
     * @inheritdoc
     */
    else() {
        return '{tmpl_else}';
    }

    /**
     * @inheritdoc
     */
    endif() {
        return '{/tmpl_if}';
    }

    /**
     * @inheritdoc
     */
    unless(name) {
        return `{tmpl_unless name="${name}"}`;
    }

    /**
     * @inheritdoc
     */
    endunless() {
        return '{/tmpl_unless}';
    }

    /**
     * @inheritdoc
     */
    variable(variable) {
        const scope = this.transformer.getScope();

        // If the variable is defined in the current scope, use it
        if (scope[variable] !== undefined) {
            return scope[variable];
        }

        // Otherwise it's a template variable
        return `{tmpl_var name="${variable}"}`;
    }

    /**
     * @param {string} name
     * @returns {string}
     */
    loop(name) {
        return `{tmpl_loop name="${name}"}`;
    }

    /**
     * @returns {string}
     */
    endloop() {
        return '{/tmpl_loop}';
    }

    /**
     * @param {string} component
     * @returns {string}
     */
    dyninclude(component) {
        component = component.slice(1, -1); // trim quotes
        return `{tmpl_dyninclude name="${component}"}`;
    }

    /**
     * @param {string} hookName
     * @returns {string}
     */
    hook(hookName) {
        hookName = hookName.slice(1, -1); // trim quotes
        return `{tmpl_hook name="${hookName}"}`;
    }
}
