import { defineTemplate } from "@js-template-engine/types";
import { borderProp } from "../template-helpers/border";
import { stylePreamble } from "../template-helpers/style-preamble";
import {
  widthContent,
  widthImports,
  widthProp,
} from "../template-helpers/width";
import { displayed } from "../template-helpers/hidden";

/**
 * `DialogPanel` - the open modal: a window over the page. The root is the
 * positioner (the compound spreads Zag's `getPositionerProps()` onto it), a
 * fixed layer that centers the window; the window is a charcell `Frame` taking
 * the `contentProps` record - the active (foreground) ring, its sides styled
 * by `border`, and `label` as its straddling title. The `actions` slot is the window's last
 * row, packed against its end.
 *
 * No backdrop: a cell has no translucency, and a solid one would blank the
 * page out. The bright, raised ring lifts the window, the focus trap
 * holds the keyboard inside it, and the page behind is hidden from assistive
 * technology. The window is at most 72ch wide, and on a narrow screen keeps a
 * cell clear of each edge. `width` sets the window's width in whole cells,
 * its ring included, past the 72ch measure if asked, and `minWidth` its
 * least width; the gutter is the
 * Frame's (`--charcell-frame--gutter`).
 */
export default defineTemplate({
  type: "component",
  name: "DialogPanel",
  description:
    "the window a dialog opens: a titled frame over the page, its actions on the last row.",
  style: stylePreamble,
  extensions: {
    react: {
      imports: ["import { Frame } from './Frame';", widthImports.react],
    },
    vue: { imports: ["import Frame from './Frame.vue';", widthImports.vue] },
    svelte: {
      imports: ["import Frame from './Frame.svelte';", widthImports.svelte],
    },
  },
  props: {
    /** The window's title, straddling the top of its ring. */
    label: { type: "string" },
    /** The window's width in whole cells, its ring included; it fits its content when unset, and never outgrows the space it has. */
    width: widthProp,
    /** The window's least width in whole cells, its ring included: it grows past it with its content. */
    minWidth: widthProp,
    /** The style of every side of the window's ring: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the window's ring's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the window's ring's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the window's ring's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the window's ring's end side, over `borderX` and `border`. */
    borderEnd: borderProp,
    /** The style of the window's ring's bottom side, over `borderY` and `border`. */
    borderBottom: borderProp,
    /** The style of the window's ring's start side, over `borderX` and `border`. */
    borderStart: borderProp,
    /** Spread onto the window (Zag's `getContentProps()`). */
    contentProps: { type: "object" },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellDialogPanel" } },
      attributes: {
        style: {
          "@include cell": true,
          position: "fixed",
          inset: "0",
          zIndex: "var(--charcell-layer-dialog)",
          ...displayed("grid"),
          // One column, the window centered in it; the content keeps the
          // measure.
          gridTemplateColumns: "minmax(0, max-content)",
          justifyContent: "center",
          placeItems: "center",
          padding: "var(--charcell-row) 1ch",
          overflow: "auto",
          // The window is `width` cells, ring and gutter included, or fits
          // its content up to a readable 72ch, and never outgrows the screen.
          "&__content": {
            width:
              "calc(var(--charcell-dialog-panel--width) * 1ch - 2ch - 2 * var(--charcell-frame--gutter))",
            // A least width beats a greatest one, so it keeps to the screen
            // itself.
            minWidth:
              "calc(min(100vw - 2ch, var(--charcell-dialog-panel--min-width) * 1ch) - 2ch - 2 * var(--charcell-frame--gutter))",
            // The screen less the cell kept clear each side, in the viewport's
            // units: a percentage would go unread while the window sizes
            // itself to its content.
            maxWidth:
              "calc(min(100vw - 2ch, max(72, var(--charcell-dialog-panel--width, 0), var(--charcell-dialog-panel--min-width, 0)) * 1ch) - 2ch - 2 * var(--charcell-frame--gutter))",
          },
          "&__actions": {
            display: "flex",
            justifyContent: "flex-end",
            gap: "1ch",
          },
        },
      },
      children: [
        {
          type: "element",
          tag: "Frame",
          attributes: {
            $spread: { $expression: "contentProps" },
            as: "div",
            title: { $expression: "label" },
            active: { $expression: "true" },
            border: { $expression: "border" },
            borderX: { $expression: "borderX" },
            borderY: { $expression: "borderY" },
            borderTop: { $expression: "borderTop" },
            borderEnd: { $expression: "borderEnd" },
            borderBottom: { $expression: "borderBottom" },
            borderStart: { $expression: "borderStart" },
          },
          children: [
            widthContent("--charcell-dialog-panel", [
              { type: "slot" },
              {
                type: "element",
                tag: "div",
                extensions: { bem: { element: "actions" } },
                children: [{ type: "slot", name: "actions" }],
              },
            ]),
          ],
        },
      ],
    },
  ],
});
