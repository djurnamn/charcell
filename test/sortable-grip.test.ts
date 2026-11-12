// @vitest-environment jsdom
//
// A row's grip can be replaced while the row stays mounted (an item that
// re-renders its own grip, content folding open inside it): the drag must
// follow the grip that is in the document, not the one the row mounted with.
import { describe, expect, test, vi } from "vitest";

// The drag engine reaches for ResizeObserver as it loads; jsdom has none.
vi.hoisted(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

import { Sortable } from "@dnd-kit/dom/sortable";
import { SortableGroupEngine } from "../src/scripts/sortable";

const grip = (id: string) => {
  const button = document.createElement("button");
  button.id = id;
  return button;
};

describe("a sortable row", () => {
  test("drags by the grip in the document after the grip is replaced", async () => {
    const engine = new SortableGroupEngine({ onMove: () => {} });
    engine.list("plan", [{ name: "button" }], {
      getKey: (item) => (item as { name: string }).name,
      ancestors: [],
      onItems: () => {},
    });
    const row = document.createElement("div");
    const first = grip("plan-grip-button");
    row.append(first);
    document.body.append(row);
    // The handle dnd-kit's sortable was last given.
    let handle: Element | undefined;
    vi.spyOn(Sortable.prototype, "handle", "set").mockImplementation(function (
      this: Sortable,
      value,
    ) {
      handle = value;
      this.draggable.handle = value;
    });
    engine.attachRow("button", row, "plan-grip-button");

    const second = grip("plan-grip-button");
    first.replaceWith(second);
    await new Promise((resolve) => setTimeout(resolve));
    expect(handle).toBe(second);
  });
});
