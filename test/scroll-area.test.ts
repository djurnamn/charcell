// The scroll area's geometry: a thumb of whole cells, and the rows a key
// moves.
// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import {
  keyCells,
  ScrollAreaEngine,
  thumbCells,
} from "../src/scripts/scroll-area";

describe("the scroll area", () => {
  test("a wheel over the bar along an axis the area doesn't scroll is left to the page", () => {
    const root = document.createElement("div");
    root.innerHTML = `<div class="CharcellScrollArea__viewport"></div><div class="CharcellScrollArea__horizontal-bar"></div>`;
    const viewport = root.firstElementChild as HTMLElement;
    const bar = root.lastElementChild as HTMLElement;
    viewport.scrollBy = vi.fn();
    const canvas = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => ({
      font: "",
      measureText: () => ({ width: 8 }),
    })) as unknown as typeof canvas;
    const engine = new ScrollAreaEngine(root, {
      stepped: false,
      orientation: "horizontal",
    });
    try {
      const wheel = (delta: WheelEventInit) => {
        const event = new WheelEvent("wheel", { cancelable: true, ...delta });
        bar.dispatchEvent(event);
        return event;
      };
      expect(wheel({ deltaY: 48 }).defaultPrevented).toBe(false);
      expect(viewport.scrollBy).not.toHaveBeenCalled();
      expect(wheel({ deltaX: 48 }).defaultPrevented).toBe(true);
      expect(viewport.scrollBy).toHaveBeenCalledWith({ top: 0, left: 48 });
    } finally {
      engine.destroy();
      HTMLCanvasElement.prototype.getContext = canvas;
    }
  });

  test("the viewport is marked along an axis only while that axis has something to scroll", () => {
    // The stylesheet holds overscroll along a marked axis alone: an area
    // that held an axis with nothing to scroll would swallow a finger's
    // drag, the page's share of it too.
    const root = document.createElement("div");
    root.innerHTML = `<div class="CharcellScrollArea__viewport"></div>`;
    const viewport = root.firstElementChild as HTMLElement;
    const size = { scrollWidth: 320, clientWidth: 320 };
    for (const name of ["scrollWidth", "clientWidth"] as const)
      Object.defineProperty(viewport, name, { get: () => size[name] });
    Object.defineProperty(viewport, "scrollHeight", { get: () => 480 });
    Object.defineProperty(viewport, "clientHeight", { get: () => 160 });
    const vertical = "CharcellScrollArea__viewport--scrolling-vertical";
    const horizontal = "CharcellScrollArea__viewport--scrolling-horizontal";
    const marks = () =>
      [vertical, horizontal].filter((name) =>
        viewport.classList.contains(name),
      );
    const canvas = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => ({
      font: "",
      measureText: () => ({ width: 8 }),
    })) as unknown as typeof canvas;
    const engine = new ScrollAreaEngine(root, {
      stepped: false,
      orientation: "horizontal",
    });
    try {
      // Across, the content fits; down, the area does not scroll.
      expect(marks()).toEqual([]);
      size.scrollWidth = 640;
      engine.update({ stepped: false, orientation: "horizontal" });
      expect(marks()).toEqual([horizontal]);
      engine.update({ stepped: false, orientation: "both" });
      expect(marks()).toEqual([vertical, horizontal]);
      size.scrollWidth = 320;
      engine.update({ stepped: false, orientation: "both" });
      expect(marks()).toEqual([vertical]);
    } finally {
      // Without an engine nothing is held.
      engine.destroy();
      HTMLCanvasElement.prototype.getContext = canvas;
    }
    expect(marks()).toEqual([]);
  });

  test("the thumb is whole cells, at either end only when the content is", () => {
    // 20 rows over 200: two cells of a 20-cell track.
    const at = (offset: number) => thumbCells(20, 320, 3200, offset, 2880);
    expect(at(0)).toEqual({ start: 0, length: 2 });
    // A row down, it has left the top.
    expect(at(16)).toEqual({ start: 1, length: 2 });
    expect(at(1440)).toEqual({ start: 9, length: 2 });
    // A row short of the end, it has not reached it.
    expect(at(2864)).toEqual({ start: 17, length: 2 });
    expect(at(2880)).toEqual({ start: 18, length: 2 });
    // A long content: at least a cell; nothing to scroll: none.
    expect(thumbCells(20, 320, 320000, 0, 319680).length).toBe(1);
    expect(thumbCells(20, 320, 320, 0, 0).length).toBe(0);
  });

  test("a key moves a row, a page less a row, or to an end", () => {
    expect(keyCells("ArrowDown", false, 19, "block")).toBe(1);
    expect(keyCells("PageUp", false, 19, "block")).toBe(-19);
    expect(keyCells(" ", true, 19, "block")).toBe(-19);
    expect(keyCells("End", false, 19, "block")).toBe("end");
    expect(keyCells("ArrowRight", false, 19, "inline")).toBe(1);
    expect(keyCells("ArrowDown", false, 19, "inline")).toBeUndefined();
  });
});
