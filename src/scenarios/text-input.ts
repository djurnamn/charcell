import textInput from "../components/text-input";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

// A bare input names itself; in a Field the label does.
const props = {
  placeholder: "search highway 9",
  "aria-label": "search highway 9",
};

export default {
  props,
  scenarios: withGenerated(textInput, ["variant", "border"], {
    props: { ...props, border: "single" },
    scenarios: [
      {
        id: "variant-boxed",
        label: "variant: boxed",
        description: "the default look: the text in a ring, three rows tall.",
        default: true,
      },
      {
        id: "filled",
        label: "filled",
        description: "a value to start with, where the placeholder was.",
        props: { value: "doreen schmorley" },
      },
      {
        id: "disabled",
        label: "disabled",
        description: "read but not typed in: mid strokes and text.",
        props: { value: "doreen schmorley", disabled: true },
      },
    ],
  }),
} satisfies ComponentScenarios;
