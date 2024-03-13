
# 📚 Liquidish Syntax

Liquidish does not support all of Liquid's features. It is a subset of Liquid, with a few extra features.

> [!WARNING]
> Beware that most of the below features can not contain `%}` in their content. This is because the transformation is done by matching the `{%` and `%}` characters.
>
> **TODO: Add a way to escape the `%}` characters.*

## Variables

Variables are defined with double curly braces: `{{ VARIABLE }}`. They're mostly used to output the value of a variable at runtime.

```liquid
<h1>{{ title }}</h1>
```

> 🕒 If variables are known at compile-time (e.g: when using `render` or `for` loops), they will be replaced with their value at compile-time. See the [render](#render) and [for](#for) sections for more information.

## If-statements

If-statements are defined with `{% if VARIABLE %}` or `{% if VARIABLE == 'VALUE' %}`. You can expand the if-statement with `{% elsif VARIABLE %}` or `{% elsif VARIABLE == 'VALUE' %}` and `{% else %}`. They end with `{% endif %}`.

You can also use `!=`, `>`, `<`, `>=`, `<=` as operators for if/elsif statements.

```liquid
{% if VARIABLE %}
    This will be shown if VARIABLE is truthy
{% elsif VARIABLE == 'VALUE' %}
    This will be shown if VARIABLE is 'VALUE'
{% else %}
    This will be shown if none of the above are true
{% endif %}
```

> 🕒 If variables are known at compile-time (e.g: when using `render` or `for` loops), if/elsif-statements containing them will be evaluated at compile-time. **This is implemented in a pretty hacky way, so don't expect much of it.**
> See the [render](#render) and [for](#for) sections for more information.

## Unless statements

Unless-statements are defined with `{% unless VARIABLE %}` and are the opposite of if-statements. They end with `{% endunless %}`.

```liquid
{% unless VARIABLE %}
    This will be shown if VARIABLE is falsy
{% endunless %}
```

> 🕒 If variables are known at compile-time (e.g: when using `render` or `for` loops), unless-statements containing them will be evaluated at compile-time. **This is implemented in a pretty hacky way, so don't expect much of it.**
> See the [render](#render) and [for](#for) sections for more information.

## Comments

You can comment out code using `{% comment %}` and `{% endcomment %}`.

```liquid
{% comment %}
    This is a comment
{% endcomment %}
```

By default this will be removed from the output. If you want to keep the comments, you can set `showComments` to `true` on the transformer:

```javascript
const liquidish = new LiquidishTransformer({
  //...
  showComments: true,
});
```

## Render

When using `{% render './path/to/sub-template.liquid' %}` the sub-template will be compiled to the final output. This is useful for reusing components.

You must provide the path starting with `./` or `../` so it can be adjusted to the correct path when compiled to its final location.

```liquid
{% render './components/button.liquid' %}
```

*The `.liquid` extension is optional and will be added automatically if the specified path without it does not exist.*

To pass parameters to the sub-template, you can use following syntax:

```liquid
{% render './components/button', parameter: 'My cool button text', another_parameter: 'another_value' %}
```

> [!NOTE]
> The provided parameters will be known at compile-time and will be replaced with their value in the sub-template:
>
> ```liquid
> <!-- ./components/button.liquid -->
> <button class="px-4 py-2">{{ parameter }}</button>
> ```
>
> Will be compiled to:
>
> ```html
> <button class="px-4 py-2">My cool button text</button>
> ```

In order to pass complex JSON objects/arrays to a component you can use:

```liquid
{% render 'components/heading', {
    "slot": "{{ logout_txt }} {{ cpuser }}",
    "attributes": [
        ["id", "logout-button"],
        ["data-load-content", "login/logout.php"]
    ]
} %}
```

The JSON must be a valid JSON object. This means that you can only use double quotes for strings and not single quotes.

## For

`{% for ... in ... %}` compiles to output at compile-time using known variables. It does not support iterating over unknown variables at runtime.

Provide it with a variable that is known at compile-time, and it will loop over it:

```liquid
{% for item in items %}
    {{ item }}
{% endfor %}
```

This can be useful when you want to loop over a bunch of items that are known at compile-time, e.g: for attributes in a button component:

```liquid
<!-- ./components/button.liquid -->
<button class="px-4 py-2"
        {% for attribute in attributes %}
        {{ attribute[0] }}="{{ attribute[1] }}"
        {% endfor %}>
        {{ slot }}
</button>
```

The attributes would be provided like this:

```liquid
{% render './components/button', {
    "slot": "Click me",
    "attributes": [
        ["id", "click-me"],
        ["data-load-content", "click.php"]
    ]
} %}
```

This will be compiled to:

```html
<button class="px-4 py-2" id="click-me" data-load-content="click.php">Click me</button>
```

## Metadata

You can provide metadata to the transformer by using the `meta` tag. This can be used to ignore component files, who only work when called with `render` and provided their parameters.

Additionally you can provide default parameters for the component, which will be used when the component is called without parameters.

```liquid
{% meta {
  "isChildOnly": true,
  "defaults": {
    "parameter": "value"
  }
} %}
```

The data provided must be a valid JSON object. The meta tag must be the first element in the file.

The `isChildOnly` key can be used for sub-templates. When the transformer runs into a file with `isChildOnly` set to `true`, it will not compile it to a separate file. Instead, it can only be included in the parent file using the `render` tag.

## Whitespace control

Just [like Liquid](https://shopify.github.io/liquid/basics/whitespace/), Liquidish outputs empty lines whenever you use a tag:

```liquid
{% if value_that_is_true %}
    {{ my_variable }}
{% endif %} !
```

This will output:

```html

    Contents of my variable
 !
```

To trim whitespaces you can use the `{%-` and `-%}` for logic tags and `{{-` and `-}}` for variable tags:

```liquid
{%- if value_that_is_true %}
    {{- my_variable }}
{%- endif -%} !
```

This will output:

```html
Contents of my variable!
```

## Other syntax

Transformations can be added to Liquidish by using transformation strategies like those provided in the [🗺 Transformation Strategies](./transformation-strategies.md) documentation.

You can also [create a 🧩 Custom Transformation Strategy](./transformation-strategies.md#-custom-transformation-strategy).
