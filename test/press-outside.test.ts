// An overlay closing at an outside press, before the press lands.
// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { closingOnPressOutside } from "@scaffold-ui-kit/helpers/zag";

describe("closing on a press outside", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("closes before the press lands, keeps focus with what takes it, and leaves its own parts and other overlays alone", () => {
    document.body.innerHTML = `
      <button id="trigger">options</button>
      <div id="content"><span id="inside">wrap</span></div>
      <div data-part="content"><span id="nested">no wrap</span></div>
      <button id="elsewhere">scenario</button>
      <p id="page">text</p>`;
    const closed: boolean[] = [];
    let landed: boolean | undefined;
    document
      .getElementById("elsewhere")!
      .addEventListener("pointerdown", () => {
        // The overlay closed before the press reached its target.
        landed = closed.length > 0;
      });
    const release = closingOnPressOutside(
      () => [
        document.getElementById("trigger"),
        document.getElementById("content"),
      ],
      (restoreFocus) => closed.push(restoreFocus),
    );
    const press = (id: string) =>
      document
        .getElementById(id)!
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    press("trigger");
    press("inside");
    press("nested");
    expect(closed).toEqual([]);
    press("elsewhere");
    expect(landed).toBe(true);
    // A button takes focus itself; text does not, so focus goes back.
    press("page");
    expect(closed).toEqual([false, true]);
    release();
    press("page");
    expect(closed).toHaveLength(2);
  });
});
