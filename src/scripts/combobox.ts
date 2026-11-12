// The Combobox's narrowing, shared by the three drivers (`charcell/scripts`).

// One collator per locale, since building one is not free.
const collators = new Map<string, Intl.Collator>();

function collatorFor(locale: string | undefined): Intl.Collator {
  const key = locale ?? "";
  let collator = collators.get(key);
  if (!collator) {
    collator = new Intl.Collator(locale, {
      usage: "search",
      sensitivity: "base",
    });
    collators.set(key, collator);
  }
  return collator;
}

/** Whether `text` holds `query` anywhere, compared by `collator`. */
function holds(text: string, query: string, collator: Intl.Collator): boolean {
  for (let start = 0; start + query.length <= text.length; start++) {
    if (collator.compare(text.slice(start, start + query.length), query) === 0)
      return true;
  }
  return false;
}

/** The items whose label holds what the reader typed, in their order: any
 *  part of the label, compared in `locale` (the runtime's own when unset) at
 *  base sensitivity, so case and accents fold by that locale's rules (`e`
 *  finds `é`, a Turkish dotted `i` stays its own letter) and composed and
 *  decomposed forms match; every item while nothing is typed. */
export function matchingItems<Item extends { label: string }>(
  items: Item[],
  typed: string,
  locale?: string,
): Item[] {
  const query = typed.trim().normalize("NFC");
  if (!query) return items;
  const collator = collatorFor(locale);
  return items.filter((item) =>
    holds(item.label.normalize("NFC"), query, collator),
  );
}

/** What the list narrows by after the input changes: what the reader typed,
 *  and nothing once a choice or the machine itself set the text. */
export const narrowingBy = (inputValue: string, reason: string | undefined) =>
  reason === "input-change" ? inputValue : "";
