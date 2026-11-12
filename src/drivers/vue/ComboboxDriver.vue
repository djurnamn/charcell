<script setup lang="ts">
import type { Placement } from "@zag-js/popover";
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import * as combobox from "@zag-js/combobox";
import { useMachine, normalizeProps } from "@zag-js/vue";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { matchingItems, narrowingBy } from "charcell/scripts/combobox";
import {
  clearingOnReset,
  closingOnPressOutside,
} from "@scaffold-ui-kit/helpers/zag";
import { markingWider } from "charcell/scripts/select-width";
import { onCellGrid, keepingPanelInside } from "charcell/scripts/positioning";

/**
 * `ComboboxDriver` (Vue) - pure behavior, the cross-target counterpart: the
 * `@zag-js/combobox` machine handed to a default scoped slot
 * (`<slot :api :matches>`), with the items that match what the reader
 * typed. See the React driver for the contract.
 */
interface ComboboxItem {
  value: string;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: ComboboxItem[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    placement?: Placement;
    /** The locale the list narrows in, a BCP 47 tag; the runtime's own when unset. */
    locale?: string;
    /** The input's id: a `Field` points its label at it (`htmlFor`). */
    id?: string;
    /** The accessible name of the button that opens the list. */
    triggerLabel?: string;
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
  }>(),
  {
    placement: "bottom-start",
    // Opt out of Vue's absent-`boolean`→`false` casting so an uncontrolled
    // combobox stays uncontrolled.
    disabled: undefined,
  },
);

const machineId = useId();
const typed = ref("");
const matches = computed(() =>
  matchingItems(props.items, typed.value, props.locale),
);

const collection = computed(() =>
  combobox.collection({
    items: matches.value,
    itemToString: (item: ComboboxItem) => item.label,
    itemToValue: (item: ComboboxItem) => item.value,
    isItemDisabled: (item: ComboboxItem) => item.disabled === true,
  }),
);

const machineDirection = usePageDirection(
  () => props.direction,
  () => [api.value.getInputProps().id],
);
const service = useMachine(
  combobox.machine,
  computed(() => ({
    dir: machineDirection.value,
    id: machineId,
    ids: props.id !== undefined ? { input: props.id } : undefined,
    translations: { triggerLabel: props.triggerLabel },
    collection: collection.value,
    value: props.value !== undefined ? [props.value] : undefined,
    defaultValue:
      props.defaultValue !== undefined ? [props.defaultValue] : undefined,
    onValueChange: (details: { value: string[] }) => {
      if (details.value[0] !== undefined)
        props.onValueChange?.(details.value[0]);
    },
    onInputValueChange: (details: { inputValue: string; reason?: string }) =>
      (typed.value = narrowingBy(details.inputValue, details.reason)),
    onOpenChange: (details: { open: boolean }) => {
      if (!details.open) typed.value = "";
    },
    disabled: props.disabled,
    openOnClick: true,
    // A press on the panel around the list is inside it.
    onInteractOutside: keepingPanelInside(
      (): unknown => api.value.getPositionerProps().id,
    ),
    positioning: onCellGrid(
      { placement: props.placement, gutter: 0, sameWidth: false },
      (): HTMLElement | null => {
        const id = api.value.getControlProps().id;
        return typeof id === "string" ? document.getElementById(id) : null;
      },
    ),
  })),
);

const api = computed(() => combobox.connect(service, normalizeProps));

// The field and the list, as they are in the document.
const parts = () => [
  document.getElementById(String(api.value.getControlProps().id)),
  document.getElementById(String(api.value.getContentProps().id)),
];

// A list wider than the field turns the pair's far corner (see
// `markingWider`); an outside press closes it at once, before what the
// press lands on opens (see `closingOnPressOutside`).
let release: (() => void) | undefined;
watch(
  () => api.value.open,
  (open) => {
    release?.();
    release = undefined;
    if (!open) return;
    const unmark = markingWider(parts);
    const unpress = closingOnPressOutside(parts, (restoreFocus) =>
      service.send({ type: "CLOSE", src: "interact-outside", restoreFocus }),
    );
    release = () => {
      unmark();
      unpress();
    };
  },
  { immediate: true, flush: "post" },
);
onBeforeUnmount(() => release?.());

// A form reset clears the choice (see `clearingOnReset`).
let unreset: (() => void) | undefined;
onMounted(() => {
  unreset = clearingOnReset(
    () => document.getElementById(String(api.value.getInputProps().id)),
    () => api.value.clearValue(),
  );
});
onBeforeUnmount(() => unreset?.());
</script>

<template>
  <slot :api="api" :matches="matches" />
</template>
