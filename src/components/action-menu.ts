import { defineTemplate } from "@js-template-engine/types";
import { borderProp } from "../template-helpers/border";

const itemType =
  "interface ActionMenuItem { value: string; label?: string; disabled?: boolean; separator?: boolean }";

/**
 * `ActionMenu` - the **compound**: the pure `ActionMenuDriver` (behavior) composed with
 * the `ActionMenuList` visual: a list of actions
 * opened from a trigger. `items` are `{ value, label, disabled }`, or
 * `{ value, separator: true }` for a break between groups (an inset charcell
 * `Separator`, `╶──╴`, clear of the ring); choosing one calls `onSelect` with its value and closes the
 * menu.
 *
 * Like Popover, the **`trigger`** slot is scoped: the call site spreads
 * `triggerProps` onto its own Button. The list is named by its trigger, or by
 * `label`. It opens flush below the trigger.
 */
export default defineTemplate({
  type: "component",
  name: "ActionMenu",
  rest: { tag: "div" },
  description:
    "a list of actions that opens from a button, with separators between groups.",
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove, placementOf } from 'charcell/scripts/positioning';",
        "import type { Placement } from '@zag-js/popover';",
        "import { Portal } from '@zag-js/react';",
        "import { ActionMenuDriver } from './ActionMenuDriver';",
        "import { attachedAt } from 'charcell/scripts/attach';",
        "import { ActionMenuList } from './ActionMenuList';",
        "import { ScrollArea } from './ScrollArea';",
        "import { Separator } from './Separator';",
        `export ${itemType};`,
      ],
    },
    // Vue and Svelte bind the open state with `v-model:open` and `bind:open`.
    vue: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove, placementOf } from 'charcell/scripts/positioning';",
        "import type { Placement } from '@zag-js/popover';",
        "import ActionMenuDriver from './ActionMenuDriver.vue';",
        "import { attachedAt } from 'charcell/scripts/attach';",
        "import ActionMenuList from './ActionMenuList.vue';",
        "import ScrollArea from './ScrollArea.vue';",
        "import Separator from './Separator.vue';",
        `export ${itemType};`,
      ],
    },
    svelte: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove, placementOf } from 'charcell/scripts/positioning';",
        "import type { Placement } from '@zag-js/popover';",
        "import ActionMenuDriver from './ActionMenuDriver.svelte';",
        "import { attachedAt } from 'charcell/scripts/attach';",
        "import ActionMenuList from './ActionMenuList.svelte';",
        "import ScrollArea from './ScrollArea.svelte';",
        "import Separator from './Separator.svelte';",
        "import { portal } from '@scaffold-ui-kit/helpers/runtime/svelte';",
        `export ${itemType};`,
      ],
    },
  },
  props: {
    /** The reading direction its keys and placement follow (`'rtl'` mirrors the arrow keys); the page's, once mounted, when unset. */
    direction: { type: "'ltr' | 'rtl'" },
    /** The actions, in order: `{ value, label, disabled }`, or `{ value, separator: true }` for
     *  a break between groups. */
    items: { type: "ActionMenuItem[]", required: true },
    /** Called with the chosen item's value. */
    onSelect: { type: "(value: string) => void" },
    /** The list's accessible name, when its trigger does not say enough. */
    label: { type: "string" },
    /** The menu's width in whole cells, its ring included; it fits its content when unset. */
    width: { type: "number" },
    /** The menu's least width in whole cells, its ring included: it grows past it with its content. */
    minWidth: { type: "number" },
    /** Whether the list grows out of a boxed trigger, sharing its last row of stroke; it
     *  does when it opens at a start placement (`'bottom-start'`, `'top-start'`), as placed
     *  once it fits the screen, and its left side, and the
     *  side it shares (its top below, its bottom above), are single or rounded, as a boxed
     *  Button's are. `false` holds it a row
     *  apart, for a trigger with no ring. */
    attached: { type: "boolean", default: true },
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
    /** Called with the next open state whenever the menu opens or closes. */
    onOpenChange: { type: "(open: boolean) => void" },
    /** Gives each item two rows, its text in the first: a 32px target, which meets WCAG 2.5.8. One-row items miss it. */
    spacious: { type: "boolean" },
    /** Whether choosing an item closes the menu. */
    closeOnSelect: { type: "boolean", default: true },
    /** Whether the highlight wraps from the last item to the first. */
    loopFocus: { type: "boolean" },
    /** Where the list opens against its trigger, as a Zag placement (`'bottom-start'` when
     *  unset). */
    placement: { type: "Placement" },
    /** The style of every side of the list's ring: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the list's ring's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the list's ring's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the list's ring's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the list's ring's end side, over `borderX` and `border`; `double` when none of them is set, raising the list. */
    borderEnd: borderProp,
    /** The style of the list's ring's bottom side, over `borderY` and `border`; `double` when none of them is set, raising the list. */
    borderBottom: borderProp,
    /** The style of the list's ring's start side, over `borderX` and `border`. */
    borderStart: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "ActionMenuDriver",
      slotScope: ["api"],
      attributes: {
        direction: { $expression: "direction" },
        open: { $expression: "givenOpen" },
        defaultOpen: { $expression: "defaultOpen" },
        onOpenChange: { $expression: "reportOpen" },
        onSelect: { $expression: "onSelect" },
        closeOnSelect: { $expression: "closeOnSelect" },
        loopFocus: { $expression: "loopFocus" },
        placement: { $expression: "placement" },
      },
      children: [
        /** What opens the menu, typically a `Button`: spread `triggerProps` onto it. */
        {
          type: "slot",
          name: "trigger",
          scopeRequired: true,
          exposes: {
            triggerProps: {
              value: "api.getTriggerProps()",
              type: "Record<string, unknown>",
            },
          },
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
                        class: ["CharcellActionMenu__positioner"],
                        $spread: { $expression: "api.getPositionerProps()" },
                      },
                      children: [
                        {
                          type: "element",
                          tag: "ActionMenuList",
                          attributes: {
                            spacious: { $expression: "spacious" },
                            attached: {
                              $expression:
                                "attachedAt(attached, placementOf(api.getTriggerProps(), placement), borderStart ?? borderX ?? border, opensAbove(api.getTriggerProps()) ? (borderBottom ?? borderY ?? border ?? 'double') : (borderTop ?? borderY ?? border), api.getTriggerProps())",
                            },
                            above: {
                              $expression: "opensAbove(api.getTriggerProps())",
                            },
                            border: { $expression: "border" },
                            borderX: { $expression: "borderX" },
                            borderY: { $expression: "borderY" },
                            borderTop: { $expression: "borderTop" },
                            borderEnd: {
                              $expression:
                                "borderEnd ?? borderX ?? border ?? 'double'",
                            },
                            borderBottom: {
                              $expression:
                                "borderBottom ?? borderY ?? border ?? 'double'",
                            },
                            borderStart: { $expression: "borderStart" },
                            width: { $expression: "width" },
                            minWidth: { $expression: "minWidth" },
                            $spread: {
                              $expression: "mergeRootProps({}, rest)",
                            },
                          },
                          children: [
                            {
                              type: "element",
                              tag: "ScrollArea",
                              // The menu is the area's content, its items'
                              // own parent: it keeps focus and points at its
                              // active item, which the area keeps in view.
                              attributes: {
                                focusable: { $expression: "false" },
                                contentProps: {
                                  $expression:
                                    "label ? { ...api.getContentProps(), 'aria-label': label } : api.getContentProps()",
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
                                      type: "conditional",
                                      conditions: [
                                        {
                                          statement: "if",
                                          condition: "item.separator",
                                          children: [
                                            {
                                              type: "element",
                                              tag: "Separator",
                                              attributes: {
                                                inset: { $expression: "true" },
                                                $spread: {
                                                  $expression:
                                                    "api.getSeparatorProps()",
                                                },
                                              },
                                            },
                                          ],
                                        },
                                        {
                                          statement: "else",
                                          children: [
                                            {
                                              type: "element",
                                              tag: "div",
                                              attributes: {
                                                class: [
                                                  "CharcellActionMenuList__item",
                                                ],
                                                $spread: {
                                                  $expression:
                                                    "api.getItemProps({ value: item.value, disabled: item.disabled })",
                                                },
                                              },
                                              conditionalAttributes: [
                                                {
                                                  condition:
                                                    "api.highlightedValue === item.value",
                                                  attributes: {
                                                    class: [
                                                      "CharcellActionMenuList__item--highlighted",
                                                    ],
                                                  },
                                                },
                                                {
                                                  condition: "item.disabled",
                                                  attributes: {
                                                    class: [
                                                      "CharcellActionMenuList__item--disabled",
                                                    ],
                                                  },
                                                },
                                              ],
                                              children: [
                                                {
                                                  type: "text",
                                                  expression:
                                                    "item.label ?? item.value",
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
        },
      ],
    },
  ],
});
