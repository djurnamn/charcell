import { computed, onMounted, ref, watch, type ComputedRef } from "vue";
import {
  pageDirectionOf,
  type TextDirection,
} from "charcell/scripts/direction";

/**
 * The reading direction a driver hands its machine (Vue): `given`, the call
 * site's, or else the one the page lays the component out in, read once it
 * is mounted (`pageDirectionOf` on the first of `ids` on the page). Undefined
 * until then, which the machine takes as left to right, as a server render
 * does.
 */
export function usePageDirection(
  given: () => TextDirection | undefined,
  ids: () => unknown[],
): ComputedRef<TextDirection | undefined> {
  const page = ref<TextDirection>();
  const read = () => {
    if (given() === undefined) page.value = pageDirectionOf(...ids());
  };
  onMounted(read);
  watch(given, read);
  return computed(() => given() ?? page.value);
}
