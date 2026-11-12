// @vitest-environment jsdom
//
// A checkbox's `indeterminate` is a DOM property with no attribute, so no
// server render shows it: mount the Checkbox and read it off the input.
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, test } from "vitest";
import { Checkbox } from "../dist/react/Checkbox";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("Checkbox (React)", () => {
  test("indeterminate sets the property and follows the prop", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() =>
      root.render(
        createElement(Checkbox, {
          label: "free the whole gang",
          indeterminate: true,
        }),
      ),
    );
    const input = container.querySelector("input")!;
    expect(input.indeterminate).toBe(true);
    act(() =>
      root.render(
        createElement(Checkbox, {
          label: "free the whole gang",
          indeterminate: false,
        }),
      ),
    );
    expect(input.indeterminate).toBe(false);
    act(() => root.unmount());
  });
});
