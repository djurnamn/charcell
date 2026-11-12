<script setup lang="ts">
import { onBeforeUnmount, provide, useId, watch } from "vue";
import {
  sortableGroupContext,
  SortableGroupEngine,
  type SortableListTranslations,
  type SortableMove,
  type SortableSnap,
} from "charcell/scripts/sortable";

import SortableAnnouncements from "./parts/SortableAnnouncements.vue";

/**
 * `SortableGroup` (Vue) - the cross-target counterpart of the React driver
 * (see it for the contract): every `SortableList` inside it joins it, and a
 * move between any of them is reported once, as `onMove({ key, from, to })`.
 */
const props = defineProps<{
  onMove?: (move: SortableMove) => void;
  translations?: SortableListTranslations;
  snap?: SortableSnap;
}>();

const hintId = `${useId()}-hint`;
const engine = new SortableGroupEngine({ snap: props.snap });
engine.options = {
  ...engine.options,
  get onMove() {
    return props.onMove;
  },
  get translations() {
    return props.translations;
  },
};
// A drag moves as `snap` says, from the next drag on.
watch(
  () => props.snap,
  (snap) => engine.setSnap(snap),
);
provide(sortableGroupContext, { engine, hintId });
onBeforeUnmount(() => engine.destroy());
</script>

<template>
  <slot />
  <SortableAnnouncements :engine="engine" :hint-id="hintId" />
</template>
