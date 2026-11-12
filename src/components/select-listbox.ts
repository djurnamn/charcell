import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStyles,
} from "../template-helpers/border";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";

/**
 * `SelectListbox` - the open listbox: the floating panel of items (a native
 * `<select>`'s popup is drawn by the operating system and can't be made monochrome - the whole
 * reason this component exists). A passthrough root (the compound spreads
 * Zag's `getContentProps()`); the compound tags each iterated item with this
 * block's element classes, so all item styling lives here.
 *
 * An open listbox is a window, and an engaged one: the panel carries the
 * foreground stroke (the full-cell centered-stroke ring, Frame geometry) -
 * the bright ring lifts it; `border` styles its sides, as the trigger's.
 * Items span the ring's interior -
 * the highlight bar runs between the border cells, one cell in from each
 * side. Item states follow the kit feedback rules exactly: highlighted
 * (pointer or keyboard cursor) = the faint wash with the pointer `❯` in its
 * padding cell, selected = the inversion,
 * highlighted-while-selected = the dimmed inversion (`strong`). z-index sits
 * one above the Popover panel so a select can open from inside one.
 *
 * The listbox opens at the trigger's width, or wider for its items when the
 * trigger fits its value (`fit: 'value'`). `attached` (the boxed trigger)
 * fuses the two: the listbox moves one row onto the trigger, so its top
 * stroke is the trigger's bottom one - or, opened `above`, its bottom stroke
 * the trigger's top one - and that row's corners are tees (`├ ┣ ╟ ╠`), the
 * sides running on into the trigger.
 *
 * Each item is one row; `spacious` gives it two, its text in the first, so
 * it meets WCAG 2.5.8's 24px target, which a one-row item misses.
 *
 * The list shows `--charcell-listbox-rows` rows at most. The `Select`
 * compound scrolls them in a `ScrollArea`, a row at a time, its scrollbar
 * drawn in cells inside the ring.
 */
export default defineTemplate({
  type: "component",
  name: "SelectListbox",
  description:
    "the list a select opens: its choices a row each, the chosen one marked.",
  style: stylePreamble,
  props: {
    /** Fuses the listbox to a boxed trigger: it moves one row onto it and shares its stroke. */
    attached: { type: "boolean" },
    /** Each item takes two rows, its text in the first: a 32px target, which meets WCAG 2.5.8. */
    spacious: { type: "boolean" },
    /** Opened above the trigger, so an attached listbox shares the trigger's top stroke. */
    above: { type: "boolean" },
    /** The style of every side of the ring: `single`, `rounded`, `heavy`, `double` or `none`. */
    border: borderProp,
    /** The style of the ring's start and end sides, over `border`. */
    borderX: borderProp,
    /** The style of the ring's top and bottom sides, over `border`. */
    borderY: borderProp,
    /** The style of the ring's top side, over `borderY` and `border`. */
    borderTop: borderProp,
    /** The style of the ring's end side, over `borderX` and `border`. */
    borderEnd: borderProp,
    /** The style of the ring's bottom side, over `borderY` and `border`. */
    borderBottom: borderProp,
    /** The style of the ring's start side, over `borderX` and `border`. */
    borderStart: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellSelectListbox" } },
      conditionalAttributes: [
        {
          condition: "attached === true",
          attributes: { class: ["CharcellSelectListbox--attached"] },
        },
        {
          condition: "above === true",
          attributes: { class: ["CharcellSelectListbox--above"] },
        },
        {
          condition: "spacious === true",
          attributes: { class: ["CharcellSelectListbox--spacious"] },
        },
        ...borderClasses("CharcellSelectListbox"),
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          position: "relative",
          zIndex: "var(--charcell-layer-listbox)",
          // At least the trigger's width (Zag's `--reference-width`), as wide
          // as its items when they are wider.
          minWidth: "var(--reference-width, 0px)",
          // Attached, the shared stroke row: one row onto the trigger, up when
          // the listbox opened below it and down when it opened above.
          ...oneOf(["--above"], {
            none: {
              "--charcell-select-listbox--shift":
                "calc(var(--charcell-row) * -1)",
            },
            "--above": {
              "--charcell-select-listbox--shift": "var(--charcell-row)",
            },
          }),
          ...oneOf(["--attached"], {
            none: { top: "0" },
            "--attached": { top: "var(--charcell-select-listbox--shift)" },
          }),
          // Spacious, each item takes two rows.
          "&--spacious": { "--charcell-select-listbox--rows": "2" },
          padding: "var(--charcell-row) 1ch",
          // The ring lives on the (non-scrolling) root; `__list` holds the
          // items inside it - a pseudo-element on a scroll container would
          // scroll away.
          // The window's ground covers its whole cells, the ring's included.
          // The root's own layer is a stacking context: the ring sits behind
          // the items.
          "&::before": {
            "@include ring($stroke: var(--charcell-foreground), $ground: var(--charcell-background))": true,
          },
          ...borderStyles(),
          // Attached, the shared row's corners are tees; wider than the
          // trigger (`--charcell-select--wider`, the driver's), the far one is
          // the listbox's own corner, and the shared line under the trigger is
          // the trigger's to draw, its junction among it: the listbox's starts
          // past it (`--charcell-select--trigger-width`, the driver's too).
          // The end corner is the right one, or the left on a right-to-left page;
          // the listbox's line stops short of the trigger there (`until`).
          ...perDirection((direction) => {
            const end = direction === "rtl" ? "left" : "right";
            const from = direction === "rtl" ? "until" : "from";
            return {
              "&--attached:where(:not(.CharcellSelectListbox--above))::before":
                {
                  "@include ring-side(top, tee)": true,
                  [`--charcell-ring--top-${end}-tee`]:
                    "calc(1 - var(--charcell-select--wider, 0))",
                  [`--charcell-ring--top-${from}`]:
                    "calc(var(--charcell-select--wider, 0) * var(--charcell-select--trigger-width, 0px))",
                  "--charcell-ring--top-shared":
                    "var(--charcell-select--wider, 0)",
                },
              "&--attached.CharcellSelectListbox--above::before": {
                "@include ring-side(bottom, tee)": true,
                [`--charcell-ring--bottom-${end}-tee`]:
                  "calc(1 - var(--charcell-select--wider, 0))",
                [`--charcell-ring--bottom-${from}`]:
                  "calc(var(--charcell-select--wider, 0) * var(--charcell-select--trigger-width, 0px))",
                "--charcell-ring--bottom-shared":
                  "var(--charcell-select--wider, 0)",
              },
            };
          }),
          "&__list": {
            // Whole rows, so the edge never cuts an item mid-cell. The
            // compound sets a scroll area in it, which shrinks to the cap.
            display: "flex",
            flexDirection: "column",
            maxHeight:
              "calc(var(--charcell-row) * var(--charcell-listbox-rows))",
            overflow: "auto",
            overscrollBehavior: "none",
          },
          "&__item": {
            "@include paint": true,
            display: "flex",
            alignItems: "flex-start",
            height:
              "calc(var(--charcell-row) * var(--charcell-select-listbox--rows, 1))",
            position: "relative",
            padding: "0 1ch",
            whiteSpace: "nowrap",
            cursor: "pointer",
            // The cursor, in the padding cell: the pointer `❯` on the
            // highlighted item, the keyboard's position as the pointer's.
            "&::before": { "@include pointer": true },
          },
          "&__item--highlighted:where(:not(.CharcellSelectListbox__item--disabled))::before":
            {
              "@include focus-cue": true,
            },
          // The machine mirrors its item states onto modifiers; each combination
          // is stated once, so no modifier is written over another. Disabled
          // beats the rest.
          "&__item--highlighted:where(:not(.CharcellSelectListbox__item--selected, .CharcellSelectListbox__item--disabled))":
            {
              "@include wash": true,
            },
          "&__item--selected:where(:not(.CharcellSelectListbox__item--highlighted, .CharcellSelectListbox__item--disabled))":
            {
              "@include inverted": true,
            },
          "&__item--selected.CharcellSelectListbox__item--highlighted:where(:not(.CharcellSelectListbox__item--disabled))":
            {
              "@include inverted(var(--charcell-strong))": true,
            },
          "&__item--disabled": {
            "@include disabled": true,
          },
        },
      },
      children: [
        {
          type: "element",
          tag: "div",
          extensions: { bem: { element: "list" } },
          children: [{ type: "slot" }],
        },
      ],
    },
  ],
});
