// Every component's scenarios (src/scenarios) rendered from the built React
// target, and each in every state its stylesheet offers: the markup the cell
// check reads back into text and the docs site shows. Keyed `scenario` and
// `scenario:state`, as the snapshots are.
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as kit from "../../dist/react/unlinked/index";
import {
  SCENARIOS,
  type ComponentScenarios,
  type Content,
  type Scenario,
  type Value,
} from "../../src/scenarios";
import { forceProperties, stateTargets, statesOf } from "./states.mjs";

export interface ScenarioView {
  /** `scenario` or `scenario:state`. */
  key: string;
  scenario: string;
  state?: string;
  label: string;
  markup: string;
}

const components = kit as unknown as Record<
  string,
  Parameters<typeof createElement>[0]
>;

/** CSS text as a React style object. */
const styleOf = (css: string) =>
  Object.fromEntries(
    css
      .split(";")
      .map((declaration) => declaration.split(":").map((part) => part.trim()))
      .filter(([property, value]) => property && value)
      .map(([property, value]) => [
        // A custom property keeps its name; React sets it as it is.
        property.startsWith("--")
          ? property
          : property.replace(/-([a-z])/g, (_, letter: string) =>
              letter.toUpperCase(),
            ),
        value,
      ]),
  );

type Scope = Record<string, unknown>;
// A scope renders to the function the component calls with its values.
type Rendered = ReactNode | ((values: Scope) => ReactNode);

/** The value a scope holds at a path, `item.name`. */
const lookUp = (scope: Scope | undefined, path: string) =>
  path
    .split(".")
    .reduce<unknown>(
      (value, key) => (value as Record<string, unknown> | undefined)?.[key],
      scope,
    );

/** A scope's values under the names it gives them: `item: child` names `item` `child`. */
const named = (names: string[], values: Scope): Scope =>
  Object.fromEntries(
    names.map((name) => {
      const [given, as = given] = name.split(":").map((part) => part.trim());
      return [as, values[given]];
    }),
  );

/** The parts declared around content: each one's parameters and body. */
type Parts = Record<string, { parameters: string[]; body: Content }>;

/** Props as the scope gives them: a `{ scope: path }` takes the value there. */
const given = (props: Record<string, Value> | undefined, scope?: Scope) =>
  Object.entries(props ?? {}).map(([name, value]) => {
    const path =
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof value.scope === "string"
        ? value.scope
        : undefined;
    return [name, path ? lookUp(scope, path) : value] as const;
  });

/** A slot's content as react: inside a scope, its values fill the text, the
 *  props and the spreads; a part's body reads its parameters the same way. */
function render(
  content: Content,
  scope?: Scope,
  key?: number,
  parts: Parts = {},
): Rendered {
  if (typeof content === "string") {
    return scope
      ? content.replace(/\{([\w.]+)\}/g, (_, path: string) =>
          String(lookUp(scope, path)),
        )
      : content;
  }
  if (Array.isArray(content))
    return content.map(
      (each, index) => render(each, scope, index, parts) as ReactNode,
    );
  if ("scope" in content)
    return (values: Scope) =>
      render(
        content.children,
        { ...scope, ...named(content.scope, values) },
        undefined,
        parts,
      ) as ReactNode;
  if ("part" in content) {
    const declared = {
      ...parts,
      [content.part]: {
        parameters: content.parameters,
        body: content.children,
      },
    };
    return render(
      content.children,
      Object.fromEntries(given(content.props, scope)),
      key,
      declared,
    );
  }
  if ("call" in content) {
    const part = parts[content.call];
    if (!part) throw new Error(`no part ${content.call} declared around it`);
    return render(
      part.body,
      Object.fromEntries(given(content.props, scope)),
      key,
      parts,
    );
  }
  if ("when" in content)
    return (
      content.is === undefined
        ? lookUp(scope, content.when)
        : lookUp(scope, content.when) === content.is
    )
      ? render(content.children, scope, key, parts)
      : null;
  const children =
    content.children === undefined
      ? []
      : [render(content.children, scope, undefined, parts) as ReactNode];
  const spread = content.spread ? (scope?.[content.spread] as object) : {};
  const {
    innerHTML,
    style,
    class: className,
    ...props
  } = Object.fromEntries(given(content.props, scope)) as Record<string, Value>;
  if ("component" in content) {
    const component = components[content.component];
    if (!component)
      throw new Error(`no component ${content.component} in the react target`);
    const slots = Object.fromEntries(
      Object.entries(content.slots ?? {}).map(([slot, fill]) => [
        slot,
        render(fill, scope, undefined, parts),
      ]),
    );
    return createElement(
      component,
      {
        key,
        ...spread,
        ...props,
        ...slots,
        ...(typeof style === "string" ? { style: styleOf(style) } : {}),
        ...(typeof className === "string" ? { className } : {}),
      },
      ...children,
    );
  }
  return createElement(
    content.tag,
    {
      key,
      ...spread,
      ...props,
      ...(typeof className === "string" ? { className } : {}),
      ...(typeof style === "string" ? { style: styleOf(style) } : {}),
      ...(typeof innerHTML === "string"
        ? { dangerouslySetInnerHTML: { __html: innerHTML } }
        : {}),
    },
    ...children,
  );
}

/** One scenario of a component, at the width it is shown at, or what the check reads in its place. */
export function scenarioElement(
  name: string,
  source: ComponentScenarios,
  scenario?: Scenario,
): ReactElement {
  if (scenario?.check !== undefined)
    return createElement("div", null, render(scenario.check) as ReactNode);
  if (!components[name])
    throw new Error(`no component ${name} in the react target`);
  const named = Object.fromEntries(
    Object.entries(source.slots ?? {}).map(([slot, content]) => [
      slot,
      render(content),
    ]),
  );
  // A prop set to null is unset: the scenario takes back a shared prop.
  const props = Object.fromEntries(
    Object.entries({ ...source.props, ...scenario?.props, ...named }).filter(
      ([, value]) => value !== null,
    ),
  ) as Record<string, unknown>;
  // A scenario's own content goes in place of the shared one.
  const content = scenario?.children ?? source.children;
  const children = content === undefined ? [] : [render(content) as ReactNode];
  const element = createElement(components[name], props, ...children);
  return source.columns
    ? createElement("div", { style: { width: `${source.columns}ch` } }, element)
    : element;
}

/** The scenarios a component is checked in: its own, or its markup as it stands. */
const scenariosOf = (source: ComponentScenarios): (Scenario | undefined)[] =>
  source.scenarios.length ? source.scenarios : [undefined];

/**
 * Every component's scenarios and states, rendered.
 * @param css - the compiled stylesheet, for the states it offers.
 * @param only - the components to render, or all of them.
 * @returns The views per component name.
 */
export function scenarioViews(
  css: string,
  only?: string[],
): Record<string, ScenarioView[]> {
  const targets = stateTargets(css);
  const out: Record<string, ScenarioView[]> = {};
  for (const [name, source] of Object.entries(SCENARIOS)) {
    if (only && !only.includes(name)) continue;
    const views: ScenarioView[] = [];
    for (const scenario of scenariosOf(source)) {
      const id = scenario?.id ?? "default";
      const label = scenario?.label ?? "default";
      let markup = renderToStaticMarkup(
        scenarioElement(name, source, scenario),
      );
      if (scenario?.forced) markup = forceProperties(markup, scenario.forced);
      views.push({ key: id, scenario: id, label, markup });
      for (const { state, markup: forced } of statesOf(
        markup,
        targets,
        `Charcell${name}`,
      )) {
        views.push({
          key: `${id}:${state}`,
          scenario: id,
          state,
          label: `${label}, ${state}`,
          markup: forced,
        });
      }
      for (const [state, content] of Object.entries(scenario?.states ?? {})) {
        const forced = renderToStaticMarkup(
          createElement("div", null, render(content) as ReactNode),
        );
        views.push({
          key: `${id}:${state}`,
          scenario: id,
          state,
          label: `${label}, ${state}`,
          markup: forced,
        });
      }
    }
    out[name] = views;
  }
  return out;
}
