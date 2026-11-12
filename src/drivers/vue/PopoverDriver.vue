<script setup lang="ts">
import type { Placement } from "@zag-js/popover";
import { computed, onBeforeUnmount, useId, watch } from "vue";
import * as popover from "@zag-js/popover";
import { useMachine, normalizeProps } from "@zag-js/vue";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { attachingToTrigger } from "charcell/scripts/attach";
import { closingOnPressOutside } from "@scaffold-ui-kit/helpers/zag";
import { onCellGrid, sideOf } from "charcell/scripts/positioning";

/**
 * `PopoverDriver` (Vue) - pure behavior, the cross-target counterpart: the
 * `@zag-js/popover` machine handed to a default scoped slot (`<slot :api>`),
 * no markup/styles/bem. See the React driver for the contract.
 */
const props = withDefaults(
  defineProps<{
    placement?: Placement;
    closeOnInteractOutside?: boolean;
    closeOnEscape?: boolean;
    modal?: boolean;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
  }>(),
  {
    placement: "bottom-start",
    closeOnInteractOutside: true,
    closeOnEscape: true,
    modal: false,
    // `open: undefined` is deliberate - it opts out of Vue's
    // absent-`boolean`→`false` casting so an uncontrolled popover stays
    // uncontrolled (Zag treats `open !== undefined` as controlled).
    open: undefined,
  },
);

const id = useId();

const machineDirection = usePageDirection(
  () => props.direction,
  () => [api.value.getTriggerProps().id],
);
const service = useMachine(
  popover.machine,
  computed(() => ({
    dir: machineDirection.value,
    id,
    closeOnInteractOutside: props.closeOnInteractOutside,
    closeOnEscape: props.closeOnEscape,
    modal: props.modal,
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

const api = computed(() => popover.connect(service, normalizeProps));

// An outside press closes it at once, before what the press lands on opens
// (see `closingOnPressOutside`).
let release: (() => void) | undefined;
watch(
  [() => api.value.open, () => props.closeOnInteractOutside, () => props.modal],
  ([open, closeOnInteractOutside, modal]) => {
    release?.();
    release = undefined;
    if (!open || !closeOnInteractOutside || modal) return;
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
      document.getElementById(String(api.value.getContentProps().id)),
    ]);
  },
  { immediate: true, flush: "post" },
);
onBeforeUnmount(() => detach?.());
</script>

<template>
  <slot :api="api" />
</template>
