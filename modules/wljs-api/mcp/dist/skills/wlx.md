---
title: WLX cells and components
desc: Build dynamic WLJS markup and reusable components by combining HTML tags with Wolfram expressions.
---

# WLX cells

Start a cell with `.wlx`. WLX combines plain HTML with Wolfram expressions represented
as XML-like tags:

```xml
.wlx
<div>Today is <Now/></div>
```

Lowercase names are HTML tags. Capitalized names are Wolfram symbols; the initial
capital is required. Definitions created inside a WLX cell live in the Wolfram
`Global` context.

## Tag semantics

- A self-closing symbol tag uses its own value: `<MyFigure/>`.
- A symbol tag with children calls its downvalue. The first child is the first
  argument, the second child is the second argument, and so on.
- Plain text also counts as an argument.
- Attributes on a Wolfram symbol become options; child arguments come before
  `OptionsPattern[]`.
- Values in HTML attributes are interpolated with curly braces, for example
  `src="https://{host}/image.png"` or `Color={"blue"}`.
- `<Escape>...</Escape>` returns its children as uninterpreted text.

```xml
.wlx
Heading[Child_, OptionsPattern[]] := With[{color = OptionValue["Color"]},
  <h2 style="color: {color}"><Child/></h2>
];
Options[Heading] = {"Color" -> "black"};

<Heading Color={"blue"}>Hello World</Heading>
```

## Output rules

WLX renders an expression with `WLXForm`. When no `WLXForm` is defined, the expression
is converted to a string. Graphics, images, event objects, and GUI controls already
provide useful WLX output forms.

Keep exactly one root expression (or no root expression), because only the final root
is exported as the output. Close every tag explicitly, including void tags such as
`<img/>` and `<br/>`; WLX parses the tree before rendering and is stricter than HTML.

Use Wolfram `Table`, `If`, `With`, or `Module` for iteration and conditional markup.
Wrap separate text items in `<span>`, `<p>`, or `<Identity>` when they must be passed as
distinct children.

WLX component definitions can also be consumed by Markdown and slide cells.

Source: https://wljs.io/llms.mdx/frontend/Cell-types/WLX
Component guide: https://wljs.io/llms.mdx/frontend/Advanced/Component-based-markup
