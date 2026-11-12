// The Tree's behavior, framework-agnostic: the drivers attach it to the
// visual's root and it finds the rows by their classes. It gives the tree
// the ARIA tree pattern: one tab stop (the selected row, or the first),
// the arrow keys through the rows a reader can see, home and end, and
// type-ahead by label (`charcell/scripts`). The rows stay what they are -
// buttons, links and the groups' own rows - so enter and space do what they
// always did; a group's row carries its open state as `aria-expanded`, and
// the engine opens and closes it by pressing it.

const ROOT = "CharcellTree";
const ITEM = "CharcellTreeItem";
const GROUP = "CharcellTreeGroup";

/** A tree's rows: its items and its groups' label rows. */
const ROWS = `.${ITEM}, .${GROUP} > .${GROUP}__summary`;

/** How long a reader has to type the next letter of a label. */
const TYPE_AHEAD_MILLISECONDS = 500;

/**
 * The row a key moves to among `rows` (the visible ones, in order) from
 * `index`: the next or previous, the first or the last; undefined for a key
 * that is not one of these.
 */
export function stepRow(
  key: string,
  index: number,
  count: number,
): number | undefined {
  if (count === 0) return undefined;
  if (key === "ArrowDown") return Math.min(count - 1, index + 1);
  if (key === "ArrowUp") return Math.max(0, index - 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
}

/**
 * The first label after `index` (wrapping) that starts with `typed`, among
 * `labels`; a run of one letter repeated cycles through the labels that
 * start with it. Undefined when none does.
 */
export function typeAhead(
  labels: string[],
  index: number,
  typed: string,
): number | undefined {
  const text = typed.toLowerCase();
  const repeated = [...text].every((letter) => letter === text[0]);
  const search = repeated ? text.charAt(0) : text;
  // A new search starts from the next row; a longer one may stay put.
  const from = repeated || text.length === 1 ? index + 1 : index;
  for (let offset = 0; offset < labels.length; offset++) {
    const at = (from + offset) % labels.length;
    if (labels[at]!.trim().toLowerCase().startsWith(search)) return at;
  }
  return undefined;
}

/**
 * Attaches a tree's behavior to its visual's root; `destroy` detaches it.
 */
export class TreeEngine {
  private root: HTMLElement;
  private current: HTMLElement | undefined;
  private typed = "";
  private typedAt = 0;
  private observer: MutationObserver | undefined;
  private cleanups: (() => void)[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    const listen = <Type extends keyof HTMLElementEventMap>(
      type: Type,
      handler: (event: HTMLElementEventMap[Type]) => void,
      options?: AddEventListenerOptions,
    ) => {
      root.addEventListener(type, handler as EventListener, options);
      this.cleanups.push(() =>
        root.removeEventListener(type, handler as EventListener, options),
      );
    };
    listen("keydown", (event) => this.key(event));
    listen("focusin", (event) => {
      const row = this.rowOf(event.target);
      if (row) this.focusable(row);
    });
    if (typeof MutationObserver !== "undefined") {
      this.observer = new MutationObserver(() => this.sync());
      this.observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["aria-expanded", "aria-current", "disabled"],
      });
    }
    this.sync();
  }

  destroy() {
    this.observer?.disconnect();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }

  /** This tree's rows, in order: not a nested tree's, not a disabled one. */
  private rows(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(ROWS)].filter(
      (row) =>
        row.closest(`.${ROOT}`) === this.root &&
        !(row as HTMLButtonElement).disabled,
    );
  }

  /** A row a reader can see: no group around it is closed (a closed
   *  group's own label row shows). */
  private visible(row: HTMLElement): boolean {
    let group = row.parentElement?.closest<HTMLElement>(`.${GROUP}`);
    // A group's label row is its group's, and shows with it.
    if (row.classList.contains(`${GROUP}__summary`))
      group = group?.parentElement?.closest<HTMLElement>(`.${GROUP}`);
    while (group && this.root.contains(group)) {
      const own = group.querySelector(`:scope > .${GROUP}__summary`);
      if (own?.getAttribute("aria-expanded") === "false") return false;
      group = group.parentElement?.closest<HTMLElement>(`.${GROUP}`);
    }
    return true;
  }

  private shown(): HTMLElement[] {
    return this.rows().filter((row) => this.visible(row));
  }

  /** The row an event's target is, or is in. */
  private rowOf(target: EventTarget | null): HTMLElement | undefined {
    if (!(target instanceof Element)) return undefined;
    const row = target.closest<HTMLElement>(ROWS);
    return row && this.rows().includes(row) ? row : undefined;
  }

  /** Whether a row is a group's that folds, and open. */
  private folding(row: HTMLElement): { open: boolean } | undefined {
    const expanded = row.classList.contains(`${GROUP}__summary`)
      ? row.getAttribute("aria-expanded")
      : null;
    return expanded === null ? undefined : { open: expanded === "true" };
  }

  /** The label row of the group a row sits in. */
  private parentRow(row: HTMLElement): HTMLElement | undefined {
    const own = row.classList.contains(`${GROUP}__summary`)
      ? row.parentElement
      : row;
    const group = own?.parentElement?.closest<HTMLElement>(`.${GROUP}`);
    if (!group || !this.root.contains(group)) return undefined;
    return (
      group.querySelector<HTMLElement>(`:scope > .${GROUP}__summary`) ??
      undefined
    );
  }

  /** The roles, the groups' state, and the one tab stop. */
  private sync() {
    // What this writes (roles and `tabindex`) is not what the observer
    // watches, so it never wakes itself.
    this.root.setAttribute("role", "tree");
    for (const children of this.root.querySelectorAll<HTMLElement>(
      `.${GROUP}__children`,
    ))
      if (children.closest(`.${ROOT}`) === this.root)
        children.setAttribute("role", "group");
    const rows = this.rows();
    for (const row of rows) row.setAttribute("role", "treeitem");
    const shown = rows.filter((row) => this.visible(row));
    // The tab stop: the row focus last left, while it shows; else the
    // selected row, or the group row it is folded into; else the first.
    let stop =
      this.current && shown.includes(this.current) ? this.current : undefined;
    if (!stop) {
      const selected = rows.find((row) => row.hasAttribute("aria-current"));
      let row = selected;
      while (row && !shown.includes(row)) row = this.parentRow(row);
      stop = row ?? shown[0];
    }
    for (const row of rows) row.tabIndex = row === stop ? 0 : -1;
    this.current = stop;
  }

  /** `row` is the tab stop. */
  private focusable(row: HTMLElement) {
    if (this.current === row && row.tabIndex === 0) return;
    if (this.current) this.current.tabIndex = -1;
    row.tabIndex = 0;
    this.current = row;
  }

  private move(row: HTMLElement | undefined) {
    if (!row) return;
    this.focusable(row);
    row.focus();
  }

  private key(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const row = this.rowOf(event.target);
    if (!row || event.target !== row) return;
    const shown = this.shown();
    const index = shown.indexOf(row);
    const group = this.folding(row);
    const step = stepRow(event.key, index, shown.length);
    if (step !== undefined) {
      event.preventDefault();
      this.move(shown[step]);
      return;
    }
    // Inward is toward the reading direction's end: the right arrow, or the
    // left on a right-to-left page.
    const rightToLeft = getComputedStyle(row).direction === "rtl";
    const inward = rightToLeft ? "ArrowLeft" : "ArrowRight";
    const outward = rightToLeft ? "ArrowRight" : "ArrowLeft";
    if (event.key === inward) {
      event.preventDefault();
      if (group && !group.open) row.click();
      else if (group) {
        // Into the group: its first row.
        const next = this.shown()[index + 1];
        if (next && row.parentElement?.contains(next)) this.move(next);
      }
      return;
    }
    if (event.key === outward) {
      event.preventDefault();
      if (group?.open) row.click();
      else this.move(this.parentRow(row));
      return;
    }
    if (event.key.length === 1 && event.key !== " ") {
      const now = Date.now();
      this.typed =
        now - this.typedAt > TYPE_AHEAD_MILLISECONDS
          ? event.key
          : this.typed + event.key;
      this.typedAt = now;
      const found = typeAhead(
        shown.map((each) => each.textContent ?? ""),
        index,
        this.typed,
      );
      if (found !== undefined) {
        event.preventDefault();
        this.move(shown[found]);
      }
    }
  }
}
