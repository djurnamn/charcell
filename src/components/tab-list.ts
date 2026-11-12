import { defineTemplate } from "@js-template-engine/types";
import { borderClasses, borderProp } from "../template-helpers/border";
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import { stylePreamble } from "../template-helpers/style-preamble";
import { perDirection } from "../template-helpers/direction";
import { displayed } from "../template-helpers/hidden";

/**
 * `TabList` - the row of tabs over a Tabs panel. A passthrough root (the
 * compound spreads Zag's `getListProps()`); the compound renders each tab as a
 * button carrying this block's element classes, then the `__rest` of the row.
 *
 * `boxed` (the default) is the folder: three rows - the tabs' top stroke,
 * their labels, and the base stroke the panel hangs from. Each tab draws its
 * own ring down to the base, neighbors sharing their dividing stroke (each
 * overlaps the one before by a column), and each draws its stretch of the
 * base - except the selected tab, which leaves it out and so opens into its
 * panel (┘ └). `__rest` runs the base on to the panel's far side (┐). The
 * selected tab is shown by the open edge, not by inversion; hover washes a
 * tab's interior cells, focus puts the pointer `❯` before its label,
 * disabled rests at `mid`.
 *
 * `dense` is two rows: the tabs, then a `faint` rule. There the selected tab
 * is the inversion and hover-while-selected the dimmed inversion.
 */
export default defineTemplate({
  type: "component",
  name: "TabList",
  description:
    "the row of tabs over a tab's panel. boxed, they are folder tabs.",
  style: stylePreamble,
  props: {
    /** `boxed` draws folder tabs over the panel; `dense` is the tabs over a `faint` rule. */
    variant: { type: "'boxed' | 'dense'", default: "boxed" },
    /** The panel's border, which its right side follows: a double side's
     *  outer line sits a stroke gap further out, and the base runs on to meet
     *  it (╖). */
    border: borderProp,
    /** The panel's right side, over `border`. */
    borderEnd: borderProp,
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellTabList" } },
      conditionalAttributes: [
        ...borderClasses("CharcellTabList", {}, ["end"], false),
        {
          condition: "variant === 'dense'",
          attributes: { class: ["CharcellTabList--dense"] },
        },
      ],
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          position: "relative",
          ...displayed("flex"),
          alignItems: "flex-start",
          overflow: "hidden",
          "&__tab": {
            "@include native-control": true,
            "@include focusable": true,
            flex: "none",
            whiteSpace: "nowrap",
            cursor: "pointer",
          },
          "&__tab:focus-visible::after": { "@include focus-cue": true },
          "&__tab:disabled": { "@include disabled": true },
          ...oneOf(["--dense"], {
            // The folder.
            none: {
              height: "calc(var(--charcell-row) * 3)",
              "&__tab": {
                "@include paint($background: false)": true,
                position: "relative",
                isolation: "isolate",
                height: "calc(var(--charcell-row) * 2)",
                marginInlineStart: "var(--charcell-tab-list--overlap, 0px)",
                padding: "var(--charcell-row) 2ch 0",
              },
              // The focus pointer, in the padding cell inside the ring on the
              // label's row.
              "&__tab::after": {
                "@include pointer(1ch, var(--charcell-row))": true,
              },
              // Each tab overlaps the one before by a column: their dividing
              // stroke is one.
              "&__tab + &__tab": {
                "--charcell-tab-list--overlap": "-1ch",
              },
              "&__tab::before": {
                "@include ring($bottom: calc(-1 * var(--charcell-row)))": true,
              },
              "&__rest": {
                position: "relative",
                flex: "1",
                alignSelf: "stretch",
                minWidth: "1ch",
              },
              "&__rest::before": {
                content: '""',
                position: "absolute",
                // On the tabs' base stroke, from the last tab's side to the
                // panel's (┴ to ┐).
                top: "calc(var(--charcell-row) * 2 + var(--charcell-stroke-y))",
                borderTop: "1px solid var(--charcell-mid)",
                pointerEvents: "none",
              },
            },
            "--dense": {
              gap: "1ch",
              height: "calc(var(--charcell-row) * 2)",
              "&::after": {
                content: '""',
                position: "absolute",
                left: "0",
                right: "0",
                top: "calc(var(--charcell-row) + var(--charcell-stroke-y))",
                borderTop: "1px solid var(--charcell-faint)",
                pointerEvents: "none",
              },
              "&__tab": {
                "@include paint": true,
                position: "relative",
                height: "var(--charcell-row)",
                padding: "0 1ch",
              },
              // The focus pointer, in the padding cell.
              "&__tab::after": { "@include pointer": true },
            },
          }),
          // Each tab overlaps the one before on its start side, which is the
          // right one on a right-to-left page; the base runs from the last
          // tab's side to the panel's, on the stroke's pixel of each cell.
          ...perDirection((direction) => ({
            "&:where(:not(.CharcellTabList--dense)) > &__tab + &__tab": {
              [`--charcell-ring--${direction === "rtl" ? "right" : "left"}-none`]:
                "1",
            },
            "&:where(:not(.CharcellTabList--dense)) > &__rest::before":
              direction === "rtl"
                ? {
                    right: "calc(-1 * var(--charcell-stroke-x) - 1px)",
                    left: "calc(var(--charcell-stroke-x) - var(--charcell-tab-list--reach, 0px))",
                  }
                : {
                    left: "calc(var(--charcell-stroke-x) - 1ch)",
                    right:
                      "calc(1ch - var(--charcell-stroke-x) - 1px - var(--charcell-tab-list--reach, 0px))",
                  },
          })),
          // Beside a double panel side, the base reaches its outer line.
          "&--border-end-double": {
            "--charcell-tab-list--reach": "var(--charcell-stroke-gap)",
          },
          // The selected folder tab leaves its stretch of the base out.
          "&:where(:not(.CharcellTabList--dense)) > &__tab--selected": {
            "--charcell-ring--bottom-none": "1",
          },
          // States assign the slots the resting rules read; hover is guarded
          // against disabled and, dense, against the selected tab.
          "&:where(:not(.CharcellTabList--dense)) > &__tab:where(:not(:disabled)):hover::before":
            {
              "@include wash": true,
            },
          "&--dense > &__tab:where(:not(.CharcellTabList__tab--selected, :disabled)):hover":
            {
              "@include wash": true,
            },
          "&--dense > &__tab--selected:where(:not(:hover))": {
            "@include inverted": true,
          },
          "&--dense > &__tab--selected:hover": {
            "@include inverted(var(--charcell-strong))": true,
          },
        },
      },
      children: [{ type: "slot" }],
    },
  ],
});
