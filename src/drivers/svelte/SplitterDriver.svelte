<script lang="ts">
  import type { Snippet } from "svelte";
  import { type TextDirection } from "charcell/scripts/direction";
  import type * as splitter from "@zag-js/splitter";
  import {
    useSnappedSplitter,
    type SplitterApi,
  } from "./actions/snapped-splitter.svelte";
  import { type SplitterPanelSpecification } from "charcell/scripts/snapped-split";

  /**
   * `SplitterDriver` (Svelte) - pure behavior, the cross-target counterpart of
   * the react/vue drivers: the `@zag-js/splitter` machine handed to a scoped
   * snippet (`children({ api })`). Two panels, `start` / `end`, unless
   * `panels` names more.
   */
  let {
    orientation = "horizontal",
    panels = undefined,
    defaultSize = undefined,
    size = undefined,
    onSizeChange = undefined,
    onResizeEnd = undefined,
    snap = "character",
    direction = undefined,
    children,
  }: {
    orientation?: "horizontal" | "vertical";
    panels?: SplitterPanelSpecification[];
    /** Initial panel sizes, in percent (uncontrolled), e.g. `[50, 50]`. */
    defaultSize?: number[];
    /** Controlled panel sizes, in percent. */
    size?: number[];
    /** Called with the new sizes, in percent, as a boundary moves. */
    onSizeChange?: (size: number[]) => void;
    onResizeEnd?: (details: splitter.ResizeEndDetails) => void;
    /** Panel boundaries snap to whole character columns, or whole rows
     *  stacked; `'none'` opts out.
     *  A controlled `size` consumer owns its own snapping. */
    snap?: "character" | "none";
    /** The reading direction its keys follow: the page's, once mounted, when
     *  unset. */
    direction?: TextDirection;
    children?: Snippet<[{ api: SplitterApi }]>;
  } = $props();

  const id = $props.id();
  const split = useSnappedSplitter(
    () => ({
      direction,
      orientation,
      panels: panels ?? [{ id: "start" }, { id: "end" }],
      defaultSize,
      size,
      onSizeChange,
      onResizeEnd,
      snap,
    }),
    id,
  );
</script>

{@render children?.({ api: split.api })}
