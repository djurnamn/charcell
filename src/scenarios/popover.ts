import popover from "../components/popover";
import { withGenerated } from "./generate";
import { attachedMarks, windowBorder } from "./window-border";
import type { ComponentScenarios } from "./types";

// The window is what the scenarios show: it opens as each loads.
const props = { label: "rider details", defaultOpen: true };
const text = "ben, leader of the polecats";

export default {
  props,
  slots: {
    trigger: {
      scope: ["triggerProps"],
      children: {
        component: "Button",
        spread: "triggerProps",
        props: { label: "details" },
      },
    },
  },
  children: text,
  // Generated scenarios only for what shows: the behavior flags change nothing
  // on screen. The panel floats, so its border shows only open: the check
  // reads the engaged trigger and the panel its machine places below it,
  // attached, as their parts draw them: the panel is the wider, so the
  // trigger's end corner runs on through the row they share (`┴`).
  scenarios: withGenerated(popover, ["border"], {
    props,
    scenarios: [
      {
        id: "raised",
        label: "raised",
        description:
          "the panel open under its button, raised by its double right and bottom sides.",
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
  }).map((scenario) => {
    const border = windowBorder(scenario.props);
    const beside = scenario.id === "placement-right-start";
    const marks = beside
      ? { trigger: {}, window: {} }
      : attachedMarks(border, 11);
    return {
      ...scenario,
      check: {
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
              label: "details",
              "aria-expanded": "true",
              ...marks.trigger,
            },
          },
          {
            component: "PopoverPanel",
            props: { ...border, ...marks.window },
            children: text,
          },
        ],
      },
    };
  }),
} satisfies ComponentScenarios;
