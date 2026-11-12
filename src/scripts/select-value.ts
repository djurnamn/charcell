/**
 * The item value a select hands back for the string its machine chose: the
 * machine keys every item by `String(value)`, so a number-valued item comes
 * back as its number, the way it was given.
 *
 * @param items - the select's items.
 * @param chosen - the string the machine chose, if any.
 * @returns the chosen item's own value, or `undefined` when none matches.
 */
export function chosenValue<Value extends string | number>(
  items: readonly { value: Value }[],
  chosen: string | undefined,
): Value | undefined {
  if (chosen === undefined) return undefined;
  return items.find((item) => String(item.value) === chosen)?.value;
}
