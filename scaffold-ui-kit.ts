// charcell's kit configuration, read by `scaffold-ui-kit build`.
import { defineKit } from "scaffold-ui-kit";

export default defineKit({
  name: "charcell",
  targets: ["react", "vue", "svelte", "html"],
  styling: ["bem"],
  stylesheetPlacement: "separate-file",
  stylesheetLink: "both",
  stylingLanguage: "scss",
  loadPaths: ["src"],
  // charcell's cascade layers, declared here only: the scaffolder writes the
  // order statement as a module beside every emitted sheet, and the entries
  // load the same module (`charcell/styles/layer-order`), so each artifact
  // states it once, first. Layer order is fixed by first declaration, so it
  // reaches the browser before any charcell rule, whichever entry a consumer
  // takes and however their bundler concatenates.
  //
  //   Reset      the element reset, opt-in through the preflight. The weakest
  //              layer, so it can be as aggressive as it likes without a
  //              component ever having to out-specify it.
  //   Base       the tokens, the `@font-face` rules, the mode blocks and the
  //              page canvas.
  //   Components every component rule.
  //   Overrides  ships empty: the consumer's opening, and `revert-layer`'s
  //              target. A consumer's copied stylesheet moves its rules here,
  //              so the copy wins over the package's own sheet for the
  //              component.
  //
  // Unlayered CSS beats every layer, so a consumer's own stylesheet still wins
  // by default. A consumer who wants charcell below their own layers restates
  // the order with charcell first: `@layer charcell, base, components, utilities;`
  stylingLayer: {
    name: "charcell.components",
    order: [
      "charcell.reset",
      "charcell.base",
      "charcell.components",
      "charcell.overrides",
    ],
    owned: "charcell.overrides",
  },
  bem: { mode: "runtime" },
  svelte: { mode: "runes" },
  add: {
    // Every piece a consumer leaves in the package is imported from it,
    // through `exports`.
    ownership: "partial",
    shared: [
      // Only the script modules the copied components import, and theirs.
      { source: "src/scripts", copy: "reached", exclude: ["index.ts"] },
      { source: "src/styles", exclude: ["index.scss", "full.scss"] },
    ],
  },
});
