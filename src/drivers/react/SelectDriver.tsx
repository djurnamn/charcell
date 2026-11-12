"use client";

import { useEffect, useId, useMemo, useRef, type ReactNode } from "react";
import * as select from "@zag-js/select";
import type { Placement } from "@zag-js/popover";
import { useMachine, normalizeProps } from "@zag-js/react";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { closingOnPressOutside } from "@scaffold-ui-kit/helpers/zag";
import { markingWider } from "charcell/scripts/select-width";
import { onCellGrid, keepingPanelInside } from "charcell/scripts/positioning";
import { chosenValue } from "charcell/scripts/select-value";

/**
 * `SelectDriver` - pure behavior: the Zag `select` machine (open/dismiss,
 * keyboard navigation, typeahead, selection) handed to a scoped slot
 * (`children({ api })`). No markup, styles, or BEM - the trigger and listbox
 * are visuals (`SelectTrigger`, `SelectListbox`) the generated `Select`
 * compound composes.
 *
 * The kit surface is single-select with one value, a string or a number;
 * the driver maps it onto Zag's array of strings and hands a number-valued
 * item's value back as a number.
 */
export interface SelectItem {
  value: string | number;
  label: string;
  /** A disabled item is announced and shown but cannot be chosen. */
  disabled?: boolean;
}

export type SelectApi = ReturnType<typeof select.connect>;

export interface SelectDriverProps {
  items: SelectItem[];
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?: (value: string | number) => void;
  disabled?: boolean;
  /** The form field name: the value submits through the machine's hidden
   *  `<select>`, which the compound renders when a name is given. */
  name?: string;
  /** The value is required for the form to submit. */
  required?: boolean;
  /** The id of the form the value belongs to, for a select outside its
   *  `<form>`. */
  form?: string;
  /** Closes the listbox once an item is chosen; `false` keeps it open. */
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
  /** `value`: the trigger fits its value, and the listbox opens as wide as
   *  its items rather than at the trigger's width. */
  fit?: "items" | "value";
  /** Scoped slot: receives the live select api; render the trigger + listbox. */
  /** The reading direction its keys and placement follow: the page's, once
   *  mounted, when unset. */
  direction?: TextDirection;
  children: (scope: { api: SelectApi }) => ReactNode;
}

export function SelectDriver({
  items,
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  required,
  form,
  closeOnSelect = true,
  open,
  defaultOpen,
  onOpenChange,
  placement = "bottom-start",
  id,
  fit = "items",
  direction,
  children,
}: SelectDriverProps) {
  const collection = useMemo(
    () =>
      select.collection({
        items,
        itemToString: (item: SelectItem) => item.label,
        itemToValue: (item: SelectItem) => String(item.value),
        isItemDisabled: (item: SelectItem) => item.disabled === true,
      }),
    [items],
  );

  const apiReference = useRef<ReturnType<typeof select.connect> | null>(null);
  const machineDirection = usePageDirection(direction, () => [
    api.getTriggerProps().id,
  ]);
  const service = useMachine(select.machine, {
    dir: machineDirection,
    id: useId(),
    ids: id !== undefined ? { trigger: id } : undefined,
    collection,
    value: value !== undefined ? [String(value)] : undefined,
    defaultValue:
      defaultValue !== undefined ? [String(defaultValue)] : undefined,
    onValueChange: (details) => {
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
    onOpenChange: (details) => onOpenChange?.(details.open),
    // The listbox opens flush against the trigger at its width, or as wide
    // as its items when the trigger fits its value; the compound fuses the
    // two (see `Select`).
    // A press on the panel around the list is inside it.
    onInteractOutside: keepingPanelInside(
      () => apiReference.current?.getPositionerProps().id,
    ),
    positioning: onCellGrid(
      { placement, gutter: 0, sameWidth: fit !== "value" },
      () => {
        const id = apiReference.current?.getTriggerProps().id;
        return typeof id === "string" ? document.getElementById(id) : null;
      },
    ),
  });
  const api = select.connect(service, normalizeProps);
  apiReference.current = api;
  const sendReference = useRef(service.send);
  sendReference.current = service.send;

  // A listbox wider than a trigger that fits its value: the pair's shared
  // row turns its far corner (see `markingWider`).
  useEffect(() => {
    if (!api.open || fit !== "value") return;
    return markingWider(() => [
      document.getElementById(
        String(apiReference.current?.getTriggerProps().id),
      ),
      document.getElementById(
        String(apiReference.current?.getContentProps().id),
      ),
    ]);
  }, [api.open, fit]);

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

  return children({ api });
}
