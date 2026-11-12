<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from "vue";
import type { SortableGroupEngine } from "charcell/scripts/sortable";

/**
 * A sortable group's grip description, read on focus, and its polite live
 * region - mounted empty and filled afterwards, since a region injected with
 * its text announces nothing. A component of its own, so a group re-renders
 * none of its lists to announce a move.
 */
const props = defineProps<{ engine: SortableGroupEngine; hintId: string }>();

const snapshot = shallowRef(props.engine.getSnapshot());
const unsubscribe = props.engine.subscribe(
  () => (snapshot.value = props.engine.getSnapshot()),
);
onBeforeUnmount(unsubscribe);
</script>

<template>
  <span :id="hintId" class="CharcellSortableList__announcement">{{
    engine.labels.reorderHintMessage
  }}</span>
  <span
    class="CharcellSortableList__announcement"
    role="status"
    aria-live="polite"
    >{{ snapshot.announcement }}</span
  >
</template>
