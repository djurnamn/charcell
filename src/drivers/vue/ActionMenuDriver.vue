<script setup lang="ts">
import type { Placement } from "@zag-js/popover";
import { computed, onBeforeUnmount, useId, watch } from "vue";
import * as menu from "@zag-js/menu";
import { useMachine, normalizeProps } from "@zag-js/vue";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { attachingToTrigger, windowIn } from "charcell/scripts/attach";
import { closingOnPressOutside } from "@scaffold-ui-kit/helpers/zag";
import {
  onCellGrid,
  sideOf,
  keepingPanelInside,
} from "charcell/scripts/positioning";

/**
 * `ActionMenuDriver` (Vue) - pure behavior, the cross-target counterpart: the
 * `@zag-js/menu` machine handed to a default scoped slot (`<slot :api>`).
 * See the React driver for the contract.
 */
const props = withDefaults(
  defineProps<{
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSelect?: (value: string) => void;
    closeOnSelect?: boolean;
    loopFocus?: boolean;
    placement?: Placement;
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
  }>(),
  {
    open: undefined,
    closeOnSelect: true,
    loopFocus: false,
    placement: "bottom-start",
  },
);

const id = useId();

const machineDirection = usePageDirection(
  () => props.direction,
  () => [api.value.getTriggerProps().id],
);
const service = useMachine(
  menu.machine,
  computed(() => ({
    dir: machineDirection.value,
    id,
    open: props.open,
    defaultOpen: props.defaultOpen,
    onOpenChange: (details: { open: boolean }) =>
      props.onOpenChange?.(details.open),
    onSelect: (details: { value: string }) => props.onSelect?.(details.value),
    closeOnSelect: props.closeOnSelect,
    loopFocus: props.loopFocus,
    // A press on the panel around the list is inside it.
    onInteractOutside: keepingPanelInside(
      (): unknown => api.value.getPositionerProps().id,
    ),
    positioning: onCellGrid(
      { placement: props.placement, gutter: 0 },
      (): HTMLElement | null => {
        const id = api.value.getTriggerProps().id;
        return typeof id === "string" ? document.getElementById(id) : null;
      },
    ),
  })),
);

const api = computed(() => menu.connect(service, normalizeProps));

// An outside press closes it at once, before what the press lands on opens
// (see `closingOnPressOutside`).
let release: (() => void) | undefined;
watch(
  () => api.value.open,
  (open) => {
    release?.();
    release = undefined;
    if (!open) return;
    release = closingOnPressOutside(
      () => [
        document.getElementById(String(api.value.getTriggerProps().id)),
        document.getElementById(String(api.value.getContentProps().id)),
      ],
      (restoreFocus) =>
        service.send({ type: "CLOSE", src: "interact-outside", restoreFocus }),
    );
  },
  { immediate: true },
);
onBeforeUnmount(() => release?.());
// Attached (the compound's choice, in the window's style), the window shares
// a row with the trigger, whose corners follow the two widths (see
// `attachingToTrigger`).
let detach: (() => void) | undefined;
watch(
  [() => api.value.open, () => sideOf(api.value.getTriggerProps())],
  ([open]) => {
    detach?.();
    detach = undefined;
    if (!open) return;
    detach = attachingToTrigger(() => [
      document.getElementById(String(api.value.getTriggerProps().id)),
      windowIn(api.value.getPositionerProps().id),
    ]);
  },
  { immediate: true, flush: "post" },
);
onBeforeUnmount(() => detach?.());
</script>

<template>
  <slot :api="api" />
</template>
