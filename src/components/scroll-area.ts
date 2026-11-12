import { defineTemplate } from "@js-template-engine/types";

/**
 * `ScrollArea` - the **compound**: the hand-written `ScrollAreaDriver`
 * (charcell's `ScrollAreaEngine` attached to the root) composed with
 * `ScrollAreaVisual`. The content is the default slot; the consumer's other
 * attributes land on the root.
 *
 * The browser scrolls for every input, with its own momentum and bounce
 * (`overscroll` keeps a scroll at the end from moving the page, or also
 * stops the bounce). `stepped` (the default) paints the content at the last
 * whole row the scroll has passed and settles the offset on that row once
 * scrolling ends, in engines that run scroll-driven animations; elsewhere it
 * scrolls fluidly. The arrow keys move a row (a column, across), page up
 * and down a page less a row, home and end to the ends, in every engine.
 * The viewport is a named, focusable region; drawn in `cells`, the
 * scrollbar's thumb climbs to the foreground while it has keyboard focus.
 * A scroll area needs a height, which `fill` takes from its container.
 * Not `focusable`, it sits in a widget that keeps focus itself, as a
 * listbox or a menu does, and keeps the widget's active item in view.
 */
export default defineTemplate({
  type: "component",
  name: "ScrollArea",
  description:
    "content that scrolls a whole row at a time, with a scrollbar drawn in cells.",
  rest: { tag: "div" },
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { ScrollAreaDriver } from './ScrollAreaDriver';",
        "import { ScrollAreaVisual } from './ScrollAreaVisual';",
      ],
    },
    vue: {
      imports: [
        "import ScrollAreaDriver from './ScrollAreaDriver.vue';",
        "import ScrollAreaVisual from './ScrollAreaVisual.vue';",
      ],
    },
    svelte: {
      imports: [
        "import ScrollAreaDriver from './ScrollAreaDriver.svelte';",
        "import ScrollAreaVisual from './ScrollAreaVisual.svelte';",
      ],
    },
  },
  props: {
    /** `stepped` paints the content at whole rows and columns; `fluid` as the browser scrolls it. */
    scrolling: { type: "'stepped' | 'fluid'", default: "stepped" },
    /** `cells` draws the scrollbar in cells; `hidden` draws none; `native` leaves the browser's. */
    scrollbar: { type: "'cells' | 'hidden' | 'native'", default: "cells" },
    /** The axes that scroll. */
    orientation: {
      type: "'vertical' | 'horizontal' | 'both'",
      default: "vertical",
    },
    /** `contain` keeps a scroll at the end from moving the page; `none` also stops the platform's bounce. */
    overscroll: { type: "'auto' | 'contain' | 'none'", default: "auto" },
    /** The region's accessible name. */
    label: { type: "string" },
    /** A named region and a tab stop; `false` inside a widget that keeps focus itself, as a listbox or a menu, whose active item the area keeps in view. */
    focusable: { type: "boolean", default: true },
    /** The attributes of the element that holds the content, for a widget the area sits in whose role belongs on its items' own parent (a menu's, a listbox's), so nothing of the area's comes between them. The element draws no focus cue: the widget's active item carries the keyboard position. */
    contentProps: { type: "object" },
    /** Takes the container's box: grows in a flex or grid layout, and takes the full height of a block that has one. */
    fill: { type: "boolean" },
  },
  children: [
    {
      type: "element",
      tag: "ScrollAreaDriver",
      slotScope: ["area"],
      attributes: {
        scrolling: { $expression: "scrolling" },
        orientation: { $expression: "orientation" },
        rootProps: { $expression: "rest" },
      },
      children: [
        {
          type: "element",
          tag: "ScrollAreaVisual",
          attributes: {
            $spread: { $expression: "area.rootProps ?? rest" },
            scrolling: { $expression: "scrolling" },
            scrollbar: { $expression: "scrollbar" },
            orientation: { $expression: "orientation" },
            overscroll: { $expression: "overscroll" },
            label: { $expression: "label" },
            focusable: { $expression: "focusable" },
            contentProps: { $expression: "contentProps" },
            fill: { $expression: "fill" },
            unmeasured: { $expression: "true" },
          },
          children: [/** The content that scrolls. */ { type: "slot" }],
        },
      ],
    },
  ],
});
