'use strict';

const INLINE_ANGLE_BRACKETS = /^<([A-Z]{1}([.:\w]*))(?=[\s\w\S]*)([^\/]*\/>|[^<]*(<\/([A-Z]{1}([.:\w]*))>)?)/;
const START_ANGLE_BRACKETS = /^<([A-Z]{1}([.:\w]*))(?=[\s\w\S]*\/?>?)/;
const END_ANGLE_BRACKETS_INLINE = /\/>$/;
const END_ANGLE_BRACKETS_BLOCK = '</tag>$';
const START_CURLIES = /{{#([\w-]+)}}/;
const END_CURLIES = '{{/tag}}$';
const START = {
  'angle-brackets': START_ANGLE_BRACKETS,
  curlies: START_CURLIES
};

function findEnd(regex, tag, state, nextLine, endLine, initialText) {
  const closingMatch =
    typeof regex === 'string' ? new RegExp(regex.replace('tag', tag)) : regex;

  let found = closingMatch.test(initialText);
  let pos, max, lineText;

  if (!found) {
    for (; nextLine < endLine; nextLine++) {
      if (state.sCount[nextLine] < state.blkIndent) {
        break;
      }

      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];
      lineText = state.src.slice(pos, max);

      if (closingMatch.test(lineText)) {
        if (lineText.length !== 0) {
          nextLine++;
        }
        found = true;
        break;
      }
    }
  }

  return found ? nextLine : false;
}

function isLetter(ch) {
  /*eslint no-bitwise:0*/
  var lc = ch | 0x20; // to lower case
  return lc >= 0x61 /* a */ && lc <= 0x7a /* z */;
}

module.exports = function emberPlugin(md) {
  //
  // Parser
  //
  md.block.ruler.before('html_block', 'ember_block', function(
    state,
    startLine,
    endLine,
    silent
  ) {
    let pos = state.bMarks[startLine] + state.tShift[startLine];
    let max = state.eMarks[startLine];

    let lineText = state.src.slice(pos, max);

    let tag, type;

    for (const [key, regex] of Object.entries(START)) {
      const result = regex.exec(lineText);
      if (result !== null) {
        tag = result[1];
        type = key;
        break;
      }
    }

    if (type === undefined) {
      return false;
    }

    if (silent) {
      // true if this sequence can be a terminator, false otherwise
      return true;
    }

    let nextLine = startLine + 1;

    // If we are here - we detected ember blocks.
    // Let's roll down till block end.

    let result;
    if (type === 'curlies') {
      result = findEnd(END_CURLIES, tag, state, nextLine, endLine, lineText);
    } else {
      // first find end for block invocation
      // second find end for inline invocation (if block isn't found)
      const regexes = [END_ANGLE_BRACKETS_BLOCK, END_ANGLE_BRACKETS_INLINE];

      for (const regex of regexes) {
        result = findEnd(regex, tag, state, nextLine, endLine, lineText);

        if (result !== false) {
          break;
        }
      }
    }

    if (result === false) {
      return false;
    }

    nextLine = result;
    state.line = nextLine;

    const token = state.push('ember_block', '', 0);
    token.map = [startLine, nextLine];
    token.content = state.getLines(startLine, nextLine, state.blkIndent, true);

    return true;
  });

  md.inline.ruler.before('text', 'ember_inline', function(state, silent) {
    var ch,
      match,
      max,
      token,
      pos = state.pos;

    // Check start
    max = state.posMax;
    if (state.src.charCodeAt(pos) !== 0x3c /* < */ || pos + 2 >= max) {
      return false;
    }

    // Quick fail on second char
    ch = state.src.charCodeAt(pos + 1);
    if (
      ch !== 0x21 /* ! */ &&
      ch !== 0x3f /* ? */ &&
      ch !== 0x2f /* / */ &&
      !isLetter(ch) &&
      !ch.test(/[A-Z]/)
    ) {
      return false;
    }

    match = state.src.slice(pos).match(INLINE_ANGLE_BRACKETS);
    if (!match) {
      return false;
    }

    if (!silent) {
      token = state.push('ember_inline', '', 0);
      token.content = state.src.slice(pos, pos + match[0].length);
    }
    state.pos += match[0].length;
    return true;
  });

  //
  // Renderer
  //
  md.renderer.rules.ember_block = function(tokens, idx /*, options, env */) {
    return tokens[idx].content;
  };

  md.renderer.rules.ember_inline = function(tokens, idx /*, options, env */) {
    return tokens[idx].content;
  };

  function replaceCurlies(content) {
    return content.replace(/{{/gi, '&#123;&#123;').replace(/}}/gi, '&#125;&#125;');
  }

  const defaultFenceRenderer =
    md.renderer.rules.fence ||
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.fence = function(tokens, idx, options, env, slf) {
    return replaceCurlies(defaultFenceRenderer(tokens, idx, options, env, slf));
  };

  const defaultInlineCodeRenderer =
    md.renderer.rules.code_inline ||
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.code_inline = function(tokens, idx, options, env, slf) {
    return replaceCurlies(
      defaultInlineCodeRenderer(tokens, idx, options, env, slf)
    );
  };
};
