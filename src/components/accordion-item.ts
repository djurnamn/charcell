import { defineTemplate } from "@js-template-engine/types";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";

const imports =
  "import { pressedDisclosure, toggledDisclosure } from 'charcell/scripts/disclosure';";

/**
 * One section of an Accordion: a native `<details>` - the summary is its
 * header row (`▾` open or `▸` closed before the title, driven by the open
 * state in CSS, as a TreeGroup's), the content opens under it. Opening is the
 * platform's, uncontrolled by default: `defaultOpen` seeds it, and
 * `onOpenChange` reports each change as the new open state. `open` holds it:
 * a press, or a sibling closing it, is reported and the section stays as
 * given. Items that share a `name` open one at a time, the browser closing
 * the others.
 *
 * `headingAs` sets the title in a heading, so a screen reader's heading list
 * reaches each section; the heading keeps the row's own type.
 *
 * In a boxed Accordion each item after the first draws the rule above it, run
 * out to the ring's strokes at the ring's tone, so the two meet as `├` and
 * `┤` (a junction is one glyph at one tone).
 */
export default defineTemplate({
  type: "component",
  name: "AccordionItem",
  description:
    "one section of an accordion: a title row that opens and closes what is under it.",
  style: stylePreamble,
  extensions: {
    react: {
      // It sets handlers on its own element, so it is a client module.
      client: true,
      imports: [imports],
    },
    // Vue binds the open state with `v-model:open`, Svelte with `bind:open`.
    vue: { imports: [imports] },
    svelte: { imports: [imports] },
  },
  props: {
    /** The header row's text, after the `▾` / `▸` glyph. */
    title: { type: "string" },
    /** The initial open state; the native disclosure owns it from there. */
    defaultOpen: { type: "boolean" },
    /** The open state, held by the consumer; pair it with `onOpenChange`. */
    open: {
      type: "boolean",
      bindable: {
        given: "givenOpen",
        report: "reportOpen",
        changeProp: "onOpenChange",
      },
    },
    /** Called with the new open state when the section opens or closes. */
    onOpenChange: { type: "(open: boolean) => void" },
    /** The heading the title sits in, for a screen reader's list of headings. */
    headingAs: { type: "'h2' | 'h3' | 'h4' | 'h5' | 'h6'" },
  },
  children: [
    {
      type: "element",
      tag: "details",
      passthrough: true,
      extensions: { bem: { block: "CharcellAccordionItem" } },
      events: [
        {
          name: "toggle",
          handler: "(event) => toggledDisclosure(event, givenOpen, reportOpen)",
        },
      ],
      attributes: {
        open: {
          $expression:
            "(givenOpen !== undefined ? givenOpen : defaultOpen) ? true : undefined",
        },
        style: {
          "@include cell": true,
          "@include paint": true,
          position: "relative",
          // The rule above an item after the first, where its accordion
          // rules them (`--charcell-accordion--ruled`, the boxed one's): a
          // row of its own, the stroke on the row's center pixel, from the
          // ring's left stroke to its right one, a cell out on either side
          // (to a heavy or double side's inner line).
          "& + &": {
            marginTop:
              "calc(var(--charcell-row) * var(--charcell-accordion--ruled, 0))",
          },
          "& + &::before": {
            content: '""',
            position: "absolute",
            top: "calc(var(--charcell-stroke-y) - var(--charcell-row))",
            right:
              "calc(-1 * var(--charcell-accordion--inner-right, 0px) - var(--charcell-stroke-x) - 1px)",
            left: "calc(var(--charcell-stroke-x) + var(--charcell-accordion--inner-left, 0px) - 1ch)",
            height: "calc(1px * var(--charcell-accordion--ruled, 0))",
            background: "var(--charcell-mid)",
            pointerEvents: "none",
          },
          "&__summary": {
            "@include paint": true,
            "@include focusable": true,
            position: "relative",
            display: "flex",
            alignItems: "center",
            // A padding cell each side: the wash starts a cell before the
            // glyph, which sits in the column the content starts in. The first
            // holds the focus pointer.
            padding: "0 1ch",
            // A spacious accordion's header takes a second row under its
            // title (`--charcell-accordion--rows`).
            paddingBlockEnd:
              "calc(var(--charcell-row) * (var(--charcell-accordion--rows, 1) - 1))",
            whiteSpace: "nowrap",
            cursor: "pointer",
            // The `▾` / `▸` glyph below is the disclosure affordance; the ua
            // marker would be a second one.
            listStyle: "none",
            "&::-webkit-details-marker": {
              display: "none",
            },
            // The glyph, before the title, a cell apart from it; set through a
            // custom property, whose value Sass keeps as written (a literal
            // non-ascii character would lead the sheet with a byte-order mark,
            // ahead of the layer order).
            "&::after": {
              content: "var(--charcell-accordion-item--glyph, none)",
              order: "-1",
              flex: "none",
              paddingInlineEnd: "1ch",
              color: "var(--charcell-text--resolved, var(--charcell-mid))",
            },
            "&:hover": { "@include wash": true },
            "&:hover::after": {
              "--charcell-text--resolved": "var(--charcell-foreground)",
            },
            "&::before": { "@include pointer": true },
            "&:focus-visible::before": { "@include focus-cue": true },
          },
          // A long title ellipsizes; the glyph stays.
          "&__title": {
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
          // The glyph repeats what `<details>` already exposes, so its
          // alternative text is empty.
          // Closed, it points the way the row reads.
          ...perDirection((direction) => ({
            "&:where(:not([open])) > &__summary::after": {
              "--charcell-accordion-item--glyph":
                direction === "rtl" ? '"\\25C2" / ""' : '"\\25B8" / ""',
            },
          })),
          "&[open] > &__summary::after": {
            "--charcell-accordion-item--glyph": '"\\25BE" / ""',
          },
          // The content starts in the title's column, a row under the title,
          // and ends a row clear of whatever follows.
          "&__content": {
            padding: "var(--charcell-row) 1ch",
          },
        },
      },
      children: [
        {
          type: "element",
          tag: "summary",
          extensions: { bem: { element: "summary" } },
          events: [
            {
              name: "click",
              handler:
                "(event) => pressedDisclosure(event, givenOpen, reportOpen)",
            },
          ],
          children: [
            {
              type: "element",
              tag: {
                $expression: "headingAs !== undefined ? headingAs : 'span'",
                default: "span",
              },
              extensions: { bem: { element: "title" } },
              children: [{ type: "text", expression: "title" }],
            },
          ],
        },
        {
          type: "element",
          tag: "div",
          extensions: { bem: { element: "content" } },
          children: [
            /** The section's content, under its header row. */
            { type: "slot" },
          ],
        },
      ],
    },
  ],
});
