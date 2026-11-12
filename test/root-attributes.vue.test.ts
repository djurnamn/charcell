// @vitest-environment jsdom
//
// root-attributes.test.tsx on the Vue target: each component mounted with
// its default scenario's props, an overlay open, and a consumer's class,
// style and data attribute.
import { afterEach, describe, test } from "vitest";
import { createApp, h, type App, type Component } from "vue";
import { SCENARIOS } from "../src/scenarios";
import {
  EXCEPTIONS,
  INPUT_ATTRIBUTES,
  NATIVE_INPUTS,
  expectAtInput,
  expectAtRoot,
  shownScenario,
} from "./root-attributes";

// A split's machine watches its panels' sizes once it mounts; jsdom has no
// ResizeObserver to do it with.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollTo ??= () => {};

const components = import.meta.glob<{ default: Component }>(
  "../dist/vue/*.vue",
);

let application: App | null = null;

afterEach(() => {
  application?.unmount();
  application = null;
  document.body.innerHTML = "";
});

describe("root attributes (Vue)", () => {
  for (const [name, source] of Object.entries(SCENARIOS)) {
    if (name in EXCEPTIONS) continue;
    test(name, async () => {
      const component = (await components[`../dist/vue/${name}.vue`]!())
        .default;
      const container = document.body.appendChild(
        document.createElement("div"),
      );
      application = createApp({
        render: () =>
          h(component, {
            ...shownScenario(name, source).props,
            class: "Polecats",
            style: "outline-offset: 3px",
            "data-gang": "polecats",
          }),
      });
      application.mount(container);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expectAtRoot(name);
    });
  }
});

describe("native input attributes (Vue)", () => {
  for (const name of NATIVE_INPUTS) {
    test(name, async () => {
      const component = (await components[`../dist/vue/${name}.vue`]!())
        .default;
      let blurred = 0;
      application = createApp({
        render: () =>
          h(component, {
            label: "wanted",
            ...INPUT_ATTRIBUTES,
            class: "Polecats",
            "data-gang": "polecats",
            onBlur: () => {
              blurred += 1;
            },
          }),
      });
      application.mount(
        document.body.appendChild(document.createElement("div")),
      );
      expectAtInput(name, () => blurred);
    });
  }
});
