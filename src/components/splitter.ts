import { defineTemplate } from "@js-template-engine/types";

/**
 * `Splitter` - the **compound**: the pure `SplitterDriver` (behavior) composed
 * with `SplitterVisual` (the flex layout and the handle's column) and its
 * `SplitterPanel` / `SplitterHandle` parts. Two panels: the **`start`** and
 * **`end`** named slots, one keyboard-accessible resize handle between them,
 * named by `translations.handleLabel`. A split with more panels composes the
 * driver, the visual and the parts itself.
 *
 * Sizes are percentages (`defaultSize` uncontrolled / `size` + `onSizeChange`
 * controlled). An uncontrolled split snaps its boundaries to whole character
 * columns, or whole rows stacked, in the driver unless `snap` is `'none'`; a
 * controlled one owns its own snapping. A stacked split needs a height to
 * share, which `fill` takes from its container. `rule` draws the handle as a
 * line, and `join` runs its ends on to meet the lines beyond the split (see
 * `SplitterVisual`). `keep` names a panel that keeps its cells when the split
 * resizes, as a terminal's sidebar keeps its columns, the other panel taking
 * the difference, and `minimumCells` the least cells each panel keeps.
 * Stacked, the **`handleStart`** and **`handleEnd`** slots lay content on the
 * handle's row, at its start and end around the grip
 * (`SplitterHandleRow`): a heading for the pane below, its controls.
 */
export default defineTemplate({
  type: "component",
  name: "Splitter",
  rest: { tag: "div" },
  description:
    "panes with a handle between them, moving a whole column at a time, or a row stacked.",
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { resolveSplitterTranslations, type SplitterTranslations } from 'charcell/scripts/translations';",
        "import { splitterPanels } from 'charcell/scripts/character-snap';",
        "import { SplitterDriver } from './SplitterDriver';",
        "import { SplitterVisual } from './SplitterVisual';",
        "import { SplitterPanel } from './SplitterPanel';",
        "import { SplitterHandle } from './SplitterHandle';",
        "import { SplitterHandleRow } from './SplitterHandleRow';",
      ],
    },
    vue: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { resolveSplitterTranslations, type SplitterTranslations } from 'charcell/scripts/translations';",
        "import { splitterPanels } from 'charcell/scripts/character-snap';",
        "import SplitterDriver from './SplitterDriver.vue';",
        "import SplitterVisual from './SplitterVisual.vue';",
        "import SplitterPanel from './SplitterPanel.vue';",
        "import SplitterHandle from './SplitterHandle.vue';",
        "import SplitterHandleRow from './SplitterHandleRow.vue';",
      ],
    },
    svelte: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { resolveSplitterTranslations, type SplitterTranslations } from 'charcell/scripts/translations';",
        "import { splitterPanels } from 'charcell/scripts/character-snap';",
        "import SplitterDriver from './SplitterDriver.svelte';",
        "import SplitterVisual from './SplitterVisual.svelte';",
        "import SplitterPanel from './SplitterPanel.svelte';",
        "import SplitterHandle from './SplitterHandle.svelte';",
        "import SplitterHandleRow from './SplitterHandleRow.svelte';",
      ],
    },
  },
  props: {
    /** The reading direction its keys and placement follow (`'rtl'` mirrors the arrow keys); the page's, once mounted, when unset. */
    direction: { type: "'ltr' | 'rtl'" },
    /** `horizontal` lays the panels side by side; `vertical` stacks them. */
    orientation: { type: "'horizontal' | 'vertical'", default: "horizontal" },
    /** Initial panel sizes in percent, uncontrolled, e.g. `[40, 60]`. */
    defaultSize: { type: "number[]" },
    /** Controlled panel sizes in percent; pair it with `onSizeChange`. */
    size: { type: "number[]" },
    /** Called with the new sizes, in percent, as a boundary moves. */
    onSizeChange: { type: "(size: number[]) => void" },
    /** What the split says: its handle's accessible name (`handleLabel`). */
    translations: { type: "SplitterTranslations" },
    /** An uncontrolled split snaps its boundaries to whole character columns,
     *  or whole rows stacked; `'none'` opts out. A controlled split is not snapped. */
    snap: { type: "'character' | 'none'", default: "character" },
    /** Takes the container's box: grows in a flex or grid layout, and takes the full height of a block that has one. */
    fill: { type: "boolean" },
    /** The panel that keeps its cells when the split resizes, the other taking
     *  the difference; both keep their proportion by default. */
    keep: { type: "'start' | 'end'" },
    /** The least cells each panel keeps, start then end (columns side by
     *  side, rows stacked), over the split's own least: a drag, an arrow key
     *  or Home and End stop there. */
    minimumCells: { type: "number[]" },
    /** Draws the handle as a line through its cells, the grip in its middle. */
    rule: { type: "boolean" },
    /** Runs a ruled handle's ends on to meet the line beyond: a frame's ring
     *  when the split sits directly in its body, or else the line in the
     *  next cell (`┬ ┴`, `├ ┤`). */
    join: { type: "'start' | 'end' | 'both'" },
  },
  children: [
    {
      type: "element",
      tag: "SplitterDriver",
      slotScope: ["api"],
      attributes: {
        direction: { $expression: "direction" },
        orientation: { $expression: "orientation" },
        defaultSize: { $expression: "defaultSize" },
        size: { $expression: "size" },
        onSizeChange: { $expression: "onSizeChange" },
        snap: { $expression: "snap" },
        panels: {
          $expression: "splitterPanels(keep, minimumCells)",
        },
      },
      children: [
        {
          type: "element",
          tag: "SplitterVisual",
          attributes: {
            $spread: {
              $expression: "mergeRootProps(api.getRootProps(), rest)",
            },
            orientation: { $expression: "orientation" },
            fill: { $expression: "fill" },
            rule: { $expression: "rule" },
            join: { $expression: "join" },
          },
          children: [
            {
              type: "element",
              tag: "SplitterPanel",
              attributes: {
                $spread: { $expression: "api.getPanelProps({ id: 'start' })" },
              },
              children: [
                /** The first panel. */ { type: "slot", name: "start" },
              ],
            },
            {
              type: "element",
              tag: "SplitterHandle",
              attributes: {
                $spread: {
                  $expression: "api.getResizeTriggerProps({ id: 'start:end' })",
                },
                label: {
                  $expression:
                    "resolveSplitterTranslations(translations).handleLabel",
                },
              },
            },
            {
              type: "element",
              tag: "SplitterHandleRow",
              slots: {
                start: [
                  /** Content on a stacked split's handle row, before the grip: a heading for the panel below. */
                  { type: "slot", name: "handleStart" },
                ],
                end: [
                  /** Content on a stacked split's handle row, after the grip: its controls. */
                  { type: "slot", name: "handleEnd" },
                ],
              },
            },
            {
              type: "element",
              tag: "SplitterPanel",
              attributes: {
                $spread: { $expression: "api.getPanelProps({ id: 'end' })" },
              },
              children: [
                /** The second panel. */ { type: "slot", name: "end" },
              ],
            },
          ],
        },
      ],
    },
  ],
});
