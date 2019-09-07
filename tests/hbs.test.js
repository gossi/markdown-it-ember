'use strict';

var path = require('path');
var generate = require('markdown-it-testgen');

// naming convention in hbs.txt:
// Inline - Inline invocation
// Block - Block invocation
// SL - Single line
// ML - Multi line
// AB - Angle Brackets
// CB - Curly Braces

describe('markdown-it-ember no html', function() {
  var md = require('markdown-it')().use(require('../'));

  generate(path.join(__dirname, 'fixtures/hbs.txt'), { header: true }, md);
});

describe('markdown-it-ember with html', function() {
  var md = require('markdown-it')({
    html: true
  }).use(require('../'));

  generate(path.join(__dirname, 'fixtures/hbs.txt'), { header: true }, md);
});
