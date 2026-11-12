import { defineTemplate } from "@js-template-engine/types";

/**
 * `SplitGridCell` - one panel of a grid: the `CharcellSplitGrid__cell` part
 * as a component. Spread `grid.cellProps(column, row)` onto it, which places
 * it on the grid. It carries no styles of its own: the part is styled by
 * `SplitGridVisual`, the block it belongs to.
 */
export default defineTemplate({
  type: "component",
  name: "SplitGridCell",
  description: "one pane of a grid.",
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellSplitGrid", element: "cell" } },
      children: [{ type: "slot" }],
    },
  ],
});
