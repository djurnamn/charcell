<script lang="ts">
  import type { Snippet } from "svelte";
  import * as menu from "@zag-js/menu";
  import type { Placement } from "@zag-js/popover";
  import { get } from "svelte/store";
  import { useMachine, normalizeProps } from "@zag-js/svelte";
  import { type TextDirection } from "charcell/scripts/direction";
  import { usePageDirection } from "./actions/page-direction.svelte";
  import { attachingToTrigger, windowIn } from "charcell/scripts/attach";
  import { closingOnPressOutside } from "@scaffold-ui-kit/helpers/zag";
  import { onCellGrid, keepingPanelInside } from "charcell/scripts/positioning";
  import { machineApi } from "@scaffold-ui-kit/helpers/zag/svelte";

  /**
   * `ActionMenuDriver` (Svelte) - pure behavior, the cross-target counterpart of
   * the react/vue drivers: the `@zag-js/menu` machine handed to a scoped
   * snippet (`children({ api })`). See the React driver for the contract.
   */
  type ActionMenuApi = ReturnType<typeof menu.connect>;

  let {
    open = undefined,
    defaultOpen = undefined,
    onOpenChange = undefined,
    onSelect = undefined,
    closeOnSelect = true,
    loopFocus = false,
    placement = "bottom-start",
    direction = undefined,
    children,
  }: {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSelect?: (value: string) => void;
    closeOnSelect?: boolean;
    loopFocus?: boolean;
    placement?: Placement;
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
    children?: Snippet<[{ api: ActionMenuApi }]>;
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
      const service = useMachine(menu.machine, () => ({
        id,
        dir: machineDirection.current,
        open,
        defaultOpen,
        onOpenChange: (details: { open: boolean }) =>
          onOpenChange?.(details.open),
        onSelect: (details: { value: string }) => onSelect?.(details.value),
        closeOnSelect,
        loopFocus,
        // A press on the panel around the list is inside it.
        onInteractOutside: keepingPanelInside(
          (): unknown => get(api).getPositionerProps().id,
        ),
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
    (service) => menu.connect(service, normalizeProps),
  );

  // An outside press closes it at once, before what the press lands on
  // opens (see `closingOnPressOutside`).
  $effect(() => {
    if (!$api.open) return;
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
      windowIn(get(api).getPositionerProps().id),
    ]);
  });
</script>

{@render children?.({ api: $api })}
