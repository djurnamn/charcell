"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { registry as splitterRegistry } from "@zag-js/splitter";
import { type TextDirection } from "charcell/scripts/direction";
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
  withStyle,
  withoutStyle,
} from "charcell/scripts/split-grid";
import { type Redistribution } from "charcell/scripts/character-snap";
import {
  useSnappedSplitter,
  type SplitterApi,
} from "./splitter/use-snapped-splitter";
import { type SplitterPanelSpecification } from "charcell/scripts/snapped-split";

/**
 * `SplitGridDriver` - pure behavior for a grid of panels: two Zag `splitter`
 * machines, one for the columns and one for the rows, laid on one CSS grid
 * (`SplitGridVisual`). Each runs on the character grid as the
 * `SplitterDriver` does, and both share one Zag registry, so a press where a
 * column's handle crosses a row's drags both. The handles are keyboard
 * separators each, stepping one cell along their own axis.
 *
 * The scoped slot (`children({ grid })`) hands the props each part spreads:
 * the root's and the grid's (its template from both sets of sizes), a
 * cell's at a column and row, and each handle's; and the column and row ids.
 */
export interface SplitGridTrack extends SplitterPanelSpecification {}

export interface SplitGridScope {
  columns: string[];
  rows: string[];
  /** The root's props: the rows' split. */
  rootProps: Record<string, unknown>;
  /** The grid's props: the columns' split and the template. */
  gridProps: Record<string, unknown>;
  /** A cell's props, at its column and row. */
  cellProps: (column: number, row: number) => Record<string, unknown>;
  /** The handle after a column, spanning every row. */
  columnHandleProps: (index: number) => Record<string, unknown>;
  /** The handle after a row, spanning every column. */
  rowHandleProps: (index: number) => Record<string, unknown>;
  /** The row over the handle after a row, holding its slots
   *  (`SplitGridHandleRow`). */
  rowHandleRowProps: (index: number) => Record<string, unknown>;
  columnsApi: SplitterApi;
  rowsApi: SplitterApi;
}

export interface SplitGridDriverProps {
  /** The columns, left to right: their ids, and their limits. */
  columns: SplitGridTrack[];
  /** The rows, top to bottom. */
  rows: SplitGridTrack[];
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
  /** Scoped slot: the parts' props. */
  /** The reading direction its keys follow: the page's, once mounted, when
   *  unset. */
  direction?: TextDirection;
  children: (scope: { grid: SplitGridScope }) => ReactNode;
}

export function SplitGridDriver({
  columns,
  rows,
  defaultColumnSize,
  defaultRowSize,
  snap = "character",
  redistribute = "neighbor",
  direction,
  children,
}: SplitGridDriverProps) {
  const [registry] = useState(() => splitterRegistry());
  // The handle the pointer passes over as well, on a crossing.
  const [crossed, setCrossed] = useState<ReturnType<typeof crossedAt>>();
  const cross = (next: ReturnType<typeof crossedAt>) =>
    setCrossed((current) =>
      current?.axis === next?.axis && current?.index === next?.index
        ? current
        : next,
    );
  // A track's content is its cells, found by id on the grid.
  const gridReference = useRef("");
  const cellsOf = (column: string | undefined, row: string | undefined) =>
    (column ? [column] : columns.map((track) => track.id)).flatMap((columnId) =>
      (row ? [row] : rows.map((track) => track.id)).map((rowId) =>
        document.getElementById(cellId(gridReference.current, columnId, rowId)),
      ),
    );
  // One id names both splits, as the Svelte grid's does.
  const splitId = useId();
  const columnSplit = useSnappedSplitter({
    id: `${splitId}-columns`,
    direction,
    orientation: "horizontal",
    panels: columns,
    defaultSize: defaultColumnSize,
    snap,
    redistribute,
    registry,
    contentOf: (id) => cellsOf(id, undefined),
  });
  const gridId = columnSplit.api.getRootProps().id;
  gridReference.current = String(gridId);
  const rowSplit = useSnappedSplitter({
    id: `${splitId}-rows`,
    direction,
    orientation: "vertical",
    panels: rows,
    defaultSize: defaultRowSize,
    snap,
    redistribute,
    registry,
    // The rows' root wraps the grid, which holds their handles.
    measure: () =>
      typeof gridId === "string" ? document.getElementById(gridId) : null,
    contentOf: (id) => cellsOf(undefined, id),
  });
  const columnIds = columns.map((column) => column.id);
  const rowIds = rows.map((row) => row.id);
  const grid: SplitGridScope = {
    columns: columnIds,
    rows: rowIds,
    rootProps: withoutStyle(rowSplit.api.getRootProps()),
    gridProps: {
      ...withoutStyle(columnSplit.api.getRootProps()),
      // A drag outruns the crossing's cell: the pair stays marked until it ends.
      onPointerOver: (event: { target: EventTarget | null; buttons: number }) =>
        event.buttons === 0 && cross(crossedAt(event.target)),
      onPointerLeave: () => cross(undefined),
      style: {
        "--charcell-split-grid--columns": gridTemplate(
          columnSplit.sizes,
          "1ch",
        ),
        "--charcell-split-grid--rows": gridTemplate(
          rowSplit.sizes,
          "var(--charcell-row)",
        ),
      },
    },
    cellProps: (column, row) => ({
      id: cellId(String(gridId), columnIds[column]!, rowIds[row]!),
      style: {
        gridColumn: String(panelLine(column)),
        gridRow: String(panelLine(row)),
      },
    }),
    columnHandleProps: (index) => ({
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
        String(gridId),
        columnIds,
        rowIds,
        "column",
        index,
      ),
      className: isCrossed(crossed, "column", index) ? crossedClass : undefined,
    }),
    rowHandleProps: (index) => ({
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
        String(gridId),
        columnIds,
        rowIds,
        "row",
        index,
      ),
      className: isCrossed(crossed, "row", index) ? crossedClass : undefined,
    }),
    rowHandleRowProps: (index) => ({
      style: { gridRow: String(handleLine(index)), gridColumn: "1 / -1" },
    }),
    columnsApi: columnSplit.api,
    rowsApi: rowSplit.api,
  };
  return children({ grid });
}
