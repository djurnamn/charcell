/**
 * What a native control's `change` event carries, read where it bubbles to.
 * Checkbox, Toggle and RadioGroup bind `change` on their root and hand the
 * consumer the plain value.
 *
 * A held control (given its `checked`, `pressed` or `value`) changes only
 * when the consumer gives it a new value, but the browser has already
 * changed the input by the time the event arrives. So each reader takes the
 * held value and puts the input back to it; a consumer who takes the change
 * gives the new value, and the framework sets it.
 */

/** The checked state of the checkbox a `change` event came from; a held one is put back. */
export function changedChecked(
  event: { target: EventTarget | null },
  held?: boolean,
): boolean {
  const input = event.target as HTMLInputElement;
  const next = input.checked;
  if (held !== undefined) input.checked = held;
  return next;
}

/**
 * A ref for a checkbox's `indeterminate` state, which is a DOM property with
 * no attribute. React calls a new ref on every render, so the property follows
 * the prop.
 */
export function indeterminateRef(
  indeterminate: boolean | undefined,
): (element: HTMLInputElement | null) => void {
  return (element) => {
    if (element) element.indeterminate = indeterminate === true;
  };
}

/** The value of the radio a `change` event came from; a held group is put back to its value. */
export function changedValue(
  event: { target: EventTarget | null },
  held?: string,
): string {
  const input = event.target as HTMLInputElement;
  const next = input.value;
  if (held !== undefined && held !== next) {
    const group = input.closest("[role=radiogroup]");
    for (const radio of group?.querySelectorAll<HTMLInputElement>(
      "input[type=radio]",
    ) ?? [input])
      radio.checked = radio.value === held;
  }
  return next;
}

/**
 * Grows a Textarea to its content, for browsers the stylesheet cannot size:
 * where `field-sizing: content` and typed `attr()` both work, the CSS does it
 * (from the first render) and this does nothing. Elsewhere it sets the height
 * to the content's as the user types; the `rows` height stays the minimum,
 * since the measured height never falls below it, and the height is snapped
 * to whole rows, so the field stays on the grid.
 */
export function syncTextareaHeight(target: EventTarget | null): void {
  const element = target as HTMLTextAreaElement | null;
  if (element === null || typeof getComputedStyle !== "function") return;
  if (textareaSizesItself()) return;
  element.style.height = "auto";
  const style = getComputedStyle(element);
  const row = parseFloat(style.lineHeight);
  const padding =
    parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const border =
    parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  // `scrollHeight` is rounded to whole pixels; the content is whole rows.
  const rows = Math.round((element.scrollHeight - padding) / row);
  element.style.height = `${rows * row + padding + border}px`;
}

function textareaSizesItself(): boolean {
  return (
    typeof CSS !== "undefined" &&
    CSS.supports("field-sizing", "content") &&
    CSS.supports("min-height", "calc(attr(rows type(<number>), 3) * 1px)")
  );
}
