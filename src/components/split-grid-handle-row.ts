import { defineTemplate } from "@js-template-engine/types";

/**
 * `SplitGridHandleRow` - content on a row's handle: the
 * `CharcellSplitGrid__handle-row` part as a component, laid over the handle
 * after a row (spread `grid.rowHandleRowProps(index)` onto it, right after
 * that handle), with the `start` and `end` slots packed at its start and
 * end. The handle runs beneath them, so the rest of the row drags and its
 * grip keeps the middle; what the slots hold stays its own (a heading, a
 * toggle), never inside the handle's button. Ruled, the line stops a cell
 * either side of each slot, as a frame's ring does around its title.
 * Styled by `SplitGridVisual`, the block it belongs to.
 */
export default defineTemplate({
  type: "component",
  name: "SplitGridHandleRow",
  description:
    "content laid on a grid's row handle, at its start and end around the grip.",
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: {
        bem: { block: "CharcellSplitGrid", element: "handle-row" },
      },
      children: [
        {
          type: "element",
          tag: "div",
          extensions: { bem: { element: "handle-start" } },
          children: [
            /** Content at the row's start, before the grip. */
            { type: "slot", name: "start" },
          ],
        },
        {
          type: "element",
          tag: "div",
          extensions: { bem: { element: "handle-end" } },
          children: [
            /** Content at the row's end, after the grip. */
            { type: "slot", name: "end" },
          ],
        },
      ],
    },
  ],
});
