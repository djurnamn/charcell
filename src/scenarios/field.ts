import type { ComponentScenarios } from "./types";

// A bare control, labeled by id: the field hands it the id, its description
// and whether it is invalid.
export default {
  props: {
    label: "name",
    htmlFor: "name",
    description: "read out by the announcer",
  },
  slots: {
    children: {
      scope: ["control"],
      children: {
        component: "TextInput",
        spread: "control",
        props: { placeholder: "doreen schmorley" },
      },
    },
  },
  scenarios: [
    {
      id: "description",
      label: "description",
      description:
        "a label over its control, with a line of description under it.",
      default: true,
    },
    {
      id: "error",
      label: "errorMessage",
      description:
        "the error message in place of the description, read with the control.",
      props: { errorMessage: "give us your name" },
    },
  ],
} satisfies ComponentScenarios;
