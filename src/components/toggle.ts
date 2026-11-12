import { defineTemplate } from "@js-template-engine/types";
import { nativeInputAttributes } from "../template-helpers/native-input";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";

const helpers = "import { changedChecked } from 'charcell/scripts/form';";

/**
 * A pressed-state toggle - dense by default, backed by a real
 * (visually hidden) checkbox so the pressed state is native: uncontrolled by
 * default (`defaultPressed` seeds it, clicking just works - no state host),
 * controlled via `pressed` + `onPressedChange`, which hands over the pressed
 * state as a boolean, when a consumer owns it. Keyboard and
 * assistive-technology semantics come from the checkbox itself, which takes
 * a consumer's ARIA, form and focus attributes and its handlers; the class,
 * style and data attributes stay on the label.
 *
 * Feedback follows the kit-wide rule that inversion means engaged, never
 * hovered: off rests at the foreground, hover = faint wash, on = persistent
 * inversion, hover-while-on = the dimmed inversion (strong), disabled = mid,
 * as on every control. Keyboard focus puts the pointer `❯` in the padding
 * cell, apart from all of them.
 *
 * `dense` (the default) is one bare 16px row, which misses WCAG 2.5.8's
 * 24px target; `boxed` draws the boxed Button's ring around it, three rows
 * tall, which meets it: the stroke rides the tone ladder (rest `mid`, hover
 * `strong`, focus the foreground) and the states fill the ring's interior.
 * All states are expressed with `:has()` over the hidden checkbox - pure CSS,
 * no runtime.
 */
export default defineTemplate({
  type: "component",
  name: "Toggle",
  description: "a button that stays pressed. on is inverted.",
  style: stylePreamble,
  extensions: {
    react: {
      // It sets handlers on its own element, so it is a client module.
      client: true,
      imports: [helpers],
    },
    // Vue binds the pressed state with `v-model`, Svelte with `bind:pressed`.
    vue: { model: "pressed", imports: [helpers] },
    svelte: { imports: [helpers] },
  },
  props: {
    /** The toggle's text. */
    label: { type: "string" },
    /** `boxed` draws the ring around the label, three rows tall, which meets WCAG 2.5.8; `dense` is one bare row. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** Controlled pressed state (pair with `onPressedChange`). */
    pressed: {
      type: "boolean",
      bindable: {
        given: "givenPressed",
        report: "reportPressed",
        changeProp: "onPressedChange",
      },
    },
    /** Uncontrolled initial state - the native checkbox owns it from there. */
    defaultPressed: { type: "boolean" },
    /** Disables the hidden checkbox; the label rests at `mid`. */
    disabled: { type: "boolean" },
    /** The form field name. */
    name: { type: "string" },
    /** The value the form submits while the toggle is pressed. */
    value: { type: "string" },
    /** The hidden checkbox's id, for a label elsewhere to point at. */
    id: { type: "string" },
    /** Called with the new pressed state. */
    onPressedChange: { type: "(pressed: boolean) => void" },
  },
  children: [
    {
      type: "element",
      tag: "label",
      passthrough: true,
      // The change bubbles from the hidden checkbox to the root; a held
      // toggle is put back as it arrives (`changedChecked`).
      extensions: { bem: { block: "CharcellToggle" } },
      conditionalAttributes: [
        {
          condition: "variant === 'boxed'",
          attributes: { class: ["CharcellToggle--boxed"] },
        },
      ],
      events: [
        {
          name: "change",
          handler:
            "(event) => reportPressed(changedChecked(event, givenPressed))",
        },
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          "@include focusable": true,
          position: "relative",
          ...displayed("inline-flex"),
          alignItems: "center",
          // A control never pushes past its container: at the edge its label
          // clips, the way a terminal clips a line.
          maxWidth: "100%",
          overflow: "hidden",
          whiteSpace: "nowrap",
          cursor: "pointer",
          ...oneOf(["--boxed"], {
            // The focus pointer, in the padding cell.
            none: {
              padding: "0 1ch",
              "&::before": { "@include pointer": true },
            },
            // The boxed Button's box: the full-cell ring, which draws the
            // stroke and the state fills in its interior cells, under the
            // label in the root's own stacking context; the focus pointer
            // takes the label row's padding cell, inside the ring.
            "--boxed": {
              zIndex: "0",
              padding: "var(--charcell-row) 2ch",
              "&::before": { "@include ring": true },
              "&::after": {
                "@include pointer(1ch, var(--charcell-row))": true,
              },
            },
          }),
          "&__input": {
            position: "absolute",
            width: "1px",
            height: "1px",
            opacity: "0",
            pointerEvents: "none",
          },
          // States assign the slots the resting rules read; hover is guarded
          // against disabled.
          "&:where(:not(.CharcellToggle--boxed))": {
            "&:where(:not(:has(.CharcellToggle__input:disabled))):hover": {
              "@include wash": true,
            },
            "&:has(.CharcellToggle__input:focus-visible)::before": {
              "@include focus-cue": true,
            },
            "&:has(.CharcellToggle__input:checked)": {
              "@include inverted": true,
            },
            "&:has(.CharcellToggle__input:checked):where(:not(:has(.CharcellToggle__input:disabled))):hover":
              {
                "@include inverted(var(--charcell-strong))": true,
              },
          },
          // Boxed, the fills are the ring's and the label takes the
          // inverted text with them.
          "&--boxed:where(:not(:has(.CharcellToggle__input:disabled))):hover::before":
            {
              "@include wash": true,
              "--charcell-stroke--resolved": "var(--charcell-strong)",
            },
          "&--boxed:has(.CharcellToggle__input:focus-visible)::before": {
            "--charcell-stroke--resolved": "var(--charcell-foreground)",
          },
          "&--boxed:has(.CharcellToggle__input:focus-visible)::after": {
            "@include focus-cue": true,
          },
          "&--boxed:has(.CharcellToggle__input:disabled)::before": {
            "--charcell-stroke--resolved": "var(--charcell-faint)",
          },
          "&--boxed:has(.CharcellToggle__input:checked)": {
            "--charcell-text--resolved": "var(--charcell-background)",
            "--charcell-pointer-tone": "var(--charcell-background)",
          },
          "&--boxed:has(.CharcellToggle__input:checked)::before": {
            "--charcell-fill--resolved": "var(--charcell-foreground)",
            "--charcell-stroke--resolved": "var(--charcell-foreground)",
          },
          "&--boxed:has(.CharcellToggle__input:checked):where(:not(:has(.CharcellToggle__input:disabled))):hover::before":
            {
              "--charcell-fill--resolved": "var(--charcell-strong)",
            },
          // Disabled beats the rest.
          "&:has(.CharcellToggle__input:disabled)": {
            "@include disabled": true,
          },
        },
      },
      children: [
        {
          type: "element",
          tag: "input",
          passthrough: nativeInputAttributes,
          extensions: {
            bem: { element: "input" },
            // The change handler is bound on the label root, where the
            // checkbox's event arrives by bubbling - so the input itself
            // carries none. In controlled mode React expects the element with
            // `checked` to acknowledge that: `readOnly` does, without affecting
            // behavior (readonly is inert on checkboxes - clicks still fire
            // `change`, which the root handles).
            react: {
              attributes: {
                readOnly: {
                  $expression: "givenPressed !== undefined ? true : undefined",
                },
              },
            },
          },
          attributes: {
            type: "checkbox",
            id: { $expression: "id" },
            // Checked or its default, never both (see Checkbox).
            $spread: {
              $expression:
                "givenPressed !== undefined ? { checked: givenPressed } : { defaultChecked: defaultPressed }",
            },
            disabled: { $expression: "disabled" },
            name: { $expression: "name" },
            value: { $expression: "value" },
          },
        },
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
        /** Content after `label`, or the whole label without one. */
        { type: "slot" },
      ],
    },
  ],
});
