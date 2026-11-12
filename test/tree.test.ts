// The Tree's keyboard: one tab stop and the ARIA tree pattern's keys.
// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { pressedTreeGroup } from "../src/scripts/disclosure";
import { TreeEngine, stepRow, typeAhead } from "../src/scripts/tree";

describe("tree keys", () => {
  test("up and down step a row, home and end go to the ends, both held at the edges", () => {
    expect(stepRow("ArrowDown", 1, 4)).toBe(2);
    expect(stepRow("ArrowDown", 3, 4)).toBe(3);
    expect(stepRow("ArrowUp", 0, 4)).toBe(0);
    expect(stepRow("Home", 2, 4)).toBe(0);
    expect(stepRow("End", 0, 4)).toBe(3);
    expect(stepRow("ArrowRight", 0, 4)).toBeUndefined();
  });

  test("typing finds the next label that starts with it, a repeated letter cycling", () => {
    const labels = [
      "highway 9",
      "corville",
      "old mine road",
      "the gorge",
      "melonweed",
      "mink ranch",
    ];
    expect(typeAhead(labels, 0, "m")).toBe(4);
    expect(typeAhead(labels, 4, "m")).toBe(5);
    expect(typeAhead(labels, 4, "mm")).toBe(5);
    expect(typeAhead(labels, 5, "m")).toBe(4);
    expect(typeAhead(labels, 4, "mi")).toBe(5);
    expect(typeAhead(labels, 0, "x")).toBeUndefined();
  });
});

describe("tree engine (jsdom)", () => {
  let engine: TreeEngine | undefined;
  afterEach(() => {
    engine?.destroy();
    document.body.innerHTML = "";
  });

  const mount = () => {
    document.body.innerHTML = `
      <div class="CharcellTree">
        <div class="CharcellTreeGroup">
          <div class="CharcellTreeGroup__summary" role="button" tabindex="0" aria-expanded="true">highway 9</div>
          <div class="CharcellTreeGroup__children">
            <button class="CharcellTreeItem">melonweed</button>
            <div class="CharcellTreeGroup">
              <div class="CharcellTreeGroup__summary" role="button" tabindex="0" aria-expanded="false">the factory</div>
              <div class="CharcellTreeGroup__children">
                <a class="CharcellTreeItem" href="#back-door" aria-current="location">back door</a>
              </div>
            </div>
            <button class="CharcellTreeItem">old mine road</button>
          </div>
        </div>
      </div>`;
    // The rows press as TreeGroup binds them.
    for (const summary of document.querySelectorAll<HTMLElement>(
      ".CharcellTreeGroup__summary",
    ))
      summary.addEventListener("click", (event) =>
        pressedTreeGroup(event, true, undefined, undefined),
      );
    const root = document.querySelector<HTMLElement>(".CharcellTree")!;
    engine = new TreeEngine(root);
    return root;
  };

  test("gives the tree its roles and one tab stop: the group row a folded current row is in", () => {
    const root = mount();
    expect(root.getAttribute("role")).toBe("tree");
    const rows = [...root.querySelectorAll<HTMLElement>("[role=treeitem]")];
    expect(rows.map((row) => row.textContent)).toEqual([
      "highway 9",
      "melonweed",
      "the factory",
      "back door",
      "old mine road",
    ]);
    expect(rows[2].getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelectorAll("[role=group]").length).toBe(2);
    // The current row is folded away: its group's row is the stop.
    expect(rows.filter((row) => row.tabIndex === 0)).toEqual([rows[2]]);
  });

  test("the arrow keys move focus through the rows that show", () => {
    const root = mount();
    const row = (label: string) =>
      [...root.querySelectorAll<HTMLElement>("[role=treeitem]")].find(
        (each) => each.textContent === label,
      )!;
    const press = (key: string) =>
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
    row("melonweed").focus();
    press("ArrowDown");
    expect(document.activeElement).toBe(row("the factory"));
    // The folded row is skipped.
    press("ArrowDown");
    expect(document.activeElement).toBe(row("old mine road"));
    press("ArrowLeft");
    expect(document.activeElement).toBe(row("highway 9"));
    expect(row("highway 9").tabIndex).toBe(0);
    expect(row("old mine road").tabIndex).toBe(-1);
  });

  test("right opens a closed group and goes into an open one; left closes it, then goes up", async () => {
    const root = mount();
    const row = (label: string) =>
      [...root.querySelectorAll<HTMLElement>("[role=treeitem]")].find(
        (each) => each.textContent === label,
      )!;
    const press = (key: string) =>
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
    row("the factory").focus();
    press("ArrowRight");
    expect(row("the factory").getAttribute("aria-expanded")).toBe("true");
    await settle();
    press("ArrowRight");
    expect(document.activeElement).toBe(row("back door"));
    press("ArrowLeft");
    expect(document.activeElement).toBe(row("the factory"));
    press("ArrowLeft");
    expect(row("the factory").getAttribute("aria-expanded")).toBe("false");
    await settle();
    press("ArrowDown");
    expect(document.activeElement).toBe(row("old mine road"));
  });
});
