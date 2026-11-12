<script setup lang="ts">
import { computed, ref, useId } from "vue";
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
  withStyle,
  withoutStyle,
} from "charcell/scripts/split-grid";
import { type Redistribution } from "charcell/scripts/character-snap";
import { type TextDirection } from "charcell/scripts/direction";
import { useSnappedSplitter } from "./splitter/use-snapped-splitter";
import { type SplitterPanelSpecification } from "charcell/scripts/snapped-split";

/**
 * `SplitGridDriver` (Vue) - pure behavior for a grid of panels, the
 * cross-target counterpart: two Zag `splitter` machines, one per axis,
 * sharing one registry, handed to a scoped slot (`<slot :grid>`). See the
 * React driver for the contract.
 */
const props = withDefaults(
  defineProps<{
    columns: SplitterPanelSpecification[];
    rows: SplitterPanelSpecification[];
    defaultColumnSize?: number[];
    defaultRowSize?: number[];
    snap?: "character" | "none";
    redistribute?: Redistribution;
    /** The reading direction its keys follow: the page's, once mounted, when
     *  unset. */
    direction?: TextDirection;
  }>(),
  { snap: "character", redistribute: "neighbor" },
);

const registry = splitterRegistry();
// A track's content is its cells, found by id on the grid.
const cellsOf = (column: string | undefined, row: string | undefined) =>
  (column ? [column] : props.columns.map((track) => track.id)).flatMap(
    (columnId) =>
      (row ? [row] : props.rows.map((track) => track.id)).map((rowId) =>
        document.getElementById(cellId(String(gridId.value), columnId, rowId)),
      ),
  );
// One id names both splits, as the Svelte grid's does.
const splitId = useId();
const columnSplit = useSnappedSplitter(() => ({
  id: `${splitId}-columns`,
  direction: props.direction,
  orientation: "horizontal",
  panels: props.columns,
  defaultSize: props.defaultColumnSize,
  snap: props.snap,
  redistribute: props.redistribute,
  registry,
  contentOf: (id) => cellsOf(id, undefined),
}));
const gridId = computed(() => columnSplit.api.value.getRootProps().id);
const rowSplit = useSnappedSplitter(() => ({
  id: `${splitId}-rows`,
  direction: props.direction,
  orientation: "vertical",
  panels: props.rows,
  defaultSize: props.defaultRowSize,
  snap: props.snap,
  redistribute: props.redistribute,
  registry,
  // The rows' root wraps the grid, which holds their handles.
  measure: () =>
    typeof gridId.value === "string"
      ? document.getElementById(gridId.value)
      : null,
  contentOf: (id) => cellsOf(undefined, id),
}));

// The handle the pointer passes over as well, on a crossing.
const crossed = ref<ReturnType<typeof crossedAt>>();
const cross = (next: ReturnType<typeof crossedAt>) => {
  if (
    crossed.value?.axis !== next?.axis ||
    crossed.value?.index !== next?.index
  )
    crossed.value = next;
};

const grid = computed(() => {
  const columnIds = props.columns.map((column) => column.id);
  const rowIds = props.rows.map((row) => row.id);
  return {
    columns: columnIds,
    rows: rowIds,
    rootProps: withoutStyle(rowSplit.api.value.getRootProps()),
    gridProps: {
      ...withoutStyle(columnSplit.api.value.getRootProps()),
      // A drag outruns the crossing's cell: the pair stays marked until it ends.
      onPointerover: (event: PointerEvent) =>
        event.buttons === 0 && cross(crossedAt(event.target)),
      onPointerleave: () => cross(undefined),
      style: {
        "--charcell-split-grid--columns": gridTemplate(
          columnSplit.sizes.value,
          "1ch",
        ),
        "--charcell-split-grid--rows": gridTemplate(
          rowSplit.sizes.value,
          "var(--charcell-row)",
        ),
      },
    },
    cellProps: (column: number, row: number) => ({
      id: cellId(String(gridId.value), columnIds[column]!, rowIds[row]!),
      style: {
        gridColumn: String(panelLine(column)),
        gridRow: String(panelLine(row)),
      },
    }),
    columnHandleProps: (index: number) => ({
      ...withStyle(
        columnSplit.api.value.getResizeTriggerProps({
          id: `${columnIds[index]}:${columnIds[index + 1]}`,
        }),
        {
          gridColumn: String(handleLine(index)),
          gridRow: "1 / -1",
        },
      ),
      "aria-controls": handleControls(
        String(gridId.value),
        columnIds,
        rowIds,
        "column",
        index,
      ),
      class: isCrossed(crossed.value, "column", index)
        ? crossedClass
        : undefined,
    }),
    rowHandleProps: (index: number) => ({
      ...withStyle(
        rowSplit.api.value.getResizeTriggerProps({
          id: `${rowIds[index]}:${rowIds[index + 1]}`,
        }),
        {
          gridRow: String(handleLine(index)),
          gridColumn: "1 / -1",
          ...gripPlace(
            columnSplit.sizes.value,
            columnSplit.step.value,
            2,
            "1ch",
          ),
        },
      ),
      "aria-controls": handleControls(
        String(gridId.value),
        columnIds,
        rowIds,
        "row",
        index,
      ),
      class: isCrossed(crossed.value, "row", index) ? crossedClass : undefined,
    }),
    rowHandleRowProps: (index: number) => ({
      style: { gridRow: String(handleLine(index)), gridColumn: "1 / -1" },
    }),
    columnsApi: columnSplit.api.value,
    rowsApi: rowSplit.api.value,
  };
});
</script>

<template>
  <slot :grid="grid" />
</template>
