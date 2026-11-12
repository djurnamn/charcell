"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import {
  SortableGroupEngine,
  type SortableGroupSnapshot,
  type SortableListTranslations,
  type SortableMove,
  type SortableSnap,
} from "charcell/scripts/sortable";
import { useMergedReference } from "./references/use-merged-reference";

export type { SortableMove };

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// The group a list joins, and the keys of the items a list sits inside.
const GroupContext = createContext<{
  engine: SortableGroupEngine;
  hintId: string;
} | null>(null);
const AncestorsContext = createContext<string[]>([]);

export interface SortableGroupProps {
  /** Called with every move between or within the group's lists. */
  onMove?: (move: SortableMove) => void;
  /** Every string the lists say (English defaults). */
  translations?: SortableListTranslations;
  /** How a drag moves: `'character'` (the default) in whole cells, `'row'` in whole rows down only, `'none'` freely. */
  snap?: SortableSnap;
  /** The lists, at any depth, and whatever surrounds them. */
  children?: ReactNode;
}

/**
 * `SortableGroup` (React) - lists an item moves between: every `SortableList`
 * inside it, however deep in another list's items, joins it, and a move from
 * any of them to any other is reported once, as `onMove({ key, from, to })`
 * with each list's `id` and the indexes. The consumer applies it to its own
 * data (`applySortableMove` does it for a record of lists); the lists show it
 * meanwhile. A list inside the item being moved is out of reach. Nothing is
 * rendered of its own but the grips' description and the live region.
 */
export function SortableGroup({
  onMove,
  translations,
  snap,
  children,
}: SortableGroupProps) {
  const hintId = `${useId()}-hint`;
  const [engine] = useState(() => new SortableGroupEngine({ snap }));
  engine.options = { ...engine.options, onMove, translations };
  engine.setSnap(snap);
  useEffect(() => () => engine.destroy(), [engine]);
  const group = useMemo(() => ({ engine, hintId }), [engine, hintId]);
  return (
    <GroupContext.Provider value={group}>
      {children}
      <SortableAnnouncements engine={engine} hintId={hintId} />
    </GroupContext.Provider>
  );
}

/** The props of an item's grip: the row's own, or the one the item places
 *  (`customGrip`). */
export interface SortableGripProps {
  id: string;
  type: "button";
  className: string;
  "aria-label": string;
  "aria-describedby": string;
  "aria-pressed": "true" | "false";
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/** The props for a button that places a picked-up item in an empty list. */
export interface SortablePlaceButtonProps {
  type: "button";
  className: string;
  onClick: () => void;
}

/** What the list's template renders from: the rows as shown, its root's
 *  props, and what an empty list offers. */
export interface SortableListApi<Item> {
  /** The items as shown, the live order while a drag runs. */
  items: Item[];
  /** Each shown item's key. */
  keys: string[];
  /** No items. */
  empty: boolean;
  /** An empty list's offer: `'picked'` (an item waits to be placed),
   *  `'dragging'` (one can be dropped in) or `'idle'`; `null` with items. */
  emptyState: "idle" | "picked" | "dragging" | null;
  /** Where a drag from another list would land in this one: the index of
   *  the row the marker stands before; null when it is elsewhere. */
  marker: number | null;
  /** The marker stands after the last row (or in the empty list's place). */
  markerAtEnd: boolean;
  placeProps: SortablePlaceButtonProps;
  placeInto: () => void;
  labels: SortableGroupEngine["labels"];
  /** The consumer's attributes, and the ref the drag needs. */
  rootProps: Record<string, unknown>;
  engine: SortableGroupEngine;
  hintId: string;
  ancestors: string[];
  snapshot: SortableGroupSnapshot;
}

export interface SortableListDriverProps<Item> {
  items: Item[];
  id?: string;
  getKey?: (item: Item, index: number) => string;
  /** The item's name, for its grip and what the list says about it; a
   *  string or number item names itself, any other its position. */
  getLabel?: (item: Item, index: number) => string;
  onItemsChange?: (items: Item[]) => void;
  translations?: SortableListTranslations;
  snap?: SortableSnap;
  /** The consumer's attributes for the list's root, its ref among them. */
  rootProps?: Record<string, unknown>;
  children: (scope: { list: SortableListApi<Item> }) => ReactNode;
}

/**
 * `SortableListDriver` (React) - a sortable list's behavior, handed to a
 * scoped slot (`children({ list })`): the list's own copy of its items, its
 * place in a `SortableGroup` (or a group of one), and the root's ref. The
 * generated `SortableList` renders the rows from it.
 */
export function SortableListDriver<Item>(props: SortableListDriverProps<Item>) {
  const group = useContext(GroupContext);
  return group ? (
    <GroupedList {...props} engine={group.engine} hintId={group.hintId} />
  ) : (
    <StandaloneList {...props} />
  );
}

function StandaloneList<Item>({
  translations,
  snap,
  ...rest
}: SortableListDriverProps<Item>) {
  const hintId = `${useId()}-hint`;
  const [engine] = useState(() => new SortableGroupEngine({ snap }));
  engine.options = { ...engine.options, translations };
  engine.setSnap(snap);
  useEffect(() => () => engine.destroy(), [engine]);
  return (
    <>
      <GroupedList {...rest} engine={engine} hintId={hintId} />
      <SortableAnnouncements engine={engine} hintId={hintId} />
    </>
  );
}

function GroupedList<Item>({
  items,
  id,
  getKey,
  getLabel,
  onItemsChange,
  rootProps,
  children,
  engine,
  hintId,
}: Omit<SortableListDriverProps<Item>, "translations" | "snap"> & {
  engine: SortableGroupEngine;
  hintId: string;
}) {
  const automaticId = useId();
  const listId = id ?? automaticId;
  const ancestors = useContext(AncestorsContext);
  // The list's own copy of its items, synced whenever they change, so a move
  // shows whether or not the consumer feeds it back.
  // A list moving with its item mounts again: it keeps its moves.
  const [order, setOrder] = useState(() => engine.kept(listId, items));
  const [seen, setSeen] = useState(items);
  if (items !== seen) {
    setSeen(items);
    setOrder(items);
  }
  const keys = engine.list(listId, order, {
    getKey: getKey as ((item: unknown, index: number) => string) | undefined,
    getLabel: getLabel as
      ((item: unknown, index: number) => string) | undefined,
    ancestors,
    given: seen,
    onItems: (next) => {
      setOrder(next as Item[]);
      onItemsChange?.(next as Item[]);
    },
  });
  const snapshot = useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    engine.getSnapshot,
  );
  const rows = engine.rowsOf(listId, keys);

  const root = useRef<HTMLDivElement | null>(null);
  const reference = useMergedReference(
    root,
    rootProps?.ref as Ref<HTMLDivElement> | undefined,
  );
  useIsomorphicLayoutEffect(
    () => (root.current ? engine.attachList(listId, root.current) : undefined),
    [engine, listId],
  );
  // The drag engine's indexes follow every render's order.
  useIsomorphicLayoutEffect(() => engine.refresh());

  const empty = rows.length === 0;
  const marker = engine.markerOf(listId);
  const list: SortableListApi<Item> = {
    items: rows.map((row) => row.item as Item),
    keys: rows.map((row) => row.key),
    empty,
    emptyState: empty ? engine.emptyState(listId) : null,
    marker,
    markerAtEnd: marker !== null && marker >= rows.length,
    placeProps: {
      type: "button",
      className: "CharcellSortableList__place",
      onClick: () => engine.placeInto(listId),
    },
    placeInto: () => engine.placeInto(listId),
    labels: engine.labels,
    rootProps: {
      ...rootProps,
      ref: reference,
    },
    engine,
    hintId,
    ancestors,
    snapshot,
  };
  return children({ list });
}

/** What one item's row renders from: its drag state, its grip's props and
 *  the ref the drag needs. */
export interface SortableRowApi {
  /** Spread on the row: the ref the drag needs. */
  attach: { ref: Ref<HTMLDivElement> };
  engaged: boolean;
  dragging: boolean;
  picked: boolean;
  /** The marker of a drag from another list stands before this row. */
  markerBefore: boolean;
  /** The item's own grip's props (`customGrip`). */
  gripProps: SortableGripProps;
  /** The row's grip's props: the row's grip takes its class from the row. */
  rowGripProps: Omit<SortableGripProps, "className" | "type">;
}

export interface SortableItemDriverProps<Item> {
  list: SortableListApi<Item>;
  index: number;
  children: (scope: { row: SortableRowApi }) => ReactNode;
}

/**
 * `SortableItemDriver` (React) - one item's place in the drag, handed to a
 * scoped slot (`children({ row })`): the engine's sortable on the row, its
 * activator on the grip (the row's own, or the one the item places, found by
 * its id), and the item's key added to the keys the lists inside it sit in.
 */
export function SortableItemDriver<Item>({
  list,
  index,
  children,
}: SortableItemDriverProps<Item>) {
  const { engine, hintId, snapshot } = list;
  // The list renders one item driver per key.
  const itemKey = list.keys[index]!;
  const row = useRef<HTMLDivElement>(null);
  const gripId = `${hintId}-grip-${itemKey}`;
  useIsomorphicLayoutEffect(() => {
    const element = row.current;
    if (!element) return;
    return engine.attachRow(itemKey, element, gripId);
  }, [engine, itemKey, gripId]);
  const inside = useMemo(
    () => [...list.ancestors, itemKey],
    [list.ancestors, itemKey],
  );
  const actions = engine.gripActions(itemKey);
  const picked = snapshot.picked === itemKey;
  const dragging = snapshot.active === itemKey;
  const engaged = picked || dragging;
  const gripProps: SortableGripProps = {
    id: gripId,
    type: "button",
    className:
      "CharcellSortableList__grip" +
      (engaged ? " CharcellSortableList__grip--engaged" : ""),
    "aria-label": engine.gripLabel(itemKey),
    "aria-describedby": hintId,
    "aria-pressed": picked ? "true" : "false",
    onClick: actions.click,
    onKeyDown: (event) => actions.keydown(event.nativeEvent),
  };
  const { className: _className, type: _type, ...rowGripProps } = gripProps;
  return (
    <AncestorsContext.Provider value={inside}>
      {children({
        row: {
          attach: { ref: row },
          engaged,
          dragging,
          picked,
          markerBefore: list.marker === index,
          gripProps,
          rowGripProps,
        },
      })}
    </AncestorsContext.Provider>
  );
}

/** The grips' description, read on focus, and the polite live region -
 *  mounted empty and filled afterwards, since a region injected with its
 *  text announces nothing. */
function SortableAnnouncements({
  engine,
  hintId,
}: {
  engine: SortableGroupEngine;
  hintId: string;
}) {
  const snapshot = useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    engine.getSnapshot,
  );
  return (
    <>
      <span id={hintId} className="CharcellSortableList__announcement">
        {engine.labels.reorderHintMessage}
      </span>
      <span
        className="CharcellSortableList__announcement"
        role="status"
        aria-live="polite"
      >
        {snapshot.announcement}
      </span>
    </>
  );
}
