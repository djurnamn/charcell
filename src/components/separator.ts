import { defineTemplate } from "@js-template-engine/types";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";

/**
 * `Separator` - a content rule in charcell's strokes. It
 * sits at `faint` on the tone ladder (a separator never outshines the content
 * it groups) and takes whole cells: a horizontal separator occupies one full
 * row with the stroke centered in it, a vertical one a full 1ch column, so the
 * content around it stays on the grid.
 *
 * `orientation` names the separator's own axis (a `horizontal` separator is a
 * horizontal line); `aria-orientation` is emitted only for `vertical`, since
 * ARIA's separator default is horizontal. `decorative` renders it
 * presentation-only (`role="none"`) for a divider that would be noise to a
 * screen reader.
 *
 * Two `border` styles only: `single` (structure, the default) and `double`
 * (emphasis) -
 * the ═ / ║ glyph's geometry: one symmetric pair of strokes an eighth of a
 * cell either side of the cell's center pixel, never two arbitrary hairlines. The
 * border box carries the pair's spread and the margins put it on the pixel.
 * A vertical separator stretches across a flex row on its own; outside one,
 * its length is the consumer's.
 *
 * `inset` ends the stroke at the centers of its first and last cells, `╶──╴`
 * rather than `────`: a break inside a box, whose stroke cannot run on into
 * the box's own ring at another tone (a cell holds one mark).
 *
 * `join` runs an end (`start`, `end` or `both`) on to meet the line beyond
 * it, as box drawing joins them (`├ ┤ ┬ ┴`): laid directly in a `Frame`'s
 * body, the frame's ring, at the ring's tone; anywhere else, the line in the
 * next cell. The reach and the tone are the `--charcell-join-*` properties,
 * which a consumer can set on the separator itself.
 */
export default defineTemplate({
  type: "component",
  name: "Separator",
  description:
    "a single or double line, across or down. it can join the frame or the line it meets.",
  style: stylePreamble,
  props: {
    /** The line's own axis. */
    orientation: { type: "'horizontal' | 'vertical'", default: "horizontal" },
    /** Renders it presentation-only (`role="none"`), for a divider that would be noise to a
     *  screen reader. */
    decorative: { type: "boolean" },
    /** The stroke: `single` for structure, `double` for emphasis. */
    border: { type: "'single' | 'double'", default: "single" },
    /** Ends the stroke at its end cells' centers (`╶──╴`). */
    inset: { type: "boolean" },
    /** Runs these ends on to meet the line beyond: a frame's ring when the
     *  separator sits directly in its body, or else the line in the next
     *  cell (`├ ┤ ┬ ┴`). */
    join: { type: "'start' | 'end' | 'both'" },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellSeparator" } },
      conditionalAttributes: [
        {
          condition: "orientation === 'vertical'",
          attributes: { class: ["CharcellSeparator--vertical"] },
        },
        {
          condition: "border === 'double'",
          attributes: { class: ["CharcellSeparator--border-double"] },
        },
        {
          condition: "inset",
          attributes: { class: ["CharcellSeparator--inset"] },
        },
        {
          condition: "join !== undefined",
          attributes: { class: ["CharcellSeparator--joined"] },
        },
        {
          condition: "join === 'start' || join === 'both'",
          attributes: { class: ["CharcellSeparator--join-start"] },
        },
        {
          condition: "join === 'end' || join === 'both'",
          attributes: { class: ["CharcellSeparator--join-end"] },
        },
      ],
      attributes: {
        role: { $expression: "decorative ? 'none' : 'separator'" },
        "aria-orientation": {
          $expression:
            "!decorative && orientation === 'vertical' ? 'vertical' : undefined",
        },
        style: {
          // The row's `ch` resolves against the face, so the separator states it.
          "@include cell": true,
          flex: "0 0 auto",
          alignSelf: "stretch",
          borderStyle: "solid",
          borderColor: "var(--charcell-separator--tone)",
          // Joined, the line takes the tone of what it meets: a junction is
          // one glyph at one tone.
          ...oneOf(["--joined"], {
            none: { "--charcell-separator--tone": "var(--charcell-faint)" },
            "--joined": {
              "--charcell-separator--tone":
                "var(--charcell-join-tone, var(--charcell-faint))",
            },
          }),
          // The border sets the stroke pair: half its spread (a double's two
          // strokes sit `--charcell-stroke-gap` either side of the cell's
          // center pixel) and the far stroke's width.
          ...oneOf(["--border-double"], {
            none: {
              "--charcell-separator--half": "0px",
              "--charcell-separator--far": "0px",
            },
            "--border-double": {
              "--charcell-separator--half": "var(--charcell-stroke-gap)",
              "--charcell-separator--far": "1px",
            },
          }),
          // Inset, the stroke ends on its end cells' center pixels.
          ...oneOf(["--inset"], {
            "--inset": {
              "--charcell-separator--from-x": "var(--charcell-stroke-x)",
              "--charcell-separator--to-x":
                "calc(1ch - var(--charcell-stroke-x) - 1px)",
              "--charcell-separator--from-y": "var(--charcell-stroke-y)",
              "--charcell-separator--to-y":
                "calc(var(--charcell-row) - var(--charcell-stroke-y) - 1px)",
            },
          }),
          // A joined end runs past the separator's own cells by the reach it
          // is given, or to the next cell's center pixel. Across, the start
          // is the left end, or the right one on a right-to-left page: the
          // reach and the margin it moves are physical, as the stroke's pixel is.
          ...perDirection((direction) => {
            const start = direction === "rtl" ? "right" : "left";
            const end = direction === "rtl" ? "left" : "right";
            const reach = {
              left: "calc(-1 * var(--charcell-join-left, calc(1ch - var(--charcell-stroke-x))))",
              right:
                "calc(-1 * var(--charcell-join-right, calc(var(--charcell-stroke-x) + 1px)))",
            };
            return {
              ...oneOf(["--join-start"], {
                "--join-start": {
                  [`--charcell-separator--${start}-x`]: reach[start],
                  "--charcell-separator--start-y":
                    "calc(-1 * var(--charcell-join-top, calc(var(--charcell-row) - var(--charcell-stroke-y))))",
                },
              }),
              ...oneOf(["--join-end"], {
                "--join-end": {
                  [`--charcell-separator--${end}-x`]: reach[end],
                  "--charcell-separator--end-y":
                    "calc(-1 * var(--charcell-join-bottom, calc(var(--charcell-stroke-y) + 1px)))",
                },
              }),
            };
          }),
          // The orientation lays the pair across its row or down its column,
          // on the center pixel of the cells it crosses.
          ...oneOf(["--vertical"], {
            none: {
              height: "calc(var(--charcell-separator--half) * 2 + 1px)",
              borderWidth: "1px 0 var(--charcell-separator--far)",
              margin:
                "calc(var(--charcell-stroke-y) - var(--charcell-separator--half)) var(--charcell-separator--right-x, var(--charcell-separator--to-x, 0px)) calc(var(--charcell-row) - var(--charcell-stroke-y) - 1px - var(--charcell-separator--half)) var(--charcell-separator--left-x, var(--charcell-separator--from-x, 0px))",
            },
            "--vertical": {
              width: "calc(var(--charcell-separator--half) * 2 + 1px)",
              borderWidth: "0 var(--charcell-separator--far) 0 1px",
              margin:
                "var(--charcell-separator--start-y, var(--charcell-separator--from-y, 0px)) calc(1ch - var(--charcell-stroke-x) - 1px - var(--charcell-separator--half)) var(--charcell-separator--end-y, var(--charcell-separator--to-y, 0px)) calc(var(--charcell-stroke-x) - var(--charcell-separator--half))",
            },
          }),
        },
      },
    },
  ],
});
