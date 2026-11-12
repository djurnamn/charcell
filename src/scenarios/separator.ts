import separator from "../components/separator";
import { withGenerated } from "./generate";
import type { ComponentScenarios, Content } from "./types";

// A line between two notes in a frame, its ends joining the ring.
const inFrame = (props: Record<string, string>): Content => ({
  component: "Frame",
  props,
  children: [
    "bye, moe.",
    { component: "Separator", props: { join: "both" } },
    "send me a postcard from the ambush!",
  ],
});

export default {
  columns: 20,
  scenarios: withGenerated(
    separator,
    ["orientation", "decorative", "border", "inset"],
    {
      scenarios: [
        {
          id: "border-single",
          label: "border: single",
          description: "the default look: one faint line across a row.",
          default: true,
        },
        {
          id: "join-frame",
          checkOnly: true,
          label: "join: both, in a frame",
          description:
            "a line laid in a frame, its ends meeting the frame's sides as ├ and ┤.",
          props: { join: "both" },
          check: inFrame({}),
        },
        {
          id: "join-frame-double",
          checkOnly: true,
          label: "join: both, in a double frame",
          description:
            "the same in a frame with double sides, meeting their inner lines as ╟ and ╢.",
          props: { join: "both" },
          check: inFrame({ borderX: "double" }),
        },
        {
          id: "join-rule",
          checkOnly: true,
          label: "join: start, beside a rule",
          description: "a line meeting a line beside it as ├.",
          props: { join: "start" },
          check: {
            tag: "div",
            props: { style: "display: flex" },
            children: [
              { component: "Separator", props: { orientation: "vertical" } },
              {
                tag: "div",
                props: {
                  style: "display: flex; flex-direction: column; flex: 1",
                },
                children: [
                  "polecats",
                  { component: "Separator", props: { join: "start" } },
                  "vultures",
                ],
              },
            ],
          },
        },
      ],
    },
  ).map((scenario) =>
    // A vertical separator stretches across a flex row, and alone has no length.
    scenario.id === "orientation-vertical"
      ? {
          ...scenario,
          rows: 5,
          check: {
            tag: "div",
            props: { style: "display: flex; gap: 1ch" },
            children: [
              "ben ",
              { component: "Separator", props: { orientation: "vertical" } },
              " maureen",
            ],
          },
        }
      : scenario,
  ),
} satisfies ComponentScenarios;
