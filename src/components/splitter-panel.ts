import { defineTemplate } from "@js-template-engine/types";

/**
 * `SplitterPanel` - one pane of a split: the `CharcellSplitter__panel` part as
 * a component, so a split with any number of panels composes `SplitterDriver`,
 * `SplitterVisual` and these parts without writing the block's class names by
 * hand. Spread `api.getPanelProps({ id })` onto it. It carries no styles of
 * its own: the part is styled by `SplitterVisual`, the block it belongs to.
 */
export default defineTemplate({
  type: "component",
  name: "SplitterPanel",
  description: "one pane of a split.",
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellSplitter", element: "panel" } },
      children: [{ type: "slot" }],
    },
  ],
});
