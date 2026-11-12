<script lang="ts">
  import { onDestroy, setContext, untrack, type Snippet } from "svelte";
  import {
    sortableGroupContext,
    SortableGroupEngine,
    type SortableListTranslations,
    type SortableMove,
    type SortableSnap,
  } from "charcell/scripts/sortable";

  /**
   * `SortableGroup` (Svelte) - the cross-target counterpart of the React
   * driver (see it for the contract): every `SortableList` inside it joins
   * it, and a move between any of them is reported once, as
   * `onMove({ key, from, to })`.
   */
  let {
    onMove = undefined,
    translations = undefined,
    snap = undefined,
    children,
  }: {
    onMove?: (move: SortableMove) => void;
    translations?: SortableListTranslations;
    snap?: SortableSnap;
    children?: Snippet;
  } = $props();

  const componentId = $props.id();
  const hintId = `${componentId}-hint`;
  const engine = new SortableGroupEngine({
    snap: untrack(() => snap),
    get onMove() {
      return onMove;
    },
    get translations() {
      return translations;
    },
  });
  // A drag moves as `snap` says, from the next drag on.
  $effect(() => engine.setSnap(snap));
  setContext(sortableGroupContext, { engine, hintId });

  let snapshot = $state(engine.getSnapshot());
  $effect(() => engine.subscribe(() => (snapshot = engine.getSnapshot())));
  onDestroy(() => engine.destroy());
</script>

<!-- No space between the parts, as the other targets write none: the grips'
     description, read on focus, then the live region, mounted empty and
     filled afterwards. -->
{@render children?.()}<span
  id={hintId}
  class="CharcellSortableList__announcement"
  >{engine.labels.reorderHintMessage}</span
><span
  class="CharcellSortableList__announcement"
  role="status"
  aria-live="polite">{snapshot.announcement}</span
>
