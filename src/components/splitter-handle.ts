import { defineTemplate } from "@js-template-engine/types";

/**
 * `SplitterHandle` - the resize handle between two panes: the
 * `CharcellSplitter__handle` part as a component, a `<button>` carrying the
 * machine's separator role and keyboard handling. Spread
 * `api.getResizeTriggerProps({ id: 'before:after' })` onto it; `label` names
 * it. Styled by `SplitterVisual`, the block it belongs to. It carries the
 * grip, `⠿`, in its middle cell: the sign of something to drag.
 */
export default defineTemplate({
  type: "component",
  name: "SplitterHandle",
  description: "the handle between two panes, with the grip that drags it.",
  props: {
    /** The handle's accessible name. */
    label: { type: "string" },
  },
  children: [
    {
      type: "element",
      tag: "button",
      passthrough: true,
      extensions: { bem: { block: "CharcellSplitter", element: "handle" } },
      attributes: {
        type: "button",
        "aria-label": { $expression: "label" },
      },
      children: [
        {
          type: "element",
          tag: "span",
          extensions: { bem: { element: "grip" } },
          attributes: {
            "aria-hidden": "true",
          },
        },
      ],
    },
  ],
});
