import tabs from "../components/tabs";
import { withGenerated } from "./generate";
import type { ComponentScenarios, Content } from "./types";

// The stops along highway 9, a line about each in its panel. Corville is
// out of reach: the roadblocks turn everyone around.
const props = {
  label: "highway 9",
  items: [
    { value: "kickstand", label: "kickstand" },
    { value: "melonweed", label: "melonweed" },
    { value: "corville", label: "corville", disabled: true },
  ],
};

const stop = (value: string, text: string): Content => ({
  when: "value",
  is: value,
  children: { tag: "p", children: text },
});

export default {
  props,
  slots: {
    panel: {
      scope: ["value"],
      children: [
        stop("kickstand", "a biker bar out on the highway. quohog pours."),
        stop("melonweed", "what is left of the town sinks a foot a year."),
        stop("corville", "home of corley motors and its shareholders."),
      ],
    },
  },
  columns: 40,
  scenarios: withGenerated(tabs, ["variant", "border"], {
    props: { ...props, border: "single" },
    scenarios: [
      {
        id: "variant-boxed",
        label: "variant: boxed",
        description:
          "the default look: folder tabs over a ring, the selected tab open into its panel.",
        default: true,
      },
    ],
  }),
} satisfies ComponentScenarios;
