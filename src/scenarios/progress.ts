import progress from "../components/progress";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

const props = { value: 42, label: "filling the gas can", showValue: true };

export default {
  props,
  columns: 40,
  scenarios: withGenerated(progress, ["showValue"], {
    props,
    scenarios: [
      {
        id: "value-42",
        label: "value: 42",
        description:
          "partway: the bar filled to the last whole cell, the value beside it.",
        default: true,
      },
      {
        id: "zero",
        label: "value: 0",
        description: "nothing done yet: an empty track.",
        props: { value: 0 },
      },
      {
        id: "full",
        label: "value: 100",
        description: "done: the track filled end to end.",
        props: { value: 100 },
      },
      {
        id: "indeterminate",
        label: "no value",
        description:
          "how far is not known: the whole track in the mid tone, and no percent beside it.",
        props: { value: null },
      },
    ],
  }),
} satisfies ComponentScenarios;
