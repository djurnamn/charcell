import { defineTemplate } from "@js-template-engine/types";

/**
 * `SplitGrid` - the **compound**: the `SplitGridDriver` (two splits, one per
 * axis, sharing one registry) composed with `SplitGridVisual`, a
 * `SplitGridCell` per column and row, and a `SplitGridHandle` between every
 * two columns and every two rows. Each cell renders through the default
 * slot (`{ column, row }`, the track ids).
 *
 * A handle between two columns runs down every row, and one between two rows
 * across every column, so a drag moves its boundary through the whole grid,
 * and a press where two handles cross moves both. Each handle is a keyboard
 * separator, stepping one cell along its own axis. Boundaries snap to whole
 * columns and rows unless `snap` is `'none'`; a track's `minimumCells` is the
 * least it keeps, `keepCells` keeps its cells when the grid resizes and
 * `defaultCells` starts it at a count of cells or at its content's own
 * length (its cells', up to `contentCap`), as the `Splitter`'s panels do. When the columns or rows change, the tracks
 * that stay keep their cells: one that leaves hands its cells to its
 * neighbor, and comes back at its last size as far as the neighbor still
 * holds them; `redistribute: 'proportional'` shares them among every track
 * that stays instead, by its length, a track that comes back taking its
 * cells from all of them. A grid needs a height to share, which `fill` takes from its
 * container. `rowGrips: 'one'` draws one grip on a row's handle, at its
 * middle, rather than one in each pane. The **`rowHandleStart`** and **`rowHandleEnd`**
 * slots (`{ before, after }`, the ids of the rows either side) lay content
 * on a row's handle, at its start and end around the grip
 * (`SplitGridHandleRow`): a heading for the row below, its controls.
 */
export default defineTemplate({
  type: "component",
  name: "SplitGrid",
  rest: { tag: "div" },
  description:
    "panes in columns and rows, with handles between them that move a whole column or row at a time.",
  extensions: {
    react: {
      // It hands a function child to its client driver, so it is a client module too.
      client: true,
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { resolveSplitGridTranslations, type SplitGridTranslations } from 'charcell/scripts/translations';",
        "import { SplitGridDriver, type SplitGridTrack } from './SplitGridDriver';",
        "import { SplitGridVisual } from './SplitGridVisual';",
        "import { SplitGridCell } from './SplitGridCell';",
        "import { SplitGridHandle } from './SplitGridHandle';",
        "import { SplitGridHandleRow } from './SplitGridHandleRow';",
      ],
    },
    vue: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { resolveSplitGridTranslations, type SplitGridTranslations } from 'charcell/scripts/translations';",
        "import SplitGridDriver from './SplitGridDriver.vue';",
        "import SplitGridVisual from './SplitGridVisual.vue';",
        "import SplitGridCell from './SplitGridCell.vue';",
        "import SplitGridHandle from './SplitGridHandle.vue';",
        "import SplitGridHandleRow from './SplitGridHandleRow.vue';",
        "export type SplitGridTrack = { id: string; minimumSize?: number; maximumSize?: number; minimumCells?: number; keepCells?: boolean; defaultCells?: number | 'content'; contentCap?: number };",
      ],
    },
    svelte: {
      imports: [
        "import { mergeRootProps } from '@scaffold-ui-kit/helpers/runtime';",
        "import { resolveSplitGridTranslations, type SplitGridTranslations } from 'charcell/scripts/translations';",
        "import SplitGridDriver from './SplitGridDriver.svelte';",
        "import SplitGridVisual from './SplitGridVisual.svelte';",
        "import SplitGridCell from './SplitGridCell.svelte';",
        "import SplitGridHandle from './SplitGridHandle.svelte';",
        "import SplitGridHandleRow from './SplitGridHandleRow.svelte';",
        "export type SplitGridTrack = { id: string; minimumSize?: number; maximumSize?: number; minimumCells?: number; keepCells?: boolean; defaultCells?: number | 'content'; contentCap?: number };",
      ],
    },
  },
  props: {
    /** The reading direction its keys and placement follow (`'rtl'` mirrors the arrow keys); the page's, once mounted, when unset. */
    direction: { type: "'ltr' | 'rtl'" },
    /** The columns, left to right: an id each, and, snapping, `minimumCells`,
     *  `keepCells` and `defaultCells` (a count, or `'content'`). */
    columns: { type: "SplitGridTrack[]", required: true },
    /** The rows, top to bottom. */
    rows: { type: "SplitGridTrack[]", required: true },
    /** The columns' starting sizes in percent, e.g. `[25, 75]`. */
    defaultColumnSize: { type: "number[]" },
    /** The rows' starting sizes in percent. */
    defaultRowSize: { type: "number[]" },
    /** Boundaries snap to whole columns and rows; `'none'` opts out. */
    snap: { type: "'character' | 'none'", default: "character" },
    /** How the cells are shared when the columns or rows change: a leaving
     *  track's to its neighbor (`'neighbor'`), or to every track that
     *  stays, by its length (`'proportional'`), a joining one taking its
     *  cells from all of them. */
    redistribute: {
      type: "'neighbor' | 'proportional'",
      default: "neighbor",
    },
    /** Draws the handles as lines through their cells, a grip in each pane. */
    rule: { type: "boolean" },
    /** A row's handle's grips: `each`, one in every pane it passes; `one`, one at its middle. */
    rowGrips: { type: "'each' | 'one'", default: "each" },
    /** Runs ruled handles' ends on past the grid to meet the lines beyond:
     *  a frame's ring when the grid sits directly in its body, or else the
     *  line in the next cell (`┬ ┴ ├ ┤`). */
    join: { type: "'start' | 'end' | 'both'" },
    /** Takes the container's box: grows in a flex or grid layout, and takes the full height of a block that has one. */
    fill: { type: "boolean" },
    /** What the grid says: its handles' names, between two columns
     *  (`columnHandleLabel`) and two rows (`rowHandleLabel`). */
    translations: { type: "SplitGridTranslations" },
  },
  children: [
    {
      type: "element",
      tag: "SplitGridDriver",
      slotScope: ["grid"],
      attributes: {
        direction: { $expression: "direction" },
        columns: { $expression: "columns" },
        rows: { $expression: "rows" },
        defaultColumnSize: { $expression: "defaultColumnSize" },
        defaultRowSize: { $expression: "defaultRowSize" },
        snap: { $expression: "snap" },
        redistribute: { $expression: "redistribute" },
      },
      children: [
        {
          type: "element",
          tag: "SplitGridVisual",
          attributes: {
            $spread: { $expression: "mergeRootProps(grid.rootProps, rest)" },
            gridProps: { $expression: "grid.gridProps" },
            rule: { $expression: "rule" },
            join: { $expression: "join" },
            rowGrips: { $expression: "rowGrips" },
            fill: { $expression: "fill" },
          },
          children: [
            {
              type: "iteration",
              items: "rows",
              item: "row",
              index: "rowIndex",
              key: "row.id",
              children: [
                {
                  type: "iteration",
                  items: "columns",
                  item: "column",
                  index: "columnIndex",
                  key: "column.id",
                  children: [
                    {
                      type: "element",
                      tag: "SplitGridCell",
                      attributes: {
                        $spread: {
                          $expression: "grid.cellProps(columnIndex, rowIndex)",
                        },
                      },
                      children: [
                        /** A cell, given its `column` and `row` ids. */
                        {
                          type: "slot",
                          exposes: {
                            column: { value: "column.id", type: "string" },
                            row: { value: "row.id", type: "string" },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "iteration",
              items: "columns.slice(0, -1)",
              item: "column",
              index: "index",
              key: "column.id",
              children: [
                {
                  type: "element",
                  tag: "SplitGridHandle",
                  attributes: {
                    $spread: { $expression: "grid.columnHandleProps(index)" },
                    axis: "column",
                    crosses: { $expression: "grid.rows" },
                    label: {
                      $expression:
                        "resolveSplitGridTranslations(translations).columnHandleLabel",
                    },
                  },
                },
              ],
            },
            {
              type: "iteration",
              items: "rows.slice(0, -1)",
              item: "row",
              index: "index",
              key: "row.id",
              children: [
                {
                  type: "element",
                  tag: "SplitGridHandle",
                  attributes: {
                    $spread: { $expression: "grid.rowHandleProps(index)" },
                    axis: "row",
                    crosses: { $expression: "grid.columns" },
                    label: {
                      $expression:
                        "resolveSplitGridTranslations(translations).rowHandleLabel",
                    },
                  },
                },
                {
                  type: "element",
                  tag: "SplitGridHandleRow",
                  attributes: {
                    $spread: { $expression: "grid.rowHandleRowProps(index)" },
                  },
                  slots: {
                    start: [
                      /** Content on the handle between two rows, at its start, given the rows `before` and `after` it. */
                      {
                        type: "slot",
                        name: "rowHandleStart",
                        exposes: {
                          before: { value: "row.id", type: "string" },
                          after: {
                            value: "rows[index + 1]!.id",
                            type: "string",
                          },
                        },
                      },
                    ],
                    end: [
                      /** Content on the handle between two rows, at its end, given the rows `before` and `after` it. */
                      {
                        type: "slot",
                        name: "rowHandleEnd",
                        exposes: {
                          before: { value: "row.id", type: "string" },
                          after: {
                            value: "rows[index + 1]!.id",
                            type: "string",
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
