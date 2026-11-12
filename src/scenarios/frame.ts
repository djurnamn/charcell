import frame from "../components/frame";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

const props = { title: "quohog" };

export default {
  props,
  children: "the customer with the knife is always right.",
  columns: 40,
  // Generated scenarios only for what shows: as changes the element, not the look.
  scenarios: withGenerated(frame, ["active", "quiet", "flush", "border"], {
    props,
    scenarios: [
      {
        id: "border-single",
        label: "border: single",
        description:
          "the default look: a single line all round, the title on the top line.",
        default: true,
      },
      {
        id: "raised",
        label: "raised",
        description:
          "a double right and bottom side, which raises the frame off the page.",
        props: { borderEnd: "double", borderBottom: "double" },
      },
    ],
  }),
} satisfies ComponentScenarios;
