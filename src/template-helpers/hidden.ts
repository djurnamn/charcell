/**
 * An element's `display`, given up to the `hidden` attribute: the browser's
 * own `[hidden] { display: none }` sits below every layer, so an element
 * whose layered rule declares a display would stay on screen when hidden.
 * The display holds only while it is not hidden, and hidden it is none, the
 * two conditions apart as `oneOf`'s are, so each declares display once.
 *
 * ```ts
 * style: { ...displayed("flex"), gap: "1ch" }
 * // &:where(:not([hidden])) { display: flex }
 * // &[hidden]               { display: none }
 * ```
 */
export const displayed = (display: string) => ({
  "&:where(:not([hidden]))": { display },
  "&[hidden]": { display: "none" },
});
