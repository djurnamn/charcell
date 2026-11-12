import { defineTemplate } from "@js-template-engine/types";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";
import { oneOf } from "@scaffold-ui-kit/helpers/template";

// React takes the fill as a style object, Vue and Svelte as a declaration string.
const helpers = {
  react:
    "import { progressFillPropsObject, progressPercent } from 'charcell/scripts/progress';",
  vue: "import { progressFillProps, progressPercent } from 'charcell/scripts/progress';",
  svelte:
    "import { progressFillProps, progressPercent } from 'charcell/scripts/progress';",
};

/**
 * `Progress` - how far along, as a row of cells: a `faint`
 * track the width of its container, filled solid from the start in whole
 * cells (`value` between `min` and `max`, snapped down to the cell, so the
 * fill never ends mid-cell). `label` names the bar and leads the row in the
 * mid gray; `showValue` prints the whole percent after the track. No
 * animation: the fill steps as the value does.
 *
 * The root is the `progressbar`, carrying the value for assistive technology;
 * the drawn label and percent are hidden from it, since the bar already says
 * both. Under forced-colors the track's fill is repainted away and the filled
 * cells take the system's `Highlight`.
 *
 * With no `value` the bar is indeterminate: it carries no `aria-valuenow`, the
 * whole track is painted in the `mid` tone with no fill, and `showValue`
 * prints nothing, since there is no amount to print.
 */
export default defineTemplate({
  type: "component",
  name: "Progress",
  description: "a bar that fills in whole cells.",
  style: stylePreamble,
  extensions: {
    react: { imports: [helpers.react] },
    vue: { imports: [helpers.vue] },
    svelte: { imports: [helpers.svelte] },
  },
  props: {
    /**
     * How far along, between `min` and `max`; the fill snaps down to whole
     * cells. Left out, the bar is indeterminate.
     */
    value: { type: "number" },
    /** The value at an empty track. */
    min: { type: "number", default: 0 },
    /** The value at a full track. */
    max: { type: "number", default: 100 },
    /** Names the bar, and leads the row in the mid gray. */
    label: { type: "string" },
    /** Prints the whole percent after the track. */
    showValue: { type: "boolean" },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellProgress" } },
      conditionalAttributes: [
        {
          condition: "value === undefined",
          attributes: { class: ["CharcellProgress--indeterminate"] },
        },
      ],
      attributes: {
        role: "progressbar",
        "aria-valuemin": { $expression: "min" },
        "aria-valuemax": { $expression: "max" },
        "aria-valuenow": { $expression: "value" },
        "aria-label": { $expression: "label" },
        style: {
          "@include cell": true,
          "@include paint": true,
          ...displayed("flex"),
          alignItems: "center",
          gap: "1ch",
          "&__label": { flex: "none", color: "var(--charcell-mid)" },
          "&__value": { flex: "none" },
          "&__track": {
            flex: "1",
            height: "var(--charcell-row)",
          },
          // Indeterminate, the whole track in the mid tone; the fill has no
          // ratio to draw and stays empty.
          ...oneOf(["--indeterminate"], {
            none: {
              "&__track": {
                "@include paint($fill: var(--charcell-faint))": true,
              },
            },
            "--indeterminate": {
              "&__track": {
                "@include paint($fill: var(--charcell-mid))": true,
              },
            },
          }),
          "&__track, &__fill": { display: "block" },
          "&__fill": {
            "@include paint": true,
            "@include inverted": true,
            height: "100%",
            width:
              "round(down, calc(var(--charcell-progress--ratio, 0) * 100%), 1ch)",
          },
        },
      },
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
                  extensions: { bem: { element: "label" } },
                  attributes: {
                    "aria-hidden": "true",
                  },
                  children: [{ type: "text", expression: "label" }],
                },
              ],
            },
          ],
        },
        {
          type: "element",
          tag: "span",
          extensions: { bem: { element: "track" } },
          children: [
            {
              type: "element",
              tag: "span",
              attributes: {
                $spread: { $expression: "progressFillProps(value, min, max)" },
              },
              extensions: {
                bem: { element: "fill" },
                react: {
                  attributes: {
                    $spread: {
                      $expression: "progressFillPropsObject(value, min, max)",
                    },
                  },
                },
              },
            },
          ],
        },
        {
          type: "conditional",
          conditions: [
            {
              statement: "if",
              condition: "showValue && value !== undefined",
              children: [
                {
                  type: "element",
                  tag: "span",
                  extensions: { bem: { element: "value" } },
                  attributes: {
                    "aria-hidden": "true",
                  },
                  children: [
                    {
                      type: "text",
                      expression: "progressPercent(value, min, max)",
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
