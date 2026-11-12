import { defineTemplate } from "@js-template-engine/types";

/**
 * `SortablePlace` - an empty sortable list's way in: the
 * `CharcellSortableList__place` part as a component. For a picked-up item it
 * is a real button named by `label` (`place here`); with `hint`, during a
 * drag, it is the same text as a span (`drop here`), hidden from assistive
 * technology since the drag itself is a pointer's. `target` engages that
 * hint: the drag's marker, inverted, where a drag from another list lands,
 * in an empty list or between rows. Styled by `SortableListVisual`, the block
 * it belongs to.
 */
export default defineTemplate({
  type: "component",
  name: "SortablePlace",
  description:
    "the way into an empty sortable list: a row to place a picked-up item on.",
  props: {
    /** The text: the button's name, or with `hint` the drag's hint. */
    label: { type: "string" },
    /** With `hint`, where the dragged item lands: the hint inverted. */
    target: { type: "boolean" },
  },
  children: [
    {
      type: "conditional",
      conditions: [
        {
          statement: "if",
          condition: "hint",
          props: { hint: { type: "true", required: true } },
          children: [
            {
              type: "element",
              tag: "span",
              passthrough: true,
              extensions: {
                bem: { block: "CharcellSortableList", element: "place" },
              },
              conditionalAttributes: [
                {
                  condition: "target === true",
                  attributes: {
                    class: ["CharcellSortableList__place--target"],
                  },
                },
              ],
              attributes: { "aria-hidden": "true" },
              children: [{ type: "text", expression: "label" }],
            },
          ],
        },
        {
          statement: "else",
          props: { hint: { type: "false" } },
          children: [
            {
              type: "element",
              tag: "button",
              passthrough: true,
              extensions: {
                bem: { block: "CharcellSortableList", element: "place" },
              },
              attributes: { type: "button" },
              children: [{ type: "text", expression: "label" }],
            },
          ],
        },
      ],
    },
  ],
});
