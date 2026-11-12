import { defineTemplate } from "@js-template-engine/types";

/**
 * `SplitterHandleRow` - content on a handle's row: the
 * `CharcellSplitter__handle-row` part as a component, laid right after a
 * `SplitterHandle` and over it, taking no room of its own, with the `start`
 * and `end` slots packed at the row's start and end. The handle runs
 * beneath them, so the rest of the row drags and the grip keeps the middle;
 * what the slots hold stays its own (a heading, a toggle), never inside the
 * handle's button.
 *
 * Meant for a stacked split, where the handle is a row. Ruled, the line runs
 * beneath the slots and stops a cell either side of each, as a frame's ring
 * does around its title; the slots take the handle's fill on approach. With
 * no handle before it, the row draws the same slots and nothing between:
 * the row above a view no split moves. Styled by `SplitterVisual`, the block it
 * belongs to.
 */
export default defineTemplate({
  type: "component",
  name: "SplitterHandleRow",
  description:
    "content laid on a split's handle, at its start and end around the grip.",
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: {
        bem: { block: "CharcellSplitter", element: "handle-row" },
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
