import { defineTemplate } from "@js-template-engine/types";

/**
 * `SortableRow` - one item of a sortable list: the `CharcellSortableList__row`
 * part as a component, its grip (a real, named button carrying `gripProps`:
 * the drag handle's ref, name, description and handlers) and the item
 * itself in the default slot. `engaged` fills the grip: the item is picked
 * up or dragged; `dragging` grounds the row it lifts. `customGrip` leaves the
 * grip to the item, which spreads the grip props (their class carries the
 * same look and states) wherever it likes. Styled by `SortableListVisual`,
 * the block it belongs to.
 */
export default defineTemplate({
  type: "component",
  name: "SortableRow",
  description:
    "one item of a sortable list, with the grip that drags, picks up and places it.",
  props: {
    /** The item is picked up or dragged: the grip fills. */
    engaged: { type: "boolean" },
    /** The row being dragged: it paints the ground, lifted over the rows it passes. */
    dragging: { type: "boolean" },
    /** The grip is the consumer's, spread with the list's grip props wherever
     *  the item puts it; the row draws no grip column. */
    customGrip: { type: "boolean" },
    /** Spread onto the grip: the drag handle's ref, name, description and handlers. */
    gripProps: { type: "Record<string, unknown>" },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellSortableList", element: "row" } },
      conditionalAttributes: [
        {
          condition: "customGrip === true",
          attributes: { class: ["CharcellSortableList__row--custom-grip"] },
        },
        {
          condition: "dragging === true",
          attributes: { class: ["CharcellSortableList__row--dragging"] },
        },
      ],
      attributes: { role: "listitem" },
      children: [
        {
          type: "conditional",
          conditions: [
            {
              statement: "if",
              condition: "customGrip !== true",
              children: [
                {
                  type: "element",
                  tag: "button",
                  extensions: { bem: { element: "grip" } },
                  attributes: {
                    type: "button",
                    $spread: { $expression: "gripProps" },
                  },
                  conditionalAttributes: [
                    {
                      condition: "engaged === true",
                      attributes: {
                        class: ["CharcellSortableList__grip--engaged"],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "element",
          tag: "div",
          extensions: { bem: { element: "content" } },
          children: [{ type: "slot" }],
        },
      ],
    },
  ],
});
