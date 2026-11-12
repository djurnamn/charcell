// Reads every case's rendered component back into text and compares it with
// the case's own text version, cell by cell: the proof that the reader writes
// what a person would. Prints the cases that differ and the cells, and writes
// `test/text/read-report.json`. `--print` prints each case's reading instead,
// as cases.cjs writes text.
//
//   node test/text/read-check.mjs [--case table] [--scale 2] [--mode light] [--print]
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { cellsOf, differences } from "./markup.mjs";
import { characters, prepare, read, stage } from "./read.mjs";

const options = { scale: 2, case: undefined, mode: "dark", print: false };
const argv = process.argv.slice(2);
for (let index = 0; index < argv.length; index++) {
  if (argv[index] === "--print") options.print = true;
  else options[argv[index].slice(2)] = argv[++index];
}
const scale = Number(options.scale);
const { CASES } = createRequire(import.meta.url)("./cases.cjs");

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1800, height: 1200 },
  deviceScaleFactor: scale,
});
const tab = await context.newPage();
await tab.goto(
  `${pathToFileURL(resolve("test/text/compare.html"))}?view=side&font=charcell&mode=${options.mode}`,
);
await tab.evaluate(() => window.compareReady);
await prepare(tab, scale);
const atlas = await characters(tab);

let differing = 0;
const report = {};
for (const id of Object.keys(CASES).filter(
  (each) => !options.case || each === options.case,
)) {
  const text = CASES[id][1];
  const columns = Math.max(...text.map((line) => cellsOf(line).length));
  const html = await tab.evaluate(
    (id) =>
      document.querySelector(`.case[data-case="${id}"] .case__css`).innerHTML,
    id,
  );
  const clip = await stage(tab, html, { columns, rows: text.length });
  const { lines, unread } = await read(tab, clip, atlas);
  if (options.print) {
    console.log(
      `'${id}': [\n${lines.map((line) => `  ${JSON.stringify(line)},`).join("\n")}\n],`,
    );
    continue;
  }
  const off = differences(lines, CASES[id][1]);
  report[id] = { unread, cells: off };
  if (off.length || unread) {
    differing++;
    console.log(`DIFF ${id}: ${off.length} cells, ${unread} unread`);
    for (const cell of off.slice(0, 6))
      console.log(
        `     ${cell.column},${cell.row}  read ${JSON.stringify(cell.first)}  text ${JSON.stringify(cell.second)}`,
      );
  } else console.log(`ok   ${id}`);
}
await browser.close();
if (!options.print) {
  writeFileSync(
    resolve("test/text/read-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(`\n${differing} of ${Object.keys(report).length} cases differ`);
}
