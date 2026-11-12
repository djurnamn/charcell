import { withGenerated } from "./generate";
import type { ComponentScenarios, Content } from "./types";

// Lists nested in each other's items, an item moving between any of them:
// drag a grip into another list (an empty one too), or pick an item up and
// choose a grip in another list. A list inside the moving item is out of
// reach. The lists keep their own copies, so the scenario needs no state.
// Gangs hold a list, empty or not, and riders none.
const rider = (name: string) => ({ name });
const gangs = [
  {
    name: "polecats",
    children: [rider("ben"), rider("darrel"), rider("father torque")],
  },
  { name: "vultures", children: [rider("suzi"), rider("maureen")] },
  { name: "cavefish", children: [] },
];

// SortableGroup is a hand-written driver with no template; its props are the
// React driver's (SortableGroupProps), and the one that shows is `snap`.
const driver = {
  props: {
    snap: { type: "'character' | 'row' | 'none'", default: "character" },
  },
};

// One part draws a list and, in each gang's row, calls itself for the
// gang's own: a gang keeps its children in view however deep it moves.
const gangList: Content = {
  part: "GangList",
  parameters: ["id", "items"],
  props: { id: "gangs", items: gangs },
  children: {
    component: "SortableList",
    props: { id: { scope: "id" }, items: { scope: "items" } },
    slots: {
      children: {
        scope: ["item"],
        children: {
          tag: "div",
          children: [
            { tag: "span", children: "{item.name}" },
            {
              when: "item.children",
              children: {
                tag: "div",
                props: { style: "padding-inline-start: 2ch" },
                children: {
                  call: "GangList",
                  props: {
                    id: { scope: "item.name" },
                    items: { scope: "item.children" },
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
};

export default {
  children: gangList,
  scenarios: withGenerated(driver, ["snap"], {
    scenarios: [
      {
        id: "snap-character",
        label: "snap: character",
        description:
          "the default: lists nested in each other's items, an item moving between them by its grip, a cell at a time.",
        default: true,
      },
    ],
  }),
} satisfies ComponentScenarios;
