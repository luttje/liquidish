// import { describe, it, expect } from 'vitest';
// import {
//     regexForMeta,
//     regexForComment,
//     regexForVariable,
//     regexForUnless,
//     regexForUnlessEnd,
//     regexForLoopFor,
//     regexForRender,
//     regexForVariableString,
// } from '../src/strategies/base-transformation-strategy';
// import { CHARS_QUOTES, CHARS_WHITESPACE, assertMatch, assertMatchCount, assertMatchFrom, fuzz, fuzzWithCharacters } from './test-utils';

// describe('RegExp Tests for meta', () => {
//     it('meta regex should match meta', () => {
//         const metaJson = {
//             isChildOnly: true,
//             defaults: {
//                 parameter: 'value',
//             },
//         };
//         assertMatch(regexForMeta, `{% meta ${JSON.stringify(metaJson)} %}`);
//         assertMatchCount(regexForMeta, `{% meta ${JSON.stringify(metaJson)} %}`, 1);
//         assertMatchCount(regexForMeta, `{% meta ${JSON.stringify(metaJson, null, 2)} %}`, 1);

//         assertMatchCount(regexForMeta, `{% meta {} %}`, 1);
//     });
// });

// describe('RegExp Tests for comments', () => {
//     it('comment regex should match comments', () => {
//         assertMatch(regexForComment, '{% comment %} {% endcomment %}');
//         assertMatch(regexForComment, '{% comment %} {% endcomment %} {% comment %} {% endcomment %}');

//         assertMatchCount(regexForComment, '{% comment %} {% endcomment %}', 1);
//         assertMatchCount(regexForComment, '{% comment %} {% endcomment %} {% comment %} {% endcomment %}', 2);
//         assertMatch(regexForComment, '{% comment %} {% comment %} {% endcomment %} {% endcomment %}');

//         // Matches from {% comment %} up until the first {% endcomment %}
//         assertMatchCount(regexForComment, '{% comment %} {% comment %} {% endcomment %} {% endcomment %}', 1);
//         assertMatchFrom(regexForComment, '{% comment %} {% comment %} {% endcomment %} {% endcomment %}', 0, 44);
//         assertMatchCount(regexForComment, '{% comment %} {% comment %} {% endcomment %} {% endcomment %} {% endcomment %}', 1);

//         // Try with some weird or missing spaces
//         assertMatch(regexForComment, '{%comment %} {% endcomment %}');
//         assertMatch(regexForComment, '{% comment%} {% endcomment %}');
//         assertMatch(regexForComment, '{% comment %} {%endcomment %}');
//         assertMatch(regexForComment, '{% comment %} {% endcomment%}');
//         assertMatch(regexForComment, '{%comment%} {%endcomment%}');

//         // Try with some weird content inside the comment
//         const comment = '{% comment %} Here\'s a mustache and percent sign {% {% endcomment %}';
//         assertMatchCount(regexForComment, comment, 1);
//         assertMatchFrom(regexForComment, comment, 0, comment.length);
//         assertMatchCount(regexForComment, '{% comment %} %%#%}{%#}%#{#}endcomment%{#comment}%{#%#% }{#%}#{%endcomment }#{% endcomment}#{%} #{} {% endcomment %}', 1);
//     });

//     it('comment regex should survive fuzzing', () => {
//         const seedRandom = require('seedrandom');
//         const random = seedRandom(0); // Seed is set to 0 to make the test deterministic

//         // Match no comments
//         for (let i = 0; i < 1000; i++) {
//             const str = fuzz(random, 1000);

//             assertMatchCount(regexForComment, str, 0);
//         }

//         // Match only one comment
//         for (let i = 0; i < 1000; i++) {
//             // Fuzz inside comments
//             const str = `{% comment %}${fuzz(random, 1000)}{% endcomment %}`;
//             assertMatchCount(regexForComment, str, 1);

//             // Fuzz in and around comments
//             const str2 = `${fuzz(random, 1000)}{% comment %}${fuzz(random, 1000)}{% endcomment %}${fuzz(random, 1000)}`;
//             assertMatchCount(regexForComment, str2, 1);
//         }
//     });
// });

// describe('RegExp Tests for variables', () => {
//     it('variable regex should match variables', () => {
//         assertMatch(regexForVariable, '{{ VARIABLE }}');
//         assertMatch(regexForVariable, '{{ VARIABLE }} {{ VARIABLE }}');

//         assertMatchCount(regexForVariable, '{{ VARIABLE }}', 1);
//         assertMatchCount(regexForVariable, '{{ VARIABLE }} {{ VARIABLE }}', 2);
//         assertMatch(regexForVariable, '{{ VARIABLE }} {{ VARIABLE }} {{ VARIABLE }}');

//         // Matches from {{ up until the first }}
//         assertMatchCount(regexForVariable, '{{ VARIABLE }} {{ VARIABLE }} {{ VARIABLE }}', 3);
//         assertMatchFrom(regexForVariable, '{{ VARIABLE }}', 0, '{{ VARIABLE }}'.length);

//         // Try with some weird or missing spaces
//         assertMatch(regexForVariable, '{{VARIABLE }}');
//         assertMatch(regexForVariable, '{{ VARIABLE}}');
//     });

//     it('variable regex should survive fuzzing', () => {
//         const seedRandom = require('seedrandom');
//         const random = seedRandom(0); // Seed is set to 0 to make the test deterministic

//         // Match no variables
//         for (let i = 0; i < 1000; i++) {
//             const str = fuzz(random, 1000);

//             assertMatchCount(regexForVariable, str, 0);
//         }

//         // Match only one variable
//         for (let i = 0; i < 1000; i++) {
//             // Fuzz in and around variables
//             const str = `${fuzz(random, 100)}{{ asd }}${fuzz(random, 100)}`;
//             assertMatchCount(regexForVariable, str, 1);
//         }
//     });
// });

// // describe('RegExp Tests for if', () => {
// //     it('if regex should match if statements', () => {
// //         assertMatch(regexForIf, '{% if VARIABLE %} {% endif %}');
// //         assertMatch(regexForIf, '{% if VARIABLE %} {% endif %} {% if VARIABLE %} {% endif %}');

// //         assertMatchCount(regexForIf, '{% if VARIABLE %} {% endif %}', 1);
// //         assertMatchCount(regexForIf, '{% if VARIABLE %} {% endif %} {% if VARIABLE %} {% endif %}', 2);
// //         assertMatch(regexForIf, '{% if VARIABLE %} {% if VARIABLE %} {% endif %} {% endif %}');

// //         assertMatch(regexForIf, '{% if complex.human.name == \'Anne\' %} {% endif %}');
// //         assertMatch(regexForIf, '{% if complex.human.name == "Anne" %} {% endif %}');
// //         assertMatch(regexForIf, '{% if complex.human.name == "Anne" %} {% if complex.human.name == "Anne" %} {% endif %} {% endif %}');

// //         // Matches from {% if VARIABLE %} up until the first {% endif %}
// //         assertMatchCount(regexForIf, '{% if VARIABLE %} {% if VARIABLE %} {% endif %} {% endif %}', 2);
// //         assertMatchCount(regexForIf, '{% if VARIABLE %} {% if VARIABLE %} {% endif %} {% endif %} {% endif %}', 2);

// //         // Try with some weird or missing spaces
// //         assertMatch(regexForIf, '{%if VARIABLE %} {% endif %}');
// //         assertMatch(regexForIf, '{% if VARIABLE %} {%endif%}');
// //         assertMatch(regexForIf, '{% if VARIABLE %} {%endif %}');
// //         assertMatch(regexForIf, '{% if VARIABLE %} {% endif%}');

// //         // With operators and values
// //         assertMatch(regexForIf, '{% if VARIABLE OPERATOR "VALUE" %} {% endif %}');
// //         assertMatch(regexForIf, '{% if VARIABLE OPERATOR \'VALUE\' %} {% endif %}');
// //         assertMatch(regexForIf, '{% if VARIABLE OPERATOR "VALUE" %} {% if VARIABLE OPERATOR "VALUE" %} {% endif %} {% endif %}');
// //         assertMatchCount(regexForIf, '{% if VARIABLE OPERATOR "VALUE" %} {% endif %}', 1);
// //         assertMatchCount(regexForIf, '{% if VARIABLE OPERATOR "VALUE" %} {% endif %} {% if VARIABLE OPERATOR "VALUE" %} {% endif %}', 2);

// //         // Matches {% if VARIABLE OPERATOR "VALUE" %} entirely
// //         assertMatchCount(regexForIf, '{% if VARIABLE OPERATOR "VALUE" %} {% if VARIABLE OPERATOR "VALUE" %} {% endif %} {% endif %}', 2);
// //         assertMatchFrom(regexForIf, '{% if VARIABLE OPERATOR "VALUE" %} {% if VARIABLE OPERATOR "VALUE" %} {% endif %} {% endif %}', 0, '{% if VARIABLE OPERATOR "VALUE" %}'.length);

// //         // Matches with empty value
// //         assertMatch(regexForIf, '{% if VARIABLE OPERATOR "" %} {% endif %}');
// //         assertMatch(regexForIf, `{% if VARIABLE OPERATOR '' %} {% endif %}`);
// //         assertMatch(regexForIf, `{% if VARIABLE != '' %} \n{% if VARIABLE2 == 'review' %}\n{% endif %}\n {% endif %}`);
// //         assertMatch(regexForIf, `{% if VARIABLE != '' %} \n{% if VARIABLE2 == 'review' %}\n{% endif %}\n {% endif %}`);
// //         assertMatch(regexForIf, `{% if VARIABLE >= '' %} \n{% if VARIABLE2 == 'review' %}\n{% endif %}\n {% endif %}`);
// //         assertMatch(regexForIf, `{% if VARIABLE <= '' %} \n{% if VARIABLE2 == "review" %}\n{% endif %}\n {% endif %}`);
// //         assertMatch(regexForIf, `{% if VARIABLE <= "" %} \n{% if VARIABLE2 == "review" %}\n{% endif %}\n {% endif %}`);
// //         assertMatch(regexForIf, `{% if VARIABLE > '' %} \n{% if VARIABLE2 == 'review' %}\n{% endif %}\n {% endif %}`);
// //         assertMatch(regexForIf, `{% if VARIABLE < '' %} \n{% if VARIABLE2 == 'review' %}\n{% endif %}\n {% endif %}`);

// //         // Try with some weird or missing spaces
// //         assertMatch(regexForIf, '{%if VARIABLE OPERATOR "VALUE" %} {% endif %}');
// //         assertMatch(regexForIf, '{% ifVARIABLE OPERATOR "VALUE" %} {% endif %}');
// //         assertMatch(regexForIf, '{% if VARIABLE OPERATOR"VALUE" %} {% endif %}');
// //         assertMatch(regexForIf, '{% if VARIABLE OPERATOR "VALUE"%} {% endif %}');
// //     });

// //     it('if regex should survive fuzzing', () => {
// //         const seedRandom = require('seedrandom');
// //         const random = seedRandom(0); // Seed is set to 0 to make the test deterministic

// //         // Match no if statements
// //         for (let i = 0; i < 1000; i++) {
// //             const str = fuzz(random, 1000);

// //             assertMatchCount(regexForIf, str, 0);
// //         }

// //         // Match only one if statement
// //         for (let i = 0; i < 1000; i++) {
// //             // Fuzz in and around if statements
// //             const str = `${fuzz(random, 100)}{% if asd %}${fuzz(random, 100)}{% endif %}${fuzz(random, 100)}`;
// //             assertMatchCount(regexForIf, str, 1);

// //             const str2 = `${fuzzWithCharacters(random, 100, CHARS_WHITESPACE)}{% if asd %}${fuzzWithCharacters(random, 100, CHARS_WHITESPACE)}{% endif %}${fuzzWithCharacters(random, 100, CHARS_WHITESPACE)}`;
// //             assertMatchCount(regexForIf, str2, 1);

// //             const str3 = `${fuzzWithCharacters(random, 100, CHARS_QUOTES)} {% if asd %}${fuzzWithCharacters(random, 100, CHARS_QUOTES)}{% endif %}${fuzzWithCharacters(random, 100, CHARS_QUOTES)}`;
// //             assertMatchCount(regexForIf, str3, 1);

// //             const str4 = `{% if asd %}${fuzz(random, 100)}{% endif %}`;
// //             assertMatchCount(regexForIf, str4, 1);
// //         }
// //     });
// // });

// describe('RegExp Tests for unless', () => {
//     it('unless regex should match unless statements', () => {
//         assertMatch(regexForUnless, '{% unless VARIABLE %} {% endunless %}');
//         assertMatch(regexForUnless, '{% unless VARIABLE %} {% endunless %} {% unless VARIABLE %} {% endunless %}');

//         assertMatchCount(regexForUnless, '{% unless VARIABLE %} {% endunless %}', 1);
//         assertMatchCount(regexForUnless, '{% unless VARIABLE %} {% endunless %} {% unless VARIABLE %} {% endunless %}', 2);
//         assertMatch(regexForUnless, '{% unless VARIABLE %} {% unless VARIABLE %} {% endunless %} {% endunless %}');

//         assertMatch(regexForUnless, '{% unless complex.human.name %} {% endunless %}');
//         assertMatch(regexForUnless, '{% unless complex.human.name %} {% endunless %}');

//         // Matches from {% unless VARIABLE %} up until the first {% endunless %}
//         assertMatchCount(regexForUnless, '{% unless VARIABLE %} {% unless VARIABLE %} {% endunless %} {% endunless %}', 2);
//         assertMatchCount(regexForUnless, '{% unless VARIABLE %} {% unless VARIABLE %} {% endunless %} {% endunless %} {% endunless %}', 2);

//         // Try with some weird or missing spaces and quotes
//         assertMatch(regexForUnless, '{%unless VARIABLE%} {% endunless %}');
//         assertMatch(regexForUnless, '{% unlessVARIABLE %} {% endunless %}');
//         assertMatch(regexForUnless, '{%unless VARIABLE %} {% endunless%}');
//         assertMatch(regexForUnless, '{% unless VARIABLE%} {% endunless %}');
//     });

//     it('unless regex should survive fuzzing', () => {
//         const seedRandom = require('seedrandom');
//         const random = seedRandom(0); // Seed is set to 0 to make the test deterministic

//         // Match no unless statements
//         for (let i = 0; i < 1000; i++) {
//             const str = fuzz(random, 1000);

//             assertMatchCount(regexForUnless, str, 0);
//         }

//         // Match only one unless statement
//         for (let i = 0; i < 1000; i++) {
//             // Fuzz in and around unless statements
//             const str = `${fuzz(random, 100)}{% unless asd %}${fuzz(random, 100)}{% endunless %}${fuzz(random, 100)}`;
//             assertMatchCount(regexForUnless, str, 1);

//             const str2 = `${fuzzWithCharacters(random, 100, CHARS_WHITESPACE)}{% unless asd %}${fuzzWithCharacters(random, 100, CHARS_WHITESPACE)}{% endunless %}${fuzzWithCharacters(random, 100, CHARS_WHITESPACE)}`;
//             assertMatchCount(regexForUnless, str2, 1);

//             const str3 = `${fuzzWithCharacters(random, 100, CHARS_QUOTES)}{% unless asd %}${fuzzWithCharacters(random, 100, CHARS_QUOTES)}{% endunless %}${fuzzWithCharacters(random, 100, CHARS_QUOTES)}`;
//             assertMatchCount(regexForUnless, str3, 1);
//         }
//     });
// });

// describe('RegExp Tests for loop-for', () => {
//     it('loop-for regex should match loop-for statements', () => {
//         assertMatch(regexForLoopFor, '{% for VARIABLE in ARRAY %} {% endfor %}');
//         assertMatch(regexForLoopFor, '{% for VARIABLE in ARRAY %} {% endfor %} {% for VARIABLE in ARRAY %} {% endfor %}');

//         assertMatchCount(regexForLoopFor, '{% for VARIABLE in ARRAY %} {% endfor %}', 1);
//         // Not supported:
//         // assertMatchCount(regexForLoopFor, '{% for VARIABLE in ARRAY %} {% endfor %} {% for VARIABLE in ARRAY %} {% endfor %}', 2);

//         // Matches from {% for VARIABLE in ARRAY %} up until the first {% endfor %}
//         // Not supported:
//         // assertMatchCount(regexForLoopFor, '{% for VARIABLE in ARRAY %} {% for VARIABLE in ARRAY %} {% endfor %} {% endfor %}', 2);

//         // Try with some weird or missing spaces
//         assertMatch(regexForLoopFor, '{%for VARIABLE in ARRAY%} {% endfor %}');
//         assertMatch(regexForLoopFor, '{%for VARIABLE in ARRAY %} {% endfor%}');
//         assertMatch(regexForLoopFor, '{% for VARIABLE in ARRAY%} {% endfor %}');
//     });

//     it('loop-for regex should survive fuzzing', () => {
//         const seedRandom = require('seedrandom');
//         const random = seedRandom(0); // Seed is set to 0 to make the test deterministic

//         // Match no for statements
//         for (let i = 0; i < 1000; i++) {
//             const str = fuzz(random, 1000);

//             assertMatchCount(regexForLoopFor, str, 0);
//         }

//         // Match only one for statement
//         for (let i = 0; i < 1000; i++) {
//             // Fuzz in and around for statements
//             const str = `${fuzz(random, 100)}{% for asd in asd %}${fuzz(random, 100)}{% endfor %}${fuzz(random, 100)}`;
//             assertMatchCount(regexForLoopFor, str, 1);

//             const str2 = `${fuzzWithCharacters(random, 100, CHARS_WHITESPACE)}{% for asd in asd %}${fuzzWithCharacters(random, 100, CHARS_WHITESPACE)}{% endfor %}${fuzzWithCharacters(random, 100, CHARS_WHITESPACE)}`;
//             assertMatchCount(regexForLoopFor, str2, 1);

//             const str3 = `${fuzzWithCharacters(random, 100, CHARS_QUOTES)}{% for asd in asd %}${fuzzWithCharacters(random, 100, CHARS_QUOTES)}{% endfor %}${fuzzWithCharacters(random, 100, CHARS_QUOTES)}`;
//             assertMatchCount(regexForLoopFor, str3, 1);
//         }
//     });
// });

// describe('RegExp Tests for variable strings', () => {
//     it('variable string regex should match variable strings', () => {
//         assertMatch(regexForVariableString, 'key: \'string\'');
//         assertMatch(regexForVariableString, 'anotherKey: "string"');
//         assertMatch(regexForVariableString, 'ints: 42');
//         assertMatch(regexForVariableString, 'floats: 3.14');
//         assertMatch(regexForVariableString, 'bools: true');
//         assertMatch(regexForVariableString, 'bools: false');
//         assertMatch(regexForVariableString, 'nulls: null');
//         assertMatch(regexForVariableString, 'nulls: null, key: \'string\'');
//         assertMatch(regexForVariableString, 'key: \'string\', anotherKey: "string", ints: 42, floats: 3.14, bools: true, false, nulls: null');
//     });
// });
