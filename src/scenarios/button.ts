import button from "../components/button";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

// The label prop carries the text; the default slot stays empty.
const props = { label: "kick" };

export default {
  props,
  children: [],
  // Generated scenarios only for what shows: type changes nothing on screen.
  scenarios: withGenerated(button, ["variant", "nonInteractive", "border"], {
    props: { ...props, border: "single" },
    scenarios: [
      {
        id: "variant-boxed",
        label: "variant: boxed",
        description: "the default look: the label in a ring, three rows tall.",
        default: true,
      },
      {
        id: "disabled",
        label: "disabled",
        description:
          "out of reach for now: mid strokes and text, and no press or focus.",
        props: { disabled: true },
      },
    ],
  }),
} satisfies ComponentScenarios;
