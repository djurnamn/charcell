"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import * as tabs from "@zag-js/tabs";
import { useMachine, normalizeProps } from "@zag-js/react";
import { type TextDirection } from "charcell/scripts/direction";
import { usePageDirection } from "./direction/use-page-direction";

/**
 * `TabsDriver` - pure behavior: the Zag `tabs` machine (the selected tab,
 * arrow-key movement along the list, the tab and panel wiring) handed to a
 * scoped slot (`children({ api, scripted })`), `scripted` once it has
 * mounted, never on the server. No markup, styles or BEM - the generated
 * `Tabs` compound spreads the records onto the `TabList` and `TabPanel`
 * visuals.
 */
export type TabsApi = ReturnType<typeof tabs.connect>;

export interface TabsDriverProps {
  /** Controlled selected tab; pair it with `onValueChange`. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The reading direction its keys and placement follow: the page's, once
   *  mounted, when unset. */
  direction?: TextDirection;
  children: (scope: { api: TabsApi; scripted: boolean }) => ReactNode;
}

export function TabsDriver({
  value,
  defaultValue,
  onValueChange,
  direction,
  children,
}: TabsDriverProps) {
  const machineDirection = usePageDirection(direction, () => [
    api.getListProps().id,
  ]);
  const service = useMachine(tabs.machine, {
    dir: machineDirection,
    id: useId(),
    value,
    defaultValue,
    onValueChange: (details) => onValueChange?.(details.value),
  });
  const api = tabs.connect(service, normalizeProps);
  // Running in the browser: the root's fallback for a failed page is off.
  const [scripted, setScripted] = useState(false);
  useEffect(() => setScripted(true), []);

  return children({ api, scripted });
}
