import toggle from "../components/toggle";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

const props = { label: "autopilot", defaultPressed: true };

export default {
  props,
  children: [],
  // Generated scenarios only for what shows: pressed would be controlled with
  // nothing to change it.
  scenarios: withGenerated(toggle, ["variant", "defaultPressed", "disabled"], {
    props,
    scenarios: [
      {
        id: "defaultPressed-true",
        label: "defaultPressed: true",
        description: "pressed to start with, so it shows inverted.",
        default: true,
      },
    ],
  }),
} satisfies ComponentScenarios;
