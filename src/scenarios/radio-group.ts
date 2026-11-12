import radioGroup from "../components/radio-group";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

const props = {
  name: "gang",
  label: "ride with",
  defaultValue: "polecats",
  items: [
    { value: "polecats", label: "polecats" },
    { value: "vultures", label: "vultures" },
    { value: "cavefish", label: "cavefish" },
    { value: "rottwheelers", label: "rottwheelers", disabled: true },
  ],
};

export default {
  props,
  scenarios: withGenerated(radioGroup, ["disabled", "orientation"], {
    props,
    scenarios: [
      {
        id: "orientation-vertical",
        label: "orientation: vertical",
        description: "the default look: the choices one under another.",
        default: true,
      },
    ],
  }),
} satisfies ComponentScenarios;
