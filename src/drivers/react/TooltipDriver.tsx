"use client";

import { useId, useRef, type ReactNode } from "react";
import * as tooltip from "@zag-js/tooltip";
import type { Placement } from "@zag-js/tooltip";
import { useMachine, normalizeProps } from "@zag-js/react";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { onCellGrid } from "charcell/scripts/positioning";

/**
 * `TooltipDriver` - pure behavior: the Zag `tooltip` machine (open on hover
 * and on keyboard focus, after a delay; escape closes; positioning) handed
 * to a scoped slot (`children({ api })`). No markup, styles or BEM - the
 * generated `Tooltip` compound hands the trigger record to the consumer's own
 * control and spreads the content record onto the `TooltipVisual`.
 */
export type TooltipApi = ReturnType<typeof tooltip.connect>;

export interface TooltipDriverProps {
  placement?: Placement;
  /** Milliseconds before the hint opens. */
  openDelay?: number;
  /** Milliseconds before the hint closes. */
  closeDelay?: number;
  /** The hint stays while the pointer is over it. */
  interactive?: boolean;
  /** The control's id, when another part owns it (a Popover's button). */
  triggerId?: string;
  /** Controlled open state; pair it with `onOpenChange`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Scoped slot: receives the live tooltip api. */
  /** The reading direction its keys and placement follow: the page's, once
   *  mounted, when unset. */
  direction?: TextDirection;
  children: (scope: { api: TooltipApi }) => ReactNode;
}

export function TooltipDriver({
  placement = "bottom-start",
  openDelay = 400,
  closeDelay = 150,
  interactive = true,
  triggerId,
  open,
  defaultOpen,
  onOpenChange,
  direction,
  children,
}: TooltipDriverProps) {
  const apiReference = useRef<TooltipApi | null>(null);
  const machineDirection = usePageDirection(direction, () => [
    api.getTriggerProps().id,
  ]);
  const service = useMachine(tooltip.machine, {
    dir: machineDirection,
    id: useId(),
    ids: triggerId !== undefined ? { trigger: triggerId } : undefined,
    openDelay,
    closeDelay,
    interactive,
    open,
    defaultOpen,
    onOpenChange: (details) => onOpenChange?.(details.open),
    // The hint opens flush against its control, on the cell grid.
    positioning: onCellGrid({ placement, gutter: 0 }, () => {
      const id = apiReference.current?.getTriggerProps().id;
      return typeof id === "string" ? document.getElementById(id) : null;
    }),
  });
  const api = tooltip.connect(service, normalizeProps);
  apiReference.current = api;

  return children({ api });
}
