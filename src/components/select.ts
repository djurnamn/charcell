import { defineTemplate } from "@js-template-engine/types";
import { borderProp } from "../template-helpers/border";

/**
 * `Select` - the **compound**: the pure `SelectDriver` (behavior) composed
 * with the `SelectTrigger` and `SelectListbox` visuals. Pure declarative
 * composition: it consumes the driver's scoped slot (`slotScope: ['api']`),
 * renders the trigger inline (value text + `▾` caret, spreading the trigger
 * props), and when open portals the listbox inside the Zag positioner,
 * iterating `items` with each item's Zag handles spread on and its machine
 * state mirrored onto BEM element modifiers (highlighted / selected /
 * disabled) - states style via classes, never third-party data attributes.
 *
 * The kit surface is single-select: `items` + one `value`/`defaultValue`/
 * `onValueChange`, a string or a number; a number-valued item comes back as
 * its number.
 *
 * Bare like TextInput: it carries no label, and a
 * `Field` names it - `id` lands on the trigger, the Field's `htmlFor` points
 * at it. `role="combobox"` takes no name from its content, so the trigger
 * names itself by reference: the Field's label (`<id>-label`), then the value
 * it shows, read as "framework vue". A Select with no visible label (one per
 * table row) names itself through `triggerProps` (`{ 'aria-label': ... }`),
 * the record merged over the machine's trigger props. `name` renders the
 * machine's hidden `<select>`, so the value submits with a form (`form` for
 * a form elsewhere, `required` for its validation). The `▾` caret
 * is decoration, hidden from assistive technology.
 *
 * Like a native `<select>`, the trigger is as wide as its longest item (each
 * label is laid in the same grid cell, invisibly, beside the value), and the
 * listbox opens at exactly the trigger's width. `fit: 'value'` sizes the
 * trigger to its chosen value instead, so a short value sits by its `▾`; the
 * listbox opens at least that wide and as wide as its items. The boxed
 * listbox is attached: its top stroke row is the trigger's bottom one (its
 * bottom row the trigger's top, opened above), one window growing out of the
 * control; wider than the trigger, the listbox's line runs on past the
 * trigger's corner, which meets it as `┴` (`┬` above).
 */
export default defineTemplate({
  type: "component",
  name: "Select",
  rest: { tag: "button" },
  description:
    "one choice out of a list, in a listbox drawn like the rest of charcell.",
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove } from 'charcell/scripts/positioning';",
        "import type { Placement } from '@zag-js/popover';",
        "import { Portal } from '@zag-js/react';",
        "import { SelectDriver, type SelectItem } from './SelectDriver';",
        "import { SelectTrigger } from './SelectTrigger';",
        "import { SelectListbox } from './SelectListbox';",
        "import { ScrollArea } from './ScrollArea';",
        "import { labelListbox, mergeTriggerProps, selectLabelId, selectValueId } from '@scaffold-ui-kit/helpers/zag';",
      ],
    },
    // Vue and Svelte bind the value with `v-model` and `bind:value`, and the
    // open state with `v-model:open` and `bind:open`.
    vue: {
      model: "value",
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove } from 'charcell/scripts/positioning';",
        "import type { Placement } from '@zag-js/popover';",
        "import SelectDriver from './SelectDriver.vue';",
        "import SelectTrigger from './SelectTrigger.vue';",
        "import SelectListbox from './SelectListbox.vue';",
        "import ScrollArea from './ScrollArea.vue';",
        "import { labelListbox, mergeTriggerProps, selectLabelId, selectValueId } from '@scaffold-ui-kit/helpers/zag';",
        "export interface SelectItem { value: string | number; label: string; disabled?: boolean }",
      ],
    },
    svelte: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove } from 'charcell/scripts/positioning';",
        "import type { Placement } from '@zag-js/popover';",
        "import SelectDriver from './SelectDriver.svelte';",
        "import SelectTrigger from './SelectTrigger.svelte';",
        "import SelectListbox from './SelectListbox.svelte';",
        "import ScrollArea from './ScrollArea.svelte';",
        "import { labelListbox, mergeTriggerProps, selectLabelId, selectValueId } from '@scaffold-ui-kit/helpers/zag';",
        "import { portal } from '@scaffold-ui-kit/helpers/runtime/svelte';",
        "export interface SelectItem { value: string | number; label: string; disabled?: boolean }",
      ],
    },
  },
  props: {
    /** The reading direction its keys and placement follow (`'rtl'` mirrors the arrow keys); the page's, once mounted, when unset. */
    direction: { type: "'ltr' | 'rtl'" },
    /** The choices, in order: `{ value, label, disabled }`. */
    items: { type: "SelectItem[]", required: true },
    /** Controlled selected value; pair it with `onValueChange`. A number-valued item's value is a number. */
    value: {
      type: "string | number",
      bindable: {
        given: "givenValue",
        report: "reportValue",
        changeProp: "onValueChange",
      },
    },
    /** Uncontrolled initial value. */
    defaultValue: { type: "string | number" },
    /** Called with the newly selected value, a number for a number-valued item. */
    onValueChange: { type: "(value: string | number) => void" },
    /** Controlled open state; pair it with `onOpenChange`. */
    open: {
      type: "boolean",
      bindable: {
        given: "givenOpen",
        report: "reportOpen",
        changeProp: "onOpenChange",
      },
    },
    /** Uncontrolled initial open state. */
    defaultOpen: { type: "boolean" },
    /** Called with the next open state on every open or close. */
    onOpenChange: { type: "(open: boolean) => void" },
    /** Closes the listbox once an item is chosen; `false` keeps it open while the reader browses. */
    closeOnSelect: { type: "boolean", default: true },
    /** Shown in `mid` while nothing is selected. */
    placeholder: { type: "string" },
    /** The trigger's id, for a `Field`'s `htmlFor`; the trigger is then
     *  named by the Field's label, `<id>-label`. */
    id: { type: "string" },
    /** The form field name; the value submits through a hidden `<select>`. */
    name: { type: "string" },
    /** The value is required for the form to submit. */
    required: { type: "boolean" },
    /** The id of the form the value belongs to, for a select outside its `<form>`. */
    form: { type: "string" },
    /** Merged over the machine's trigger props: an `aria-label` for a Select
     *  with no visible label. */
    triggerProps: { type: "Record<string, unknown>" },
    /** Disables the trigger. */
    disabled: { type: "boolean" },
    /** Gives each item two rows, its text in the first: a 32px target, which meets WCAG 2.5.8. One-row items miss it. */
    spacious: { type: "boolean" },
    /** `boxed` draws the ring and attaches the listbox to it; `dense` is one bare 16px row, which misses WCAG 2.5.8's 24px target; boxed meets it. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** The trigger's width: its longest item's (`items`), as a native select's, or its chosen value's (`value`), the listbox still opening as wide as its items. */
    fit: { type: "'items' | 'value'", default: "items" },
    /** Where the listbox opens against its trigger, as a Zag placement (`'bottom-start'` when
     *  unset). */
    placement: { type: "Placement" },
    /** The style of every side of the boxed trigger's and listbox's rings: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the boxed trigger's and listbox's rings's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the boxed trigger's and listbox's rings's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the boxed trigger's and listbox's rings's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the boxed trigger's and listbox's rings's end side, over `borderX` and `border`. */
    borderEnd: borderProp,
    /** The style of the boxed trigger's and listbox's rings's bottom side, over `borderY` and `border`. */
    borderBottom: borderProp,
    /** The style of the boxed trigger's and listbox's rings's start side, over `borderX` and `border`. */
    borderStart: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "SelectDriver",
      slotScope: ["api"],
      attributes: {
        direction: { $expression: "direction" },
        items: { $expression: "items" },
        value: { $expression: "givenValue" },
        defaultValue: { $expression: "defaultValue" },
        onValueChange: { $expression: "reportValue" },
        disabled: { $expression: "disabled" },
        name: { $expression: "name" },
        required: { $expression: "required" },
        form: { $expression: "form" },
        closeOnSelect: { $expression: "closeOnSelect" },
        open: { $expression: "givenOpen" },
        defaultOpen: { $expression: "defaultOpen" },
        onOpenChange: { $expression: "reportOpen" },
        placement: { $expression: "placement" },
        id: { $expression: "id" },
        fit: { $expression: "fit" },
      },
      children: [
        {
          type: "element",
          tag: "SelectTrigger",
          attributes: {
            $spread: {
              $expression:
                "mergeRootProps(mergeTriggerProps(api.getTriggerProps(), triggerProps, { labelId: id ? selectLabelId(id) : undefined, valueId: selectValueId(api.getTriggerProps().id) }), rest)",
            },
            variant: { $expression: "variant" },
            open: { $expression: "api.open" },
            above: {
              $expression: "opensAbove(api.getTriggerProps())",
            },
            border: { $expression: "border" },
            borderX: { $expression: "borderX" },
            borderY: { $expression: "borderY" },
            borderTop: { $expression: "borderTop" },
            borderEnd: { $expression: "borderEnd" },
            borderBottom: { $expression: "borderBottom" },
            borderStart: { $expression: "borderStart" },
          },
          children: [
            {
              type: "element",
              tag: "span",
              attributes: { class: ["CharcellSelectTrigger__values"] },
              children: [
                {
                  type: "element",
                  tag: "span",
                  attributes: {
                    class: ["CharcellSelectTrigger__value"],
                    id: {
                      $expression: "selectValueId(api.getTriggerProps().id)",
                    },
                  },
                  conditionalAttributes: [
                    {
                      condition: "!api.valueAsString",
                      attributes: {
                        class: ["CharcellSelectTrigger__value--placeholder"],
                      },
                    },
                  ],
                  children: [
                    {
                      type: "text",
                      expression:
                        "api.valueAsString || (placeholder !== undefined ? placeholder : '')",
                    },
                  ],
                },
                {
                  type: "conditional",
                  conditions: [
                    {
                      statement: "if",
                      condition: "fit !== 'value'",
                      children: [
                        {
                          type: "iteration",
                          items: "items",
                          item: "item",
                          key: "item.value",
                          children: [
                            {
                              type: "element",
                              tag: "span",
                              attributes: {
                                class: ["CharcellSelectTrigger__sizer"],
                                "aria-hidden": "true",
                              },
                              children: [
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
            },
            {
              type: "element",
              tag: "span",
              attributes: {
                class: ["CharcellSelectTrigger__caret"],
                "aria-hidden": "true",
              },
              children: [{ type: "text", content: "▾" }],
            },
          ],
        },
        {
          type: "conditional",
          conditions: [
            {
              statement: "if",
              condition: "name",
              children: [
                {
                  type: "element",
                  tag: "select",
                  attributes: {
                    class: ["CharcellSelect__native"],
                    $spread: { $expression: "api.getHiddenSelectProps()" },
                  },
                  children: [
                    {
                      type: "iteration",
                      items: "items",
                      item: "item",
                      key: "item.value",
                      children: [
                        {
                          type: "element",
                          tag: "option",
                          attributes: {
                            class: ["CharcellSelect__option"],
                            value: { $expression: "item.value" },
                            disabled: { $expression: "item.disabled" },
                          },
                          children: [
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
                        class: ["CharcellSelect__positioner"],
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
                              $expression: "opensAbove(api.getTriggerProps())",
                            },
                          },
                          children: [
                            {
                              type: "element",
                              tag: "ScrollArea",
                              // The listbox is the area's content, its items'
                              // own parent: it keeps focus and points at its
                              // active item, which the area keeps in view.
                              attributes: {
                                focusable: { $expression: "false" },
                                contentProps: {
                                  $expression:
                                    "labelListbox(api.getContentProps(), { ...api.getTriggerProps(), ...triggerProps }, id ? selectLabelId(id) : undefined)",
                                },
                              },
                              children: [
                                {
                                  type: "iteration",
                                  items: "items",
                                  item: "item",
                                  key: "item.value",
                                  children: [
                                    {
                                      type: "element",
                                      tag: "div",
                                      attributes: {
                                        class: ["CharcellSelectListbox__item"],
                                        $spread: {
                                          $expression:
                                            "api.getItemProps({ item })",
                                        },
                                      },
                                      conditionalAttributes: [
                                        {
                                          condition:
                                            "api.getItemState({ item }).highlighted",
                                          attributes: {
                                            class: [
                                              "CharcellSelectListbox__item--highlighted",
                                            ],
                                          },
                                        },
                                        {
                                          condition:
                                            "api.getItemState({ item }).selected",
                                          attributes: {
                                            class: [
                                              "CharcellSelectListbox__item--selected",
                                            ],
                                          },
                                        },
                                        {
                                          condition:
                                            "api.getItemState({ item }).disabled",
                                          attributes: {
                                            class: [
                                              "CharcellSelectListbox__item--disabled",
                                            ],
                                          },
                                        },
                                      ],
                                      children: [
                                        {
                                          type: "text",
                                          expression: "item.label",
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
            },
          ],
        },
      ],
    },
  ],
});
