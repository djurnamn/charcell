import { defineTemplate } from "@js-template-engine/types";
import { fillClass, fillProp, fillStyles } from "../template-helpers/fill";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";
import { displayed } from "../template-helpers/hidden";

/**
 * `SplitterVisual` - the split layout's appearance: the flex root, the panel
 * boxes, and the resize handle. A passthrough root (the compound spreads Zag's
 * `getRootProps()` onto it); the compound tags its panel/handle children with
 * this block's element classes, so every stroke and state lives here.
 *
 * The handle is one full 1ch column (a row, split vertically) carrying the
 * grip, `⠿`, in its middle cell, `mid` at rest: the kit's sign of something to
 * drag. On approach the column fills: hover `faint` (the grip at `strong`, two
 * steps above it), drag and keyboard focus `mid` (the grip at the
 * foreground). Stacked, the grip is `⠶⠶`, two cells of the middle dots,
 * which reads along the row the handle drags.
 *
 * `rule` draws the handle's column (or row, stacked) as a line through its
 * cells' center pixels, stopping either side of the grip's cells, `faint` at
 * rest; on approach the column fills as before. `join` runs the line's ends
 * (`start`, `end` or `both`) on past the split to meet the line beyond:
 * laid directly in a `Frame`'s body, the frame's ring at its tone, anywhere
 * else the line in the next cell (`┬ ┴`, `├ ┤`), the reach and the tone the
 * `--charcell-join-*` properties `Separator` reads.
 */
export default defineTemplate({
  type: "component",
  name: "SplitterVisual",
  description:
    "a split's look: its panes side by side or stacked, and the handles between them.",
  style: stylePreamble,
  props: {
    /** `horizontal` lays the panels side by side; `vertical` stacks them. */
    orientation: { type: "'horizontal' | 'vertical'", default: "horizontal" },
    /** Takes the container's box: grows in a flex or grid layout, and takes the full height of a block that has one. */
    fill: fillProp,
    /** Draws the handle as a line through its cells, the grip in its middle. */
    rule: { type: "boolean" },
    /** Runs a ruled handle's ends on to meet the line beyond: a frame's ring
     *  when the split sits directly in its body, or else the line in the
     *  next cell (`┬ ┴`, `├ ┤`). */
    join: { type: "'start' | 'end' | 'both'" },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellSplitter" } },
      conditionalAttributes: [
        {
          condition: "orientation === 'vertical'",
          attributes: { class: ["CharcellSplitter--vertical"] },
        },
        fillClass("CharcellSplitter"),
        {
          condition: "rule === true",
          attributes: { class: ["CharcellSplitter--rule"] },
        },
        {
          condition: "join !== undefined",
          attributes: { class: ["CharcellSplitter--joined"] },
        },
        {
          condition: "join === 'start' || join === 'both'",
          attributes: { class: ["CharcellSplitter--join-start"] },
        },
        {
          condition: "join === 'end' || join === 'both'",
          attributes: { class: ["CharcellSplitter--join-end"] },
        },
      ],
      attributes: {
        style: {
          // The handle is one `ch` wide, so the block states the face it is
          // measured in.
          "@include cell": true,
          "@include paint": true,
          ...displayed("flex"),
          alignItems: "stretch",
          width: "100%",
          ...fillStyles(),
          // A panel clips its content a cell out, so a joined line in it
          // reaches the handle beside it, and the root clips nothing, so a
          // ruled handle's joined ends reach the lines past the split.
          "&__panel": {
            ...displayed("flex"),
            overflow: "clip",
            overflowClipMargin: "1ch",
          },
          "&__handle": {
            // A button takes the browser's own font; the grip is placed in the
            // cell's units, so the handle states the cell.
            "@include cell": true,
            "@include native-control": true,
            "@include paint": true,
            position: "relative",
            flex: "0 0 auto",
            // The handle has no text for the focus pointer: its cue is the
            // filled column, the same fill a drag shows.
            outline: "none",
            // A ruled handle's line takes the fill's tone with it, so the
            // filled column reads as one.
            "&:hover": {
              "--charcell-fill--resolved": "var(--charcell-faint)",
              "--charcell-splitter--grip": "var(--charcell-strong)",
              "--charcell-splitter--line": "var(--charcell-faint)",
            },
            "&:active, &:focus-visible": {
              "--charcell-fill--resolved": "var(--charcell-mid)",
              "--charcell-splitter--grip": "var(--charcell-foreground)",
              "--charcell-splitter--line": "var(--charcell-mid)",
            },
          },
          // The grip, on the handle's middle row (column, split vertically),
          // snapped to the grid.
          "&__grip": {
            position: "absolute",
            height: "var(--charcell-row)",
            pointerEvents: "none",
          },
          // Content on a handle's row (`SplitterHandleRow`), laid right after
          // the handle and over it, taking no room of its own: its slots at
          // the start and end (the top and bottom, side by side), so the rest
          // of the row drags. A slot sits a cell in from the end, as a pane's
          // text does, and takes the pointer; the row between lets it
          // through. Ruled, a slot stops the line a cell either side of it,
          // on the ground the handle shows: the page's at rest, its fill on
          // approach.
          "&__handle-row": {
            zIndex: "1",
            display: "flex",
            alignItems: "center",
            flexShrink: "0",
            pointerEvents: "none",
          },
          "&__handle:hover + &__handle-row": {
            "--charcell-splitter--row-ground": "var(--charcell-faint)",
          },
          "&__handle:active + &__handle-row, &__handle:focus-visible + &__handle-row":
            {
              "--charcell-splitter--row-ground": "var(--charcell-mid)",
            },
          "&__handle-start, &__handle-end": {
            alignItems: "center",
            padding: "0 1ch",
            whiteSpace: "nowrap",
            pointerEvents: "auto",
            background: "var(--charcell-splitter--row-ground, transparent)",
          },
          "&__handle-start:where(:not(:empty)), &__handle-end:where(:not(:empty))":
            { display: "flex" },
          "&__handle-start:empty, &__handle-end:empty": { display: "none" },
          "&__handle-end": { marginInlineStart: "auto" },
          "&--rule": {
            "--charcell-splitter--row-ground": "var(--charcell-background)",
          },
          // A ruled handle's line, in two lengths either side of the grip's
          // cells: from the start (less the reach) to the grip, and from the
          // grip to the end (plus it). The length in the handle's own cells
          // takes the fill's tone on approach; the reach past them keeps the
          // tone of the line it meets, a junction being one glyph at one tone.
          "&--rule > &__handle::before, &--rule > &__handle::after": {
            content: '""',
            position: "absolute",
            pointerEvents: "none",
          },
          // Joined, the line takes the tone of what it meets.
          ...oneOf(["--joined"], {
            none: { "--charcell-splitter--tone": "var(--charcell-faint)" },
            "--joined": {
              "--charcell-splitter--tone":
                "var(--charcell-join-tone, var(--charcell-faint))",
            },
          }),
          ...oneOf(["--join-start"], {
            none: { "--charcell-splitter--reach-start": "0px" },
            "--join-start": {
              "--charcell-splitter--reach-start":
                "var(--charcell-splitter--to-start)",
            },
          }),
          ...oneOf(["--join-end"], {
            none: { "--charcell-splitter--reach-end": "0px" },
            "--join-end": {
              "--charcell-splitter--reach-end":
                "var(--charcell-splitter--to-end)",
            },
          }),
          ...oneOf(["--vertical"], {
            none: {
              flexDirection: "row",
              // A joined end's reach: to the ring's line above and below, or
              // the next row's center.
              "--charcell-splitter--to-start":
                "var(--charcell-join-top, calc(var(--charcell-row) - var(--charcell-stroke-y)))",
              "--charcell-splitter--to-end":
                "var(--charcell-join-bottom, calc(var(--charcell-stroke-y) + 1px))",
              "--charcell-splitter--grip-at":
                "round(down, calc(50% - var(--charcell-row) / 2), var(--charcell-row))",
              "&__handle": { width: "1ch", cursor: "col-resize" },
              // Side by side, the row is the handle's column.
              "&__handle + &__handle-row": {
                flexDirection: "column",
                width: "1ch",
                marginInlineStart: "-1ch",
              },
              "&__handle > &__grip": {
                "@include grip(var(--charcell-splitter--grip, var(--charcell-mid)))": true,
                left: "0",
                top: "var(--charcell-splitter--grip-at)",
                width: "1ch",
              },
              "&__handle::before, &__handle::after": {
                left: "var(--charcell-stroke-x)",
                width: "1px",
              },
              "&__handle::before": {
                background:
                  "linear-gradient(to bottom, var(--charcell-splitter--tone) var(--charcell-splitter--reach-start), var(--charcell-splitter--line, var(--charcell-splitter--tone)) var(--charcell-splitter--reach-start))",
                top: "calc(-1 * var(--charcell-splitter--reach-start))",
                height:
                  "calc(var(--charcell-splitter--reach-start) + var(--charcell-splitter--grip-at))",
              },
              "&__handle::after": {
                background:
                  "linear-gradient(to top, var(--charcell-splitter--tone) var(--charcell-splitter--reach-end), var(--charcell-splitter--line, var(--charcell-splitter--tone)) var(--charcell-splitter--reach-end))",
                top: "calc(var(--charcell-splitter--grip-at) + var(--charcell-row))",
                bottom: "calc(-1 * var(--charcell-splitter--reach-end))",
              },
            },
            "--vertical": {
              flexDirection: "column",
              "--charcell-splitter--grip-at":
                "round(down, calc(50% - 1ch), 1ch)",
              "&__handle": {
                width: "auto",
                height: "var(--charcell-row)",
                cursor: "row-resize",
              },
              "&__handle + &__handle-row": {
                flexDirection: "row",
                height: "var(--charcell-row)",
                marginTop: "calc(-1 * var(--charcell-row))",
              },
              "&__handle > &__grip": {
                "@include grip(var(--charcell-splitter--grip, var(--charcell-mid)), $rows: (1, 2), $cells: 2)": true,
                top: "0",
                insetInlineStart: "var(--charcell-splitter--grip-at)",
                width: "2ch",
              },
              "&__handle::before, &__handle::after": {
                top: "var(--charcell-stroke-y)",
                height: "1px",
              },
              "&__handle::before": {
                insetInlineStart:
                  "calc(-1 * var(--charcell-splitter--reach-start))",
                width:
                  "calc(var(--charcell-splitter--reach-start) + var(--charcell-splitter--grip-at))",
              },
              "&__handle::after": {
                insetInlineStart:
                  "calc(var(--charcell-splitter--grip-at) + 2ch)",
                insetInlineEnd:
                  "calc(-1 * var(--charcell-splitter--reach-end))",
              },
            },
          }),
          // Stacked, the handle's line runs from the start to the end, which
          // are the right and the left on a right-to-left page: each half
          // takes the joined tone over its reach at its outer end, and the
          // reaches are physical, as the stroke's pixel is.
          ...perDirection((direction) => {
            const toward = direction === "rtl" ? "left" : "right";
            const back = direction === "rtl" ? "right" : "left";
            const reach = {
              left: "var(--charcell-join-left, calc(1ch - var(--charcell-stroke-x)))",
              right:
                "var(--charcell-join-right, calc(var(--charcell-stroke-x) + 1px))",
            };
            return {
              "&--vertical": {
                "--charcell-splitter--to-start": reach[back],
                "--charcell-splitter--to-end": reach[toward],
              },
              "&--vertical > &__handle::before": {
                background: `linear-gradient(to ${toward}, var(--charcell-splitter--tone) var(--charcell-splitter--reach-start), var(--charcell-splitter--line, var(--charcell-splitter--tone)) var(--charcell-splitter--reach-start))`,
              },
              "&--vertical > &__handle::after": {
                background: `linear-gradient(to ${back}, var(--charcell-splitter--tone) var(--charcell-splitter--reach-end), var(--charcell-splitter--line, var(--charcell-splitter--tone)) var(--charcell-splitter--reach-end))`,
              },
            };
          }),
        },
      },
      children: [{ type: "slot" }],
    },
  ],
});
