// @vitest-environment jsdom
//
// Every component passes the attributes it does not declare to its root: a
// consumer's class, style and data attributes land together on the element
// a consumer would call the component, the one carrying the component's own
// block (an overlay's panel, a select's trigger), never a wrapper or a
// positioner. Each component renders from its default scenario, an overlay
// open.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, test } from "vitest";
import { SCENARIOS } from "../src/scenarios";
import { Checkbox, Toggle } from "../dist/react/index";
import {
  EXCEPTIONS,
  INPUT_ATTRIBUTES,
  NATIVE_INPUTS,
  expectAtInput,
  expectAtRoot,
  shownScenario,
} from "./root-attributes";
import { scenarioElement } from "./text/scenarios";

// A split's machine watches its panels' sizes once it mounts; jsdom has no
// ResizeObserver to do it with.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollTo ??= () => {};
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const ATTRIBUTES = {
  className: "Polecats",
  style: { outlineOffset: "3px" },
  "data-gang": "polecats",
};

let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("root attributes (React)", () => {
  for (const [name, source] of Object.entries(SCENARIOS)) {
    if (name in EXCEPTIONS) continue;
    test(name, () => {
      const scenario = shownScenario(name, source);
      const element = scenarioElement(name, source, {
        id: "attributes",
        label: "attributes",
        ...scenario,
        check: undefined,
        props: { ...scenario.props, ...ATTRIBUTES },
      });
      const container = document.body.appendChild(
        document.createElement("div"),
      );
      act(() => {
        root = createRoot(container);
        root.render(createElement("div", null, element));
      });
      expectAtRoot(name);
    });
  }
});

describe("native input attributes (React)", () => {
  const components = { Checkbox, Toggle } as const;
  for (const name of NATIVE_INPUTS) {
    test(name, () => {
      let blurred = 0;
      const container = document.body.appendChild(
        document.createElement("div"),
      );
      act(() => {
        root = createRoot(container);
        root.render(
          createElement(components[name as keyof typeof components], {
            label: "wanted",
            ...INPUT_ATTRIBUTES,
            className: "Polecats",
            "data-gang": "polecats",
            onBlur: () => {
              blurred += 1;
            },
          }),
        );
      });
      act(() => expectAtInput(name, () => blurred));
    });
  }
});
