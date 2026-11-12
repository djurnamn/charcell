import sortableList from "../components/sortable-list";
import { withGenerated } from "./generate";
import type { ComponentScenarios, Content } from "./types";

const items = [
  "fix the fuel leak",
  "knife up quohog's table",
  "sell mink meat to the schools",
  "dodge the cavefish",
];

// The looks a drag passes through, drawn by the list's parts: an item picked
// up, an empty list offering its place button, or its drop hint while an
// item is dragged, and a list a drag from another list is over, marked where
// the item lands.
const picked: Content = {
  component: "SortableListVisual",
  children: items.map((item, index) => ({
    component: "SortableRow",
    props: index === 0 ? { engaged: true } : {},
    children: item,
  })),
};
const marked: Content = {
  component: "SortableListVisual",
  children: [
    ...items
      .slice(0, 2)
      .map((item) => ({ component: "SortableRow", children: item })),
    {
      component: "SortablePlace",
      props: { hint: true, target: true, label: "drop here" },
    },
    ...items
      .slice(2)
      .map((item) => ({ component: "SortableRow", children: item })),
  ],
};
const empty = (place: Content): Content => ({
  component: "SortableListVisual",
  props: { empty: true },
  children: place,
});

export default {
  props: { items },
  slots: {
    children: {
      scope: ["item"],
      children: { tag: "span", children: "{item}" },
    },
  },
  scenarios: withGenerated(sortableList, ["snap", "spacious"], {
    scenarios: [
      {
        id: "snap-character",
        label: "snap: character",
        description:
          "the default: each item moved by its grip, with the mouse or the arrow keys, the dragged row stepping a cell at a time.",
        default: true,
      },
      {
        id: "spacious",
        label: "spacious",
        description:
          "two rows an item, the grip both rows tall: grips far enough apart to meet the 24px target size.",
        props: { spacious: true },
      },
    ],
  }).map((scenario) =>
    scenario.default
      ? {
          ...scenario,
          states: {
            picked,
            place: empty({
              component: "SortablePlace",
              props: { label: "place here" },
            }),
            "place-hover": empty({
              component: "SortablePlace",
              props: { label: "place here", class: "force-hover" },
            }),
            "drop-hint": empty({
              component: "SortablePlace",
              props: { hint: true, label: "drop here" },
            }),
            "drop-marker": marked,
          },
        }
      : scenario,
  ),
} satisfies ComponentScenarios;
