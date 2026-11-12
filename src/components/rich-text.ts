import { defineTemplate } from "@js-template-engine/types";
import { stylePreamble } from "../template-helpers/style-preamble";

/**
 * `RichText` - running text, as a character-cell screen prints it: wrap any
 * HTML (written, or rendered from markdown) and its headings, paragraphs,
 * lists, quotes, code, links, rules and tables take charcell's cells, its
 * tone ladder and the terminal's attributes. The look is the
 * `wysiwyg-content` mixin (`charcell/styles/mixins`), for a consumer styling
 * a container of its own the same way.
 */
export default defineTemplate({
  type: "component",
  name: "RichText",
  description: "markdown or cms content, set on the cell grid.",
  style: stylePreamble,
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellRichText" } },
      attributes: {
        style: {
          "@include cell": true,
          "@include paint": true,
          "@include wysiwyg-content": true,
        },
      },
      children: [
        /** The markup it styles: headings, paragraphs, lists, quotes, code and tables. */
        { type: "slot" },
      ],
    },
  ],
});
