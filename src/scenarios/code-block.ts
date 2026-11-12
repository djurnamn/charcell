import type { ComponentScenarios } from "./types";

const code = `; the kickstand lot
object dumpster in room 'behind the kickstand'
verb eyes: say-line ben woken-up-in-worse
verb foot: start-script kick-the-dumpster
verb mouth: say-line ben default-refusal  ; "i'm not putting my lips on that."`;

const junkYard = `; the junk yard
verb take forks: start-script little-todd-gives-chase
verb pull lever: start-script lower-the-saucer
verb push button: start-script magnetize-the-saucer
verb use meat car: walk-actor little-todd to car  ; "here, poochy-pooch, pooch!"`;

const props = { label: "the kickstand lot", code };

// The wrapped script is written, not generated: it is a second script, so
// the page shows both.
export default {
  props,
  columns: 60,
  scenarios: [
    {
      id: "default",
      label: "scrolling across",
      description:
        "the code on its wash, the long line scrolling across a cell at a time.",
      default: true,
    },
    {
      id: "wrap",
      label: "wrap",
      description:
        "the long line folded onto the next row, nothing to scroll across.",
      props: { wrap: true, label: "the junk yard", code: junkYard },
    },
  ],
} satisfies ComponentScenarios;
