import { defineTemplate } from "@js-template-engine/types";
import { borderProp } from "../template-helpers/border";
import { fillClass, fillProp, fillStyles } from "../template-helpers/fill";
import { stylePreamble } from "../template-helpers/style-preamble";

const itemType =
  "interface TabItem { value: string; label: string; disabled?: boolean }";

/**
 * `Tabs` - the **compound**: the pure `TabsDriver` (behavior) composed with
 * the `TabList` and `TabPanel` visuals, from a list: `items`
 * (`{ value, label, disabled }`) become the tabs, and one panel per item
 * renders the scoped **`panel`** slot with that item's `value`, so the call
 * site picks the content (`panel={({ value }) => ...}`). Only the selected
 * panel shows; the others stay in the page, hidden, so each tab's panel
 * exists for its `aria-controls` once it is selected.
 *
 * Uncontrolled by default (`defaultValue`, else the first tab), controlled
 * through `value` + `onValueChange`. The arrow keys move along the tabs.
 * `label` names the tab list. `boxed` (the default) draws folder tabs over a
 * boxed panel, the selected tab open into it; `dense` is a bare tab row over a
 * rule, the selected tab inverted. `fill` sizes the tabs by their container,
 * the selected panel taking the height the tab row leaves.
 */
export default defineTemplate({
  type: "component",
  name: "Tabs",
  rest: { tag: "div" },
  description:
    "panels behind tabs, one showing at a time. boxed, they are folder tabs.",
  style: stylePreamble,
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { consumerClass, mergeRootProps, withoutClass } from '@scaffold-ui-kit/helpers/runtime';",
        "import { TabsDriver } from './TabsDriver';",
        "import { TabList } from './TabList';",
        "import { TabPanel } from './TabPanel';",
        `export ${itemType};`,
      ],
    },
    // Vue and Svelte bind the value with `v-model` and `bind:value`.
    vue: {
      model: "value",
      imports: [
        "import { consumerClass, mergeRootProps, withoutClass } from '@scaffold-ui-kit/helpers/runtime';",
        "import TabsDriver from './TabsDriver.vue';",
        "import TabList from './TabList.vue';",
        "import TabPanel from './TabPanel.vue';",
        `export ${itemType};`,
      ],
    },
    svelte: {
      imports: [
        "import { consumerClass, mergeRootProps, withoutClass } from '@scaffold-ui-kit/helpers/runtime';",
        "import TabsDriver from './TabsDriver.svelte';",
        "import TabList from './TabList.svelte';",
        "import TabPanel from './TabPanel.svelte';",
        `export ${itemType};`,
      ],
    },
  },
  props: {
    /** The reading direction its keys and placement follow (`'rtl'` mirrors the arrow keys); the page's, once mounted, when unset. */
    direction: { type: "'ltr' | 'rtl'" },
    /** The tabs, in order: `{ value, label, disabled }`. */
    items: { type: "TabItem[]", required: true },
    /** Controlled selected tab; pair it with `onValueChange`. */
    value: {
      type: "string",
      bindable: {
        given: "givenValue",
        report: "reportValue",
        changeProp: "onValueChange",
      },
    },
    /** Uncontrolled initial tab; the first one when unset. */
    defaultValue: { type: "string" },
    /** Called with the newly selected tab's value. */
    onValueChange: { type: "(value: string) => void" },
    /** The tab list's accessible name. */
    label: { type: "string" },
    /** `boxed` (the default) is the folder; `dense` is the bare tab row, its tabs 16px tall, which misses WCAG 2.5.8's 24px target; boxed meets it. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** The style of the boxed panel's end and bottom sides: `single`, `rounded`, `heavy`, `double` or `none`. Its top is the tabs, and its start meets theirs. */
    border: borderProp,
    /** The style of the boxed panel's end side, over `border`. */
    borderEnd: borderProp,
    /** The style of the boxed panel's bottom side, over `border`. */
    borderBottom: borderProp,
    /** Takes the container's box: grows in a flex or grid layout, and takes the full height of a block that has one; the selected panel takes the height the tab row leaves. */
    fill: fillProp,
  },
  children: [
    {
      type: "element",
      tag: "TabsDriver",
      slotScope: ["api", "scripted"],
      attributes: {
        direction: { $expression: "direction" },
        value: { $expression: "givenValue" },
        defaultValue: { $expression: "defaultValue ?? items[0]?.value" },
        onValueChange: { $expression: "reportValue" },
      },
      children: [
        {
          type: "element",
          tag: "div",
          extensions: { bem: { block: "CharcellTabs" } },
          conditionalAttributes: [
            fillClass("CharcellTabs"),
            // The driver marks its root once it runs, never on the server.
            {
              condition: "scripted",
              attributes: { class: ["CharcellTabs--scripted"] },
            },
          ],
          attributes: {
            // The root's own class list replaces a spread class, so the consumer's
            // class joins that list rather than riding the spread.
            $spread: {
              $expression:
                "mergeRootProps(api.getRootProps(), withoutClass(rest))",
            },
            class: [{ $expression: "consumerClass(rest)" }],
            style: {
              // With no script to select their tabs, the panels the server
              // rendered hidden could never show, so every panel shows, in
              // order, a row apart (`--charcell-tabs--hidden-panel`, which
              // its panels read): with scripting off, or on a page whose
              // scripts failed to load (`data-charcell-scripts="failed"`,
              // from `scriptFailureBootstrapScript`) for a root its driver
              // never marked. A marked root's machine decides, and states it
              // for any Tabs inside it.
              "@media (scripting: none)": {
                "&": { "--charcell-tabs--hidden-panel": "block" },
              },
              ':where(html[data-charcell-scripts="failed"]) &:where(:not(.CharcellTabs--scripted))':
                { "--charcell-tabs--hidden-panel": "block" },
              "&--scripted": { "--charcell-tabs--hidden-panel": "none" },
              // Filled, the tabs stack their row over the panel, which grows.
              ...fillStyles(),
              "&--fill": {
                ...fillStyles()["&--fill"],
                display: "flex",
                flexDirection: "column",
              },
            },
          },
          children: [
            {
              type: "element",
              tag: "TabList",
              attributes: {
                variant: { $expression: "variant" },
                border: { $expression: "border" },
                borderEnd: { $expression: "borderEnd" },
                $spread: {
                  $expression:
                    "label ? { ...api.getListProps(), 'aria-label': label } : api.getListProps()",
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
                      tag: "button",
                      attributes: {
                        class: ["CharcellTabList__tab"],
                        $spread: {
                          $expression:
                            "api.getTriggerProps({ value: item.value, disabled: item.disabled })",
                        },
                      },
                      conditionalAttributes: [
                        {
                          condition: "api.value === item.value",
                          attributes: {
                            class: ["CharcellTabList__tab--selected"],
                          },
                        },
                      ],
                      children: [{ type: "text", expression: "item.label" }],
                    },
                  ],
                },
                {
                  type: "element",
                  tag: "span",
                  attributes: {
                    class: ["CharcellTabList__rest"],
                    "aria-hidden": "true",
                  },
                },
              ],
            },
            {
              type: "iteration",
              items: "items",
              item: "item",
              key: "item.value",
              children: [
                {
                  type: "element",
                  tag: "TabPanel",
                  attributes: {
                    variant: { $expression: "variant" },
                    border: { $expression: "border" },
                    borderEnd: { $expression: "borderEnd" },
                    borderBottom: { $expression: "borderBottom" },
                    fill: { $expression: "fill" },
                    $spread: {
                      $expression: "api.getContentProps({ value: item.value })",
                    },
                  },
                  children: [
                    /** A tab's content, given the tab's `value`. */
                    {
                      type: "slot",
                      name: "panel",
                      exposes: {
                        value: { value: "item.value", type: "string" },
                      },
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
