import { TransformParser } from "../transformer/parser.js";
import { refreshedRegex } from "../utils.js";
import { AbstractTransformationStrategy } from "./abstract-transformation-strategy.js";

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
        try {
            const parsed = JSON.parse(variablesString);

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
export const regexForVariable = /{{\s*(\w+(?:\[[^\]]*?\])*)?\s*}}/g;
addDefaultTransform('variable', regexForVariable);

/**
 * If-statement
 */
// `{% if VARIABLE OPERATOR 'VALUE' %}`
// `{% if VARIABLE OPERATOR "VALUE" %}`
// `{% if VARIABLE %}`
export const regexForIf = /{%\s*if\s*(\w+)\s+(?:(\S+)\s*((?:'[^']+?)'|"(?:[^']+?)"))*?\s*%}/g;
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
export const regexForIfElseIf = /{%\s*elsif\s*?(\w+)\s*?(?:(\S+)\s*((?:'[^']+?)'|"(?:[^']+?)"))*?\s*%}/g;
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
export const regexForUnless = /{%\s*unless\s*(\w+)\s*%}/g;
addDefaultTransform('unless', regexForUnless);
// `{% endunless %}`
export const regexForUnlessEnd = /{%\s*endunless\s*%}/g;
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
}
