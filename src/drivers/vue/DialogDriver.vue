<script setup lang="ts">
import { computed, useId, watch } from "vue";
import * as dialog from "@zag-js/dialog";
import { useMachine, normalizeProps } from "@zag-js/vue";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { returningFocus } from "@scaffold-ui-kit/helpers/zag";

/**
 * `DialogDriver` (Vue) - pure behavior, the cross-target counterpart: the
 * `@zag-js/dialog` machine handed to a default scoped slot (`<slot :api>`).
 * See the React driver for the contract.
 */
const props = withDefaults(
  defineProps<{
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    modal?: boolean;
    closeOnEscape?: boolean;
    closeOnInteractOutside?: boolean;
    role?: "dialog" | "alertdialog";
    /** Where focus goes as the dialog closes when neither its trigger nor
     *  what opened it is still on the page. */
    finalFocus?: () => HTMLElement | null;
    /** Where focus goes as the dialog opens, in place of its first focusable element. */
    initialFocus?: () => HTMLElement | null;
    /** The id of an element that describes the dialog, for its `aria-describedby`. */
    describedBy?: string;
    /** Lock the page's scroll while the dialog is open (default true). */
    preventScroll?: boolean;
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
  }>(),
  {
    // Opts out of Vue's absent-`boolean`→`false` casting, so an uncontrolled
    // dialog stays uncontrolled.
    open: undefined,
    modal: true,
    closeOnEscape: true,
    closeOnInteractOutside: true,
    role: "dialog",
    preventScroll: true,
  },
);

const id = useId();
const focus = returningFocus();

const machineDirection = usePageDirection(
  () => props.direction,
  () => [api.value.getTriggerProps().id, api.value.getContentProps().id],
);
const service = useMachine(
  dialog.machine,
  computed(() => ({
    dir: machineDirection.value,
    id,
    open: props.open,
    defaultOpen: props.defaultOpen,
    onOpenChange: (details: { open: boolean }) =>
      props.onOpenChange?.(details.open),
    modal: props.modal,
    closeOnEscape: props.closeOnEscape,
    closeOnInteractOutside: props.closeOnInteractOutside,
    role: props.role,
    preventScroll: props.preventScroll,
    initialFocusEl: props.initialFocus,
    ids:
      props.describedBy !== undefined
        ? { description: props.describedBy }
        : undefined,
    finalFocusEl: focus.finalFocusEl(
      (): unknown => api.value.getTriggerProps().id,
      props.finalFocus,
    ),
  })),
);

const api = computed(() => dialog.connect(service, normalizeProps));
// What has focus as the dialog opens, before Zag moves it in.
watch(
  () => api.value.open,
  (open) => {
    if (open) focus.remember();
  },
  { flush: "sync", immediate: true },
);
</script>

<template>
  <slot :api="api" />
</template>
