<script setup lang="ts">
import { computed, onMounted, ref, useId } from "vue";
import * as tabs from "@zag-js/tabs";
import { useMachine, normalizeProps } from "@zag-js/vue";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";

/**
 * `TabsDriver` (Vue) - pure behavior, the cross-target counterpart: the
 * `@zag-js/tabs` machine handed to a default scoped slot (`<slot :api>`).
 * See the React driver for the contract.
 */
const props = defineProps<{
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The reading direction its keys and placement follow: the page's, once
   *  mounted, when unset. */
  direction?: TextDirection;
}>();

const id = useId();

const machineDirection = usePageDirection(
  () => props.direction,
  () => [api.value.getListProps().id],
);
const service = useMachine(
  tabs.machine,
  computed(() => ({
    dir: machineDirection.value,
    id,
    value: props.value,
    defaultValue: props.defaultValue,
    onValueChange: (details: { value: string }) =>
      props.onValueChange?.(details.value),
  })),
);

const api = computed(() => tabs.connect(service, normalizeProps));
// Running in the browser: the root's fallback for a failed page is off.
const scripted = ref(false);
onMounted(() => {
  scripted.value = true;
});
</script>

<template>
  <slot :api="api" :scripted="scripted" />
</template>
