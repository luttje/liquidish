import { resolve } from 'path';
import { readFileSync } from 'fs';
import { refreshedRegex, trimTrailingNewline } from '../src/utils';
import { AbstractTransformationStrategy } from '../src/strategies/abstract-transformation-strategy';
import { expect } from 'vitest';

export const fixturesPath: string = resolve(__dirname, 'fixtures');

export const CHARS_QUOTES = '`\'"';
export const CHARS_WHITESPACE = ' \t\n\r';

/**
 * Reads the contents of the fixture file with the provided name.
 * Trims the trailing newline, because it's a nice convention for our source files,
 * but in the rendered files it doesn't look good.
 */
export function readFixtureFile(name: string): string {
    return trimTrailingNewline(readFileSync(resolve(fixturesPath, name), 'utf8'));
}

/**
 * Gets all regular expressions from the provided strategy.
 */
export function getAllTransformationRegExp(strategy: AbstractTransformationStrategy): RegExp[] {
    return strategy.getTransformations().map((t) => t.regex);
}

export function assertMatch(regex: RegExp, str: string, expected: boolean = true) {
    expect(refreshedRegex(regex).test(str)).toBe(expected);
}

export function assertMatchCount(regex: RegExp, str: string, expected: number) {
    expect(str.match(refreshedRegex(regex))?.length ?? 0).toBe(expected);
}

export function fuzz(random, length: number) {
    let str = '';
    for (let i = 0; i < length; i++) {
        const int = Math.floor(random() * 256);
        str += String.fromCharCode(int);
    }
    return str;
}

export function fuzzWithCharacters(random, length: number, characters: string) {
    let str = '';
    for (let i = 0; i < length; i++) {
        const int = Math.floor(random() * characters.length);
        str += characters[int];
    }
    return str;
}

export function assertMatchFrom(regex: RegExp, str: string, expectedStart: number, expectedEnd: number, matchIndex: number = 0) {
    const match = refreshedRegex(regex).exec(str);

    if (match === null) {
        expect.fail('Match is null');
    }

    expect(match.index).toBe(expectedStart);
    expect(match.index + match[matchIndex].length).toBe(expectedEnd);
}
