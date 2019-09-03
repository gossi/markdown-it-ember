'use strict';

var path = require('path');
var generate = require('markdown-it-testgen');

describe('markdown-it-handlebars', function() {
  var md = require('markdown-it')().use(require('../'));

  generate(path.join(__dirname, 'fixtures/hbs.txt'), md);
});
