// @vitest-environment jsdom
//
// The Svelte Checkbox binds `indeterminate` as the input's property.
import { describe, expect, test } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import Checkbox from "../dist/svelte/Checkbox.svelte";

describe("Checkbox (Svelte)", () => {
  test("indeterminate sets the property and follows the prop", () => {
    const props = $state({ label: "free the whole gang", indeterminate: true });
    const target = document.createElement("div");
    const component = mount(Checkbox, { target, props });
    const input = target.querySelector("input")!;
    expect(input.indeterminate).toBe(true);
    props.indeterminate = false;
    flushSync();
    expect(input.indeterminate).toBe(false);
    unmount(component);
  });
});
