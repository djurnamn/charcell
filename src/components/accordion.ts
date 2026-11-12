import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStylesMeeting,
} from "../template-helpers/border";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";

/**
 * Sections a reader opens as they need them: AccordionItems stacked in one
 * box. Each item is a native `<details>`, so opening needs no script; items
 * open on their own, or one at a time when they share a `name`.
 *
 * `boxed` (the default) draws the full-cell ring around the stack, the rule
 * between items meeting it at its `mid` (`├` and `┤`), or a heavy or double
 * side's inner line (`┠ ╟`); `border` styles its sides. `dense` is the bare
 * stack: no ring, no rules, the header rows alone.
 *
 * A header is one 16px row. Boxed, the rules hold headers 32px apart, which
 * meets WCAG 2.5.8 under its spacing exception; dense, they touch and miss
 * it. `spacious` gives each header two rows, which meets it either way.
 */
export default defineTemplate({
  type: "component",
  name: "Accordion",
  parts: ["AccordionItem"],
  description:
    "sections stacked in one column, each opening and closing on its own.",
  style: stylePreamble,
  props: {
    /** `boxed` rings the stack and rules between its items; `dense` is the bare stack. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** Gives each header two rows, its title in the first: a 32px target, which meets WCAG 2.5.8 in the dense stack too. */
    spacious: { type: "boolean" },
    /** The style of every side of the boxed stack's ring: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the boxed stack's ring's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the boxed stack's ring's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the boxed stack's ring's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the boxed stack's ring's end side, over `borderX` and `border`. */
    borderEnd: borderProp,
    /** The style of the boxed stack's ring's bottom side, over `borderY` and `border`. */
    borderBottom: borderProp,
    /** The style of the boxed stack's ring's start side, over `borderX` and `border`. */
    borderStart: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellAccordion" } },
      conditionalAttributes: [
        ...borderClasses("CharcellAccordion"),
        {
          condition: "variant === 'dense'",
          attributes: { class: ["CharcellAccordion--dense"] },
        },
        {
          condition: "spacious === true",
          attributes: { class: ["CharcellAccordion--spacious"] },
        },
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          position: "relative",
          // The ring sits under the content, inside the accordion's own stacking.
          isolation: "isolate",
          ...displayed("flex"),
          flexDirection: "column",
          // A heavy or double side's inner line, where the item rules meet it.
          ...borderStylesMeeting("--charcell-accordion--inner"),
          // Boxed, it rules its items apart: the context its items read
          // (`--charcell-accordion--ruled`), stated on every accordion so a
          // nested one never reads its host's.
          ...oneOf(["--dense"], {
            none: {
              padding: "var(--charcell-row) 1ch",
              "--charcell-accordion--ruled": "1",
              "&::before": { "@include ring": true },
            },
            "--dense": { "--charcell-accordion--ruled": "0" },
          }),
          // The rows each header takes, stated on every accordion too.
          ...oneOf(["--spacious"], {
            none: { "--charcell-accordion--rows": "1" },
            "--spacious": { "--charcell-accordion--rows": "2" },
          }),
        },
      },
      children: [
        /** The sections, an `AccordionItem` each. */ { type: "slot" },
      ],
    },
  ],
});
