// The SplitGrid's layout: two splits, one per axis, laid on one CSS grid.
// Each panel is a cell of the grid and each handle a track of its own
// between them, spanning the grid across, so a handle moves its boundary
// through every row (or column) at once. Shared by the three framework
// drivers (`charcell/scripts`).

/** A track's sizes and the handles between them as a grid template:
 *  each size a share of what is left (`fr`, from zero, so content never
 *  widens it), each handle `handle` long. */
export function gridTemplate(sizes: number[], handle: string): string {
  return sizes.map((size) => `minmax(0, ${size}fr)`).join(` ${handle} `);
}

/** A cell's lines on the grid, for a panel at `index` along an axis: the
 *  panels take the odd lines, the handles the even ones between. */
export const panelLine = (index: number) => 2 * index + 1;

/** A handle's line on the grid, after the panel at `index`. */
export const handleLine = (index: number) => 2 * index + 2;

/**
 * Where one grip `length` cells long sits along a handle that crosses
 * panels `cells` long, a one-cell handle between each two: the first cell
 * of the place nearest the handle's middle that covers no crossing, the
 * nearer side first and the start on a tie, so the crossing handles still
 * meet the line through it. Undefined while the sizes are unknown.
 */
export function centeredGrip(
  cells: number[],
  length: number,
): number | undefined {
  if (cells.length === 0 || cells.some((count) => !Number.isFinite(count)))
    return undefined;
  const crossings = new Set<number>();
  let at = 0;
  for (const count of cells.slice(0, -1)) {
    at += count;
    crossings.add(at);
    at += 1;
  }
  const total = at + (cells[cells.length - 1] ?? 0);
  const middle = Math.max(0, Math.floor((total - length) / 2));
  const clear = (start: number) =>
    start >= 0 &&
    start + length <= total &&
    Array.from({ length }, (_, offset) => start + offset).every(
      (cell) => !crossings.has(cell),
    );
  for (let distance = 0; distance <= total; distance++) {
    if (clear(middle - distance)) return middle - distance;
    if (clear(middle + distance)) return middle + distance;
  }
  return middle;
}

/** A panel's cells along a split, from its size and the percent one cell
 *  takes (the split's keyboard step). */
export const trackCells = (sizes: number[], step: number | undefined) =>
  step && step > 0 ? sizes.map((size) => Math.round(size / step)) : [];

/** A handle's one grip, placed by `centeredGrip` across the panels of
 *  `sizes` (percent), `step` percent a cell, as a declaration in `unit`s;
 *  none while the sizes are unknown, so the stylesheet centers it. */
export function gripPlace(
  sizes: number[],
  step: number | undefined,
  length: number,
  unit: string,
): Record<string, string> {
  const start = centeredGrip(trackCells(sizes, step), length);
  return start === undefined
    ? {}
    : { "--charcell-split-grid--grip-at": `calc(${start} * ${unit})` };
}

/** A cell's id, from its grid's and its column's and row's: how a track
 *  finds its cells to measure their content. */
export const cellId = (grid: string, column: string, row: string) =>
  `${grid}:cell:${column}:${row}`;

/** The cells a handle resizes, as its `aria-controls`: every cell of the two
 *  columns a column handle sits between, or of the two rows a row handle
 *  does. Zag would name its own panels, which a grid draws as cells. */
export function handleControls(
  grid: string,
  columns: readonly string[],
  rows: readonly string[],
  axis: "column" | "row",
  index: number,
): string {
  const ids =
    axis === "column"
      ? columns
          .slice(index, index + 2)
          .flatMap((column) => rows.map((row) => cellId(grid, column, row)))
      : rows
          .slice(index, index + 2)
          .flatMap((row) => columns.map((column) => cellId(grid, column, row)));
  return ids.join(" ");
}

/** The handle a pointer on a crossing passes over as well: where a
 *  column's handle and a row's cross, only the one on top is under the
 *  pointer, so the driver marks the other (`crossedClass`) to light both.
 *  A crossing before the span at `index` lies on the other way's handle
 *  after its track `index - 1`. Undefined off a crossing. */
export function crossedAt(
  target: EventTarget | null,
): { axis: "column" | "row"; index: number } | undefined {
  if (!(target instanceof Element)) return undefined;
  const crossing = target.closest(".CharcellSplitGrid__crossing");
  const handle = crossing?.parentElement;
  if (!crossing || !handle) return undefined;
  const index = [...handle.children]
    .filter((child) => child.classList.contains("CharcellSplitGrid__crossing"))
    .indexOf(crossing);
  return {
    axis: handle.classList.contains("CharcellSplitGrid__handle--row")
      ? "column"
      : "row",
    index,
  };
}

/** The class a crossed handle takes: lit as if under the pointer. */
export const crossedClass = "CharcellSplitGrid__handle--crossed";

/** Whether the handle after track `index` along `axis` is the one
 *  `crossed` names. */
export const isCrossed = (
  crossed: { axis: "column" | "row"; index: number } | undefined,
  axis: "column" | "row",
  index: number,
) => crossed?.axis === axis && crossed.index === index;

/** A style as each framework takes it: an object (React's and Vue's) or
 *  a string (Svelte's). */
export type StyleFor = "object" | "string";

/** Declarations in camelCase as a style in `form`, kebab-cased for a
 *  string. */
export function styleOf(
  declarations: Record<string, string>,
  form: StyleFor,
): Record<string, string> | string {
  if (form === "object") return declarations;
  return Object.entries(declarations)
    .map(
      ([property, value]) =>
        `${property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value};`,
    )
    .join("");
}

/** Props with `declarations` added to their style, of either form. */
export function withStyle<Props extends { style?: unknown }>(
  props: Props,
  declarations: Record<string, string>,
): Props {
  const { style } = props;
  if (typeof style === "string")
    return { ...props, style: style + styleOf(declarations, "string") };
  return {
    ...props,
    style: {
      ...((style as Record<string, unknown> | undefined) ?? {}),
      ...declarations,
    },
  };
}

/** Props with no style: Zag's root style lays out a flex split, which the
 *  grid replaces. */
export function withoutStyle<Props extends { style?: unknown }>(
  props: Props,
): Omit<Props, "style"> {
  const { style: _style, ...rest } = props;
  return rest;
}
