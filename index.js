'use strict';

/*
 * Handlebars regex and handler for markdown-it
 * based on:
 * https://github.com/markdown-it/markdown-it/blob/master/lib/rules_block/html_block.js
 */
const HBS_SEQUENCES = [[/^<\/?([A-Z]{1}([\w]*?))(?=(\s|\/?>|$))/, /^$/, true]];

module.exports = function handlebarsPlugin(md) {
  md.block.ruler.before('html_block', 'handlebars', function(
    state,
    startLine,
    endLine,
    silent
  ) {
    let pos = state.bMarks[startLine] + state.tShift[startLine];
    let max = state.eMarks[startLine];

    let lineText = state.src.slice(pos, max);

    let i;
    for (i = 0; i < HBS_SEQUENCES.length; i++) {
      if (HBS_SEQUENCES[i][0].test(lineText)) {
        break;
      }
    }

    if (i === HBS_SEQUENCES.length) {
      return false;
    }

    if (silent) {
      // true if this sequence can be a terminator, false otherwise
      return HBS_SEQUENCES[i][2];
    }

    let nextLine = startLine + 1;

    // If we are here - we detected HTML block.
    // Let's roll down till block end.
    if (!HBS_SEQUENCES[i][1].test(lineText)) {
      for (; nextLine < endLine; nextLine++) {
        if (state.sCount[nextLine] < state.blkIndent) {
          break;
        }

        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];
        lineText = state.src.slice(pos, max);

        if (HBS_SEQUENCES[i][1].test(lineText)) {
          if (lineText.length !== 0) {
            nextLine++;
          }
          break;
        }
      }
    }

    state.line = nextLine;

    const token = state.push('html_block', '', 0);
    token.map = [startLine, nextLine];
    token.content = state.getLines(startLine, nextLine, state.blkIndent, true);

    return true;
  });
};
