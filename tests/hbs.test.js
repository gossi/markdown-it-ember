'use strict';

var path = require('path');
var generate = require('markdown-it-testgen');

describe('markdown-it-handlebars', function() {
  var md = require('markdown-it')().use(require('../'));

  // naming convention in hbs.txt:
  // Inline - Inline invocation
  // Block - Block invocation
  // SL - Single line
  // ML - Multi line
  // AB - Angle Brackets
  // CB - Curly Braces
  generate(path.join(__dirname, 'fixtures/hbs.txt'), { header: true }, md);
});
