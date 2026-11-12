import { defineTemplate } from "@js-template-engine/types";
import { nativeInputAttributes } from "../template-helpers/native-input";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";
const helpers = "import { changedChecked } from 'charcell/scripts/form';";

/**
 * `Checkbox` - a labeled checkbox in terminal cells: the
 * check cell `[×]` / `[ ]` (and `[-]` while indeterminate) before its label.
 * A real (visually hidden) checkbox holds the state, so it is native:
 * uncontrolled by default (`defaultChecked` seeds it, clicking just works),
 * controlled through `checked` + `onCheckedChange`, which hands over the
 * checked state as a boolean. Keyboard, form and assistive-technology
 * semantics come from the checkbox itself, which takes a consumer's ARIA,
 * form and focus attributes and its handlers, the label keeping the class,
 * style and data attributes; the check cell is drawn text, hidden from
 * assistive technology.
 *
 * A checkbox and a Toggle hold the same boolean in different roles: the
 * Toggle is the pressed chip (on is the inversion), the checkbox the
 * form control, whose value the mark carries - so checking it does not
 * invert. The row takes hover's wash, focus the pointer `❯` in its padding
 * cell, disabled rests at `mid`.
 */
export default defineTemplate({
  type: "component",
  name: "Checkbox",
  description:
    "a checkbox drawn as [×], [ ] or [-]. the mark shows the value, so checking it does not invert it.",
  style: stylePreamble,
  extensions: {
    react: {
      // It sets handlers on its own element, so it is a client module.
      client: true,
      imports: [helpers],
    },
    // Vue binds the checked state with `v-model`, Svelte with `bind:checked`.
    vue: { model: "checked", imports: [helpers] },
    svelte: { imports: [helpers] },
  },
  props: {
    /** The text after the check cell. */
    label: { type: "string" },
    /** Controlled checked state (pair with `onCheckedChange`). */
    checked: {
      type: "boolean",
      bindable: {
        given: "givenChecked",
        report: "reportChecked",
        changeProp: "onCheckedChange",
      },
    },
    /** Uncontrolled initial state - the native checkbox owns it from there. */
    defaultChecked: { type: "boolean" },
    /** Neither checked nor unchecked, shown as `[-]`: a box over a set whose
     *  members are partly checked. A click clears it. */
    indeterminate: { type: "boolean" },
    /** Disables the native checkbox; the row rests at `mid`. */
    disabled: { type: "boolean" },
    /** The form field name. */
    name: { type: "string" },
    /** The value the form submits while the box is checked. */
    value: { type: "string" },
    /** The checkbox's id, for a label elsewhere to point at. */
    id: { type: "string" },
    /** Called with the new checked state on every change. */
    onCheckedChange: { type: "(checked: boolean) => void" },
  },
  children: [
    {
      type: "element",
      tag: "label",
      passthrough: true,
      // A held box is put back as the change arrives (`changedChecked`).
      extensions: { bem: { block: "CharcellCheckbox" } },
      events: [
        {
          name: "change",
          handler:
            "(event) => reportChecked(changedChecked(event, givenChecked))",
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
          gap: "1ch",
          padding: "0 1ch",
          maxWidth: "100%",
          overflow: "hidden",
          whiteSpace: "nowrap",
          cursor: "pointer",
          "&__input": {
            position: "absolute",
            width: "1px",
            height: "1px",
            opacity: "0",
            pointerEvents: "none",
          },
          // The check cell: the mark between brackets, read from the mark slot
          // the states assign.
          // The focus pointer, in the padding cell.
          "&::before": { "@include pointer": true },
          "&__box::before": {
            content: '"[" var(--charcell-checkbox--mark, " ") "]"',
            whiteSpace: "pre",
          },
          // States assign the slots the resting rules read; hover is guarded
          // against disabled.
          "&:where(:not(:has(.CharcellCheckbox__input:disabled))):hover": {
            "@include wash": true,
          },
          "&:has(.CharcellCheckbox__input:focus-visible)::before": {
            "@include focus-cue": true,
          },
          "&:has(.CharcellCheckbox__input:checked)": {
            "--charcell-checkbox--mark": '"\\d7"',
          },
          "&:has(.CharcellCheckbox__input:indeterminate)": {
            "--charcell-checkbox--mark": '"-"',
          },
          "&:has(.CharcellCheckbox__input:disabled)": {
            "@include disabled": true,
          },
        },
      },
      children: [
        {
          type: "element",
          tag: "input",
          passthrough: nativeInputAttributes,
          attributes: {
            type: "checkbox",
            id: { $expression: "id" },
            // Checked or its default, never both: Vue sets a `checked` bound
            // to undefined to false, which marks the input as changed, so its
            // `defaultChecked` no longer checks it.
            $spread: {
              $expression:
                "givenChecked !== undefined ? { checked: givenChecked } : { defaultChecked }",
            },
            disabled: { $expression: "disabled" },
            name: { $expression: "name" },
            value: { $expression: "value" },
            // A property with no attribute, which each target sets on the
            // element.
            indeterminate: { $expression: "indeterminate" },
          },
          extensions: {
            bem: { element: "input" },
            // The change handler is bound on the label root, where the
            // checkbox's event arrives by bubbling; controlled, React expects
            // the element with `checked` to acknowledge that (see Toggle).
            react: {
              attributes: {
                readOnly: {
                  $expression: "givenChecked !== undefined ? true : undefined",
                },
              },
            },
          },
        },
        {
          type: "element",
          tag: "span",
          extensions: { bem: { element: "box" } },
          attributes: {
            "aria-hidden": "true",
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
