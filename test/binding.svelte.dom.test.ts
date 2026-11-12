// @vitest-environment jsdom
//
// svelte's bind: over the rendered svelte target: a component writes each
// Change back to the props it was mounted with, as a parent's bind: follows.
// svelte delegates its events from the document, so each target is in it.
import { afterEach, describe, expect, test } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import Checkbox from "../dist/svelte/Checkbox.svelte";
import Select from "../dist/svelte/Select.svelte";
import TextInput from "../dist/svelte/TextInput.svelte";
import Textarea from "../dist/svelte/Textarea.svelte";
import Toggle from "../dist/svelte/Toggle.svelte";

// jsdom lacks Element#scrollTo; the select machine scrolls its listbox.
Element.prototype.scrollTo ??= () => {};

// An open overlay's positioning watches the sizes of its trigger and panel;
// jsdom has no ResizeObserver to do it with.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mounted: ReturnType<typeof mount>[] = [];

afterEach(() => {
  for (const component of mounted.splice(0)) unmount(component);
  document.body.innerHTML = "";
});

const attached = () => document.body.appendChild(document.createElement("div"));

describe("bind: (Svelte)", () => {
  test("TextInput takes the bound text and writes back what is typed", () => {
    const changes: string[] = [];
    const props = $state({
      value: "ben",
      onValueChange: (value: string) => changes.push(value),
    });
    const target = attached();
    mounted.push(mount(TextInput, { target, props }));
    const input = target.querySelector("input")!;
    expect(input.value).toBe("ben");
    input.value = "maureen";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flushSync();
    expect(props.value).toBe("maureen");
    expect(changes).toEqual(["maureen"]);
  });

  test("TextInput and Textarea start from defaultValue and keep what is typed", () => {
    const target = attached();
    mounted.push(mount(TextInput, { target, props: { defaultValue: "ben" } }));
    mounted.push(
      mount(Textarea, { target, props: { defaultValue: "maureen" } }),
    );
    const input = target.querySelector("input")!;
    const textarea = target.querySelector("textarea")!;
    expect([input.value, textarea.value]).toEqual(["ben", "maureen"]);
    input.value = "father torque";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flushSync();
    expect(input.value).toBe("father torque");
  });

  test("Checkbox and Toggle write back their new state", () => {
    const checkbox = $state({ label: "boost", checked: false });
    const toggle = $state({ label: "locked", pressed: false });
    const target = attached();
    mounted.push(mount(Checkbox, { target, props: checkbox }));
    mounted.push(mount(Toggle, { target, props: toggle }));
    const [checkboxInput, toggleInput] = target.querySelectorAll("input");
    checkboxInput.click();
    toggleInput.click();
    flushSync();
    expect([checkbox.checked, toggle.pressed]).toEqual([true, true]);
    expect([checkboxInput.checked, toggleInput.checked]).toEqual([true, true]);
  });

  test("Select starts with nothing bound and writes back the item chosen", async () => {
    const props = $state<{
      items: { value: string; label: string }[];
      value?: string;
    }>({
      items: [
        { value: "ben", label: "ben" },
        { value: "maureen", label: "maureen" },
      ],
      value: undefined,
    });
    const target = attached();
    mounted.push(mount(Select, { target, props }));
    // The machine starts in an effect.
    flushSync();
    // Zag reads the pointer's type and button.
    const pointer = { bubbles: true, button: 0, pointerType: "mouse" };
    const settle = async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      flushSync();
    };
    // The trigger opens on its click; an item is chosen on the release.
    const trigger = target.querySelector<HTMLElement>(
      ".CharcellSelectTrigger",
    )!;
    trigger.dispatchEvent(new PointerEvent("pointerdown", pointer));
    trigger.click();
    await settle();
    const option = [
      ...document.querySelectorAll(".CharcellSelectListbox__item"),
    ].find((item) => item.textContent?.includes("maureen"))!;
    option.dispatchEvent(new PointerEvent("pointermove", pointer));
    option.dispatchEvent(new PointerEvent("pointerup", pointer));
    (option as HTMLElement).click();
    await settle();
    expect(props.value).toBe("maureen");
  });
});
