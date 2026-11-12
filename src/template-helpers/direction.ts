/**
 * The reading direction, for the styles that draw one side differently from
 * the other. A component's sides are logical, `start` and `end`; what draws
 * them is physical, a stroke `left` or `right` of a cell's center pixel. A
 * rule written once per direction maps one onto the other, its first
 * compound limited to `:dir(rtl)` or to everything else, so the two never
 * match the same element.
 */
export type Direction = "ltr" | "rtl";

export const DIRECTIONS: readonly Direction[] = ["ltr", "rtl"];

export type LogicalSide = "top" | "end" | "bottom" | "start";
export type PhysicalSide = "top" | "right" | "bottom" | "left";

const QUALIFIER: Record<Direction, string> = {
  ltr: ":where(:not(:dir(rtl)))",
  rtl: ":where(:dir(rtl))",
};

/** The physical side a logical one lands on in a direction. */
export const physical = (
  side: LogicalSide,
  direction: Direction,
): PhysicalSide => {
  if (side === "start") return direction === "ltr" ? "left" : "right";
  if (side === "end") return direction === "ltr" ? "right" : "left";
  return side;
};

// The selectors of a list, split on the commas outside parentheses.
const selectors = (list: string) => {
  const out: string[] = [];
  let depth = 0;
  let from = 0;
  for (let index = 0; index < list.length; index++) {
    const character = list[index];
    if (character === "(" || character === "{") depth++;
    else if (character === ")" || character === "}") depth--;
    else if (character === "," && depth === 0) {
      out.push(list.slice(from, index).trim());
      from = index + 1;
    }
  }
  out.push(list.slice(from).trim());
  return out;
};

// The qualifier at the end of a selector's first compound: before its first
// combinator or pseudo-element outside parentheses.
const limited = (selector: string, qualifier: string) => {
  let depth = 0;
  for (let index = 0; index < selector.length; index++) {
    const character = selector[index];
    if (character === "(" || character === "{") depth++;
    else if (character === ")" || character === "}") depth--;
    else if (
      depth === 0 &&
      (/[\s>+~]/.test(character) || selector.startsWith("::", index))
    )
      return selector.slice(0, index) + qualifier + selector.slice(index);
  }
  return selector + qualifier;
};

/** A selector list, each selector limited to one direction. */
export const inDirectionSelector = (list: string, direction: Direction) =>
  selectors(list)
    .map((selector) => limited(selector, QUALIFIER[direction]))
    .join(", ");

/** Style keys, each limited to one direction. */
export const inDirection = (
  direction: Direction,
  rules: Record<string, unknown>,
): Record<string, Record<string, unknown>> =>
  Object.fromEntries(
    Object.entries(rules).map(([selector, style]) => [
      inDirectionSelector(selector, direction),
      style as Record<string, unknown>,
    ]),
  );

/** The same rules once per direction, `rules` given the direction. */
export const perDirection = (
  rules: (direction: Direction) => Record<string, unknown>,
): Record<string, Record<string, unknown>> => {
  const out: Record<string, Record<string, unknown>> = {};
  for (const direction of DIRECTIONS) {
    for (const [key, value] of Object.entries(
      inDirection(direction, rules(direction)),
    ))
      out[key] = { ...out[key], ...value };
  }
  return out;
};
