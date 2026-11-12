import { defineTemplate } from "@js-template-engine/types";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";

const helpers = "import { changedValue } from 'charcell/scripts/form';";

const itemType =
  "interface RadioGroupItem { value: string; label: string; disabled?: boolean }";

/**
 * `RadioGroup` - one choice from a few: `items` render as native radios sharing `name`, each drawn as the
 * radio cell `(•)` / `( )` before its label. The radios hold the state, so the
 * group is uncontrolled by default (`defaultValue` seeds it, clicking and the
 * arrow keys just work) and controlled through `value` + `onValueChange`,
 * which hands over the chosen value. The radio cell is drawn text, hidden
 * from assistive technology.
 *
 * The root is the `radiogroup`, named by its `label` (`<name>-label`), laid
 * out like a Field: the label in the mid gray beside the items, which stack
 * (`vertical`, the default) or run in a row (`horizontal`). Choosing does not
 * invert - the mark carries the value; rows take hover's wash, focus the
 * pointer `❯` in the row's padding cell, disabled rests at `mid`.
 */
export default defineTemplate({
  type: "component",
  name: "RadioGroup",
  description: "one choice out of a few, drawn as ( ) and (•).",
  style: stylePreamble,
  extensions: {
    react: {
      // It sets handlers on its own element, so it is a client module.
      client: true,
      imports: [helpers, `export ${itemType};`],
    },
    // Vue binds the chosen value with `v-model`, Svelte with `bind:value`.
    vue: { model: "value", imports: [helpers, `export ${itemType};`] },
    svelte: { imports: [helpers, `export ${itemType};`] },
  },
  props: {
    /** The radios' shared form name; also the root of the label's id. */
    name: { type: "string", required: true },
    /** The choices, in order: `{ value, label, disabled }`. */
    items: { type: "RadioGroupItem[]", required: true },
    /** The group's name, in the mid gray beside the items. */
    label: { type: "string" },
    /** Controlled chosen value (pair with `onValueChange`). */
    value: {
      type: "string",
      bindable: {
        given: "givenValue",
        report: "reportValue",
        changeProp: "onValueChange",
      },
    },
    /** Uncontrolled initial value - the native radios own it from there. */
    defaultValue: { type: "string" },
    /** Disables every radio; the rows rest at `mid`. */
    disabled: { type: "boolean" },
    /** `vertical` stacks the items; `horizontal` runs them in a row. */
    orientation: { type: "'vertical' | 'horizontal'", default: "vertical" },
    /** Called with the chosen value. */
    onValueChange: { type: "(value: string) => void" },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      // A held group is put back as the change arrives (`changedValue`).
      extensions: { bem: { block: "CharcellRadioGroup" } },
      events: [
        {
          name: "change",
          handler: "(event) => reportValue(changedValue(event, givenValue))",
        },
      ],
      conditionalAttributes: [
        {
          condition: "label",
          attributes: { class: ["CharcellRadioGroup--labeled"] },
        },
        {
          condition: "orientation === 'horizontal'",
          attributes: { class: ["CharcellRadioGroup--horizontal"] },
        },
      ],
      attributes: {
        role: "radiogroup",
        "aria-labelledby": {
          $expression: "label ? name + '-label' : undefined",
        },
        "aria-disabled": { $expression: "disabled ? true : undefined" },
        style: {
          "@include cell": true,
          "@include paint": true,
          ...displayed("inline-grid"),
          alignItems: "start",
          columnGap: "1ch",
          maxWidth: "100%",
          ...oneOf(["--labeled"], {
            none: { gridTemplateColumns: "minmax(0, 1fr)" },
            "--labeled": { gridTemplateColumns: "max-content minmax(0, 1fr)" },
          }),
          "&__label": { color: "var(--charcell-mid)" },
          ...oneOf(["--horizontal"], {
            none: {
              "&__items": {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              },
            },
            "--horizontal": {
              "&__items": {
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
              },
            },
          }),
          "&__item": {
            "@include paint": true,
            "@include focusable": true,
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: "1ch",
            padding: "0 1ch",
            maxWidth: "100%",
            overflow: "hidden",
            whiteSpace: "nowrap",
            cursor: "pointer",
          },
          "&__input": {
            position: "absolute",
            width: "1px",
            height: "1px",
            opacity: "0",
            pointerEvents: "none",
          },
          // The focus pointer, in the item's padding cell.
          "&__item::before": { "@include pointer": true },
          "&__mark::before": {
            content: '"(" var(--charcell-radio-group--mark, " ") ")"',
            whiteSpace: "pre",
          },
          "&__item:where(:not(:has(.CharcellRadioGroup__input:disabled))):hover":
            {
              "@include wash": true,
            },
          "&__item:has(.CharcellRadioGroup__input:focus-visible)::before": {
            "@include focus-cue": true,
          },
          "&__item:has(.CharcellRadioGroup__input:checked)": {
            // `•` as its escape: a literal non-ascii character makes Sass lead
            // the sheet with a byte-order mark, ahead of the layer order.
            "--charcell-radio-group--mark": '"\\2022"',
          },
          "&__item:has(.CharcellRadioGroup__input:disabled)": {
            "@include disabled": true,
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
              children: [
                {
                  type: "element",
                  tag: "span",
                  extensions: { bem: { element: "label" } },
                  attributes: {
                    id: { $expression: "name + '-label'" },
                  },
                  children: [{ type: "text", expression: "label" }],
                },
              ],
            },
          ],
        },
        {
          type: "element",
          tag: "div",
          extensions: { bem: { element: "items" } },
          children: [
            {
              type: "iteration",
              items: "items",
              item: "item",
              key: "item.value",
              children: [
                {
                  type: "element",
                  tag: "label",
                  extensions: { bem: { element: "item" } },
                  children: [
                    {
                      type: "element",
                      tag: "input",
                      extensions: {
                        bem: { element: "input" },
                        // Controlled, React expects the element with `checked`
                        // to acknowledge that the change is handled elsewhere.
                        react: {
                          attributes: {
                            readOnly: {
                              $expression:
                                "givenValue !== undefined ? true : undefined",
                            },
                          },
                        },
                      },
                      attributes: {
                        type: "radio",
                        name: { $expression: "name" },
                        value: { $expression: "item.value" },
                        // Checked or its default, never both (see Checkbox).
                        $spread: {
                          $expression:
                            "givenValue !== undefined ? { checked: givenValue === item.value } : { defaultChecked: defaultValue === item.value }",
                        },
                        disabled: {
                          $expression: "disabled || item.disabled",
                        },
                      },
                    },
                    {
                      type: "element",
                      tag: "span",
                      extensions: { bem: { element: "mark" } },
                      attributes: {
                        "aria-hidden": "true",
                      },
                    },
                    { type: "text", expression: "item.label" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
