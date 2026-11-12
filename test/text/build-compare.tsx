// Writes `test/text/compare.html`: every case in `cases.cjs` beside the
// charcell component it describes, rendered from the built React target
// (`pnpm build` first; `pnpm text:build` bundles and runs this). The
// kit's full stylesheet is inlined with its interaction states forced
// (`force-states.mjs`: `.force-hover` stands in for `:hover`, and so on), so a
// static page can show them.
// The rendered side of each case is `elements.tsx`'s, shared with the site.
// It also writes `test/text/scenarios.json`: every component's scenarios in
// every state (`scenarios.tsx`), for the snapshot check to read.
import { withForcedStates } from "./force-states.mjs";
import { caseMarkup } from "./elements";
import { scenarioViews } from "./scenarios";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

// Run from the repository root (`pnpm text:build`), bundled by
// esbuild so the rendered React target gets the automatic jsx runtime.
const here = resolve("test/text");
const { CASES } = createRequire(resolve(here, "build-compare.tsx"))(
  "./cases.cjs",
) as {
  CASES: Record<string, [string, string[]]>;
};

const full = readFileSync(
  resolve(here, "../../dist/charcell.full.css"),
  "utf8",
);
const css = withForcedStates(full).replaceAll(
  'url("./fonts/',
  'url("../../dist/fonts/',
);
const cases = caseMarkup(CASES);
const template = readFileSync(resolve(here, "compare.template.html"), "utf8");
const page = template
  .replace("/* charcell.full.css */", () => css)
  .replace("/* cells.css */", () =>
    readFileSync(resolve(here, "cells.css"), "utf8"),
  )
  .replace("/* cases */", () => `const MARKUP = ${JSON.stringify(cases)};`);
writeFileSync(resolve(here, "compare.html"), page);
const views = scenarioViews(full);
writeFileSync(
  resolve(here, "scenarios.json"),
  JSON.stringify(views, null, 2) + "\n",
);
console.log(
  `compare.html: ${Object.keys(cases).length} cases; scenarios.json: ${Object.values(views).flat().length} views`,
);
