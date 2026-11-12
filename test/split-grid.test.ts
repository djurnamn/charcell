// The SplitGrid's layout arithmetic, shared by the three drivers.
import { describe, expect, test } from "vitest";
import { centeredGrip, trackCells } from "../src/scripts/split-grid";

describe("split grid", () => {
  test("one grip sits at its handle's middle, clear of the handles crossing it", () => {
    // Three panes of 10: 32 cells, crossings at 10 and 21; the middle is
    // clear.
    expect(centeredGrip([10, 10, 10], 2)).toBe(15);
    // Four panes of 10: 43 cells, the middle (20, 21) covers the crossing
    // at 21, so the grip moves a cell towards the start.
    expect(centeredGrip([10, 10, 10, 10], 2)).toBe(19);
    // A one-cell grip down a column's handle, rows of 5 and 5: the middle
    // row is the crossing, so it takes the row before.
    expect(centeredGrip([5, 5], 1)).toBe(4);
    // One pane: its own middle.
    expect(centeredGrip([12], 2)).toBe(5);
    // Sizes not known yet: none.
    expect(centeredGrip([], 2)).toBeUndefined();
  });

  test("a track's cells come from its sizes and the percent one cell takes", () => {
    expect(trackCells([25, 75], 2.5)).toEqual([10, 30]);
    expect(trackCells([25, 75], undefined)).toEqual([]);
  });
});
