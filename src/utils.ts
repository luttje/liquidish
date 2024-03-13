import indentString from 'indent-string';
import { resolve, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';

export function refreshedRegex(regex: RegExp) {
    return new RegExp(regex.source, regex.flags);
}

export function unescapeValue(value: string): string {
    const quoteType = value[0];

    if (quoteType !== '"' && quoteType !== "'") {
        return value;
    }

    value = value.slice(1, -1);

    // Unescape the value
    value = value.replace(new RegExp(`\\\\${quoteType}`, 'g'), quoteType);

    return value;
}

/**
 * Trims the trailing newline from a string.
 *
 * @internal
 * @param {string} contents
 * @returns {string}
 */
export function trimTrailingNewline(contents) {
    return contents.replace(/\n$/, '');
}

/**
 * Escapes a string to be used in a regular expression.
 * https://stackoverflow.com/a/6969486
 *
 * @internal
 * @param {string} string
 * @returns {string}
 */
export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Checks if a string is a numeric string.
 *
 * @internal
 */
export function isNumericString(value: any): boolean {
    if (typeof value !== 'string') {
        return false;
    }

    return !isNaN(Number(value)) && value.trim() !== '';
}

/**
 * Counts the indentation until the start of the line
 * before the provided offset.
 *
 * @internal
 * @param {string} string
 * @param {number} offset
 * @returns {number}
 */
export function getIndentationFromLineStart(string, offset) {
    const beginningOfLine = string.slice(0, offset)
        .lastIndexOf('\n') + 1;

    const regex = /^\s*/;
    const match = regex.exec(string.slice(beginningOfLine, offset));

    return match[0].length;
}

/**
 * Tries to find a component file by its path, adding the .liquid
 * extension if it's not found.
 *
 * @internal
 * @param {string} componentPath
 * @returns {string}
 */
export function tryFindComponentPath(componentPath) {
    if (existsSync(componentPath) === false) {
        componentPath = resolve(componentPath + '.liquid');
    }

    return componentPath;
}

/**
 * Reads a component file and indents it by the provided amount.
 *
 * @internal
 * @param {string} path
 * @param {string} component
 * @param {number} indentation
 * @returns {{ contents: string, path: string }}
 */
export function readComponentWithIndentation(path, component, indentation = 0) {
    let componentPath = tryFindComponentPath(resolve(dirname(path), component));

    if (existsSync(componentPath) === false) {
        throw new Error(`Component file not found: ${component} in ${path}`);
    }

    const contents = readFileSync(componentPath, 'utf8');
    let indented = indentString(contents, indentation);

    // The first line should not be indented (since it's indented from where we are rendering it)
    indented = indented.substring(indentation);

    // We trim the last trailing newline, because it's a nice convention for our source files, but in the rendered file it doesn't look good
    indented = trimTrailingNewline(indented);

    return { contents: indented, path: componentPath };
}

/**
 * Builds a scope of variables from an item, using its name as the key.
 *
 * @internal
 * @param {any} item
 * @param {string} itemName
 * @param {Record<string, any>} variables
 */
export function buildVariablesScope(item, itemName, variables) {
    variables[itemName] = item;

    if (Array.isArray(item)) {
        for (let i = 0; i < item.length; i++) {
            const element = item[i];
            const name = `${itemName}[${i}]`;
            variables[name] = element;

            // Recurse for arrays and objects within the array element
            if (Array.isArray(element) || (typeof element === 'object' && element !== null)) {
                buildVariablesScope(element, name, variables);
            }
        }
    } else if (typeof item === 'object' && item !== null) {
        for (const key of Object.keys(item)) {
            const element = item[key];
            const name = `${itemName}.${key}`;
            variables[name] = element;

            // Recurse for arrays and objects within the object property
            if (Array.isArray(element) || (typeof element === 'object' && element !== null)) {
                buildVariablesScope(element, name, variables);
            }
        }
    }
}
