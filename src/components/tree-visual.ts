import { defineTemplate } from "@js-template-engine/types";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";

/**
 * `TreeVisual` - a tree's appearance: the container, a passthrough root the
 * `TreeDriver` attaches its engine to (`charcell/scripts`, `TreeEngine`).
 * A column of TreeItem rows and TreeGroup sections, nested
 * - A group's children live inside it, and depth is structural, not authored.
 * The box-drawing connectors are drawn by TreeGroup with pseudo-element
 * strokes centered in their cells (the kit's center-of-cell rule), derived
 * entirely from nesting: no branch strings, and a group folds by its row's
 * `aria-expanded`. Rows are one grid row tall; `spacious` makes each two,
 * the label in the first, which its rows read (`--charcell-tree--rows`).
 * `disclosure` and `disclosurePosition` choose how a group marks its open
 * state, which its rows read the same way.
 */
export default defineTemplate({
  type: "component",
  name: "TreeVisual",
  description:
    "a tree's look: nested rows joined by drawn lines, groups folding.",
  style: stylePreamble,
  props: {
    /** Each row takes two rows, its label in the first. */
    spacious: { type: "boolean" },
    /** How a group marks its open state: `brackets`, `[–]` and `[+]`, or `triangle`, `▾` and `▸`. */
    disclosure: { type: "'brackets' | 'triangle'", default: "brackets" },
    /** Where a group's mark sits: at the row's `end`, a cell in from its edge; right after the `label`; or at the `start`, before the label. */
    disclosurePosition: {
      type: "'end' | 'label' | 'start'",
      default: "end",
    },
    /** Marks a root whose driver is running, which the driver sets once it mounts and the server never renders; while it is unset on a page whose scripts failed to load, every folded group shows its rows. */
    scripted: { type: "boolean" },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellTree" } },
      conditionalAttributes: [
        {
          condition: "spacious === true",
          attributes: { class: ["CharcellTree--spacious"] },
        },
        {
          condition: "disclosure === 'triangle'",
          attributes: { class: ["CharcellTree--disclosure-triangle"] },
        },
        {
          condition: "disclosurePosition === 'label'",
          attributes: { class: ["CharcellTree--disclosure-label"] },
        },
        {
          condition: "disclosurePosition === 'start'",
          attributes: { class: ["CharcellTree--disclosure-start"] },
        },
        {
          condition: "scripted === true",
          attributes: { class: ["CharcellTree--scripted"] },
        },
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          // Its own rows are the top level: no connector, no indent, even in
          // a tree laid inside another's group.
          "--charcell-tree--nested": "0",
          // With no script to open them, its folded groups' rows could never
          // show, so they show (`--charcell-tree--folded`, which its groups
          // read): with scripting off, or on a page whose scripts failed to
          // load for a root its driver never marked. A marked root's groups
          // fold, and so do those of any tree inside it.
          "@media (scripting: none)": {
            "&": { "--charcell-tree--folded": "block" },
          },
          ':where(html[data-charcell-scripts="failed"]) &:where(:not(.CharcellTree--scripted))':
            { "--charcell-tree--folded": "block" },
          "&--scripted": { "--charcell-tree--folded": "none" },
          // The rows each row takes, stated on every tree, so a tree laid
          // inside a spacious one's group keeps its own.
          ...oneOf(["--spacious"], {
            none: { "--charcell-tree--rows": "1" },
            "--spacious": { "--charcell-tree--rows": "2" },
          }),
          // How its groups mark their open state and where, stated on every
          // tree for the same reason. The values are set through custom
          // properties, whose value Sass keeps as written (a literal non-ascii
          // character would lead the sheet with a byte-order mark, ahead of
          // the layer order); the mark's alternative text is empty, since it
          // repeats what `aria-expanded` already exposes.
          ...oneOf(["--disclosure-triangle"], {
            none: {
              "--charcell-tree--open-glyph": '"[\\2013]" / ""',
              "--charcell-tree--closed-glyph": '"[+]" / ""',
            },
            "--disclosure-triangle": {
              "--charcell-tree--open-glyph": '"\\25BE" / ""',
            },
          }),
          // Closed, a triangle points the way the row reads.
          ...perDirection((direction) => ({
            "&--disclosure-triangle": {
              "--charcell-tree--closed-glyph":
                direction === "rtl" ? '"\\25C2" / ""' : '"\\25B8" / ""',
            },
          })),
          ...oneOf(["--disclosure-label", "--disclosure-start"], {
            none: {
              "--charcell-tree--glyph-order": "0",
              "--charcell-tree--glyph-shift": "auto",
              "--charcell-tree--glyph-before": "1ch",
              "--charcell-tree--glyph-after": "0",
            },
            "--disclosure-label": {
              "--charcell-tree--glyph-order": "0",
              "--charcell-tree--glyph-shift": "0",
              "--charcell-tree--glyph-before": "1ch",
              "--charcell-tree--glyph-after": "0",
            },
            "--disclosure-start": {
              "--charcell-tree--glyph-order": "-1",
              "--charcell-tree--glyph-shift": "0",
              "--charcell-tree--glyph-before": "0",
              "--charcell-tree--glyph-after": "1ch",
            },
          }),
        },
      },
      children: [{ type: "slot" }],
    },
  ],
});
