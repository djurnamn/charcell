import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStyles,
} from "../template-helpers/border";
import { fillClass, fillProp, fillStyles } from "../template-helpers/fill";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";

/**
 * `TabPanel` - one tab's content under the TabList. A passthrough root (the
 * compound spreads Zag's `getContentProps()`, which hides every panel but the
 * selected one). The panel takes focus when it holds nothing focusable, so
 * the focus pointer marks its first row, as on every control.
 *
 * `boxed` (the default) is the folder's body: a ring open at the top, its
 * sides rising into the TabList's base row to meet the base stroke, content
 * one cell inside; `border` styles its right and bottom sides (its left
 * meets the tabs' sides, and its top is theirs). `dense` is bare. `fill`
 * grows the panel to its container, as a filled Tabs grows its panels.
 */
export default defineTemplate({
  type: "component",
  name: "TabPanel",
  description: "one tab's content, under its tabs.",
  style: stylePreamble,
  props: {
    /** `boxed` is the folder's body, a ring open at the top; `dense` is bare. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** The style of the boxed panel's end and bottom sides: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the boxed panel's end side, over `border`. */
    borderEnd: borderProp,
    /** The style of the boxed panel's bottom side, over `border`. */
    borderBottom: borderProp,
    /** Takes the container's box: grows in a flex or grid layout, and takes the full height of a block that has one. */
    fill: fillProp,
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellTabPanel" } },
      conditionalAttributes: [
        ...borderClasses("CharcellTabPanel", {}, ["end", "bottom"], false),
        {
          condition: "variant === 'dense'",
          attributes: { class: ["CharcellTabPanel--dense"] },
        },
        fillClass("CharcellTabPanel"),
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          "@include focusable": true,
          "&:focus-visible::after": { "@include focus-cue": true },
          position: "relative",
          // Hidden, it shows only where its Tabs has no script to select it
          // (`--charcell-tabs--hidden-panel`), a row under the panel before.
          "&[hidden]": {
            display: "var(--charcell-tabs--hidden-panel, none)",
            marginBlockStart: "var(--charcell-row)",
          },
          ...fillStyles(),
          // The focus pointer takes the padding cell before the first row:
          // inside the ring, boxed; dense, the panel keeps a cell each side
          // for it, its text in the dense tabs' label column.
          ...oneOf(["--dense"], {
            none: {
              isolation: "isolate",
              padding: "0 2ch var(--charcell-row)",
              "&::before": {
                "@include ring($top: calc(-1 * var(--charcell-row)), $top-open: true)": true,
              },
              "&::after": { "@include pointer(1ch)": true },
            },
            "--dense": {
              padding: "0 1ch",
              "&::after": { "@include pointer": true },
            },
          }),
          ...borderStyles("&::before", ["end", "bottom"]),
        },
      },
      children: [/** The tab's content. */ { type: "slot" }],
    },
  ],
});
