import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStyles,
} from "../template-helpers/border";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import {
  widthContent,
  widthImports,
  widthProp,
} from "../template-helpers/width";

/**
 * `PopoverPanel` - the popover **panel**, the surface that opens. A
 * passthrough root (the compound spreads Zag's `getContentProps()` onto it)
 * wrapping the projected content.
 *
 * An open floating panel is a window, and an engaged one: it carries the
 * full-cell centered-stroke ring (the Frame geometry) at the foreground tone -
 * the bright ring lifts it off the page, and `border` styles its sides. z-index is a
 * small integer per the kit convention (the select listbox sits one above, so
 * a select can open from inside a popover).
 *
 * `width` sets the panel's width in whole cells, its ring included, and
 * `minWidth` its least width, past which it grows with its content. The
 * `attached` (a boxed trigger) fuses the panel to its trigger as the
 * Select's listbox and trigger fuse: it moves one row onto the trigger, its
 * top stroke the trigger's bottom one, or opened `above`, its bottom stroke
 * the trigger's top one; apart, it stands a row off. The
 * gutter between the ring and the content is a cell each side, and
 * `--charcell-popover-panel--gutter` on the panel sets another.
 */
export default defineTemplate({
  type: "component",
  name: "PopoverPanel",
  description: "the window a popover opens, drawn in white over the page.",
  style: stylePreamble,
  extensions: {
    react: { imports: [widthImports.react] },
    vue: { imports: [widthImports.vue] },
    svelte: { imports: [widthImports.svelte] },
  },
  props: {
    /** Fuses the window to a boxed trigger: it moves one row onto it and shares its stroke. */
    attached: { type: "boolean" },
    /** Opened above the trigger, so an attached window shares the trigger's top stroke. */
    above: { type: "boolean" },
    /** The window's width in whole cells, its ring included; it fits its content when unset, and never outgrows the space it has. */
    width: widthProp,
    /** The window's least width in whole cells, its ring included: it grows past it with its content. */
    minWidth: widthProp,
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
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellPopoverPanel" } },
      conditionalAttributes: [
        {
          condition: "attached === true",
          attributes: { class: ["CharcellPopoverPanel--attached"] },
        },
        {
          condition: "above === true",
          attributes: { class: ["CharcellPopoverPanel--above"] },
        },
        ...borderClasses("CharcellPopoverPanel"),
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          position: "relative",
          zIndex: "var(--charcell-layer-popover)",
          // With nothing in it to take focus, the machine focuses the panel
          // itself, so escape and tab start from inside it: its foreground
          // ring already marks it open, so it draws no other cue.
          "@include focusable": true,
          // The ring's cell, then the gutter.
          "--charcell-popover-panel--gutter": "1ch",
          padding:
            "var(--charcell-row) calc(1ch + var(--charcell-popover-panel--gutter))",
          // The machine opens the panel flush against its trigger; the reset's
          // `margin: auto` for an open popover would hold it off.
          marginBlock: "0",
          // Attached, it is at least a cell wider than the trigger (Zag's
          // `--reference-width`), so its far corner stands clear of the
          // trigger's, which runs on through the shared row (`┴`): a side of
          // its own, double or heavy, meets no single side in one cell.
          ...oneOf(["--attached"], {
            none: {
              "--charcell-attached": "0",
              top: "0",
            },
            "--attached": {
              "--charcell-attached": "1",
              top: "var(--charcell-popover-panel--shift)",
              minWidth: "calc(var(--reference-width, 0px) + 1ch)",
            },
          }),
          // Attached, the shared stroke row: one row onto the trigger, up when
          // the window opened below it and down when it opened above.
          ...oneOf(["--above"], {
            none: {
              "--charcell-popover-panel--shift":
                "calc(var(--charcell-row) * -1)",
            },
            "--above": {
              "--charcell-popover-panel--shift": "var(--charcell-row)",
            },
          }),
          // The window's ground covers its whole cells, the ring's included.
          "&::before": {
            "@include ring($stroke: var(--charcell-foreground), $ground: var(--charcell-background))": true,
          },
          ...borderStyles(),
          // Attached, the row it shares with the trigger: its corners are
          // tees, the sides running on into the trigger (`attachingToTrigger`
          // marks the far corner as the two widths have it).
          "&--attached:where(:not(.CharcellPopoverPanel--above))::before": {
            "@include ring-side(top, tee)": true,
          },
          "&--attached.CharcellPopoverPanel--above::before": {
            "@include ring-side(bottom, tee)": true,
          },
          "&__content": {
            width:
              "calc(var(--charcell-popover-panel--width) * 1ch - 2ch - 2 * var(--charcell-popover-panel--gutter))",
            minWidth:
              "calc(var(--charcell-popover-panel--min-width) * 1ch - 2ch - 2 * var(--charcell-popover-panel--gutter))",
            maxWidth: "100%",
          },
        },
      },
      children: [widthContent("--charcell-popover-panel", [{ type: "slot" }])],
    },
  ],
});
