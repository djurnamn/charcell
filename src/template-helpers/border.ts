/**
 * The `border` props every ringed component shares, as box drawing styles a
 * ring's sides: `single` (`─`, the default), `none`, `rounded` (single, with
 * `╭ ╮ ╯ ╰` where two rounded sides meet), `heavy` (`━`) or `double` (`═`).
 * `border` sets every side, `borderX` and `borderY` the start and end and
 * the top and bottom, and `borderTop`, `borderEnd`, `borderBottom` and
 * `borderStart` one each; the narrower prop wins. The start and end follow
 * the reading direction. A side's style is a modifier
 * (`--border-top-heavy`) setting the flag the `ring` mixin reads
 * (`_mixins.scss`, `ring-side`), on the physical side it lands on, and its
 * corners follow from its neighbors'.
 */
import { oneOf } from "@scaffold-ui-kit/helpers/template";
import {
  DIRECTIONS,
  inDirection,
  physical,
  type LogicalSide,
  type PhysicalSide,
} from "./direction";

export const borderStyle = "'none' | 'single' | 'rounded' | 'heavy' | 'double'";

export type BorderValue = "none" | "single" | "rounded" | "heavy" | "double";

const SIDES: readonly LogicalSide[] = ["top", "end", "bottom", "start"];
// The styles a modifier sets: single is the ring with no flag.
const STYLES = ["none", "rounded", "heavy", "double"] as const;

const capitalized = (side: LogicalSide) =>
  side[0].toUpperCase() + side.slice(1);
const axis = (side: LogicalSide) =>
  side === "top" || side === "bottom" ? "borderY" : "borderX";
const across = (side: LogicalSide) => side === "top" || side === "bottom";

/** Each border prop's definition; the template documents it. */
export const borderProp = { type: borderStyle } as const;

/** A side's style, as an expression: its own prop, its axis, `border`, then
 *  the component's default for it. */
export const borderOf = (
  side: LogicalSide,
  defaults: Partial<Record<LogicalSide, BorderValue>> = {},
  axes = true,
) =>
  `(border${capitalized(side)} ?? ${axes ? `${axis(side)} ?? ` : ""}border ?? '${defaults[side] ?? "single"}')`;

/** The modifier classes, one per side that is not single; `axes: false` for a
 *  component without `borderX` and `borderY`. */
export const borderClasses = (
  block: string,
  defaults: Partial<Record<LogicalSide, BorderValue>> = {},
  sides: readonly LogicalSide[] = SIDES,
  axes = true,
) =>
  sides.flatMap((side) =>
    STYLES.map((style) => ({
      condition: `${borderOf(side, defaults, axes)} === '${style}'`,
      attributes: { class: [`${block}--border-${side}-${style}`] },
    })),
  );

const merge = (
  out: Record<string, Record<string, unknown>>,
  rules: Record<string, Record<string, unknown>>,
) => {
  for (const [key, value] of Object.entries(rules))
    out[key] = { ...out[key], ...value };
};

/** The modifier rules, setting each side's flag on `target`, the element that
 *  draws the ring (`&::before`, or `&` for a text field). The start and end
 *  are written once per direction, each setting the physical side's flag. */
export const borderStyles = (
  target = "&::before",
  sides: readonly LogicalSide[] = SIDES,
) => {
  const out: Record<string, Record<string, unknown>> = {};
  const rule = (side: PhysicalSide, style: string) => {
    const flag = { [`@include ring-side(${side}, ${style})`]: true };
    return target === "&" ? flag : { [target]: flag };
  };
  for (const side of sides) {
    for (const style of STYLES) {
      if (across(side)) {
        merge(out, {
          [`&--border-${side}-${style}`]: rule(side as PhysicalSide, style),
        });
        continue;
      }
      for (const direction of DIRECTIONS)
        merge(
          out,
          inDirection(direction, {
            [`&--border-${side}-${style}`]: rule(
              physical(side, direction),
              style,
            ),
          }),
        );
    }
  }
  return out;
};

// A heavy or double side's inner line, from the stroke's pixel (the ring's
// `ring-inner`): toward the content by the gap for double, by the second pixel
// for heavy, which lies inward only on the right and bottom.
const innerOffset = (side: PhysicalSide, style: "heavy" | "double") => {
  const inward = side === "left" || side === "top" ? 1 : -1;
  if (style === "double") return `calc(${inward} * var(--charcell-stroke-gap))`;
  return inward > 0 ? "0px" : "-1px";
};

/** `borderStyles`, plus each heavy or double side's inner line as
 *  `--<prefix>-<physical side>` on the block, for strokes inside the ring that
 *  run on to meet it (`┠ ╟`); merged where they share a modifier's rule.
 *  `target` is the ring's element, as for `borderStyles`. */
export const borderStylesMeeting = (
  prefix: string,
  sides: readonly LogicalSide[] = SIDES,
  target = "&::before",
) => {
  const out: Record<string, Record<string, unknown>> = {};
  merge(out, borderStyles(target, sides));
  const inner = (side: LogicalSide, landing: PhysicalSide) =>
    oneOf([`--border-${side}-heavy`, `--border-${side}-double`], {
      // Stated on every block, so a ring nested inside another never reads
      // the outer one's.
      none: { [`${prefix}-${landing}`]: "0px" },
      [`--border-${side}-heavy`]: {
        [`${prefix}-${landing}`]: innerOffset(landing, "heavy"),
      },
      [`--border-${side}-double`]: {
        [`${prefix}-${landing}`]: innerOffset(landing, "double"),
      },
    });
  for (const side of sides) {
    if (across(side)) {
      merge(out, inner(side, side as PhysicalSide));
      continue;
    }
    for (const direction of DIRECTIONS)
      merge(
        out,
        inDirection(direction, inner(side, physical(side, direction))),
      );
  }
  return out;
};
