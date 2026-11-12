"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import * as popover from "@zag-js/popover";
import type { Placement } from "@zag-js/popover";
import { useMachine, normalizeProps } from "@zag-js/react";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { attachingToTrigger } from "charcell/scripts/attach";
import { closingOnPressOutside } from "@scaffold-ui-kit/helpers/zag";
import { onCellGrid } from "charcell/scripts/positioning";

/**
 * `PopoverDriver` - pure behavior. It owns only the Zag `popover` machine
 * (click-to-open, dismiss on outside-click / escape, positioning) and hands the
 * live `api` to a scoped slot (`children({ api })`). No markup, styles, or
 * BEM - the generated `Popover` compound hands the trigger record to the
 * consumer's own trigger element and spreads the panel's records onto the
 * `PopoverPanel` visual. The driver is the one hand-written
 * per-framework piece (the irreducible runtime).
 */
export type PopoverApi = ReturnType<typeof popover.connect>;

export interface PopoverDriverProps {
  placement?: Placement;
  /** Whether dismiss-on-outside-interaction is active (default true). */
  closeOnInteractOutside?: boolean;
  /** Whether escape closes the panel (default true). */
  closeOnEscape?: boolean;
  /** Trap focus / block outside interaction while open (default false). */
  modal?: boolean;
  /** Controlled open state; pair it with `onOpenChange`. */
  open?: boolean;
  defaultOpen?: boolean;
  /** open-state change notification (controlled usage pairs it with `open`). */
  onOpenChange?: (open: boolean) => void;
  /**
   * Scoped slot: receives the live popover api; render the trigger + panel.
   * Called with a `{ api }` scope object to match the engine's scoped-slot
   * consumer emission (`{({ api }) => ...}`), so the generated `Popover` compound
   * composes this driver directly.
   */
  /** The reading direction its keys and placement follow: the page's, once
   *  mounted, when unset. */
  direction?: TextDirection;
  children: (scope: { api: PopoverApi }) => ReactNode;
}

export function PopoverDriver({
  placement = "bottom-start",
  closeOnInteractOutside = true,
  closeOnEscape = true,
  modal = false,
  open,
  defaultOpen,
  onOpenChange,
  direction,
  children,
}: PopoverDriverProps) {
  const apiReference = useRef<ReturnType<typeof popover.connect> | null>(null);
  const machineDirection = usePageDirection(direction, () => [
    api.getTriggerProps().id,
  ]);
  const service = useMachine(popover.machine, {
    dir: machineDirection,
    id: useId(),
    closeOnInteractOutside,
    closeOnEscape,
    modal,
    open,
    defaultOpen,
    onOpenChange: (details) => onOpenChange?.(details.open),
    // The panel opens flush: attached, it moves a row onto the trigger, and
    // apart its own margin keeps a row between them, on the grid
    // (PopoverPanel); flip/shift are Zag defaults.
    positioning: onCellGrid({ placement, gutter: 0 }, () => {
      const id = apiReference.current?.getTriggerProps().id;
      return typeof id === "string" ? document.getElementById(id) : null;
    }),
  });
  const api = popover.connect(service, normalizeProps);
  apiReference.current = api;
  const sendReference = useRef(service.send);
  sendReference.current = service.send;
  // An outside press closes the panel at once, before what it lands on
  // opens (see `closingOnPressOutside`).
  useEffect(() => {
    if (!api.open || !closeOnInteractOutside || modal) return;
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
  }, [api.open, closeOnInteractOutside, modal]);

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
      document.getElementById(
        String(apiReference.current?.getContentProps().id),
      ),
    ]);
  }, [api.open, side]);

  return children({ api });
}
