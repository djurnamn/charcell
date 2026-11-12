import { useEffect, useId, useReducer, useRef, useState } from "react";
import * as splitter from "@zag-js/splitter";
import type { ResizeEndDetails, SplitterRegistry } from "@zag-js/splitter";
import { useMachine, normalizeProps } from "@zag-js/react";
import { type TextDirection } from "charcell/scripts/direction";
import { zagPanels } from "charcell/scripts/character-snap";
import {
  SnappedSplit,
  type SnappedSplitSettings,
} from "charcell/scripts/snapped-split";
import { usePageDirection } from "../direction/use-page-direction";

export type SplitterApi = ReturnType<typeof splitter.connect>;

/** The split's settings (`SnappedSplitSettings`, the split reading whether
 *  it snaps from `snap` and `size`) and its machine's. */
export interface SnappedSplitterOptions extends Omit<
  SnappedSplitSettings,
  "snapping"
> {
  /** The machine's id: a generated one when unset. A grid names its two
   *  splits from one, as `<id>-columns` and `<id>-rows`. */
  id?: string;
  /** The reading direction its keys follow: the page's, once mounted, when
   *  unset. */
  direction?: TextDirection;
  size?: number[];
  onSizeChange?: (size: number[]) => void;
  onResizeEnd?: (details: ResizeEndDetails) => void;
  snap: "character" | "none";
  /** Zag's registry, shared by the splits of a grid, so a press where two
   *  handles cross drags both. */
  registry?: SplitterRegistry;
}

/**
 * One split's machine, run on the character grid: the Zag `splitter`
 * machine controlled on the snapped sizes a `SnappedSplit` holds, on whole
 * columns (rows, stacked) from mount, after each drag and resize, and
 * stepping one cell per arrow key. The `SplitterDriver` runs one; the
 * `SplitGridDriver` one per axis. Returns the api, wrapped as the parts
 * read it, and the sizes it holds.
 */
export function useSnappedSplitter(options: SnappedSplitterOptions): {
  api: SplitterApi;
  sizes: number[];
  /** One cell as a percentage while snapping, once measured. */
  step: number | undefined;
} {
  const { orientation, panels, defaultSize, size, snap, registry, direction } =
    options;
  // Native character snapping runs the machine controlled on the split's
  // sizes: the machine only ever paints the snapped sizes, so a drag steps
  // whole columns (rows, stacked) with no raw/snapped races. A controlled
  // consumer (`size`) owns its own snapping; `snap: 'none'` passes through
  // untouched.
  const snapping = snap === "character" && size === undefined;
  const settings = useRef({ ...options, snapping });
  settings.current = { ...options, snapping };
  const apiReference = useRef<SplitterApi | null>(null);
  const [split] = useState(
    () =>
      new SnappedSplit(
        () => settings.current,
        () => apiReference.current ?? undefined,
      ),
  );
  const [, changed] = useReducer((count: number) => count + 1, 0);
  useEffect(() => split.subscribe(changed), [split]);
  // A new panel set is carried during the render, so Zag never meets the new
  // panels with the old sizes.
  split.carryPanels();
  const panelKey = panels.map((panel) => panel.id).join("\n");

  const machineDirection = usePageDirection(direction, () => [
    apiReference.current?.getRootProps().id,
  ]);
  const generatedId = useId();
  const service = useMachine(splitter.machine, {
    id: options.id ?? generatedId,
    dir: machineDirection,
    orientation,
    panels: zagPanels(panels),
    registry,
    defaultSize: snapping ? undefined : defaultSize,
    size: snapping ? split.sizes : size,
    keyboardResizeBy: snapping ? split.step : undefined,
    onResize: (details) => {
      options.onSizeChange?.(details.size);
      split.resized(details.size);
    },
    onResizeEnd: options.onResizeEnd,
  });
  const api = splitter.connect(service, normalizeProps);
  apiReference.current = api;

  // The starting sizes, and the sizes after the container resizes, on the
  // grid too, as well as those a drag reports.
  const rootId = api.getRootProps().id;
  useEffect(
    () => split.hold(),
    [split, snapping, rootId, orientation, panelKey],
  );

  return {
    api: split.wrap(api),
    sizes: (snapping ? split.sizes : undefined) ?? api.getSizes(),
    step: snapping ? split.step : undefined,
  };
}
