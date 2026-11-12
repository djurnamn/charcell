// The floating surfaces on the cell grid: Zag's position, moved so the
// surface sits a whole number of cells from its trigger.
// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { attachedAt } from "../src/scripts/attach";
import { onCellGrid, onCells } from "../src/scripts/positioning";

describe("positioning on the cell grid", () => {
  test("a value moves to the nearest whole cell from its anchor", () => {
    expect(onCells(103.4, 100, 8)).toBe(100);
    expect(onCells(105, 100, 8)).toBe(108);
    expect(onCells(-13, 0, 8)).toBe(-16);
    // No cell measured: left as it is.
    expect(onCells(103.4, 100, 0)).toBe(103.4);
  });

  test("a surface zag placed between cells moves onto its trigger's", async () => {
    // jsdom lays nothing out, so the rects and the cell are given.
    const trigger = document.createElement("button");
    trigger.getBoundingClientRect = () => ({ left: 40, top: 100 }) as DOMRect;
    const positioner = document.createElement("div");
    const surface = document.createElement("div");
    surface.style.lineHeight = "16px";
    positioner.append(surface);
    // Zag shifted it 13.5px left of the trigger and 49px below its top.
    positioner.style.setProperty("--x", "26.5px");
    positioner.style.setProperty("--y", "149px");
    positioner.style.transform = "matrix(1, 0, 0, 1, 26.5, 149)";
    positioner.getBoundingClientRect = () =>
      ({ left: 26.5, top: 149 }) as DOMRect;
    const canvas = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => ({
      font: "",
      measureText: () => ({ width: 8 }),
    })) as unknown as typeof canvas;
    try {
      const options = onCellGrid({ placement: "bottom-start" }, () => trigger);
      expect(options.placement).toBe("bottom-start");
      let placed = false;
      await options.updatePosition({
        updatePosition: async () => {
          placed = true;
        },
        floatingElement: positioner,
      });
      expect(placed).toBe(true);
      // -13.5 is nearest -16 (two columns), 49 nearest 48 (three rows).
      expect(positioner.style.getPropertyValue("--x")).toBe("24px");
      expect(positioner.style.getPropertyValue("--y")).toBe("148px");
    } finally {
      HTMLCanvasElement.prototype.getContext = canvas;
    }
  });

  test("a surface zag has parked above the page is judged where it was placed", async () => {
    const trigger = document.createElement("button");
    trigger.getBoundingClientRect = () => ({ left: 336, top: 192 }) as DOMRect;
    const positioner = document.createElement("div");
    const surface = document.createElement("div");
    surface.style.lineHeight = "16px";
    positioner.append(surface);
    // Placed on the grid, but still a screen above the page: 500px up.
    positioner.style.setProperty("--x", "336px");
    positioner.style.setProperty("--y", "208px");
    positioner.style.transform = "matrix(1, 0, 0, 1, 0, -500)";
    positioner.getBoundingClientRect = () =>
      ({ left: 0, top: -500 }) as DOMRect;
    const canvas = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => ({
      font: "",
      measureText: () => ({ width: 8 }),
    })) as unknown as typeof canvas;
    try {
      await onCellGrid({}, () => trigger).updatePosition({
        updatePosition: async () => {},
        floatingElement: positioner,
      });
      expect(positioner.style.getPropertyValue("--x")).toBe("336px");
      expect(positioner.style.getPropertyValue("--y")).toBe("208px");
    } finally {
      HTMLCanvasElement.prototype.getContext = canvas;
    }
  });

  test("a window attaches only to a trigger that draws a ring", () => {
    const trigger = document.createElement("button");
    trigger.id = "attach-trigger";
    document.body.append(trigger);
    const record = { id: trigger.id };
    try {
      trigger.className = "CharcellButton CharcellButton--boxed";
      expect(
        attachedAt(true, "bottom-start", undefined, undefined, record),
      ).toBe(true);
      trigger.className = "CharcellButton CharcellButton--dense";
      expect(
        attachedAt(true, "bottom-start", undefined, undefined, record),
      ).toBe(false);
    } finally {
      trigger.remove();
    }
  });
});
