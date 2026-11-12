import { defineTemplate } from "@js-template-engine/types";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";
import { displayed } from "../template-helpers/hidden";

/**
 * A tree row. Depth and connectors are the enclosing TreeGroups' concern
 * (structural nesting - see TreeGroup); the row itself is one grid row:
 * `current` inverts it from a cell before its label to its right edge and
 * marks it `aria-current` (the row the tree's navigation is on), hover washes
 * it faint, `root` is the bold section-level variant for top-level entries.
 */
export default defineTemplate({
  type: "component",
  name: "TreeItem",
  description:
    "one row of a tree. the current row is inverted, and a row can be a link.",
  style: stylePreamble,
  extensions: {
    react: {
      imports: ["import type { MouseEventHandler } from 'react'"],
      props: { onClick: { type: "MouseEventHandler<HTMLButtonElement>" } },
    },
  },
  props: {
    /** The row's text; a long one ellipsizes. */
    label: { type: "string" },
    /** A row that navigates: the row is a link to it instead of a button. */
    href: { type: "string" },
    /** The current row: inverted, and `aria-current` (`page` on a link, `location` on a
     *  link into the same page). */
    current: { type: "boolean" },
    /** The bold variant for a top-level entry. */
    root: { type: "boolean" },
    /** Called with the click event. */
    onClick: { type: "(event: MouseEvent) => void" },
  },
  children: [
    {
      type: "element",
      tag: {
        $expression: "href !== undefined ? 'a' : 'button'",
        default: "button",
      },
      passthrough: true,
      // React types the root against its default tag, a button, which has no
      // `href`; there the link's attribute reaches it through a spread instead.
      extensions: {
        bem: { block: "CharcellTreeItem" },
        react: {
          attributes: {
            href: null,
            $spread: {
              $expression:
                "href !== undefined ? ({ href } as Record<string, string>) : {}",
            },
          },
        },
      },
      events: [{ name: "click", handler: "onClick" }],
      conditionalAttributes: [
        {
          condition: "current === true",
          attributes: { class: ["CharcellTreeItem--current"] },
        },
        {
          condition: "root === true",
          attributes: { class: ["CharcellTreeItem--root"] },
        },
      ],
      attributes: {
        href: { $expression: "href" },
        type: { $expression: "href === undefined ? 'button' : undefined" },
        "aria-current": {
          $expression:
            "current ? (href !== undefined ? (href.startsWith('#') ? 'location' : 'page') : 'true') : undefined",
        },
        style: {
          "@include cell": true,
          "@include native-control": true,
          "@include paint($background: false)": true,
          "@include focusable": true,
          "@include tree-branch": true,
          // The fill starts after the indent: the wash and the inversion are
          // the row's, the branch is the tree's, drawn on the ground.
          backgroundImage:
            "linear-gradient(var(--charcell-fill--resolved, transparent), var(--charcell-fill--resolved, transparent))",
          backgroundSize:
            "calc(100% - var(--charcell-tree-item--indent, 0px)) 100%",
          backgroundRepeat: "no-repeat",
          // The indent is at the row's start, on the right of a right-to-left
          // page.
          ...perDirection((direction) => ({
            "&": {
              backgroundPosition:
                direction === "rtl"
                  ? "0 0"
                  : "var(--charcell-tree-item--indent, 0px) 0",
            },
          })),
          ...displayed("block"),
          width: "100%",
          textAlign: "start",
          // In a group the row indents one 3ch step: the branch, the tick and
          // a padding cell. The wash and the inversion start at the padding
          // cell, a cell before the label, and run to the end edge.
          paddingInline:
            "calc(1ch + 2ch * var(--charcell-tree--nested, 0)) 1ch",
          "--charcell-tree-item--indent":
            "calc(2ch * var(--charcell-tree--nested, 0))",
          // A spacious tree's row takes a second row under its label.
          paddingBlockEnd:
            "calc(var(--charcell-row) * (var(--charcell-tree--rows, 1) - 1))",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: "pointer",
          // The current row is an authored modifier: it assigns the slots at rest.
          "&--current": { "@include inverted": true },
          "&--root": {
            fontWeight: "700",
          },
          // States assign over it; hover is guarded against disabled.
          "&:where(:not(:disabled, .CharcellTreeItem--current)):hover": {
            "@include wash": true,
          },
          "&--current:where(:not(:disabled)):hover": {
            "@include inverted(var(--charcell-strong))": true,
          },
          // The focus pointer, in the padding cell before the label: drawn by
          // the label's run, since a row in a group draws its branch with both
          // of its own pseudo-elements.
          "&__content": { position: "relative" },
          "&__content::before": {
            "@include pointer($start: auto, $end: 100%)": true,
          },
          "&:focus-visible > &__content::before": {
            "@include focus-cue": true,
          },
          "&:disabled": { "@include disabled": true },
        },
      },
      children: [
        {
          type: "element",
          tag: "span",
          extensions: { bem: { element: "content" } },
          children: [
            {
              type: "conditional",
              conditions: [
                {
                  statement: "if",
                  condition: "label",
                  children: [{ type: "text", expression: "label" }],
                },
              ],
            },
            /** Content after `label`, or the row's whole content without one. */
            { type: "slot" },
          ],
        },
      ],
    },
  ],
});
