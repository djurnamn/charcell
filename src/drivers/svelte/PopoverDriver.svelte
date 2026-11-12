<script lang="ts">
  import type { Snippet } from "svelte";
  import * as popover from "@zag-js/popover";
  import { get } from "svelte/store";
  import { useMachine, normalizeProps } from "@zag-js/svelte";
  import { type TextDirection } from "charcell/scripts/direction";
  import { usePageDirection } from "./actions/page-direction.svelte";
  import { attachingToTrigger } from "charcell/scripts/attach";
  import { closingOnPressOutside } from "@scaffold-ui-kit/helpers/zag";
  import { onCellGrid } from "charcell/scripts/positioning";
  import { machineApi } from "@scaffold-ui-kit/helpers/zag/svelte";

  /**
   * `PopoverDriver` (Svelte) - pure behavior, the cross-target counterpart of
   * the react/vue drivers: the `@zag-js/popover` machine handed to a scoped
   * snippet (`children({ api })`), no markup/styles/bem. The panel portals via
   * `use:portal={'body'}` on the compound (see `@scaffold-ui-kit/helpers/runtime/svelte`).
   */
  type PopoverApi = ReturnType<typeof popover.connect>;

  let {
    placement = "bottom-start",
    closeOnInteractOutside = true,
    closeOnEscape = true,
    modal = false,
    open = undefined,
    defaultOpen = undefined,
    onOpenChange = undefined,
    direction = undefined,
    children,
  }: {
    placement?: popover.Placement;
    closeOnInteractOutside?: boolean;
    closeOnEscape?: boolean;
    modal?: boolean;
    /** Controlled open state; pair it with `onOpenChange`. */
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
    children?: Snippet<[{ api: PopoverApi }]>;
  } = $props();

  const id = $props.id();
  const machineDirection = usePageDirection(
    () => direction,
    () => [get(api).getTriggerProps().id],
  );

  // The machine's own events, for the close at an outside press.
  let send:
    ((event: { type: string; [key: string]: unknown }) => void) | undefined;
  const api = machineApi(
    () => {
      const service = useMachine(popover.machine, () => ({
        id,
        dir: machineDirection.current,
        closeOnInteractOutside,
        closeOnEscape,
        modal,
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
      }));
      send = (event) => service.send(event);
      return service;
    },
    (service) => popover.connect(service, normalizeProps),
  );

  // An outside press closes it at once, before what the press lands on
  // opens (see `closingOnPressOutside`).
  $effect(() => {
    if (!$api.open || !closeOnInteractOutside || modal) return;
    return closingOnPressOutside(
      () => [
        document.getElementById(String(get(api).getTriggerProps().id)),
        document.getElementById(String(get(api).getContentProps().id)),
      ],
      (restoreFocus) =>
        send?.({ type: "CLOSE", src: "interact-outside", restoreFocus }),
    );
  });
  // Attached (the compound's choice, in the window's style), the window
  // shares a row with the trigger, whose corners follow the two widths (see
  // `attachingToTrigger`), again on the other side.
  $effect(() => {
    const side = $api.getTriggerProps()["data-side"];
    if (!$api.open || !side) return;
    return attachingToTrigger(() => [
      document.getElementById(String(get(api).getTriggerProps().id)),
      document.getElementById(String(get(api).getContentProps().id)),
    ]);
  });
</script>

{@render children?.({ api: $api })}
