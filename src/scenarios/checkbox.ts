import checkbox from "../components/checkbox";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

const props = { label: "ride with the polecats", defaultChecked: true };

export default {
  props,
  children: [],
  // Generated scenarios only for what shows: checked would be controlled with
  // nothing to change it.
  scenarios: withGenerated(
    checkbox,
    ["defaultChecked", "indeterminate", "disabled"],
    {
      props,
      scenarios: [
        {
          id: "defaultChecked-true",
          label: "defaultChecked: true",
          description: "checked to start with, so the box shows [×].",
          default: true,
        },
      ],
    },
  ).map((scenario) =>
    // Indeterminate is a property with no attribute: the markup cannot carry it.
    scenario.id === "indeterminate"
      ? { ...scenario, forced: { ".CharcellCheckbox__input": "indeterminate" } }
      : scenario,
  ),
} satisfies ComponentScenarios;
