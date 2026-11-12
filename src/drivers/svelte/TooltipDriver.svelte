<script lang="ts">
  import type { Snippet } from "svelte";
  import * as tooltip from "@zag-js/tooltip";
  import { get } from "svelte/store";
  import { useMachine, normalizeProps } from "@zag-js/svelte";
  import { type TextDirection } from "charcell/scripts/direction";
  import { usePageDirection } from "./actions/page-direction.svelte";
  import { onCellGrid } from "charcell/scripts/positioning";
  import { machineApi } from "@scaffold-ui-kit/helpers/zag/svelte";

  /**
   * `TooltipDriver` (Svelte) - pure behavior, the cross-target counterpart
   * of the react/vue drivers: the `@zag-js/tooltip` machine handed to a
   * scoped snippet (`children({ api })`). See the React driver.
   */
  type TooltipApi = ReturnType<typeof tooltip.connect>;

  let {
    placement = "bottom-start",
    openDelay = 400,
    closeDelay = 150,
    interactive = true,
    triggerId = undefined,
    open = undefined,
    defaultOpen = undefined,
    onOpenChange = undefined,
    direction = undefined,
    children,
  }: {
    placement?: tooltip.Placement;
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
    children?: Snippet<[{ api: TooltipApi }]>;
  } = $props();

  const id = $props.id();
  const machineDirection = usePageDirection(
    () => direction,
    () => [get(api).getTriggerProps().id],
  );

  const api = machineApi(
    () =>
      useMachine(tooltip.machine, () => ({
        id,
        dir: machineDirection.current,
        ids: triggerId !== undefined ? { trigger: triggerId } : undefined,
        openDelay,
        closeDelay,
        interactive,
        open,
        defaultOpen,
        onOpenChange: (details: { open: boolean }) =>
          onOpenChange?.(details.open),
        positioning: onCellGrid(
          { placement, gutter: 0 },
          (): HTMLElement | null => {
            const id = get(api).getTriggerProps().id;
            return typeof id === "string" ? document.getElementById(id) : null;
          },
        ),
      })),
    (service) => tooltip.connect(service, normalizeProps),
  );
</script>

{@render children?.({ api: $api })}
