import table from "../components/table";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

const props = {
  columns: [
    { key: "rider", label: "rider" },
    { key: "weapon", label: "weapon" },
    { key: "hits", label: "hits", align: "end" },
  ],
  rows: [
    { rider: "a vulture", weapon: "chain", hits: "4" },
    { rider: "a vulture", weapon: "chainsaw", hits: "1" },
    { rider: "a rottwheeler", weapon: "mace", hits: "4" },
  ],
};

export default {
  props,
  scenarios: withGenerated(
    table,
    ["hideHeader", "variant", "separators", "border"],
    {
      props: { ...props, border: "single" },
      scenarios: [
        {
          id: "variant-boxed",
          label: "variant: boxed",
          description:
            "the default look: a ring round the table, lines between the rows and the columns.",
          default: true,
        },
        {
          id: "caption",
          label: "caption",
          description:
            "nothing to see: the caption names the table and its scroll area for a screen reader.",
          props: { caption: "bikers on the old mine road" },
        },
      ],
    },
  ),
} satisfies ComponentScenarios;
