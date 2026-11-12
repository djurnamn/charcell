<script lang="ts">
  import type { Snippet } from "svelte";
  import * as select from "@zag-js/select";
  import type { Placement } from "@zag-js/popover";
  import { get } from "svelte/store";
  import { useMachine, normalizeProps } from "@zag-js/svelte";
  import { type TextDirection } from "charcell/scripts/direction";
  import { usePageDirection } from "./actions/page-direction.svelte";
  import { closingOnPressOutside } from "@scaffold-ui-kit/helpers/zag";
  import { markingWider } from "charcell/scripts/select-width";
  import { onCellGrid, keepingPanelInside } from "charcell/scripts/positioning";
  import { chosenValue } from "charcell/scripts/select-value";
  import { machineApi } from "@scaffold-ui-kit/helpers/zag/svelte";

  /**
   * `SelectDriver` (Svelte) - pure behavior, the cross-target counterpart of
   * the react/vue drivers: the `@zag-js/select` machine handed to a scoped
   * snippet (`children({ api })`). single-select, a string or number value,
   * over Zag's array of strings.
   */
  interface SelectItem {
    value: string | number;
    label: string;
    disabled?: boolean;
  }

  type SelectApi = ReturnType<typeof select.connect>;

  let {
    items,
    value = undefined,
    defaultValue = undefined,
    onValueChange = undefined,
    disabled = undefined,
    name = undefined,
    required = undefined,
    form = undefined,
    closeOnSelect = true,
    open = undefined,
    defaultOpen = undefined,
    onOpenChange = undefined,
    placement = "bottom-start",
    id = undefined,
    fit = "items",
    direction = undefined,
    children,
  }: {
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
    children?: Snippet<[{ api: SelectApi }]>;
  } = $props();

  const machineId = $props.id();
  const machineDirection = usePageDirection(
    () => direction,
    () => [get(api).getTriggerProps().id],
  );

  // The machine's own events, for the close at an outside press.
  let send:
    ((event: { type: string; [key: string]: unknown }) => void) | undefined;
  const api = machineApi(
    () => {
      const service = useMachine(select.machine, () => ({
        id: machineId,
        dir: machineDirection.current,
        ids: id !== undefined ? { trigger: id } : undefined,
        collection: select.collection({
          items,
          itemToString: (item: SelectItem) => item.label,
          itemToValue: (item: SelectItem) => String(item.value),
          isItemDisabled: (item: SelectItem) => item.disabled === true,
        }),
        value: value !== undefined ? [String(value)] : undefined,
        defaultValue:
          defaultValue !== undefined ? [String(defaultValue)] : undefined,
        onValueChange: (details: { value: string[] }) => {
          const chosen = chosenValue(items, details.value[0]);
          if (chosen !== undefined) onValueChange?.(chosen);
        },
        disabled,
        name,
        required,
        form,
        closeOnSelect,
        open,
        defaultOpen,
        onOpenChange: (details: { open: boolean }) =>
          onOpenChange?.(details.open),
        // A press on the panel around the list is inside it.
        onInteractOutside: keepingPanelInside(
          (): unknown => get(api).getPositionerProps().id,
        ),
        positioning: onCellGrid(
          { placement, gutter: 0, sameWidth: fit !== "value" },
          (): HTMLElement | null => {
            const id = get(api).getTriggerProps().id;
            return typeof id === "string" ? document.getElementById(id) : null;
          },
        ),
      }));
      send = (event) => service.send(event);
      return service;
    },
    (service) => select.connect(service, normalizeProps),
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

  // A listbox wider than a trigger that fits its value: the pair's shared
  // row turns its far corner (see `markingWider`).
  $effect(() => {
    if (!$api.open || fit !== "value") return;
    return markingWider(() => [
      document.getElementById(String(get(api).getTriggerProps().id)),
      document.getElementById(String(get(api).getContentProps().id)),
    ]);
  });
</script>

{@render children?.({ api: $api })}
