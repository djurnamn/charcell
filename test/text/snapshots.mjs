// Reads every component scenario, in every state, back into text
// (`scenarios.json`, from `pnpm text:build`) and holds it to its snapshot in
// `test/text/snapshots/<Component>.txt`. A cell no character-cell screen
// could print reads as `?` and always fails. A scenario whose reading
// differs prints the rows that differ, and `--accept` writes the readings as
// the new snapshots, to be reviewed in the diff like any other change.
//
//   node test/text/snapshots.mjs [--component Button] [--mode light] [--scale 1]
//     [--direction rtl] [--accept] [--report-only]
//
// Under `--direction rtl` each scenario renders on a right-to-left page and is
// held to its snapshot mirrored (`mirrored` in markup.mjs), so right to left
// has no snapshots of its own to accept. It compares the drawing alone
// (`drawingOf`): the browser lays out each element's text on its own.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import {
  differences,
  drawingOf,
  formatSnapshots,
  mirrored,
  parseSnapshots,
} from "./markup.mjs";
import { characters, prepare, read, stage } from "./read.mjs";

const options = {
  component: undefined,
  mode: "dark",
  scale: 2,
  direction: "ltr",
  accept: false,
  reportOnly: false,
};
const argv = process.argv.slice(2);
for (let index = 0; index < argv.length; index++) {
  if (argv[index] === "--accept") options.accept = true;
  else if (argv[index] === "--report-only") options.reportOnly = true;
  else options[argv[index].slice(2)] = argv[++index];
}
const scale = Number(options.scale);
const rightToLeft = options.direction === "rtl";
// A scenario writes the marks `attachingToTrigger` sets at run time, as it
// sets them on a left-to-right page (src/scenarios/window-border.ts); on a
// right-to-left page it sets the same on the other side, and stops the
// window's line short of the trigger (`until`) where it would start past it.
// A scenario renders its machines left to right, and each driver passes the
// direction it is given on to its machine, which writes it on its parts.
const markedRightToLeft = (markup) =>
  markup
    .replace(
      /--charcell-ring--(top|bottom)-(left|right)-/g,
      (_, row, side) =>
        `--charcell-ring--${row}-${side === "left" ? "right" : "left"}-`,
    )
    .replace(
      /--charcell-ring--(top|bottom)-from:/g,
      "--charcell-ring--$1-until:",
    )
    // A machine writes the direction it is given on the parts it renders.
    .replace(/\bdir="ltr"/g, 'dir="rtl"');
if (rightToLeft && options.accept)
  throw new Error(
    "right to left is held to the mirrored snapshots; accept left to right",
  );
const here = resolve("test/text");
const folder = resolve(here, "snapshots");

const views = JSON.parse(readFileSync(resolve(here, "scenarios.json"), "utf8"));
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1800, height: 1200 },
  deviceScaleFactor: scale,
});
const tab = await context.newPage();
await tab.goto(
  `${pathToFileURL(resolve(here, "compare.html"))}?view=side&font=charcell&mode=${options.mode}`,
);
await tab.evaluate(() => window.compareReady);
await prepare(tab, scale);
const atlas = await characters(tab);
const atlasCell = await tab.evaluate(() => window.CellReader.cell);

const report = {
  mode: options.mode,
  scale,
  direction: options.direction,
  components: {},
};
let failing = 0;
// Reads left to right on every page, so there is no mirror image to hold it to.
const READS_LEFT_TO_RIGHT = new Set(["CodeBlock"]);
for (const [name, list] of Object.entries(views)) {
  if (options.component && name !== options.component) continue;
  if (rightToLeft && READS_LEFT_TO_RIGHT.has(name)) continue;
  const path = resolve(folder, `${name}.txt`);
  const stored = existsSync(path)
    ? parseSnapshots(readFileSync(path, "utf8"))
    : {};
  const readings = {};
  const results = {};
  for (const view of list) {
    const clip = await stage(
      tab,
      rightToLeft ? markedRightToLeft(view.markup) : view.markup,
      {},
      options.direction,
    );
    // A scenario that renders nothing has nothing to read, and fails.
    const empty = clip.width === 0 || clip.height === 0;
    const columns = Math.round(clip.width / atlasCell.width);
    const expected =
      rightToLeft && stored[view.key]
        ? mirrored(stored[view.key], columns)
        : stored[view.key];
    const { lines, unread } = empty
      ? { lines: [], unread: 1 }
      : await read(tab, clip, atlas, options.accept ? undefined : expected);
    readings[view.key] = lines;
    const off = !expected
      ? []
      : rightToLeft
        ? differences(drawingOf(lines), drawingOf(expected))
        : differences(lines, expected);
    const rows = [...new Set(off.map((cell) => cell.row))];
    results[view.key] = { unread, missing: !expected, rows };
    if (unread || !expected || off.length) {
      if (!options.accept || unread) failing++;
      const why = [
        empty && "renders nothing",
        !empty && unread && `${unread} cells unread`,
        !expected && "no snapshot",
        off.length && `${off.length} cells differ`,
      ]
        .filter(Boolean)
        .join(", ");
      console.log(
        `${options.accept && !unread ? "NEW " : "FAIL"} ${name} ${view.key}: ${why}`,
      );
      for (const row of rows) {
        console.log(`  - ${expected[row] ?? ""}`);
        console.log(`  + ${lines[row] ?? ""}`);
      }
      if (!expected || unread)
        for (const line of lines) console.log(`    ${line}`);
    } else console.log(`ok   ${name} ${view.key}`);
  }
  // A snapshot no scenario reads any more goes with the next accept.
  const stale = Object.keys(stored).filter((key) => !(key in readings));
  for (const key of stale) {
    console.log(
      `${options.accept ? "DROP" : "FAIL"} ${name} ${key}: no such scenario or state`,
    );
    if (!options.accept) failing++;
    results[key] = { stale: true };
  }
  report.components[name] = results;
  if (options.accept) {
    mkdirSync(folder, { recursive: true });
    writeFileSync(path, formatSnapshots(readings));
  }
}
await browser.close();
writeFileSync(
  resolve(
    here,
    rightToLeft ? "snapshot-report-rtl.json" : "snapshot-report.json",
  ),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `\n${failing} failing (${options.mode}, ${scale}x, ${options.direction})${options.accept ? "; snapshots written" : ""}`,
);
process.exit(failing && !options.reportOnly ? 1 : 0);
