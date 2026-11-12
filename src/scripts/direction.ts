// The reading direction a driver hands its machine when the call site gives
// none: the one the page lays the component out in. A machine writes its own
// `dir` on the parts it renders (left to right unless told), so the page's is
// read past them, on the nearest element that is not one of a machine's parts
// (those carry `data-scope`).

/** A machine's reading direction. */
export type TextDirection = "ltr" | "rtl";

/**
 * The direction the page lays `element` out in, read on the nearest element
 * at or above it that is not a machine's part; undefined without one, or
 * outside a browser.
 */
export function pageDirection(
  element: Element | null | undefined,
): TextDirection | undefined {
  let node: Element | null | undefined = element;
  while (node?.hasAttribute("data-scope")) node = node.parentElement;
  if (!node || typeof getComputedStyle === "undefined") return undefined;
  return getComputedStyle(node).direction === "rtl" ? "rtl" : "ltr";
}

/** `pageDirection` of the first of `ids` that names an element. */
export function pageDirectionOf(...ids: unknown[]): TextDirection | undefined {
  if (typeof document === "undefined") return undefined;
  for (const id of ids) {
    const element =
      typeof id === "string" ? document.getElementById(id) : undefined;
    if (element) return pageDirection(element);
  }
  return undefined;
}
