import { defineTemplate } from "@js-template-engine/types";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";

// What the default slot hands a control that takes it: the id the label
// points at, the message and description it is described by, and whether
// the message marks it invalid.
const controlType =
  "interface FieldControl { id: string | undefined; 'aria-describedby': string | undefined; 'aria-invalid': true | undefined }";
const control = `{ id: htmlFor, 'aria-describedby': [errorMessage && htmlFor ? htmlFor + '-error' : '', description && htmlFor ? htmlFor + '-description' : ''].filter(Boolean).join(' ') || undefined, 'aria-invalid': errorMessage ? (true as const) : undefined }`;

/**
 * `Field` - a labeled control: the label,
 * the control in the default slot, and below the control an optional
 * validation message and an optional description. The controls are bare
 * (TextInput, Select) and the Field names them: `htmlFor` is the control's
 * `id`, and the label points at it.
 *
 *   <Field label="name" htmlFor="name"><TextInput id="name" /></Field>
 *
 * The parts take ids derived from `htmlFor` - `<id>-label`, `<id>-error`,
 * `<id>-description` - so a control can reference them: Select names its
 * combobox by `<id>-label` itself. The default slot also takes a function of
 * `control` - the id, `aria-describedby` naming the message and the
 * description, and `aria-invalid` while there is a message - to spread on the
 * control, so a screen reader reads them with it:
 *
 *   <Field label="name" htmlFor="name" errorMessage="give us your name">
 *     {({ control }) => <TextInput {...control} />}
 *   </Field>
 *
 * With no `htmlFor`
 * the label is plain text; a group of controls names itself by `labelId`
 * (`aria-labelledby`), the id the label then carries.
 *
 * On the grid: `label  [control]` on one row, the label in the mid gray; the
 * message and the description sit under the control, the message first. With
 * no color to carry it, the message says what it is in text: `error:` leads
 * it, at the foreground tone, where the description rests at `mid`.
 */
export default defineTemplate({
  type: "component",
  name: "Field",
  description:
    "a label, a description and an error message for one control, linked to it by id.",
  style: stylePreamble,
  extensions: {
    react: {
      imports: [
        "import { resolveFieldTranslations, type FieldTranslations } from 'charcell/scripts/translations';",
        `export ${controlType};`,
      ],
    },
    vue: {
      imports: [
        "import { resolveFieldTranslations, type FieldTranslations } from 'charcell/scripts/translations';",
        `export ${controlType};`,
      ],
    },
    svelte: {
      imports: [
        "import { resolveFieldTranslations, type FieldTranslations } from 'charcell/scripts/translations';",
        `export ${controlType};`,
      ],
    },
  },
  props: {
    /** The label text, on the control's row in the mid gray. */
    label: { type: "string" },
    /** The control's id: the label points at it, and the parts' ids derive from it. */
    htmlFor: { type: "string" },
    /** The label's id, for a group to reference; defaults to `<htmlFor>-label`. */
    labelId: { type: "string" },
    /** Explanatory text under the control. */
    description: { type: "string" },
    /** A validation message under the control, led by `error:`. */
    errorMessage: { type: "string" },
    /** What the field says around the control: the error message's prefix
     *  (`errorPrefix`, `error: ` by default). */
    translations: { type: "FieldTranslations" },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellField" } },
      conditionalAttributes: [
        {
          condition: "label",
          attributes: { class: ["CharcellField--labeled"] },
        },
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          ...displayed("inline-grid"),
          alignItems: "center",
          columnGap: "1ch",
          // The field shrinks to its container, and its control with it.
          maxWidth: "100%",
          ...oneOf(["--labeled"], {
            none: { gridTemplateColumns: "minmax(0, 1fr)" },
            "--labeled": { gridTemplateColumns: "max-content minmax(0, 1fr)" },
          }),
          "&__label": {
            gridColumn: "1",
            color: "var(--charcell-mid)",
          },
          // The control, the message and the description share the last column.
          "&__control": {
            gridColumn: "-2",
            display: "flex",
            alignItems: "center",
            gap: "1ch",
          },
          "&__message": {
            gridColumn: "-2",
            color: "var(--charcell-foreground)",
          },
          "&__description": { gridColumn: "-2", color: "var(--charcell-mid)" },
        },
      },
      children: [
        {
          type: "conditional",
          conditions: [
            {
              statement: "if",
              condition: "label && htmlFor",
              children: [
                {
                  type: "element",
                  tag: "label",
                  extensions: { bem: { element: "label" } },
                  attributes: {
                    for: { $expression: "htmlFor" },
                    id: { $expression: "labelId ?? htmlFor + '-label'" },
                  },
                  children: [{ type: "text", expression: "label" }],
                },
              ],
            },
            {
              statement: "else-if",
              condition: "label",
              children: [
                {
                  type: "element",
                  tag: "span",
                  extensions: { bem: { element: "label" } },
                  attributes: {
                    id: { $expression: "labelId" },
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
          extensions: { bem: { element: "control" } },
          children: [
            /** The control the label names. As a function, it gets `control`: the id, the `aria-describedby` and the `aria-invalid` to spread on the control. */
            {
              type: "slot",
              exposes: { control: { value: control, type: "FieldControl" } },
            },
          ],
        },
        {
          type: "conditional",
          conditions: [
            {
              statement: "if",
              condition: "errorMessage",
              children: [
                {
                  type: "element",
                  tag: "div",
                  extensions: { bem: { element: "message" } },
                  attributes: {
                    id: {
                      $expression: "htmlFor ? htmlFor + '-error' : undefined",
                    },
                  },
                  children: [
                    {
                      type: "text",
                      expression:
                        "resolveFieldTranslations(translations).errorPrefix + errorMessage",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "conditional",
          conditions: [
            {
              statement: "if",
              condition: "description",
              children: [
                {
                  type: "element",
                  tag: "div",
                  extensions: { bem: { element: "description" } },
                  attributes: {
                    id: {
                      $expression:
                        "htmlFor ? htmlFor + '-description' : undefined",
                    },
                  },
                  children: [{ type: "text", expression: "description" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
