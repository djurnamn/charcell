// The text versions' markup as cells and back: `{x|text}` sets a tone on the
// cells it holds, nestable (cases.cjs). A cell is its character and the
// sorted set of tone codes on it, so two spellings of the same cells compare
// equal.

/**
 * The cells of one line of markup.
 * @param {string} line - markup, as cases.cjs writes it.
 * @returns {{ character: string, codes: string }[]} One entry per cell.
 */
export function cellsOf(line) {
  const cells = [];
  const stack = [];
  for (let index = 0; index < line.length; index++) {
    const match = /^\{([A-Za-z]+)\|/.exec(line.slice(index));
    if (match) {
      stack.push(match[1]);
      index += match[0].length - 1;
    } else if (line[index] === "}" && stack.length > 0) {
      stack.pop();
    } else {
      const character = String.fromCodePoint(line.codePointAt(index));
      if (character.length > 1) index++;
      cells.push({
        character,
        codes: [...new Set(stack.join(""))].sort().join(""),
      });
    }
  }
  return cells;
}

/**
 * One line of markup from cells: each run of cells with the same codes in one
 * brace, the codes in a fixed order.
 * @param {{ character: string, codes: string }[]} cells - the line's cells.
 * @returns {string} The markup.
 */
export function markupOf(cells) {
  let out = "";
  let run = "";
  let codes = "";
  const flush = () => {
    if (run) out += codes ? `{${codes}|${run}}` : run;
    run = "";
  };
  for (const cell of cells) {
    if (cell.codes !== codes) {
      flush();
      codes = cell.codes;
    }
    run += cell.character;
  }
  flush();
  return out;
}

// A blank cell shows its fill and its underline; a text color, weight or
// slant on it draws nothing.
const visible = (cell) =>
  cell && cell.character === " "
    ? { character: " ", codes: cell.codes.replace(/[mfsbe]/g, "") }
    : cell;

/**
 * Whether two texts hold the same cells, trailing blank cells aside.
 * @param {string[]} first - one text's lines.
 * @param {string[]} second - the other's.
 * @returns {{ row: number, column: number, first: string, second: string }[]} The cells that differ.
 */
export function differences(first, second) {
  const blank = (cell) =>
    !cell || (cell.character === " " && cell.codes === "");
  const out = [];
  const rows = Math.max(first.length, second.length);
  for (let row = 0; row < rows; row++) {
    const left = cellsOf(first[row] ?? "");
    const right = cellsOf(second[row] ?? "");
    const columns = Math.max(left.length, right.length);
    for (let column = 0; column < columns; column++) {
      const x = visible(left[column]);
      const y = visible(right[column]);
      if (blank(x) && blank(y)) continue;
      if (x?.character !== y?.character || x?.codes !== y?.codes) {
        out.push({
          row,
          column,
          first: x ? `${x.codes}|${x.character}` : "-",
          second: y ? `${y.codes}|${y.character}` : "-",
        });
      }
    }
  }
  return out;
}

/**
 * A snapshot file's texts, by key: each `@@ key` line, then the text's lines
 * and one blank line.
 * @param {string} file - the file's contents.
 * @returns {Record<string, string[]>}
 */
export function parseSnapshots(file) {
  const out = {};
  let lines;
  for (const line of file.split("\n")) {
    const header = /^@@ (.+)$/.exec(line);
    if (header) out[header[1]] = lines = [];
    else if (lines) lines.push(line);
  }
  for (const key of Object.keys(out)) out[key].pop();
  return out;
}

/**
 * Texts as a snapshot file, in the order given.
 * @param {Record<string, string[]>} texts - the lines per key.
 * @returns {string}
 */
export const formatSnapshots = (texts) =>
  Object.entries(texts)
    .map(([key, lines]) => `@@ ${key}\n${lines.join("\n")}\n`)
    .join("\n");

// Each character a right-to-left row draws as its mirror image: the box
// drawing, block and arrow characters with a left and a right, and the
// brackets the bidirectional algorithm mirrors.
const MIRRORED = (() => {
  const pairs = [
    "┌┐",
    "└┘",
    "├┤",
    "╭╮",
    "╰╯",
    "┏┓",
    "┗┛",
    "┣┫",
    "╔╗",
    "╚╝",
    "╠╣",
    "┍┑",
    "┎┒",
    "┕┙",
    "┖┚",
    "╒╕",
    "╓╖",
    "╘╛",
    "╙╜",
    "┝┥",
    "┞┦",
    "┟┧",
    "┠┨",
    "┡┩",
    "┢┪",
    "╞╡",
    "╟╢",
    "┭┮",
    "┱┲",
    "┵┶",
    "┹┺",
    "┽┾",
    "╃╄",
    "╅╆",
    "╉╊",
    "╴╶",
    "╸╺",
    "╼╾",
    "╱╲",
    "▌▐",
    "▏▕",
    "▖▗",
    "▘▝",
    "▙▟",
    "▛▜",
    "▚▞",
    "▸◂",
    "▶◀",
    "❯❮",
    "←→",
    "()",
    "[]",
    "{}",
    "<>",
  ];
  const out = new Map();
  for (const [first, second] of pairs.map((pair) => [...pair])) {
    out.set(first, second);
    out.set(second, first);
  }
  return out;
})();

const strong = (character) => /[\p{L}\p{N}]/u.test(character);
// What a run of text holds between its letters: a space and the punctuation
// of running text.
// A blank cell with a fill or a line under it is drawing, not text.
const inText = (cell) =>
  cell.character === " "
    ? !/[iIwMudx]/.test(cell.codes)
    : strong(cell.character) || /[.,:;'’"!?%&@#+_\-/]/.test(cell.character);

/**
 * A row as a right-to-left page lays it out: the cells in reverse order, each
 * drawn as its mirror image, except a run of left-to-right text, which keeps
 * its order the way the bidirectional algorithm keeps it. A run starts and
 * ends with a letter or a digit, and holds single spaces and the punctuation
 * of running text between them; anything else, or two spaces, ends it.
 * @param {string} line - markup, as cases.cjs writes it.
 * @param {number} columns - the row's width in cells, the box it mirrors in.
 * @returns {string} The mirrored row's markup.
 */
export function mirroredLine(line, columns) {
  const cells = cellsOf(line);
  while (cells.length < columns) cells.push({ character: " ", codes: "" });
  const pieces = [];
  let index = 0;
  while (index < cells.length) {
    if (!strong(cells[index].character)) {
      const cell = cells[index++];
      pieces.push([
        { ...cell, character: MIRRORED.get(cell.character) ?? cell.character },
      ]);
      continue;
    }
    let end = index + 1;
    let last = index;
    while (end < cells.length) {
      const character = cells[end].character;
      if (strong(character)) last = end;
      else if (character === " " && !strong(cells[end + 1]?.character ?? ""))
        break;
      else if (character !== " " && !inText(cells[end])) break;
      end++;
    }
    pieces.push(cells.slice(index, last + 1));
    index = last + 1;
  }
  return markupOf(pieces.reverse().flat());
}

/**
 * A text as a right-to-left page lays it out, every row in the same box.
 * @param {string[]} lines - the text's lines.
 * @param {number} columns - the box's width in cells.
 * @returns {string[]}
 */
export const mirrored = (lines, columns) =>
  lines.map((line) => mirroredLine(line, columns));

/**
 * A text's drawing alone: every run of text with a letter or a digit in it,
 * punctuation at either end included, as `x` cells with no tone. The bidirectional algorithm lays
 * each element's text out on its own, which the text cannot say, so right to
 * left holds the drawing to the mirror image and leaves the text's order to
 * the browser.
 * @param {string[]} lines - the text's lines.
 * @returns {string[]}
 */
export const drawingOf = (lines) =>
  lines.map((line) => {
    const cells = cellsOf(line);
    const mark = (cell) => inText(cell) && cell.character !== " ";
    let index = 0;
    while (index < cells.length) {
      if (!mark(cells[index])) {
        index++;
        continue;
      }
      let end = index;
      let last = index;
      let letters = false;
      while (
        end < cells.length &&
        (inText(cells[end]) ||
          (cells[end].character === " " &&
            strong(cells[end + 1]?.character ?? "")))
      ) {
        if (mark(cells[end])) last = end;
        letters ||= strong(cells[end].character);
        end++;
      }
      if (letters)
        for (let cell = index; cell <= last; cell++)
          cells[cell] = { character: "x", codes: "" };
      index = last + 1;
    }
    return markupOf(cells);
  });
