<script lang="ts">
  import type { Snippet } from "svelte";
  import * as dialog from "@zag-js/dialog";
  import { useMachine, normalizeProps } from "@zag-js/svelte";
  import { get } from "svelte/store";
  import { type TextDirection } from "charcell/scripts/direction";
  import { usePageDirection } from "./actions/page-direction.svelte";
  import { machineApi } from "@scaffold-ui-kit/helpers/zag/svelte";
  import { returningFocus } from "@scaffold-ui-kit/helpers/zag";

  /**
   * `DialogDriver` (Svelte) - pure behavior, the cross-target counterpart of
   * the react/vue drivers: the `@zag-js/dialog` machine handed to a scoped
   * snippet (`children({ api })`). See the React driver for the contract.
   */
  type DialogApi = ReturnType<typeof dialog.connect>;

  let {
    open = undefined,
    defaultOpen = undefined,
    onOpenChange = undefined,
    modal = true,
    closeOnEscape = true,
    closeOnInteractOutside = true,
    role = "dialog",
    finalFocus = undefined,
    initialFocus = undefined,
    describedBy = undefined,
    preventScroll = true,
    direction = undefined,
    children,
  }: {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    modal?: boolean;
    closeOnEscape?: boolean;
    closeOnInteractOutside?: boolean;
    role?: "dialog" | "alertdialog";
    /** Where focus goes as the dialog closes when neither its trigger nor
     *  what opened it is still on the page. */
    finalFocus?: () => HTMLElement | null;
    /** Where focus goes as the dialog opens, in place of its first focusable element. */
    initialFocus?: () => HTMLElement | null;
    /** The id of an element that describes the dialog, for its `aria-describedby`. */
    describedBy?: string;
    /** Lock the page's scroll while the dialog is open (default true). */
    preventScroll?: boolean;
    /** The reading direction its keys and placement follow: the page's, once
     *  mounted, when unset. */
    direction?: TextDirection;
    children?: Snippet<[{ api: DialogApi }]>;
  } = $props();

  const id = $props.id();
  const machineDirection = usePageDirection(
    () => direction,
    () => [get(api).getTriggerProps().id, get(api).getContentProps().id],
  );
  const focus = returningFocus();

  const api = machineApi(
    () =>
      useMachine(dialog.machine, () => ({
        id,
        dir: machineDirection.current,
        open,
        defaultOpen,
        onOpenChange: (details: { open: boolean }) =>
          onOpenChange?.(details.open),
        modal,
        closeOnEscape,
        closeOnInteractOutside,
        role,
        preventScroll,
        initialFocusEl: initialFocus,
        ids:
          describedBy !== undefined ? { description: describedBy } : undefined,
        finalFocusEl: focus.finalFocusEl(
          (): unknown => $api.getTriggerProps().id,
          finalFocus,
        ),
      })),
    (service) => dialog.connect(service, normalizeProps),
  );
  // What has focus as the dialog opens, before Zag moves it in.
  $effect.pre(() => {
    if ($api.open) focus.remember();
  });
</script>

{@render children?.({ api: $api })}
