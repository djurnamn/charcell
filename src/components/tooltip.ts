import { defineTemplate } from "@js-template-engine/types";

/**
 * `Tooltip` - the **compound**: the pure `TooltipDriver` (the Zag `tooltip`
 * machine) composed with the `TooltipVisual` box. A short hint beside a
 * control, shown on hover and on keyboard focus, in place of a `title`,
 * which the browser draws as a popup no terminal could.
 *
 * slots: the **default** slot is the hint; the **`trigger`** named slot is
 * the control it explains - *scoped*, so the call site spreads the exposed
 * `triggerProps` onto the element it renders, typically a charcell `Button`,
 * which the hint then describes (`aria-describedby`). The hint opens after
 * `openDelay` and closes after `closeDelay`, escape closes it, and it opens
 * flush against its control on the cell grid (`placement`, below its start
 * unless there is no room). Keep it to a few words, and never put in it anything
 * the reader must read or press to finish a task: a touch screen and many
 * readers never show it.
 *
 * A control another part owns, a Popover's button, takes the hint too: give
 * the Tooltip that control's id as `triggerId` and spread both records on it
 * (the Popover's first). The control keeps its id, so the Popover still
 * finds it, and the hint describes it.
 */
export default defineTemplate({
  type: "component",
  name: "Tooltip",
  rest: { tag: "div" },
  description: "a short hint beside a control, on hover or keyboard focus.",
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import type { Placement } from '@zag-js/tooltip';",
        "import { Portal } from '@zag-js/react';",
        "import { TooltipDriver } from './TooltipDriver';",
        "import { TooltipVisual } from './TooltipVisual';",
      ],
    },
    // Vue and Svelte bind the open state with `v-model:open` and `bind:open`.
    vue: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import type { Placement } from '@zag-js/tooltip';",
        "import TooltipDriver from './TooltipDriver.vue';",
        "import TooltipVisual from './TooltipVisual.vue';",
      ],
    },
    svelte: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import type { Placement } from '@zag-js/tooltip';",
        "import TooltipDriver from './TooltipDriver.svelte';",
        "import TooltipVisual from './TooltipVisual.svelte';",
        "import { portal } from '@scaffold-ui-kit/helpers/runtime/svelte';",
      ],
    },
  },
  props: {
    /** The reading direction its keys and placement follow (`'rtl'` mirrors the arrow keys); the page's, once mounted, when unset. */
    direction: { type: "'ltr' | 'rtl'" },
    /** Where the hint opens against its control, as a Zag placement (`'bottom-start'` when unset). */
    placement: { type: "Placement" },
    /** Milliseconds the pointer rests on the control before the hint opens. */
    openDelay: { type: "number", default: 400 },
    /** Milliseconds the hint stays after the pointer leaves. */
    closeDelay: { type: "number", default: 150 },
    /** The hint stays while the pointer is over it, so its text can be read
     *  and selected under a magnifier (on by default; `false` closes it as
     *  the pointer leaves the trigger). */
    interactive: { type: "boolean", default: true },
    /** The id of the control the hint explains, when another part owns it: a Popover's button, whose id the Popover finds it by. Spread both parts' trigger props on that one control. */
    triggerId: { type: "string" },
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
    /** Called with the next open state whenever the hint opens or closes. */
    onOpenChange: { type: "(open: boolean) => void" },
  },
  children: [
    {
      type: "element",
      tag: "TooltipDriver",
      slotScope: ["api"],
      attributes: {
        direction: { $expression: "direction" },
        placement: { $expression: "placement" },
        openDelay: { $expression: "openDelay" },
        closeDelay: { $expression: "closeDelay" },
        interactive: { $expression: "interactive" },
        triggerId: { $expression: "triggerId" },
        open: { $expression: "givenOpen" },
        defaultOpen: { $expression: "defaultOpen" },
        onOpenChange: { $expression: "reportOpen" },
      },
      children: [
        /** The control the hint describes: spread `triggerProps` onto it. */
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
                        class: ["CharcellTooltip__positioner"],
                        $spread: { $expression: "api.getPositionerProps()" },
                      },
                      children: [
                        {
                          type: "element",
                          tag: "TooltipVisual",
                          attributes: {
                            $spread: {
                              $expression:
                                "mergeRootProps(api.getContentProps(), rest)",
                            },
                          },
                          children: [/** The hint. */ { type: "slot" }],
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
