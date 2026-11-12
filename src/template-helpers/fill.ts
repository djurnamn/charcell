/**
 * The `fill` prop the layout components share: the root takes its
 * container's box, whatever lays it out. It grows along a flex container's
 * axis and stretches across it, stretches to a grid cell, and takes the full
 * height of a block that has one. The root already shrinks below its content
 * (`min-width` and `min-height` are 0), so a filled pane scrolls or clips
 * inside the box instead of pushing it.
 */

/** The prop's definition; the template documents it. */
export const fillProp = { type: "boolean" } as const;

/** The modifier class, on the block's root. */
export const fillClass = (block: string) => ({
  condition: "fill === true",
  attributes: { class: [`${block}--fill`] },
});

/** The modifier's declarations, nested in the root's style. */
export const fillStyles = () => ({
  "&--fill": {
    // longhands: the root may state its own `flex-direction`.
    flexGrow: "1",
    flexShrink: "1",
    flexBasis: "0",
    alignSelf: "stretch",
    height: "100%",
  },
});
