import { defineTemplate } from "@js-template-engine/types";
import { borderProp } from "../template-helpers/border";

/**
 * `Dialog` - the **compound**: the pure `DialogDriver` (behavior) composed with
 * the `DialogPanel` visual, a dialog in charcell's window. Like Popover, the
 * **`trigger`** slot is scoped: the call site spreads `triggerProps` onto its
 * own Button, so the ARIA and the focus live on one element. The default slot
 * is the window's content; the scoped **`actions`** slot is its last row,
 * exposing `closeProps` for a close button.
 *
 * `label` is the window's title and the dialog's accessible name (the machine
 * would point the dialog at a title part charcell does not render; that
 * reference is dropped). Escape and a click outside close it; `role:
 * 'alertdialog'` is for a dialog that interrupts to ask something.
 */
const portal = (children: unknown[]) => ({
  type: "fragment",
  extensions: {
    react: { tag: "Portal" },
    vue: { tag: "Teleport", attributes: { to: "body" } },
    // svelte moves the panel itself to body: see the panel's spread.
  },
  children,
});

export default defineTemplate({
  type: "component",
  name: "Dialog",
  rest: { tag: "div" },
  description: "a dialog over the page that keeps focus until it closes.",
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { Portal } from '@zag-js/react';",
        "import { resolveOverlayLabeling } from '@scaffold-ui-kit/helpers/zag';",
        "import { DialogDriver } from './DialogDriver';",
        "import { DialogPanel } from './DialogPanel';",
      ],
    },
    // Vue and Svelte bind the open state with `v-model:open` and `bind:open`.
    vue: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { resolveOverlayLabeling } from '@scaffold-ui-kit/helpers/zag';",
        "import DialogDriver from './DialogDriver.vue';",
        "import DialogPanel from './DialogPanel.vue';",
      ],
    },
    svelte: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { resolveOverlayLabeling } from '@scaffold-ui-kit/helpers/zag';",
        "import DialogDriver from './DialogDriver.svelte';",
        "import DialogPanel from './DialogPanel.svelte';",
        "import { portalTo } from '@scaffold-ui-kit/helpers/runtime/svelte';",
      ],
    },
  },
  props: {
    /** The reading direction its keys and placement follow (`'rtl'` mirrors the arrow keys); the page's, once mounted, when unset. */
    direction: { type: "'ltr' | 'rtl'" },
    /** Where focus goes as the dialog closes when neither its trigger nor
     *  what opened it is on the page any more (a menu in the row the dialog
     *  just deleted): focus would otherwise fall to the page itself. */
    finalFocus: { type: "() => HTMLElement | null" },
    /** The window's title and the dialog's accessible name. */
    label: { type: "string" },
    /** Where focus goes as the dialog opens, in place of its first focusable element: the safe choice in a dialog that asks before something destructive. */
    initialFocus: { type: "() => HTMLElement | null" },
    /** The id of an element that describes the dialog, for its `aria-describedby`. */
    describedBy: { type: "string" },
    /** Lock the page's scroll while the dialog is open. */
    preventScroll: { type: "boolean", default: true },
    /** The window's width in whole cells, its ring included; it fits its content when unset. */
    width: { type: "number" },
    /** The window's least width in whole cells, its ring included: it grows past it with its content. */
    minWidth: { type: "number" },
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
    /** Called with the next open state whenever the dialog opens or closes. */
    onOpenChange: { type: "(open: boolean) => void" },
    /** Trap focus and hide the page from assistive technology. */
    modal: { type: "boolean", default: true },
    /** Whether escape closes the dialog. */
    closeOnEscape: { type: "boolean", default: true },
    /** Whether a click outside the window closes it. */
    closeOnInteractOutside: { type: "boolean", default: true },
    /** The dialog's role: `'alertdialog'` for a dialog that interrupts to ask something. */
    role: { type: "'dialog' | 'alertdialog'" },
    /** The style of every side of the window's ring: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the window's ring's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the window's ring's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the window's ring's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the window's ring's end side, over `borderX` and `border`; `double` when none of them is set, raising the window. */
    borderEnd: borderProp,
    /** The style of the window's ring's bottom side, over `borderY` and `border`; `double` when none of them is set, raising the window. */
    borderBottom: borderProp,
    /** The style of the window's ring's start side, over `borderX` and `border`. */
    borderStart: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "DialogDriver",
      slotScope: ["api"],
      attributes: {
        direction: { $expression: "direction" },
        open: { $expression: "givenOpen" },
        defaultOpen: { $expression: "defaultOpen" },
        onOpenChange: { $expression: "reportOpen" },
        modal: { $expression: "modal" },
        closeOnEscape: { $expression: "closeOnEscape" },
        closeOnInteractOutside: { $expression: "closeOnInteractOutside" },
        role: { $expression: "role" },
        finalFocus: { $expression: "finalFocus" },
        initialFocus: { $expression: "initialFocus" },
        describedBy: { $expression: "describedBy" },
        preventScroll: { $expression: "preventScroll" },
      },
      children: [
        /** What opens the dialog, typically a `Button`: spread `triggerProps` onto it. */
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
                portal([
                  {
                    type: "element",
                    tag: "DialogPanel",
                    extensions: {
                      svelte: {
                        attributes: {
                          $spread: {
                            $expression:
                              "{ ...api.getPositionerProps(), ...portalTo('body') }",
                          },
                        },
                      },
                    },
                    attributes: {
                      $spread: { $expression: "api.getPositionerProps()" },
                      label: { $expression: "label" },
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
                      contentProps: {
                        $expression:
                          "mergeRootProps(resolveOverlayLabeling(api.getContentProps(), label), rest)",
                      },
                    },
                    children: [/** The window's content. */ { type: "slot" }],
                    slots: {
                      actions: [
                        /** The window's last row, its buttons. Spread `closeProps` onto one to close the dialog. */
                        {
                          type: "slot",
                          name: "actions",
                          exposes: {
                            closeProps: {
                              value: "api.getCloseTriggerProps()",
                              type: "Record<string, unknown>",
                            },
                          },
                        },
                      ],
                    },
                  },
                ]),
              ],
            },
          ],
        },
      ],
    },
  ],
});
