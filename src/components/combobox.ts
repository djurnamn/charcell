import { defineTemplate } from "@js-template-engine/types";
import { borderProp } from "../template-helpers/border";

const itemType =
  "interface ComboboxItem { value: string; label: string; disabled?: boolean }";

/** The list's items: the matches, or a row saying there are none. */
const listItems = {
  type: "conditional",
  conditions: [
    {
      statement: "if",
      condition: "matches.length === 0",
      children: [
        {
          type: "element",
          tag: "div",
          attributes: {
            class: [
              "CharcellSelectListbox__item",
              "CharcellSelectListbox__item--disabled",
            ],
            role: "presentation",
          },
          children: [
            {
              type: "text",
              expression:
                "resolveComboboxTranslations(translations).noMatchesMessage",
            },
          ],
        },
      ],
    },
    {
      statement: "else",
      children: [
        {
          type: "iteration",
          items: "matches",
          item: "item",
          key: "item.value",
          children: [
            {
              type: "element",
              tag: "div",
              attributes: {
                class: ["CharcellSelectListbox__item"],
                $spread: { $expression: "api.getItemProps({ item })" },
              },
              conditionalAttributes: [
                {
                  condition: "api.getItemState({ item }).highlighted",
                  attributes: {
                    class: ["CharcellSelectListbox__item--highlighted"],
                  },
                },
                {
                  condition: "api.getItemState({ item }).selected",
                  attributes: {
                    class: ["CharcellSelectListbox__item--selected"],
                  },
                },
                {
                  condition: "api.getItemState({ item }).disabled",
                  attributes: {
                    class: ["CharcellSelectListbox__item--disabled"],
                  },
                },
              ],
              children: [{ type: "text", expression: "item.label" }],
            },
          ],
        },
      ],
    },
  ],
} as const;

/**
 * `Combobox` - the **compound**: the hand-written `ComboboxDriver` (the Zag
 * `combobox` machine, narrowing the items to what the reader types)
 * composed with the `ComboboxField` and `SelectListbox` visuals. A Select
 * the reader can type in: for a long list, where finding an item by
 * scrolling would take long.
 *
 * The list narrows to the items whose label holds the typed text, anywhere
 * in it and case aside, and says so when none does
 * (`translations.noMatchesMessage`); the arrow keys move through the matches, enter
 * chooses, escape closes, and
 * the `▾` opens the whole list. The kit surface is single-choice with a
 * plain `string` value; leaving the field with no choice made puts the
 * chosen label back. Bare, as a Select: `id` lands on the input for a
 * `Field`'s `htmlFor`, and `inputProps` names a combobox with no visible
 * label (`{ 'aria-label': ... }`).
 *
 * The boxed list attaches to the field as a Select's to its trigger: its
 * top stroke row is the field's bottom one (its bottom row the field's top,
 * opened above), and a list wider than the field runs on past its corner.
 */
export default defineTemplate({
  type: "component",
  name: "Combobox",
  rest: { tag: "div" },
  description: "one choice out of a long list, narrowed as the reader types.",
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove } from 'charcell/scripts/positioning';",
        "import { resolveComboboxTranslations, type ComboboxTranslations } from 'charcell/scripts/translations';",
        "import type { Placement } from '@zag-js/popover';",
        "import { Portal } from '@zag-js/react';",
        "import { ComboboxDriver, type ComboboxItem } from './ComboboxDriver';",
        "import { ComboboxField } from './ComboboxField';",
        "import { SelectListbox } from './SelectListbox';",
        "import { ScrollArea } from './ScrollArea';",
      ],
    },
    // Vue and Svelte bind the value with `v-model` and `bind:value`.
    vue: {
      model: "value",
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove } from 'charcell/scripts/positioning';",
        "import { resolveComboboxTranslations, type ComboboxTranslations } from 'charcell/scripts/translations';",
        "import type { Placement } from '@zag-js/popover';",
        "import ComboboxDriver from './ComboboxDriver.vue';",
        "import ComboboxField from './ComboboxField.vue';",
        "import SelectListbox from './SelectListbox.vue';",
        "import ScrollArea from './ScrollArea.vue';",
        `export ${itemType};`,
      ],
    },
    svelte: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove } from 'charcell/scripts/positioning';",
        "import { resolveComboboxTranslations, type ComboboxTranslations } from 'charcell/scripts/translations';",
        "import type { Placement } from '@zag-js/popover';",
        "import ComboboxDriver from './ComboboxDriver.svelte';",
        "import ComboboxField from './ComboboxField.svelte';",
        "import SelectListbox from './SelectListbox.svelte';",
        "import ScrollArea from './ScrollArea.svelte';",
        "import { portal } from '@scaffold-ui-kit/helpers/runtime/svelte';",
        `export ${itemType};`,
      ],
    },
  },
  props: {
    /** The reading direction its keys and placement follow (`'rtl'` mirrors the arrow keys); the page's, once mounted, when unset. */
    direction: { type: "'ltr' | 'rtl'" },
    /** The choices, in order: `{ value, label, disabled }`. */
    items: { type: "ComboboxItem[]", required: true },
    /** Controlled chosen value; pair it with `onValueChange`. */
    value: {
      type: "string",
      bindable: {
        given: "givenValue",
        report: "reportValue",
        changeProp: "onValueChange",
      },
    },
    /** Uncontrolled initial value. */
    defaultValue: { type: "string" },
    /** Called with the newly chosen value. */
    onValueChange: { type: "(value: string) => void" },
    /** Shown in `mid` while the field is empty. */
    placeholder: { type: "string" },
    /** What the combobox says: the list's one row when nothing matches
     *  (`noMatchesMessage`) and its button's accessible name (`triggerLabel`). */
    translations: { type: "ComboboxTranslations" },
    /** The input's id, for a `Field`'s `htmlFor`. */
    id: { type: "string" },
    /** The form field name: the chosen item's value submits under it, from a
     *  hidden input, and text that chooses no item submits nothing. */
    name: { type: "string" },
    /** The id of the form the value belongs to, for a combobox outside its `<form>`. */
    form: { type: "string" },
    /** Merged over the machine's input props: an `aria-label` for a
     *  combobox with no visible label. */
    inputProps: { type: "Record<string, unknown>" },
    /** Disables the field. */
    disabled: { type: "boolean" },
    /** Gives each item two rows, its text in the first: a 32px target, which meets WCAG 2.5.8. One-row items miss it. */
    spacious: { type: "boolean" },
    /** `boxed` draws the ring and attaches the list to it; `dense` is one bare 16px row, as a dense Select, which misses WCAG 2.5.8's 24px target; boxed meets it. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** Where the list opens against the field, as a Zag placement (`'bottom-start'` when
     *  unset). */
    placement: { type: "Placement" },
    /** The locale the list narrows in, a BCP 47 tag (`'tr'`, `'sv'`): case and accents fold by its rules. The runtime's own when unset. */
    locale: { type: "string" },
    /** The style of every side of the boxed field's and list's rings: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the boxed field's and list's rings' start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the boxed field's and list's rings' top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the boxed field's and list's rings' top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the boxed field's and list's rings' end side, over `borderX` and `border`. */
    borderEnd: borderProp,
    /** The style of the boxed field's and list's rings' bottom side, over `borderY` and `border`. */
    borderBottom: borderProp,
    /** The style of the boxed field's and list's rings' start side, over `borderX` and `border`. */
    borderStart: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "ComboboxDriver",
      slotScope: ["api", "matches"],
      attributes: {
        direction: { $expression: "direction" },
        items: { $expression: "items" },
        value: { $expression: "givenValue" },
        defaultValue: { $expression: "defaultValue" },
        onValueChange: { $expression: "reportValue" },
        disabled: { $expression: "disabled" },
        placement: { $expression: "placement" },
        locale: { $expression: "locale" },
        id: { $expression: "id" },
        triggerLabel: {
          $expression: "resolveComboboxTranslations(translations).triggerLabel",
        },
      },
      children: [
        {
          type: "element",
          tag: "ComboboxField",
          attributes: {
            $spread: {
              $expression: "mergeRootProps(api.getControlProps(), rest)",
            },
            inputProps: {
              $expression:
                "{ ...api.getInputProps(), placeholder, ...inputProps }",
            },
            buttonProps: { $expression: "api.getTriggerProps()" },
            variant: { $expression: "variant" },
            open: { $expression: "api.open" },
            above: {
              $expression: "opensAbove(api.getContentProps())",
            },
            border: { $expression: "border" },
            borderX: { $expression: "borderX" },
            borderY: { $expression: "borderY" },
            borderTop: { $expression: "borderTop" },
            borderEnd: { $expression: "borderEnd" },
            borderBottom: { $expression: "borderBottom" },
            borderStart: { $expression: "borderStart" },
          },
        },
        // The value the form submits: the chosen item's, never the text.
        {
          type: "conditional",
          conditions: [
            {
              statement: "if",
              condition: "name",
              children: [
                {
                  type: "element",
                  tag: "input",
                  attributes: {
                    type: "hidden",
                    name: { $expression: "name" },
                    form: { $expression: "form" },
                    value: { $expression: "api.value[0] ?? ''" },
                    disabled: { $expression: "disabled" },
                  },
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
              condition: "api.open",
              children: [
                {
                  type: "fragment",
                  extensions: {
                    react: { tag: "Portal" },
                    vue: { tag: "Teleport", attributes: { to: "body" } },
                  },
                  children: [
                    {
                      type: "element",
                      tag: "div",
                      // svelte moves the positioner itself to body: the portal around it
                      // Renders only its children there.
                      extensions: {
                        svelte: {
                          attributes: {
                            "use:portal": { $expression: "'body'" },
                          },
                        },
                      },
                      attributes: {
                        class: ["CharcellCombobox__positioner"],
                        $spread: { $expression: "api.getPositionerProps()" },
                      },
                      children: [
                        {
                          type: "element",
                          tag: "SelectListbox",
                          attributes: {
                            spacious: { $expression: "spacious" },
                            attached: { $expression: "variant !== 'dense'" },
                            border: { $expression: "border" },
                            borderX: { $expression: "borderX" },
                            borderY: { $expression: "borderY" },
                            borderTop: { $expression: "borderTop" },
                            borderEnd: { $expression: "borderEnd" },
                            borderBottom: { $expression: "borderBottom" },
                            borderStart: { $expression: "borderStart" },
                            above: {
                              $expression: "opensAbove(api.getContentProps())",
                            },
                          },
                          children: [
                            {
                              type: "element",
                              tag: "ScrollArea",
                              // The listbox is the area's content, its items'
                              // own parent; the input keeps focus and points
                              // at the highlighted item, which the area keeps
                              // in view.
                              attributes: {
                                focusable: { $expression: "false" },
                                contentProps: {
                                  $expression: "api.getContentProps()",
                                },
                              },
                              children: [listItems],
                            },
                          ],
                        },
                      ],
                    },
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
