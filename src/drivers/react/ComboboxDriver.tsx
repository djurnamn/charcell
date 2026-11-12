"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as combobox from "@zag-js/combobox";
import type { Placement } from "@zag-js/popover";
import { useMachine, normalizeProps } from "@zag-js/react";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";
import { matchingItems, narrowingBy } from "charcell/scripts/combobox";
import {
  clearingOnReset,
  closingOnPressOutside,
} from "@scaffold-ui-kit/helpers/zag";
import { markingWider } from "charcell/scripts/select-width";
import { onCellGrid, keepingPanelInside } from "charcell/scripts/positioning";

/**
 * `ComboboxDriver` - pure behavior: the Zag `combobox` machine (typing to
 * narrow, arrow-key highlighting, choosing, open and dismiss) handed to a
 * scoped slot (`children({ api, matches })`), with the items that match what
 * the reader typed. No markup, styles or BEM - the field and the list are
 * visuals (`ComboboxField`, `SelectListbox`) the generated `Combobox`
 * compound composes.
 *
 * The kit surface is single-choice with a plain `string` value, as the
 * Select's; the list narrows to the items whose label holds the typed text,
 * and shows them all again once a choice is made or the list opens from its
 * `▾`.
 */
export interface ComboboxItem {
  value: string;
  label: string;
  /** A disabled item is announced and shown but cannot be chosen. */
  disabled?: boolean;
}

export type ComboboxApi = ReturnType<typeof combobox.connect>;

export interface ComboboxDriverProps {
  items: ComboboxItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placement?: Placement;
  /** The locale the list narrows in, a BCP 47 tag; the runtime's own when unset. */
  locale?: string;
  /** The input's id: a `Field` points its label at it (`htmlFor`). */
  id?: string;
  /** The accessible name of the button that opens the list. */
  triggerLabel?: string;
  /** Scoped slot: the live combobox api, and the items that match. */
  /** The reading direction its keys and placement follow: the page's, once
   *  mounted, when unset. */
  direction?: TextDirection;
  children: (scope: { api: ComboboxApi; matches: ComboboxItem[] }) => ReactNode;
}

export function ComboboxDriver({
  items,
  value,
  defaultValue,
  onValueChange,
  disabled,
  placement = "bottom-start",
  locale,
  id,
  triggerLabel,
  direction,
  children,
}: ComboboxDriverProps) {
  const [typed, setTyped] = useState("");
  const matches = useMemo(
    () => matchingItems(items, typed, locale),
    [items, typed, locale],
  );
  const collection = useMemo(
    () =>
      combobox.collection({
        items: matches,
        itemToString: (item: ComboboxItem) => item.label,
        itemToValue: (item: ComboboxItem) => item.value,
        isItemDisabled: (item: ComboboxItem) => item.disabled === true,
      }),
    [matches],
  );

  const apiReference = useRef<ComboboxApi | null>(null);
  const machineDirection = usePageDirection(direction, () => [
    api.getInputProps().id,
  ]);
  const service = useMachine(combobox.machine, {
    dir: machineDirection,
    id: useId(),
    ids: id !== undefined ? { input: id } : undefined,
    translations: { triggerLabel },
    collection,
    value: value !== undefined ? [value] : undefined,
    defaultValue: defaultValue !== undefined ? [defaultValue] : undefined,
    onValueChange: (details) => {
      if (details.value[0] !== undefined) onValueChange?.(details.value[0]);
    },
    onInputValueChange: (details) =>
      setTyped(narrowingBy(details.inputValue, details.reason)),
    onOpenChange: (details) => {
      if (!details.open) setTyped("");
    },
    disabled,
    openOnClick: true,
    // The list opens flush against the field, at least its width; the
    // compound fuses the two (see `Combobox`).
    // A press on the panel around the list is inside it.
    onInteractOutside: keepingPanelInside(
      () => apiReference.current?.getPositionerProps().id,
    ),
    positioning: onCellGrid({ placement, gutter: 0, sameWidth: false }, () => {
      const id = apiReference.current?.getControlProps().id;
      return typeof id === "string" ? document.getElementById(id) : null;
    }),
  });
  const api = combobox.connect(service, normalizeProps);
  apiReference.current = api;
  const sendReference = useRef(service.send);
  sendReference.current = service.send;

  // The field and the list, as they are in the document.
  const parts = useRef(() => [
    document.getElementById(String(apiReference.current?.getControlProps().id)),
    document.getElementById(String(apiReference.current?.getContentProps().id)),
  ]).current;

  // A list wider than the field: the pair's shared row turns its far corner
  // (see `markingWider`).
  useEffect(() => {
    if (!api.open) return;
    return markingWider(parts);
  }, [api.open, parts]);

  // An outside press closes it at once, before what the press lands on
  // opens (see `closingOnPressOutside`).
  useEffect(() => {
    if (!api.open) return;
    return closingOnPressOutside(parts, (restoreFocus) =>
      sendReference.current({
        type: "CLOSE",
        src: "interact-outside",
        restoreFocus,
      }),
    );
  }, [api.open, parts]);

  // A form reset clears the choice (see `clearingOnReset`).
  useEffect(
    () =>
      clearingOnReset(
        () =>
          document.getElementById(
            String(apiReference.current?.getInputProps().id),
          ),
        () => apiReference.current?.clearValue(),
      ),
    [],
  );

  return children({ api, matches });
}
