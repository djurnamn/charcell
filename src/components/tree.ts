import { defineTemplate } from "@js-template-engine/types";

/**
 * `Tree` - the **compound**: the hand-written `TreeDriver` (charcell's
 * `TreeEngine` attached to the root) composed with `TreeVisual`. Its rows,
 * `TreeItem`s and `TreeGroup`s nested as deep as they go, are the default
 * slot; the consumer's other attributes land on the root, a name for the
 * tree (`aria-label`) among them.
 *
 * The tree is one tab stop - the selected row, or the group row it is
 * folded into, or the first - and the arrow keys move through the rows a
 * reader can see, as the ARIA tree pattern does: up and down to the
 * previous and next, right to open a group or go into it, left to close it
 * or go up to its group, home and end to the first and last, and typing a
 * label's first letters to it. Enter and space do what the row does: a
 * link follows, a button presses, a group folds.
 *
 * Each row is one 16px row, which misses WCAG 2.5.8's 24px target;
 * `spacious` gives each two, which meets it.
 */
export default defineTemplate({
  type: "component",
  name: "Tree",
  parts: ["TreeGroup", "TreeItem"],
  description:
    "nested rows joined by drawn lines. groups fold, and a row can be a link.",
  rest: { tag: "div" },
  props: {
    /** Gives each row two, its label in the first: a 32px target, which meets WCAG 2.5.8. One-row rows miss it. */
    spacious: { type: "boolean" },
    /** How a group marks its open state: `brackets`, `[–]` and `[+]`, or `triangle`, `▾` and `▸`. */
    disclosure: { type: "'brackets' | 'triangle'", default: "brackets" },
    /** Where a group's mark sits: at the row's `end`, a cell in from its edge; right after the `label`; or at the `start`, before the label, which indents a group's label past its sibling rows'. */
    disclosurePosition: {
      type: "'end' | 'label' | 'start'",
      default: "end",
    },
  },
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { TreeDriver } from './TreeDriver';",
        "import { TreeVisual } from './TreeVisual';",
      ],
    },
    vue: {
      imports: [
        "import TreeDriver from './TreeDriver.vue';",
        "import TreeVisual from './TreeVisual.vue';",
      ],
    },
    svelte: {
      imports: [
        "import TreeDriver from './TreeDriver.svelte';",
        "import TreeVisual from './TreeVisual.svelte';",
      ],
    },
  },
  children: [
    {
      type: "element",
      tag: "TreeDriver",
      slotScope: ["tree"],
      attributes: {
        rootProps: { $expression: "rest" },
      },
      children: [
        {
          type: "element",
          tag: "TreeVisual",
          attributes: {
            $spread: { $expression: "tree.rootProps ?? rest" },
            spacious: { $expression: "spacious" },
            disclosure: { $expression: "disclosure" },
            disclosurePosition: { $expression: "disclosurePosition" },
            scripted: { $expression: "tree.scripted" },
          },
          children: [
            /** The tree's rows: `TreeGroup`s and `TreeItem`s, nested as deep as they go. */
            { type: "slot" },
          ],
        },
      ],
    },
  ],
});
