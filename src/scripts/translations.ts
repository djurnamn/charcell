/**
 * The strings each component says, one `translations` prop per component:
 * every string has an English default, and a consumer's record names only
 * the ones it changes. SortableList's are with its engine (`sortable.ts`).
 */

/** What a Field says around its control. */
export interface FieldTranslations {
  /** Leads the error message, which has no color to carry it. */
  errorPrefix?: string;
}

export function resolveFieldTranslations(
  translations?: FieldTranslations,
): Required<FieldTranslations> {
  return { errorPrefix: translations?.errorPrefix ?? "error: " };
}

/** The word an InlineMessage leads with, per context; a colon follows it. */
export interface InlineMessageTranslations {
  informationPrefix?: string;
  successPrefix?: string;
  warningPrefix?: string;
  errorPrefix?: string;
}

export function resolveInlineMessageTranslations(
  translations?: InlineMessageTranslations,
): Required<InlineMessageTranslations> {
  return {
    informationPrefix: translations?.informationPrefix ?? "info",
    successPrefix: translations?.successPrefix ?? "success",
    warningPrefix: translations?.warningPrefix ?? "warning",
    errorPrefix: translations?.errorPrefix ?? "error",
  };
}

/** The word an InlineMessage puts in front of its message in `context`, from
 *  its translations. */
export function inlineMessagePrefix(
  context: "information" | "success" | "warning" | "error",
  translations?: InlineMessageTranslations,
): string {
  return resolveInlineMessageTranslations(translations)[`${context}Prefix`];
}

/** What a Combobox says. */
export interface ComboboxTranslations {
  /** The list's one row when nothing matches what was typed. */
  noMatchesMessage?: string;
  /** The accessible name of the button that opens the list. */
  triggerLabel?: string;
}

export function resolveComboboxTranslations(
  translations?: ComboboxTranslations,
): Required<ComboboxTranslations> {
  return {
    noMatchesMessage: translations?.noMatchesMessage ?? "no matches",
    triggerLabel: translations?.triggerLabel ?? "toggle suggestions",
  };
}

/** What a Splitter says. */
export interface SplitterTranslations {
  /** The resize handle's accessible name. */
  handleLabel?: string;
}

export function resolveSplitterTranslations(
  translations?: SplitterTranslations,
): Required<SplitterTranslations> {
  return { handleLabel: translations?.handleLabel ?? "resize panels" };
}

/** What a SplitGrid says. */
export interface SplitGridTranslations {
  /** The accessible name of each handle between two columns. */
  columnHandleLabel?: string;
  /** The accessible name of each handle between two rows. */
  rowHandleLabel?: string;
}

export function resolveSplitGridTranslations(
  translations?: SplitGridTranslations,
): Required<SplitGridTranslations> {
  return {
    columnHandleLabel: translations?.columnHandleLabel ?? "resize columns",
    rowHandleLabel: translations?.rowHandleLabel ?? "resize rows",
  };
}
