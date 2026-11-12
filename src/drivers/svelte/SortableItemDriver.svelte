<script lang="ts">
  import { setContext, type Snippet } from "svelte";
  import { createAttachmentKey } from "svelte/attachments";
  import {
    sortableAncestorsContext,
    type SortableGroupEngine,
    type SortableGroupSnapshot,
  } from "charcell/scripts/sortable";

  /**
   * `SortableItemDriver` (Svelte) - one item's place in the drag, handed to
   * the `children` snippet (`{ row }`): the engine's sortable on the row
   * (through the attachment `row.attach` spreads on it), its activator on the
   * grip, and the item's key added to the keys the lists inside it sit in.
   */
  let {
    list,
    index,
    children,
  }: {
    list: {
      keys: string[];
      engine: SortableGroupEngine;
      hintId: string;
      ancestors: string[];
      snapshot: SortableGroupSnapshot;
      marker: number | null;
    };
    index: number;
    children: Snippet<
      [
        {
          row: {
            attach: Record<symbol, (element: Element) => () => void>;
            engaged: boolean;
            dragging: boolean;
            picked: boolean;
            markerBefore: boolean;
            gripProps: Record<string, unknown>;
            rowGripProps: Record<string, unknown>;
          };
        },
      ]
    >;
  } = $props();

  // A row keeps its key: the list renders each item's row under it.
  // svelte-ignore state_referenced_locally
  const engine = list.engine;
  // svelte-ignore state_referenced_locally
  const itemKey = list.keys[index]!;
  // svelte-ignore state_referenced_locally
  const gripId = `${list.hintId}-grip-${itemKey}`;

  // svelte-ignore state_referenced_locally
  setContext(sortableAncestorsContext, [...list.ancestors, itemKey]);

  const attachKey = createAttachmentKey();
  const attach = {
    [attachKey]: (element: Element) =>
      engine.attachRow(itemKey, element, gripId),
  };

  const row = $derived.by(() => {
    const picked = list.snapshot.picked === itemKey;
    const dragging = list.snapshot.active === itemKey;
    const actions = engine.gripActions(itemKey);
    // The grip's props: the row's own grip takes them, or the item's (with
    // the class that gives it the grip's look and states).
    const rowGripProps = {
      id: gripId,
      "aria-label": engine.gripLabel(itemKey),
      "aria-describedby": list.hintId,
      "aria-pressed": String(picked),
      onclick: actions.click,
      onkeydown: actions.keydown,
    };
    return {
      attach,
      engaged: picked || dragging,
      dragging,
      picked,
      // The marker of a drag from another list stands before this row.
      markerBefore: list.marker === index,
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

{@render children({ row })}
