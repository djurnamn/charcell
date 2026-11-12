import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStyles,
} from "../template-helpers/border";
import { displayed } from "../template-helpers/hidden";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";

/**
 * `ComboboxField` - the closed combobox: a text field the reader types in to
 * narrow a list, and a `▾` that opens it. A passthrough root (the compound
 * spreads Zag's `getControlProps()`), holding the `<input>` (`inputProps`,
 * the machine's input props) and the `▾` button (`buttonProps`, its trigger
 * props). The open list is a `SelectListbox`.
 *
 * The field is a TextInput's: `boxed` (the default) draws the full-cell
 * ring, its stroke `mid` at rest, `strong` on hover and the foreground while
 * the reader types in it; `dense` is one bare row, as a dense Select: the
 * `faint` wash under the pointer, inverted while the reader types in it,
 * the reverse-video field. The block caret is `mid`.
 * Open, the boxed ring takes the foreground and its row on the list's side
 * turns to tees, the list attached to it as a Select's is to its trigger;
 * a list wider than the field runs on past the end corner, which meets it
 * as `┴` (`┬` above). The input is 20 cells wide unless the field is given a
 * width, which it fills.
 */
export default defineTemplate({
  type: "component",
  name: "ComboboxField",
  description:
    "the closed combobox: a field to type in, and a ▾ that opens its list.",
  style: stylePreamble,
  props: {
    /** `boxed` draws the ring around the field; `dense` is one bare row, as a dense Select. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** The list is open: the field is engaged. */
    open: { type: "boolean" },
    /** The list opened above, so the attached one shares the top row, not the bottom. */
    above: { type: "boolean" },
    /** The `<input>`'s props: the machine's, with the value and placeholder. */
    inputProps: { type: "object" },
    /** The `▾` button's props: the machine's trigger props. */
    buttonProps: { type: "object" },
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
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellComboboxField" } },
      conditionalAttributes: [
        {
          condition: "variant !== 'dense'",
          attributes: { class: ["CharcellComboboxField--boxed"] },
        },
        {
          condition: "variant === 'dense'",
          attributes: { class: ["CharcellComboboxField--dense"] },
        },
        {
          condition: "open === true",
          attributes: { class: ["CharcellComboboxField--open"] },
        },
        {
          condition: "above === true",
          attributes: { class: ["CharcellComboboxField--above"] },
        },
        ...borderClasses("CharcellComboboxField"),
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          ...displayed("inline-flex"),
          alignItems: "center",
          gap: "1ch",
          position: "relative",
          maxWidth: "100%",
          whiteSpace: "nowrap",
          "&__input": {
            "@include cell": true,
            "@include native-control": true,
            "@include focusable": true,
            flex: "1 1 20ch",
            width: "20ch",
            caretColor: "var(--charcell-mid)",
            caretShape: "block",
          },
          "&__input::placeholder": { color: "var(--charcell-mid)" },
          // The machine keeps the `▾` out of the tab order: the input is the
          // field's one stop, so the button keeps the browser's outline.
          "&__button": {
            "@include cell": true,
            "@include native-control": true,
            flex: "none",
            cursor: "pointer",
            color: "var(--charcell-text--resolved, var(--charcell-mid))",
          },
          ...oneOf(["--boxed", "--dense"], {
            "--boxed": {
              zIndex: "0",
              padding: "var(--charcell-row) 2ch",
              "&::before": { "@include ring": true },
            },
            // Bare as a dense Select: one row, no fill at rest.
            "--dense": { padding: "0 1ch" },
          }),
          ...borderStyles(),
          // Open, the attached list shares the row on its side: that row's
          // corners are tees, the sides running on into the list; a list
          // wider than the field (`--charcell-select--wider`, the driver's)
          // runs on past the end corner, which the field draws as the junction:
          // its line runs on through it, `┴ ┻ ╩` (`┬ ┳ ╦` above).
          // The end corner is the right one, or the left on a right-to-left page.
          ...perDirection((direction) => {
            const end = direction === "rtl" ? "left" : "right";
            return {
              "&--boxed.CharcellComboboxField--open:where(:not(.CharcellComboboxField--above))::before":
                {
                  "@include ring-side(bottom, tee)": true,
                  [`--charcell-ring--bottom-${end}-tee`]:
                    "calc(1 - var(--charcell-select--wider, 0))",
                  [`--charcell-ring--bottom-${end}-run`]:
                    "var(--charcell-select--wider, 0)",
                },
              "&--boxed.CharcellComboboxField--open.CharcellComboboxField--above::before":
                {
                  "@include ring-side(top, tee)": true,
                  [`--charcell-ring--top-${end}-tee`]:
                    "calc(1 - var(--charcell-select--wider, 0))",
                  [`--charcell-ring--top-${end}-run`]:
                    "var(--charcell-select--wider, 0)",
                },
            };
          }),
          // States assign the slots the resting rules read: typing in it
          // and open both engage it; hover is guarded against those and
          // against disabled.
          "&--boxed:where(:not(:has(> .CharcellComboboxField__input:disabled), :focus-within, .CharcellComboboxField--open)):hover::before":
            { "--charcell-stroke--resolved": "var(--charcell-strong)" },
          "&--boxed:where(:focus-within, .CharcellComboboxField--open)::before":
            { "--charcell-stroke--resolved": "var(--charcell-foreground)" },
          "&--boxed:has(> .CharcellComboboxField__input:disabled)::before": {
            "--charcell-stroke--resolved": "var(--charcell-faint)",
          },
          "&--dense:where(:not(:has(> .CharcellComboboxField__input:disabled), :focus-within, .CharcellComboboxField--open)):hover":
            { "@include wash": true },
          "&--dense:where(:focus-within, .CharcellComboboxField--open)": {
            "@include inverted": true,
          },
          // Inverted, the `▾` takes the inverted text, as a dense Select's.
          "&--dense:where(:focus-within, .CharcellComboboxField--open) > &__button":
            { "--charcell-text--resolved": "currentColor" },
          "&:has(> .CharcellComboboxField__input:disabled)": {
            "@include disabled": true,
          },
        },
      },
      children: [
        {
          type: "element",
          tag: "input",
          extensions: { bem: { element: "input" } },
          attributes: {
            $spread: { $expression: "inputProps ?? {}" },
          },
        },
        {
          type: "element",
          tag: "button",
          extensions: { bem: { element: "button" } },
          attributes: {
            type: "button",
            $spread: { $expression: "buttonProps ?? {}" },
          },
          children: [
            {
              type: "element",
              tag: "span",
              attributes: { "aria-hidden": "true" },
              children: [{ type: "text", content: "▾" }],
            },
          ],
        },
      ],
    },
  ],
});
