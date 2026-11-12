import { Modifier, type DragOperation } from "@dnd-kit/abstract";
import { pointerIntersection } from "@dnd-kit/collision";
import {
  Accessibility,
  DragDropManager,
  Droppable,
  Feedback,
  PointerActivationConstraints,
  PointerSensor,
  defaultPreset,
} from "@dnd-kit/dom";
import { OptimisticSortingPlugin, Sortable } from "@dnd-kit/dom/sortable";
import { move } from "@dnd-kit/helpers";
import { batch } from "@dnd-kit/state";
import { measureCellSize } from "./character-snap";

/**
 * The SortableList's behavior, shared by every framework's driver, for lists
 * nested in each other's items as well as flat ones. One engine
 * (`SortableGroupEngine`) per group of lists owns the drag (dnd-kit's DOM
 * layer, no framework adapter), the click-and-place, the keys and what the
 * group says; a driver hands it elements and renders its snapshot.
 */

/** The strings the list says; every one has an English default. */
export interface SortableListTranslations {
  /** The grip's accessible name. `{label}`, the item's name. */
  reorderLabel?: string;
  /** The grip's description, read on focus: the ways to move without dragging. */
  reorderHintMessage?: string;
  /** Announced when a grip is clicked without dragging. `{label}`, `{from}`,
   *  `{count}`. */
  pickedMessage?: string;
  /** Announced after a move. `{label}`, `{from}`, `{to}`, `{count}`, positions
   *  1-based. */
  movedMessage?: string;
  /** Announced when a picked item is let go, or a drag is canceled, and it
   *  stays where it was. `{label}`, `{from}`, `{count}`. */
  canceledMessage?: string;
  /** The button an empty list shows while an item is picked up. */
  placeHereLabel?: string;
  /** The hint an empty list shows while an item is dragged. */
  dropHereMessage?: string;
}

export function resolveSortableListTranslations(
  translations?: SortableListTranslations,
): Required<SortableListTranslations> {
  return {
    reorderLabel: translations?.reorderLabel ?? "reorder {label}",
    reorderHintMessage:
      translations?.reorderHintMessage ??
      "press the up and down arrow keys to move the item, or pick it up and choose another item's grip to place it there.",
    pickedMessage:
      translations?.pickedMessage ??
      "{label} picked up, item {from} of {count}. choose another item's grip to place it there.",
    movedMessage:
      translations?.movedMessage ?? "moved {label} to position {to} of {count}",
    canceledMessage:
      translations?.canceledMessage ??
      "{label} put back where it was, item {from} of {count}",
    placeHereLabel: translations?.placeHereLabel ?? "place here",
    dropHereMessage: translations?.dropHereMessage ?? "drop here",
  };
}

/** Fills the `{label}`, `{from}`, `{to}` and `{count}` placeholders of a
 *  string the list says. One it is given no value for stays as written, so
 *  a translation naming a placeholder the list never fills shows where it
 *  is read. */
export function fillSortablePositions(
  template: string,
  values: { label?: string; from?: number; to?: number; count?: number },
): string {
  return template.replace(
    /\{(label|from|to|count)\}/g,
    (placeholder, key: "label" | "from" | "to" | "count") =>
      values[key] === undefined ? placeholder : String(values[key]),
  );
}

/** An item's name when its list gives none: a string or a number names
 *  itself, anything else its position. */
export function sortableItemLabel(item: unknown, index: number): string {
  return typeof item === "string" || typeof item === "number"
    ? String(item)
    : `item ${index + 1}`;
}

/**
 * Moves one item to another position, the items between shifting by one;
 * the same array when nothing moves (out of range, or in place).
 */
export function moveSortableItem<Item>(
  items: Item[],
  from: number,
  to: number,
): Item[] {
  if (
    from < 0 ||
    from >= items.length ||
    to < 0 ||
    to >= items.length ||
    from === to
  )
    return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/** Where an item sits: its list and its index in it. */
export interface SortablePosition {
  list: string;
  index: number;
}

/** One move, as the group reports it: the item's key, where it was, where it goes. */
export interface SortableMove {
  key: string;
  from: SortablePosition;
  to: SortablePosition;
}

/**
 * Applies a move to the lists it touches, in a record of lists by id: the
 * item leaves `from` and is inserted at `to`. The record itself when the move
 * names a list or an index it does not have.
 */
export function applySortableMove<Item>(
  lists: Record<string, Item[]>,
  { from, to }: SortableMove,
): Record<string, Item[]> {
  const source = lists[from.list];
  const target = lists[to.list];
  if (!source || !target || from.index < 0 || from.index >= source.length)
    return lists;
  if (from.list === to.list)
    return {
      ...lists,
      [from.list]: moveSortableItem(source, from.index, to.index),
    };
  if (to.index < 0 || to.index > target.length) return lists;
  const item = source[from.index]!;
  return {
    ...lists,
    [from.list]: [
      ...source.slice(0, from.index),
      ...source.slice(from.index + 1),
    ],
    [to.list]: [...target.slice(0, to.index), item, ...target.slice(to.index)],
  };
}

/**
 * The drag on the cell grid's rows (`snap="row"`): a dragged row moves on the
 * vertical axis only, in whole rows (its own line height), for a flat list
 * that never drifts across.
 */
export class SortableRowSnap extends Modifier<DragDropManager> {
  apply({ transform, source }: DragOperation) {
    const element = (source as { element?: Element } | null)?.element;
    const row = element
      ? parseFloat(getComputedStyle(element).lineHeight)
      : NaN;
    return {
      x: 0,
      y: row > 0 ? Math.round(transform.y / row) * row : transform.y,
    };
  }
}

// A dragged row's cell, measured once per row: the drag reads it on every move.
const cells = new WeakMap<Element, { column: number; row: number }>();
const cellOf = (element: HTMLElement) => {
  let cell = cells.get(element);
  if (!cell) {
    cell = {
      column: measureCellSize(element),
      row: measureCellSize(element, "vertical"),
    };
    cells.set(element, cell);
  }
  return cell;
};

/** A length moved to a whole number of cells. */
const onCell = (value: number, cell: number) =>
  cell > 0 ? Math.round(value / cell) * cell : value;

/**
 * The drag on the character grid, the default (`snap="character"`): a
 * dragged row moves in whole cells, a column at a time across and a row at
 * a time down, as a terminal redraws it, so it steps into a nested list's
 * indent as it moves into it.
 */
export class SortableCharacterSnap extends Modifier<DragDropManager> {
  apply({ transform, source }: DragOperation) {
    const element = (source as { element?: Element } | null)?.element;
    if (!(element instanceof HTMLElement)) return transform;
    const { column, row } = cellOf(element);
    return { x: onCell(transform.x, column), y: onCell(transform.y, row) };
  }
}

/** The modifiers a snap asks for: whole cells, whole rows down, or none. */
const modifiersOf = (snap: SortableSnap | undefined) =>
  snap === "none"
    ? []
    : snap === "row"
      ? [SortableRowSnap]
      : [SortableCharacterSnap];

/** How a drag moves: in whole cells, in whole rows down, or freely. */
export type SortableSnap = "character" | "row" | "none";

/**
 * The drag engine as every group runs it.
 *
 * - **Plugins**: without the accessibility plugin, since the grip is a real
 *   button and the group owns what it says. Feedback without its drop
 *   animation: the terminal look is binary state, so a dropped row lands.
 * - **Sensors**: the pointer only (the keyboard sensor would start a drag on
 *   the space and enter that pick an item up). A drag is a small travel, or on
 *   touch a held press, so a tap and a scroll stay what they are; anything
 *   less is a click.
 */
export const sortableDragOptions = {
  plugins: defaultPreset.plugins
    .filter((plugin) => plugin !== Accessibility)
    .map((plugin) =>
      plugin === Feedback
        ? Feedback.configure({ dropAnimation: null, keyboardTransition: null })
        : plugin,
    ),
  sensors: [
    PointerSensor.configure({
      activationConstraints: (event) =>
        event.pointerType === "touch"
          ? [
              new PointerActivationConstraints.Delay({
                value: 250,
                tolerance: 5,
              }),
            ]
          : [new PointerActivationConstraints.Distance({ value: 4 })],
    }),
  ],
};

// A sortable's own plugins, without the optimistic sorting that moves DOM
// nodes behind a framework's back: the engine reorders its order on drag-over
// and the framework renders it, in every target alike.
const withoutOptimisticSorting = (defaults: unknown[]) =>
  defaults.filter((plugin) => plugin !== OptimisticSortingPlugin);

// A list's droppable id: the record key the drag-over `move` inserts into.
const listTarget = (list: string) => `charcell-sortable-list:${list}`;
const listOfTarget = (target: string) =>
  target.slice("charcell-sortable-list:".length);

/** What a group renders from: every list's keys as shown, and the states. */
export interface SortableGroupSnapshot {
  /** The keys each list shows while a drag reorders them; `null` when idle,
   *  and the lists show their own items. */
  live: Record<string, string[]> | null;
  /** The dragged item's key. */
  active: string | null;
  /** The key of the item a grip click picked up. */
  picked: string | null;
  /** Where a drag into another list would land it, marked in that list
   *  until the drop: the list and the index the item takes there. */
  marker: SortablePosition | null;
  /** The polite live region's text. */
  announcement: string;
}

export interface SortableGroupOptions {
  /** Called with every move: a drop, an arrow key, or a placement. */
  onMove?: (move: SortableMove) => void;
  translations?: SortableListTranslations;
  /** How a drag moves: `'character'` (the default) in whole cells, `'row'`
   *  in whole rows on the vertical axis only, `'none'` freely. */
  snap?: SortableSnap;
}

interface ListEntry {
  items: unknown[];
  // The items the list was last given, which its copy started from.
  given?: unknown[];
  getKey?: (item: unknown, index: number) => string;
  getLabel?: (item: unknown, index: number) => string;
  onItems?: (items: unknown[]) => void;
  keys: string[];
  ancestors: string[];
  ownKeys: boolean;
  element?: Element;
  droppable?: Droppable;
}

interface RowEntry {
  sortable: Sortable;
  element?: Element;
  grip?: HTMLElement;
}

const nextFrame = (callback: () => void) =>
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame(callback)
    : setTimeout(callback, 0);

/**
 * One group of sortable lists: a flat SortableList is a group of one, and a
 * SortableGroup holds lists nested in each other's items, an item moving
 * between any of them.
 *
 * - `list(id, items, { getKey, ancestors, onItems })` registers a list and
 *   returns its keys (`getKey`'s, or keys the engine keeps beside the
 *   items). Idempotent, so a driver calls it as it renders; a move hands
 *   each list it touches its next items through `onItems`.
 * - `attachList` / `attachRow` hand it the elements; each returns the
 *   cleanup, and a list or row that does not mount again is let go.
 * - `refresh()` brings the drag engine's indexes up to date after a render.
 * - `subscribe` / `getSnapshot` drive the rendering; `itemOf(key)` finds an
 *   item in whichever list holds it, so a list shows an item dragged in from
 *   another.
 * - `gripActions(key)`, `placeInto(list)` and `release()` are the grip's
 *   click, keys and the empty list's button.
 *
 * A drag reorders the live order on drag-over and reports one move on the
 * drop; the live order holds until the next frame, by which the consumer has
 * rendered the move (or not, and the lists show their own order again). A
 * list inside the dragged or picked item is disabled: nothing moves into its
 * own subtree. Deeper lists and rows win the pointer over the ones around
 * them, so an empty nested list is reachable inside the item that holds it.
 */
export class SortableGroupEngine {
  options: SortableGroupOptions;
  #manager?: DragDropManager;
  #lists = new Map<string, ListEntry>();
  #rows = new Map<string, RowEntry>();
  #live: Record<string, string[]> | null = null;
  #start: Record<string, string[]> | null = null;
  #active: string | null = null;
  #picked: string | null = null;
  #marker: SortablePosition | null = null;
  // The drag-over a marker held back, applied once the pointer is back in
  // the dragged item's own list.
  #heldOver: unknown = null;
  #announcement = "";
  #snapshot: SortableGroupSnapshot = {
    live: null,
    active: null,
    picked: null,
    marker: null,
    announcement: "",
  };
  #listeners = new Set<() => void>();
  #releasing?: () => void;
  // The keys the engine keeps beside items without `getKey`, counted per
  // list and named by it: a server render and the hydration name each item
  // alike whatever order the lists render in, a render thrown away renders
  // the same keys again, and a key stays unique in the group as its item
  // moves between the lists. A list's count outlives the list, so one
  // mounting again never repeats a key an item it gave away still holds.
  #keyCounts = new Map<string, number>();

  constructor(options: SortableGroupOptions = {}) {
    this.options = options;
  }

  get labels() {
    return resolveSortableListTranslations(this.options.translations);
  }

  // Created on first use, in the browser: a server render never needs it.
  get manager(): DragDropManager {
    if (!this.#manager) {
      const manager = new DragDropManager({
        ...sortableDragOptions,
        modifiers: modifiersOf(this.options.snap),
      });
      manager.monitor.addEventListener("dragstart", (event) =>
        this.#dragStart(String(event.operation.source?.id)),
      );
      manager.monitor.addEventListener("dragover", (event) =>
        this.#dragOver(event),
      );
      // The move's own coordinates: the operation takes them only after.
      manager.monitor.addEventListener("dragmove", (event) =>
        this.#aim(event.to ?? event.operation.position.current),
      );
      manager.monitor.addEventListener("dragend", (event) =>
        this.#dragEnd(event.canceled),
      );
      this.#manager = manager;
    }
    return this.#manager;
  }

  /** Changes how a drag moves, from the next drag on. */
  setSnap(snap: SortableSnap | undefined) {
    if (snap === this.options.snap) return;
    this.options = { ...this.options, snap };
    if (this.#manager) this.#manager.modifiers = modifiersOf(snap);
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#snapshot;

  #emit() {
    const live = this.#live
      ? Object.fromEntries(
          Object.entries(this.#live).map(([target, keys]) => [
            listOfTarget(target),
            keys,
          ]),
        )
      : null;
    this.#snapshot = {
      live,
      active: this.#active,
      picked: this.#picked,
      marker: this.#marker,
      announcement: this.#announcement,
    };
    this.refresh();
    for (const listener of this.#listeners) listener();
  }

  // ── lists and rows ─────────────────────────────────────────────────────────

  list(
    id: string,
    items: unknown[],
    options: {
      getKey?: (item: unknown, index: number) => string;
      /** The item's name, for its grip and what the list says about it. */
      getLabel?: (item: unknown, index: number) => string;
      ancestors?: string[];
      /** Called with the list's items after a move touches it. */
      onItems?: (items: unknown[]) => void;
      /** The items the list was given, its copy's start (see `kept`). */
      given?: unknown[];
    } = {},
  ): string[] {
    const ancestors = options.ancestors ?? [];
    let entry = this.#lists.get(id);
    if (!entry) {
      entry = { items, keys: [], ancestors, ownKeys: !options.getKey };
      this.#lists.set(id, entry);
    }
    entry.ancestors = ancestors;
    if (options.given) entry.given = options.given;
    entry.onItems = options.onItems;
    entry.getKey = options.getKey;
    entry.getLabel = options.getLabel;
    entry.ownKeys = !options.getKey;
    if (options.getKey) {
      if (entry.items !== items || entry.keys.length !== items.length)
        entry.keys = items.map(options.getKey);
    } else if (entry.keys.length !== items.length) {
      entry.keys = items.map(
        (_, index) => entry!.keys[index] ?? this.#nextKey(id),
      );
    }
    entry.items = items;
    return entry.keys;
  }

  #nextKey(listId: string): string {
    const count = this.#keyCounts.get(listId) ?? 0;
    this.#keyCounts.set(listId, count + 1);
    return `charcell-sortable-${listId}-${count}`;
  }

  /**
   * The copy a list starts from as it mounts: the items it holds, moves and
   * all, when it mounts again given the same items (a list moving with the
   * item it sits in), or the items it is given.
   */
  kept<Item>(id: string, given: Item[]): Item[] {
    const entry = this.#lists.get(id);
    return entry && entry.given === given ? (entry.items as Item[]) : given;
  }

  /** The name of the item a key names, as its list gives it. */
  labelOf(key: string): string {
    for (const entry of this.#lists.values()) {
      const index = entry.keys.indexOf(key);
      if (index === -1) continue;
      const item = entry.items[index];
      return (entry.getLabel ?? sortableItemLabel)(item, index);
    }
    return "";
  }

  /** The accessible name of the grip of the item a key names. */
  gripLabel(key: string): string {
    return fillSortablePositions(this.labels.reorderLabel, {
      label: this.labelOf(key),
    }).trim();
  }

  // Says that the item a key names stays where it is.
  #announceCanceled(key: string) {
    const order = this.#order();
    const at = this.#position(order, key);
    if (!at) return;
    this.#announcement = fillSortablePositions(this.labels.canceledMessage, {
      label: this.labelOf(key),
      from: at.index + 1,
      count: order[at.list]?.length ?? 0,
    });
  }

  /** The item a key names, in whichever list holds it. */
  itemOf(key: string): unknown {
    for (const entry of this.#lists.values()) {
      const index = entry.keys.indexOf(key);
      if (index !== -1) return entry.items[index];
    }
    return undefined;
  }

  /** The keys a list shows, each with its item: the live order while a drag
   *  runs, its own otherwise. A key whose item no list holds is left out. */
  rowsOf(id: string, keys: string[]): { key: string; item: unknown }[] {
    const shown = this.#snapshot.live?.[id] ?? keys;
    const rows: { key: string; item: unknown }[] = [];
    for (const key of shown) {
      const item = this.itemOf(key);
      if (item !== undefined) rows.push({ key, item });
    }
    return rows;
  }

  /**
   * What an empty list offers: `'picked'` (an item waits to be placed),
   * `'dragging'` (an item can be dropped in), or `'idle'` - also for a list
   * inside the moving item, which takes nothing.
   */
  emptyState(id: string): "idle" | "picked" | "dragging" {
    if (this.isListDisabled(id)) return "idle";
    if (this.#active !== null) return "dragging";
    return this.#picked !== null ? "picked" : "idle";
  }

  /** Where in a list the marker stands, as the index of the row it stands
   *  before (its row count for the end); null when it is elsewhere. */
  markerOf(id: string): number | null {
    const marker = this.#snapshot.marker;
    return marker && marker.list === id ? marker.index : null;
  }

  /** Whether a list sits inside the item being dragged or picked up. */
  isListDisabled(id: string): boolean {
    const moving = this.#active ?? this.#picked;
    return (
      moving !== null &&
      (this.#lists.get(id)?.ancestors.includes(moving) ?? false)
    );
  }

  attachList(id: string, element: Element): () => void {
    const entry = this.#lists.get(id);
    if (!entry) return () => {};
    entry.element = element;
    entry.droppable?.destroy();
    entry.droppable = new Droppable(
      {
        id: listTarget(id),
        element,
        collisionDetector: pointerIntersection,
        collisionPriority: entry.ancestors.length * 2,
      },
      this.manager,
    );
    this.refresh();
    return () => {
      if (entry.element !== element) return;
      entry.droppable?.destroy();
      entry.droppable = undefined;
      entry.element = undefined;
      // Gone for good unless it mounts again by the next task (a list moving
      // with its item, or a framework running its effects twice).
      queueMicrotask(() => {
        if (!entry.element && this.#lists.get(id) === entry)
          this.#lists.delete(id);
      });
    };
  }

  /**
   * A row's element, and the id of its grip. The grip is found inside the row
   * and found again whenever the row's content changes, so a grip that an item
   * re-renders while its row stays mounted keeps starting the drag.
   */
  attachRow(key: string, element: Element, gripId: string): () => void {
    const findGrip = () => {
      const found = element.ownerDocument.getElementById(gripId);
      return found && element.contains(found) ? found : undefined;
    };
    const grip = findGrip();
    let row = this.#rows.get(key);
    if (!row) {
      const sortable = new Sortable(
        {
          id: key,
          index: 0,
          element,
          handle: grip,
          transition: null,
          plugins: withoutOptimisticSorting as never,
          collisionDetector: pointerIntersection,
        },
        this.manager,
      );
      row = { sortable };
      this.#rows.set(key, row);
    } else {
      row.sortable.element = element;
      row.sortable.handle = grip;
    }
    row.element = element;
    row.grip = grip;
    this.refresh();
    const attached = row;
    const watcher = new MutationObserver(() => {
      if (attached.element !== element) return;
      const current = findGrip();
      if (current === attached.grip) return;
      attached.grip = current;
      attached.sortable.handle = current;
    });
    watcher.observe(element, { childList: true, subtree: true });
    return () => {
      watcher.disconnect();
      if (attached.element !== element) return;
      attached.element = undefined;
      attached.grip = undefined;
      // A row unmounts as it moves between lists, and mounts again in the
      // other: collect only what has not come back by the next task.
      queueMicrotask(() => this.#collect(key));
    };
  }

  #collect(key: string) {
    const row = this.#rows.get(key);
    if (!row || row.element) return;
    const shown = this.#order();
    const present = Object.values(shown).some((keys) => keys.includes(key));
    if (
      !present &&
      (!this.#manager || this.#manager.dragOperation.status.idle)
    ) {
      row.sortable.destroy();
      this.#rows.delete(key);
    }
  }

  // Every list's keys as shown: the live order while a drag runs.
  #order(): Record<string, string[]> {
    if (this.#live) {
      return Object.fromEntries(
        Object.entries(this.#live).map(([target, keys]) => [
          listOfTarget(target),
          keys,
        ]),
      );
    }
    return Object.fromEntries(
      [...this.#lists].map(([id, entry]) => [id, entry.keys]),
    );
  }

  /** The sortables' list, index, priority and disabled state, from the order. */
  refresh() {
    const order = this.#order();
    batch(() => {
      for (const [list, keys] of Object.entries(order)) {
        const entry = this.#lists.get(list);
        const depth = entry?.ancestors.length ?? 0;
        const disabled = this.isListDisabled(list);
        if (entry?.droppable) entry.droppable.disabled = disabled;
        keys.forEach((key, index) => {
          const row = this.#rows.get(key);
          if (!row) return;
          row.sortable.group = listTarget(list);
          row.sortable.index = index;
          row.sortable.collisionPriority = depth * 2 + 1;
          row.sortable.disabled = disabled;
        });
      }
    });
  }

  #position(
    order: Record<string, string[]>,
    key: string,
  ): SortablePosition | null {
    for (const [list, keys] of Object.entries(order)) {
      const index = keys.indexOf(key);
      if (index !== -1) return { list, index };
    }
    return null;
  }

  // ── moving ──────────────────────────────────────────────────────────────────

  // Reports a move, after keeping the engine's own keys in step with it.
  #commit(move: SortableMove) {
    const target = this.#lists.get(move.to.list);
    if (!target || target.ancestors.includes(move.key)) return;
    // Named before anything moves: a key and its item move one at a time.
    const label = this.labelOf(move.key);
    const count =
      (target.keys.length ?? 0) + (move.from.list === move.to.list ? 0 : 1);
    const owned = Object.fromEntries(
      [...this.#lists]
        .filter(([, entry]) => entry.ownKeys)
        .map(([id, entry]) => [id, entry.keys]),
    );
    if (owned[move.from.list] && owned[move.to.list]) {
      const moved = applySortableMove(owned, move);
      for (const [id, keys] of Object.entries(moved))
        this.#lists.get(id)!.keys = keys;
    }
    this.#announcement = fillSortablePositions(this.labels.movedMessage, {
      label,
      from: move.from.index + 1,
      to: move.to.index + 1,
      count,
    });
    // Each list the move touches takes it at once; the consumer's data
    // follows through `onMove` or the lists' `onItemsChange`, or does not.
    const source = this.#lists.get(move.from.list);
    if (source) {
      const touched = applySortableMove(
        { [move.from.list]: source.items, [move.to.list]: target.items },
        move,
      );
      for (const [id, items] of Object.entries(touched)) {
        const entry = this.#lists.get(id)!;
        if (items === entry.items) continue;
        entry.items = items;
        if (entry.getKey) entry.keys = items.map(entry.getKey);
        entry.onItems?.(items);
      }
    }
    this.options.onMove?.(move);
  }

  #dragStart(key: string) {
    this.#start = Object.fromEntries(
      [...this.#lists].map(([id, entry]) => [listTarget(id), entry.keys]),
    );
    this.#live = this.#start;
    this.#active = key;
    this.#marker = null;
    this.#heldOver = null;
    this.#setPicked(null);
    this.#emit();
  }

  // The list the dragged item sits in, in the live order.
  #home(): string | null {
    return this.#active
      ? (this.#position(this.#order(), this.#active)?.list ?? null)
      : null;
  }

  // Within its own list the dragged item moves live, the rows it passes
  // jumping to their places; a target in another list is the marker's
  // (`#aim`), so nothing there moves under the pointer until the drop.
  #dragOver(event: unknown) {
    if (!this.#live) return;
    const operation = (event as { operation?: { target?: unknown } }).operation;
    const target = operation?.target as
      { id?: unknown; group?: unknown } | null | undefined;
    const into =
      typeof target?.group === "string"
        ? target.group
        : String(target?.id ?? "");
    if (listOfTarget(into) !== this.#home()) return;
    if (this.#marker) {
      this.#heldOver = event;
      return;
    }
    this.#over(event);
  }

  #over(event: unknown) {
    if (!this.#live) return;
    const next = move(this.#live, event as never) as Record<string, string[]>;
    if (next === this.#live) return;
    this.#live = next;
    this.#emit();
  }

  /**
   * Where a drag into another list lands, from the pointer: the deepest list
   * under it that takes the item (a list reaches a row past its end, where
   * the item would follow its last row), and in it the rows the pointer has
   * passed whole, each row by its whole height, a nested list's with it. A
   * row is passed only once the pointer leaves its bottom, so the marker
   * stepping past it leaves the pointer on the marker, and a pointer over the
   * marker keeps it: nothing the marker moves puts another target under the
   * pointer. Outside every list the marker stays where it was.
   */
  #aim(point: { x: number; y: number } | undefined) {
    const active = this.#active;
    if (!point || !active || !this.#live) return;
    let best: { id: string; rank: number } | null = null;
    for (const [id, entry] of this.#lists) {
      if (!entry.element || this.isListDisabled(id)) continue;
      const rect = entry.element.getBoundingClientRect();
      if (point.x < rect.left || point.x >= rect.right) continue;
      const row = parseFloat(getComputedStyle(entry.element).lineHeight) || 0;
      const within = point.y >= rect.top && point.y < rect.bottom;
      if (!within && !(point.y >= rect.bottom && point.y < rect.bottom + row))
        continue;
      // Deeper first; at one depth, a list the pointer is in over one it is
      // a row past.
      const rank = entry.ancestors.length * 2 + (within ? 1 : 0);
      if (!best || rank > best.rank) best = { id, rank };
    }
    if (!best) return;
    if (best.id === this.#home()) {
      if (!this.#marker) return;
      this.#marker = null;
      this.#emit();
      const held = this.#heldOver;
      this.#heldOver = null;
      if (held) this.#over(held);
      return;
    }
    const keys = (this.#order()[best.id] ?? []).filter((key) => key !== active);
    let index = 0;
    for (const key of keys) {
      const element = this.#rows.get(key)?.element;
      if (!element || element.getBoundingClientRect().bottom > point.y) break;
      index += 1;
    }
    if (this.#marker?.list === best.id && this.#marker.index === index) return;
    this.#marker = { list: best.id, index };
    this.#emit();
  }

  #dragEnd(canceled: boolean) {
    const start = this.#start;
    const live = this.#live;
    const key = this.#active;
    const marker = this.#marker;
    this.#start = null;
    this.#active = null;
    this.#marker = null;
    this.#heldOver = null;
    const from = start && key ? this.#position(start, key) : null;
    // A marker in another list is where the item lands, and the live order
    // takes it there for the frame it holds; else the item's live place.
    const to = marker
      ? { list: listTarget(marker.list), index: marker.index }
      : live && key
        ? this.#position(live, key)
        : null;
    const there = live && key ? this.#position(live, key) : null;
    if (marker && live && there && to)
      this.#live = applySortableMove(live, { key: key!, from: there, to });
    // The live order holds until the next frame either way: dnd-kit tidies the
    // DOM after the drop (its placeholder), and a framework that put the
    // order back at once would patch a half-tidied list. By then the consumer
    // has rendered a move, or the canceled drag's order returns.
    const settle = () =>
      nextFrame(() => {
        this.#live = null;
        this.#emit();
      });
    if (
      canceled ||
      !from ||
      !to ||
      (from.list === to.list && from.index === to.index)
    ) {
      if (canceled && key) this.#announceCanceled(key);
      this.#emit();
      settle();
      return;
    }
    this.#commit({
      key: key!,
      from: { list: listOfTarget(from.list), index: from.index },
      to: { list: listOfTarget(to.list), index: to.index },
    });
    this.#emit();
    settle();
  }

  /** The grip's handlers: a click picks up or places, the arrow keys step. */
  gripActions(key: string) {
    return {
      click: () => this.#click(key),
      keydown: (event: KeyboardEvent) => this.#keydown(key, event),
    };
  }

  #click(key: string) {
    const order = this.#order();
    if (this.#picked === null) {
      const at = this.#position(order, key);
      if (!at) return;
      this.#announcement = fillSortablePositions(this.labels.pickedMessage, {
        label: this.labelOf(key),
        from: at.index + 1,
        count: order[at.list]?.length ?? 0,
      });
      this.#setPicked(key);
    } else if (this.#picked === key) {
      this.#announceCanceled(key);
      this.#setPicked(null);
    } else {
      const picked = this.#picked;
      const from = this.#position(order, picked);
      const to = this.#position(order, key);
      this.#setPicked(null);
      if (from && to) this.#commit({ key: picked, from, to });
    }
    this.#emit();
  }

  #keydown(key: string, event: KeyboardEvent) {
    const step =
      event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const order = this.#order();
    const from = this.#position(order, key);
    if (!from) return;
    const to = { list: from.list, index: from.index + step };
    if (to.index < 0 || to.index >= (order[from.list]?.length ?? 0)) return;
    // A picked item stays picked as it moves; any other moving lets it go.
    if (this.#picked !== null && this.#picked !== key) this.#setPicked(null);
    this.#commit({ key, from, to });
    this.#emit();
    // The moved row may lose focus as it moves; put it back on its grip.
    nextFrame(() => this.#rows.get(key)?.grip?.focus());
  }

  /** Places the picked item at the end of a list: the empty list's button. */
  placeInto(list: string) {
    const picked = this.#picked;
    if (picked === null) return;
    const order = this.#order();
    const from = this.#position(order, picked);
    this.#setPicked(null);
    if (from)
      this.#commit({
        key: picked,
        from,
        to: { list, index: order[list]?.length ?? 0 },
      });
    this.#emit();
  }

  release() {
    if (this.#picked === null) return;
    this.#announceCanceled(this.#picked);
    this.#setPicked(null);
    this.#emit();
  }

  // A picked item is let go by a press anywhere but this group's grips and
  // empty lists, or by escape anywhere.
  #setPicked(key: string | null) {
    this.#picked = key;
    if (key === null) {
      this.#releasing?.();
      this.#releasing = undefined;
      return;
    }
    if (this.#releasing || typeof document === "undefined") return;
    const inside = (target: Element) =>
      [...this.#rows.values()].some((row) => row.grip?.contains(target)) ||
      // An empty list's row is its place, whatever renders it.
      [...this.#lists.values()].some(
        (entry) => entry.keys.length === 0 && entry.element?.contains(target),
      );
    const release = (event: PointerEvent) => {
      if (event.target instanceof Element && inside(event.target)) return;
      this.release();
    };
    const releaseOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") this.release();
    };
    document.addEventListener("pointerdown", release, true);
    document.addEventListener("keydown", releaseOnEscape, true);
    this.#releasing = () => {
      document.removeEventListener("pointerdown", release, true);
      document.removeEventListener("keydown", releaseOnEscape, true);
    };
  }

  /** Tears the drag engine down. The engine stays usable: what mounts again
   *  attaches to a new one (a framework may run its effects twice). */
  destroy() {
    this.#releasing?.();
    this.#releasing = undefined;
    for (const row of this.#rows.values()) row.sortable.destroy();
    for (const entry of this.#lists.values()) {
      entry.droppable?.destroy();
      entry.droppable = undefined;
    }
    this.#manager?.destroy();
    this.#manager = undefined;
    this.#rows.clear();
  }
}

/** The context keys the Vue and Svelte drivers share: the group a list
 *  joins, and the keys of the items a list sits inside. */
export const sortableGroupContext = Symbol("charcell-sortable-group");
export const sortableAncestorsContext = Symbol("charcell-sortable-ancestors");
