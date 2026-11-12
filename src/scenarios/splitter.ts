import splitter from "../components/splitter";
import { withGenerated } from "./generate";
import type { ComponentScenarios, Content } from "./types";

const panel = (text: string): Content => ({
  tag: "div",
  props: { style: "padding: 0 1ch;" },
  children: text,
});

// The stops along highway 9 beside what there is at one of them, a row each.
const list = (rows: string[]): Content => ({
  tag: "div",
  props: { style: "padding: 0 1ch;" },
  children: rows.map((row) => ({ tag: "div", children: row })),
});
const stops = list(["kickstand", "melonweed", "the gorge", "corley motors"]);
const places = list([
  "moe's shack",
  "todd's trailer",
  "the junkyard",
  "the gas tower",
]);

// The machine sizes the panels in percentages and lands them on whole columns
// once mounted; the check reads the parts at whole sizes instead.
const fixed = (
  orientation: "horizontal" | "vertical",
  look: Record<string, string | boolean> = {},
): Content =>
  orientation === "horizontal"
    ? {
        component: "SplitterVisual",
        props: {
          ...look,
          style: "width: 20ch; height: calc(var(--charcell-row) * 3)",
        },
        children: [
          {
            component: "SplitterPanel",
            props: { style: "width: 9ch" },
            children: panel("stops"),
          },
          { component: "SplitterHandle", props: { label: "resize panels" } },
          {
            component: "SplitterPanel",
            props: { style: "width: 10ch" },
            children: panel("places"),
          },
        ],
      }
    : {
        component: "SplitterVisual",
        props: {
          ...look,
          orientation: "vertical",
          style: "width: 12ch; height: calc(var(--charcell-row) * 5)",
        },
        children: [
          {
            component: "SplitterPanel",
            props: { style: "height: calc(var(--charcell-row) * 2)" },
            children: panel("stops"),
          },
          { component: "SplitterHandle", props: { label: "resize panels" } },
          {
            component: "SplitterPanel",
            props: { style: "height: calc(var(--charcell-row) * 2)" },
            children: panel("places"),
          },
        ],
      };

// A stacked split's handle as a row: a stop's name at its start and a
// count at its end, the line and the grip between them.
const handleRow: Content = {
  component: "SplitterVisual",
  props: {
    rule: true,
    orientation: "vertical",
    style: "width: 30ch; height: calc(var(--charcell-row) * 5)",
  },
  children: [
    {
      component: "SplitterPanel",
      props: { style: "height: calc(var(--charcell-row) * 2)" },
      children: panel("stops"),
    },
    { component: "SplitterHandle", props: { label: "resize panels" } },
    {
      component: "SplitterHandleRow",
      slots: { start: "melonweed", end: "4 places" },
    },
    {
      component: "SplitterPanel",
      props: { style: "height: calc(var(--charcell-row) * 2)" },
      children: panel("places"),
    },
  ],
};

export default {
  rows: 10,
  props: { defaultSize: [40, 60] },
  slots: { start: stops, end: places },
  scenarios: [
    ...withGenerated(splitter, ["orientation", "snap", "keep", "rule"], {
      scenarios: [
        {
          id: "orientation-horizontal",
          label: "orientation: horizontal",
          description:
            "the default look: two panes side by side, the grip in the handle's middle row.",
          default: true,
        },
        {
          id: "rule-vertical",
          label: "rule, stacked",
          description:
            "stacked panes, the handle drawn as a line with the ⠶⠶ grip in its middle.",
          props: { rule: true, orientation: "vertical" },
        },
        {
          id: "minimumCells",
          label: "minimumCells: [16, 12]",
          description:
            "each pane keeps its least columns: dragging, the arrow keys, home and end all stop with 16 left for the stops and 12 for the places.",
          props: { minimumCells: [16, 12] },
        },
      ],
    }).map((scenario) => ({
      ...scenario,
      check: fixed(
        scenario.props?.orientation === "vertical" ? "vertical" : "horizontal",
        scenario.props?.rule === true ? { rule: true } : {},
      ),
      // The handle's row, with content at its start and end (`handleStart`,
      // `handleEnd`), read from the parts.
      ...(scenario.id === "rule-vertical"
        ? { states: { "handle-row": handleRow } }
        : {}),
    })),
    // The ruled handle joining the frame it sits in: `┬` and `┴` on the ring.
    {
      id: "rule-join-frame",
      checkOnly: true,
      label: "rule, joined in a frame",
      description:
        "a ruled handle in a frame, meeting the frame's top and bottom as ┬ and ┴.",
      props: { rule: true, join: "both" },
      check: {
        component: "Frame",
        props: { flush: true, style: "width: 22ch" },
        children: fixed("horizontal", { rule: true, join: "both" }),
      },
    },
    // A joined line in a panel meeting the ruled handle beside it: `├`, past
    // the panel's own edge.
    {
      id: "rule-join-panel",
      checkOnly: true,
      label: "rule, a line in a panel joining it",
      description:
        "a line in the second pane meeting the ruled handle beside it as ├.",
      props: { rule: true, orientation: "horizontal" },
      check: {
        component: "SplitterVisual",
        props: {
          rule: true,
          style: "width: 20ch; height: calc(var(--charcell-row) * 5)",
        },
        children: [
          {
            component: "SplitterPanel",
            props: { style: "width: 9ch" },
            children: panel("stops"),
          },
          { component: "SplitterHandle", props: { label: "resize panels" } },
          {
            component: "SplitterPanel",
            props: { style: "width: 10ch; flex-direction: column" },
            children: [
              panel("in town"),
              { component: "Separator", props: { join: "start" } },
              panel("nearby"),
            ],
          },
        ],
      },
    },
  ],
} satisfies ComponentScenarios;
