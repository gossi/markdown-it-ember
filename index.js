'use strict';

/*
 * Handlebars regex and handler for markdown-it
 * based on:
 * https://github.com/markdown-it/markdown-it/blob/master/lib/rules_block/html_block.js
 */
const HBS_SEQUENCES = [
  // [/^<\/?([A-Z]{1}([.:\w]*))(?=[\s\w\S]*>)/, '</tag>$', true],

  // // <My::Component/>
  // [/^<([A-Z]{1}([.:\w]*))(?=[\s\w\S]*?\/>)/, /\/>$/, true],

  // <My::Component></My::Component>
  [, '(/>|</tag>)$', true],

  // {{#my-component}}{{/my-component}}
  [, , true]
];

const START_ANGLE_BRACKETS = /^<([A-Z]{1}([.:\w]*))(?=[\s\w\S]*\/?>?)/;
const END_ANGLE_BRACKETS_INLINE = /\/>$/;
const END_ANGLE_BRACKETS_BLOCK = '</tag>$';
const START_CURLIES = /{{#([\w-]+)}}/;
const END_CURLIES = '{{/tag}}$';
const START = {
  'angle-brackets': START_ANGLE_BRACKETS,
  curlies: START_CURLIES
};

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

    // for (i = 0; i < ObjectHBS_SEQUENCES.length; i++) {
    //   result = HBS_SEQUENCES[i][0].exec(lineText);

    // }

    // if (i === HBS_SEQUENCES.length) {
    //   return false;
    // }

    if (silent) {
      // true if this sequence can be a terminator, false otherwise
      return true;
    }

    let nextLine = startLine + 1;

    // If we are here - we detected HTML block.
    // Let's roll down till block end.

    function findEnd(regex, state, nextLine, endLine, initialText) {
      const closingMatch =
        typeof regex === 'string'
          ? new RegExp(regex.replace('tag', tag))
          : regex;

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

    if (type === 'curlies') {
      nextLine = findEnd(END_CURLIES, state, nextLine, endLine, lineText);
    } else {
      // first find end for block invocation
      let result = findEnd(
        END_ANGLE_BRACKETS_BLOCK,
        state,
        nextLine,
        endLine,
        lineText
      );

      // second find end for inline invocation (if block isn't found)
      if (result === false) {
        result = findEnd(
          END_ANGLE_BRACKETS_INLINE,
          state,
          nextLine,
          endLine,
          lineText
        );
      }
      nextLine = result;
    }

    if (nextLine === false) {
      return false;
    }

    state.line = nextLine;

    const token = state.push('ember_block', '', 0);
    token.map = [startLine, nextLine];
    token.content = state.getLines(startLine, nextLine, state.blkIndent, true);

    return true;
  });

  //
  // Renderer
  //
  md.renderer.rules.ember_block = function(tokens, idx /*, options, env */) {
    return tokens[idx].content;
  };

  function replaceCurlies(content) {
    return content.replace(/{{/gi, '\\{{');
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
