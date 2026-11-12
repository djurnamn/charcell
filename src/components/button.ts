import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStyles,
} from "../template-helpers/border";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";

/**
 * A button. The default `boxed` variant is a centered-stroke box: the control
 * reserves a full-cell ring on every side (one row / 1ch - the Frame geometry,
 * three rows total) and the 1px stroke runs through the ring's center - the
 * box-drawing layout, drawn with CSS. The stroke rides the tone
 * ladder (rest mid → hover strong → focus foreground); fills paint the ring's
 * interior only. `dense` is the bare one-row variant for
 * inline/dense contexts - no stroke, states expressed purely as cell-background
 * washes; consumers who want the classic `[label]` affordance type the
 * brackets themselves.
 *
 * Feedback follows the kit-wide rule: inversion means engaged, never hovered -
 * hover is the faint wash, pressing inverts momentarily, keyboard focus
 * puts the pointer `❯` in the cell before the label (and brightens the boxed
 * stroke). A button that opens a
 * panel (`aria-expanded`, as an ActionMenu or Popover trigger) stays inverted while the
 * panel is open.
 *
 * `type` defaults to `'button'`, not the HTML `'submit'` default: an
 * unqualified `<Button>` inside a `<form>` must not accidentally submit it -
 * submit/reset are an explicit opt-in.
 * `nonInteractive` renders the inert `<span>` look-alike.
 */
export default defineTemplate({
  type: "component",
  name: "Button",
  description: "a button, boxed or dense. pressing it inverts it.",
  style: stylePreamble,
  extensions: {
    react: {
      imports: ["import type { MouseEventHandler } from 'react'"],
      // React's passthrough surface already types `onClick` as the native
      // button handler; re-declare it with the identical type so the explicit
      // `events` binding has an in-scope referent without narrowing the event
      // away. Vue and Svelte carry the plain DOM handler (below).
      props: { onClick: { type: "MouseEventHandler<HTMLButtonElement>" } },
    },
  },
  props: {
    /** The button's text, ahead of anything in the default slot. */
    label: { type: "string" },
    /** `boxed` draws the ring around the label; `dense` is one bare 16px row with no stroke, which misses WCAG 2.5.8's 24px target; boxed meets it. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** The native button type: only an explicit `'submit'` or `'reset'`
     *  acts on a form. */
    type: { type: "'button' | 'submit' | 'reset'", default: "button" },
    /** Renders an inert `<span>` with the button's look, for a label that does nothing. */
    nonInteractive: { type: "boolean" },
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
    /** Called with the click event. */
    onClick: { type: "(event: MouseEvent) => void" },
  },
  children: [
    {
      type: "element",
      tag: {
        $expression: "nonInteractive ? 'span' : 'button'",
        default: "button",
      },
      passthrough: true,
      extensions: { bem: { block: "CharcellButton" } },
      events: [{ name: "click", handler: "onClick" }],
      conditionalAttributes: [
        ...borderClasses("CharcellButton"),
        {
          condition: "variant === 'boxed'",
          attributes: { class: ["CharcellButton--boxed"] },
        },
        {
          condition: "variant === 'dense'",
          attributes: { class: ["CharcellButton--dense"] },
        },
        {
          condition: "!nonInteractive",
          attributes: { class: ["CharcellButton--interactive"] },
        },
      ],
      attributes: {
        // Default `type="button"` on the interactive branch; `undefined` on the
        // inert `<span>` twin omits the attribute across every target.
        type: {
          $expression:
            "nonInteractive ? undefined : (type !== undefined ? type : 'button')",
        },
        style: {
          "@include cell": true,
          "@include native-control": true,
          "@include paint": true,
          "@include focusable": true,
          ...displayed("inline-flex"),
          alignItems: "center",
          // A label too long for the box clips at its end, not both sides.
          justifyContent: "safe center",
          // A control never pushes past its container: at the edge its label
          // clips, the way a terminal clips a line.
          maxWidth: "100%",
          overflow: "hidden",
          whiteSpace: "nowrap",
          position: "relative",
          // Boxed is the default, the box drawn without its modifier class too,
          // so markup copied without its modifiers keeps the box and its focus
          // pointer; the interactive states key on the native button for the
          // same reason, a non-interactive button being a span.
          ...oneOf(["--dense"], {
            // The centered-stroke box: the full-cell ring (`ring`), which
            // draws the stroke and the state fills, the fills in the interior
            // cells only; the root's own stacking context keeps it under the
            // label. The focus pointer takes the label row's padding cell,
            // inside the ring.
            none: {
              zIndex: "0",
              padding: "var(--charcell-row) 2ch",
              "&::before": { "@include ring": true },
              "&::after": {
                "@include pointer(1ch, var(--charcell-row))": true,
              },
            },
            // The focus pointer takes the padding cell.
            "--dense": {
              padding: "0 1ch",
              "&::after": { "@include pointer": true },
            },
          }),
          ...borderStyles(),
          "&:where(button)": { cursor: "pointer" },
          // States assign the slots the resting rules read; hover is guarded
          // against disabled.
          "&:where(button):focus-visible::after": {
            "@include focus-cue": true,
          },
          "&:where(button):disabled": { "@include disabled": true },
          "&:where(button):where(:not(.CharcellButton--dense))": {
            "&:where(:not(:disabled)):hover::before": {
              "@include wash": true,
              "--charcell-stroke--resolved": "var(--charcell-strong)",
            },
            "&:focus-visible::before": {
              "--charcell-stroke--resolved": "var(--charcell-foreground)",
            },
            "&:disabled::before": {
              "--charcell-stroke--resolved": "var(--charcell-faint)",
            },
            "&:active": {
              "--charcell-text--resolved": "var(--charcell-background)",
              "--charcell-pointer-tone": "var(--charcell-background)",
            },
            "&:active::before": {
              "--charcell-fill--resolved": "var(--charcell-foreground)",
              "--charcell-stroke--resolved": "var(--charcell-foreground)",
            },
            "&[aria-expanded='true']::before": {
              "--charcell-fill--resolved": "var(--charcell-foreground)",
              "--charcell-stroke--resolved": "var(--charcell-foreground)",
            },
            "&[aria-expanded='true']:where(:not(:disabled)):hover::before": {
              "--charcell-fill--resolved": "var(--charcell-strong)",
            },
          },
          "&--dense:where(button)": {
            "&:where(:not(:disabled)):hover": { "@include wash": true },
            "&:active": { "@include inverted": true },
            "&[aria-expanded='true']": {
              "--charcell-fill--resolved": "var(--charcell-foreground)",
            },
            "&[aria-expanded='true']:where(:not(:disabled)):hover": {
              "--charcell-fill--resolved": "var(--charcell-strong)",
            },
          },
          // A trigger whose panel is open is engaged: inverted while open (the
          // boxed one inside its ring), the dimmed inversion under the pointer.
          "&:where(button)[aria-expanded='true']": {
            "--charcell-text--resolved": "var(--charcell-background)",
            "--charcell-pointer-tone": "var(--charcell-background)",
          },
        },
      },
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
        /** Content after `label`, or the button's whole content without one. */
        { type: "slot" },
      ],
    },
  ],
});
