"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import * as dialog from "@zag-js/dialog";
import { useMachine, normalizeProps } from "@zag-js/react";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { returningFocus } from "@scaffold-ui-kit/helpers/zag";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * `DialogDriver` - pure behavior: the Zag `dialog` machine (open and close,
 * focus trap and return, escape and outside-click dismissal, scroll lock)
 * handed to a scoped slot (`children({ api })`). No markup, styles or BEM -
 * the generated `Dialog` compound spreads the records onto the `DialogPanel`
 * visual and the call site's own trigger.
 */
export type DialogApi = ReturnType<typeof dialog.connect>;

export interface DialogDriverProps {
  /** Controlled open state; pair it with `onOpenChange`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Trap focus and hide the page from assistive technology (default true). */
  modal?: boolean;
  /** Whether escape closes the dialog (default true). */
  closeOnEscape?: boolean;
  /** Whether a click outside the window closes it (default true). */
  closeOnInteractOutside?: boolean;
  /** `alertdialog` for a dialog that interrupts to ask something. */
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
  children: (scope: { api: DialogApi }) => ReactNode;
}

export function DialogDriver({
  open,
  defaultOpen,
  onOpenChange,
  modal = true,
  closeOnEscape = true,
  closeOnInteractOutside = true,
  role = "dialog",
  finalFocus,
  initialFocus,
  describedBy,
  preventScroll = true,
  direction,
  children,
}: DialogDriverProps) {
  const [focus] = useState(returningFocus);
  const machineDirection = usePageDirection(direction, () => [
    api.getTriggerProps().id,
    api.getContentProps().id,
  ]);
  const service = useMachine(dialog.machine, {
    dir: machineDirection,
    id: useId(),
    open,
    defaultOpen,
    onOpenChange: (details) => onOpenChange?.(details.open),
    modal,
    closeOnEscape,
    closeOnInteractOutside,
    role,
    preventScroll,
    initialFocusEl: initialFocus,
    // A consumer's id reaches the machine through `ids`, never over the element.
    ids: describedBy !== undefined ? { description: describedBy } : undefined,
    finalFocusEl: focus.finalFocusEl(
      (): unknown => api.getTriggerProps().id,
      finalFocus,
    ),
  });
  const api = dialog.connect(service, normalizeProps);
  // What has focus as the dialog opens, before Zag moves it in.
  useIsomorphicLayoutEffect(() => {
    if (api.open) focus.remember();
  }, [api.open, focus]);

  return children({ api });
}
