// Generated scenarios: one per enum value other than the current one and one
// per boolean flipped, for the props a component lists, read from its
// template. The ids and labels are the ones links and snapshots key on:
// `variant-dense` and `variant: dense`, or a boolean's bare name.
import type { Scenario, Value } from "./types";

interface TemplateProps {
  props?: Record<string, { type: string; default?: unknown }>;
}

/** A prop's control: the enum's values, a boolean, or none. */
function controlOf(
  type: string,
): { kind: "boolean" } | { kind: "enum"; values: string[] } | undefined {
  if (type.trim() === "boolean") return { kind: "boolean" };
  const parts = type.split("|").map((part) => part.trim());
  if (parts.length > 0 && parts.every((part) => /^'[^']*'$/.test(part))) {
    return { kind: "enum", values: parts.map((part) => part.slice(1, -1)) };
  }
  return undefined;
}

/** Whether a scenario sets exactly one prop, to this value. */
const setsOnly = (scenario: Scenario, prop: string, value: Value) => {
  const entries = Object.entries(scenario.props ?? {});
  return (
    entries.length === 1 && entries[0][0] === prop && entries[0][1] === value
  );
};

/**
 * The written scenarios, then one generated scenario per value of the listed
 * props that none of them sets alone.
 * @param template - the component's template (its default export).
 * @param generate - the props to generate scenarios for.
 * @param options - the props every scenario starts from, and the written scenarios.
 * @returns The written scenarios, then the generated ones.
 * @example
 * withGenerated(button, ['variant', 'border'], { scenarios: [{ id: 'variant-boxed', label: 'variant: boxed', default: true }] });
 */
export function withGenerated(
  // A template's type can be wider than a component's (a list of nodes), so
  // any object passes and its props are read off it.
  template: object,
  generate: string[],
  {
    props = {},
    scenarios = [],
  }: { props?: Record<string, Value>; scenarios?: Scenario[] },
): Scenario[] {
  const declared = (template as TemplateProps).props ?? {};
  const taken = new Set(scenarios.map((scenario) => scenario.id));
  const out = [...scenarios];
  const missing = generate.filter((prop) => !(prop in declared));
  if (missing.length)
    throw new Error(`no prop ${missing.join(", ")} to generate scenarios for`);
  // In the template's order, as the props read.
  for (const [prop, definition] of Object.entries(declared).filter(([name]) =>
    generate.includes(name),
  )) {
    const control = controlOf(definition.type);
    if (!control)
      throw new Error(`prop ${prop} is neither an enum nor a boolean`);
    const current = prop in props ? props[prop] : definition.default;
    const values: Value[] =
      control.kind === "boolean"
        ? [current !== true]
        : control.values.filter((value) => value !== current);
    for (const value of values) {
      if (scenarios.some((scenario) => setsOnly(scenario, prop, value)))
        continue;
      const id = value === true ? prop : `${prop}-${String(value)}`;
      if (taken.has(id)) continue;
      taken.add(id);
      out.push({
        id,
        label: value === true ? prop : `${prop}: ${String(value)}`,
        props: { [prop]: value },
        generated: true,
      });
    }
  }
  return out;
}
