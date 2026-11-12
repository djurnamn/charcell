import scrollArea from "../components/scroll-area";
import { withGenerated } from "./generate";
import type { ComponentScenarios, Content } from "./types";

// Everyone on highway 9, longer than the area that shows it.
const cast = [
  "ben throttle",
  "maureen corley",
  "malcolm corley",
  "adrian ripburger",
  "bolus",
  "nestor",
  "suzi",
  "father torque",
  "darrel",
  "emmet",
  "todd newlan",
  "miranda wood",
  "quohog",
  "horace",
  "mavis",
  "the chief",
  "officer floyd",
  "ricky myran",
  "uncle pete",
  "little todd",
  "doreen schmorley",
  "the unknown avenger",
  "the boom-boom brothers",
  "professor schmetterling",
  "a cavefish",
  "a vulture",
  "a rottwheeler",
  "the derby announcer",
  "the news anchor",
  "mrs. corley",
  "the factory guard",
];
const roster = (count: number): Content =>
  Array.from({ length: count }, (_, index) => ({
    tag: "div",
    props: { style: "white-space: pre" },
    children: `${String(index + 1).padStart(2, "0")} ${cast[index % cast.length]}`,
  }));

// The engine places the thumb from the scroll; the check reads the visual
// with the thumb given: a cell, one down the three cells between the step
// buttons.
const fixed = (
  look: Record<string, string>,
  children: Content,
  thumbs = "--charcell-scroll-area--thumb-start: 1; --charcell-scroll-area--thumb-length: 1",
): Content => ({
  component: "ScrollAreaVisual",
  props: {
    ...look,
    label: "everyone on highway 9",
    style: `width: 24ch; height: calc(var(--charcell-row) * 5); ${thumbs}`,
  },
  children,
});

export default {
  // `fill` takes the height of the area's container, which the page sets.
  props: { label: "everyone on highway 9", fill: true, overscroll: "none" },
  children: roster(40),
  columns: 30,
  rows: 8,
  scenarios: withGenerated(
    scrollArea,
    ["scrolling", "scrollbar", "orientation"],
    {
      scenarios: [
        {
          id: "default",
          label: "stepped, a scrollbar in cells",
          description:
            "the roster a whole row at a time, its scrollbar a faint line with a thumb of whole cells.",
          default: true,
        },
      ],
    },
  ).map((scenario) => ({
    ...scenario,
    check:
      scenario.props?.scrollbar === "native"
        ? // The browser's own scrollbar is no cell's: the check reads content
          // that fits, where it draws none.
          fixed({ scrollbar: "native" }, roster(3))
        : scenario.props?.scrollbar === "hidden"
          ? fixed({ scrollbar: "hidden" }, roster(12))
          : scenario.props?.orientation
            ? // A line that runs past its clip rasterizes a little apart at
              // 2x in Chromium, so the check reads lines that fit; the bars
              // are drawn from the thumbs given all the same.
              fixed(
                { orientation: String(scenario.props.orientation) },
                roster(12),
              )
            : fixed({}, roster(12)),
  })),
} satisfies ComponentScenarios;
