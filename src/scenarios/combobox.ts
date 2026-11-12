import combobox from "../components/combobox";
import { withGenerated } from "./generate";
import type { ComponentScenarios, Content } from "./types";

// A combobox over its `items`; typing narrows the list to the labels that
// hold what was typed. Bare, like TextInput: a Field names it.
const items = [
  { value: "polecats", label: "polecats" },
  { value: "vultures", label: "vultures" },
  { value: "cavefish", label: "cavefish" },
  { value: "rottwheelers", label: "rottwheelers" },
];
const props = {
  items,
  placeholder: "ride with",
  inputProps: { "aria-label": "gang" },
};

// Open, with "o" typed and rottwheelers under the pointer: the field and the
// narrowed list its machine places flush below (or above), as their parts
// draw them. A dense list stands apart from its field; a boxed one shares
// its ring, that row's corners tees, and runs on past the field's corner
// when it is the wider (`--charcell-select--wider`, the driver's).
const open = (
  variant: "boxed" | "dense",
  typed: string,
  border: Record<string, string> = {},
  above = false,
  spacious = false,
): Content => {
  const matches = items.filter((item) => item.label.includes(typed));
  const wider = "--charcell-select--wider: 1";
  const field: Content = {
    component: "ComboboxField",
    props: {
      variant,
      open: true,
      ...(above ? { above: true } : {}),
      inputProps: { value: typed, readOnly: true, "aria-label": "gang" },
      style: `${wider}; width: 12ch`,
      ...border,
    },
  };
  const list: Content = {
    component: "SelectListbox",
    props: {
      ...(variant === "boxed" ? { attached: true } : {}),
      ...(above ? { above: true } : {}),
      style: `${wider}; --charcell-select--trigger-width: 12ch`,
      ...(spacious ? { spacious: true } : {}),
      ...border,
    },
    children: matches.length
      ? matches.map((item) => ({
          tag: "div",
          props: {
            class: [
              "CharcellSelectListbox__item",
              ...(item.value === "rottwheelers"
                ? ["CharcellSelectListbox__item--highlighted"]
                : []),
            ].join(" "),
          },
          children: item.label,
        }))
      : [
          {
            tag: "div",
            props: {
              class:
                "CharcellSelectListbox__item CharcellSelectListbox__item--disabled",
            },
            children: "no matches",
          },
        ],
  };
  return {
    tag: "div",
    props: { style: "display: inline-grid; justify-items: start" },
    children: above ? [list, field] : [field, list],
  };
};

export default {
  props,
  scenarios: withGenerated(
    combobox,
    ["disabled", "spacious", "variant", "border"],
    {
      props: { ...props, border: "single" },
      scenarios: [
        {
          id: "variant-boxed",
          label: "variant: boxed",
          description:
            "the default look: a field in a ring, its list narrowing as the reader types.",
          default: true,
        },
      ],
    },
  ).map((scenario) =>
    scenario.id === "variant-boxed"
      ? {
          ...scenario,
          states: {
            open: open("boxed", "o"),
            "open-above": open("boxed", "o", {}, true),
            "open-empty": open("boxed", "xyz"),
          },
        }
      : scenario.id === "spacious"
        ? {
            ...scenario,
            states: { open: open("boxed", "o", {}, false, true) },
          }
        : scenario.id === "variant-dense"
          ? { ...scenario, states: { open: open("dense", "o") } }
          : scenario.id.startsWith("border-")
            ? {
                ...scenario,
                states: {
                  open: open("boxed", "o", {
                    border: String(scenario.props?.border),
                  }),
                },
              }
            : scenario,
  ),
} satisfies ComponentScenarios;
