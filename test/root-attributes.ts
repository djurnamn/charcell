// What the root-attributes tests share, on every target: where
// each component's root is, what shows it, and the components with none.
import { expect } from "vitest";
import type { ComponentScenarios, Scenario } from "../src/scenarios";

/** The block each component's root carries, where it is not its own name. */
export const ROOT_BLOCK: Record<string, string> = {
  ActionMenu: "CharcellActionMenuList",
  CodeBlock: "CharcellScrollArea",
  Combobox: "CharcellComboboxField",
  Dialog: "CharcellFrame",
  Popover: "CharcellPopoverPanel",
  Select: "CharcellSelectTrigger",
  Table: "CharcellScrollArea",
  Tooltip: "CharcellTooltip",
};

/** The props that show a component's root, which some keep closed. */
export const SHOWN: Record<string, Record<string, unknown>> = {
  ActionMenu: { defaultOpen: true },
  Dialog: { defaultOpen: true },
  Popover: { defaultOpen: true },
  Tooltip: { defaultOpen: true },
};

/** The components with no element of their own, and why. */
export const EXCEPTIONS: Record<string, string> = {
  SortableGroup:
    "it shares one drag among the lists inside it and renders none of its own; each list takes its attributes",
};

/** The block a component's root carries. */
export const rootBlock = (name: string) =>
  ROOT_BLOCK[name] ?? `Charcell${name}`;

/** A component's default scenario, with its root shown. */
export function shownScenario(
  name: string,
  source: ComponentScenarios,
): Scenario {
  const scenario =
    source.scenarios.find((each) => each.default) ?? source.scenarios[0];
  return {
    id: "attributes",
    label: "attributes",
    ...scenario,
    check: undefined,
    props: { ...source.props, ...scenario?.props, ...SHOWN[name] },
  };
}

/** The consumer's class, style and data attribute, together on the
 *  component's root and nowhere else. */
export function expectAtRoot(name: string) {
  const marked = [...document.querySelectorAll<HTMLElement>("[data-gang]")];
  expect(marked, `${name}: one element takes the attributes`).toHaveLength(1);
  const [target] = marked;
  expect(target!.classList.contains("Polecats"), `${name}: class`).toBe(true);
  expect(target!.style.outlineOffset, `${name}: style`).toBe("3px");
  expect(
    target!.classList.contains(rootBlock(name)),
    `${name}: on the root, not ${target!.className}`,
  ).toBe(true);
}

/** The labeled native controls, whose `<input>` takes the attributes that
 *  only work there, the label keeping the rest. */
export const NATIVE_INPUTS = ["Checkbox", "Toggle"];

/** What a Field and a form give a native control, in each spelling. */
export const INPUT_ATTRIBUTES = {
  "aria-describedby": "gang-hint",
  required: true,
  form: "recruit",
};

/** The input attributes on the `<input>`, none of them on the label, which
 *  keeps the class and data attribute; `blurred` counts the blur handler. */
export function expectAtInput(name: string, blurred: () => number) {
  const input = document.querySelector<HTMLInputElement>("input")!;
  const label = input.closest("label")!;
  expect(input.getAttribute("aria-describedby"), `${name}: aria`).toBe(
    "gang-hint",
  );
  expect(input.required, `${name}: required`).toBe(true);
  expect(input.getAttribute("form"), `${name}: form`).toBe("recruit");
  for (const attribute of ["aria-describedby", "required", "form"])
    expect(
      label.hasAttribute(attribute),
      `${name}: ${attribute} on the label`,
    ).toBe(false);
  expect(
    label.classList.contains("Polecats"),
    `${name}: class on the label`,
  ).toBe(true);
  expect(label.dataset.gang, `${name}: data on the label`).toBe("polecats");
  input.focus();
  input.blur();
  expect(blurred(), `${name}: blur reaches the handler`).toBe(1);
}
