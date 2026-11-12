import { defineTemplate } from "@js-template-engine/types";
import { stylePreamble } from "../template-helpers/style-preamble";

const imports =
  "import { keyedTreeGroup, pressedTreeGroup } from 'charcell/scripts/disclosure';";

/**
 * A collapsible tree section: the folder row (`[–]` open or `[+]` closed at
 * its end, or as its Tree's `disclosure` and `disclosurePosition` say, the
 * whole row pressing) over its children. A group is `mid` at
 * every depth, its rows' leaves at the foreground; `root` is the bold
 * top-level variant. The row carries the open state as `aria-expanded`, and
 * the styles read it there. A press, or enter or space, opens and closes it,
 * uncontrolled by default and open to start: `defaultOpen` seeds it, and
 * `onOpenChange` reports each change as the new open state. `open` holds it:
 * a press, or the tree's keys, is reported and the group stays as given.
 * `collapsible={false}` keeps the section open for good, the label a heading
 * row with no glyph, no wash and nothing to press.
 *
 * On its own the row is a button; in a Tree, the tree's engine makes it a
 * treeitem and its children a group, and the arrow keys open and close it.
 *
 * The box-drawing connectors are drawn here, derived from structure: each
 * direct child carries a horizontal tick (`─`) at its first row's center and a
 * vertical segment (`│`) spanning its height - the last child's segment stops
 * at its tick, closing the branch (`└`). Strokes are pseudo-element lines
 * centered in their cells (the center-of-cell rule), so the connectors need no
 * authored branch strings and hold at any depth.
 */
export default defineTemplate({
  type: "component",
  name: "TreeGroup",
  description: "a folder in a tree: a row that folds the rows nested under it.",
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
    /** The folder row's text. */
    label: { type: "string" },
    /** The initial open state; the group owns it from there. */
    defaultOpen: { type: "boolean", default: true },
    /** The open state, held by the consumer; pair it with `onOpenChange`. */
    open: {
      type: "boolean",
      bindable: {
        given: "givenOpen",
        report: "reportOpen",
        changeProp: "onOpenChange",
      },
    },
    /** Called with the new open state when the group opens or closes. */
    onOpenChange: { type: "(open: boolean) => void" },
    /** The top-level section: a bold label row. */
    root: { type: "boolean" },
    /** `false` keeps the section open, with no glyph and nothing to press. */
    collapsible: { type: "boolean", default: true },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellTreeGroup" } },
      conditionalAttributes: [
        {
          condition: "root === true",
          attributes: { class: ["CharcellTreeGroup--root"] },
        },
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          // A nested group is a tree row like a TreeItem: its branch and tick
          // take the two cells before its summary, drawn by the group itself
          // (a nested open group's segment runs down its whole span).
          "@include tree-branch": true,
          paddingInlineStart: "calc(2ch * var(--charcell-tree--nested, 0))",
          // The children hang one cell in, under the label's first letter
          // (the glyph's cell, when a tree puts it at the start): their branch
          // column is its.
          "&__children": {
            marginInlineStart: "1ch",
            // Its rows are nested: they draw their connectors and indent.
            "--charcell-tree--nested": "1",
          },
          "&__summary": {
            "@include paint(var(--charcell-mid))": true,
            "@include focusable": true,
            position: "relative",
            display: "flex",
            alignItems: "center",
            // A padding cell each side: the wash starts a cell before the
            // label, never on the branch. The first holds the focus pointer.
            padding: "0 1ch",
            // A spacious tree's row takes a second row under its label.
            paddingBlockEnd:
              "calc(var(--charcell-row) * (var(--charcell-tree--rows, 1) - 1))",
            whiteSpace: "nowrap",
            // A long label ellipsizes; the glyph stays.
            "&-label": {
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
            // The glyph and where it sits, a cell apart from the label, as the
            // tree states them (`[–]` / `[+]` at the row's end, on a group
            // outside a tree); set through custom properties, whose value
            // Sass keeps as written (a literal non-ascii character would lead
            // the sheet with a byte-order mark, ahead of the layer order).
            "&::after": {
              content: "var(--charcell-tree-group--glyph, none)",
              order: "var(--charcell-tree--glyph-order, 0)",
              flex: "none",
              // A control beside the label, so a root's bold stays the label's.
              fontWeight: "400",
              marginInlineStart: "var(--charcell-tree--glyph-shift, auto)",
              paddingInlineStart: "var(--charcell-tree--glyph-before, 1ch)",
              paddingInlineEnd: "var(--charcell-tree--glyph-after, 0)",
              color: "var(--charcell-text--resolved, var(--charcell-mid))",
            },
            "&::before": { "@include pointer": true },
            "&:focus-visible::before": { "@include focus-cue": true },
          },
          // Only a row that folds presses: a section that keeps open has a
          // plain label row.
          "& > &__summary[aria-expanded]": { cursor: "pointer" },
          "& > &__summary[aria-expanded]:hover": {
            "@include wash": true,
            "--charcell-text--resolved": "var(--charcell-foreground)",
          },
          "& > &__summary[aria-expanded]:hover::after": {
            "--charcell-text--resolved": "var(--charcell-foreground)",
          },
          // The glyph repeats what `aria-expanded` already exposes, so its
          // alternative text is empty.
          '& > &__summary[aria-expanded]:where(:not([aria-expanded="true"]))::after':
            {
              "--charcell-tree-group--glyph":
                'var(--charcell-tree--closed-glyph, "[+]" / "")',
            },
          '& > &__summary[aria-expanded="true"]::after': {
            "--charcell-tree-group--glyph":
              'var(--charcell-tree--open-glyph, "[\\2013]" / "")',
          },
          // A closed group's children fold away, unless no script runs to
          // open it (`--charcell-tree--folded`): with scripting off, a group
          // shows them, and on a page whose scripts failed, a group in a
          // tree its driver never marked.
          '& > &__summary[aria-expanded="false"] + &__children': {
            display: "var(--charcell-tree--folded, none)",
          },
          "@media (scripting: none)": {
            "&": { "--charcell-tree--folded": "block" },
          },
          // The root section's label row is bold, in the groups' one tone.
          "&--root > &__summary": { fontWeight: "700" },
        },
      },
      children: [
        {
          type: "element",
          tag: "div",
          // A group that keeps open has nothing to press.
          extensions: {
            bem: { element: "summary" },
            // Its role and tabindex share their condition, which Svelte's
            // check cannot follow.
            svelte: { ignore: ["a11y_no_noninteractive_tabindex"] },
          },
          events: [
            {
              name: "click",
              handler:
                "(event) => pressedTreeGroup(event, collapsible !== false, givenOpen, reportOpen)",
            },
            { name: "keydown", handler: "(event) => keyedTreeGroup(event)" },
          ],
          conditionalAttributes: [
            {
              condition: "collapsible !== false",
              attributes: {
                role: "button",
                tabindex: "0",
                "aria-expanded": {
                  $expression:
                    "(givenOpen !== undefined ? givenOpen : defaultOpen) ? 'true' : 'false'",
                },
              },
            },
          ],
          children: [
            {
              type: "conditional",
              conditions: [
                {
                  statement: "if",
                  condition: "label",
                  children: [
                    {
                      type: "element",
                      tag: "span",
                      extensions: { bem: { element: "summary-label" } },
                      children: [{ type: "text", expression: "label" }],
                    },
                  ],
                },
              ],
            },
            /** Content on the group's row after `label`, such as a count. */
            { type: "slot", name: "summary" },
          ],
        },
        {
          type: "element",
          tag: "div",
          extensions: { bem: { element: "children" } },
          children: [/** The group's rows, under its own. */ { type: "slot" }],
        },
      ],
    },
  ],
});
