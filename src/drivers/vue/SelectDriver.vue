<script setup lang="ts">
import type { Placement } from "@zag-js/popover";
import { computed, onBeforeUnmount, useId, watch } from "vue";
import * as select from "@zag-js/select";
import { useMachine, normalizeProps } from "@zag-js/vue";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { closingOnPressOutside } from "@scaffold-ui-kit/helpers/zag";
import { markingWider } from "charcell/scripts/select-width";
import { onCellGrid, keepingPanelInside } from "charcell/scripts/positioning";
import { chosenValue } from "charcell/scripts/select-value";

/**
 * `SelectDriver` (Vue) - pure behavior, the cross-target counterpart: the
 * `@zag-js/select` machine handed to a default scoped slot (`<slot :api>`).
 * See the React driver for the contract (single-select, a string or number
 * value, over Zag's array of strings).
 */
interface SelectItem {
  value: string | number;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: SelectItem[];
    value?: string | number;
    defaultValue?: string | number;
    onValueChange?: (value: string | number) => void;
    disabled?: boolean;
    name?: string;
    /** The value is required for the form to submit. */
    required?: boolean;
    /** The id of the form the value belongs to. */
    form?: string;
    /** Closes the listbox once an item is chosen. */
    closeOnSelect?: boolean;
    /** Controlled open state; pair it with `onOpenChange`. */
    open?: boolean;
    /** Uncontrolled initial open state. */
    defaultOpen?: boolean;
    /** Called with the next open state on every open or close. */
    onOpenChange?: (open: boolean) => void;
    placement?: Placement;
    /** The trigger's id: a `Field` points its label at it (`htmlFor`). */
    id?: string;
    /** `value`: the trigger fits its value; the listbox, its items. */
    fit?: "items" | "value";
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
  }>(),
  {
    placement: "bottom-start",
    fit: "items",
    // Opt out of Vue's absent-`boolean`→`false` casting so an uncontrolled
    // select stays uncontrolled.
    disabled: undefined,
    required: undefined,
    closeOnSelect: true,
    open: undefined,
    defaultOpen: undefined,
  },
);

const machineId = useId();

const collection = computed(() =>
  select.collection({
    items: props.items,
    itemToString: (item: SelectItem) => item.label,
    itemToValue: (item: SelectItem) => String(item.value),
    isItemDisabled: (item: SelectItem) => item.disabled === true,
  }),
);

const machineDirection = usePageDirection(
  () => props.direction,
  () => [api.value.getTriggerProps().id],
);
const service = useMachine(
  select.machine,
  computed(() => ({
    dir: machineDirection.value,
    id: machineId,
    ids: props.id !== undefined ? { trigger: props.id } : undefined,
    collection: collection.value,
    value: props.value !== undefined ? [String(props.value)] : undefined,
    defaultValue:
      props.defaultValue !== undefined
        ? [String(props.defaultValue)]
        : undefined,
    onValueChange: (details: { value: string[] }) => {
      const chosen = chosenValue(props.items, details.value[0]);
      if (chosen !== undefined) props.onValueChange?.(chosen);
    },
    disabled: props.disabled,
    name: props.name,
    required: props.required,
    form: props.form,
    closeOnSelect: props.closeOnSelect,
    open: props.open,
    defaultOpen: props.defaultOpen,
    onOpenChange: (details: { open: boolean }) =>
      props.onOpenChange?.(details.open),
    // A press on the panel around the list is inside it.
    onInteractOutside: keepingPanelInside(
      (): unknown => api.value.getPositionerProps().id,
    ),
    positioning: onCellGrid(
      {
        placement: props.placement,
        gutter: 0,
        sameWidth: props.fit !== "value",
      },
      (): HTMLElement | null => {
        const id = api.value.getTriggerProps().id;
        return typeof id === "string" ? document.getElementById(id) : null;
      },
    ),
  })),
);

const api = computed(() => select.connect(service, normalizeProps));

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

// A listbox wider than a trigger that fits its value: the pair's shared row
// turns its far corner (see `markingWider`).
let unmark: (() => void) | undefined;
watch(
  [() => api.value.open, () => props.fit],
  ([open, fit]) => {
    unmark?.();
    unmark = undefined;
    if (!open || fit !== "value") return;
    unmark = markingWider(() => [
      document.getElementById(String(api.value.getTriggerProps().id)),
      document.getElementById(String(api.value.getContentProps().id)),
    ]);
  },
  { immediate: true, flush: "post" },
);
onBeforeUnmount(() => unmark?.());
</script>

<template>
  <slot :api="api" />
</template>
