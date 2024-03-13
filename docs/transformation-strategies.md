# 🗺 Transformation Strategies

Liquidish accepts a strategy that defines how the Liquidish syntax is transformed to the target language.

There are a couple built-in strategies:

- [🖥 `ISPConfigTransformationStrategy`](#-ispconfigtransformationstrategy)
- [🌍 `PHPTransformationStrategy`](#-phptransformationstrategy) (minimal example)

You can also [create a 🧩 Custom Transformation Strategy](#-custom-transformation-strategy).

## 🖥 `ISPConfigTransformationStrategy`

This strategy transforms Liquidish to ISPConfig's `tpl` syntax.

To use it, you instantiate a new `LiquidishTransformer` like this:

```javascript
import { ISPConfigTransformationStrategy } from 'liquidish/strategies/ispconfig-transformation-strategy';
import { LiquidishTransformer } from 'liquidish';

const liquidish = new LiquidishTransformer({
    strategyBuilder: (transformer) => new ISPConfigTransformationStrategy(transformer)
});
```

It compiles Liquidish syntax to ISPConfig's `tpl` syntax in the following ways:

| Liquidish Syntax | ISPConfig `.tpl` Syntax | `strategyMethodName` | Notes |
|---|---|---|---|
| `{{ VARIABLE }}` | `{tmpl_var name="VARIABLE"}` | `variable` | If the variable is known at compile-time, it will be replaced with its value. For example when using `render` or `for` loops |
| `{% comment %} ... {% endcomment %}` | `<!-- ... -->` | `comment` | Outputs nothing if `showComments` is set to false on the transformer |
| `{% render './template' %}` | *Replaced with the contents of the `./template.liquid` file* | `render` | The `.liquid` extension does not have to be provided |
| `{% render './template', parameter1: 'value', parameter2: '{{ cool }}' %}` | *Replaced with the contents of the `./template.liquid` file* | `render` | The provided parameters are used to replace the variables in the sub-template at compile-time |
| `{% render './template', { "parameter1": "{{ logout_txt }}", "parameter2": ["arrays", "are", "supported"] } %}` | *Replaced with the contents of the `./template.liquid` file* | `render` | You can provide JSON of which the keys are passed as parameters to the sub-template |
| `{% for item in items %}{{ item }}{% endfor %}` | *Replaced with item, repeated for each item in the collection at compile time* | `for` |  |
| `{% if VARIABLE %}` | `{tmpl_if VARIABLE}` | `if` |  |
| `{% if VARIABLE == 'VALUE' %}` | `{tmpl_if name="VARIABLE" op="==" value="VALUE"}` | `if` | The `==` operator can be replaced with `!=`, `>`, `<`, `>=`, `<=` |
| `{% elsif VARIABLE %}` | `{tmpl_elseif VARIABLE}` | `elsif` |  |
| `{% elsif VARIABLE == 'VALUE' %}` | `{tmpl_elseif name="VARIABLE" op="==" value="VALUE"}` | `elsif` |  |
| `{% else %}` | `{tmpl_else}` | `else` |  |
| `{% endif %}` | `{/tmpl_if}` | `endif` |  |
| `{% unless VARIABLE %}` | `{tmpl_unless VARIABLE}` | `unless` |  |
| `{% endunless %}` | `{/tmpl_unless}` | `endunless` |  |

In addition to the standard Liquidish syntax, it also includes:

### Loops

Loops compile to ISPConfig's loops. For example, this Liquidish code:

```liquid
{% loop items %}
    {{ item }}
{% endloop %}
```

Becomes this ISPConfig code:

```js
{tmpl_loop name="items"}
    {{ item }}
{/tmpl_loop}
```

*Unlike with `for` loops, the `in` keyword is not available to specify the iterable.*

### Dyninclude

Dyninclude are defined with `{% dyninclude 'template-file' %}` and compile to ISPConfig's `dyninclude` tag:

```javascript
{tmpl_dyninclude name="template-file"}
```

### Hooks

Hooks are defined with `{% hook 'hookName' %}` and compile to ISPConfig's `hook` tag:

```javascript
{tmpl_hook name="hookName"}
```

## 🌍 `PHPTransformationStrategy`

The PHP transformation strategy is a simple example of how to transform Liquidish to PHP. It is included as an example.

It is used like this:

```javascript
import { PHPTransformationStrategy } from 'liquidish/strategies/php-transformation-strategy';
import { LiquidishTransformer } from 'liquidish';

const liquidish = new LiquidishTransformer({
    strategyBuilder: (transformer) => new PHPTransformationStrategy(transformer)
});
```

It compiles Liquidish syntax to PHP in the following ways:

| Liquidish Syntax | PHP Syntax | `strategyMethodName` | Notes |
|---|---|---|---|
| `{{ VARIABLE }}` | `<?php echo $VARIABLE; ?>` | `variable` | If the variable is known at compile-time, it will be replaced with its value. For example when using `render` or `for` loops |
| `{% comment %} ... {% endcomment %}` | `<!-- ... -->` | `comment` | Outputs PHP comments (`<?php /* ... */ ?>`) if `showComments` is set to false on the transformer |
| `{% render './template' %}` | *Replaced with the contents of the `./template.liquid` file* | `render` | The `.liquid` extension does not have to be provided |
| `{% render './template', parameter1: 'value', parameter2: '{{ cool }}' %}` | *Replaced with the contents of the `./template.liquid` file* | `render` | The provided parameters are used to replace the variables in the sub-template at compile-time |
| `{% render './template', { "parameter1": "{{ logout_txt }}", "parameter2": ["arrays", "are", "supported"] } %}` | *Replaced with the contents of the `./template.liquid` file* | `render` | You can provide JSON of which the keys are passed as parameters to the sub-template |
| `{% for item in items %}{{ item }}{% endfor %}` | *Replaced with item, repeated for each item in the collection at compile time* | `for` |  |
| `{% if VARIABLE %}` | `<?php if ($VARIABLE) : ?>` | `if` |  |
| `{% if VARIABLE == 'VALUE' %}` | `<?php if ($VARIABLE == 'VALUE') : ?>` | `if` | The `==` operator can be replaced with `!=`, `>`, `<`, `>=`, `<=` |
| `{% elsif VARIABLE %}` | `<?php elseif ($VARIABLE) : ?>` | `elsif` |  |
| `{% elsif VARIABLE == 'VALUE' %}` | `<?php elseif ($VARIABLE == 'VALUE') : ?>` | `elsif` |  |
| `{% else %}` | `<?php else : ?>` | `else` |  |
| `{% endif %}` | `<?php endif; ?>` | `endif` |  |
| `{% unless VARIABLE %}` | `<?php if (!$VARIABLE) : ?>` | `unless` |  |
| `{% endunless %}` | `<?php endif; ?>` | `endunless` |  |

And it includes an additional `include` tag:

```liquid
{% include './header.php' %}
```

This will be transformed to PHP's `include` statement.

```php
<?php include './header.php'; ?>
```

## 🧩 Custom Transformation Strategy

You can create your own transformation strategy by extending the `TransformationStrategy` class.

Here's a typescript example that shows how to start making your own transformation strategy for [Vue.js](https://vuejs.org/guide/essentials/template-syntax.html).

```typescript
import { BaseTransformationStrategy } from 'liquidish/strategies';
import { LogicToken, Node, LogicTokenFlags, ParentNode, SelfClosingNode } from 'liquidish';

/**
 * @public
 */
export class VueTransformationStrategy extends BaseTransformationStrategy {
    /**
     * @inheritdoc
     */
    override getLogicTokens(): LogicToken[] {
        return [
            ...super.getLogicTokens(),
            { type: 'html' },
            { type: 'pre', flags: LogicTokenFlags.OpensScope },
            { type: 'endpre', flags: LogicTokenFlags.ClosesScope },
        ];
    }

    /**
     * @inheritdoc
     */
    override transformNode(node: Node): string | null {
        switch (node.type) {
            case 'html':
                return this.html(<SelfClosingNode>node);
            case 'pre':
                return this.pre(<ParentNode>node);
            // No need to implement endpre, as it's handled by the base class
        }

        return super.transformNode(node);
    }

    /**
     * Transforms {% html '<div>hello</div>' %}
     */
    private html(node: SelfClosingNode): string {
        return `<div v-html="'${node.parameters}'"></div>`
    }

    /**
     * Transforms {% pre %}
     */
    private pre(node: ParentNode): string {
        const contents = this.statementsToText(node.statements);
        const transformed = this.transformer.transform(contents);

        return `<span v-pre>${transformed}</span>`;
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
    override if(name: string, op?: string, value?: string): string {
        if (op && value) {
          return `<div v-if="$${name} ${op} '${value}'">`;
        }

        return `<div v-if="$${name}">`;
    }

    /**
     * @inheritdoc
     */
    override elseif(name: string, op?: string, value?: string): string {
        if (op && value) {
          return `</div><div v-else-if="$${name} ${op} '${value}'">`;
        }

        return `</div><div v-else-if="$${name}">`;
    }

    /**
     * @inheritdoc
     */
    override else(): string {
        return `</div><div v-else>`;
    }

    /**
     * @inheritdoc
     */
    override endif(): string {
        return `</div>`;
    }

    /**
     * @inheritdoc
     */
    override unless(name: string): string {
        return `<div v-if="!${name}">`;
    }

    /**
     * @inheritdoc
     */
    override endunless(): string {
        return `</div>`;
    }

    /**
     * @inheritdoc
     */
    override variable(variable: string): string {
        return `{{ ${variable} }}`;
    }
}
```

Accompanying this example is [this test file](../tests/vue-transformation-strategy.spec.ts) that shows how to test your transformation strategy.
