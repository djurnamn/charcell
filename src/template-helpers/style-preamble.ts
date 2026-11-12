import { definePreamble } from "@scaffold-ui-kit/helpers/template";

/**
 * The preamble every component stylesheet opens with.
 *
 * The scaffolder opens each emitted sheet with its own layer order module
 * (`./layer-order`, from the kit's `stylingLayer.order`) and wraps the rules
 * in `@layer charcell.components`: a layer's order is fixed by first
 * declaration, so a consumer loading one component's sheet before charcell's
 * base would otherwise declare `charcell.components` first and run the
 * cascade backwards.
 *
 * `styles/slots` registers the state slots, outside the layers; Sass loads a
 * module once per compilation, so it is emitted once per artifact: once in
 * the bundle, once in each per-component sheet.
 *
 * `styles/mixins` emits nothing on its own; it carries the shared mixins.
 *
 * Each loads through the package (`pkg:charcell/styles/...`), so a consumer's
 * copy of a stylesheet loads the shared styles the package keeps, or the
 * copies of them it owns.
 */
export const stylePreamble = definePreamble({
  always: [
    '@use "pkg:charcell/styles/slots";',
    '@use "pkg:charcell/styles/mixins" as *;',
  ],
})();
