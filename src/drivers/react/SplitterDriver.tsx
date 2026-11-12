"use client";

import type { ReactNode } from "react";
import { type TextDirection } from "charcell/scripts/direction";
import type { ResizeEndDetails } from "@zag-js/splitter";
import {
  useSnappedSplitter,
  type SplitterApi,
} from "./splitter/use-snapped-splitter";
import { type SplitterPanelSpecification } from "charcell/scripts/snapped-split";

export type { SplitterApi, SplitterPanelSpecification };

/**
 * `SplitterDriver` - pure behavior: the Zag `splitter` machine (pointer +
 * keyboard resizing, min/max clamping) handed to a scoped slot
 * (`children({ api })`). No markup, styles, or BEM - the layout and the
 * handle's column are `SplitterVisual` and its `SplitterPanel` /
 * `SplitterHandle` parts, composed by the generated `Splitter` compound.
 *
 * The compound is the two-panel split (`start` / `end`, one resize trigger
 * `start:end`). A split with more panels passes `panels` here and composes
 * the visual and the parts itself, one `SplitterHandle` per adjacent pair.
 */
export interface SplitterDriverProps {
  orientation?: "horizontal" | "vertical";
  /** The panel set (ids drive `getPanelProps`/`getResizeTriggerProps`); defaults
   *  to the two-panel `start`/`end` the generated compound composes. A
   *  panel's `minimumCells` is the least it keeps in whole cells, snapping. */
  panels?: SplitterPanelSpecification[];
  /** Initial panel sizes, in percent (uncontrolled), e.g. `[50, 50]`. */
  defaultSize?: number[];
  /** Controlled panel sizes, in percent. */
  size?: number[];
  /** Called with the new sizes, in percent, as a boundary moves. */
  onSizeChange?: (size: number[]) => void;
  onResizeEnd?: (details: ResizeEndDetails) => void;
  /** Panel boundaries snap to whole character columns, or whole rows stacked
   *  (the terminal has no fractional cells) - `'none'` opts out; controlled
   *  `size` consumers own their own snapping. */
  snap?: "character" | "none";
  /** Scoped slot: receives the live splitter api; render the panels + handle. */
  /** The reading direction its keys follow: the page's, once mounted, when
   *  unset. */
  direction?: TextDirection;
  children: (scope: { api: SplitterApi }) => ReactNode;
}

export function SplitterDriver({
  orientation = "horizontal",
  panels,
  defaultSize,
  size,
  onSizeChange,
  onResizeEnd,
  snap = "character",
  direction,
  children,
}: SplitterDriverProps) {
  const { api } = useSnappedSplitter({
    direction,
    orientation,
    panels: panels ?? [{ id: "start" }, { id: "end" }],
    defaultSize,
    size,
    onSizeChange,
    onResizeEnd,
    snap,
  });
  return children({ api });
}
