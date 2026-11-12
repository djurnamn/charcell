import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStyles,
} from "../template-helpers/border";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";
import { displayed } from "../template-helpers/hidden";

/**
 * `SelectTrigger` - the closed select: a button carrying the current value and
 * the `▾` caret (the compound fills those as tagged children). A passthrough
 * visual: the compound spreads Zag's `getTriggerProps()` onto its root.
 *
 * The default `boxed` variant shares the Button box (full-cell centered-stroke
 * ring on the tone ladder: rest mid → hover strong); while `open` the trigger
 * is engaged, so it inverts inside its ring and the stroke climbs to the
 * foreground. `dense` is the bare one-row variant: hover = faint wash, open =
 * the inversion (like a pressed Toggle). The caret sits at mid; the value shows `mid` as a placeholder tone
 * via the `__value--placeholder` element modifier.
 *
 * `__values` stacks the value with one invisible `__sizer` per item in a
 * single grid cell, so the trigger takes its longest item's width, the way a
 * native `<select>` does, and the listbox opened at the trigger's width fits;
 * with no sizers (`fit: 'value'` on the Select) it takes its value's.
 */
export default defineTemplate({
  type: "component",
  name: "SelectTrigger",
  description: "the closed select: a button showing the chosen value and a ▾.",
  style: stylePreamble,
  props: {
    /** `boxed` draws the ring around the value; `dense` is one bare row with no stroke. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** The listbox is open: the trigger is engaged. */
    open: { type: "boolean" },
    /** The listbox opened above, so the attached one shares the top row, not the bottom. */
    above: { type: "boolean" },
    /** The style of every side of the boxed ring: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the boxed ring's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the boxed ring's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the boxed ring's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the boxed ring's end side, over `borderX` and `border`. */
    borderEnd: borderProp,
    /** The style of the boxed ring's bottom side, over `borderY` and `border`. */
    borderBottom: borderProp,
    /** The style of the boxed ring's start side, over `borderX` and `border`. */
    borderStart: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "button",
      passthrough: true,
      extensions: { bem: { block: "CharcellSelectTrigger" } },
      conditionalAttributes: [
        {
          condition: "variant === 'boxed'",
          attributes: { class: ["CharcellSelectTrigger--boxed"] },
        },
        {
          condition: "variant === 'dense'",
          attributes: { class: ["CharcellSelectTrigger--dense"] },
        },
        {
          condition: "open === true",
          attributes: { class: ["CharcellSelectTrigger--open"] },
        },
        {
          condition: "above === true",
          attributes: { class: ["CharcellSelectTrigger--above"] },
        },
        ...borderClasses("CharcellSelectTrigger"),
      ],
      attributes: {
        type: "button",
        style: {
          "@include cell": true,
          "@include native-control": true,
          "@include paint": true,
          "@include focusable": true,
          ...displayed("inline-flex"),
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1ch",
          // A trigger never pushes past its container: the value ellipsizes
          // and the caret stays.
          maxWidth: "100%",
          whiteSpace: "nowrap",
          "&__values": {
            display: "grid",
          },
          "&__value, &__sizer": {
            gridArea: "1 / 1",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
          "&__sizer": { visibility: "hidden" },
          cursor: "pointer",
          "&__caret": {
            color: "var(--charcell-text--resolved, var(--charcell-mid))",
          },
          "&__value--placeholder": { color: "var(--charcell-mid)" },
          position: "relative",
          // The focus pointer takes the padding cell before the value: inside
          // the ring on the value's row, boxed.
          ...oneOf(["--boxed", "--dense"], {
            "--boxed": {
              zIndex: "0",
              padding: "var(--charcell-row) 2ch",
              "&::before": { "@include ring": true },
              "&::after": {
                "@include pointer(1ch, var(--charcell-row))": true,
              },
            },
            "--dense": {
              padding: "0 1ch",
              "&::after": { "@include pointer": true },
            },
          }),
          // Open is engaged: the trigger inverts (the boxed one inside its
          // ring, the stroke at the foreground), and the caret and the focus
          // pointer take the inverted text.
          "&--open": {
            "--charcell-text--resolved": "var(--charcell-background)",
            "--charcell-pointer-tone": "var(--charcell-background)",
          },
          ...borderStyles(),
          // Open, the attached listbox shares the row on its side: that row's
          // corners are tees, the sides running on into the listbox. A listbox
          // wider than the trigger (`--charcell-select--wider`, the driver's)
          // runs on past the end corner, which the trigger draws as the
          // junction: its line runs on through it, `┴ ┻ ╩` (`┬ ┳ ╦` above).
          // The shared row's cells take the listbox's ground.
          // The end corner is the right one, or the left on a right-to-left page.
          ...perDirection((direction) => {
            const end = direction === "rtl" ? "left" : "right";
            return {
              "&--boxed.CharcellSelectTrigger--open:where(:not(.CharcellSelectTrigger--above))::before":
                {
                  "@include ring-side(bottom, tee)": true,
                  [`--charcell-ring--bottom-${end}-tee`]:
                    "calc(1 - var(--charcell-select--wider, 0))",
                  [`--charcell-ring--bottom-${end}-run`]:
                    "var(--charcell-select--wider, 0)",
                  "--charcell-ring--bottom-ground":
                    "var(--charcell-background)",
                },
              "&--boxed.CharcellSelectTrigger--open.CharcellSelectTrigger--above::before":
                {
                  "@include ring-side(top, tee)": true,
                  [`--charcell-ring--top-${end}-tee`]:
                    "calc(1 - var(--charcell-select--wider, 0))",
                  [`--charcell-ring--top-${end}-run`]:
                    "var(--charcell-select--wider, 0)",
                  "--charcell-ring--top-ground": "var(--charcell-background)",
                },
            };
          }),
          "&--boxed.CharcellSelectTrigger--open::before": {
            "--charcell-fill--resolved": "var(--charcell-foreground)",
            "--charcell-stroke--resolved": "var(--charcell-foreground)",
          },
          "&--dense.CharcellSelectTrigger--open": {
            "--charcell-fill--resolved": "var(--charcell-foreground)",
          },
          "&--open > &__caret": {
            "--charcell-text--resolved": "currentColor",
          },
          // States assign the slots the resting rules read; hover is guarded
          // against disabled and against open, which is already engaged.
          "&:focus-visible::after": { "@include focus-cue": true },
          "&:disabled": { "@include disabled": true },
          "&--boxed:where(:not(:disabled, .CharcellSelectTrigger--open)):hover::before":
            {
              "@include wash": true,
              "--charcell-stroke--resolved": "var(--charcell-strong)",
            },
          "&--boxed:focus-visible::before": {
            "--charcell-stroke--resolved": "var(--charcell-foreground)",
          },
          "&--boxed:disabled::before": {
            "--charcell-stroke--resolved": "var(--charcell-faint)",
          },
          "&--dense:where(:not(:disabled, .CharcellSelectTrigger--open)):hover":
            { "@include wash": true },
        },
      },
      children: [{ type: "slot" }],
    },
  ],
});
