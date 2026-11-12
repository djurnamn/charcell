<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import * as tabs from "@zag-js/tabs";
  import { useMachine, normalizeProps } from "@zag-js/svelte";
  import { get } from "svelte/store";
  import { type TextDirection } from "charcell/scripts/direction";
  import { usePageDirection } from "./actions/page-direction.svelte";
  import { machineApi } from "@scaffold-ui-kit/helpers/zag/svelte";

  /**
   * `TabsDriver` (Svelte) - pure behavior, the cross-target counterpart of
   * the react/vue drivers: the `@zag-js/tabs` machine handed to a scoped
   * snippet (`children({ api })`). See the React driver for the contract.
   */
  type TabsApi = ReturnType<typeof tabs.connect>;

  let {
    value = undefined,
    defaultValue = undefined,
    onValueChange = undefined,
    direction = undefined,
    children,
  }: {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
    children?: Snippet<[{ api: TabsApi; scripted: boolean }]>;
  } = $props();

  const id = $props.id();
  const machineDirection = usePageDirection(
    () => direction,
    () => [get(api).getListProps().id],
  );

  const api = machineApi(
    () =>
      useMachine(tabs.machine, () => ({
        id,
        dir: machineDirection.current,
        value,
        defaultValue,
        onValueChange: (details: { value: string }) =>
          onValueChange?.(details.value),
      })),
    (service) => tabs.connect(service, normalizeProps),
  );
  // Running in the browser: the root's fallback for a failed page is off.
  let scripted = $state(false);
  onMount(() => {
    scripted = true;
  });
</script>

{@render children?.({ api: $api, scripted })}
