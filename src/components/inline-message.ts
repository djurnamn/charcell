import { defineTemplate } from "@js-template-engine/types";
import { stylePreamble } from "../template-helpers/style-preamble";
import { displayed } from "../template-helpers/hidden";

/**
 * `InlineMessage` - a status message as a terminal prints one: with
 * no color to carry the kind, the `context` leads the line as text
 * (`info:`, `success:`, `warning:`, `error:`, the way Field's message leads
 * with `error:`), bold, and the message follows it. An optional `title` takes
 * the first row and the default slot the rows under it, both one cell past
 * the prefix.
 *
 * The role follows the context: `alert` for an error (announced at once),
 * `status` otherwise (announced politely); `role` overrides it, for a notice
 * that is already on the page when it loads and should not be announced at
 * all.
 */
export default defineTemplate({
  type: "component",
  name: "InlineMessage",
  description:
    "a message that names its kind in words: info, success, warning or error.",
  style: stylePreamble,
  extensions: {
    react: {
      imports: [
        "import { inlineMessagePrefix, type InlineMessageTranslations } from 'charcell/scripts/translations';",
      ],
    },
    vue: {
      imports: [
        "import { inlineMessagePrefix, type InlineMessageTranslations } from 'charcell/scripts/translations';",
      ],
    },
    svelte: {
      imports: [
        "import { inlineMessagePrefix, type InlineMessageTranslations } from 'charcell/scripts/translations';",
      ],
    },
  },
  props: {
    /** The kind of message, printed bold as the line's prefix (`info:` for
     *  `information`, `error:` and so on). */
    context: {
      type: "'information' | 'success' | 'warning' | 'error'",
      default: "information",
    },
    /** A bold first row, above the message in the default slot. */
    title: { type: "string" },
    /** The word each context prints before its colon (`information` prints
     *  `info` by default). */
    translations: { type: "InlineMessageTranslations" },
    /** Overrides the role the context picks (`alert` for an error, `status` otherwise). */
    role: { type: "string" },
  },
  children: [
    {
      type: "element",
      tag: "div",
      passthrough: true,
      extensions: { bem: { block: "CharcellInlineMessage" } },
      attributes: {
        role: {
          $expression: "role ?? (context === 'error' ? 'alert' : 'status')",
        },
        style: {
          "@include cell": true,
          "@include paint": true,
          ...displayed("grid"),
          gridTemplateColumns: "max-content minmax(0, 1fr)",
          columnGap: "1ch",
          "&__context": { fontWeight: "700" },
          "&__title": { fontWeight: "700" },
          "&__title, &__message": { gridColumn: "2" },
        },
      },
      children: [
        {
          type: "element",
          tag: "span",
          extensions: { bem: { element: "context" } },
          children: [
            {
              type: "text",
              expression:
                "inlineMessagePrefix(context ?? 'information', translations) + ':'",
            },
          ],
        },
        {
          type: "conditional",
          conditions: [
            {
              statement: "if",
              condition: "title",
              children: [
                {
                  type: "element",
                  tag: "div",
                  extensions: { bem: { element: "title" } },
                  children: [{ type: "text", expression: "title" }],
                },
              ],
            },
          ],
        },
        {
          type: "element",
          tag: "div",
          extensions: { bem: { element: "message" } },
          children: [
            /** The rows under the message's first. */ { type: "slot" },
          ],
        },
      ],
    },
  ],
});
