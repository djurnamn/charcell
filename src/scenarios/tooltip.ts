import tooltip from "../components/tooltip";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

// The hint for a one-character control.
const text = "road combat tips";

// The hint is what the scenarios show: it opens as each loads.
const props = { defaultOpen: true };

export default {
  props,
  slots: {
    trigger: {
      scope: ["triggerProps"],
      children: {
        component: "Button",
        spread: "triggerProps",
        props: { label: "?" },
      },
    },
  },
  children: text,
  // No generated scenarios: the delays, `interactive` and the controlled
  // `open` change nothing on screen. The hint floats, so the check reads the button
  // and the box its machine places below it, as their parts draw them.
  scenarios: withGenerated(tooltip, [], {
    props,
    scenarios: [
      {
        id: "hint",
        label: "hint",
        description:
          "the hint open under its button, in a ring at mid, quieter than a window's.",
        default: true,
      },
      {
        id: "placement-right",
        label: "placement: right",
        description: "beside its button instead of under it.",
        props: { placement: "right" },
      },
    ],
  }).map((scenario) => ({
    ...scenario,
    check: {
      tag: "div",
      props: {
        style:
          scenario.id === "placement-right"
            ? "display: flex; align-items: start"
            : "display: grid; justify-items: start",
      },
      children: [
        { component: "Button", props: { label: "?" } },
        { component: "TooltipVisual", children: text },
      ],
    },
  })),
} satisfies ComponentScenarios;
