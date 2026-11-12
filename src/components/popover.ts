import { defineTemplate } from "@js-template-engine/types";
import { borderProp } from "../template-helpers/border";

/**
 * `Popover` - the **compound**: the pure `PopoverDriver` (behavior) composed
 * with the `PopoverPanel` visual, the ergonomic default api. Pure
 * declarative composition - it owns no behavior and no appearance: it consumes
 * the driver's scoped slot (`slotScope: ['api']`), hands the trigger record to
 * the `trigger` slot, and when open portals the panel inside the Zag
 * positioner (spreading `getPositionerProps()` / `getContentProps()`).
 *
 * slots: the **default** slot is the panel content (inside `PopoverPanel`);
 * the **`trigger`** named slot is what you click - *scoped*, so the call site
 * spreads the exposed `triggerProps` onto the element it renders, typically a
 * charcell `Button`. The record and the focus then live on one element: a
 * wrapper would hold `aria-expanded` while the button inside it took the focus.
 *
 * The panel is a `role="dialog"`, and a dialog with no name is announced as
 * "dialog" and nothing else, so `label` names it. The machine would otherwise
 * point the panel at a title part charcell does not render; that reference is
 * dropped whether or not a label is given.
 *
 * The portal node is the one place a single composition node emits a
 * different element per target - React `<Portal>` (from `@zag-js/react`), Vue
 * `<Teleport to="body">`, and in Svelte nothing: there the positioner itself
 * takes `use:portal`. HTML renders it statically, without the behavior.
 */
export default defineTemplate({
  type: "component",
  name: "Popover",
  rest: { tag: "div" },
  description: "a panel that opens next to the button that triggers it.",
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove, placementOf } from 'charcell/scripts/positioning';",
        "import type { Placement } from '@zag-js/popover';",
        "import { Portal } from '@zag-js/react';",
        "import { attachedAt } from 'charcell/scripts/attach';",
        "import { resolveOverlayLabeling, withoutUnrenderedDescription } from '@scaffold-ui-kit/helpers/zag';",
        "import { PopoverDriver } from './PopoverDriver';",
        "import { PopoverPanel } from './PopoverPanel';",
      ],
    },
    // Vue and Svelte bind the open state with `v-model:open` and `bind:open`.
    vue: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove, placementOf } from 'charcell/scripts/positioning';",
        "import type { Placement } from '@zag-js/popover';",
        "import { attachedAt } from 'charcell/scripts/attach';",
        "import { resolveOverlayLabeling, withoutUnrenderedDescription } from '@scaffold-ui-kit/helpers/zag';",
        "import PopoverDriver from './PopoverDriver.vue';",
        "import PopoverPanel from './PopoverPanel.vue';",
      ],
    },
    svelte: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { opensAbove, placementOf } from 'charcell/scripts/positioning';",
        "import type { Placement } from '@zag-js/popover';",
        "import { attachedAt } from 'charcell/scripts/attach';",
        "import { resolveOverlayLabeling, withoutUnrenderedDescription } from '@scaffold-ui-kit/helpers/zag';",
        "import PopoverDriver from './PopoverDriver.svelte';",
        "import PopoverPanel from './PopoverPanel.svelte';",
        "import { portal } from '@scaffold-ui-kit/helpers/runtime/svelte';",
      ],
    },
  },
  props: {
    /** The reading direction its keys and placement follow (`'rtl'` mirrors the arrow keys); the page's, once mounted, when unset. */
    direction: { type: "'ltr' | 'rtl'" },
    // `Placement` is Zag's positioning union (re-exported from
    // @zag-js/popover); typing it here matches the driver so the typed react
    // Import is tsc-clean.
    /** Where the panel opens against its trigger, as a Zag placement (`'bottom-start'` when
     *  unset). */
    placement: { type: "Placement" },
    /** Whether the panel grows out of a boxed trigger, sharing its last row of stroke; it
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
    /** Called with the next open state on every machine-driven open or close. */
    onOpenChange: { type: "(open: boolean) => void" },
    /** Whether an outside click closes the panel. */
    closeOnInteractOutside: { type: "boolean", default: true },
    /** Whether escape closes the panel. */
    closeOnEscape: { type: "boolean", default: true },
    /** Trap focus and block outside interaction while open. */
    modal: { type: "boolean", default: false },
    /** The panel's accessible name. */
    label: { type: "string" },
    /** The panel's width in whole cells, its ring included; it fits its content when unset. */
    width: { type: "number" },
    /** The panel's least width in whole cells, its ring included: it grows past it with its content. */
    minWidth: { type: "number" },
    /** The style of every side of the panel's ring: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the panel's ring's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the panel's ring's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the panel's ring's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the panel's ring's end side, over `borderX` and `border`; `double` when none of them is set, raising the panel. */
    borderEnd: borderProp,
    /** The style of the panel's ring's bottom side, over `borderY` and `border`; `double` when none of them is set, raising the panel. */
    borderBottom: borderProp,
    /** The style of the panel's ring's start side, over `borderX` and `border`. */
    borderStart: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "PopoverDriver",
      slotScope: ["api"],
      attributes: {
        direction: { $expression: "direction" },
        placement: { $expression: "placement" },
        open: { $expression: "givenOpen" },
        defaultOpen: { $expression: "defaultOpen" },
        onOpenChange: { $expression: "reportOpen" },
        closeOnInteractOutside: { $expression: "closeOnInteractOutside" },
        closeOnEscape: { $expression: "closeOnEscape" },
        modal: { $expression: "modal" },
      },
      children: [
        /** What opens the panel, typically a `Button`: spread `triggerProps` onto it. */
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
        // When open, portal the panel inside the Zag positioner. The portal
        // node is the per-target divergence: React Portal / Vue Teleport /
        // svelte `use:portal` on the positioner.
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
                      // The positioner: Zag positions it inline; no appearance.
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
                        class: ["CharcellPopover__positioner"],
                        $spread: { $expression: "api.getPositionerProps()" },
                      },
                      children: [
                        {
                          type: "element",
                          tag: "PopoverPanel",
                          attributes: {
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
                              $expression:
                                "mergeRootProps(withoutUnrenderedDescription(resolveOverlayLabeling(api.getContentProps(), label)), rest)",
                            },
                          },
                          children: [
                            /** The panel's content. */ { type: "slot" },
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
