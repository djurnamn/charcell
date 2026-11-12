import { untrack } from "svelte";
import { get } from "svelte/store";
import * as splitter from "@zag-js/splitter";
import type { SplitterRegistry } from "@zag-js/splitter";
import { useMachine, normalizeProps } from "@zag-js/svelte";
import { zagPanels } from "charcell/scripts/character-snap";
import {
  SnappedSplit,
  type SnappedSplitSettings,
} from "charcell/scripts/snapped-split";
import { machineApi } from "@scaffold-ui-kit/helpers/zag/svelte";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./page-direction.svelte";

export type SplitterApi = ReturnType<typeof splitter.connect>;

/** The split's settings (`SnappedSplitSettings`, the split reading whether
 *  it snaps from `snap` and `size`) and its machine's. */
export interface SnappedSplitterOptions extends Omit<
  SnappedSplitSettings,
  "snapping"
> {
  /** The reading direction its keys follow: the page's, once mounted, when
   *  unset. */
  direction?: TextDirection;
  size?: number[];
  onSizeChange?: (size: number[]) => void;
  onResizeEnd?: (details: splitter.ResizeEndDetails) => void;
  snap: "character" | "none";
  /** Zag's registry, shared by the splits of a grid, so a press where two
   *  handles cross drags both. */
  registry?: SplitterRegistry;
}

/**
 * One split's machine, run on the character grid (Svelte): see the React
 * `useSnappedSplitter`. `options` is read reactively and `id` is the
 * component's own (`$props.id()`); the api, the sizes it holds and the
 * percent a cell takes come back as getters.
 */
export function useSnappedSplitter(
  options: () => SnappedSplitterOptions,
  id: string,
): {
  readonly api: SplitterApi;
  readonly sizes: number[];
  /** One cell as a percentage while snapping, once measured. */
  readonly step: number | undefined;
} {
  const current = $derived(options());
  // Native character snapping runs the machine controlled on the split's
  // sizes: the machine only ever paints the snapped sizes, so a drag steps
  // whole columns with no raw/snapped races.
  const snapping = $derived(
    current.snap === "character" && current.size === undefined,
  );
  // The split reads its settings outside what it renders, so a read never
  // subscribes the reader to them.
  const split: SnappedSplit = new SnappedSplit(
    () => untrack(() => ({ ...current, snapping })),
    () => get(api),
  );
  // Bumped on each change the split makes, for what reads it to follow.
  let version = $state(0);
  $effect(() => split.subscribe(() => version++));
  const sizes: number[] | undefined = $derived((void version, split.sizes));
  const step: number | undefined = $derived((void version, split.step));

  const machineDirection = usePageDirection(
    () => current.direction,
    () => [get(api).getRootProps().id],
  );
  const api = machineApi(
    () =>
      useMachine(splitter.machine, () => ({
        id,
        dir: machineDirection.current,
        orientation: current.orientation,
        panels: zagPanels(current.panels),
        registry: current.registry,
        defaultSize: snapping ? undefined : current.defaultSize,
        size: snapping ? sizes : current.size,
        keyboardResizeBy: snapping ? step : undefined,
        onResize: (details: splitter.ResizeDetails) => {
          current.onSizeChange?.(details.size);
          split.resized(details.size);
        },
        onResizeEnd: current.onResizeEnd,
      })),
    (service) => splitter.connect(service, normalizeProps),
  );

  // The starting sizes, and the sizes after the container resizes, on the
  // grid too, as well as those a drag reports. A new panel set is carried
  // first, in the layout the old set still has.
  const panelKey = $derived(current.panels.map((panel) => panel.id).join("\n"));
  $effect(() => {
    void panelKey;
    void current.orientation;
    if (!snapping) return;
    untrack(() => split.carryPanels());
    return untrack(() => split.hold());
  });

  let connected = $state(get(api));
  $effect(() => api.subscribe((value) => (connected = value)));
  const wrapped = $derived(
    (void version, void current, void snapping, split.wrap(connected)),
  );
  const total = $derived(
    (snapping ? sizes : undefined) ?? connected.getSizes(),
  );

  return {
    get api() {
      return wrapped;
    },
    get sizes() {
      return total;
    },
    get step() {
      return snapping ? step : undefined;
    },
  };
}
