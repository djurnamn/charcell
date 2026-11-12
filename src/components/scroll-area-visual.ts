import { defineTemplate } from "@js-template-engine/types";
import { fillClass, fillProp, fillStyles } from "../template-helpers/fill";
import { displayed } from "../template-helpers/hidden";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";

/**
 * `ScrollAreaVisual` - a scroll area's appearance: the root, the viewport
 * the browser scrolls, the content inside it, and the scrollbars drawn in
 * cells. A passthrough root the `ScrollAreaDriver` attaches its engine to
 * (`charcell/scripts`, `ScrollAreaEngine`).
 *
 * The browser scrolls for every input, with its own momentum and bounce.
 * `stepped` paints the content at the last whole row (and column) the
 * scroll has passed, as a terminal does: two scroll-driven animations on
 * the content cancel the scroll and move it back a whole cell at a time, in
 * engines that run scroll-driven animations; elsewhere it scrolls fluidly.
 * The content sits in a wrapper that clips, so the animations never count
 * toward the scroll range.
 *
 * `cells` draws each scrollbar in its own column (row, across): a step
 * button at each end, its triangle pointing its way, and between them a
 * track filling its cells at `faint` and a thumb filling whole cells at `mid`,
 * `strong` on hover and the foreground while dragged or while the viewport
 * has keyboard focus - the scroll area's focus cue. `hidden` draws none;
 * `native` leaves the browser's, tinted, and its focus outline. A bar steps
 * aside while the content fits along its axis.
 *
 * Not `focusable`, the area sits in a widget that keeps focus itself, as a
 * listbox or a menu does: the viewport is no region and no tab stop, and the
 * engine keeps the widget's active item in view.
 */
export default defineTemplate({
  type: "component",
  name: "ScrollAreaVisual",
  description:
    "a scroll area's look: the content, painted at whole rows, and a scrollbar drawn in cells.",
  style: stylePreamble,
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
    /** The bar across stays aside until the engine has measured whether it is needed: the compound's, so content that fits draws none before the script runs. */
    unmeasured: { type: "boolean" },
    /** The attributes of the element that holds the content, for a widget the area sits in whose role belongs on its items' own parent (a menu's, a listbox's), so nothing of the area's comes between them. The element draws no focus cue: the widget's active item carries the keyboard position. */
    contentProps: { type: "object" },
    /** Takes the container's box: grows in a flex or grid layout, and takes the full height of a block that has one. */
    fill: fillProp,
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellScrollArea" } },
      conditionalAttributes: [
        {
          condition: "scrolling !== 'fluid'",
          attributes: { class: ["CharcellScrollArea--stepped"] },
        },
        {
          condition: "scrollbar === 'hidden'",
          attributes: { class: ["CharcellScrollArea--scrollbar-hidden"] },
        },
        {
          condition: "scrollbar === 'native'",
          attributes: { class: ["CharcellScrollArea--scrollbar-native"] },
        },
        {
          condition: "orientation === 'horizontal'",
          attributes: { class: ["CharcellScrollArea--horizontal"] },
        },
        {
          condition: "orientation === 'both'",
          attributes: { class: ["CharcellScrollArea--both"] },
        },
        {
          condition: "overscroll === 'contain'",
          attributes: { class: ["CharcellScrollArea--overscroll-contain"] },
        },
        {
          condition: "overscroll === 'none'",
          attributes: { class: ["CharcellScrollArea--overscroll-none"] },
        },
        fillClass("CharcellScrollArea"),
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          ...displayed("grid"),
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gridTemplateRows: "minmax(0, 1fr) auto",
          ...fillStyles(),
          "&__viewport": {
            gridColumn: "1",
            gridRow: "1",
            // The timelines the content's animations follow, one an axis.
            scrollTimeline:
              "--charcell-scroll-area--block block, --charcell-scroll-area--inline inline",
          },
          // The axes the viewport scrolls.
          // `overscroll` holds only the axes that scroll: a wheel along the
          // other goes on to the page.
          ...oneOf(["--horizontal", "--both"], {
            none: {
              "&__viewport": {
                overflow: "hidden auto",
                overscrollBehavior:
                  "auto var(--charcell-scroll-area--overscroll)",
              },
            },
            "--horizontal": {
              "&__viewport": {
                overflow: "auto hidden",
                overscrollBehavior:
                  "var(--charcell-scroll-area--overscroll) auto",
              },
            },
            "--both": {
              "&__viewport": {
                overflow: "auto",
                overscrollBehavior: "var(--charcell-scroll-area--overscroll)",
              },
            },
          }),
          ...oneOf(["--overscroll-contain", "--overscroll-none"], {
            none: { "--charcell-scroll-area--overscroll": "auto" },
            "--overscroll-contain": {
              "--charcell-scroll-area--overscroll": "contain",
            },
            "--overscroll-none": {
              "--charcell-scroll-area--overscroll": "none",
            },
          }),
          // The browser's scrollbar: hidden under a drawn one or none, tinted
          // where it stays. Drawn in cells, the viewport's focus cue is the
          // thumb climbing to the foreground; the others keep the browser's
          // outline.
          ...oneOf(["--scrollbar-hidden", "--scrollbar-native"], {
            none: {
              "&__viewport": {
                "@include focusable": true,
                scrollbarWidth: "none",
              },
              "&__viewport::-webkit-scrollbar": { display: "none" },
            },
            "--scrollbar-hidden": {
              "&__viewport": { scrollbarWidth: "none" },
              "&__viewport::-webkit-scrollbar": { display: "none" },
            },
            "--scrollbar-native": {
              "&__viewport": {
                scrollbarColor: "var(--charcell-mid) var(--charcell-faint)",
              },
            },
          }),
          // The content, clipped so its animations never count toward the
          // scroll range, and padded to a whole cell of range by the engine.
          "&__clip": {
            overflow: "clip",
            minWidth: "100%",
          },
          ...oneOf(["--horizontal", "--both"], {
            none: { "&__viewport > &__clip": { width: "auto" } },
            "--horizontal": {
              "&__viewport > &__clip": { width: "max-content" },
            },
            "--both": { "&__viewport > &__clip": { width: "max-content" } },
          }),
          "&__rows": {
            paddingBottom: "var(--charcell-scroll-area--pad, 0px)",
          },
          "&__columns": {
            paddingInlineEnd: "var(--charcell-scroll-area--pad, 0px)",
            // A widget that takes focus here keeps its cue on its active item.
            outline: "none",
          },
          // A right-to-left page scrolls across the other way.
          "&:where(:dir(rtl))": { "--charcell-scroll-area--inline-sign": "-1" },
          // The keyframes the stepped content follows (`scroll-steps`).
          "@include scroll-steps": true,
          "@supports (animation-timeline: scroll())": {
            "&--stepped > &__viewport > &__clip > &__rows": {
              animation:
                "charcell-scroll-area-pin-block linear both, charcell-scroll-area-step-block steps(var(--charcell-scroll-area--block-steps, 1), jump-end) both",
              animationTimeline:
                "--charcell-scroll-area--block, --charcell-scroll-area--block",
            },
            "&--stepped > &__viewport > &__clip > &__rows > &__columns": {
              animation:
                "charcell-scroll-area-pin-inline linear both, charcell-scroll-area-step-inline steps(var(--charcell-scroll-area--inline-steps, 1), jump-end) both",
              animationTimeline:
                "--charcell-scroll-area--inline, --charcell-scroll-area--inline",
            },
          },
          // A scrollbar drawn in cells: its own column (row, across), a step
          // button at each end, and between them a track of whole cells at
          // `faint` with a thumb of whole cells on it.
          "&__vertical-bar, &__horizontal-bar": {
            touchAction: "none",
            userSelect: "none",
            cursor: "default",
            "&:hover": {
              "--charcell-scroll-area--thumb": "var(--charcell-strong)",
            },
          },
          // The engine marks a bar whose axis has nothing to scroll: it steps
          // aside, and its column (row) with it.
          "&__vertical-bar--fitting, &__horizontal-bar--fitting": {
            "--charcell-scroll-area--bar-display": "none",
          },
          "&__vertical-bar--dragging, &__horizontal-bar--dragging": {
            "--charcell-scroll-area--thumb": "var(--charcell-foreground)",
          },
          "&:has(> &__viewport:focus-visible) > &__vertical-bar, &:has(> &__viewport:focus-visible) > &__horizontal-bar":
            {
              "--charcell-scroll-area--thumb": "var(--charcell-foreground)",
            },
          ...oneOf(["--horizontal"], {
            none: {
              "&__vertical-bar": {
                display: "var(--charcell-scroll-area--bar-display, grid)",
                gridColumn: "2",
                gridRow: "1",
                width: "1ch",
                gridTemplateRows:
                  "var(--charcell-row) minmax(0, 1fr) var(--charcell-row)",
              },
            },
            "--horizontal": {
              "&__vertical-bar": { display: "none" },
            },
          }),
          "&__horizontal-bar": {
            gridColumn: "1",
            gridRow: "2",
            height: "var(--charcell-row)",
            gridTemplateColumns: "1ch minmax(0, 1fr) 1ch",
          },
          ...oneOf(["--horizontal", "--both"], {
            none: { "&__horizontal-bar": { display: "none" } },
            "--horizontal": {
              "&__horizontal-bar": {
                display: "var(--charcell-scroll-area--bar-display, grid)",
              },
            },
            "--both": {
              "&__horizontal-bar": {
                display: "var(--charcell-scroll-area--bar-display, grid)",
              },
            },
          }),
          // A step button: a row (column) a press, again while held. Its
          // triangle is `mid`, `strong` under the pointer and the foreground
          // while pressed.
          // Across, the steps point the way they scroll: back toward the
          // start, forward toward the end, so on a right-to-left page the
          // first, on the right, points right. Through a custom property,
          // whose value Sass keeps as written; the alternative text is empty,
          // as the bar is hidden from assistive technology.
          "&__horizontal-bar > &__step::before": {
            content: "var(--charcell-scroll-area--step-glyph, none)",
          },
          ...perDirection((direction) => ({
            "&__horizontal-bar > &__step:first-child": {
              "--charcell-scroll-area--step-glyph":
                direction === "rtl" ? '"\\25B8" / ""' : '"\\25C2" / ""',
            },
            "&__horizontal-bar > &__step:where(:not(:first-child))": {
              "--charcell-scroll-area--step-glyph":
                direction === "rtl" ? '"\\25C2" / ""' : '"\\25B8" / ""',
            },
          })),
          "&__step": {
            color: "var(--charcell-scroll-area--step, var(--charcell-mid))",
            "&:hover": {
              "--charcell-scroll-area--step": "var(--charcell-strong)",
            },
            "&:active": {
              "--charcell-scroll-area--step": "var(--charcell-foreground)",
            },
          },
          "&__vertical-track, &__horizontal-track": {
            position: "relative",
            background: "var(--charcell-faint)",
          },
          "&__vertical-thumb, &__horizontal-thumb": {
            position: "absolute",
            background:
              "var(--charcell-scroll-area--thumb, var(--charcell-mid))",
            forcedColorAdjust:
              "var(--charcell-forced-color-adjust--resolved, auto)",
            // Forced colors would drop a filled thumb: it takes the text's.
            "@media (forced-colors: active)": {
              "--charcell-scroll-area--thumb": "CanvasText",
              "--charcell-forced-color-adjust--resolved": "none",
            },
          },
          "&__vertical-track > &__vertical-thumb": {
            left: "0",
            width: "1ch",
            top: "calc(var(--charcell-scroll-area--thumb-start, 0) * var(--charcell-row))",
            height:
              "calc(var(--charcell-scroll-area--thumb-length, 0) * var(--charcell-row))",
          },
          "&__horizontal-track > &__horizontal-thumb": {
            top: "0",
            height: "var(--charcell-row)",
            insetInlineStart:
              "calc(var(--charcell-scroll-area--thumb-start, 0) * 1ch)",
            width: "calc(var(--charcell-scroll-area--thumb-length, 0) * 1ch)",
          },
        },
      },
      children: [
        {
          type: "element",
          tag: "div",
          // Role and tabindex share their condition, which Svelte's check
          // cannot follow.
          extensions: {
            bem: { element: "viewport" },
            svelte: { ignore: ["a11y_no_noninteractive_tabindex"] },
          },
          attributes: {
            tabindex: { $expression: "focusable === false ? -1 : 0" },
            // A region without a name announces nothing.
            role: {
              $expression:
                "focusable === false || !label ? undefined : 'region'",
            },
            "aria-label": {
              $expression: "focusable === false ? undefined : label",
            },
          },
          children: [
            {
              type: "element",
              tag: "div",
              extensions: { bem: { element: "clip" } },
              children: [
                {
                  type: "element",
                  tag: "div",
                  extensions: { bem: { element: "rows" } },
                  children: [
                    {
                      type: "element",
                      tag: "div",
                      extensions: { bem: { element: "columns" } },
                      attributes: {
                        $spread: { $expression: "contentProps ?? {}" },
                      },
                      children: [{ type: "slot" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "conditional",
          conditions: [
            {
              statement: "if",
              condition: "scrollbar === undefined || scrollbar === 'cells'",
              children: [
                {
                  type: "element",
                  tag: "div",
                  extensions: { bem: { element: "vertical-bar" } },
                  attributes: { "aria-hidden": "true" },
                  children: [
                    {
                      type: "element",
                      tag: "div",
                      extensions: { bem: { element: "step" } },
                      children: [{ type: "text", content: "▴" }],
                    },
                    {
                      type: "element",
                      tag: "div",
                      extensions: { bem: { element: "vertical-track" } },
                      children: [
                        {
                          type: "element",
                          tag: "div",
                          extensions: { bem: { element: "vertical-thumb" } },
                        },
                      ],
                    },
                    {
                      type: "element",
                      tag: "div",
                      extensions: { bem: { element: "step" } },
                      children: [{ type: "text", content: "▾" }],
                    },
                  ],
                },
                {
                  type: "element",
                  tag: "div",
                  extensions: { bem: { element: "horizontal-bar" } },
                  conditionalAttributes: [
                    {
                      condition: "unmeasured",
                      attributes: {
                        class: ["CharcellScrollArea__horizontal-bar--fitting"],
                      },
                    },
                  ],
                  attributes: { "aria-hidden": "true" },
                  children: [
                    {
                      type: "element",
                      tag: "div",
                      extensions: { bem: { element: "step" } },
                    },
                    {
                      type: "element",
                      tag: "div",
                      extensions: { bem: { element: "horizontal-track" } },
                      children: [
                        {
                          type: "element",
                          tag: "div",
                          extensions: { bem: { element: "horizontal-thumb" } },
                        },
                      ],
                    },
                    {
                      type: "element",
                      tag: "div",
                      extensions: { bem: { element: "step" } },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
