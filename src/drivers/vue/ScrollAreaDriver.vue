<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import {
  ScrollAreaEngine,
  type ScrollAreaOrientation,
} from "charcell/scripts/scroll-area";

/**
 * `ScrollAreaDriver` (Vue) - pure behavior, the cross-target counterpart:
 * attaches charcell's `ScrollAreaEngine` to the root its scoped slot
 * (`<slot :area>`) spreads `area.rootProps` onto. See the React driver.
 */
const props = withDefaults(
  defineProps<{
    scrolling?: "stepped" | "fluid";
    orientation?: ScrollAreaOrientation;
    rootProps?: Record<string, unknown>;
  }>(),
  { scrolling: "stepped", orientation: "vertical" },
);

const options = () => ({
  stepped: props.scrolling !== "fluid",
  orientation: props.orientation,
});

// The root's element, from the ref spread on it: the visual's own. Vue sets
// that ref before the root is in the document, so the engine attaches once
// this driver has mounted.
let element: HTMLElement | undefined;
let attached: HTMLElement | undefined;
let engine: ScrollAreaEngine | undefined;
let mounted = false;
const sync = () => {
  if (!mounted || element === attached) return;
  engine?.destroy();
  engine = undefined;
  attached = element;
  if (attached) engine = new ScrollAreaEngine(attached, options());
};
const attachRoot = (instance: unknown) => {
  const next =
    instance instanceof HTMLElement
      ? instance
      : (instance as { $el?: unknown } | null)?.$el;
  element = next instanceof HTMLElement ? next : undefined;
  sync();
};
onMounted(() => {
  mounted = true;
  sync();
});
onBeforeUnmount(() => engine?.destroy());
watch([() => props.scrolling, () => props.orientation], () =>
  engine?.update(options()),
);

const area = computed(() => ({
  rootProps: { ...props.rootProps, ref: attachRoot },
}));
</script>

<template>
  <slot :area="area" />
</template>
