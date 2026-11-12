import { defineTemplate } from "@js-template-engine/types";

/**
 * `SplitGridHandle` - a handle between two columns, or two rows, of a grid:
 * the `CharcellSplitGrid__handle` part as a component, a `<button>` carrying
 * the machine's separator role and keyboard handling. Spread
 * `grid.columnHandleProps(index)` or `grid.rowHandleProps(index)` onto it;
 * `label` names it. It runs the grid's whole length across the tracks it
 * `crosses`, one span per track, each with its own grip, and a crossing
 * between them where the other way's handle runs through; a row's, under
 * `rowGrips: one`, gives its spans' grips up for one at its middle. Styled by
 * `SplitGridVisual`, the block it belongs to.
 */
export default defineTemplate({
  type: "component",
  name: "SplitGridHandle",
  description:
    "the handle between two columns or two rows of a grid, with a grip in each pane it passes.",
  props: {
    /** `column` runs down between two columns, `row` across between two rows. */
    axis: { type: "'column' | 'row'", default: "column" },
    /** The tracks it runs across: the rows for a column's handle, the
     *  columns for a row's. */
    crosses: { type: "string[]", required: true },
    /** The handle's accessible name. */
    label: { type: "string" },
  },
  children: [
    {
      type: "element",
      tag: "button",
      passthrough: true,
      extensions: { bem: { block: "CharcellSplitGrid", element: "handle" } },
      conditionalAttributes: [
        {
          condition: "axis === 'row'",
          attributes: { class: ["CharcellSplitGrid__handle--row"] },
        },
        {
          condition: "axis !== 'row'",
          attributes: { class: ["CharcellSplitGrid__handle--column"] },
        },
      ],
      attributes: {
        type: "button",
        "aria-label": { $expression: "label" },
      },
      children: [
        {
          type: "iteration",
          items: "crosses",
          item: "track",
          index: "index",
          key: "track",
          children: [
            {
              type: "conditional",
              conditions: [
                {
                  statement: "if",
                  condition: "index > 0",
                  children: [
                    {
                      type: "element",
                      tag: "span",
                      extensions: { bem: { element: "crossing" } },
                      attributes: { "aria-hidden": "true" },
                    },
                  ],
                },
              ],
            },
            {
              type: "element",
              tag: "span",
              extensions: { bem: { element: "span" } },
              attributes: { "aria-hidden": "true" },
              children: [
                {
                  type: "element",
                  tag: "span",
                  extensions: { bem: { element: "grip" } },
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
              condition: "axis === 'row'",
              children: [
                {
                  type: "element",
                  tag: "span",
                  extensions: { bem: { element: "center-grip" } },
                  attributes: { "aria-hidden": "true" },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
