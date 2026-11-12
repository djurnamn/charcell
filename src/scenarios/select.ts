import select from "../components/select";
import { withGenerated } from "./generate";
import type { ComponentScenarios, Content } from "./types";

// A select over its `items`, showing a placeholder until one is picked;
// clicking the trigger opens charcell's own listbox. Bare, like TextInput: a
// Field names it.
const items = [
  { value: "polecats", label: "polecats" },
  { value: "vultures", label: "vultures" },
  { value: "cavefish", label: "cavefish" },
  { value: "rottwheelers", label: "rottwheelers" },
];
const props = {
  items,
  placeholder: "ride with",
  triggerProps: { "aria-label": "gang" },
};

// Open, with polecats picked and rottwheelers under the pointer: the trigger and the
// listbox its machine places flush below (or above), as their parts draw them.
// A dense listbox stands apart from its trigger; a boxed one shares its ring,
// that row's corners tees.
// Fitting its value, the trigger is as wide as polecats, and the listbox, as
// wide as rottwheelers, runs on past its corner (`--charcell-select--wider`,
// which the driver sets on both).
const wider = "--charcell-select--wider: 1";
const open = (
  variant: "boxed" | "dense",
  border: Record<string, string> = {},
  above = false,
  fitValue = false,
  spacious = false,
): Content => {
  const trigger: Content = {
    component: "SelectTrigger",
    props: {
      variant,
      open: true,
      ...(above ? { above: true } : {}),
      ...(fitValue ? { style: wider } : {}),
      ...border,
    },
    children: [
      {
        tag: "span",
        props: { class: "CharcellSelectTrigger__values" },
        children: [
          {
            tag: "span",
            props: { class: "CharcellSelectTrigger__value" },
            children: "polecats",
          },
          ...(fitValue ? [] : items).map((item) => ({
            tag: "span",
            props: {
              class: "CharcellSelectTrigger__sizer",
              "aria-hidden": "true",
            },
            children: item.label,
          })),
        ],
      },
      {
        tag: "span",
        props: {
          class: "CharcellSelectTrigger__caret",
          "aria-hidden": "true",
        },
        children: "▾",
      },
    ],
  };
  const listbox: Content = {
    component: "SelectListbox",
    props: {
      ...(variant === "boxed" ? { attached: true } : {}),
      ...(above ? { above: true } : {}),
      ...(fitValue
        ? { style: `${wider}; --charcell-select--trigger-width: 14ch` }
        : {}),
      ...(spacious ? { spacious: true } : {}),
      ...border,
    },
    children: items.map((item) => ({
      tag: "div",
      props: {
        class: [
          "CharcellSelectListbox__item",
          ...(item.value === "polecats"
            ? ["CharcellSelectListbox__item--selected"]
            : []),
          ...(item.value === "rottwheelers"
            ? ["CharcellSelectListbox__item--highlighted"]
            : []),
        ].join(" "),
      },
      children: item.label,
    })),
  };
  return {
    tag: "div",
    // Fitting its value, the listbox keeps its own width.
    props: {
      style: `display: inline-grid${fitValue ? "; justify-items: start" : ""}`,
    },
    children: above ? [listbox, trigger] : [trigger, listbox],
  };
};

export default {
  props,
  scenarios: withGenerated(
    select,
    ["disabled", "spacious", "variant", "fit", "border"],
    {
      props: { ...props, border: "single" },
      scenarios: [
        {
          id: "variant-boxed",
          label: "variant: boxed",
          description:
            "the default look: the trigger in a ring, as wide as its longest choice.",
          default: true,
        },
        {
          id: "spacious",
          label: "spacious",
          description: "each choice two rows tall, a target a pointer can hit.",
          props: { spacious: true },
        },
      ],
    },
  ).map((scenario) =>
    scenario.id === "variant-boxed"
      ? {
          ...scenario,
          states: {
            open: open("boxed"),
            "open-above": open("boxed", {}, true),
          },
        }
      : scenario.id === "fit-value"
        ? {
            ...scenario,
            states: {
              open: open("boxed", {}, false, true),
              "open-above": open("boxed", {}, true, true),
            },
          }
        : scenario.id === "spacious"
          ? {
              ...scenario,
              states: { open: open("boxed", {}, false, false, true) },
            }
          : scenario.id === "variant-dense"
            ? { ...scenario, states: { open: open("dense") } }
            : scenario.id.startsWith("border-")
              ? {
                  ...scenario,
                  states: {
                    open: open("boxed", {
                      border: String(scenario.props?.border),
                    }),
                    "open-above": open(
                      "boxed",
                      { border: String(scenario.props?.border) },
                      true,
                    ),
                  },
                }
              : scenario,
  ),
} satisfies ComponentScenarios;
