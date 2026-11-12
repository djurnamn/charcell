import { defineTemplate } from "@js-template-engine/types";
import { fillClass, fillProp, fillStyles } from "../template-helpers/fill";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";
import { displayed } from "../template-helpers/hidden";

/**
 * `SplitGridVisual` - a grid's appearance: the root, the grid inside it, its
 * cells and the handles between them. A passthrough root (the compound
 * spreads the rows' split onto it), holding the grid element, which takes
 * `gridProps` (the columns' split, and the tracks as
 * `--charcell-split-grid--columns` and `--charcell-split-grid--rows`).
 *
 * A panel takes a cell; between two columns a handle a column wide runs
 * down every row, and between two rows one a row tall runs across every
 * column, so where they cross both pass through the same cell. Each handle
 * carries a grip in every pane it passes, at its middle: `⠿` down a column,
 * `⠶⠶` across a row, `mid` at rest. On approach a handle fills its whole
 * length as the Splitter's does: hover `faint` (the grips at `strong`), drag
 * and keyboard focus `mid` (the grips at the foreground).
 *
 * `rule` draws each handle as a `faint` line through its cells, stopping
 * either side of each grip, the two lines crossing as `┼`. `join` runs the
 * lines' ends (`start`, `end` or `both`) on past the grid to meet the lines
 * beyond it: laid directly in a `Frame`'s body, the frame's ring at its tone
 * (`┬ ┴ ├ ┤`), anywhere else the line in the next cell, the reach and the
 * tone the `--charcell-join-*` properties `Separator` reads.
 *
 * `rowGrips: one` draws one grip on a row's handle instead of one in each
 * pane, at its middle and clear of the column handles crossing it, the line
 * running on either side. A row's handle can carry content at its start and end around the
 * grip (`SplitGridHandleRow`): a heading for the row below, its controls.
 */
export default defineTemplate({
  type: "component",
  name: "SplitGridVisual",
  description:
    "a grid's look: its panes in columns and rows, and the handles between them.",
  style: stylePreamble,
  props: {
    /** The grid element's props: the columns' split, and the tracks. */
    gridProps: { type: "Record<string, unknown>" },
    /** Draws the handles as lines through their cells, a grip in each pane. */
    rule: { type: "boolean" },
    /** Runs ruled handles' ends on past the grid to meet the lines beyond:
     *  a frame's ring when the grid sits directly in its body, or else the
     *  line in the next cell (`┬ ┴ ├ ┤`). */
    join: { type: "'start' | 'end' | 'both'" },
    /** A row's handle's grips: `each`, one in every pane it passes; `one`, one at its middle. */
    rowGrips: { type: "'each' | 'one'", default: "each" },
    /** Takes the container's box: grows in a flex or grid layout, and takes the full height of a block that has one. */
    fill: fillProp,
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellSplitGrid" } },
      conditionalAttributes: [
        fillClass("CharcellSplitGrid"),
        {
          condition: "rowGrips === 'one'",
          attributes: { class: ["CharcellSplitGrid--one-row-grip"] },
        },
        {
          condition: "rule === true",
          attributes: { class: ["CharcellSplitGrid--rule"] },
        },
        {
          condition: "join !== undefined",
          attributes: { class: ["CharcellSplitGrid--joined"] },
        },
        {
          condition: "join === 'start' || join === 'both'",
          attributes: { class: ["CharcellSplitGrid--join-start"] },
        },
        {
          condition: "join === 'end' || join === 'both'",
          attributes: { class: ["CharcellSplitGrid--join-end"] },
        },
      ],
      attributes: {
        style: {
          // The handles are a `ch` wide and a row tall, so the block states
          // the face they are measured in.
          "@include cell": true,
          "@include paint": true,
          ...displayed("flex"),
          // Joined, the lines take the tone of what they meet, and reach past
          // the grid to it: a column's handles above and below, a row's either
          // side.
          ...oneOf(["--joined"], {
            none: { "--charcell-split-grid--tone": "var(--charcell-faint)" },
            "--joined": {
              "--charcell-split-grid--tone":
                "var(--charcell-join-tone, var(--charcell-faint))",
            },
          }),
          ...oneOf(["--join-start"], {
            none: { "--charcell-split-grid--reach-top": "0px" },
            "--join-start": {
              "--charcell-split-grid--reach-top":
                "var(--charcell-join-top, calc(var(--charcell-row) - var(--charcell-stroke-y)))",
            },
          }),
          ...oneOf(["--join-end"], {
            none: { "--charcell-split-grid--reach-bottom": "0px" },
            "--join-end": {
              "--charcell-split-grid--reach-bottom":
                "var(--charcell-join-bottom, calc(var(--charcell-stroke-y) + 1px))",
            },
          }),
          // Across, the start is the left end, or the right one on a
          // right-to-left page; the reach is physical, as the stroke's pixel is.
          ...perDirection((direction) => {
            const reach = {
              left: "var(--charcell-join-left, calc(1ch - var(--charcell-stroke-x)))",
              right:
                "var(--charcell-join-right, calc(var(--charcell-stroke-x) + 1px))",
            };
            const start = direction === "rtl" ? "right" : "left";
            const end = direction === "rtl" ? "left" : "right";
            return {
              ...oneOf(["--join-start"], {
                none: { "--charcell-split-grid--reach-start": "0px" },
                "--join-start": {
                  "--charcell-split-grid--reach-start": reach[start],
                },
              }),
              ...oneOf(["--join-end"], {
                none: { "--charcell-split-grid--reach-end": "0px" },
                "--join-end": {
                  "--charcell-split-grid--reach-end": reach[end],
                },
              }),
            };
          }),
          width: "100%",
          ...fillStyles(),
          "&__grid": {
            display: "grid",
            flexGrow: "1",
            flexShrink: "1",
            flexBasis: "0",
            gridTemplateColumns: "var(--charcell-split-grid--columns)",
            gridTemplateRows: "var(--charcell-split-grid--rows)",
          },
          // A cell clips its content a cell out, so a joined line in it
          // reaches the handle beside it.
          "&__cell": {
            ...displayed("flex"),
            overflow: "clip",
            overflowClipMargin: "1ch",
          },
          "&__handle": {
            // A button takes the browser's own font; the grips are placed in
            // the cell's units, so the handle states the cell.
            "@include cell": true,
            "@include native-control": true,
            "@include paint": true,
            position: "relative",
            display: "grid",
            // The handle has no text for the focus pointer: its cue is the
            // filled length, the same fill a drag shows.
            outline: "none",
            // Where two handles cross, the pointer is on the one on top;
            // the driver marks the other (`--crossed`), lit the same.
            "&:hover, &--crossed": {
              "--charcell-fill--resolved": "var(--charcell-faint)",
              "--charcell-split-grid--grip": "var(--charcell-strong)",
              "--charcell-split-grid--line": "var(--charcell-faint)",
              "--charcell-split-grid--ground": "var(--charcell-faint)",
            },
            // Pressing a crossing presses both handles: the one on top is
            // `:active`, the one the driver marked climbs with it.
            "&:active, &:focus-visible, .CharcellSplitGrid__grid:has(> &:active) > &--crossed":
              {
                "--charcell-fill--resolved": "var(--charcell-mid)",
                "--charcell-split-grid--grip": "var(--charcell-foreground)",
                "--charcell-split-grid--line": "var(--charcell-mid)",
                "--charcell-split-grid--ground": "var(--charcell-mid)",
              },
            // Its spans and crossings take the tracks it runs across in turn,
            // on the grid's own lines; the grip sits on its span's middle row
            // (column, across), snapped to the grid, and a ruled handle's line
            // runs either side of it and straight through a crossing.
            ...oneOf(["--row"], {
              none: {
                gridTemplateRows: "subgrid",
                gridAutoFlow: "row",
                cursor: "col-resize",
                "--charcell-split-grid--grip-top":
                  "round(down, calc(50% - var(--charcell-row) / 2), var(--charcell-row))",
                "& > .CharcellSplitGrid__span > .CharcellSplitGrid__grip": {
                  "@include grip(var(--charcell-split-grid--grip, var(--charcell-mid)))": true,
                  left: "0",
                  width: "1ch",
                },
                "& > .CharcellSplitGrid__span::before, & > .CharcellSplitGrid__span::after, & > .CharcellSplitGrid__crossing::before":
                  {
                    left: "var(--charcell-stroke-x)",
                    width: "1px",
                  },
                // The first span leads in from past the grid's top, the last
                // trails out past its bottom; the reach keeps the joined tone
                // while the handle's own cells take the fill's.
                "& > .CharcellSplitGrid__span:first-child": {
                  "--charcell-split-grid--lead":
                    "var(--charcell-split-grid--reach-top)",
                },
                "& > .CharcellSplitGrid__span:last-child": {
                  "--charcell-split-grid--trail":
                    "var(--charcell-split-grid--reach-bottom)",
                },
                "& > .CharcellSplitGrid__span::before": {
                  top: "calc(-1 * var(--charcell-split-grid--lead, 0px))",
                  height:
                    "calc(var(--charcell-split-grid--grip-top) + var(--charcell-split-grid--lead, 0px))",
                  background:
                    "linear-gradient(to bottom, var(--charcell-split-grid--tone) var(--charcell-split-grid--lead, 0px), var(--charcell-split-grid--line, var(--charcell-split-grid--tone)) var(--charcell-split-grid--lead, 0px))",
                },
                "& > .CharcellSplitGrid__span::after": {
                  top: "calc(var(--charcell-split-grid--grip-top) + var(--charcell-row))",
                  bottom: "calc(-1 * var(--charcell-split-grid--trail, 0px))",
                  background:
                    "linear-gradient(to top, var(--charcell-split-grid--tone) var(--charcell-split-grid--trail, 0px), var(--charcell-split-grid--line, var(--charcell-split-grid--tone)) var(--charcell-split-grid--trail, 0px))",
                },
                "& > .CharcellSplitGrid__crossing::before": {
                  top: "0",
                  bottom: "0",
                },
              },
              "--row": {
                gridTemplateColumns: "subgrid",
                gridAutoFlow: "column",
                cursor: "row-resize",
                "--charcell-split-grid--grip-left":
                  "round(down, calc(50% - 1ch), 1ch)",
                "& > .CharcellSplitGrid__span > .CharcellSplitGrid__grip": {
                  "@include grip(var(--charcell-split-grid--grip, var(--charcell-mid)), $rows: (1, 2), $cells: 2)": true,
                  insetInlineStart: "var(--charcell-split-grid--grip-left)",
                  width: "2ch",
                },
                "& > .CharcellSplitGrid__span::before, & > .CharcellSplitGrid__span::after, & > .CharcellSplitGrid__crossing::before":
                  {
                    top: "var(--charcell-stroke-y)",
                    height: "1px",
                  },
                "& > .CharcellSplitGrid__span:first-child": {
                  "--charcell-split-grid--lead":
                    "var(--charcell-split-grid--reach-start)",
                },
                // A row's handle ends in its one grip, after the last span.
                "& > .CharcellSplitGrid__span:nth-last-child(2)": {
                  "--charcell-split-grid--trail":
                    "var(--charcell-split-grid--reach-end)",
                },
                "& > .CharcellSplitGrid__span::before": {
                  insetInlineStart:
                    "calc(-1 * var(--charcell-split-grid--lead, 0px))",
                  width:
                    "calc(var(--charcell-split-grid--grip-left) + var(--charcell-split-grid--lead, 0px))",
                },
                "& > .CharcellSplitGrid__span::after": {
                  insetInlineStart:
                    "calc(var(--charcell-split-grid--grip-left) + var(--charcell-split-grid--gap, 2ch))",
                  insetInlineEnd:
                    "calc(-1 * var(--charcell-split-grid--trail, 0px))",
                },
                "& > .CharcellSplitGrid__crossing::before": {
                  left: "0",
                  right: "0",
                },
                "& > .CharcellSplitGrid__center-grip": {
                  "@include grip(var(--charcell-split-grid--grip, var(--charcell-mid)), var(--charcell-split-grid--ground, var(--charcell-background)), $rows: (1, 2), $cells: 2)": true,
                  top: "0",
                  insetInlineStart:
                    "var(--charcell-split-grid--grip-at, round(down, calc(50% - 1ch), 1ch))",
                  width: "2ch",
                },
              },
            }),
            // A row's handle runs from the start to the end, which are the
            // right and the left on a right-to-left page: each half takes the
            // joined tone over its reach at its outer end.
            ...perDirection((direction) => {
              const toward = direction === "rtl" ? "left" : "right";
              const back = direction === "rtl" ? "right" : "left";
              return {
                "&--row > .CharcellSplitGrid__span::before": {
                  background: `linear-gradient(to ${toward}, var(--charcell-split-grid--tone) var(--charcell-split-grid--lead, 0px), var(--charcell-split-grid--line, var(--charcell-split-grid--tone)) var(--charcell-split-grid--lead, 0px))`,
                },
                "&--row > .CharcellSplitGrid__span::after": {
                  background: `linear-gradient(to ${back}, var(--charcell-split-grid--tone) var(--charcell-split-grid--trail, 0px), var(--charcell-split-grid--line, var(--charcell-split-grid--tone)) var(--charcell-split-grid--trail, 0px))`,
                },
              };
            }),
          },
          "&__span, &__crossing": {
            position: "relative",
          },
          "&__grip": {
            position: "absolute",
            top: "var(--charcell-split-grid--grip-top, 0px)",
            height: "var(--charcell-row)",
            pointerEvents: "none",
          },
          // `rowGrips: one`: a row's handle's one grip, at its middle clear
          // of the column handles crossing it (the driver places it; the
          // stylesheet centers it until then), on the handle's ground so the
          // line stops either side of it; the spans close the gaps their own
          // grips left.
          "&__center-grip": {
            position: "absolute",
            height: "var(--charcell-row)",
            pointerEvents: "none",
          },
          ...oneOf(["--one-row-grip"], {
            none: {
              "&__grid > &__handle > &__center-grip": { display: "none" },
            },
            "--one-row-grip": {
              "&__grid > &__handle > &__center-grip": { display: "block" },
              "&__grid > &__handle--row > &__span > &__grip": {
                display: "none",
              },
              "&__grid > &__handle--row > &__span": {
                "--charcell-split-grid--grip-left": "100%",
                "--charcell-split-grid--gap": "0px",
              },
            },
          }),
          // The row over a row's handle (`SplitGridHandleRow`): its slots at
          // the start and end, over the handle and the handles crossing it,
          // so the rest of the row drags. A slot takes the pointer; the row
          // between lets it through. A slot sits a cell in from the row's end,
          // as a pane's text does; ruled, it stops the
          // line a cell either side of it, on the ground the handle shows.
          "&__handle-row": {
            zIndex: "1",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pointerEvents: "none",
          },
          "&__handle:hover + &__handle-row, &__handle--crossed + &__handle-row":
            {
              "--charcell-split-grid--row-ground": "var(--charcell-faint)",
            },
          "&__handle:active + &__handle-row, &__handle:focus-visible + &__handle-row, &__grid:has(> &__handle:active) > &__handle--crossed + &__handle-row":
            {
              "--charcell-split-grid--row-ground": "var(--charcell-mid)",
            },
          "&__handle-start, &__handle-end": {
            alignItems: "center",
            padding: "0 1ch",
            whiteSpace: "nowrap",
            pointerEvents: "auto",
            background: "var(--charcell-split-grid--row-ground, transparent)",
          },
          "&__handle-start:where(:not(:empty)), &__handle-end:where(:not(:empty))":
            { display: "flex" },
          "&__handle-start:empty, &__handle-end:empty": { display: "none" },
          "&__handle-end": { marginInlineStart: "auto" },
          "&--rule": {
            "--charcell-split-grid--row-ground": "var(--charcell-background)",
          },

          "&--rule > &__grid > &__handle > &__span::before, &--rule > &__grid > &__handle > &__span::after, &--rule > &__grid > &__handle > &__crossing::before":
            {
              content: '""',
              position: "absolute",
              pointerEvents: "none",
            },
          "&__handle > &__crossing::before": {
            background:
              "var(--charcell-split-grid--line, var(--charcell-split-grid--tone))",
          },
        },
      },
      children: [
        {
          type: "element",
          tag: "div",
          extensions: { bem: { element: "grid" } },
          attributes: {
            $spread: { $expression: "gridProps ?? {}" },
          },
          children: [{ type: "slot" }],
        },
      ],
    },
  ],
});
