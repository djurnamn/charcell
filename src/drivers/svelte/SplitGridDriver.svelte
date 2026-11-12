<script lang="ts">
  import type { Snippet } from "svelte";
  import { type TextDirection } from "charcell/scripts/direction";
  import { registry as splitterRegistry } from "@zag-js/splitter";
  import {
    cellId,
    crossedAt,
    crossedClass,
    handleControls,
    gridTemplate,
    gripPlace,
    handleLine,
    isCrossed,
    panelLine,
    styleOf,
    withStyle,
    withoutStyle,
  } from "charcell/scripts/split-grid";
  import { type Redistribution } from "charcell/scripts/character-snap";
  import {
    useSnappedSplitter,
    type SplitterApi,
  } from "./actions/snapped-splitter.svelte";
  import { type SplitterPanelSpecification } from "charcell/scripts/snapped-split";

  /**
   * `SplitGridDriver` (Svelte) - pure behavior for a grid of panels, the
   * cross-target counterpart: two Zag `splitter` machines, one per axis,
   * sharing one registry, handed to a scoped snippet (`children({ grid })`).
   * See the React driver for the contract.
   */
  type SplitGridScope = {
    columns: string[];
    rows: string[];
    rootProps: Record<string, unknown>;
    gridProps: Record<string, unknown>;
    cellProps: (column: number, row: number) => Record<string, unknown>;
    columnHandleProps: (index: number) => Record<string, unknown>;
    rowHandleProps: (index: number) => Record<string, unknown>;
    rowHandleRowProps: (index: number) => Record<string, unknown>;
    columnsApi: SplitterApi;
    rowsApi: SplitterApi;
  };

  let {
    columns,
    rows,
    defaultColumnSize = undefined,
    defaultRowSize = undefined,
    snap = "character",
    redistribute = "neighbor",
    direction = undefined,
    children,
  }: {
    /** The columns, left to right: their ids, and their limits. */
    columns: SplitterPanelSpecification[];
    /** The rows, top to bottom. */
    rows: SplitterPanelSpecification[];
    /** The columns' starting sizes, in percent. */
    defaultColumnSize?: number[];
    /** The rows' starting sizes, in percent. */
    defaultRowSize?: number[];
    /** Boundaries snap to whole columns and rows; `'none'` opts out. */
    snap?: "character" | "none";
    /** How the cells are shared when the columns or rows change: a leaving
     *  track's to its neighbor (`'neighbor'`), or to every track that stays,
     *  by its length (`'proportional'`). */
    redistribute?: Redistribution;
    /** The reading direction its keys follow: the page's, once mounted, when
     *  unset. */
    direction?: TextDirection;
    children?: Snippet<[{ grid: SplitGridScope }]>;
  } = $props();

  const id = $props.id();
  const registry = splitterRegistry();
  // A track's content is its cells, found by id on the grid.
  const cellsOf = (column: string | undefined, row: string | undefined) =>
    (column ? [column] : columns.map((track) => track.id)).flatMap((columnId) =>
      (row ? [row] : rows.map((track) => track.id)).map((rowId) =>
        document.getElementById(
          cellId(String(columnSplit.api.getRootProps().id), columnId, rowId),
        ),
      ),
    );
  const columnSplit = useSnappedSplitter(
    () => ({
      direction,
      orientation: "horizontal",
      panels: columns,
      defaultSize: defaultColumnSize,
      snap,
      redistribute,
      registry,
      contentOf: (track) => cellsOf(track, undefined),
    }),
    `${id}-columns`,
  );
  const rowSplit = useSnappedSplitter(
    () => ({
      direction,
      orientation: "vertical",
      panels: rows,
      defaultSize: defaultRowSize,
      snap,
      redistribute,
      registry,
      // The rows' root wraps the grid, which holds their handles.
      measure: () => {
        const gridId = columnSplit.api.getRootProps().id;
        return typeof gridId === "string"
          ? document.getElementById(gridId)
          : null;
      },
      contentOf: (track) => cellsOf(undefined, track),
    }),
    `${id}-rows`,
  );

  // The handle the pointer passes over as well, on a crossing.
  let crossed = $state<ReturnType<typeof crossedAt>>();
  const cross = (next: ReturnType<typeof crossedAt>) => {
    if (crossed?.axis !== next?.axis || crossed?.index !== next?.index)
      crossed = next;
  };

  const grid: SplitGridScope = $derived.by(() => {
    const columnIds = columns.map((column) => column.id);
    const rowIds = rows.map((row) => row.id);
    return {
      columns: columnIds,
      rows: rowIds,
      rootProps: withoutStyle(rowSplit.api.getRootProps()),
      gridProps: {
        ...withoutStyle(columnSplit.api.getRootProps()),
        // A drag outruns the crossing's cell: the pair stays marked until it ends.
        onpointerover: (event: PointerEvent) =>
          event.buttons === 0 && cross(crossedAt(event.target)),
        onpointerleave: () => cross(undefined),
        style: styleOf(
          {
            "--charcell-split-grid--columns": gridTemplate(
              columnSplit.sizes,
              "1ch",
            ),
            "--charcell-split-grid--rows": gridTemplate(
              rowSplit.sizes,
              "var(--charcell-row)",
            ),
          },
          "string",
        ),
      },
      cellProps: (column: number, row: number) => ({
        id: cellId(
          String(columnSplit.api.getRootProps().id),
          columnIds[column]!,
          rowIds[row]!,
        ),
        style: styleOf(
          {
            gridColumn: String(panelLine(column)),
            gridRow: String(panelLine(row)),
          },
          "string",
        ),
      }),
      columnHandleProps: (index: number) => ({
        ...withStyle(
          columnSplit.api.getResizeTriggerProps({
            id: `${columnIds[index]}:${columnIds[index + 1]}`,
          }),
          {
            gridColumn: String(handleLine(index)),
            gridRow: "1 / -1",
          },
        ),
        "aria-controls": handleControls(
          String(columnSplit.api.getRootProps().id),
          columnIds,
          rowIds,
          "column",
          index,
        ),
        class: isCrossed(crossed, "column", index) ? crossedClass : undefined,
      }),
      rowHandleProps: (index: number) => ({
        ...withStyle(
          rowSplit.api.getResizeTriggerProps({
            id: `${rowIds[index]}:${rowIds[index + 1]}`,
          }),
          {
            gridRow: String(handleLine(index)),
            gridColumn: "1 / -1",
            ...gripPlace(columnSplit.sizes, columnSplit.step, 2, "1ch"),
          },
        ),
        "aria-controls": handleControls(
          String(columnSplit.api.getRootProps().id),
          columnIds,
          rowIds,
          "row",
          index,
        ),
        class: isCrossed(crossed, "row", index) ? crossedClass : undefined,
      }),
      rowHandleRowProps: (index: number) => ({
        style: styleOf(
          { gridRow: String(handleLine(index)), gridColumn: "1 / -1" },
          "string",
        ),
      }),
      columnsApi: columnSplit.api,
      rowsApi: rowSplit.api,
    };
  });
</script>

{@render children?.({ grid })}
