// character-grid snapping for the Splitter: panel boundaries land on whole
// character columns side by side, and on whole rows stacked, so panes resize
// in grid steps - the terminal has no fractional cells. Pure math + one
// canvas measurement; shared by the three framework drivers
// (`charcell/scripts`).

/** The way a split runs: `horizontal` side by side, `vertical` stacked. */
export type SplitOrientation = "horizontal" | "vertical";

/** The width of one character cell ('0') in the element's font, in px. */
export function measureCharacterWidth(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return 0;
  context.font = `${style.fontSize} ${style.fontFamily}`;
  return context.measureText("0").width;
}

/** One cell along the split: a character's width side by side, the row's
 *  height (the cell's line height) stacked, in px. */
export function measureCellSize(
  element: HTMLElement,
  orientation: SplitOrientation = "horizontal",
): number {
  if (orientation === "horizontal") return measureCharacterWidth(element);
  return parseFloat(getComputedStyle(element).lineHeight) || 0;
}

/**
 * The length the panels share along the split, its width side by side and
 * its height stacked: the root's content box less its resize handles along
 * the split, which take whole columns (or rows) of their own (a grid's
 * handles across it span the root and are left out). Panel sizes are percentages of
 * this, not of the root, so it is what a boundary snaps against. A
 * consumer's padding on the root is left out, as the panels never fill it.
 */
export function measurePanelSpace(
  root: HTMLElement,
  orientation: SplitOrientation = "horizontal",
): number {
  const horizontal = orientation === "horizontal";
  let handles = 0;
  for (const child of root.children) {
    if (
      child.getAttribute("data-part") === "resize-trigger" &&
      (child.getAttribute("data-orientation") ?? orientation) === orientation
    ) {
      const box = child.getBoundingClientRect();
      handles += horizontal ? box.width : box.height;
    }
  }
  const style = getComputedStyle(root);
  const padding = horizontal
    ? (parseFloat(style.paddingLeft) || 0) +
      (parseFloat(style.paddingRight) || 0)
    : (parseFloat(style.paddingTop) || 0) +
      (parseFloat(style.paddingBottom) || 0);
  return (
    (horizontal ? root.clientWidth : root.clientHeight) - padding - handles
  );
}

/** The least panel a snapped split keeps, in cells: 8 columns side by side,
 *  3 rows stacked (a frame's ring around one row). */
export const minimumCells = (orientation: SplitOrientation = "horizontal") =>
  orientation === "horizontal" ? 8 : 3;

/** Each panel's least cells: the split's own least (`minimumCells`), or a
 *  panel's `minimumCells` where it asks for more. */
export function panelMinimums(
  panels: PanelLimits[],
  orientation: SplitOrientation = "horizontal",
): number[] {
  return panels.map((panel) =>
    Math.max(minimumCells(orientation), panel.minimumCells ?? 0),
  );
}

/** The two-panel splitter's `start` and `end` panels, given the panel that
 *  keeps its cells and the least cells each keeps; none when neither is set. */
export function splitterPanels(
  keep: "start" | "end" | undefined,
  minimumCells: number[] | undefined,
): PanelLimits[] | undefined {
  if (keep === undefined && minimumCells === undefined) return undefined;
  return (["start", "end"] as const).map((id, index) => ({
    id,
    keepCells: keep === id,
    minimumCells: minimumCells?.[index],
  }));
}

/**
 * Each panel's least cells, shrunk to fit a split too small for all of them:
 * an even share of the cells each, and never less than one, so a short
 * stacked split still steps a row at a time. None for a split without a cell
 * for every panel.
 */
export function fittingMinimums(
  minimum: number | number[],
  count: number,
  totalCells: number,
): number[] | undefined {
  const least = Array.from({ length: count }, (_, index) =>
    Array.isArray(minimum) ? (minimum[index] ?? 0) : minimum,
  );
  if (least.reduce((total, cells) => total + cells, 0) <= totalCells)
    return least;
  if (totalCells < count) return undefined;
  const share = Math.max(1, Math.floor(totalCells / count));
  return least.map((cells) => Math.min(cells, share));
}

/** Snap panel sizes (percentages) so each interior boundary lands on a whole
 *  cell, a character column or a row (pass the panel space and the cell
 *  along the split), keeping every panel at least `minimumColumns` cells,
 *  one count for all or one per panel (`panelMinimums`).
 *  Falls back to the raw sizes when the container/cell size is unknown, or
 *  too small to hold every panel's least cells. */
export function snapToCharacterGrid(
  sizes: number[],
  containerWidth: number,
  characterWidth: number,
  minimumColumns: number | number[] = 8,
): number[] {
  if (!containerWidth || !characterWidth || sizes.length < 2) return sizes;
  const totalColumns = containerWidth / characterWidth;
  const fitting = fittingMinimums(minimumColumns, sizes.length, totalColumns);
  // A split without a cell for every panel, such as a stacked one its
  // container has no height for yet, is left as it is.
  if (!fitting) return sizes;
  const least = (index: number) => fitting[index]!;
  const boundaries: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < sizes.length - 1; i++) {
    cumulative += sizes[i]!;
    boundaries.push((cumulative / 100) * totalColumns);
  }
  let previous = 0;
  const columns = boundaries.map((boundary, index) => {
    const value = Math.max(previous + least(index), Math.round(boundary));
    previous = value;
    return value;
  });
  for (let i = columns.length - 1; i >= 0; i--) {
    const ceiling =
      (i === columns.length - 1 ? Math.round(totalColumns) : columns[i + 1]!) -
      least(i + 1);
    if (columns[i]! > ceiling) columns[i] = ceiling;
  }
  const out: number[] = [];
  let position = 0;
  for (const column of columns) {
    out.push(((column - position) / totalColumns) * 100);
    position = column;
  }
  out.push(((totalColumns - position) / totalColumns) * 100);
  return out;
}

/**
 * One cell (a character column, or a row stacked) as a percentage of the
 * space the panels share: the keyboard step, so an arrow key moves a
 * boundary exactly one cell. Zag's
 * own step is 1%, which on a split under 400px wide is less than half a
 * column and rounds back to where it was. 0 when nothing is measured.
 */
export function characterStep(
  panelSpace: number,
  characterWidth: number,
): number {
  return panelSpace > 0 && characterWidth > 0
    ? (characterWidth / panelSpace) * 100
    : 0;
}

/** The sizes a split starts from, in percent: `defaultSize` when it names
 *  one per panel, an even split otherwise. */
export function startingSizes(count: number, defaultSize?: number[]): number[] {
  return defaultSize?.length === count
    ? defaultSize
    : Array.from({ length: count }, () => 100 / count);
}

/**
 * The sizes after the space they share changes from `before` to `after`,
 * with each panel `kept` holding its length (its cells, once snapped) and
 * the others sharing what is left in proportion, as a terminal's sidebar
 * keeps its columns when the window widens. The sizes as they are when the
 * space has not changed, or nothing (or everything) is kept.
 */
export function keepingCells(
  sizes: number[],
  before: number,
  after: number,
  kept: boolean[],
): number[] {
  const keeping = sizes.map((_, index) => kept[index] === true);
  if (
    !(before > 0) ||
    !(after > 0) ||
    Math.abs(before - after) < 0.5 ||
    !keeping.some(Boolean) ||
    keeping.every(Boolean)
  )
    return sizes;
  const next = sizes.map((size, index) =>
    keeping[index] ? (size * before) / after : size,
  );
  const keptTotal = next.reduce(
    (total, size, index) => total + (keeping[index] ? size : 0),
    0,
  );
  const restBefore = sizes.reduce(
    (total, size, index) => total + (keeping[index] ? 0 : size),
    0,
  );
  const restAfter = 100 - keptTotal;
  // The kept panels cannot take more than the whole: left as they are.
  if (restAfter <= 0 || restBefore <= 0) return sizes;
  return next.map((size, index) =>
    keeping[index] ? size : (size / restBefore) * restAfter,
  );
}

/** What a split remembers of a track that left: its length in cells, and
 *  the neighbor that took them (with that neighbor's length before). */
export interface TrackMemory {
  cells: number;
  to?: string;
  before: number;
}

/**
 * The sizes (percent) for a new set of tracks, from the sizes the old set
 * had, in cells, the tracks that stay keeping theirs: a track that leaves
 * hands its cells (and its handle's) to its neighbor, the next track that
 * stays or else the one before, and `memory` keeps them under its id; a
 * track that comes back takes back what that neighbor still holds beyond
 * its length before, down to the neighbor's least, and anything short of
 * its own least from the others; a new track takes its default share
 * (`defaultSize` when it names one per track, an even share otherwise) from
 * its neighbors, then the others, each down to its least (its
 * `defaultCells`, where `defaultCells` names a count for it). `total` is the
 * cells the new set shares (one handle a cell each, so the old set's is
 * `total` plus the change in count). The starting sizes when nothing is
 * measured, or the new set holds none of the old.
 *
 * `redistribute: 'proportional'` shares the change among the tracks that
 * stay instead, in proportion to their lengths: a track that leaves frees
 * its cells to all of them, and one that joins (at its length before, or its
 * default share) takes its cells from all of them. A track in `keeping`
 * holds its cells while any other can give or take.
 */
export function carrySizes({
  previousIds,
  previousSizes,
  ids,
  total,
  minimums,
  defaultSize,
  defaultCells = {},
  memory,
  redistribute = "neighbor",
  keeping = [],
}: {
  previousIds: string[];
  previousSizes: number[];
  ids: string[];
  total: number;
  minimums: Record<string, number>;
  defaultSize?: number[];
  defaultCells?: Record<string, number>;
  memory: Map<string, TrackMemory>;
  redistribute?: Redistribution;
  keeping?: string[];
}): number[] {
  const starting = startingSizes(ids.length, defaultSize);
  const kept = ids.filter((id) => previousIds.includes(id));
  if (
    !(total > 0) ||
    previousSizes.length !== previousIds.length ||
    kept.length === 0
  )
    return starting;
  const previousTotal = total + ids.length - previousIds.length;
  const cells = new Map<string, number>();
  previousIds.forEach((id, index) =>
    cells.set(id, (previousSizes[index]! / 100) * previousTotal),
  );
  const least = (id: string) => minimums[id] ?? 0;
  // The lengths as sizes: float noise, or cells nobody could take, go to the
  // last track that stayed.
  const settle = () => {
    const lengths = ids.map((id) => cells.get(id) ?? 0);
    const sum = lengths.reduce((all, length) => all + length, 0);
    if (!(sum > 0)) return starting;
    const last = ids.lastIndexOf(kept[kept.length - 1]!);
    lengths[last]! += total - sum;
    return lengths.map((length) => (length / total) * 100);
  };
  if (redistribute === "proportional") {
    // The cells the leaving tracks free, their handles' included, less what
    // the joining tracks take, theirs included: shared by the tracks that
    // stay, each in proportion to its length.
    let change = 0;
    previousIds.forEach((id) => {
      if (ids.includes(id)) return;
      const length = cells.get(id) ?? 0;
      memory.set(id, { cells: length, before: 0 });
      change += length + 1;
      cells.delete(id);
    });
    ids.forEach((id, index) => {
      if (previousIds.includes(id)) return;
      const length = Math.max(
        least(id),
        memory.get(id)?.cells ??
          defaultCells[id] ??
          (starting[index]! / 100) * total,
      );
      memory.delete(id);
      cells.set(id, length);
      change -= length + 1;
    });
    const giving = kept.some((id) => !keeping.includes(id))
      ? kept.filter((id) => !keeping.includes(id))
      : kept;
    const shared = giving.reduce((all, id) => all + cells.get(id)!, 0);
    if (shared > 0)
      for (const id of giving)
        cells.set(
          id,
          Math.max(least(id), cells.get(id)! * ((shared + change) / shared)),
        );
    return settle();
  }
  // The tracks that leave hand their cells, and their handle's, to a
  // neighbor that stays.
  previousIds.forEach((id, index) => {
    if (ids.includes(id)) return;
    const after = previousIds
      .slice(index + 1)
      .find((other) => kept.includes(other));
    const before = previousIds
      .slice(0, index)
      .reverse()
      .find((other) => kept.includes(other));
    const to = after ?? before;
    const length = cells.get(id) ?? 0;
    memory.set(id, { cells: length, to, before: to ? cells.get(to)! : 0 });
    if (to) cells.set(to, cells.get(to)! + length + 1);
    cells.delete(id);
  });
  // Take up to `need` cells from `sources` in turn, each down to its least,
  // or to `floor` where one is given; returns what was taken.
  const take = (
    need: number,
    sources: { id: string; floor?: number }[],
  ): number => {
    let taken = 0;
    for (const { id, floor } of sources) {
      if (taken >= need) break;
      const length = cells.get(id);
      if (length === undefined) continue;
      const spare = Math.max(0, length - Math.max(least(id), floor ?? 0));
      const share = Math.min(spare, need - taken);
      cells.set(id, length - share);
      taken += share;
    }
    return taken;
  };
  const byLength = (except: string[]) =>
    [...cells.keys()]
      .filter((id) => !except.includes(id))
      .sort((first, second) => cells.get(second)! - cells.get(first)!)
      .map((id) => ({ id }));
  // A track that joins takes its handle's cell and its length.
  ids.forEach((id, index) => {
    if (previousIds.includes(id)) return;
    const remembered = memory.get(id);
    const neighbors = [ids[index + 1], ids[index - 1]].filter(
      (other): other is string => other !== undefined && cells.has(other),
    );
    let length = 0;
    if (remembered) {
      // Back from the neighbor that took it, as far as it still holds more
      // than it had; short of its least, from the others.
      if (remembered.to && cells.has(remembered.to))
        length += take(remembered.cells + 1, [
          { id: remembered.to, floor: remembered.before },
        ]);
      const want = least(id) + 1;
      if (length < want)
        length += take(want - length, [
          ...neighbors.map((other) => ({ id: other })),
          ...byLength(neighbors),
        ]);
    } else {
      const share = (defaultCells[id] ?? (starting[index]! / 100) * total) + 1;
      length += take(share, [
        ...neighbors.map((other) => ({ id: other })),
        ...byLength(neighbors),
      ]);
    }
    memory.delete(id);
    cells.set(id, Math.max(0, length - 1));
  });
  return settle();
}

/** How a split shares the cells when its tracks change: `'neighbor'`, a
 *  leaving track's cells to the one beside it, or `'proportional'`, to
 *  every track that stays, by its length. */
export type Redistribution = "neighbor" | "proportional";

/**
 * `carrySizes` for a split as laid out in `element`: the cells its tracks
 * will share, its content less a cell per handle the new set has (whatever
 * handles are in the document yet), and each new track's least
 * (`panelMinimums`).
 */
export function carrySizesIn(
  element: HTMLElement | null | undefined,
  {
    orientation,
    previousIds,
    previousSizes,
    panels,
    defaultSize,
    memory,
    redistribute,
  }: {
    orientation: SplitOrientation;
    previousIds: string[];
    previousSizes: number[];
    panels: PanelLimits[];
    defaultSize?: number[];
    memory: Map<string, TrackMemory>;
    redistribute?: Redistribution;
  },
): number[] {
  const ids = panels.map((panel) => panel.id);
  const cell = element ? measureCellSize(element, orientation) : 0;
  let total = 0;
  if (element && cell > 0) {
    // The content box, less a cell per handle: a handle the new set has but
    // the grid has no track for yet measures nothing.
    const style = getComputedStyle(element);
    const content =
      orientation === "horizontal"
        ? element.clientWidth -
          (parseFloat(style.paddingLeft) || 0) -
          (parseFloat(style.paddingRight) || 0)
        : element.clientHeight -
          (parseFloat(style.paddingTop) || 0) -
          (parseFloat(style.paddingBottom) || 0);
    total = content / cell - (ids.length - 1);
  }
  const least = panelMinimums(panels, orientation);
  return carrySizes({
    previousIds,
    previousSizes,
    ids,
    total,
    minimums: Object.fromEntries(
      ids.map((id, index) => [id, least[index] ?? 0]),
    ),
    defaultSize,
    defaultCells: Object.fromEntries(
      panels.flatMap((panel) =>
        typeof panel.defaultCells === "number"
          ? [[panel.id, panel.defaultCells]]
          : [],
      ),
    ),
    memory,
    redistribute,
    keeping: panels.flatMap((panel) => (panel.keepCells ? [panel.id] : [])),
  });
}

/** A charcell part that fills its container (`fill`), by its modifier. */
const FILLING = '[class*="--fill"]';

/**
 * The cells `elements` take along the split at their content's own length,
 * the longest of them, in whole cells: each is laid out at `max-content` for
 * the measurement and put back at once, so nothing paints in between. A
 * part inside that fills its container grows from nothing along a column,
 * so for the measurement it starts at its own content too, and a scroller
 * inside keeps its offset. 0 when there is nothing to measure.
 */
export function measureContentCells(
  elements: (HTMLElement | null | undefined)[],
  orientation: SplitOrientation,
  cell: number,
): number {
  if (!(cell > 0)) return 0;
  const horizontal = orientation === "horizontal";
  let longest = 0;
  for (const element of elements) {
    if (!element) continue;
    const { style } = element;
    const saved = [
      style.flex,
      style.alignSelf,
      style.width,
      style.height,
    ] as const;
    const filling = [...element.querySelectorAll<HTMLElement>(FILLING)].map(
      (part) => [part, part.style.flexBasis] as const,
    );
    style.flex = "none";
    style.alignSelf = "start";
    if (horizontal) style.width = "max-content";
    else style.height = "max-content";
    // Laid out at its own length, a scroller in it has nothing to scroll and
    // drops its offset: each is put back where it was.
    const scrolled = [...element.querySelectorAll<HTMLElement>("*")]
      .filter((each) => each.scrollTop !== 0 || each.scrollLeft !== 0)
      .map((each) => [each, each.scrollTop, each.scrollLeft] as const);
    for (const [part] of filling) part.style.flexBasis = "content";
    const box = element.getBoundingClientRect();
    longest = Math.max(longest, horizontal ? box.width : box.height);
    [style.flex, style.alignSelf, style.width, style.height] = saved;
    for (const [part, basis] of filling) part.style.flexBasis = basis;
    for (const [each, top, left] of scrolled) {
      if (each.scrollTop !== top) each.scrollTop = top;
      if (each.scrollLeft !== left) each.scrollLeft = left;
    }
  }
  return Math.ceil(longest / cell - 0.001);
}

/**
 * The sizes (percent) a split starts at when its panels name a start in
 * cells (`defaultCells`): a count, or the content's own (`content`, from
 * `measure`), up to the panel's `contentCap` share and at least its least;
 * the rest shared by the others as `defaultSize` shares it among them, or
 * evenly. Undefined when no panel names one, or nothing is measured.
 */
export function startingFromCells({
  panels,
  total,
  measure,
  defaultSize,
  orientation = "horizontal",
}: {
  panels: PanelLimits[];
  total: number;
  measure: (id: string) => number;
  defaultSize?: number[];
  orientation?: SplitOrientation;
}): number[] | undefined {
  if (!(total > 0) || !panels.some((panel) => panel.defaultCells !== undefined))
    return undefined;
  const least = panelMinimums(panels, orientation);
  const fixed = panels.map((panel, index) => {
    if (panel.defaultCells === undefined) return undefined;
    const wanted =
      panel.defaultCells === "content"
        ? Math.min(
            measure(panel.id),
            Math.floor(((panel.contentCap ?? 50) / 100) * total),
          )
        : panel.defaultCells;
    return Math.max(least[index]!, wanted);
  });
  const fixedTotal = fixed.reduce<number>(
    (all, cells) => all + (cells ?? 0),
    0,
  );
  const rest = panels.map((_, index) => fixed[index] === undefined);
  const restCount = rest.filter(Boolean).length;
  if (fixedTotal >= total && restCount > 0) return undefined;
  const shares =
    defaultSize?.length === panels.length ? defaultSize : panels.map(() => 1);
  const restShares = shares.reduce(
    (all, share, index) => all + (rest[index] ? share : 0),
    0,
  );
  const left = total - fixedTotal;
  const cells = panels.map(
    (_, index) =>
      fixed[index] ??
      (restShares > 0 ? (shares[index]! / restShares) * left : 0),
  );
  // With no panel left to take the rest, the last one does.
  if (restCount === 0) cells[cells.length - 1]! += left;
  return cells.map((length) => (length / total) * 100);
}

/**
 * The sizes with each of `joined` (panels that joined the set, starting at
 * their content) at its content's cells, up to its `contentCap` share and at
 * least its least, the difference taken from or given to its neighbor (the
 * next panel, else the one before), down to the neighbor's least; the rest
 * keep theirs. `measure` gives a panel's content in cells (0 when it has
 * none yet, which leaves it as it is).
 */
export function fitJoined({
  sizes,
  panels,
  joined,
  total,
  measure,
  orientation = "horizontal",
}: {
  sizes: number[];
  panels: PanelLimits[];
  joined: string[];
  total: number;
  measure: (id: string) => number;
  orientation?: SplitOrientation;
}): number[] {
  if (!(total > 0) || sizes.length !== panels.length) return sizes;
  const least = panelMinimums(panels, orientation);
  const cells = sizes.map((size) => (size / 100) * total);
  for (const id of joined) {
    const index = panels.findIndex((panel) => panel.id === id);
    const content = index >= 0 ? measure(id) : 0;
    if (!(content > 0)) continue;
    const cap = Math.floor(((panels[index]!.contentCap ?? 50) / 100) * total);
    const wanted = Math.max(least[index]!, Math.min(content, cap));
    const neighbor = index + 1 < panels.length ? index + 1 : index - 1;
    if (neighbor < 0) continue;
    // The neighbor gives what it can above its least, or takes the excess.
    const change = Math.min(
      wanted - cells[index]!,
      cells[neighbor]! - least[neighbor]!,
    );
    cells[index]! += change;
    cells[neighbor]! -= change;
  }
  return cells.map((length) => (length / total) * 100);
}

/** The panels of a new set that start at their content: new to the split,
 *  with no remembered length, and `defaultCells: 'content'`. */
export function joiningAtContent(
  panels: PanelLimits[],
  previousIds: string[],
  memory: Map<string, TrackMemory>,
): string[] {
  return panels
    .filter(
      (panel) =>
        panel.defaultCells === "content" &&
        !previousIds.includes(panel.id) &&
        !memory.has(panel.id),
    )
    .map((panel) => panel.id);
}

/**
 * A split's start, as the drivers hold it: none once `settled` (the reader
 * has moved the split, or its set changed with no panel joining at its
 * content); the `joined` panels fitted to their content when some joined
 * (`fitJoined`); else the start in cells (`startingFromCells`). `content`
 * gives the elements a panel's content lies in.
 */
export function splitStart({
  settled,
  joined,
  sizes,
  panels,
  space,
  cell,
  content,
  defaultSize,
  orientation,
}: {
  settled: boolean;
  joined: string[];
  sizes: number[];
  panels: PanelLimits[];
  space: number;
  cell: number;
  content: (id: string) => (HTMLElement | null)[];
  defaultSize?: number[];
  orientation: SplitOrientation;
}): number[] | undefined {
  if (settled || !(cell > 0)) return undefined;
  const total = space / cell;
  const measure = (id: string) =>
    measureContentCells(content(id), orientation, cell);
  if (joined.length)
    return fitJoined({ sizes, panels, joined, total, measure, orientation });
  return startingFromCells({
    panels,
    total,
    measure,
    defaultSize,
    orientation,
  });
}

/**
 * The sizes a split starts at, as laid out in `element`: its panels' cells
 * (`defaultCells`) or `defaultSize`, held on the grid. Where `resetSizes`
 * puts a split back to; undefined while nothing is measured.
 */
export function startingSizesIn(
  element: HTMLElement | null | undefined,
  {
    panels,
    defaultSize,
    orientation,
    content,
  }: {
    panels: PanelLimits[];
    defaultSize?: number[];
    orientation: SplitOrientation;
    content: (id: string) => (HTMLElement | null)[];
  },
): number[] | undefined {
  if (!element) return undefined;
  const space = measurePanelSpace(element, orientation);
  const cell = measureCellSize(element, orientation);
  if (!(space > 0) || !(cell > 0)) return undefined;
  const start =
    splitStart({
      settled: false,
      joined: [],
      sizes: [],
      panels,
      space,
      cell,
      content,
      defaultSize,
      orientation,
    }) ?? startingSizes(panels.length, defaultSize);
  return snapToCharacterGrid(
    start,
    space,
    cell,
    panelMinimums(panels, orientation),
  );
}

/** The content a standing start watches: the joined panels', or every
 *  panel's that starts at its content; none once settled. */
export function startContent(
  settled: boolean,
  joined: string[],
  panels: PanelLimits[],
  content: (id: string) => (HTMLElement | null)[],
): (HTMLElement | null)[] {
  if (settled) return [];
  const ids = joined.length
    ? joined
    : panels
        .filter((panel) => panel.defaultCells === "content")
        .map((panel) => panel.id);
  return ids.flatMap(content);
}

/** Whether two size vectors differ beyond float noise. */
export function sizesDiffer(first: number[], second: number[]): boolean {
  return (
    first.length !== second.length ||
    first.some((value, i) => Math.abs(value - second[i]!) > 0.01)
  );
}

/**
 * Keeps a split on the character grid (columns side by side, rows stacked)
 * when no drag is happening. The drag
 * snaps through `onResize`, but the starting sizes (an even split, or the
 * consumer's `defaultSize`) and a container that changes width land between
 * columns until then, so the first drag would jump every boundary. Snaps
 * at once, again when the fonts have loaded (the cell width is the face's),
 * and whenever the root resizes; `apply` runs only when the sizes change, and
 * `step` hears the keyboard step (`characterStep`) for the width it measured.
 * `panels` gives each panel's least cells (`panelMinimums`). `start` gives
 * the sizes to stand at instead, asked at every hold (a start in cells,
 * `startingFromCells`, which the driver stops giving once the reader has
 * moved the split or its panel set has changed): the face loading, a split
 * around this one settling, or the content `observe` gives (watched while it
 * gives any, down to everything in it) mounting or changing size measures it
 * again. Returns the cleanup.
 */
/** A change that can change what content measures: not the bookkeeping a
 *  ScrollArea's engine writes on its own parts as it scrolls (its thumbs,
 *  its bars, the space it adds after its content). */
const changesContent = (record: MutationRecord) =>
  record.type !== "attributes" ||
  !(record.target instanceof Element) ||
  ![...record.target.classList].some((name) =>
    name.startsWith("CharcellScrollArea__"),
  );

export function holdCharacterGrid(
  root: HTMLElement,
  sizes: () => number[],
  apply: (sizes: number[]) => void,
  step?: (percent: number) => void,
  orientation: SplitOrientation = "horizontal",
  panels?: () => PanelLimits[],
  start?: (space: number, cell: number) => number[] | undefined,
  observe?: () => (Element | null | undefined)[],
): () => void {
  let active = true;
  // The space the sizes were last held against: a panel that keeps its cells
  // is measured in it.
  let held = 0;
  const snap = () => {
    if (!active) return;
    const space = measurePanelSpace(root, orientation);
    const character = measureCellSize(root, orientation);
    const kept = panels?.().map((panel) => panel.keepCells === true) ?? [];
    const before = sizes();
    const current =
      start?.(space, character) ?? keepingCells(before, held, space, kept);
    if (space > 0) held = space;
    const next = snapToCharacterGrid(
      current,
      space,
      character,
      panels ? panelMinimums(panels(), orientation) : minimumCells(orientation),
    );
    if (sizesDiffer(before, next)) apply(next);
    const percent = characterStep(space, character);
    if (percent) step?.(percent);
  };
  const observer =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(() => hold());
  // The content a start measures, watched while the start stands: content
  // that mounts after the split does, anything in it that changes size (an
  // image loading), or a style or class that sets a size only its own
  // length shows (a frame told its height while the cell stretches it)
  // measures again. A cell's own box is the split's, so what it holds is
  // watched too.
  const watched = new Set<Element>();
  const mutations =
    observe && typeof MutationObserver !== "undefined"
      ? new MutationObserver((records) => {
          if (records.some(changesContent)) hold();
        })
      : undefined;
  const hold = () => {
    snap();
    // The measuring sets and restores the content's style: not a change.
    mutations?.takeRecords();
    const content = observe?.() ?? [];
    if (content.length === 0) {
      mutations?.disconnect();
      for (const element of watched) observer?.unobserve(element);
      watched.clear();
      return;
    }
    for (const element of content) {
      if (!element) continue;
      for (const each of [element, ...element.querySelectorAll("*")]) {
        if (watched.has(each)) continue;
        watched.add(each);
        observer?.observe(each);
      }
    }
  };
  mutations?.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"],
  });
  hold();
  document.fonts?.ready.then(hold);
  observer?.observe(root);
  return () => {
    active = false;
    observer?.disconnect();
    mutations?.disconnect();
  };
}

/**
 * A panel's props with its `flex` restated at full precision. Zag writes a
 * panel's size as `flex-grow` to three significant digits (49.949 becomes
 * 49.9), about a pixel on a wide pane, which puts a snapped boundary back
 * between columns. The style is an object (React's in longhands, Vue's as
 * `flex`) or a string (Svelte).
 */
export function exactPanelFlex<Props extends { style?: unknown }>(
  props: Props,
  size: number | undefined,
): Props {
  if (size === undefined) return props;
  const flex = `${size} 1 0px`;
  const { style } = props;
  if (typeof style === "string") {
    const pattern = /(^|;)\s*flex\s*:[^;]*/;
    return {
      ...props,
      style: pattern.test(style)
        ? style.replace(pattern, `$1flex:${flex}`)
        : `${style}flex:${flex};`,
    };
  }
  const record = (style as Record<string, unknown> | undefined) ?? {};
  // React's style carries the longhands, which a shorthand beside them would
  // fight; restate the one that holds the size.
  return {
    ...props,
    style:
      "flexGrow" in record
        ? { ...record, flexGrow: size }
        : { ...record, flex },
  };
}

/**
 * The splitter api with every panel's `flex` at full precision
 * (`exactPanelFlex`), for the drivers that hold the snapped sizes; the api
 * itself when they hold none.
 */
export function withExactPanels<
  Api extends { getPanelProps: (props: { id: string }) => { style?: unknown } },
>(api: Api, panelIds: string[], sizes: number[] | undefined): Api {
  if (!sizes) return api;
  return {
    ...api,
    getPanelProps: (props: { id: string }) =>
      exactPanelFlex(
        api.getPanelProps(props),
        sizes[panelIds.indexOf(props.id)],
      ),
  };
}

/**
 * The panels as Zag's splitter machine takes them: copies, since the machine
 * sorts its panels in place and a consumer's array may be state, with the
 * limits under Zag's names.
 */
export function zagPanels(
  panels: readonly PanelLimits[],
): { id: string; minSize?: number; maxSize?: number }[] {
  return panels.map(({ id, minimumSize, maximumSize }) => ({
    id,
    minSize: minimumSize,
    maxSize: maximumSize,
  }));
}

/** A panel's limits as the drivers take them: in percent, and, snapping, in
 *  cells. */
export interface PanelLimits {
  id: string;
  /** The least the panel takes, in percent of the split. */
  minimumSize?: number;
  /** The most the panel takes, in percent of the split. */
  maximumSize?: number;
  /** The least the panel keeps, in whole cells (columns side by side, rows
   *  stacked), held by the snapping. */
  minimumCells?: number;
  /** The panel keeps its cells when the split resizes, the others taking
   *  the difference. */
  keepCells?: boolean;
  /** Where the panel starts, in whole cells: a count, or `'content'`, the
   *  length its content takes, up to `contentCap`. Over `defaultSize`. */
  defaultCells?: number | "content";
  /** The most a panel starting at its content takes, in percent of the
   *  split (50 by default). */
  contentCap?: number;
}

/**
 * The sizes with one boundary (between panel `boundary` and the next) moved
 * by whole cells, `cells` negative toward the start: clamped to both panels'
 * limits and their least cells (one count, or one per panel), then snapped.
 * The sizes as they are when nothing is measured or the boundary cannot
 * move.
 */
export function stepBoundary(
  sizes: number[],
  boundary: number,
  cells: number,
  panelSpace: number,
  cellSize: number,
  minimum: number | number[],
  panels: PanelLimits[] = [],
): number[] {
  const second = boundary + 1;
  if (!panelSpace || !cellSize || second >= sizes.length) return sizes;
  const cellPercent = (cellSize / panelSpace) * 100;
  const fitting = fittingMinimums(minimum, sizes.length, panelSpace / cellSize);
  if (!fitting) return sizes;
  const least = (index: number) => fitting[index]!;
  const lower = (index: number) =>
    Math.max(least(index) * cellPercent, panels[index]?.minimumSize ?? 0);
  const upper = (index: number) => panels[index]?.maximumSize ?? 100;
  let move = cells * cellPercent;
  move = Math.max(
    move,
    lower(boundary) - sizes[boundary]!,
    sizes[second]! - upper(second),
  );
  move = Math.min(
    move,
    upper(boundary) - sizes[boundary]!,
    sizes[second]! - lower(second),
  );
  if (Math.abs(move) < 0.001) return sizes;
  const next = [...sizes];
  next[boundary]! += move;
  next[second]! -= move;
  return snapToCharacterGrid(next, panelSpace, cellSize, minimum);
}

/**
 * The splitter api with each resize trigger stepping one cell per arrow key
 * from the sizes the driver holds. Zag steps from its own copy of the sizes,
 * which catches up with a controlled `size` only after the render, so a
 * second press soon after the first stepped from the old boundary and was
 * lost or doubled. A plain arrow along the split is handled here and marked
 * handled, so Zag's own handler leaves it; shift, home and end stay Zag's.
 */
export function withCellSteps<
  Api extends {
    getResizeTriggerProps(props: { id: string; disabled?: boolean }): object;
  },
>(
  api: Api,
  options: {
    panels: PanelLimits[];
    sizes: () => number[] | undefined;
    apply: (sizes: number[]) => void;
    orientation: SplitOrientation;
  },
): Api {
  const keys: Record<string, number> =
    options.orientation === "horizontal"
      ? { ArrowLeft: -1, ArrowRight: 1 }
      : { ArrowUp: -1, ArrowDown: 1 };
  return {
    ...api,
    getResizeTriggerProps(props: { id: string; disabled?: boolean }) {
      const triggerProps = api.getResizeTriggerProps(props) as Record<
        string,
        unknown
      >;
      // React's `onKeyDown`, Vue's `onKeydown`, Svelte's `onkeydown`.
      const name = Object.keys(triggerProps).find(
        (key) => key.toLowerCase() === "onkeydown",
      );
      if (!name || props.disabled) return triggerProps;
      const original = triggerProps[name] as
        ((event: KeyboardEvent) => void) | undefined;
      const handle = (event: KeyboardEvent) => {
        // Side by side on a right-to-left page, the earlier panel is on the
        // right: the left arrow moves its boundary left, growing it.
        const target = event.currentTarget as HTMLElement | null;
        const mirrored =
          options.orientation === "horizontal" &&
          target !== null &&
          getComputedStyle(target).direction === "rtl";
        const cells =
          keys[event.key] === undefined
            ? undefined
            : keys[event.key]! * (mirrored ? -1 : 1);
        const sizes = options.sizes();
        // The handles are the root's children (`measurePanelSpace`).
        const root = (event.currentTarget as HTMLElement | null)?.parentElement;
        const boundary = options.panels.findIndex(
          (panel) => panel.id === props.id.split(":")[0],
        );
        if (
          cells &&
          !event.shiftKey &&
          !event.defaultPrevented &&
          sizes &&
          root &&
          boundary >= 0
        ) {
          event.preventDefault();
          const next = stepBoundary(
            sizes,
            boundary,
            cells,
            measurePanelSpace(root, options.orientation),
            measureCellSize(root, options.orientation),
            panelMinimums(options.panels, options.orientation),
            options.panels,
          );
          if (sizesDiffer(sizes, next)) options.apply(next);
        }
        original?.(event);
      };
      return { ...triggerProps, [name]: handle };
    },
  } as Api;
}

/**
 * The splitter api with each resize trigger holding the pointer it is
 * pressed with, so a drag follows the pointer wherever it goes. Zag follows
 * a drag on the document, which hears nothing while the pointer is over an
 * iframe in a panel: a drag quicker than the handle snaps along froze there,
 * and its release never came. The held pointer's events go to the handle
 * and up to the document, wherever it moves.
 */
export function withHeldPointer<
  Api extends {
    getResizeTriggerProps(props: { id: string; disabled?: boolean }): object;
  },
>(api: Api): Api {
  // React's `onPointerDown`, Vue's `onPointerdown`, Svelte's `onpointerdown`,
  // named as each names its key handler.
  const pointerDownNames: Record<string, string> = {
    onKeyDown: "onPointerDown",
    onKeydown: "onPointerdown",
    onkeydown: "onpointerdown",
  };
  return {
    ...api,
    getResizeTriggerProps(props: { id: string; disabled?: boolean }) {
      const triggerProps = api.getResizeTriggerProps(props) as Record<
        string,
        unknown
      >;
      const keyName = Object.keys(triggerProps).find(
        (key) => key in pointerDownNames,
      );
      if (!keyName || props.disabled) return triggerProps;
      const name = pointerDownNames[keyName]!;
      const original = triggerProps[name] as
        ((event: PointerEvent) => void) | undefined;
      const handle = (event: PointerEvent) => {
        const trigger = event.currentTarget as HTMLElement | null;
        if (event.button === 0 && trigger?.setPointerCapture) {
          try {
            trigger.setPointerCapture(event.pointerId);
          } catch {
            // A pointer already gone, released before the handler ran.
          }
        }
        original?.(event);
      };
      return { ...triggerProps, [name]: handle };
    },
  } as Api;
}

/**
 * The splitter api with `resetSizes` putting the split back where it
 * started. Zag resets to the sizes it last met, and a snapping split hands
 * it new ones at every step, so its own reset would leave the split as it
 * is.
 */
export function withReset<Api extends { resetSizes: () => void }>(
  api: Api,
  reset: () => void,
): Api {
  return { ...api, resetSizes: reset };
}

/** Props with `overflow` left out of their style: an object (React's and
 *  Vue's) or a string (Svelte's). */
function withoutOverflow<Props extends { style?: unknown }>(
  props: Props,
): Props {
  const { style } = props;
  if (typeof style === "string")
    return {
      ...props,
      style: style.replace(/(^|;)\s*overflow\s*:[^;]*;?/g, "$1"),
    };
  if (!style || typeof style !== "object" || !("overflow" in style))
    return props;
  const { overflow: _overflow, ...rest } = style as Record<string, unknown>;
  return { ...props, style: rest };
}

/**
 * The splitter api with Zag's `overflow: hidden` taken off the root and the
 * panels, so a ruled handle's joined ends reach the lines past the split and
 * a joined line in a panel reaches the handle beside it. The stylesheet
 * clips a panel's content instead, a cell out (`SplitterVisual`).
 */
export function withOpenEdges<
  Api extends {
    getRootProps: () => { style?: unknown };
    getPanelProps: (props: { id: string }) => { style?: unknown };
  },
>(api: Api): Api {
  return {
    ...api,
    getRootProps: () => withoutOverflow(api.getRootProps()),
    getPanelProps: (props: { id: string }) =>
      withoutOverflow(api.getPanelProps(props)),
  };
}
