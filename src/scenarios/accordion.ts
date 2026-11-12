import accordion from "../components/accordion";
import { withGenerated } from "./generate";
import type { ComponentScenarios } from "./types";

const item = (title: string, text: string, defaultOpen = false) => ({
  component: "AccordionItem",
  props: defaultOpen ? { title, defaultOpen } : { title },
  children: text,
});

export default {
  children: [
    item("the bait", "first prize is the corley hardtail.", true),
    item("the collision", "ben rams moe head-on and both cars explode."),
    item("the disguises", "an unknown avenger and a doreen schmorley."),
  ],
  columns: 40,
  scenarios: withGenerated(accordion, ["variant", "spacious", "border"], {
    props: { border: "single" },
    scenarios: [
      {
        id: "variant-boxed",
        label: "variant: boxed",
        description:
          "the default look: the sections in one ring, a line between each.",
        default: true,
      },
    ],
  }),
} satisfies ComponentScenarios;
