// Reads a rendered element back into a text version: the markup a
// character-cell screen would print for it, one cell at a time. Each cell's
// fill and text color are found among the five tones, then its pixels are
// matched against an atlas of every glyph and style in that fill and text
// color, drawn by the
// text renderer itself (cases.cjs's renderHtml and cells.css), so what the
// reader writes renders to the pixels it read. A cell that matches nothing is
// one no character-cell screen could print, and comes back as `null`.
//
// Runs against a page that loads the kit's stylesheet, cells.css and
// cases.cjs (as `window.CharcellText`): the comparison page does.
import { cellsOf, markupOf } from "./markup.mjs";

// The tones a cell can take: its fill, then its text color on that fill. An
// inverted cell's text is the ground's color, dimmed or not.
const FILLS = {
  background: "",
  faint: "w",
  mid: "M",
  foreground: "i",
  strong: "I",
};
const INKS = { foreground: "", mid: "m", faint: "f", strong: "s" };
// The type styles the text versions use: one at a time, or bold underlined
// (a focused heading).
const STYLES = ["", "b", "e", "u", "d", "x", "bu"];
// How far a pixel's tone may drift and still match. The atlas draws the way
// the kit does, so the reader can hold it close: wide enough a margin would
// take dark mode's faint for the ground.
const TONE = 12;
// The atlas wraps at this many characters, inside the viewport: a screenshot
// past its edge is not reliable.
const PER_ROW = 96;

// The browser half: decodes screenshots, sorts cells by tone and matches them.
function install(options) {
  const { tones, inks, fills, styles, tone, perRow } = options;
  // Each style's characters in rows of `perRow`, the rows of one style after another.
  const chunks = (characters) => {
    const out = [];
    for (let index = 0; index < characters.length; index += perRow)
      out.push(characters.slice(index, index + perRow));
    return out;
  };
  const decode = async (data) => {
    const image = new Image();
    image.src = "data:image/png;base64," + data;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, image.width, image.height);
  };
  const rgb = (value) => {
    const probe = document.createElement("span");
    probe.style.color = value;
    document.body.append(probe);
    const [red, green, blue] = getComputedStyle(probe)
      .color.match(/\d+/g)
      .map(Number);
    probe.remove();
    return [red, green, blue];
  };
  const root = getComputedStyle(document.documentElement);
  const palette = Object.fromEntries(
    tones.map((name) => [
      name,
      rgb(root.getPropertyValue(`--charcell-${name}`)),
    ]),
  );
  const luminance = (red, green, blue) =>
    0.2126 * red + 0.7152 * green + 0.0722 * blue;

  // A cell's pixels, as luminance, from an image cut on the cell grid.
  const cellPixels = (image, column, row, width, height) => {
    const out = new Float32Array(width * height);
    const colors = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index =
          ((row * height + y) * image.width + column * width + x) * 4;
        const [red, green, blue] = [
          image.data[index],
          image.data[index + 1],
          image.data[index + 2],
        ];
        out[y * width + x] = luminance(red, green, blue);
        colors.push([red, green, blue]);
      }
    }
    return { pixels: out, colors };
  };
  // The tones a cell's pixels hit exactly, most pixels first.
  const tonesOf = (colors) => {
    const counts = new Map();
    for (const [red, green, blue] of colors) {
      for (const [name, [toneRed, toneGreen, toneBlue]] of Object.entries(
        palette,
      )) {
        if (
          Math.abs(red - toneRed) +
            Math.abs(green - toneGreen) +
            Math.abs(blue - toneBlue) <=
          6
        ) {
          counts.set(name, (counts.get(name) ?? 0) + 1);
          break;
        }
      }
    }
    return [...counts].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  };
  // The fill and text color codes a cell could carry, likeliest first.
  const pairsOf = (colors) => {
    const found = tonesOf(colors);
    const pairs = [];
    const add = (fill, ink) => {
      if (!(fill in fills)) return;
      // An inverted cell's text is the ground unless a tone says otherwise.
      const inverted = fill === "foreground" || fill === "strong";
      const plain =
        ink === undefined ||
        (inverted && (ink === "background" || ink === "foreground"));
      const code = plain
        ? fills[fill]
        : fill === ink
          ? null
          : ink in inks
            ? fills[fill] + inks[ink]
            : null;
      if (code !== null && !pairs.includes(code)) pairs.push(code);
    };
    const [first, second] = found;
    if (first) {
      add(first, second);
      if (second) add(second, first);
      for (const ink of Object.keys(inks)) add(first, ink);
    }
    for (const fill of Object.keys(fills))
      for (const ink of Object.keys(inks)) add(fill, ink);
    return pairs;
  };

  // A coarse print of a cell's pixels: two cells that match almost always
  // share it, so most cells are found by it before any pixel is compared.
  const printOf = (pixels) => {
    let out = "";
    for (let index = 0; index < pixels.length; index++)
      out += String.fromCharCode(48 + Math.round(pixels[index] / 48));
    return out;
  };
  const atlases = new Map();
  window.CellReader = {
    cell: null,
    scale: 1,
    // The cell size in CSS pixels, measured on the text renderer.
    measure(scale) {
      const text = document.createElement("pre");
      text.className = "charcell-text";
      const probe = document.createElement("span");
      probe.textContent = "0".repeat(100);
      text.append(probe);
      document.body.append(text);
      const width = probe.getBoundingClientRect().width / 100;
      const height = parseFloat(getComputedStyle(text).lineHeight);
      text.remove();
      this.cell = { width, height };
      this.scale = scale;
      return this.cell;
    },
    // Lays out the atlas for a fill and text color: every character in every
    // style, a row per style, near the page's top left at the fraction of a
    // pixel the region being read sits at, so its glyphs land on the device
    // pixels the same way. Returns its box.
    layAtlas(pair, characters, offset) {
      const { renderHtml } = window.CharcellText;
      document.getElementById("cell-atlas")?.remove();
      const pre = document.createElement("pre");
      pre.id = "cell-atlas";
      pre.className = "charcell-text";
      pre.style.cssText = `position: absolute; top: ${window.scrollY + offset.y}px; left: ${window.scrollX + offset.x}px; z-index: 10; background: var(--charcell-background)`;
      const tag = (style) => [...new Set(pair + style)].sort().join("");
      const rows = styles.flatMap((style) =>
        chunks(characters).map((chunk) =>
          // Each character in a slot of its own cell, a blank cell after it: a
          // glyph the face lacks, drawn wider by a fallback font, moves none of
          // the others, and none reaches into its neighbor's cell.
          chunk
            .map((character) =>
              renderHtml(
                tag(style)
                  ? `{${tag(style)}|${"{}".includes(character) ? " " : character}}`
                  : character,
              ),
            )
            .map(
              (html) =>
                `<span style="display: inline-block; width: 1ch">${html}</span> `,
            )
            .join(""),
        ),
      );
      pre.innerHTML = rows.join("\n");
      document.body.append(pre);
      const box = pre.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        width: Math.min(perRow, characters.length) * 2 * this.cell.width,
        height: rows.length * this.cell.height,
      };
    },
    async takeAtlas(key, pair, characters, data) {
      const image = await decode(data);
      const width = Math.round(this.cell.width * this.scale);
      const height = Math.round(this.cell.height * this.scale);
      const entries = [];
      const perStyle = chunks(characters).length;
      styles.forEach((style, styleIndex) => {
        characters.forEach((character, index) => {
          // A brace inside a tone's braces would close them: the atlas leaves it out.
          if (pair + style && "{}".includes(character)) return;
          const row = styleIndex * perStyle + Math.floor(index / perRow);
          const codes = [...new Set(pair + style)].sort().join("");
          entries.push({
            character,
            codes,
            ...cellPixels(image, (index % perRow) * 2, row, width, height),
          });
        });
      });
      const prints = new Map();
      for (const entry of entries) {
        entry.print = printOf(entry.pixels);
        if (!prints.has(entry.print)) prints.set(entry.print, entry);
      }
      atlases.set(key, { entries, prints });
      document.getElementById("cell-atlas")?.remove();
    },
    // Reads an element's screenshot: the fill and text color pairs it needs atlases
    // for first, then, once they are taken, its cells.
    async load(data, offset) {
      this.offset = offset;
      this.image = await decode(data);
      const width = Math.round(this.cell.width * this.scale);
      const height = Math.round(this.cell.height * this.scale);
      this.columns = Math.round(this.image.width / width);
      this.rows = Math.round(this.image.height / height);
      this.cells = [];
      const needed = new Set();
      for (let row = 0; row < this.rows; row++) {
        for (let column = 0; column < this.columns; column++) {
          const cell = cellPixels(this.image, column, row, width, height);
          cell.pairs = pairsOf(cell.colors);
          cell.print = printOf(cell.pixels);
          delete cell.colors;
          this.cells.push(cell);
          for (const pair of cell.pairs.slice(0, 2))
            if (!atlases.has(this.key(pair))) needed.add(pair);
        }
      }
      return [...needed];
    },
    // The pairs a cell that matched none of its first two still needs.
    pending() {
      const needed = new Set();
      for (const cell of this.cells) {
        if (cell.match !== undefined) continue;
        for (const pair of cell.pairs)
          if (!atlases.has(this.key(pair))) needed.add(pair);
      }
      return [...needed];
    },
    // An atlas is drawn for a fill and text color at a fraction of a pixel.
    key(pair) {
      return `${pair}@${this.offset.x},${this.offset.y}`;
    },
    // `exhaustive` tries every fill and text color; `loose` then lets the
    // outer pixel column on either side differ, for italic letters, which
    // reach into the cells beside them.
    match(exhaustive, loose) {
      const same = (first, second) => this.same(first, second, loose);
      for (const cell of this.cells) {
        if (cell.match !== undefined) continue;
        // Of the readings that draw the same pixels, a blank one, then the one
        // with the fewest codes: an inverted space is a full block, and an
        // inverted upper half block a lower half block.
        const pairs = exhaustive ? cell.pairs : cell.pairs.slice(0, 2);
        let best;
        for (const pair of pairs) {
          const atlas = atlases.get(this.key(pair));
          if (!atlas) continue;
          const printed = loose ? undefined : atlas.prints.get(cell.print);
          const entry =
            printed && same(printed.pixels, cell.pixels)
              ? printed
              : atlas.entries.find((candidate) =>
                  same(candidate.pixels, cell.pixels),
                );
          const rank = (candidate) =>
            (candidate.character === " " ? 0 : 100) + candidate.codes.length;
          if (entry && (!best || rank(entry) < rank(best))) best = entry;
        }
        if (best) cell.match = { character: best.character, codes: best.codes };
        if (loose && cell.match === undefined) cell.match = null;
      }
      return this.cells.every((cell) => cell.match !== undefined);
    },
    // Whether two cells' pixels match; `loose` lets the outer pixel column
    // on either side differ.
    same(first, second, loose) {
      const width = Math.round(this.cell.width * this.scale);
      const edge = loose ? this.scale : 0;
      for (let index = 0; index < first.length; index++) {
        const x = index % width;
        if (x < edge || x >= width - edge) continue;
        if (Math.abs(first[index] - second[index]) >= tone) return false;
      }
      return true;
    },
    // The fill and text color pairs that, with a style, make these codes.
    pairsFor(codes) {
      const pairs = new Set();
      for (const fill of Object.keys(fills)) {
        pairs.add(fills[fill]);
        for (const ink of Object.keys(inks))
          if (fill !== ink) pairs.add(fills[fill] + inks[ink]);
      }
      const sorted = (text) => [...new Set(text)].sort().join("");
      return [...pairs].filter((pair) =>
        styles.some((style) => sorted(pair + style) === codes),
      );
    },
    // Whether each expected cell draws the pixels read there: a reading can
    // tie, as a mid heavy stroke and a foreground bar at 1x, and the text
    // being checked may hold either. Returns the pairs still to draw, or the
    // answers.
    confirm(expected) {
      const needed = new Set();
      const answers = expected.map(({ row, column, character, codes }) => {
        const cell = this.cells[row * this.columns + column];
        if (!cell || row >= this.rows || column >= this.columns) return false;
        return this.pairsFor(codes).some((pair) => {
          const atlas = atlases.get(this.key(pair));
          if (!atlas) {
            needed.add(pair);
            return false;
          }
          const entry = atlas.entries.find(
            (candidate) =>
              candidate.character === character && candidate.codes === codes,
          );
          return Boolean(
            entry &&
            (this.same(entry.pixels, cell.pixels, false) ||
              this.same(entry.pixels, cell.pixels, true)),
          );
        });
      });
      return needed.size ? { needed: [...needed] } : { answers };
    },
    result() {
      const rows = [];
      for (let row = 0; row < this.rows; row++)
        rows.push(
          this.cells
            .slice(row * this.columns, (row + 1) * this.columns)
            .map((cell) => cell.match),
        );
      return rows;
    },
  };
}

// A blank cell's text color, weight and slant draw nothing, so it reads with
// the fewest codes. Between two text cells that share codes it takes theirs, so a
// run of bold or mid words reads as one: `{b|five minutes}`, not
// `{b|five} {b|minutes}`.
const invisible = (codes) => codes.replace(/[mfsbe]/g, "");
// A cell of text, not a stroke or a block: strokes keep runs of their own.
const text = (cell) => cell.character < "\u2500" || cell.character > "\u28ff";
function joinBlanks(row) {
  const out = row.map((cell) => ({ ...cell }));
  for (let start = 0; start < out.length; start++) {
    if (out[start].character !== " " || start === 0) continue;
    let end = start;
    while (
      end < out.length &&
      out[end].character === " " &&
      out[end].codes === out[start].codes
    )
      end++;
    const before = out[start - 1];
    const after = out[end];
    if (
      after &&
      text(before) &&
      text(after) &&
      before.codes === after.codes &&
      before.codes !== out[start].codes &&
      invisible(before.codes) === out[start].codes
    ) {
      for (let index = start; index < end; index++)
        out[index].codes = before.codes;
    }
    start = end - 1;
  }
  return out;
}

/**
 * Readies a page to read cells from: installs the reader and measures the cell.
 * @param {import('playwright-core').Page} tab - a page with the kit and the text renderer.
 * @param {number} scale - the page's device scale factor.
 */
export async function prepare(tab, scale) {
  await tab.evaluate(install, {
    tones: ["background", "faint", "mid", "strong", "foreground"],
    inks: INKS,
    fills: FILLS,
    styles: STYLES,
    tone: TONE,
    perRow: PER_ROW,
  });
  return tab.evaluate((scale) => window.CellReader.measure(scale), scale);
}

/**
 * Sets markup on a stage at a whole pixel of the page, clear of the atlas, in
 * the kit's face (a `ch` in the markup is the cell), so every region read sits
 * on the same pixel grid and one atlas per fill and text color serves them all. Returns the region: the stage's content,
 * rounded out to whole cells, or `columns` by `rows` cells when given.
 * @param {import('playwright-core').Page} tab - a prepared page.
 * @param {string} html - the rendered component, its forced states as classes.
 * @param {{ columns?: number, rows?: number }} [size] - the region's size in cells.
 */
export async function stage(tab, html, size = {}, direction = "ltr") {
  return tab.evaluate(
    ({ html, size, direction }) => {
      let host = document.getElementById("cell-stage");
      if (!host) {
        host = document.createElement("div");
        host.id = "cell-stage";
        host.style.cssText =
          "position: fixed; top: 400px; left: 0; z-index: 5; display: grid; justify-items: start; align-items: start; " +
          "font-family: var(--charcell-font-family); font-size: var(--charcell-font-size); line-height: var(--charcell-row); " +
          "color: var(--charcell-foreground); background: var(--charcell-background)";
        document.body.append(host);
      }
      host.dir = direction;
      host.innerHTML = html;
      const { width, height } = window.CellReader.cell;
      const box = host.firstElementChild.getBoundingClientRect();
      const columns = size.columns ?? Math.ceil(box.width / width - 0.01);
      const rows = size.rows ?? Math.ceil(box.height / height - 0.01);
      return { x: 0, y: 400, width: columns * width, height: rows * height };
    },
    { html, size, direction },
  );
}

/**
 * The characters an atlas holds: printable ascii, the box drawing, blocks and
 * braille the face draws, and the few others the kit uses.
 */
export async function characters(tab) {
  return tab.evaluate(() => {
    const { range, BOX, BLOCKS, EXTRA } = window.CharcellText;
    return [
      ...new Set(
        range(0x20, 0x7e) +
          BOX +
          BLOCKS +
          EXTRA +
          range(0x2800, 0x28ff) +
          "←→↑↓",
      ),
    ];
  });
}

/**
 * Reads the cells of a region of the page into markup lines. A cell nothing
 * matches is `null` in `cells` and a `?` in `lines`.
 * @param {import('playwright-core').Page} tab - a prepared page.
 * @param {{ x: number, y: number, width: number, height: number }} clip - the region, on the cell grid.
 * @param {string[]} atlasCharacters - from `characters`.
 * @param {string[]} [expected] - a text being checked: where the pixels tie, its cells stand.
 * @returns {Promise<{ lines: string[], cells: ({ character: string, codes: string } | null)[][], unread: number }>}
 */
export async function read(tab, clip, atlasCharacters, expected) {
  // The fraction of a pixel the region sits at, in its own scroll position.
  const offset = {
    x: clip.x - Math.floor(clip.x),
    y: clip.y - Math.floor(clip.y),
  };
  const take = async (pairs) => {
    for (const pair of pairs) {
      const box = await tab.evaluate(
        ({ pair, characters, offset }) =>
          window.CellReader.layAtlas(pair, characters, offset),
        {
          pair,
          characters: atlasCharacters,
          offset,
        },
      );
      const shot = await tab.screenshot({ clip: box });
      await tab.evaluate(
        ({ key, pair, characters, data }) =>
          window.CellReader.takeAtlas(key, pair, characters, data),
        {
          key: await tab.evaluate((pair) => window.CellReader.key(pair), pair),
          pair,
          characters: atlasCharacters,
          data: shot.toString("base64"),
        },
      );
    }
  };
  const shot = await tab.screenshot({ clip });
  await take(
    await tab.evaluate(
      ({ data, offset }) => window.CellReader.load(data, offset),
      { data: shot.toString("base64"), offset },
    ),
  );
  if (!(await tab.evaluate(() => window.CellReader.match(false, false)))) {
    await take(await tab.evaluate(() => window.CellReader.pending()));
    if (!(await tab.evaluate(() => window.CellReader.match(true, false))))
      await tab.evaluate(() => window.CellReader.match(true, true));
  }
  const cells = await tab.evaluate(() => window.CellReader.result());
  // Where the reading differs from the text being checked, the text's own
  // cell stands when it draws the same pixels.
  if (expected) {
    const want = expected.map(cellsOf);
    const disputed = [];
    cells.forEach((row, rowIndex) =>
      row.forEach((cell, column) => {
        const other = want[rowIndex]?.[column] ?? { character: " ", codes: "" };
        if (cell?.character !== other.character || cell?.codes !== other.codes)
          disputed.push({ row: rowIndex, column, ...other });
      }),
    );
    if (disputed.length) {
      let outcome = await tab.evaluate(
        (cells) => window.CellReader.confirm(cells),
        disputed,
      );
      if (outcome.needed) {
        await take(outcome.needed);
        outcome = await tab.evaluate(
          (cells) => window.CellReader.confirm(cells),
          disputed,
        );
      }
      disputed.forEach(({ row, column, character, codes }, index) => {
        if (outcome.answers[index]) cells[row][column] = { character, codes };
      });
    }
  }
  const lines = cells.map((row) =>
    markupOf(
      joinBlanks(row.map((cell) => cell ?? { character: "?", codes: "" })),
    ).replace(/ +$/, ""),
  );
  return {
    lines,
    cells,
    unread: cells.flat().filter((cell) => cell === null).length,
  };
}
