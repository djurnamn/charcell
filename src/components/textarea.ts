import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStyles,
} from "../template-helpers/border";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";

const helpers = "import { syncTextareaHeight } from 'charcell/scripts/form';";

// The text the field reports as it is typed.
const CHANGED =
  "(event) => { if (autosize !== false) syncTextareaHeight(event.currentTarget); reportValue((event.currentTarget as HTMLTextAreaElement).value); }";

/**
 * `Textarea` - multi-line text, TextInput in more rows: bare (a `Field`
 * names it through its `id`), `boxed` (the full-cell ring, its cells a border
 * the text never scrolls into) or `dense` (the faint strip that inverts on
 * focus), with TextInput's tones and block caret. Never resized by hand, since
 * a drag would leave it off the grid.
 *
 * `rows` is the height in rows, and with `autosize` (the default) the least
 * height: the field grows a row at a time with its content.
 * Where the browser can size a field to its content from the first render
 * (`field-sizing: content`, with the `rows` minimum read through typed
 * `attr()`), the stylesheet does it; elsewhere the field grows as the user
 * types. It grows down only: its width is `cols` cells (20 unless set), as
 * a native textarea's. `autosize={false}` keeps the `rows` height and
 * scrolls.
 *
 * `value` holds the text, paired with `onValueChange`, which hands over the
 * text as it is typed; Vue binds it with `v-model`, Svelte with `bind:value`.
 * `defaultValue` seeds the text instead, the field owning it from there.
 * Everything else (`placeholder`, `disabled`, native handlers) rides the
 * passthrough surface.
 */
export default defineTemplate({
  type: "component",
  name: "Textarea",
  description: "several lines of text, growing as you type.",
  style: stylePreamble,
  extensions: {
    react: {
      // It sets handlers on its own element, so it is a client module.
      client: true,
      imports: [helpers],
    },
    // Vue binds the text with `v-model`, Svelte with `bind:value`.
    vue: { model: "value", imports: [helpers] },
    svelte: { imports: [helpers] },
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
    /** `boxed` draws the ring around the field; `dense` is a bare `faint` strip. */
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
    /** The height in rows of text; with `autosize`, the least height. */
    rows: { type: "number", default: 3 },
    /** The field grows with its content. */
    autosize: { type: "boolean", default: true },
  },
  children: [
    {
      type: "element",
      tag: "textarea",
      passthrough: true,
      // The text only when one is given, so an unset value never clears the
      // field's own. A held field is not put back as each key arrives:
      // setting the text under the caret would move the caret, and React
      // restores a held field on its own. React reports the text on its
      // `change`, which is the others' `input`.
      extensions: {
        bem: { block: "CharcellTextarea" },
        react: { events: [{ name: "change", handler: CHANGED }] },
        vue: { events: [{ name: "input", handler: CHANGED }] },
        svelte: { events: [{ name: "input", handler: CHANGED }] },
      },
      conditionalAttributes: [
        ...borderClasses("CharcellTextarea"),
        {
          condition: "variant === 'boxed'",
          attributes: { class: ["CharcellTextarea--boxed"] },
        },
        {
          condition: "variant === 'dense'",
          attributes: { class: ["CharcellTextarea--dense"] },
        },
        {
          condition: "autosize !== false",
          attributes: { class: ["CharcellTextarea--autosize"] },
        },
      ],
      attributes: {
        $spread: {
          $expression:
            "givenValue !== undefined ? { value: givenValue } : defaultValue !== undefined ? { defaultValue } : {}",
        },
        rows: { $expression: "rows" },
        style: {
          "@include cell": true,
          "@include native-control": true,
          "@include paint($background: false)": true,
          ...displayed("inline-block"),
          verticalAlign: "top",
          maxWidth: "100%",
          resize: "none",
          caretColor: "var(--charcell-mid)",
          caretShape: "block",
          // Text sits two tone steps above its ground (see TextInput).
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
              "--charcell-textarea--frame": "0px",
              "--charcell-textarea--frame-inline": "0px",
            },
            "--boxed": {
              "@include field-ring": true,
              "--charcell-textarea--frame": "calc(var(--charcell-row) * 2)",
              "--charcell-textarea--frame-inline": "4ch",
            },
            // The strip is the field's resting fill, assigned so focus can
            // invert over it.
            "--dense": {
              padding: "0 1ch",
              borderWidth: "0",
              outline: "none",
              background: "var(--charcell-fill--resolved, none)",
              "--charcell-fill--resolved": "var(--charcell-faint)",
              "--charcell-textarea--frame": "0px",
              "--charcell-textarea--frame-inline": "2ch",
            },
          }),
          // Growing with its content, the field never scrolls.
          ...oneOf(["--autosize"], {
            none: { overflow: "auto" },
            "--autosize": { overflow: "hidden" },
          }),
          // The field is `cols` characters wide (20 unless set), as a native
          // one is, in whole cells, and an autosized field, sized to its
          // content, would otherwise grow sideways too. Where `attr()` cannot
          // read `cols`, a field given one keeps the browser's measure.
          "&:not([cols])": {
            width: "calc(20ch + var(--charcell-textarea--frame-inline))",
          },
          "@supports (width: calc(attr(cols type(<number>), 20) * 1ch))": {
            "&[cols]": {
              width:
                "calc(attr(cols type(<number>)) * 1ch + var(--charcell-textarea--frame-inline))",
            },
          },
          "@supports (field-sizing: content) and (min-height: calc(attr(rows type(<number>), 3) * 1px))":
            {
              "&--autosize": {
                fieldSizing: "content",
                minHeight:
                  "calc(attr(rows type(<number>), 3) * var(--charcell-row) + var(--charcell-textarea--frame))",
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
