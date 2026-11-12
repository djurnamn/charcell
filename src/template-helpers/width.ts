/**
 * The `width` and `minWidth` props the windows share: PopoverPanel,
 * DialogPanel and ActionMenuList, and the compounds around them. The window's
 * content sits in a `content` element carrying the counts (`cellWidthProps` in `charcell/scripts`), whose
 * width the window's stylesheet works out from it: the window's root takes
 * a consumer's own `style`, so the count rides one element in.
 */
import type { TemplateNode } from "@js-template-engine/types";

/** The scripts the content element's props come from, per target: React
 *  takes a style object, Vue and Svelte a declaration string. */
export const widthImports = {
  react: "import { cellWidthPropsObject } from 'charcell/scripts/width';",
  vue: "import { cellWidthProps } from 'charcell/scripts/width';",
  svelte: "import { cellWidthProps } from 'charcell/scripts/width';",
} as const;

/** Each prop's definition; the template documents it. */
export const widthProp = { type: "number" } as const;

/** The content element, carrying `<prefix>--width` and `<prefix>--min-width`
 *  on its inline style for the props that are set. */
export const widthContent = (
  prefix: string,
  children: TemplateNode[],
  attributes: Record<string, unknown> = {},
): TemplateNode => ({
  type: "element",
  tag: "div",
  attributes: {
    ...attributes,
    $spread: { $expression: `cellWidthProps('${prefix}', width, minWidth)` },
  },
  extensions: {
    bem: { element: "content" },
    react: {
      attributes: {
        ...attributes,
        $spread: {
          $expression: `cellWidthPropsObject('${prefix}', width, minWidth)`,
        },
      },
    },
  },
  children,
});
