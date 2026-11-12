import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStylesMeeting,
} from "../template-helpers/border";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";

// A cell's alignment, one modifier per column (start when it has none),
// nested in the cell so `&` is the cell itself.
const align = oneOf(["--center", "--end"], {
  none: { textAlign: "start" },
  "--center": { textAlign: "center" },
  "--end": { textAlign: "end" },
});

const alignClasses = (element: string) => [
  {
    condition: "column.align === 'center'",
    attributes: { class: [`CharcellTable__${element}--center`] },
  },
  {
    condition: "column.align === 'end'",
    attributes: { class: [`CharcellTable__${element}--end`] },
  },
];

const types = [
  'interface TableColumn { key: string; label: string; align?: "start" | "center" | "end" }',
  "type TableRow = Record<string, string | number | boolean | null | undefined>",
];

/**
 * `Table` - rows of data in columns: `columns`
 * (`key`, `label`, `align`) over `rows` (records keyed by those keys), each
 * cell the row's value as text. The monospace face lines the columns up the
 * way a terminal's do; `align: 'end'` suits numbers, so their digits line up.
 *
 * `boxed` (the default) is the box-drawn table: the full-cell ring around it
 * (its sides styled by `border`), the header labels at `mid` over a rule row, and
 * `separators` choosing which inner strokes run - `both` (the
 * default), `rows`, `columns` or `none`. A row stroke takes its own row under
 * each record; a column stroke takes a 1ch column between two cells. Every
 * one runs on to meet the ring and the others, the ├ ┬ ┼ ┤ ┴ junctions, so
 * they all take the ring's `mid`: a junction cell is one glyph at one tone. `dense` is the bare listing: no
 * ring, no inner strokes, columns 2ch apart, the header rule alone.
 *
 * Each cell draws its own strokes - its row stroke on its `::before`, its
 * column stroke on its `::after` - from custom properties the table's
 * modifiers set, so the table never styles a cell from outside. `hideHeader`
 * keeps the header for assistive technology only.
 *
 * The `<table>` sits in a `ScrollArea`: wider than its container, it scrolls
 * sideways a whole cell at a time, table semantics intact, over a scrollbar
 * drawn in cells. The area is a tab stop only while it scrolls, its thumb
 * climbing to the foreground while it has keyboard focus; a `caption` names it.
 */
export default defineTemplate({
  type: "component",
  name: "Table",
  description: "rows and columns, with lines between them where you want them.",
  style: stylePreamble,
  rest: { tag: "div" },
  extensions: {
    react: {
      imports: [
        "import { ScrollArea } from './ScrollArea';",
        ...types.map((type) => `export ${type};`),
      ],
    },
    vue: {
      imports: [
        "import ScrollArea from './ScrollArea.vue';",
        ...types.map((type) => `export ${type};`),
      ],
    },
    svelte: {
      imports: [
        "import ScrollArea from './ScrollArea.svelte';",
        ...types.map((type) => `export ${type};`),
      ],
    },
  },
  props: {
    /** The columns, in order: `{ key, label, align }`; `align: 'end'` suits numbers. */
    columns: { type: "TableColumn[]", required: true },
    /** The records, each cell the value under its column's `key`, printed
     *  as text (an empty cell for `null` or `undefined`). */
    rows: { type: "TableRow[]", required: true },
    /** Names the table for assistive technology, as its `<caption>`, and
     *  its scroll area, a region; the page shows it no more than
     *  the header it keeps with `hideHeader`. */
    caption: { type: "string" },
    /** Keeps the header for assistive technology only. */
    hideHeader: { type: "boolean" },
    /** `boxed` draws the ring and the inner strokes; `dense` is the bare listing, columns 2ch
     *  apart. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** Which inner strokes a boxed table draws. */
    separators: {
      type: "'both' | 'rows' | 'columns' | 'none'",
      default: "both",
    },
    /** The style of every side of a boxed table's ring: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of a boxed table's ring's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of a boxed table's ring's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of a boxed table's ring's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of a boxed table's ring's end side, over `borderX` and `border`. */
    borderEnd: borderProp,
    /** The style of a boxed table's ring's bottom side, over `borderY` and `border`. */
    borderBottom: borderProp,
    /** The style of a boxed table's ring's start side, over `borderX` and `border`. */
    borderStart: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "ScrollArea",
      attributes: {
        $spread: { $expression: "rest" },
        orientation: "horizontal",
        overscroll: "none",
        label: { $expression: "caption" },
      },
      children: [
        {
          type: "element",
          tag: "div",
          extensions: { bem: { block: "CharcellTable" } },
          conditionalAttributes: [
            ...borderClasses("CharcellTable"),
            {
              condition: "hideHeader",
              attributes: { class: ["CharcellTable--headless"] },
            },
            {
              condition: "variant === 'dense'",
              attributes: { class: ["CharcellTable--dense"] },
            },
            {
              condition:
                "variant !== 'dense' && separators !== 'columns' && separators !== 'none'",
              attributes: { class: ["CharcellTable--row-lines"] },
            },
            {
              condition:
                "variant !== 'dense' && separators !== 'rows' && separators !== 'none'",
              attributes: { class: ["CharcellTable--column-lines"] },
            },
          ],
          attributes: {
            style: {
              "@include cell": true,
              "@include paint": true,
              "&__table": {
                position: "relative",
                isolation: "isolate",
                borderCollapse: "separate",
                borderSpacing: "0",
              },
              // Boxed, the ring takes a full cell around the table.
              ...oneOf(["--dense"], {
                // Boxed, the inner strokes meet the ring, and a junction cell holds
                // one mark at one tone: they take the ring's. Dense, nothing
                // meets the header rule, a separator at `faint`.
                none: {
                  "&__table": {
                    padding: "var(--charcell-row) 1ch",
                    "--charcell-table--tone": "var(--charcell-mid)",
                  },
                  "&__table::before": {
                    "@include ring($stroke: var(--charcell-table--tone))": true,
                  },
                },
                "--dense": {
                  "&__table": {
                    "--charcell-table--tone": "var(--charcell-faint)",
                  },
                },
              }),
              // Each side's style on the table's ring, and a heavy or double side's
              // inner line, where the inner strokes meet it.
              ...borderStylesMeeting(
                "--charcell-table--inner",
                undefined,
                "& > .CharcellTable__table::before",
              ),
              "&__cell, &__heading": {
                position: "relative",
                paddingBlock: "0 var(--charcell-table--below, 0px)",
                paddingInline: "1ch var(--charcell-table--end, 1ch)",
                whiteSpace: "nowrap",
                verticalAlign: "top",
              },
              "&__cell": { ...align },
              // The header: the labels on the first row, the rule centered in the
              // second.
              "&__heading": {
                fontWeight: "400",
                color: "var(--charcell-mid)",
                "--charcell-table--below": "var(--charcell-row)",
                "--charcell-table--rule": "1px",
                ...align,
              },
              // A cell's row stroke, centered in the row under it.
              "&__cell::before, &__heading::before": {
                content: '""',
                position: "absolute",
                top: "calc(100% - var(--charcell-row) + var(--charcell-stroke-y))",
                insetInlineStart: "var(--charcell-table--reach-start, 0px)",
                insetInlineEnd: "var(--charcell-table--reach-end, 0px)",
                borderTop:
                  "var(--charcell-table--rule, 0px) solid var(--charcell-table--tone)",
                pointerEvents: "none",
              },
              // A cell's column stroke, centered in the 1ch column after it: on
              // the stroke's pixel of that column, which is on the cell's left on
              // a right-to-left page.
              "&__cell::after, &__heading::after": {
                content: '""',
                position: "absolute",
                top: "var(--charcell-table--rise, 0px)",
                bottom: "var(--charcell-table--drop, 0px)",
                borderLeft:
                  "var(--charcell-table--column-rule, 0px) solid var(--charcell-table--tone)",
                pointerEvents: "none",
              },
              ...perDirection((direction) => ({
                "&__cell::after, &__heading::after":
                  direction === "rtl"
                    ? { left: "var(--charcell-stroke-x)" }
                    : { right: "calc(1ch - var(--charcell-stroke-x) - 1px)" },
              })),
              // Boxed, the outer cells' row strokes run on to the ring (├ ┤) - on
              // a heavy or double side, to its inner line (┠ ╟).
              // The left reach and the right one are physical, as the ring's
              // inner lines are; the first cell is on the right of a
              // right-to-left page.
              ...perDirection((direction) => {
                const left =
                  "calc(var(--charcell-stroke-x) + var(--charcell-table--inner-left, 0px) - 1ch)";
                const right =
                  "calc(-1 * var(--charcell-table--inner-right, 0px) - var(--charcell-stroke-x) - 1px)";
                return {
                  "&:where(:not(.CharcellTable--dense)) > &__table > :is(.CharcellTable__head, .CharcellTable__body) > tr > :is(.CharcellTable__cell, .CharcellTable__heading):first-child":
                    {
                      "--charcell-table--reach-start":
                        direction === "rtl" ? right : left,
                    },
                  "&:where(:not(.CharcellTable--dense)) > &__table > :is(.CharcellTable__head, .CharcellTable__body) > tr > :is(.CharcellTable__cell, .CharcellTable__heading):last-child":
                    {
                      "--charcell-table--reach-end":
                        direction === "rtl" ? left : right,
                    },
                };
              }),
              "&--row-lines > &__table > &__body > tr:not(:last-child) > &__cell":
                {
                  "--charcell-table--below": "var(--charcell-row)",
                  "--charcell-table--rule": "1px",
                },
              "&--column-lines > &__table > :is(.CharcellTable__head, .CharcellTable__body) > tr > :is(.CharcellTable__cell, .CharcellTable__heading):not(:last-child)":
                {
                  "--charcell-table--end": "2ch",
                  "--charcell-table--column-rule": "1px",
                },
              // The column strokes run on to the ring above and below (┬ ┴).
              "&--column-lines > &__table > &__head > tr > &__heading": {
                "--charcell-table--rise":
                  "calc(var(--charcell-stroke-y) + var(--charcell-table--inner-top, 0px) - var(--charcell-row))",
              },
              "&--column-lines > &__table > &__body > tr:last-child > &__cell":
                {
                  "--charcell-table--drop":
                    "calc(-1 * var(--charcell-table--inner-bottom, 0px) - var(--charcell-stroke-y) - 1px)",
                },
              "&--column-lines.CharcellTable--headless > &__table > &__body > tr:first-child > &__cell":
                {
                  "--charcell-table--rise":
                    "calc(var(--charcell-stroke-y) + var(--charcell-table--inner-top, 0px) - var(--charcell-row))",
                },
              // Headless, the header row stays for assistive technology only.
              ...oneOf(["--headless"], {
                "--headless": {
                  "&__table > &__head": { "@include visually-hidden": true },
                },
              }),
              "&__caption": { "@include visually-hidden": true },
            },
          },
          children: [
            {
              type: "element",
              tag: "table",
              extensions: { bem: { element: "table" } },
              children: [
                {
                  type: "conditional",
                  conditions: [
                    {
                      statement: "if",
                      condition: "caption",
                      children: [
                        {
                          type: "element",
                          tag: "caption",
                          extensions: { bem: { element: "caption" } },
                          children: [{ type: "text", expression: "caption" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "element",
                  tag: "thead",
                  extensions: { bem: { element: "head" } },
                  children: [
                    {
                      type: "element",
                      tag: "tr",
                      extensions: { bem: { element: "row" } },
                      children: [
                        {
                          type: "iteration",
                          items: "columns",
                          item: "column",
                          key: "column.key",
                          children: [
                            {
                              type: "element",
                              tag: "th",
                              extensions: { bem: { element: "heading" } },
                              attributes: {
                                scope: "col",
                              },
                              conditionalAttributes: alignClasses("heading"),
                              children: [
                                { type: "text", expression: "column.label" },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "element",
                  tag: "tbody",
                  extensions: { bem: { element: "body" } },
                  children: [
                    {
                      type: "iteration",
                      items: "rows",
                      item: "row",
                      index: "rowIndex",
                      key: "rowIndex",
                      children: [
                        {
                          type: "element",
                          tag: "tr",
                          extensions: { bem: { element: "row" } },
                          children: [
                            {
                              type: "iteration",
                              items: "columns",
                              item: "column",
                              key: "column.key",
                              children: [
                                {
                                  type: "element",
                                  tag: "td",
                                  extensions: { bem: { element: "cell" } },
                                  conditionalAttributes: alignClasses("cell"),
                                  children: [
                                    {
                                      type: "text",
                                      expression:
                                        "String(row[column.key] ?? '')",
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
