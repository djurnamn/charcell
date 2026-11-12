<script lang="ts" generics="Item">
  import { getContext, onDestroy, untrack, type Snippet } from "svelte";
  import { createAttachmentKey } from "svelte/attachments";
  import {
    sortableAncestorsContext,
    sortableGroupContext,
    SortableGroupEngine,
    type SortableGroupSnapshot,
    type SortableListTranslations,
    type SortableSnap,
  } from "charcell/scripts/sortable";

  /**
   * `SortableListDriver` (Svelte) - the cross-target counterpart of the React
   * driver (see it for the contract): a sortable list's behavior, handed to
   * the `children` snippet (`{ list }`), from which the generated
   * `SortableList` renders the rows. It reports `onItemsChange(items)` after every
   * move that touches it, and inside a `SortableGroup` it is one of the
   * group's lists, named by `id`.
   */
  let {
    items,
    onItemsChange = undefined,
    id = undefined,
    getKey = undefined,
    getLabel = undefined,
    translations = undefined,
    snap = undefined,
    rootProps = undefined,
    children,
  }: {
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
    children: Snippet<
      [
        {
          list: {
            items: Item[];
            keys: string[];
            empty: boolean;
            emptyState: "idle" | "picked" | "dragging" | null;
            marker: number | null;
            markerAtEnd: boolean;
            placeProps: { type: "button"; class: string; onclick: () => void };
            placeInto: () => void;
            labels: SortableGroupEngine["labels"];
            rootProps: Record<string | symbol, unknown>;
            engine: SortableGroupEngine;
            hintId: string;
            ancestors: string[];
            snapshot: SortableGroupSnapshot;
          };
        },
      ]
    >;
  } = $props();

  const group = getContext<
    { engine: SortableGroupEngine; hintId: string } | undefined
  >(sortableGroupContext);
  const ancestors =
    getContext<string[] | undefined>(sortableAncestorsContext) ?? [];
  const standalone = !group;

  // One id per component: the list's own, and its hint's beside it.
  const componentId = $props.id();
  const ownHintId = `${componentId}-hint`;
  // On its own: a group of one.
  const engine =
    group?.engine ??
    new SortableGroupEngine({
      snap: untrack(() => snap),
      get translations() {
        return translations;
      },
    });
  const hintId = group?.hintId ?? ownHintId;
  // On its own, a drag moves as `snap` says, from the next drag on.
  $effect(() => {
    if (standalone) engine.setSnap(snap);
  });
  const listId = untrack(() => id) ?? componentId;

  // The list's own copy of its items, synced whenever they change, so a move
  // shows whether or not the consumer feeds it back. A list moving with its
  // item mounts again: it keeps its moves.
  let order = $state<Item[]>(untrack(() => engine.kept(listId, items)));
  // Synced when `items` is another array, not whenever the parent renders.
  let seen = untrack(() => items);
  $effect.pre(() => {
    const next = items;
    if (next === seen) return;
    seen = next;
    untrack(() => (order = next));
  });

  const keys = $derived(
    engine.list(listId, order, {
      getKey: getKey as ((item: unknown, index: number) => string) | undefined,
      getLabel: getLabel as
        ((item: unknown, index: number) => string) | undefined,
      ancestors,
      given: seen,
      onItems: (next) => {
        order = next as Item[];
        onItemsChange?.(next as Item[]);
      },
    }),
  );
  let snapshot = $state(engine.getSnapshot());
  $effect(() => engine.subscribe(() => (snapshot = engine.getSnapshot())));
  // Each shown key with its item, from whichever list holds it; read from the
  // snapshot and the items, so a move and an edited item both render.
  const rows = $derived.by(() => {
    void snapshot;
    void order;
    return engine.rowsOf(listId, keys) as { key: string; item: Item }[];
  });

  // The root's element, through the attachment spread on it.
  const attachKey = createAttachmentKey();
  const attachRoot = (element: Element) => engine.attachList(listId, element);
  const placeInto = () => engine.placeInto(listId);
  const list = $derived.by(() => {
    const empty = rows.length === 0;
    const marker =
      snapshot.marker?.list === listId ? snapshot.marker.index : null;
    return {
      items: rows.map((row) => row.item),
      keys: rows.map((row) => row.key),
      empty,
      emptyState: empty ? engine.emptyState(listId) : null,
      // Where a drag from another list would land in this one: the index of
      // the row the marker stands before, or past the last.
      marker,
      markerAtEnd: marker !== null && marker >= rows.length,
      placeProps: {
        type: "button" as const,
        class: "CharcellSortableList__place",
        onclick: placeInto,
      },
      placeInto,
      labels: engine.labels,
      rootProps: { ...rootProps, [attachKey]: attachRoot },
      engine,
      hintId,
      ancestors,
      snapshot,
    };
  });

  // The drag engine's indexes follow every render's order.
  $effect(() => {
    void rows;
    engine.refresh();
  });
  onDestroy(() => {
    if (standalone) engine.destroy();
  });
</script>

<!-- No space between the parts, as the other targets write none: the grip's
     description, read on focus, then the live region, mounted empty and
     filled afterwards. -->
{@render children({ list })}{#if standalone}<span
    id={hintId}
    class="CharcellSortableList__announcement"
    >{engine.labels.reorderHintMessage}</span
  ><span
    class="CharcellSortableList__announcement"
    role="status"
    aria-live="polite">{snapshot.announcement}</span
  >{/if}
