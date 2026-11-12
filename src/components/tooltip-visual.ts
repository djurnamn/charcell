import { defineTemplate } from "@js-template-engine/types";
import { stylePreamble } from "../template-helpers/style-preamble";

/**
 * `TooltipVisual` - the box a tooltip's hint shows in: a passthrough root
 * (the compound spreads Zag's `getContentProps()`, `role="tooltip"`), the
 * hint inside a full-cell ring at `mid`, a step quieter than a window's
 * foreground ring: it floats over the page, and asks nothing. A cell of
 * gutter each side of the hint, which wraps past 40 cells. z-index is the
 * tooltip layer, over every other floating surface.
 */
export default defineTemplate({
  type: "component",
  name: "TooltipVisual",
  description: "the box a tooltip's hint shows in, ringed at mid.",
  style: stylePreamble,
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellTooltip" } },
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          position: "relative",
          zIndex: "var(--charcell-layer-tooltip)",
          // The ring's cell, then a cell of gutter.
          padding: "var(--charcell-row) 2ch",
          maxWidth: "min(44ch, calc(100vw - 2ch))",
          "&::before": {
            "@include ring($stroke: var(--charcell-mid), $ground: var(--charcell-background))": true,
          },
        },
      },
      children: [{ type: "slot" }],
    },
  ],
});
