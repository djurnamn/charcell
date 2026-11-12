/**
 * A window's `width` and `minWidth` props, in whole cells: each count as a
 * custom property on its content's inline style (`<prefix>--width`,
 * `<prefix>--min-width`), which the stylesheet turns into the content's width
 * or least width less the ring and the gutter, so the window comes out
 * exactly that many cells wide, or at least that many. Nothing for a prop
 * unset, and the window fits its content. Vue and Svelte take the
 * declaration string; React takes a style object (`cellWidthPropsObject`).
 */
function declarations(
  prefix: string,
  width: number | undefined,
  minWidth: number | undefined,
): [string, string][] {
  return [
    [`${prefix}--width`, width],
    [`${prefix}--min-width`, minWidth],
  ].flatMap(([property, value]) =>
    value === undefined ? [] : [[property as string, String(value)]],
  );
}

export function cellWidthProps(
  prefix: string,
  width: number | undefined,
  minWidth?: number,
): { style?: string } {
  const set = declarations(prefix, width, minWidth);
  return set.length
    ? {
        style: set
          .map(([property, value]) => `${property}: ${value}`)
          .join("; "),
      }
    : {};
}

export function cellWidthPropsObject(
  prefix: string,
  width: number | undefined,
  minWidth?: number,
): { style?: Record<string, string> } {
  const set = declarations(prefix, width, minWidth);
  return set.length ? { style: Object.fromEntries(set) } : {};
}
