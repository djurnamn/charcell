// The Splitter's character grid: Zag rounds the sizes it writes to three
// significant digits, so the drivers restate each panel's flex exactly.
// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import {
  fitJoined,
  holdCharacterGrid,
  startingFromCells,
  carrySizes,
  characterStep,
  exactPanelFlex,
  fittingMinimums,
  keepingCells,
  measureCellSize,
  measureContentCells,
  measurePanelSpace,
  minimumCells,
  panelMinimums,
  snapToCharacterGrid,
  splitterPanels,
  startingSizes,
  stepBoundary,
  withCellSteps,
  withExactPanels,
  withOpenEdges,
} from "../src/scripts/character-snap";

describe("character snapping", () => {
  test("the panel space leaves out the root's padding and its handles", () => {
    // jsdom lays nothing out, so the root's widths are given.
    const root = document.createElement("div");
    root.style.padding = "0 12px 0 20px";
    Object.defineProperty(root, "clientWidth", { value: 832 });
    const handle = document.createElement("div");
    handle.setAttribute("data-part", "resize-trigger");
    handle.getBoundingClientRect = () => ({ width: 16 }) as DOMRect;
    root.append(document.createElement("div"), handle);
    expect(measurePanelSpace(root)).toBe(784);
  });

  test("a stacked split measures its height and snaps to whole rows", () => {
    const root = document.createElement("div");
    root.style.padding = "8px 0 24px";
    root.style.lineHeight = "16px";
    Object.defineProperty(root, "clientHeight", { value: 448 });
    const handle = document.createElement("div");
    handle.setAttribute("data-part", "resize-trigger");
    handle.getBoundingClientRect = () => ({ height: 16 }) as DOMRect;
    root.append(handle);
    // 448 less 32 of padding and the handle's row: 400px, 25 rows.
    const space = measurePanelSpace(root, "vertical");
    expect(space).toBe(400);
    expect(measureCellSize(root, "vertical")).toBe(16);
    const [start] = snapToCharacterGrid(
      [40, 60],
      space,
      16,
      minimumCells("vertical"),
    );
    expect(((start / 100) * space) / 16).toBeCloseTo(10, 9);
    // A split pushed to the edge keeps three rows.
    const [least] = snapToCharacterGrid(
      [2, 98],
      space,
      16,
      minimumCells("vertical"),
    );
    expect(((least / 100) * space) / 16).toBeCloseTo(3, 9);
  });

  test("a split too small for every panel's least cells is left as it is", () => {
    // 5 rows cannot hold two panels of three.
    expect(snapToCharacterGrid([40, 60], 80, 16, 3)).toEqual([40, 60]);
  });

  test("an even split lands its boundary on a whole column of the panel space", () => {
    // 977px shared by the panels, 8px cells: 122.125 columns.
    const [start] = snapToCharacterGrid([50, 50], 977, 8);
    expect(Math.abs(((start / 100) * 977) / 8 - 61)).toBeLessThan(1e-9);
  });

  test("exactPanelFlex restates the size in each style shape Zag hands out", () => {
    expect(
      exactPanelFlex({ style: { flexGrow: "49.9", flexBasis: 0 } }, 49.949)
        .style,
    ).toEqual({ flexGrow: 49.949, flexBasis: 0 });
    expect(
      exactPanelFlex({ style: { flex: "49.9 1 0px" } }, 49.949).style,
    ).toEqual({ flex: "49.949 1 0px" });
    expect(
      exactPanelFlex({ style: "flex:49.9 1 0px;overflow:hidden;" }, 49.949)
        .style,
    ).toBe("flex:49.949 1 0px;overflow:hidden;");
    expect(exactPanelFlex({ style: "overflow:hidden;" }, 49.949).style).toBe(
      "overflow:hidden;flex:49.949 1 0px;",
    );
  });

  test("withExactPanels sizes each panel by its id, and leaves the api alone without sizes", () => {
    const api = {
      getPanelProps: ({ id }: { id: string }) => ({
        id,
        style: { flex: "1 1 0px" },
      }),
    };
    expect(
      withExactPanels(api, ["start", "end"], [40.25, 59.75]).getPanelProps({
        id: "end",
      }).style,
    ).toEqual({ flex: "59.75 1 0px" });
    expect(withExactPanels(api, ["start", "end"], undefined)).toBe(api);
  });

  test("a keyboard step moves a boundary exactly one column, however narrow the split", () => {
    for (const space of [977, 352, 150]) {
      const columns = (sizes: number[]) => ((sizes[0] / 100) * space) / 8;
      const start = snapToCharacterGrid([50, 50], space, 8);
      const step = characterStep(space, 8);
      for (const direction of [-1, 1]) {
        const moved = snapToCharacterGrid(
          [start[0] + direction * step, start[1] - direction * step],
          space,
          8,
        );
        expect(Math.round((columns(moved) - columns(start)) * 1e6) / 1e6).toBe(
          direction,
        );
      }
    }
    // Zag's own 1% step on a 352px split is under half a column: it rounds back.
    const start = snapToCharacterGrid([50, 50], 352, 8);
    expect(snapToCharacterGrid([start[0] - 1, start[1] + 1], 352, 8)).toEqual(
      start,
    );
  });

  test("a new panel set starts from its default size, or an even split when that names another count", () => {
    expect(startingSizes(2, [30, 70])).toEqual([30, 70]);
    expect(startingSizes(3, [30, 70])).toEqual([100 / 3, 100 / 3, 100 / 3]);
    expect(startingSizes(2)).toEqual([50, 50]);
  });

  test("a boundary steps whole cells within its panels' limits", () => {
    // 400px of 16px rows: 25 rows, the boundary on row 10.
    const rows = (sizes: number[]) => ((sizes[0] / 100) * 400) / 16;
    const start = snapToCharacterGrid([40, 60], 400, 16, 3);
    expect(rows(stepBoundary(start, 0, -1, 400, 16, 3))).toBeCloseTo(9, 9);
    expect(rows(stepBoundary(start, 0, 2, 400, 16, 3))).toBeCloseTo(12, 9);
    // The first panel's least 36%: 9 rows, so a step of three stops there.
    const limited = stepBoundary(start, 0, -3, 400, 16, 3, [
      { id: "start", minimumSize: 36 },
      { id: "end" },
    ]);
    expect(rows(limited)).toBeCloseTo(9, 9);
    // The far panel's least three rows.
    expect(rows(stepBoundary(start, 0, 20, 400, 16, 3))).toBeCloseTo(22, 9);
  });

  test("arrow keys step from the held sizes, however soon one follows another", () => {
    const root = document.createElement("div");
    root.style.lineHeight = "16px";
    Object.defineProperty(root, "clientHeight", { value: 416 });
    const handle = document.createElement("div");
    handle.setAttribute("data-part", "resize-trigger");
    handle.getBoundingClientRect = () => ({ height: 16 }) as DOMRect;
    root.append(handle);
    // Zag's own handler, stepping from a copy that has not caught up.
    const zag: KeyboardEvent[] = [];
    const api = {
      getResizeTriggerProps: () => ({
        onKeyDown: (event: KeyboardEvent) => {
          if (!event.defaultPrevented) zag.push(event);
        },
      }),
    };
    let held = snapToCharacterGrid([40, 60], 400, 16, 3);
    const stepped = withCellSteps(api, {
      panels: [{ id: "start" }, { id: "end" }],
      sizes: () => held,
      apply: (next) => (held = next),
      orientation: "vertical",
    });
    const press = (key: string, shiftKey = false) => {
      const { onKeyDown } = stepped.getResizeTriggerProps({
        id: "start:end",
      }) as { onKeyDown: (event: KeyboardEvent) => void };
      handle.addEventListener("keydown", onKeyDown, { once: true });
      handle.dispatchEvent(
        new KeyboardEvent("keydown", { key, shiftKey, cancelable: true }),
      );
    };
    press("ArrowUp");
    press("ArrowUp");
    expect(((held[0] / 100) * 400) / 16).toBeCloseTo(8, 9);
    press("ArrowDown");
    expect(((held[0] / 100) * 400) / 16).toBeCloseTo(9, 9);
    expect(zag).toEqual([]);
    // Across a stacked split, shifted, or home: Zag's.
    press("ArrowLeft");
    press("ArrowUp", true);
    press("Home");
    expect(zag.map((event) => event.key)).toEqual([
      "ArrowLeft",
      "ArrowUp",
      "Home",
    ]);
    expect(((held[0] / 100) * 400) / 16).toBeCloseTo(9, 9);
  });

  test("a panel's least cells hold in the snapping and the arrow keys", () => {
    // 400px of 8px columns: 50; the first panel keeps at least 20.
    const least = panelMinimums([
      { id: "start", minimumCells: 20 },
      { id: "end" },
    ]);
    expect(least).toEqual([20, 8]);
    const columns = (sizes: number[]) => ((sizes[0] / 100) * 400) / 8;
    expect(columns(snapToCharacterGrid([10, 90], 400, 8, least))).toBeCloseTo(
      20,
      9,
    );
    const start = snapToCharacterGrid([42, 58], 400, 8, least);
    expect(columns(start)).toBeCloseTo(21, 9);
    expect(columns(stepBoundary(start, 0, -3, 400, 8, least))).toBeCloseTo(
      20,
      9,
    );
    // Too small for every panel's least: each least shrinks to an even
    // share (25 columns: 12 and 8), and the boundary still lands on a column.
    const small = snapToCharacterGrid([30, 70], 200, 8, least);
    expect(((small[0]! / 100) * 200) / 8).toBeCloseTo(12, 9);
    // No column for every panel: left as it is.
    expect(snapToCharacterGrid([50, 50], 8, 8, least)).toEqual([50, 50]);
  });

  test("a stacked split shorter than its panels' least rows still steps a row at a time", () => {
    // 80px of 16px rows: 5, under the 3 + 3 a stacked split keeps.
    const least = panelMinimums([{ id: "start" }, { id: "end" }], "vertical");
    expect(fittingMinimums(least, 2, 5)).toEqual([2, 2]);
    expect(fittingMinimums(least, 2, 1)).toBeUndefined();
    const rows = (sizes: number[]) => ((sizes[0]! / 100) * 80) / 16;
    const dragged = snapToCharacterGrid([52, 48], 80, 16, least);
    expect(rows(dragged)).toBeCloseTo(3, 9);
    expect(rows(snapToCharacterGrid([75, 25], 80, 16, least))).toBeCloseTo(
      3,
      9,
    );
    expect(rows(stepBoundary(dragged, 0, -1, 80, 16, least))).toBeCloseTo(2, 9);
    expect(rows(stepBoundary(dragged, 0, 1, 80, 16, least))).toBeCloseTo(3, 9);
  });

  test("the splitter's two panels carry its keep and least cells", () => {
    expect(splitterPanels(undefined, undefined)).toBeUndefined();
    expect(splitterPanels("end", [16, 12])).toEqual([
      { id: "start", keepCells: false, minimumCells: 16 },
      { id: "end", keepCells: true, minimumCells: 12 },
    ]);
    expect(panelMinimums(splitterPanels(undefined, [16])!)).toEqual([16, 8]);
  });

  test("a kept panel holds its length as the split widens, the others sharing the rest", () => {
    // 400px to 800px: a 25% sidebar (100px) stays 100px, 12.5%.
    expect(keepingCells([25, 75], 400, 800, [true, false])).toEqual([
      12.5, 87.5,
    ]);
    // Three panels, the middle kept: the outer two share the rest 1:2.
    const [first, middle, last] = keepingCells([20, 20, 60], 400, 800, [
      false,
      true,
      false,
    ]);
    expect(middle).toBeCloseTo(10, 9);
    expect(first).toBeCloseTo(22.5, 9);
    expect(last).toBeCloseTo(67.5, 9);
    // Unchanged space, nothing kept, everything kept, or a kept panel wider
    // than the new space: as they are.
    expect(keepingCells([25, 75], 400, 400, [true, false])).toEqual([25, 75]);
    expect(keepingCells([25, 75], 400, 800, [false, false])).toEqual([25, 75]);
    expect(keepingCells([25, 75], 400, 800, [true, true])).toEqual([25, 75]);
    expect(keepingCells([75, 25], 800, 400, [true, false])).toEqual([75, 25]);
  });

  test("the root and panels lose zag's overflow, in every framework's style", () => {
    const api = {
      getRootProps: () => ({ style: { display: "flex", overflow: "hidden" } }),
      getPanelProps: () => ({ style: "flex: 50 1 0px; overflow: hidden;" }),
    };
    const open = withOpenEdges(api);
    expect(open.getRootProps().style).toEqual({ display: "flex" });
    expect(open.getPanelProps({ id: "start" }).style).toBe("flex: 50 1 0px;");
  });

  test("a track that leaves hands its cells to its neighbor, and takes them back on its return", () => {
    // 100 cells, two handles: 98 shared; a 20, b 28, c 50.
    const memory = new Map();
    const cellsOf = (sizes: number[], total: number) =>
      sizes.map((size) => Math.round((size / 100) * total * 1000) / 1000);
    const minimums = { a: 8, b: 8, c: 8 };
    const hidden = carrySizes({
      previousIds: ["a", "b", "c"],
      previousSizes: [20, 28, 50].map((cells) => (cells / 98) * 100),
      ids: ["a", "c"],
      total: 99,
      minimums,
      memory,
    });
    // A keeps its 20; c takes b's 28 and its handle's cell.
    expect(cellsOf(hidden, 99)).toEqual([20, 79]);
    const shown = carrySizes({
      previousIds: ["a", "c"],
      previousSizes: hidden,
      ids: ["a", "b", "c"],
      total: 98,
      minimums,
      memory,
    });
    expect(cellsOf(shown, 98)).toEqual([20, 28, 50]);
  });

  test("a returning track takes only what its neighbor still holds beyond its own, down to its least", () => {
    const memory = new Map();
    const minimums = { a: 8, b: 8, c: 8 };
    const cellsOf = (sizes: number[], total: number) =>
      sizes.map((size) => Math.round((size / 100) * total * 1000) / 1000);
    carrySizes({
      previousIds: ["a", "b", "c"],
      previousSizes: [20, 28, 50].map((cells) => (cells / 98) * 100),
      ids: ["a", "c"],
      total: 99,
      minimums,
      memory,
    });
    // The reader grew a into c's space: a 40, c 59 (9 more than its 50).
    const shown = carrySizes({
      previousIds: ["a", "c"],
      previousSizes: [40, 59].map((cells) => (cells / 99) * 100),
      ids: ["a", "b", "c"],
      total: 98,
      minimums,
      memory,
    });
    // B gets the 9 back, one for its handle: 8, its least; a keeps its 40.
    expect(cellsOf(shown, 98)).toEqual([40, 8, 50]);
  });

  test("a new track takes its share from its neighbor, the others keeping theirs", () => {
    const cellsOf = (sizes: number[], total: number) =>
      sizes.map((size) => Math.round((size / 100) * total * 1000) / 1000);
    const sizes = carrySizes({
      previousIds: ["a", "c"],
      previousSizes: [20, 79].map((cells) => (cells / 99) * 100),
      ids: ["a", "c", "d"],
      total: 98,
      minimums: { a: 8, c: 8, d: 8 },
      memory: new Map(),
    });
    // An even third of 98 (32.667), less its handle's cell, from the second.
    const [first, second, third] = cellsOf(sizes, 98);
    expect(first).toBe(20);
    expect(third).toBeCloseTo(98 / 3, 2);
    expect(first + second + third).toBeCloseTo(98, 6);
  });

  test("redistributed proportionally, a leaving track's cells go to every track that stays, by its length, and come back from them", () => {
    const memory = new Map();
    const percents = (sizes: number[]) =>
      sizes.map((size) => Math.round(size * 10) / 10);
    const minimums = { a: 8, b: 8, c: 8 };
    // 100 cells, two handles: 98 shared, 40/20/40 of them.
    const previousSizes = [39.2, 19.6, 39.2].map((cells) => (cells / 98) * 100);
    const hidden = carrySizes({
      previousIds: ["a", "b", "c"],
      previousSizes,
      ids: ["a", "b"],
      total: 99,
      minimums,
      memory,
      redistribute: "proportional",
    });
    // 39.2 and 19.6 share c's 39.2 and its handle's cell, two to one.
    expect(percents(hidden)).toEqual([66.7, 33.3]);
    const shown = carrySizes({
      previousIds: ["a", "b"],
      previousSizes: hidden,
      ids: ["a", "b", "c"],
      total: 98,
      minimums,
      memory,
      redistribute: "proportional",
    });
    expect(percents(shown)).toEqual(percents(previousSizes));
  });

  test("redistributed proportionally, an even split stays even as a track leaves, and a track that keeps its cells holds them", () => {
    const percents = (sizes: number[]) =>
      sizes.map((size) => Math.round(size * 10) / 10);
    const even = [1, 1, 1].map(() => 100 / 3);
    expect(
      percents(
        carrySizes({
          previousIds: ["a", "b", "c"],
          previousSizes: even,
          ids: ["a", "c"],
          total: 99,
          minimums: {},
          memory: new Map(),
          redistribute: "proportional",
        }),
      ),
    ).toEqual([50, 50]);
    const kept = carrySizes({
      previousIds: ["a", "b", "c"],
      previousSizes: [20, 40, 38].map((cells) => (cells / 98) * 100),
      ids: ["a", "b"],
      total: 99,
      minimums: {},
      memory: new Map(),
      redistribute: "proportional",
      keeping: ["a"],
    });
    expect(kept.map((size) => Math.round((size / 100) * 99))).toEqual([20, 79]);
  });

  test("redistributed proportionally, a new track takes an even share from every track, each keeping its proportion", () => {
    const percents = (sizes: number[]) =>
      sizes.map((size) => Math.round(size * 10) / 10);
    const sizes = carrySizes({
      previousIds: ["a", "b"],
      previousSizes: [25, 75],
      ids: ["a", "b", "c"],
      total: 98,
      minimums: {},
      memory: new Map(),
      redistribute: "proportional",
    });
    // C takes a third; a and b share the rest one to three.
    expect(percents(sizes)).toEqual(percents([100 / 6, 100 / 2, 100 / 3]));
  });

  test("a split starts at its panels' cells: a count, or the content's own up to its cap", () => {
    const cellsOf = (sizes: number[] | undefined, total: number) =>
      sizes?.map((size) => Math.round((size / 100) * total * 1000) / 1000);
    // A 16-column sidebar beside a pane: 16 and the rest.
    expect(
      cellsOf(
        startingFromCells({
          panels: [{ id: "sidebar", defaultCells: 16 }, { id: "main" }],
          total: 99,
          measure: () => 0,
        }),
        99,
      ),
    ).toEqual([16, 83]);
    // A scenario row at its tree's 7 rows, the others sharing 30:70.
    expect(
      cellsOf(
        startingFromCells({
          panels: [
            { id: "scenario", defaultCells: "content" },
            { id: "output" },
            { id: "code" },
          ],
          total: 47,
          measure: () => 7,
          defaultSize: [0, 30, 70],
          orientation: "vertical",
        }),
        47,
      ),
    ).toEqual([7, 12, 28]);
    // A long tree stops at its cap, half the split by default.
    expect(
      cellsOf(
        startingFromCells({
          panels: [{ id: "scenario", defaultCells: "content" }, { id: "rest" }],
          total: 40,
          measure: () => 90,
          orientation: "vertical",
        }),
        40,
      ),
    ).toEqual([20, 20]);
    // No panel naming a start in cells: none.
    expect(
      startingFromCells({
        panels: [{ id: "a" }, { id: "b" }],
        total: 40,
        measure: () => 0,
      }),
    ).toBeUndefined();
  });

  test("measuring a panel at its content leaves a scroller in it where it was", () => {
    const panel = document.createElement("div");
    const viewport = document.createElement("div");
    panel.append(viewport);
    viewport.scrollTop = 208;
    // Laid out at its own length, the scroller has nothing to scroll: the
    // browser drops its offset, as this stand-in does.
    panel.getBoundingClientRect = () => {
      viewport.scrollTop = 0;
      return { width: 0, height: 1600 } as DOMRect;
    };
    expect(measureContentCells([panel], "vertical", 16)).toBe(100);
    expect(viewport.scrollTop).toBe(208);
  });

  test("a standing start watches everything in its content and its styles, and lets it all go once it stops", () => {
    // jsdom has no resize observer: a stand-in records what is watched.
    const watched = new Set<Element>();
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      observe(element: Element) {
        watched.add(element);
      }
      unobserve(element: Element) {
        watched.delete(element);
      }
      disconnect() {
        watched.clear();
      }
    } as unknown as typeof ResizeObserver;
    try {
      const root = document.createElement("div");
      const cell = document.createElement("div");
      const frame = document.createElement("iframe");
      cell.append(frame);
      root.append(cell);
      let standing = true;
      let asked = 0;
      const release = holdCharacterGrid(
        root,
        () => [50, 50],
        () => {},
        undefined,
        "vertical",
        undefined,
        () => {
          asked += 1;
          return undefined;
        },
        () => (standing ? [cell] : []),
      );
      // The frame, deep in the cell, is watched with it.
      expect(watched.has(cell)).toBe(true);
      expect(watched.has(frame)).toBe(true);
      // A style that sets a size the cell's stretch hides asks for the start
      // again.
      const before = asked;
      cell.style.setProperty("--content", "37px");
      return Promise.resolve()
        .then(() => {
          expect(asked).toBeGreaterThan(before);
          // The start stops: the next hold lets the content go, the root
          // stays.
          standing = false;
          root.append(document.createElement("div"));
        })
        .then(() => {
          expect(watched.has(frame)).toBe(false);
          expect(watched.has(root)).toBe(true);
          release();
        });
    } finally {
      globalThis.ResizeObserver = original;
    }
  });

  test("a panel's content measures at its own length, a filling part in it at its content too, and is put back", () => {
    // jsdom lays nothing out: the panel reports the length of what the
    // measurement set, a picker row and a filling scroll area's 5 rows.
    const panel = document.createElement("div");
    panel.style.flex = "1 1 0%";
    const area = document.createElement("div");
    area.className = "CharcellScrollArea CharcellScrollArea--fill";
    panel.append(area);
    panel.getBoundingClientRect = () =>
      ({
        width: 0,
        height:
          panel.style.height === "max-content" &&
          area.style.flexBasis === "content"
            ? 96
            : 16,
      }) as DOMRect;
    expect(measureContentCells([panel], "vertical", 16)).toBe(6);
    expect(panel.style.flex).toBe("1 1 0%");
    expect(panel.style.height).toBe("");
    expect(area.style.flexBasis).toBe("");
  });

  test("a panel that joins at its content takes its content's cells from its neighbor", () => {
    const cellsOf = (sizes: number[], total: number) =>
      sizes.map((size) => Math.round((size / 100) * total * 1000) / 1000);
    const panels = [
      { id: "scenario", defaultCells: "content" as const, minimumCells: 3 },
      { id: "grid" },
    ];
    // Carried in at an even share of 39 rows; its content is 10 rows.
    const fitted = fitJoined({
      sizes: [50, 50],
      panels,
      joined: ["scenario"],
      total: 39,
      measure: () => 10,
      orientation: "vertical",
    });
    expect(cellsOf(fitted, 39)).toEqual([10, 29]);
    // Fitted again, it stays; with no content yet, it is left as it is.
    expect(
      fitJoined({
        sizes: fitted,
        panels,
        joined: ["scenario"],
        total: 39,
        measure: () => 10,
        orientation: "vertical",
      }),
    ).toEqual(fitted);
    expect(
      fitJoined({
        sizes: [50, 50],
        panels,
        joined: ["scenario"],
        total: 39,
        measure: () => 0,
        orientation: "vertical",
      }),
    ).toEqual([50, 50]);
  });
});
