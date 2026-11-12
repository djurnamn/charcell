// @vitest-environment jsdom
//
// Vue's v-model over the rendered Vue target: the value goes in, each change
// comes back out, and a held control the parent does not change stays put.
import { afterEach, describe, expect, test } from "vitest";
import { createApp, h, nextTick, ref, type App } from "vue";
import Checkbox from "../dist/vue/Checkbox.vue";
import RadioGroup from "../dist/vue/RadioGroup.vue";
import TextInput from "../dist/vue/TextInput.vue";
import Textarea from "../dist/vue/Textarea.vue";
import Toggle from "../dist/vue/Toggle.vue";

// An open overlay's positioning watches the sizes of its trigger and panel;
// jsdom has no ResizeObserver to do it with.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

let application: App | null = null;

function mount(render: () => unknown): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  application = createApp({ render });
  application.mount(container);
  return container;
}

afterEach(() => {
  application?.unmount();
  application = null;
  document.body.innerHTML = "";
});

describe("v-model (Vue)", () => {
  test("TextInput takes the bound text and hands back what is typed", async () => {
    const rider = ref("ben");
    const container = mount(() =>
      h(TextInput, {
        modelValue: rider.value,
        "onUpdate:modelValue": (value: string) => (rider.value = value),
      }),
    );
    const input = container.querySelector("input")!;
    expect(input.value).toBe("ben");
    input.value = "maureen";
    input.dispatchEvent(new Event("input"));
    await nextTick();
    expect(rider.value).toBe("maureen");
  });

  test("TextInput and Textarea start from defaultValue and keep what is typed", async () => {
    const container = mount(() => [
      h(TextInput, { defaultValue: "ben" }),
      h(Textarea, { defaultValue: "maureen" }),
    ]);
    const input = container.querySelector("input")!;
    const textarea = container.querySelector("textarea")!;
    expect([input.value, textarea.value]).toEqual(["ben", "maureen"]);
    input.value = "father torque";
    input.dispatchEvent(new Event("input"));
    await nextTick();
    expect(input.value).toBe("father torque");
  });

  test("Checkbox, Toggle and RadioGroup hand back their new value", async () => {
    const boosting = ref(false);
    const locked = ref(false);
    const kick = ref("door");
    const container = mount(() => [
      h(Checkbox, {
        label: "boost",
        modelValue: boosting.value,
        "onUpdate:modelValue": (value: boolean) => (boosting.value = value),
      }),
      h(Toggle, {
        label: "locked",
        modelValue: locked.value,
        "onUpdate:modelValue": (value: boolean) => (locked.value = value),
      }),
      h(RadioGroup, {
        name: "kick",
        items: [
          { value: "door", label: "door" },
          { value: "drawer", label: "drawer" },
        ],
        modelValue: kick.value,
        "onUpdate:modelValue": (value: string) => (kick.value = value),
      }),
    ]);
    const [checkbox, toggle, door, drawer] =
      container.querySelectorAll("input");
    checkbox.click();
    toggle.click();
    drawer.click();
    await nextTick();
    expect([boosting.value, locked.value, kick.value]).toEqual([
      true,
      true,
      "drawer",
    ]);
    expect([
      checkbox.checked,
      toggle.checked,
      door.checked,
      drawer.checked,
    ]).toEqual([true, true, false, true]);
  });

  test("a held control the parent refuses to change stays as given", async () => {
    const container = mount(() => [
      h(Checkbox, { label: "boost", checked: false }),
      h(Toggle, { label: "locked", pressed: false }),
      h(RadioGroup, {
        name: "kick",
        items: [
          { value: "door", label: "door" },
          { value: "drawer", label: "drawer" },
        ],
        value: "door",
      }),
    ]);
    const [checkbox, toggle, door, drawer] =
      container.querySelectorAll("input");
    checkbox.click();
    toggle.click();
    drawer.click();
    await nextTick();
    expect([
      checkbox.checked,
      toggle.checked,
      door.checked,
      drawer.checked,
    ]).toEqual([false, false, true, false]);
  });
});
