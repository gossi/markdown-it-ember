# markdown-it-ember [![Build Status](https://travis-ci.com/gossi/markdown-it-ember.svg?branch=master)](https://travis-ci.com/gossi/markdown-it-ember)

Plugin for markdown-it to parse ember template syntax and persist it.

## Installation

```bash
yarn add markdown-it-ember
```

## Usage

```js
const markdown = require('markdown-it');
const emberPlugin = require('markdown-it-ember');

const md = markdown().use(emberPlugin);
const html = md.render(`
<My::Component>
`);
```
