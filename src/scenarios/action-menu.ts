import actionMenu from "../components/action-menu";
import { withGenerated } from "./generate";
import { attachedMarks, windowBorder } from "./window-border";
import type { ComponentScenarios, Content } from "./types";

const items = [
  { value: "aim", label: "aim" },
  { value: "fire", label: "fire" },
  { value: "break", separator: true },
  { value: "raise", label: "raise", disabled: true },
  { value: "lower", label: "lower" },
];
// The menu is what the scenarios show: it opens as each loads.
const props = { items, defaultOpen: true };

// The menu open, its first item highlighted: the engaged trigger and the
// list its machine places below, attached, as their parts draw them. The
// list floats, so its border shows only open. Attached, the list is a cell
// wider than the trigger's ten (Zag's `--reference-width`), so the
// trigger's end corner runs on through the row they share (`┴`).
const open = (
  border: Record<string, string>,
  spacious = false,
  beside = false,
): Content => {
  const marks = beside
    ? { trigger: {}, window: {} }
    : attachedMarks(border, 10);
  return {
    tag: "div",
    props: {
      style: beside
        ? "display: flex; align-items: start"
        : "display: grid; justify-items: start",
    },
    children: [
      {
        component: "Button",
        props: {
          label: "turret",
          "aria-expanded": "true",
          ...marks.trigger,
        },
      },
      {
        component: "ActionMenuList",
        props: {
          ...border,
          ...marks.window,
          ...(spacious ? { spacious: true } : {}),
        },
        children: items.map((item, index) =>
          item.separator
            ? {
                component: "Separator",
                props: { inset: true, decorative: true },
              }
            : {
                tag: "div",
                props: {
                  class: [
                    "CharcellActionMenuList__item",
                    ...(index === 0
                      ? ["CharcellActionMenuList__item--highlighted"]
                      : []),
                    ...(item.disabled
                      ? ["CharcellActionMenuList__item--disabled"]
                      : []),
                  ].join(" "),
                },
                children: item.label!,
              },
        ),
      },
    ],
  };
};

export default {
  props,
  slots: {
    trigger: {
      scope: ["triggerProps"],
      children: {
        component: "Button",
        spread: "triggerProps",
        props: { label: "turret" },
      },
    },
  },
  // Generated scenarios only for what shows: the behavior flags change nothing on screen.
  scenarios: withGenerated(actionMenu, ["spacious", "border"], {
    props,
    scenarios: [
      {
        id: "raised",
        label: "raised",
        description:
          "the menu open under its button, raised by its double right and bottom sides.",
        default: true,
      },
      {
        id: "placement-right-start",
        label: "placement: right-start",
        description:
          "beside its button instead of under it, standing apart from it.",
        props: { placement: "right-start" },
      },
    ],
  }).map((scenario) => ({
    ...scenario,
    check: open(
      windowBorder(scenario.props),
      scenario.props?.spacious === true,
      scenario.id === "placement-right-start",
    ),
  })),
} satisfies ComponentScenarios;
