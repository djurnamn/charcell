<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { TreeEngine } from "charcell/scripts/tree";

/**
 * `TreeDriver` (Vue) - pure behavior, the cross-target counterpart:
 * attaches charcell's `TreeEngine` to the root its scoped slot
 * (`<slot :tree>`) spreads `tree.rootProps` onto. See the React driver.
 */
const props = defineProps<{ rootProps?: Record<string, unknown> }>();

// The root's element, from the ref spread on it: the visual's own. Vue sets
// that ref before the root is in the document, so the engine attaches once
// this driver has mounted.
let element: HTMLElement | undefined;
let attached: HTMLElement | undefined;
let engine: TreeEngine | undefined;
let mounted = false;
const sync = () => {
  if (!mounted || element === attached) return;
  engine?.destroy();
  engine = undefined;
  attached = element;
  if (attached) engine = new TreeEngine(attached);
};
const attachRoot = (instance: unknown) => {
  const next =
    instance instanceof HTMLElement
      ? instance
      : (instance as { $el?: unknown } | null)?.$el;
  element = next instanceof HTMLElement ? next : undefined;
  sync();
};
// Running in the browser: the root's fallback for a failed page is off.
const scripted = ref(false);
onMounted(() => {
  mounted = true;
  sync();
  scripted.value = true;
});
onBeforeUnmount(() => engine?.destroy());

const tree = computed(() => ({
  rootProps: { ...props.rootProps, ref: attachRoot },
  scripted: scripted.value,
}));
</script>

<template>
  <slot :tree="tree" />
</template>
