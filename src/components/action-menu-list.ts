import { defineTemplate } from "@js-template-engine/types";
import {
  borderClasses,
  borderProp,
  borderStyles,
} from "../template-helpers/border";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import {
  widthContent,
  widthImports,
  widthProp,
} from "../template-helpers/width";

/**
 * `ActionMenuList` - the open menu: a window of actions, the Select listbox's look.
 * A passthrough root (the compound spreads Zag's `getContentProps()`); the
 * compound tags each item with this block's element classes and draws a
 * group break as a charcell `Separator`.
 *
 * The window carries the foreground full-cell ring, its ground painted inside
 * the ring only, its sides styled by `border`. Items span the interior a row each: highlighted (pointer or
 * keyboard) = the faint wash with the pointer `❯` in its padding cell,
 * disabled = `mid`. `spacious` gives each item two rows, its text in the
 * first, so it meets WCAG 2.5.8's 24px target. An action has no selected
 * state, so nothing inverts. z-index is the listbox layer, so a menu opens
 * above a popover or a dialog. `width` sets the window's width in whole cells,
 * its ring included, and `minWidth` its least width. `attached` (a boxed
 * trigger) fuses the two as the Select's listbox and trigger fuse: the window
 * moves one row onto the trigger, its top stroke the trigger's bottom one, or
 * opened `above`, its bottom stroke the trigger's top one. It shows
 * `--charcell-listbox-rows` rows at most; the `ActionMenu` compound scrolls them
 * in a `ScrollArea`, a row at a time.
 */
export default defineTemplate({
  type: "component",
  name: "ActionMenuList",
  description:
    "the window a menu opens: its actions a row each, and separators between groups.",
  style: stylePreamble,
  extensions: {
    react: { imports: [widthImports.react] },
    vue: { imports: [widthImports.vue] },
    svelte: { imports: [widthImports.svelte] },
  },
  props: {
    /** Fuses the window to a boxed trigger: it moves one row onto it and shares its stroke. */
    attached: { type: "boolean" },
    /** Each item takes two rows, its text in the first: a 32px target, which meets WCAG 2.5.8. */
    spacious: { type: "boolean" },
    /** Opened above the trigger, so an attached window shares the trigger's top stroke. */
    above: { type: "boolean" },
    /** The window's width in whole cells, its ring included; it fits its content when unset, and never outgrows the space it has. */
    width: widthProp,
    /** The window's least width in whole cells, its ring included: it grows past it with its content. */
    minWidth: widthProp,
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
      extensions: { bem: { block: "CharcellActionMenuList" } },
      conditionalAttributes: [
        {
          condition: "attached === true",
          attributes: { class: ["CharcellActionMenuList--attached"] },
        },
        {
          condition: "above === true",
          attributes: { class: ["CharcellActionMenuList--above"] },
        },
        {
          condition: "spacious === true",
          attributes: { class: ["CharcellActionMenuList--spacious"] },
        },
        ...borderClasses("CharcellActionMenuList"),
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          position: "relative",
          zIndex: "var(--charcell-layer-listbox)",
          // Attached, the shared stroke row: one row onto the trigger, up when
          // the window opened below it and down when it opened above.
          ...oneOf(["--above"], {
            none: {
              "--charcell-action-menu-list--shift":
                "calc(var(--charcell-row) * -1)",
            },
            "--above": {
              "--charcell-action-menu-list--shift": "var(--charcell-row)",
            },
          }),
          // Attached, it is at least a cell wider than the trigger (Zag's
          // `--reference-width`), so its far corner stands clear of the
          // trigger's, which runs on through the shared row (`┴`): a side of
          // its own, double or heavy, meets no single side in one cell.
          ...oneOf(["--attached"], {
            none: {
              "--charcell-attached": "0",
              top: "0",
            },
            "--attached": {
              "--charcell-attached": "1",
              top: "var(--charcell-action-menu-list--shift)",
              minWidth: "calc(var(--reference-width, 0px) + 1ch)",
            },
          }),
          // Spacious, each item takes two rows.
          "&--spacious": { "--charcell-action-menu-list--rows": "2" },
          padding: "var(--charcell-row) 1ch",
          "&::before": {
            "@include ring($stroke: var(--charcell-foreground), $ground: var(--charcell-background))": true,
          },
          ...borderStyles(),
          // Attached, the row it shares with the trigger: its corners are
          // tees, the sides running on into the trigger (`attachingToTrigger`
          // marks the far corner as the two widths have it).
          "&--attached:where(:not(.CharcellActionMenuList--above))::before": {
            "@include ring-side(top, tee)": true,
          },
          "&--attached.CharcellActionMenuList--above::before": {
            "@include ring-side(bottom, tee)": true,
          },
          "&__item": {
            "@include paint": true,
            display: "flex",
            alignItems: "flex-start",
            height:
              "calc(var(--charcell-row) * var(--charcell-action-menu-list--rows, 1))",
            position: "relative",
            padding: "0 1ch",
            whiteSpace: "nowrap",
            cursor: "pointer",
            // The cursor, in the padding cell: the pointer `❯` on the
            // highlighted item, the keyboard's position as the pointer's.
            "&::before": { "@include pointer": true },
          },
          "&__item--highlighted:where(:not(.CharcellActionMenuList__item--disabled))":
            {
              "@include wash": true,
              "&::before": { "@include focus-cue": true },
            },
          // The items in a box of no role of its own, so the menu still owns
          // them.
          "&__content": {
            // A column of whole rows, `--charcell-listbox-rows` at most: the
            // compound sets a scroll area in it, which shrinks to the cap.
            display: "flex",
            flexDirection: "column",
            maxHeight:
              "calc(var(--charcell-row) * var(--charcell-listbox-rows))",
            overflow: "auto",
            overscrollBehavior: "none",
            width: "calc(var(--charcell-action-menu-list--width) * 1ch - 2ch)",
            minWidth:
              "calc(var(--charcell-action-menu-list--min-width) * 1ch - 2ch)",
            maxWidth: "100%",
          },
          "&__item--disabled": {
            "@include disabled": true,
          },
        },
      },
      children: [
        widthContent("--charcell-action-menu-list", [{ type: "slot" }], {
          role: "none",
        }),
      ],
    },
  ],
});
