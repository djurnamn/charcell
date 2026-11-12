// The sortable engine without a dom: the moves a grip's click, its arrow keys
// and an empty list's button make, between lists nested in each other's
// items. The drag itself is dnd-kit's, driven in the browser.
import { describe, expect, test, vi } from "vitest";
import {
  applySortableMove,
  SortableGroupEngine,
} from "../src/scripts/sortable";

const press = (key: string) =>
  ({ key, preventDefault() {} }) as unknown as KeyboardEvent;

// plan: templates[button frame] release[]
const setup = () => {
  const onMove = vi.fn();
  const engine = new SortableGroupEngine({ onMove });
  const lists: Record<string, { name: string }[]> = {
    plan: [{ name: "templates" }, { name: "release" }],
    templates: [{ name: "button" }, { name: "frame" }],
    release: [],
  };
  const onItems: Record<string, ReturnType<typeof vi.fn>> = {};
  const register = () => {
    for (const [id, items] of Object.entries(lists)) {
      onItems[id] = vi.fn((next) => (lists[id] = next));
      engine.list(id, items, {
        getKey: (item) => (item as { name: string }).name,
        ancestors: id === "plan" ? [] : [id],
        onItems: onItems[id],
      });
    }
  };
  register();
  return { engine, onMove, lists, onItems };
};

describe("applySortableMove", () => {
  test("moves within a list and between lists, and refuses what is out of range", () => {
    const lists = { a: [1, 2, 3], b: [4] };
    expect(
      applySortableMove(lists, {
        key: "1",
        from: { list: "a", index: 0 },
        to: { list: "a", index: 2 },
      }),
    ).toEqual({ a: [2, 3, 1], b: [4] });
    expect(
      applySortableMove(lists, {
        key: "2",
        from: { list: "a", index: 1 },
        to: { list: "b", index: 0 },
      }),
    ).toEqual({ a: [1, 3], b: [2, 4] });
    expect(
      applySortableMove(lists, {
        key: "9",
        from: { list: "a", index: 7 },
        to: { list: "b", index: 0 },
      }),
    ).toBe(lists);
  });
});

describe("SortableGroupEngine", () => {
  test("a click picks an item up, a click on a grip in another list places it there", () => {
    const { engine, onMove, lists, onItems } = setup();
    engine.gripActions("frame").click();
    expect(engine.getSnapshot().picked).toBe("frame");
    expect(engine.getSnapshot().announcement).toContain(
      "item 2 picked up, item 2 of 2",
    );
    engine.gripActions("templates").click();
    expect(onMove).toHaveBeenCalledWith({
      key: "frame",
      from: { list: "templates", index: 1 },
      to: { list: "plan", index: 0 },
    });
    expect(lists.plan.map((item) => item.name)).toEqual([
      "frame",
      "templates",
      "release",
    ]);
    expect(lists.templates.map((item) => item.name)).toEqual(["button"]);
    expect(onItems.release).not.toHaveBeenCalled();
    expect(engine.getSnapshot().picked).toBeNull();
  });

  test("an empty list takes a picked item through its place button", () => {
    const { engine, onMove, lists } = setup();
    engine.gripActions("button").click();
    engine.placeInto("release");
    expect(onMove).toHaveBeenCalledWith({
      key: "button",
      from: { list: "templates", index: 0 },
      to: { list: "release", index: 0 },
    });
    expect(lists.release.map((item) => item.name)).toEqual(["button"]);
  });

  test("an item is named in its grip and in everything said about it, and escape puts it back", () => {
    const engine = new SortableGroupEngine();
    const items = [{ from: "maureen" }, { from: "ben" }, { from: "nestor" }];
    const keys = engine.list("polecats", items, {
      getLabel: (item) => (item as { from: string }).from,
    });
    expect(keys.map((key) => engine.gripLabel(key))).toEqual([
      "reorder maureen",
      "reorder ben",
      "reorder nestor",
    ]);
    engine.gripActions(keys[1]!).click();
    expect(engine.getSnapshot().announcement).toMatch(
      /^ben picked up, item 2 of 3/,
    );
    // What escape, or a press outside the group, does.
    engine.release();
    expect(engine.getSnapshot().picked).toBeNull();
    expect(engine.getSnapshot().announcement).toBe(
      "ben put back where it was, item 2 of 3",
    );
    engine.gripActions(keys[0]!).keydown(press("ArrowDown"));
    expect(engine.getSnapshot().announcement).toBe(
      "moved maureen to position 2 of 3",
    );
    // Without a getLabel a string names itself and anything else its place.
    const plain = new SortableGroupEngine();
    const [first] = plain.list("plain", ["alpha"]);
    expect(plain.gripLabel(first!)).toBe("reorder alpha");
    const [object] = plain.list("objects", [{}]);
    expect(plain.gripLabel(object!)).toBe("reorder item 1");
  });

  test("nothing moves into a list inside the moving item", () => {
    const { engine, onMove } = setup();
    engine.gripActions("templates").click();
    expect(engine.isListDisabled("templates")).toBe(true);
    expect(engine.isListDisabled("release")).toBe(false);
    engine.gripActions("button").click();
    expect(onMove).not.toHaveBeenCalled();
  });

  test("the arrow keys step an item within its list, and hold at the ends", () => {
    const { engine, onMove, lists } = setup();
    engine.gripActions("button").keydown(press("ArrowDown"));
    expect(lists.templates.map((item) => item.name)).toEqual([
      "frame",
      "button",
    ]);
    expect(engine.getSnapshot().announcement).toBe(
      "moved item 1 to position 2 of 2",
    );
    engine.gripActions("button").keydown(press("ArrowDown"));
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  test("without getKey the engine keeps the keys, and they travel with the item", () => {
    const engine = new SortableGroupEngine();
    const keys = engine.list("a", ["x", "y"]);
    expect(engine.list("b", [])).toEqual([]);
    engine.gripActions(keys[1]).click();
    engine.placeInto("b");
    expect(engine.list("b", ["y"])).toEqual([keys[1]]);
    expect(engine.list("a", ["x"])).toEqual([keys[0]]);
  });

  test("without getKey each list counts its own keys, whatever order the lists render in", () => {
    const first = new SortableGroupEngine();
    expect(first.list("a", ["x", "y"])).toEqual([
      "charcell-sortable-a-0",
      "charcell-sortable-a-1",
    ]);
    expect(first.list("b", ["z"])).toEqual(["charcell-sortable-b-0"]);
    const second = new SortableGroupEngine();
    expect(second.list("b", ["z"])).toEqual(["charcell-sortable-b-0"]);
    expect(second.list("a", ["x", "y"])).toEqual([
      "charcell-sortable-a-0",
      "charcell-sortable-a-1",
    ]);
    // A list never repeats a key an item it gave away still holds.
    second.gripActions("charcell-sortable-a-1").click();
    second.placeInto("b");
    expect(second.list("a", ["x", "w"])).toEqual([
      "charcell-sortable-a-0",
      "charcell-sortable-a-2",
    ]);
  });

  test("an empty list offers a place while an item is picked up, unless it sits inside it", () => {
    const { engine } = setup();
    expect(engine.emptyState("release")).toBe("idle");
    engine.gripActions("button").click();
    expect(engine.emptyState("release")).toBe("picked");
    engine.release();
    engine.gripActions("release").click();
    expect(engine.emptyState("release")).toBe("idle");
  });

  test("a list mounting again with the items it was given keeps its moves", () => {
    const engine = new SortableGroupEngine();
    const given = [{ name: "shirts" }];
    const getKey = (item: unknown) => (item as { name: string }).name;
    engine.list("value-packs", given, { getKey, given });
    engine.list("the stand", [{ name: "bunnies" }], { getKey });
    engine.gripActions("shirts").click();
    engine.placeInto("the stand");
    expect(engine.kept("value-packs", given)).toEqual([]);
    // Other items are the consumer's own: the list starts from them.
    const fresh = [{ name: "flags" }];
    expect(engine.kept("value-packs", fresh)).toBe(fresh);
    expect(engine.kept("unseen", fresh)).toBe(fresh);
  });
});
