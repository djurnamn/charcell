/**
 * The attributes a consumer gives a labeled native control (a checkbox, a
 * toggle) that only work on its `<input>`: the ARIA a Field links it by, the
 * form attributes, focus order, and the event handlers, which on the label
 * would miss a focus or a blur and run twice for a click. The label root
 * keeps the class, the style, the data attributes and the element handle.
 * The props the component declares (`name`, `value`, `disabled`) are bound on
 * the input already and skipped here.
 *
 * ```ts
 * { tag: "input", passthrough: nativeInputAttributes }
 * ```
 */
export const nativeInputAttributes = {
  attributes: ["aria-*", "on*", "required", "form", "autofocus", "tabindex"],
};
