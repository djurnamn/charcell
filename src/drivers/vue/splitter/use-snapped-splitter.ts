import {
  computed,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useId,
  watch,
  type ComputedRef,
} from "vue";
import * as splitter from "@zag-js/splitter";
import type { SplitterRegistry } from "@zag-js/splitter";
import { useMachine, normalizeProps } from "@zag-js/vue";
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
  onResizeEnd?: (details: splitter.ResizeEndDetails) => void;
  snap: "character" | "none";
  /** Zag's registry, shared by the splits of a grid, so a press where two
   *  handles cross drags both. */
  registry?: SplitterRegistry;
}

/**
 * One split's machine, run on the character grid (Vue): see the React
 * `useSnappedSplitter`. `options` is read reactively; the api comes back
 * wrapped as the parts read it, with the sizes it holds.
 */
export function useSnappedSplitter(options: () => SnappedSplitterOptions): {
  api: ComputedRef<SplitterApi>;
  sizes: ComputedRef<number[]>;
  /** One cell as a percentage while snapping, once measured. */
  step: ComputedRef<number | undefined>;
} {
  const generatedId = useId();
  const current = computed(options);
  const id = current.value.id ?? generatedId;
  // Native character snapping runs the machine controlled on the split's
  // sizes (the machine only paints snapped sizes - no raw/snapped races).
  const snapping = computed(
    () =>
      current.value.snap === "character" && current.value.size === undefined,
  );
  const split: SnappedSplit = new SnappedSplit(
    () => ({ ...current.value, snapping: snapping.value }),
    () => api.value,
  );
  // Bumped on each change the split makes, for what reads it to follow.
  const version = shallowRef(0);
  const release = split.subscribe(() => version.value++);
  const sizes = computed<number[] | undefined>(
    () => (void version.value, split.sizes),
  );
  const step = computed<number | undefined>(
    () => (void version.value, split.step),
  );

  const machineDirection = usePageDirection(
    () => current.value.direction,
    () => [api.value?.getRootProps().id],
  );
  const service = useMachine(
    splitter.machine,
    computed(() => ({
      id,
      dir: machineDirection.value,
      orientation: current.value.orientation,
      panels: zagPanels(current.value.panels),
      registry: current.value.registry,
      defaultSize: snapping.value ? undefined : current.value.defaultSize,
      size: snapping.value ? sizes.value : current.value.size,
      keyboardResizeBy: snapping.value ? step.value : undefined,
      onResize: (details: splitter.ResizeDetails) => {
        current.value.onSizeChange?.(details.size);
        split.resized(details.size);
      },
      onResizeEnd: current.value.onResizeEnd,
    })),
  );
  const api: ComputedRef<SplitterApi> = computed(() =>
    splitter.connect(service, normalizeProps),
  );

  // The starting sizes, and the sizes after the container resizes, on the
  // grid too, as well as those a drag reports.
  let held: (() => void) | undefined;
  const hold = () => {
    held?.();
    held = split.hold();
  };
  onMounted(hold);
  // A new panel set is carried before it renders, in the layout the old set
  // still has, and held on the grid once its handles are in the document.
  const panelKey = computed(() =>
    current.value.panels.map((panel) => panel.id).join("\n"),
  );
  watch(panelKey, () => split.carryPanels());
  watch([snapping, () => current.value.orientation, panelKey], hold, {
    flush: "post",
  });
  onBeforeUnmount(() => {
    held?.();
    release();
  });

  return {
    api: computed(() => (void version.value, split.wrap(api.value))),
    sizes: computed(
      () => (snapping.value ? sizes.value : undefined) ?? api.value.getSizes(),
    ),
    step: computed(() => (snapping.value ? step.value : undefined)),
  };
}
