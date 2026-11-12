<script setup lang="ts">
import type { Placement } from "@zag-js/tooltip";
import { computed, useId } from "vue";
import * as tooltip from "@zag-js/tooltip";
import { useMachine, normalizeProps } from "@zag-js/vue";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { onCellGrid } from "charcell/scripts/positioning";

/**
 * `TooltipDriver` (Vue) - pure behavior, the cross-target counterpart: the
 * `@zag-js/tooltip` machine handed to a default scoped slot (`<slot :api>`),
 * no markup/styles/bem. See the React driver for the contract.
 */
const props = withDefaults(
  defineProps<{
    placement?: Placement;
    openDelay?: number;
    closeDelay?: number;
    interactive?: boolean;
    /** The control's id, when another part owns it (a Popover's button). */
    triggerId?: string;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
  }>(),
  {
    placement: "bottom-start",
    openDelay: 400,
    closeDelay: 150,
    interactive: true,
    // `open: undefined` opts out of Vue's absent-`boolean`→`false` casting,
    // so an uncontrolled tooltip stays uncontrolled.
    open: undefined,
  },
);

const id = useId();

const machineDirection = usePageDirection(
  () => props.direction,
  () => [api.value.getTriggerProps().id],
);
const service = useMachine(
  tooltip.machine,
  computed(() => ({
    dir: machineDirection.value,
    id,
    ids:
      props.triggerId !== undefined ? { trigger: props.triggerId } : undefined,
    openDelay: props.openDelay,
    closeDelay: props.closeDelay,
    interactive: props.interactive,
    open: props.open,
    defaultOpen: props.defaultOpen,
    onOpenChange: (details: { open: boolean }) =>
      props.onOpenChange?.(details.open),
    positioning: onCellGrid(
      { placement: props.placement, gutter: 0 },
      (): HTMLElement | null => {
        const id = api.value.getTriggerProps().id;
        return typeof id === "string" ? document.getElementById(id) : null;
      },
    ),
  })),
);

const api = computed(() => tooltip.connect(service, normalizeProps));
</script>

<template>
  <slot :api="api" />
</template>
