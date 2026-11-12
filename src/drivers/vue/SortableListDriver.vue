<script setup lang="ts" generic="Item">
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  shallowRef,
  useId,
  watch,
} from "vue";
import {
  sortableAncestorsContext,
  sortableGroupContext,
  SortableGroupEngine,
  type SortableListTranslations,
  type SortableSnap,
} from "charcell/scripts/sortable";

import SortableAnnouncements from "./parts/SortableAnnouncements.vue";

/**
 * `SortableListDriver` (Vue) - the cross-target counterpart of the React
 * driver (see it for the contract): a sortable list's behavior, handed to the
 * default scoped slot (`{ list }`), from which the generated `SortableList`
 * renders the rows. It reports `onItemsChange(items)` after every move that
 * touches it, and inside a `SortableGroup` it is one of the group's lists,
 * named by `id`.
 */
const props = defineProps<{
  items: Item[];
  onItemsChange?: (items: Item[]) => void;
  id?: string;
  getKey?: (item: Item, index: number) => string;
  /** The item's name, for its grip and what the list says about it; a
   *  string or number item names itself, any other its position. */
  getLabel?: (item: Item, index: number) => string;
  translations?: SortableListTranslations;
  snap?: SortableSnap;
  /** The consumer's attributes for the list's root. */
  rootProps?: Record<string, unknown>;
}>();

const group = inject<{ engine: SortableGroupEngine; hintId: string } | null>(
  sortableGroupContext,
  null,
);
const ancestors = inject<string[]>(sortableAncestorsContext, []);
const standalone = group === null;

const ownHintId = `${useId()}-hint`;
// On its own: a group of one.
const engine =
  group?.engine ??
  new SortableGroupEngine({
    snap: props.snap,
    get translations() {
      return props.translations;
    },
  });
const hintId = group?.hintId ?? ownHintId;
// On its own, a drag moves as `snap` says, from the next drag on.
if (standalone)
  watch(
    () => props.snap,
    (snap) => engine.setSnap(snap),
  );

const automaticId = useId();
const listId = props.id ?? automaticId;
// The list's own copy of its items, synced whenever they change, so a move
// shows whether or not the consumer feeds it back. A list moving with its
// item mounts again: it keeps its moves.
const order = ref(engine.kept(listId, props.items)) as { value: Item[] };
watch(
  () => props.items,
  (items) => (order.value = items),
);
const keys = computed(() =>
  engine.list(listId, order.value, {
    getKey: props.getKey as
      ((item: unknown, index: number) => string) | undefined,
    getLabel: props.getLabel as
      ((item: unknown, index: number) => string) | undefined,
    ancestors,
    given: props.items,
    onItems: (next) => {
      order.value = next as Item[];
      props.onItemsChange?.(next as Item[]);
    },
  }),
);

const snapshot = shallowRef(engine.getSnapshot());
const unsubscribe = engine.subscribe(
  () => (snapshot.value = engine.getSnapshot()),
);
// Each shown key with its item, from whichever list holds it; read from the
// snapshot and the items, so a move and an edited item both render.
const rows = computed(() => {
  void snapshot.value;
  return engine.rowsOf(listId, keys.value) as { key: string; item: Item }[];
});

// The root's element, from the ref spread on it: the list visual's own. Vue
// sets that ref before the list is in the document, so the list is attached
// once this driver has mounted.
let element: Element | undefined;
let attached: Element | undefined;
let mounted = false;
let detach: (() => void) | undefined;
const sync = () => {
  if (!mounted || element === attached) return;
  detach?.();
  detach = undefined;
  attached = element;
  if (attached) detach = engine.attachList(listId, attached);
};
const attachRoot = (instance: unknown) => {
  const next =
    instance instanceof Element
      ? instance
      : (instance as { $el?: unknown } | null)?.$el;
  element = next instanceof Element ? next : undefined;
  sync();
};
const placeInto = () => engine.placeInto(listId);
const list = computed(() => {
  const shown = rows.value;
  const empty = shown.length === 0;
  const marker =
    snapshot.value.marker?.list === listId ? snapshot.value.marker.index : null;
  return {
    items: shown.map((row) => row.item),
    keys: shown.map((row) => row.key),
    empty,
    emptyState: empty ? engine.emptyState(listId) : null,
    // Where a drag from another list would land in this one: the index of
    // the row the marker stands before, or past the last.
    marker,
    markerAtEnd: marker !== null && marker >= shown.length,
    placeProps: {
      type: "button" as const,
      class: "CharcellSortableList__place",
      onClick: placeInto,
    },
    placeInto,
    labels: engine.labels,
    rootProps: { ...props.rootProps, ref: attachRoot },
    engine,
    hintId,
    ancestors,
    snapshot: snapshot.value,
  };
});

onMounted(() => {
  mounted = true;
  sync();
  engine.refresh();
});
// The drag engine's indexes follow every render's order.
onUpdated(() => engine.refresh());
onBeforeUnmount(() => {
  detach?.();
  unsubscribe();
  if (standalone) engine.destroy();
});
</script>

<template>
  <slot :list="list" />
  <SortableAnnouncements v-if="standalone" :engine="engine" :hint-id="hintId" />
</template>
