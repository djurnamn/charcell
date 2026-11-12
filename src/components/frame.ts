import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStylesMeeting,
} from "../template-helpers/border";
import { fillClass, fillProp, fillStyles } from "../template-helpers/fill";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";

/**
 * A titled pane - the terminal window, drawn box-drawing style. The frame
 * reserves a full-cell ring (one row vertically, 1ch horizontally) and the 1px
 * stroke runs through the ring's center, so content starts one whole cell
 * inside - the `┌─┐` layout, in CSS. The title sits in the ring's top row,
 * on the stroke, where a box-drawing title would (it punches the line out with the background;
 * add your own `■`/glyph flourish in the title text if you want one).
 *
 * The stroke rides the tone ladder: `mid` at rest, `foreground` when `active`
 * (the focused pane earns the only bright frame on screen). `border` and its
 * narrower props style the ring's sides as box drawing does: `single`,
 * `rounded`, `heavy`, `double` or `none`, a double right and bottom raising
 * the pane the way box drawing raises a window. `flush` removes the body's
 * extra side padding for edge-to-edge content, and `fill` sizes the frame by
 * its container, its body taking the height the title leaves. The body's
 * gutter is a cell each side, and `--charcell-frame--gutter` on the frame
 * sets another.
 *
 * A line laid directly in the body can join the ring: a `Separator` or a
 * Splitter's ruled handle with `join` runs its ends on through the gutter to
 * the ring's inner line, at the ring's tone (`├ ┤ ┬ ┴`, `┠ ╟` on a heavy or
 * double side).
 *
 * `quiet` is a frame that groups rather than bounds - a ring nested inside
 * another ring, or the outermost ring around a whole screen: the stroke sits
 * at `faint` and the title at `mid`, so a level never outshines what it
 * groups. `active` still wins with the foreground stroke. The `legend` slot
 * sits in the straddling title beside `title`, and `legendEnd` at the far end
 * of the same row with the stroke running on between them, for controls that belong to the
 * frame (a toggle, a count), one cell apart.
 */
export default defineTemplate({
  type: "component",
  name: "Frame",
  description:
    "a titled box around a pane. the active frame is the only one drawn in white.",
  style: stylePreamble,
  props: {
    /** The text in the ring's top row, set on the stroke. */
    title: { type: "string" },
    /** The focused pane: the stroke climbs to the foreground. */
    active: { type: "boolean" },
    /** The style of every side of the ring: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the ring's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the ring's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the ring's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the ring's end side, over `borderX` and `border`. */
    borderEnd: borderProp,
    /** The style of the ring's bottom side, over `borderY` and `border`. */
    borderBottom: borderProp,
    /** The style of the ring's start side, over `borderX` and `border`. */
    borderStart: borderProp,
    /** Drops the body's side padding, for edge-to-edge content. */
    flush: { type: "boolean" },
    /** Takes the container's box: grows in a flex or grid layout, and takes the full height of a block that has one. */
    fill: fillProp,
    /** A frame that groups rather than bounds: the stroke at `faint`, the title at `mid`. */
    quiet: { type: "boolean" },
    /** The root element: a frame that is not a landmark
     *  region, such as a node in an editor tree, is a `div` or an `li`. */
    as: {
      type: "'section' | 'div' | 'li' | 'article' | 'aside'",
      default: "section",
    },
  },
  children: [
    {
      type: "element",
      tag: {
        $expression: "as !== undefined ? as : 'section'",
        default: "section",
      },
      passthrough: true,
      extensions: { bem: { block: "CharcellFrame" } },
      conditionalAttributes: [
        {
          condition: "active === true",
          attributes: { class: ["CharcellFrame--active"] },
        },
        ...borderClasses("CharcellFrame"),
        {
          condition: "flush === true",
          attributes: { class: ["CharcellFrame--flush"] },
        },
        fillClass("CharcellFrame"),
        {
          condition: "quiet === true",
          attributes: { class: ["CharcellFrame--quiet"] },
        },
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint($fill: var(--charcell-background))": true,
          position: "relative",
          // The ring sits under the content, inside the frame's own stacking.
          isolation: "isolate",
          ...displayed("flex"),
          flexDirection: "column",
          // The full-cell ring; the ::before centers the stroke in it.
          padding: "var(--charcell-row) 1ch",
          // The body's space each side, inside the ring: every frame states
          // its own, so a frame's gutter never reaches a frame inside it.
          "--charcell-frame--gutter": "1ch",
          ...fillStyles(),
          "&::before": { "@include ring": true },
          ...borderStylesMeeting("--charcell-frame--inner"),
          // A line joining the ring takes its tone.
          ...oneOf(["--quiet", "--active"], {
            none: {
              "&__body > *": { "--charcell-join-tone": "var(--charcell-mid)" },
            },
            "--quiet": {
              "&::before": {
                "--charcell-stroke--resolved": "var(--charcell-faint)",
              },
              "&__body > *": {
                "--charcell-join-tone": "var(--charcell-faint)",
              },
            },
            "--active": {
              "&__body > *": {
                "--charcell-join-tone": "var(--charcell-foreground)",
              },
              "&::before": {
                "--charcell-stroke--resolved": "var(--charcell-foreground)",
                // The focused pane is the one bright frame; under forced-colors
                // every stroke is the same system tone, so it takes the
                // system's highlight instead.
                "@media (forced-colors: active)": {
                  "--charcell-stroke--resolved": "Highlight",
                },
              },
            },
          }),
          // The ring's top row, in flow: pulled up one row into the padding,
          // a row tall, so its text is centered on the stroke by the row
          // itself (text on a row, never half-row centering) and the frame is
          // at least as wide as what it holds. The title sits at its start and
          // `legendEnd` at its end, the stroke running on between them, the
          // background of each punching the stroke out behind it. The end
          // holds controls, whose own padding is the cell at each side.
          "&__header": {
            display: "flex",
            height: "var(--charcell-row)",
            marginTop: "calc(var(--charcell-row) * -1)",
            marginInline: "1ch",
            position: "relative",
            whiteSpace: "nowrap",
          },
          "&__title": {
            display: "flex",
            alignItems: "center",
            gap: "1ch",
            flex: "0 1 auto",
            padding: "0 1ch",
            background: "var(--charcell-background)",
          },
          "&__end": {
            display: "flex",
            alignItems: "center",
            flex: "0 1 auto",
            marginInlineStart: "auto",
            background: "var(--charcell-background)",
            overflow: "hidden",
          },
          "&__label": {
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
          ...oneOf(["--quiet"], {
            none: { "&__header": { color: "var(--charcell-foreground)" } },
            "--quiet": { "&__header": { color: "var(--charcell-mid)" } },
          }),
          "&__body": {
            flex: "1",
            padding: "0 var(--charcell-frame--edge)",
          },
          ...oneOf(["--flush"], {
            none: {
              "&__body": {
                "--charcell-frame--edge": "var(--charcell-frame--gutter)",
              },
            },
            "--flush": { "&__body": { "--charcell-frame--edge": "0px" } },
          }),
          // How far a line laid in the body runs past its own box to meet the
          // ring's inner line: through the side's padding and the ring's
          // cell to its stroke.
          "&__body > *": {
            "--charcell-join-top":
              "calc(var(--charcell-row) - var(--charcell-stroke-y) - var(--charcell-frame--inner-top, 0px))",
            "--charcell-join-right":
              "calc(var(--charcell-frame--edge) + var(--charcell-stroke-x) + var(--charcell-frame--inner-right, 0px) + 1px)",
            "--charcell-join-bottom":
              "calc(var(--charcell-stroke-y) + var(--charcell-frame--inner-bottom, 0px) + 1px)",
            "--charcell-join-left":
              "calc(1ch + var(--charcell-frame--edge) - var(--charcell-stroke-x) - var(--charcell-frame--inner-left, 0px))",
          },
        },
      },
      children: [
        {
          type: "conditional",
          conditions: [
            {
              statement: "if",
              condition: "title || legend || legendEnd",
              children: [
                {
                  type: "element",
                  tag: "header",
                  extensions: { bem: { element: "header" } },
                  children: [
                    {
                      type: "conditional",
                      conditions: [
                        {
                          statement: "if",
                          condition: "title || legend",
                          children: [
                            {
                              type: "element",
                              tag: "div",
                              extensions: { bem: { element: "title" } },
                              children: [
                                {
                                  type: "conditional",
                                  conditions: [
                                    {
                                      statement: "if",
                                      condition: "title",
                                      children: [
                                        {
                                          type: "element",
                                          tag: "span",
                                          extensions: {
                                            bem: { element: "label" },
                                          },
                                          children: [
                                            {
                                              type: "text",
                                              expression: "title",
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                  ],
                                },
                                /** Controls that belong to the frame, such as a toggle or a count, in its top row beside `title`. */
                                { type: "slot", name: "legend" },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: "conditional",
                      conditions: [
                        {
                          statement: "if",
                          condition: "legendEnd",
                          children: [
                            {
                              type: "element",
                              tag: "div",
                              extensions: { bem: { element: "end" } },
                              children: [
                                /** Controls at the far end of the frame's top row, the stroke running on between them and `title`. */
                                { type: "slot", name: "legendEnd" },
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
        {
          type: "element",
          tag: "div",
          extensions: { bem: { element: "body" } },
          children: [
            /** The frame's content, a cell inside its ring. */
            { type: "slot" },
          ],
        },
      ],
    },
  ],
});
