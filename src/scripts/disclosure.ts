/**
 * The open state of a native `<details>`, for AccordionItem:
 * uncontrolled, the platform opens and closes it and `onOpenChange` reports
 * each change; held through `open`, every change is reported and the element
 * stays at the value it is given until the consumer gives another.
 */

type OpenChange = ((open: boolean) => void) | undefined;

/** What a native or framework event carries, on every target. */
type DisclosureEvent = {
  currentTarget: EventTarget | null;
  preventDefault(): void;
};

/**
 * The summary was pressed. A held disclosure does not toggle itself: the
 * press is reported as the change it asks for.
 */
export function pressedDisclosure(
  event: DisclosureEvent,
  open: boolean | undefined,
  onOpenChange: OpenChange,
): void {
  if (open === undefined) return;
  event.preventDefault();
  onOpenChange?.(!open);
}

/**
 * The disclosure toggled, by the platform, a sibling sharing its `name`, or
 * the tree's keys. Uncontrolled, the change is reported; held, a change the
 * consumer did not give is reported and put back.
 */
export function toggledDisclosure(
  event: DisclosureEvent,
  open: boolean | undefined,
  onOpenChange: OpenChange,
): void {
  const details = event.currentTarget as HTMLDetailsElement | null;
  if (!details) return;
  if (open === undefined) {
    onOpenChange?.(details.open);
    return;
  }
  if (details.open === open) return;
  onOpenChange?.(details.open);
  details.open = open;
}

/**
 * A TreeGroup's row was pressed. Its open state is the row's `aria-expanded`:
 * uncontrolled, the press flips it and reports the new state; held through
 * `open`, the press is reported as the change it asks for and the row stays
 * as given. A group that keeps open does nothing.
 */
export function pressedTreeGroup(
  event: DisclosureEvent,
  collapsible: boolean,
  open: boolean | undefined,
  onOpenChange: OpenChange,
): void {
  const row = event.currentTarget as HTMLElement | null;
  if (!collapsible || !row) return;
  const next = row.getAttribute("aria-expanded") !== "true";
  if (open === undefined) row.setAttribute("aria-expanded", String(next));
  onOpenChange?.(next);
}

/** Enter or space on a TreeGroup's row presses it, as on a button. */
export function keyedTreeGroup(
  event: DisclosureEvent & { target: EventTarget | null },
): void {
  const { key } = event as unknown as { key?: string };
  const row = event.currentTarget as HTMLElement | null;
  if (!row?.hasAttribute("aria-expanded") || event.target !== row) return;
  if (key !== "Enter" && key !== " ") return;
  event.preventDefault();
  row.click();
}
