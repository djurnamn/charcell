// root-attributes.test.tsx on the Svelte target: each component mounted with
// its default scenario's props, an overlay open, and a consumer's class,
// style and data attribute.
import { afterEach, describe, test } from "vitest";
import { flushSync, mount, unmount, type Component } from "svelte";
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
  "../dist/svelte/*.svelte",
);

const mounted: ReturnType<typeof mount>[] = [];

afterEach(() => {
  for (const component of mounted.splice(0)) unmount(component);
  document.body.innerHTML = "";
});

describe("root attributes (Svelte)", () => {
  for (const [name, source] of Object.entries(SCENARIOS)) {
    if (name in EXCEPTIONS) continue;
    test(name, async () => {
      const component = (await components[`../dist/svelte/${name}.svelte`]!())
        .default;
      const target = document.body.appendChild(document.createElement("div"));
      mounted.push(
        mount(component, {
          target,
          props: {
            ...shownScenario(name, source).props,
            class: "Polecats",
            style: "outline-offset: 3px",
            "data-gang": "polecats",
          },
        }),
      );
      flushSync();
      await new Promise((resolve) => setTimeout(resolve, 0));
      flushSync();
      expectAtRoot(name);
    });
  }
});

describe("native input attributes (Svelte)", () => {
  for (const name of NATIVE_INPUTS) {
    test(name, async () => {
      const component = (await components[`../dist/svelte/${name}.svelte`]!())
        .default;
      let blurred = 0;
      const target = document.body.appendChild(document.createElement("div"));
      mounted.push(
        mount(component, {
          target,
          props: {
            label: "wanted",
            ...INPUT_ATTRIBUTES,
            class: "Polecats",
            "data-gang": "polecats",
            onblur: () => {
              blurred += 1;
            },
          },
        }),
      );
      flushSync();
      expectAtInput(name, () => blurred);
    });
  }
});
