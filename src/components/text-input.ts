import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStyles,
} from "../template-helpers/border";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";

// The text the field reports as it is typed.
const CHANGED =
  "(event) => { reportValue((event.currentTarget as HTMLInputElement).value); }";

/**
 * `TextInput` - the text input, bare: it carries no label, and
 * a `Field` around it names it through the `id` it stamps on the `<input>`.
 * The default `boxed` variant matches the Button box: a full-cell ring with
 * the 1px stroke centered in it - its cells a transparent border, the stroke
 * background lines centered in them (`field-ring`; an `<input>` is void, so
 * no pseudo-element). The stroke rides the tone ladder: rest mid → hover
 * strong → focus foreground - with a stroke channel available, focus does not
 * invert (the brightened stroke plus the block caret carry "live"). `dense` is
 * the classic tui dialog field: a bare one-row faint strip. With no stroke channel (an edge outline would violate
 * the center-of-cell rule, and a one-row strip has no cell to center a stroke
 * in), its states are background-only - focus is the full inversion, the
 * reverse-video field: for an input, focus is the engaged state.
 *
 * The block caret is the mid gray: CSS can't invert the glyph the block
 * covers, so the gray keeps the covered character legible.
 *
 * `value` holds the text, paired with `onValueChange`, which hands over the
 * text as it is typed; Vue binds it with `v-model`, Svelte with `bind:value`.
 * `defaultValue` seeds the text instead, the field owning it from there.
 * Everything else (`placeholder`, `type`, `disabled`, native handlers) rides
 * the passthrough surface.
 */
export default defineTemplate({
  type: "component",
  name: "TextInput",
  description: "one line of text, boxed or dense.",
  style: stylePreamble,
  // Vue binds the text with `v-model`, Svelte with `bind:value`.
  extensions: {
    react: {
      // It sets handlers on its own element, so it is a client module.
      client: true,
    },
    vue: { model: "value" },
  },
  props: {
    /** The text, held by the consumer; pair it with `onValueChange`. */
    value: {
      type: "string",
      bindable: {
        given: "givenValue",
        report: "reportValue",
        changeProp: "onValueChange",
      },
    },
    /** Called with the text on every change. */
    onValueChange: { type: "(value: string) => void" },
    /** The text to start with, uncontrolled: the field owns it from there. */
    defaultValue: { type: "string" },
    /** `boxed` draws the ring around the field; `dense` is a bare one-row `faint` strip, 16px tall, which misses WCAG 2.5.8's 24px target; boxed meets it. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** The style of every side of the boxed field's ring: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the boxed field's ring's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the boxed field's ring's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the boxed field's ring's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the boxed field's ring's end side, over `borderX` and `border`. */
    borderEnd: borderProp,
    /** The style of the boxed field's ring's bottom side, over `borderY` and `border`. */
    borderBottom: borderProp,
    /** The style of the boxed field's ring's start side, over `borderX` and `border`. */
    borderStart: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "input",
      passthrough: true,
      // The text only when one is given, so an unset value never clears the
      // field's own. A held field is not put back as each key arrives:
      // setting the text under the caret would move the caret, and React
      // restores a held field on its own. React reports the text on its
      // `change`, which is the others' `input`.
      extensions: {
        bem: { block: "CharcellTextInput" },
        react: { events: [{ name: "change", handler: CHANGED }] },
        vue: { events: [{ name: "input", handler: CHANGED }] },
        svelte: { events: [{ name: "input", handler: CHANGED }] },
      },
      conditionalAttributes: [
        ...borderClasses("CharcellTextInput"),
        {
          condition: "variant === 'boxed'",
          attributes: { class: ["CharcellTextInput--boxed"] },
        },
        {
          condition: "variant === 'dense'",
          attributes: { class: ["CharcellTextInput--dense"] },
        },
      ],
      attributes: {
        $spread: {
          $expression:
            "givenValue !== undefined ? { value: givenValue } : defaultValue !== undefined ? { defaultValue } : {}",
        },
        style: {
          "@include cell": true,
          "@include native-control": true,
          "@include paint($background: false)": true,
          caretColor: "var(--charcell-mid)",
          caretShape: "block",
          // Text sits two tone steps above its ground: `mid` on the
          // background, `strong` on the dense strip's `faint`. Inverted, the
          // focused strip is reverse video, and the placeholder takes the
          // strip's own `faint` as its text color, the one place faint is text.
          "&::placeholder": {
            color: "var(--charcell-text--resolved, var(--charcell-mid))",
          },
          "&--dense::placeholder": {
            "--charcell-text--resolved": "var(--charcell-strong)",
          },
          "&--dense:focus::placeholder": {
            "--charcell-text--resolved": "var(--charcell-faint)",
          },
          ...borderStyles("&"),
          ...oneOf(["--boxed", "--dense"], {
            none: {
              borderWidth: "0",
              background: "var(--charcell-fill--resolved, none)",
              "--charcell-text-input--frame-inline": "0px",
            },
            // The ring's cells are a border the text never runs into, its
            // stroke drawn in their centers (`field-ring`).
            "--boxed": {
              "@include field-ring": true,
              "--charcell-text-input--frame-inline": "4ch",
            },
            // The strip is the field's resting fill, assigned so focus can
            // invert over it.
            "--dense": {
              padding: "0 1ch",
              borderWidth: "0",
              outline: "none",
              background: "var(--charcell-fill--resolved, none)",
              "--charcell-fill--resolved": "var(--charcell-faint)",
              "--charcell-text-input--frame-inline": "2ch",
            },
          }),
          // The field is `size` characters wide (20 unless set), as a native
          // one is, in whole cells: left to the browser, each engine measures
          // a character its own way, a fraction of a cell off the grid. Where
          // `attr()` cannot read `size`, a field given one keeps the
          // browser's measure.
          "&:not([size])": {
            width: "calc(20ch + var(--charcell-text-input--frame-inline))",
          },
          "@supports (width: calc(attr(size type(<number>), 20) * 1ch))": {
            "&[size]": {
              width:
                "calc(attr(size type(<number>)) * 1ch + var(--charcell-text-input--frame-inline))",
            },
          },
          // States assign the slots the resting rules read; hover is guarded
          // against disabled.
          "&--boxed:where(:not(:disabled)):hover": {
            "--charcell-stroke--resolved": "var(--charcell-strong)",
          },
          "&--boxed:focus": {
            "--charcell-stroke--resolved": "var(--charcell-foreground)",
          },
          "&--boxed:disabled": {
            "@include disabled": true,
            "--charcell-stroke--resolved": "var(--charcell-faint)",
          },
          "&--dense:focus": { "@include inverted": true },
          "&--dense:disabled": { "@include disabled": true },
        },
      },
    },
  ],
});
