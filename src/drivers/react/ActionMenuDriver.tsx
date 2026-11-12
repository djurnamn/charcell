"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import * as menu from "@zag-js/menu";
import type { Placement } from "@zag-js/popover";
import { useMachine, normalizeProps } from "@zag-js/react";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { attachingToTrigger, windowIn } from "charcell/scripts/attach";
import { closingOnPressOutside } from "@scaffold-ui-kit/helpers/zag";
import { onCellGrid, keepingPanelInside } from "charcell/scripts/positioning";

/**
 * `ActionMenuDriver` - pure behavior: the Zag `menu` machine (open and dismiss,
 * arrow-key highlighting, typeahead, selection) handed to a scoped slot
 * (`children({ api })`). No markup, styles or BEM - the generated `ActionMenu`
 * compound spreads the records onto the `ActionMenuList` visual and the call site's
 * own trigger.
 */
export type ActionMenuApi = ReturnType<typeof menu.connect>;

export interface MenuDriverProps {
  /** Controlled open state; pair it with `onOpenChange`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the chosen item's value. */
  onSelect?: (value: string) => void;
  /** Whether choosing an item closes the menu (default true). */
  closeOnSelect?: boolean;
  /** Whether the highlight wraps from the last item to the first (default false). */
  loopFocus?: boolean;
  placement?: Placement;
  /** The reading direction its keys and placement follow: the page's, once
   *  mounted, when unset. */
  direction?: TextDirection;
  children: (scope: { api: ActionMenuApi }) => ReactNode;
}

export function ActionMenuDriver({
  open,
  defaultOpen,
  onOpenChange,
  onSelect,
  closeOnSelect = true,
  loopFocus = false,
  placement = "bottom-start",
  direction,
  children,
}: MenuDriverProps) {
  const apiReference = useRef<ReturnType<typeof menu.connect> | null>(null);
  const machineDirection = usePageDirection(direction, () => [
    api.getTriggerProps().id,
  ]);
  const service = useMachine(menu.machine, {
    dir: machineDirection,
    id: useId(),
    open,
    defaultOpen,
    onOpenChange: (details) => onOpenChange?.(details.open),
    onSelect: (details) => onSelect?.(details.value),
    closeOnSelect,
    loopFocus,
    // The list opens flush below the trigger, like the Select's listbox.
    // A press on the panel around the list is inside it.
    onInteractOutside: keepingPanelInside(
      () => apiReference.current?.getPositionerProps().id,
    ),
    positioning: onCellGrid({ placement, gutter: 0 }, () => {
      const id = apiReference.current?.getTriggerProps().id;
      return typeof id === "string" ? document.getElementById(id) : null;
    }),
  });
  const api = menu.connect(service, normalizeProps);
  apiReference.current = api;
  const sendReference = useRef(service.send);
  sendReference.current = service.send;

  // An outside press closes it at once, before what the press lands on
  // opens (see `closingOnPressOutside`).
  useEffect(() => {
    if (!api.open) return;
    return closingOnPressOutside(
      () => [
        document.getElementById(
          String(apiReference.current?.getTriggerProps().id),
        ),
        document.getElementById(
          String(apiReference.current?.getContentProps().id),
        ),
      ],
      (restoreFocus) =>
        sendReference.current({
          type: "CLOSE",
          src: "interact-outside",
          restoreFocus,
        }),
    );
  }, [api.open]);

  // Attached (the compound's choice, in the window's style), the window
  // shares a row with the trigger, whose corners follow the two widths (see
  // `attachingToTrigger`).
  const side = (api.getTriggerProps() as Record<string, unknown>)["data-side"];
  useEffect(() => {
    if (!api.open) return;
    return attachingToTrigger(() => [
      document.getElementById(
        String(apiReference.current?.getTriggerProps().id),
      ),
      windowIn(apiReference.current?.getPositionerProps().id),
    ]);
  }, [api.open, side]);

  return children({ api });
}
