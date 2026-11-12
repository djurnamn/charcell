// Scores compare.html cell by cell: for every case, the rendered component
// and its text version are screenshotted at the text's size and compared in
// the character cells they share. A pixel matches when the other image has a
// pixel within `--tone` of its tone within `--tolerance` px of it; a cell fails
// when more than `--cell` of its pixels do not match. The tone defaults to 12,
// close enough that dark mode's faint never passes for the ground; the other
// two default to 0: with
// the kit's own face on its whole-pixel cell, every case is pixel-identical
// to its text. Prints the failing cells per case, writes
// `test/text/report.json`, and exits 1 when any case fails.
//
//   pnpm text:check [--font "jetbrains mono"] [--mode light]
//     [--scale 1] [--case table] [--cell 0.06] [--tolerance 1.5] [--tone 12]
//     [--report-only]
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const options = {
  font: "charcell",
  mode: "dark",
  scale: 2,
  case: undefined,
  cell: 0,
  tolerance: 0,
  tone: 12,
  reportOnly: false,
};
const argv = process.argv.slice(2);
for (let index = 0; index < argv.length; index++) {
  const flag = argv[index];
  if (flag === "--report-only") options.reportOnly = true;
  else if (flag.startsWith("--")) options[flag.slice(2)] = argv[++index];
}
options.cell = Number(options.cell);
options.tolerance = Number(options.tolerance);
options.scale = Number(options.scale);
options.tone = Number(options.tone);

const scale = options.scale;
const page = resolve("test/text/compare.html");
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1800, height: 1200 },
  deviceScaleFactor: scale,
});
const tab = await context.newPage();
await tab.goto(
  `${pathToFileURL(page)}?view=side&font=${encodeURIComponent(options.font)}&mode=${options.mode}`,
);
await tab.evaluate(() => window.compareReady);

const cell = await tab.evaluate(() => {
  const text = document.querySelector(".case__text");
  const probe = document.createElement("span");
  probe.textContent = "0".repeat(100);
  text.append(probe);
  const width = probe.getBoundingClientRect().width / 100;
  probe.remove();
  return { width, height: parseFloat(getComputedStyle(text).lineHeight) };
});

// The typed arcs, `╭ ╮ ╯ ╰`, in the face's own case: the font draws their
// curve as an outline and the text as a gradient, which antialias the same
// curve a few tones apart. Their cells match within `CURVE_TONE`; every other
// cell, and every arc a component draws, matches exactly.
const CURVES = "╭╮╯╰";
const CURVE_TONE = 48;

const ids = await tab.evaluate(() =>
  [...document.querySelectorAll(".case")].map((figure) => figure.dataset.case),
);
const report = { font: options.font, mode: options.mode, cell, cases: {} };
let failing = 0;

for (const id of ids.filter((each) => !options.case || each === options.case)) {
  const figure = tab.locator(`.case[data-case="${id}"]`);
  await figure.scrollIntoViewIfNeeded();
  const boxes = await figure.evaluate((element) => {
    const rect = (selector) =>
      element.querySelector(selector).getBoundingClientRect();
    const text = rect(".case__text");
    const css = rect(".case__css");
    return {
      text: { x: text.x, y: text.y, width: text.width, height: text.height },
      css: { x: css.x, y: css.y },
    };
  });
  const clip = (x, y) => ({
    x,
    y,
    width: boxes.text.width,
    height: boxes.text.height,
  });
  const curves =
    id === "glyphs"
      ? await figure.evaluate(
          (element, curves) =>
            element
              .querySelector(".case__text")
              .textContent.split("\n")
              .flatMap((line, row) =>
                [...line].flatMap((character, column) =>
                  curves.includes(character) ? [`${column},${row}`] : [],
                ),
              ),
          CURVES,
        )
      : [];
  const [css, text] = await Promise.all([
    tab.screenshot({ clip: clip(boxes.css.x, boxes.css.y) }),
    tab.screenshot({ clip: clip(boxes.text.x, boxes.text.y) }),
  ]);
  const result = await tab.evaluate(
    async ({
      css,
      text,
      cell,
      scale,
      tolerance,
      threshold,
      toneMargin,
      curves,
      curveTone,
    }) => {
      const pixels = async (data) => {
        const image = new Image();
        image.src = "data:image/png;base64," + data;
        await image.decode();
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
      };
      const [rendered, written] = await Promise.all([
        pixels(css),
        pixels(text),
      ]);
      const width = Math.min(rendered.width, written.width);
      const height = Math.min(rendered.height, written.height);
      const tone = (image, x, y) => {
        const index = (y * image.width + x) * 4;
        return (
          0.2126 * image.data[index] +
          0.7152 * image.data[index + 1] +
          0.0722 * image.data[index + 2]
        );
      };
      const reach = Math.round(tolerance * scale);
      const curveCells = new Set(curves);
      const near = (image, x, y, value, margin) => {
        for (let dy = -reach; dy <= reach; dy++) {
          for (let dx = -reach; dx <= reach; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (Math.abs(tone(image, nx, ny) - value) < margin) return true;
          }
        }
        return false;
      };
      const columns = Math.round(width / (cell.width * scale));
      const rows = Math.round(height / (cell.height * scale));
      const misses = Array.from({ length: rows }, () =>
        new Array(columns).fill(0),
      );
      const totals = Array.from({ length: rows }, () =>
        new Array(columns).fill(0),
      );
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const column = Math.min(
            columns - 1,
            Math.floor(x / (cell.width * scale)),
          );
          const row = Math.min(rows - 1, Math.floor(y / (cell.height * scale)));
          totals[row][column]++;
          const margin = curveCells.has(`${column},${row}`)
            ? curveTone
            : toneMargin;
          if (
            !near(written, x, y, tone(rendered, x, y), margin) ||
            !near(rendered, x, y, tone(written, x, y), margin)
          )
            misses[row][column]++;
        }
      }
      const cells = [];
      let worst = 0;
      misses.forEach((line, row) =>
        line.forEach((count, column) => {
          const score = count / totals[row][column];
          worst = Math.max(worst, score);
          if (score > threshold)
            cells.push({ column, row, score: Math.round(score * 1000) / 1000 });
        }),
      );
      return { columns, rows, worst: Math.round(worst * 1000) / 1000, cells };
    },
    {
      css: css.toString("base64"),
      text: text.toString("base64"),
      cell,
      scale,
      tolerance: options.tolerance,
      threshold: options.cell,
      toneMargin: options.tone,
      curves,
      curveTone: CURVE_TONE,
    },
  );
  report.cases[id] = result;
  const status = result.cells.length ? "FAIL" : "ok  ";
  if (result.cells.length) failing++;
  const where = result.cells
    .slice(0, 8)
    .map(({ column, row, score }) => `${column},${row} (${score})`)
    .join("  ");
  console.log(
    `${status} ${id.padEnd(22)} ${String(result.cells.length).padStart(3)} of ${result.columns * result.rows} cells off, worst ${result.worst}${where ? "  " + where : ""}`,
  );
}

await browser.close();
mkdirSync(resolve("test/text"), { recursive: true });
writeFileSync(
  resolve("test/text/report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `\n${failing} of ${Object.keys(report.cases).length} cases off (font ${options.font}, cell ${cell.width.toFixed(2)}x${cell.height.toFixed(2)}px). Report: test/text/report.json`,
);
process.exit(failing && !options.reportOnly ? 1 : 0);
