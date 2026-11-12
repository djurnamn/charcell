// @vitest-environment jsdom
//
// The Vue Checkbox binds `indeterminate` as the input's property.
import { describe, expect, test } from "vitest";
import { createApp, h, nextTick, ref } from "vue";
import Checkbox from "../dist/vue/Checkbox.vue";

describe("Checkbox (Vue)", () => {
  test("indeterminate sets the property and follows the prop", async () => {
    const indeterminate = ref(true);
    const container = document.createElement("div");
    const application = createApp({
      render: () =>
        h(Checkbox, {
          label: "free the whole gang",
          indeterminate: indeterminate.value,
        }),
    });
    application.mount(container);
    const input = container.querySelector("input")!;
    expect(input.indeterminate).toBe(true);
    indeterminate.value = false;
    await nextTick();
    expect(input.indeterminate).toBe(false);
    application.unmount();
  });
});
