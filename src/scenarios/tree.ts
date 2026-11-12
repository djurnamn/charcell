import tree from "../components/tree";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

// A nested tree: groups contain their children (depth is structural), opening
// is the group row's aria-expanded, connectors draw themselves from nesting.
const item = (label: string, current = false) => ({
  component: "TreeItem",
  props: current ? { label, current } : { label },
});

export default {
  children: {
    component: "TreeGroup",
    props: { label: "highway 9", root: true },
    children: [
      item("kickstand", true),
      item("melonweed"),
      item("mink ranch"),
      {
        component: "TreeGroup",
        props: { label: "the gorge", defaultOpen: false },
        children: [
          item("tourist stop"),
          item("ricky's ramp"),
          item("ex-bridge"),
        ],
      },
      item("smash-a-torium"),
      item("corley motors"),
    ],
  },
  columns: 20,
  scenarios: withGenerated(
    tree,
    ["spacious", "disclosure", "disclosurePosition"],
    {
      scenarios: [
        {
          id: "default",
          label: "default",
          description:
            "the default look: a row each, the branches drawn from how the rows nest.",
          default: true,
        },
      ],
    },
  ),
} satisfies ComponentScenarios;
