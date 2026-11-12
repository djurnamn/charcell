import { defineTemplate } from "@js-template-engine/types";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { fillProp } from "../template-helpers/fill";
import { stylePreamble } from "../template-helpers/style-preamble";

const script =
  "import { selectCodeOnPress } from 'charcell/scripts/code-block';";

/**
 * `CodeBlock` - lines of code on the `faint` wash, in a `ScrollArea`: a line
 * longer than the block scrolls across a whole cell at a time with no bounce
 * at the ends, or, with `wrap`, wraps at its edge. It reads left to right on
 * every page. A double press selects the
 * source line under the pointer, however many rows it wraps across, and a
 * triple press the whole block.
 *
 * The area is a tab stop only while it scrolls, named by `label`. The
 * consumer's other attributes land on it, the outermost element. `fill` takes
 * the height of its container; the wash covers the code, not what is left.
 */
export default defineTemplate({
  type: "component",
  name: "CodeBlock",
  description:
    "lines of code on a wash, a double press selecting a line and a triple the block.",
  style: stylePreamble,
  rest: { tag: "div" },
  extensions: {
    react: {
      // It sets handlers on its own element, so it is a client module.
      client: true,
      imports: [script, "import { ScrollArea } from './ScrollArea';"],
    },
    vue: {
      imports: [script, "import ScrollArea from './ScrollArea.vue';"],
    },
    svelte: {
      imports: [script, "import ScrollArea from './ScrollArea.svelte';"],
    },
  },
  props: {
    /** The code, as text. */
    code: { type: "string" },
    /** Names the scroll area for assistive technology. */
    label: { type: "string" },
    /** Wraps a long line at the block's edge, scrolling only down. */
    wrap: { type: "boolean" },
    /** The axes that scroll; with `wrap`, only down. */
    orientation: {
      type: "'vertical' | 'horizontal' | 'both'",
      default: "horizontal",
    },
    /** Takes the height of its container, and scrolls within it. */
    fill: fillProp,
  },
  children: [
    {
      type: "element",
      tag: "ScrollArea",
      attributes: {
        $spread: { $expression: "rest" },
        label: { $expression: "label" },
        // A line can only wrap where the width is the area's own.
        orientation: { $expression: "wrap ? 'vertical' : orientation" },
        overscroll: "none",
        fill: { $expression: "fill" },
      },
      children: [
        {
          type: "element",
          tag: "pre",
          extensions: {
            bem: { block: "CharcellCodeBlock" },
            svelte: {
              ignore: ["a11y_no_noninteractive_element_interactions"],
            },
          },
          events: [
            {
              name: "mousedown",
              handler: "(event) => selectCodeOnPress(event)",
            },
          ],
          conditionalAttributes: [
            {
              condition: "wrap",
              attributes: { class: ["CharcellCodeBlock--wrap"] },
            },
          ],
          attributes: {
            style: {
              "@include cell": true,
              "@include paint($text: var(--charcell-strong), $fill: var(--charcell-faint))": true,
              padding: "var(--charcell-row) 1ch",
              tabSize: "2",
              ...oneOf(["--wrap"], {
                none: { whiteSpace: "pre" },
                "--wrap": { whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
              }),
              // Code reads left to right on every page.
              "&__code": { display: "block", direction: "ltr" },
            },
          },
          children: [
            {
              type: "element",
              tag: "code",
              extensions: { bem: { element: "code" } },
              children: [{ type: "text", expression: "code" }],
            },
          ],
        },
      ],
    },
  ],
});
