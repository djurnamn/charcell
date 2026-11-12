import { untrack } from "svelte";
import {
  pageDirectionOf,
  type TextDirection,
} from "charcell/scripts/direction";

/**
 * The reading direction a driver hands its machine (Svelte): `given`, the
 * call site's, or else the one the page lays the component out in, read once
 * it is mounted (`pageDirectionOf` on the first of `ids` on the page).
 * Undefined until then, which the machine takes as left to right, as a server
 * render does. See the React `usePageDirection`.
 */
export function usePageDirection(
  given: () => TextDirection | undefined,
  ids: () => unknown[],
): { readonly current: TextDirection | undefined } {
  let page = $state<TextDirection | undefined>();
  $effect(() => {
    if (given() === undefined) page = pageDirectionOf(...untrack(ids));
  });
  return {
    get current() {
      return given() ?? page;
    },
  };
}
