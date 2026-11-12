<script setup lang="ts">
import type * as splitter from "@zag-js/splitter";
import { type TextDirection } from "charcell/scripts/direction";
import { useSnappedSplitter } from "./splitter/use-snapped-splitter";
import { type SplitterPanelSpecification } from "charcell/scripts/snapped-split";

/**
 * `SplitterDriver` (Vue) - pure behavior, the cross-target counterpart: the
 * `@zag-js/splitter` machine handed to a default scoped slot (`<slot :api>`).
 * See the React driver for the contract (two panels, `start` / `end`, unless
 * `panels` names more).
 */
const props = withDefaults(
  defineProps<{
    orientation?: "horizontal" | "vertical";
    panels?: SplitterPanelSpecification[];
    defaultSize?: number[];
    size?: number[];
    /** Called with the new sizes, in percent, as a boundary moves. */
    onSizeChange?: (size: number[]) => void;
    onResizeEnd?: (details: splitter.ResizeEndDetails) => void;
    snap?: "character" | "none";
    /** The reading direction its keys follow: the page's, once mounted, when
     *  unset. */
    direction?: TextDirection;
  }>(),
  {
    orientation: "horizontal",
    snap: "character",
  },
);

const { api } = useSnappedSplitter(() => ({
  direction: props.direction,
  orientation: props.orientation,
  panels: props.panels ?? [{ id: "start" }, { id: "end" }],
  defaultSize: props.defaultSize,
  size: props.size,
  onSizeChange: props.onSizeChange,
  onResizeEnd: props.onResizeEnd,
  snap: props.snap,
}));
</script>

<template>
  <slot :api="api" />
</template>
