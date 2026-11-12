<script lang="ts">
  import type { Snippet } from "svelte";
  import * as combobox from "@zag-js/combobox";
  import { get } from "svelte/store";
  import { useMachine, normalizeProps } from "@zag-js/svelte";
  import { type TextDirection } from "charcell/scripts/direction";
  import { usePageDirection } from "./actions/page-direction.svelte";
  import { matchingItems, narrowingBy } from "charcell/scripts/combobox";
  import {
    clearingOnReset,
    closingOnPressOutside,
  } from "@scaffold-ui-kit/helpers/zag";
  import { markingWider } from "charcell/scripts/select-width";
  import { onCellGrid, keepingPanelInside } from "charcell/scripts/positioning";
  import { machineApi } from "@scaffold-ui-kit/helpers/zag/svelte";

  /**
   * `ComboboxDriver` (Svelte) - pure behavior, the cross-target counterpart
   * of the react/vue drivers: the `@zag-js/combobox` machine handed to a
   * scoped snippet (`children({ api, matches })`), with the items that match
   * what the reader typed. See the React driver for the contract.
   */
  interface ComboboxItem {
    value: string;
    label: string;
    disabled?: boolean;
  }

  type ComboboxApi = ReturnType<typeof combobox.connect>;

  let {
    items,
    value = undefined,
    defaultValue = undefined,
    onValueChange = undefined,
    disabled = undefined,
    placement = "bottom-start",
    locale = undefined,
    id = undefined,
    triggerLabel = undefined,
    direction = undefined,
    children,
  }: {
    items: ComboboxItem[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    placement?: combobox.Placement;
    /** The locale the list narrows in, a BCP 47 tag; the runtime's own when unset. */
    locale?: string;
    /** The input's id: a `Field` points its label at it (`htmlFor`). */
    id?: string;
    /** The accessible name of the button that opens the list. */
    triggerLabel?: string;
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
    children?: Snippet<[{ api: ComboboxApi; matches: ComboboxItem[] }]>;
  } = $props();

  const machineId = $props.id();
  const machineDirection = usePageDirection(
    () => direction,
    () => [get(api).getInputProps().id],
  );
  let typed = $state("");
  const matches = $derived(matchingItems(items, typed, locale));

  // The machine's own events, for the close at an outside press.
  let send:
    ((event: { type: string; [key: string]: unknown }) => void) | undefined;
  const api = machineApi(
    () => {
      const service = useMachine(combobox.machine, () => ({
        id: machineId,
        dir: machineDirection.current,
        ids: id !== undefined ? { input: id } : undefined,
        translations: { triggerLabel },
        collection: combobox.collection({
          items: matches,
          itemToString: (item: ComboboxItem) => item.label,
          itemToValue: (item: ComboboxItem) => item.value,
          isItemDisabled: (item: ComboboxItem) => item.disabled === true,
        }),
        value: value !== undefined ? [value] : undefined,
        defaultValue: defaultValue !== undefined ? [defaultValue] : undefined,
        onValueChange: (details: { value: string[] }) => {
          if (details.value[0] !== undefined) onValueChange?.(details.value[0]);
        },
        onInputValueChange: (details: {
          inputValue: string;
          reason?: string;
        }) => (typed = narrowingBy(details.inputValue, details.reason)),
        onOpenChange: (details: { open: boolean }) => {
          if (!details.open) typed = "";
        },
        disabled,
        openOnClick: true,
        // A press on the panel around the list is inside it.
        onInteractOutside: keepingPanelInside(
          (): unknown => get(api).getPositionerProps().id,
        ),
        positioning: onCellGrid(
          { placement, gutter: 0, sameWidth: false },
          (): HTMLElement | null => {
            const id = get(api).getControlProps().id;
            return typeof id === "string" ? document.getElementById(id) : null;
          },
        ),
      }));
      send = (event) => service.send(event);
      return service;
    },
    (service) => combobox.connect(service, normalizeProps),
  );

  // The field and the list, as they are in the document.
  const parts = () => [
    document.getElementById(String(get(api).getControlProps().id)),
    document.getElementById(String(get(api).getContentProps().id)),
  ];

  // A list wider than the field turns the pair's far corner (see
  // `markingWider`); an outside press closes it at once, before what the
  // press lands on opens (see `closingOnPressOutside`).
  $effect(() => {
    if (!$api.open) return;
    const unmark = markingWider(parts);
    const unpress = closingOnPressOutside(parts, (restoreFocus) =>
      send?.({ type: "CLOSE", src: "interact-outside", restoreFocus }),
    );
    return () => {
      unmark();
      unpress();
    };
  });

  // A form reset clears the choice (see `clearingOnReset`).
  $effect(() =>
    clearingOnReset(
      () => document.getElementById(String(get(api).getInputProps().id)),
      () => get(api).clearValue(),
    ),
  );
</script>

{@render children?.({ api: $api, matches })}
