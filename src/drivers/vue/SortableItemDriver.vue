<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide } from "vue";
import {
  sortableAncestorsContext,
  type SortableGroupEngine,
  type SortableGroupSnapshot,
} from "charcell/scripts/sortable";

/**
 * `SortableItemDriver` (Vue) - one item's place in the drag, handed to the
 * default scoped slot (`{ row }`): the engine's sortable on the row (from the
 * ref `row.attach` spreads on it), its activator on the grip, and the item's
 * key added to the keys the lists inside it sit in.
 */
const props = defineProps<{
  list: {
    keys: string[];
    engine: SortableGroupEngine;
    hintId: string;
    ancestors: string[];
    snapshot: SortableGroupSnapshot;
    marker: number | null;
  };
  index: number;
}>();

const engine = props.list.engine;
// A row keeps its key: the list renders each item's row under it.
const itemKey = props.list.keys[props.index]!;
const gripId = `${props.list.hintId}-grip-${itemKey}`;

provide(sortableAncestorsContext, [...props.list.ancestors, itemKey]);

// The row's element, from the ref spread on it. Vue sets that ref before the
// row is in the document, where its grip cannot be found yet, so the row is
// attached once this driver has mounted.
let element: HTMLElement | undefined;
let attached: HTMLElement | undefined;
let mounted = false;
let detach: (() => void) | undefined;
const sync = () => {
  if (!mounted || element === attached) return;
  detach?.();
  detach = undefined;
  attached = element;
  if (attached) detach = engine.attachRow(itemKey, attached, gripId);
};
const attachRow = (instance: unknown) => {
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
onBeforeUnmount(() => detach?.());

const row = computed(() => {
  const picked = props.list.snapshot.picked === itemKey;
  const dragging = props.list.snapshot.active === itemKey;
  const actions = engine.gripActions(itemKey);
  // The grip's props: the row's own grip takes them, or the item's (with the
  // class that gives it the grip's look and states).
  const rowGripProps = {
    id: gripId,
    "aria-label": engine.gripLabel(itemKey),
    "aria-describedby": props.list.hintId,
    "aria-pressed": String(picked),
    onClick: actions.click,
    onKeydown: actions.keydown,
  };
  return {
    attach: { ref: attachRow },
    engaged: picked || dragging,
    dragging,
    picked,
    // The marker of a drag from another list stands before this row.
    markerBefore: props.list.marker === props.index,
    rowGripProps,
    gripProps: {
      ...rowGripProps,
      type: "button",
      class:
        "CharcellSortableList__grip" +
        (picked || dragging ? " CharcellSortableList__grip--engaged" : ""),
    },
  };
});
</script>

<template>
  <slot :row="row" />
</template>
