import { defineTemplate } from "@js-template-engine/types";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";

/**
 * `SortableListVisual` - the sortable list's appearance: the list root, its
 * rows (`SortableRow`) and their grips. A passthrough root the `SortableList`
 * driver renders into; every stroke and state of the block lives here.
 *
 * A row is its grip, `⠿`, in the first cell, then a cell of space, then the
 * item. The grip is the one control that moves an item: drag it, press the
 * arrow keys on it, or click it to pick the item up and click another's to
 * place it. At rest its dots sit at `mid`; hovered, its cell fills `faint`
 * with the dots at `strong`; focused, picked up or dragged, it fills `mid`
 * with the dots at the foreground - the Splitter handle's states. The row
 * itself never changes, but for its ground while dragged, lifted over the
 * rows it passes. An `empty` list keeps one row, so an item can land in it,
 * and shows `SortablePlace` while an item is picked up. `spacious` gives each
 * row two, the grip both rows tall, its dots in the first.
 */
export default defineTemplate({
  type: "component",
  name: "SortableListVisual",
  description:
    "a sortable list's look: its rows, each with the grip that moves it.",
  style: stylePreamble,
  props: {
    /** No items: the list holds one row, so an item can be dropped into it. */
    empty: { type: "boolean" },
    /** Each row takes two rows, the grip both rows tall. */
    spacious: { type: "boolean" },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellSortableList" } },
      conditionalAttributes: [
        {
          condition: "empty === true",
          attributes: { class: ["CharcellSortableList--empty"] },
        },
        {
          condition: "spacious === true",
          attributes: { class: ["CharcellSortableList--spacious"] },
        },
      ],
      attributes: {
        role: "list",
        style: {
          "@include cell": true,
          "@include paint": true,
          ...displayed("flex"),
          flexDirection: "column",
          // The rows an item takes, stated on every list, so a list nested
          // in a spacious one's item keeps its own.
          ...oneOf(["--spacious"], {
            none: { "--charcell-sortable-list--rows": "1" },
            "--spacious": { "--charcell-sortable-list--rows": "2" },
          }),
          "&__row": {
            background: "var(--charcell-sortable-list--row-ground, none)",
            minHeight:
              "calc(var(--charcell-row) * var(--charcell-sortable-list--rows, 1))",
            // The grip in the first cell, a cell of space, then the item; an
            // item that places its own grip takes the whole row.
            ...oneOf(["--custom-grip"], {
              none: {
                display: "grid",
                gridTemplateColumns: "1ch minmax(0, 1fr)",
                columnGap: "1ch",
                alignItems: "start",
              },
              "--custom-grip": { display: "block" },
            }),
          },
          // The dragged row is lifted over the others: it paints the ground,
          // so the rows it passes never show through.
          "&__row--dragging": {
            "--charcell-sortable-list--row-ground":
              "var(--charcell-background)",
          },
          "&__grip": {
            "@include cell": true,
            "@include native-control": true,
            "@include grip(var(--charcell-sortable-list--dot, var(--charcell-mid)), var(--charcell-sortable-list--ground, transparent))": true,
            width: "1ch",
            height:
              "calc(var(--charcell-row) * var(--charcell-sortable-list--rows, 1))",
            outline: "none",
            cursor: "grab",
          },
          // A grip picked up or dragged, and a focused one, are engaged: it
          // fills `mid`. Hover washes it `faint`. The state is the grip's own
          // class, so a grip an item places anywhere carries it.
          "&__grip:hover": {
            "--charcell-sortable-list--ground": "var(--charcell-faint)",
            "--charcell-sortable-list--dot": "var(--charcell-strong)",
          },
          "&__grip:focus-visible, &__grip:active": {
            "--charcell-sortable-list--ground": "var(--charcell-mid)",
            "--charcell-sortable-list--dot": "var(--charcell-foreground)",
          },
          "&__grip--engaged": {
            "--charcell-sortable-list--ground": "var(--charcell-mid)",
            "--charcell-sortable-list--dot": "var(--charcell-foreground)",
          },
          "&--empty": { minHeight: "var(--charcell-row)" },
          // An empty list's way in while an item is picked up: its text in
          // `mid` between padding cells, washed `faint` on hover, the focus
          // pointer in the first.
          "&__place": {
            "@include cell": true,
            "@include native-control": true,
            "@include paint(var(--charcell-mid))": true,
            "@include focusable": true,
            position: "relative",
            alignSelf: "flex-start",
            padding: "0 1ch",
            cursor: "pointer",
          },
          "&__place::before": { "@include pointer": true },
          "&__place:where(:not(.CharcellSortableList__place--target)):hover": {
            "@include wash": true,
          },
          // Where a drag from another list lands: engaged, so inverted.
          "&__place--target": {
            "--charcell-fill--resolved": "var(--charcell-foreground)",
            "--charcell-text--resolved": "var(--charcell-background)",
          },
          "&__place:focus-visible::before": { "@include focus-cue": true },
          // Read by assistive technology, never shown.
          "&__announcement": { "@include visually-hidden": true },
        },
      },
      children: [{ type: "slot" }],
    },
  ],
});
