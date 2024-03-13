import { BaseTransformationStrategy, Transformation } from './base-transformation-strategy.js';
import { buildVariablesScope, getIndentationFromLineStart, readComponentWithIndentation } from '../utils.js';
import { TransformParser } from '../transformer/parser.js';

/**
 * @type {Transformation[]}
 * @internal
 */
const defaultTransformations = [];

/**
 * Adds a transformation regex to the list of regexes.
 *
 * @internal
 * @param {string} strategyMethodName The name of the related method in the transformation strategy
 * @param {RegExp} regex The regex to add
 * @param {TransformParser|null} [parseFunction]  The function to use for parsing the match. What it returns will be given to the strategy method. If null, the matched groups will be given to the strategy method directly.
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
 * @public
 */
export class ISPConfigTransformationStrategy extends BaseTransformationStrategy {
    /**
     * @inheritdoc
     */
    override getTransformations(): Transformation[] {
        return [
            ...super.getTransformations(),
            ...defaultTransformations,
        ];
    }

    /**
     * @inheritdoc
     */
    override comment(comment: string): string {
        if (this.transformer.showComments === true) {
            return `<!--${comment}-->`;
        }

        return '';
    }

    /**
     * @inheritdoc
     */
    override render(component: string, variables: Record<string, string>, offset: number, string: string): string {
        const { contents, path } = readComponentWithIndentation(this.transformer.getPath(), component, getIndentationFromLineStart(string, offset));

        this.transformer.pushToScope({
            ...variables,
            path
        });

        const transformed = this.transformer.transform(contents);

        // Clean up the scope after processing a block/component
        this.transformer.popScope();

        return transformed;
    }

    /**
     * @inheritdoc
     */
    override for(itemName: string, collectionName: string, statement: string): string {
        const scope = this.transformer.getScope();

        if (!Array.isArray(scope[collectionName])) {
            throw new Error(`The collection ${collectionName} is not an array. It's a ${typeof scope[collectionName]} (in ${this.transformer.getPath()})}`);
        }

        /** @type {any[]} */
        const collection = scope[collectionName];

        return collection.map(item => {
            const variables = {};
            buildVariablesScope(item, itemName, variables);

            this.transformer.pushToScope(variables);

            const transformed = this.transformer.transform(statement);

            // Clean up the scope after processing a block/component
            this.transformer.popScope();

            return transformed;
        }).join('');
    }

    private compileKnownIf(name: string, op: string, value: string, statements: string, isInverse = false): string | null {
        const scope = this.transformer.getScope();

        // If the variable is defined in the current scope, use it
        if (scope[name] !== undefined) {
            if (this.performIf(scope[name], op, value) !== isInverse) {
                return statements;
            } else {
                return '';
            }
        }

        return null;
    }

    /**
     * @inheritdoc
     */
    override if(name: string, op: string, value: string, statements: string): string {
        const knownIf = this.compileKnownIf(name, op, value, statements);

        if (knownIf !== null) {
            return knownIf;
        }

        if (op && value) {
            return `{tmpl_if name="${name}" op="${op}" value="${value}"}${statements}{/tmpl_if}`;
        }

        return `{tmpl_if name="${name}"}${statements}{/tmpl_if}`;
    }

    /**
     * @inheritdoc
     */
    override unless(name: string, statements: string): string {
        const knownIf = this.compileKnownIf(name, '!=', 'true', statements, true);

        if (knownIf !== null) {
            return knownIf;
        }

        return `{tmpl_unless name="${name}"}${statements}{/tmpl_unless}`;
    }

    /**
     * @inheritdoc
     */
    override variable(variable: string): string {
        const scope = this.transformer.getScope();

        // If the variable is defined in the current scope, use it
        if (scope[variable] !== undefined) {
            return scope[variable];
        }

        // Otherwise it's a template variable
        return `{tmpl_var name="${variable}"}`;
    }

    public loop(name: string): string {
        return `{tmpl_loop name="${name}"}`;
    }

    public endloop(): string {
        return '{/tmpl_loop}';
    }

    public dyninclude(component: string): string {
        component = component.slice(1, -1); // trim quotes
        return `{tmpl_dyninclude name="${component}"}`;
    }

    public hook(hookName: string): string {
        hookName = hookName.slice(1, -1); // trim quotes
        return `{tmpl_hook name="${hookName}"}`;
    }
}
