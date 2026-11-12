import textarea from "../components/textarea";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

const props = {
  placeholder: "warning: do not",
  "aria-label": "sign",
};

export default {
  props,
  scenarios: withGenerated(textarea, ["variant", "autosize", "border"], {
    props: { ...props, border: "single" },
    scenarios: [
      {
        id: "variant-boxed",
        label: "variant: boxed",
        description: "the default look: the text in a ring that grows with it.",
        default: true,
      },
      {
        id: "filled",
        label: "filled",
        description: "a value to start with, the box grown to fit it.",
        props: {
          value:
            "warning: do not play in or around dumpster.\ndo not kick dumpster.\ndo not sleep in dumpster.\nusage of this container for disposal of human remains may be a violation of local health ordinances.",
        },
      },
      {
        id: "autosize-false",
        label: "autosize: false",
        description:
          "the box keeps its rows, and a longer sign scrolls inside it.",
        props: {
          autosize: false,
          value:
            "warning: do not play in or around dumpster.\ndo not kick dumpster.\ndo not sleep in dumpster.\nusage of this container for disposal of human remains may be a violation of local health ordinances.",
        },
      },
      {
        id: "disabled",
        label: "disabled",
        description: "read but not typed in: mid strokes and text.",
        props: { value: "do not kick dumpster.", disabled: true },
      },
    ],
  }),
} satisfies ComponentScenarios;
