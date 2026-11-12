import splitGrid from "../components/split-grid";
import { withGenerated } from "./generate";
import type { ComponentScenarios, Content } from "./types";

// Highway 9 after the ambush, laid out as a grid: the gangs and the riders,
// those still free over those in jail.
const columns = [{ id: "gangs" }, { id: "riders" }];
const rows = [{ id: "free" }, { id: "jailed" }];

// A pane's names, a row each, where the grid gives this column and row.
const names = (column: string, row: string, lines: string[]): Content => ({
  when: "column",
  is: column,
  children: {
    when: "row",
    is: row,
    children: {
      tag: "div",
      props: { style: "padding: 0 1ch;" },
      children: lines.map((name) => ({ tag: "div", children: name })),
    },
  },
});

const pane = (text: string): Content => ({
  tag: "div",
  props: { style: "padding: 0 1ch;" },
  children: text,
});

// The machines size the tracks in percentages and land them on whole cells
// once mounted; the check reads the parts at whole sizes instead: 9 and 10
// columns, 2 and 2 rows.
const fixed = (
  look: Record<string, string | boolean> = {},
  rowSlots?: Record<string, Content>,
): Content => ({
  component: "SplitGridVisual",
  props: {
    ...look,
    style:
      "width: 20ch; height: calc(var(--charcell-row) * 5); --charcell-split-grid--columns: 9ch 1ch 10ch; --charcell-split-grid--rows: calc(var(--charcell-row) * 2) var(--charcell-row) calc(var(--charcell-row) * 2)",
  },
  children: [
    ...[
      ["gangs", 1, 1],
      ["riders", 3, 1],
      ["jailed", 1, 3],
      ["darrel", 3, 3],
    ].map(([text, column, row]): Content => ({
      component: "SplitGridCell",
      props: { style: `grid-column: ${column}; grid-row: ${row}` },
      children: pane(String(text)),
    })),
    {
      component: "SplitGridHandle",
      props: {
        axis: "column",
        crosses: ["free", "jailed"],
        label: "resize columns",
        style: "grid-column: 2; grid-row: 1 / -1",
      },
    },
    {
      component: "SplitGridHandle",
      props: {
        axis: "row",
        crosses: ["gangs", "riders"],
        label: "resize rows",
        // One grip, where the driver places it: the middle (cells 9 and 10)
        // covers the crossing at 9, so it takes 10 and 11.
        style:
          "grid-row: 2; grid-column: 1 / -1; --charcell-split-grid--grip-at: calc(10 * 1ch)",
      },
    },
    ...(rowSlots
      ? [
          {
            component: "SplitGridHandleRow",
            props: { style: "grid-row: 2; grid-column: 1 / -1" },
            slots: rowSlots,
          },
        ]
      : []),
  ],
});

export default {
  rows: 10,
  props: {
    columns,
    rows,
    defaultColumnSize: [40, 60],
    defaultRowSize: [50, 50],
  },
  slots: {
    children: {
      scope: ["column", "row"],
      children: [
        names("gangs", "free", ["vultures", "cavefish", "rottwheelers"]),
        names("riders", "free", ["ben", "maureen", "suzi"]),
        names("gangs", "jailed", ["polecats"]),
        names("riders", "jailed", ["darrel"]),
      ],
    },
  },
  scenarios: [
    ...withGenerated(splitGrid, ["rule", "rowGrips"], {
      props: { columns, rows },
      scenarios: [
        {
          id: "default",
          label: "two by two",
          description:
            "two columns over two rows, each handle running the grid's whole length with a grip in each pane.",
          default: true,
        },
      ],
    }).map((scenario) => ({
      ...scenario,
      check: fixed({
        ...(scenario.props?.rule === true ? { rule: true } : {}),
        ...(scenario.props?.rowGrips === "one" ? { rowGrips: "one" } : {}),
      }),
      // A ruled row's handle with one grip and content at its start and end
      // (`rowHandleStart`, `rowHandleEnd`), read from the parts.
      ...(scenario.props?.rowGrips === "one"
        ? {
            states: {
              "handle-row": fixed(
                { rule: true, rowGrips: "one" },
                { start: "jailed", end: "+" },
              ),
            },
          }
        : {}),
    })),
    // A ruled grid in a frame, its lines meeting the ring: `┬ ┴ ├ ┤`.
    {
      id: "rule-join-frame",
      checkOnly: true,
      label: "rule, joined in a frame",
      description:
        "a ruled grid in a frame, its handles meeting the frame's sides as ┬, ┴, ├ and ┤.",
      props: { rule: true, join: "both" },
      check: {
        component: "Frame",
        props: { flush: true, style: "width: 22ch" },
        children: fixed({ rule: true, join: "both" }),
      },
    },
  ],
} satisfies ComponentScenarios;
