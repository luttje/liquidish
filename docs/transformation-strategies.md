# 🗺 Transformation Strategies

Liquidish accepts a strategy that defines how the Liquidish syntax is transformed to the target language.

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

See the [tests](./tests/) and the existing strategies ([php](./src/strategies/php-transformation-strategy.ts), [ISPConfig](./src/strategies/ispconfig-transformation-strategy.ts)) for examples.
