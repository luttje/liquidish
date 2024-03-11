import { CancellationRequestedError } from "../transformer/cancellation-requested-error.js";
import { TransformParser } from "../transformer/parser.js";
import { buildVariablesScope, isNumericString, refreshedRegex } from "../utils.js";
import { AbstractTransformationStrategy, MetaData } from "./abstract-transformation-strategy.js";

export type Transformation = {
    regex: RegExp;
    strategyMethodName: string;
    parseFunction?: TransformParser|null;
};

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
 * Prevent users from using reserved keywords
 */
function sanityCheckReservedKeywords(variables?: Record<string, any>) {
    if (!variables) {
        return;
    }

    for (const key of Object.keys(variables)) {
        if (key !== '___') {
            continue;
        }

        const value = variables[key];

        if (value === 'dont-show-it' || value === 'show-it') {
            throw new Error('The variable name "___" with the value "dont-show-it" or "show-it" is reserved');
        }
    }
}

/**
 *
 * Available transformations:
 *
 */

/**
 * Custom transformations (wont be transformed to ISPConfig's template language)
 */

// {% comment %}\nThis is a comment\nwith multiple lines\n{% endcomment %}
export const regexForComment = /{%\s*comment\s*%}([\s\S]*?){%\s*endcomment\s*%}/g;
addDefaultTransform('comment', regexForComment);

// {% meta {
//   "isChildOnly": true,
//   "defaults": {
//     "parameter": "value"
//   }
// } %}
export const regexForMeta = /{%\s*meta\s*?(?:\s*\s*((?:[^%]+?|%(?!}))*))*?\s*%}/g;
addDefaultTransform('meta', regexForMeta, (transformer, metaString) => {
    let meta: MetaData = {};

    try {
        meta = JSON.parse(metaString);
    } catch (e) {
        throw new Error(`Invalid JSON in meta tag: ${metaString}`);
    }

    sanityCheckReservedKeywords(meta.defaults);

    return [
        meta,
    ];
});

// {% render 'COMPONENT' %}
// {% render 'COMPONENT', variable: 'value', another: 'value' %}
// {% render 'render-json-component.liquid', {
//     "slot": "{{ logout_txt }} {{ cpuser }}",
//     "attributes": [
//         ["id", "logout-button"],
//         ["data-load-content", "login/logout.php"]
//     ]
// }
// NOTE: For simplicty sake the JSON cannot contain %}
export const regexForRender = /{%\s*render\s*((?:'[^']+?)'|"(?:[^']+?)"){1}(?:\s*,\s*((?:[^%]+?|%(?!}))*))*?\s*%}/g;
export const regexForVariableString = /(\w+):\s*((?:"(?:[^"\\]|\\.)*?"|'(?:[^'\\]|\\.)*?'))/g;
addDefaultTransform('render', regexForRender, (transformer, component, variablesString) => {
    const variables = {};

    if (variablesString) {
        variablesString = variablesString.trim();

        // Try parse it as JSON
        // TODO: This can silently fail if the JSON is invalid, the user should be notified, or we should just support JSON with a different syntax
        try {
            const parsed = JSON.parse(variablesString);

            sanityCheckReservedKeywords(parsed);

            if (typeof parsed === 'object') {
                for (const [key, value] of Object.entries(parsed)) {
                    variables[key] = value;
                }
            }
        } catch (e) {
            // It's not JSON, so it's a string with key-value pairs
            variablesString.replace(regexForVariableString, (match, name, value) => {
                const quoteType = value[0];
                value = value.slice(1, -1);

                // Unescape the value
                value = value.replace(new RegExp(`\\\\${quoteType}`, 'g'), quoteType);

                variables[name] = value;
            });
        }
    }

    component = component.slice(1, -1); // trim quotes

    return [
        component,
        variables,
    ];
});

// {% for item in items %}
//     {{ item[0] }}="{{ item[1] }}"
// {% endfor %}
export const regexForLoopFor = /\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}(.*?)\{%\s*endfor\s*%\}/gs;
addDefaultTransform('for', regexForLoopFor, (transformer, itemName, collectionName, statement) => {
    const scope = transformer.getScope();

    // trim only leading whitespace
    statement = statement.replace(/^\s+/, '');

    // Check if statement is a nested for loop, if it is, throw an error
    if (refreshedRegex(regexForLoopFor).test(statement + ' {% endfor %}')) {
        throw new Error('Nested for loops are not supported');
    }

    if (!Array.isArray(scope[collectionName])) {
        throw new Error(`The collection ${collectionName} is not an array. It's a ${typeof scope[collectionName]} (in ${transformer.getPath()})}`);
    }

    return [
        itemName,
        collectionName,
        statement
    ];
});

/**
 * Variable
 */
// `{{ VARIABLE }}`
export const regexForVariable = /{{\s*([\w\.]+?(?:\[[^\]]*?\])*)?\s*}}/g;
addDefaultTransform('variable', regexForVariable);

/**
 * If-statement
 */
// `{% if VARIABLE OPERATOR 'VALUE' %}`
// `{% if VARIABLE OPERATOR "VALUE" %}`
// `{% if VARIABLE %}`
export const regexForIf = /{%\s*if\s*([\w\.]+?)\s+?(?:(\S+)\s*((?:'[^']*?)'|"(?:[^']*?)"))*?\s*%}/g;
addDefaultTransform('if', regexForIf, (transformer, name, op, value) => {
    if (op && value) {
        value = value.slice(1, -1); // trim quotes
        return [
            name,
            op,
            value,
        ];
    }

    return [
        name,
        undefined,
        undefined,
    ];
});

// `{% elsif VARIABLE OPERATOR 'VALUE' %}`
// `{% elsif VARIABLE OPERATOR "VALUE" %}`
// `{% elsif VARIABLE %}`
export const regexForIfElseIf = /{%\s*elsif\s*?([\w\.]+?)\s*?(?:(\S+)\s*((?:'[^']*?)'|"(?:[^']*?)"))*?\s*%}/g;
addDefaultTransform('elsif', regexForIfElseIf, (transformer, name, op, value) => {
    if (op && value) {
        value = value.slice(1, -1); // trim quotes
        return [
            name,
            op,
            value,
        ];
    }

    return [
        name,
        undefined,
        undefined,
    ];
});

// `{% else %}`
export const regexForIfElse = /{%\s*else\s*%}/g;
addDefaultTransform('else', regexForIfElse);
// `{% endif %}`
export const regexForIfEnd = /{%\s*endif\s*%}/g;
addDefaultTransform('endif', regexForIfEnd);

/**
 * Unless-statement
 */
// `{% unless VARIABLE %}`
export const regexForUnless = /{%\s*?unless\s*?([\w\.]+?)\s*?%}/g;
addDefaultTransform('unless', regexForUnless);
// `{% endunless %}`
export const regexForUnlessEnd = /{%\s*?endunless\s*?%}/g;
addDefaultTransform('endunless', regexForUnlessEnd);

/**
 * @public
 */
export abstract class BaseTransformationStrategy extends AbstractTransformationStrategy {
    /**
     * @inheritdoc
     */
    override getTransformations(): Transformation[] {
        return defaultTransformations;
    }

    /**
     * @inheritdoc
     */
    override meta(meta: MetaData): string {
        if (meta.isChildOnly && this.transformer.isRoot()) {
            throw new CancellationRequestedError();
        }

        // We check the entire scope, and place the default values in the current scope (so they get popped off when the file is done)
        var scope = this.transformer.getScope();
        var currentScope = this.transformer.peekScope();

        for (const [key, value] of Object.entries(meta.defaults || {})) {
            if (scope[key] === undefined) {
                buildVariablesScope(value, key, currentScope);
            }
        }

        return '';
    }

    protected performIf(actual: any, op: string, expected: string): boolean {
        const isTruthy = (value: any) => {
            if (value === undefined || value === null) {
                return false;
            }

            if (typeof value === 'string') {
                return value.length > 0;
            } else if (typeof value === 'number') {
                return value !== 0;
            } else if (typeof value === 'boolean') {
                return value;
            } else if (Array.isArray(value)) {
                return value.length > 0;
            } else if (typeof value === 'object' && value !== null) {
                return true;
            }

            return false;
        }

        switch (op) {
            case undefined:
                return isTruthy(actual);
            case '==':
                // If both are numeric strings or one is a numeric string and the other is a number, compare as numbers
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) == Number(expected);
                }
                return actual == expected;
            case '!=':
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) != Number(expected);
                }
                return actual != expected;
            case '>':
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) > Number(expected);
                }
                return actual > expected;
            case '<':
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) < Number(expected);
                }
                return actual < expected;
            case '>=':
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) >= Number(expected);
                }
                return actual >= expected;
            case '<=':
                if (isNumericString(actual) && isNumericString(expected)) {
                    return Number(actual) <= Number(expected);
                }
                return actual <= expected;
            default:
                throw new Error(`Invalid operator: ${op}`);
        }
    }
}
