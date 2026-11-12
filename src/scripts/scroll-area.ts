// The ScrollArea's behavior, framework-agnostic: the drivers attach it to
// the visual's root and it finds the parts by their classes. The browser
// scrolls for every input, with its own physics; stepped, the content is
// painted at the last whole row (and column) the scroll has passed, by two
// scroll-driven animations in the stylesheet, and this keeps their range on
// whole rows, settles the offset on that row once scrolling ends, moves
// whole rows for the keys and draws the scrollbar in whole cells
// (`charcell/scripts`). An area that is no tab stop sits in a widget that
// keeps focus itself (a listbox, a menu, a combobox's input), and this keeps
// the item it points at in view; any other is a tab stop only while
// something in it scrolls.
import { measureCharacterWidth } from "./character-snap";

export type ScrollAreaOrientation = "vertical" | "horizontal" | "both";

export interface ScrollAreaOptions {
  /** The content at whole rows and columns, where the engine supports it. */
  stepped: boolean;
  /** The axes that scroll. */
  orientation: ScrollAreaOrientation;
}

const BLOCK = "CharcellScrollArea";

/** Whether this engine runs the stepped painting (scroll-driven animations). */
export const steppingSupported = () =>
  typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");

/**
 * The thumb in whole cells: its length and its first cell along a track of
 * `track` cells, for a viewport `client` long over content `total` long,
 * scrolled `offset` of `range`. At least one cell, and at most a cell short
 * of the track; at either end of the track only when the content is at that
 * end. A length of 0 when nothing scrolls.
 */
export function thumbCells(
  track: number,
  client: number,
  total: number,
  offset: number,
  range: number,
): { start: number; length: number } {
  if (!(track > 1) || !(range > 0.5) || !(total > 0))
    return { start: 0, length: 0 };
  const length = Math.min(
    track - 1,
    Math.max(1, Math.round((track * client) / total)),
  );
  const travel = track - length;
  const at = Math.min(range, Math.max(0, offset));
  let start = Math.round((travel * at) / range);
  if (at <= 0.5) start = 0;
  else if (at >= range - 0.5) start = travel;
  else if (travel >= 2) start = Math.min(travel - 1, Math.max(1, start));
  else start = 0;
  return { start, length };
}

/** The whole cells an offset has passed, toward 0: a right-to-left offset
 *  across is negative. */
export function wholeCells(offset: number, cell: number): number {
  return Math.sign(offset) * Math.floor(Math.abs(offset) / cell + 0.001);
}

/** The rows (or columns) a key moves, for `page` cells a page; undefined
 *  for a key that is not the area's. */

export function keyCells(
  key: string,
  shift: boolean,
  page: number,
  axis: "block" | "inline",
): number | "start" | "end" | undefined {
  const along =
    axis === "block"
      ? { ArrowDown: 1, ArrowUp: -1, PageDown: page, PageUp: -page }
      : { ArrowRight: 1, ArrowLeft: -1 };
  if (key in along) return along[key as keyof typeof along];
  if (axis === "block") {
    if (key === " ") return shift ? -page : page;
    if (key === "Home") return "start";
    if (key === "End") return "end";
  }
  return undefined;
}

/**
 * Attaches a scroll area's behavior to its visual's root; returns the
 * detach. `update` takes new options.
 */
export class ScrollAreaEngine {
  private root: HTMLElement;
  private options: ScrollAreaOptions;
  private viewport: HTMLElement | null;
  private rows: HTMLElement | null;
  private columns: HTMLElement | null;
  private observer: ResizeObserver | undefined;
  private cleanups: (() => void)[] = [];
  /** Shows the owner's active item, when the area follows one. */
  private revealActive: (() => void) | undefined;
  /** A tab stop while it scrolls: no widget around it keeps focus. */
  private focusable = false;

  constructor(root: HTMLElement, options: ScrollAreaOptions) {
    this.root = root;
    this.options = options;
    this.viewport = root.querySelector(`:scope > .${BLOCK}__viewport`);
    this.rows = this.viewport?.querySelector(`.${BLOCK}__rows`) ?? null;
    this.columns = this.viewport?.querySelector(`.${BLOCK}__columns`) ?? null;
    if (!this.viewport) return;
    const viewport = this.viewport;
    this.focusable = viewport.tabIndex >= 0;
    const listen = <Type extends keyof HTMLElementEventMap>(
      target: HTMLElement | Document,
      type: Type,
      handler: (event: HTMLElementEventMap[Type]) => void,
      options?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, handler as EventListener, options);
      this.cleanups.push(() =>
        target.removeEventListener(type, handler as EventListener, options),
      );
    };
    listen(viewport, "scroll", () => this.draw());
    listen(viewport, "scrollend", () => this.settle());
    listen(viewport, "keydown", (event) => this.key(event));
    for (const axis of ["block", "inline"] as const) {
      const bar = this.bar(axis);
      if (!bar) continue;
      listen(bar, "pointerdown", (event) => this.press(event, axis, bar));
      // The wheel over the bar scrolls the content.
      listen(
        bar,
        "wheel",
        (event) => {
          const unit =
            event.deltaMode === 1
              ? this.cell("block")
              : event.deltaMode === 2
                ? viewport.clientHeight
                : 1;
          const top = this.scrolls("block") ? event.deltaY * unit : 0;
          const left = this.scrolls("inline") ? event.deltaX * unit : 0;
          // Along an axis the area doesn't scroll, the wheel is the page's.
          if (!top && !left) return;
          viewport.scrollBy({ top, left });
          event.preventDefault();
        },
        { passive: false },
      );
    }
    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => this.measure());
      this.observer.observe(viewport);
      if (this.rows) this.observer.observe(this.rows);
      if (this.columns) this.observer.observe(this.columns);
    }
    this.measure();
    document.fonts?.ready.then(() => this.measure());
    if (!this.focusable) this.follow(listen);
  }

  update(options: ScrollAreaOptions) {
    this.options = options;
    this.measure();
  }

  destroy() {
    // The tab stop as the template gave it, for an engine attached again.
    if (this.focusable && this.viewport) this.viewport.tabIndex = 0;
    this.observer?.disconnect();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }

  private stepping() {
    return this.options.stepped && steppingSupported();
  }

  private scrolls(axis: "block" | "inline") {
    const { orientation } = this.options;
    return axis === "block"
      ? orientation !== "horizontal"
      : orientation !== "vertical";
  }

  /** Whether the area lays out right to left, where the offset across
   *  runs from 0 at the start down to minus its range. */
  private rightToLeft() {
    return getComputedStyle(this.viewport!).direction === "rtl";
  }

  /** A row's height, or a column's width, in px. */
  private cell(axis: "block" | "inline") {
    const viewport = this.viewport!;
    if (axis === "inline") return measureCharacterWidth(viewport) || 8;
    return parseFloat(getComputedStyle(viewport).lineHeight) || 16;
  }

  private bar(axis: "block" | "inline") {
    return this.root.querySelector<HTMLElement>(
      `:scope > .${BLOCK}__${axis === "block" ? "vertical" : "horizontal"}-bar`,
    );
  }

  /** The cells between a bar's step buttons, the thumb's travel. */
  private track(bar: HTMLElement, axis: "block" | "inline") {
    return bar.querySelector<HTMLElement>(
      `:scope > .${BLOCK}__${axis === "block" ? "vertical" : "horizontal"}-track`,
    );
  }

  /** Each axis's range on whole cells (padding the content to the next
   *  one), and the steps the stylesheet takes it in. */
  private measure() {
    const viewport = this.viewport;
    if (!viewport) return;
    for (const axis of ["block", "inline"] as const) {
      const wrapper = axis === "block" ? this.rows : this.columns;
      if (!wrapper) continue;
      const cell = this.cell(axis);
      const block = axis === "block";
      // The content's own length, less the space this added last time.
      const added =
        parseFloat(
          wrapper.style.getPropertyValue("--charcell-scroll-area--pad"),
        ) || 0;
      const content =
        (block ? wrapper.scrollHeight : wrapper.scrollWidth) - added;
      const client = block ? viewport.clientHeight : viewport.clientWidth;
      const padded = this.scrolls(axis)
        ? Math.ceil(Math.max(0, content - client) / cell - 0.001) * cell
        : 0;
      // The range made a whole number of cells by space after the content.
      const extra = Math.max(0, padded - Math.max(0, content - client));
      wrapper.style.setProperty(`--charcell-scroll-area--pad`, `${extra}px`);
      wrapper.style.setProperty(
        `--charcell-scroll-area--${axis}-range`,
        `${padded}`,
      );
      wrapper.style.setProperty(
        `--charcell-scroll-area--${axis}-steps`,
        `${Math.max(1, Math.round(padded / cell))}`,
      );
    }
    this.draw();
    this.revealActive?.();
    // A tab stop only while something scrolls, so focus never lands where
    // nothing shows it; it stays on an area that stops scrolling under it.
    if (this.focusable) {
      const scrolls =
        (this.scrolls("block") &&
          viewport.scrollHeight - viewport.clientHeight > 0.5) ||
        (this.scrolls("inline") &&
          viewport.scrollWidth - viewport.clientWidth > 0.5);
      viewport.tabIndex = scrolls ? 0 : -1;
    }
  }

  /** The thumbs, in whole cells, at the painted offset. */
  private draw() {
    const viewport = this.viewport;
    if (!viewport) return;
    for (const axis of ["block", "inline"] as const) {
      const bar = this.bar(axis);
      if (!bar) continue;
      const block = axis === "block";
      const cell = this.cell(axis);
      const cells = this.track(bar, axis) ?? bar;
      const track = Math.round(
        (block ? cells.clientHeight : cells.clientWidth) / cell,
      );
      const client = block ? viewport.clientHeight : viewport.clientWidth;
      const total = block ? viewport.scrollHeight : viewport.scrollWidth;
      // Across a right-to-left page the offset runs from 0 down: the
      // distance from the start is its size.
      const raw = Math.abs(block ? viewport.scrollTop : viewport.scrollLeft);
      const offset = this.stepping()
        ? Math.floor(raw / cell + 0.001) * cell
        : raw;
      const { start, length } = thumbCells(
        track,
        client,
        total,
        offset,
        total - client,
      );
      bar.style.setProperty("--charcell-scroll-area--thumb-start", `${start}`);
      bar.style.setProperty(
        "--charcell-scroll-area--thumb-length",
        `${length}`,
      );
      // A bar shows while its axis scrolls and the area has room for its
      // two steps and the two cells of track a thumb needs to move (and,
      // across, a row of content above it): measured on the root, which
      // the bars never resize.
      const rows = this.root.clientHeight / this.cell("block");
      const room = block
        ? rows - (this.options.orientation === "both" ? 1 : 0)
        : this.root.clientWidth / cell;
      const cramped = room < 3.999 || (!block && rows < 1.999);
      bar.classList.toggle(
        `${BLOCK}__${block ? "vertical" : "horizontal"}-bar--fitting`,
        cramped || !(total - client > 0.5),
      );
    }
  }

  /** The active item of the widget the area sits in, kept in view as the
   *  keys move it; the pointer moves it only over items already shown. */
  private follow(
    listen: (
      target: HTMLElement | Document,
      type: "keydown" | "pointermove",
      handler: () => void,
      options?: AddEventListenerOptions,
    ) => void,
  ) {
    const viewport = this.viewport!;
    const document = this.root.ownerDocument;
    // The element that keeps focus and points at its active item: a listbox
    // or a menu around the area, or a combobox's input beside it.
    const active = () => {
      for (const owner of document.querySelectorAll<HTMLElement>(
        "[aria-activedescendant]",
      )) {
        const id = owner.getAttribute("aria-activedescendant");
        const item = id ? document.getElementById(id) : null;
        if (item && viewport.contains(item)) return item;
      }
      return null;
    };
    let keyed = true;
    listen(document, "keydown", () => (keyed = true), { capture: true });
    listen(viewport, "pointermove", () => (keyed = false));
    const reveal = () => {
      const item = active();
      if (keyed && item) this.reveal(item);
    };
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(reveal);
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-activedescendant"],
    });
    this.cleanups.push(() => observer.disconnect());
    // Again once the area has its size, which it may not have yet.
    this.revealActive = reveal;
    reveal();
  }

  /** Scrolls by whole rows until the item is shown whole, if it isn't. */
  private reveal(item: HTMLElement) {
    const viewport = this.viewport!;
    const rows = this.rows;
    if (!rows || !this.scrolls("block")) return;
    const cell = this.cell("block");
    // Both are moved alike by the stepped painting: their difference is
    // the item's place in the content.
    const box = item.getBoundingClientRect();
    const top = box.top - rows.getBoundingClientRect().top;
    const shown = this.stepping()
      ? Math.floor(viewport.scrollTop / cell + 0.001) * cell
      : viewport.scrollTop;
    const client = viewport.clientHeight;
    let to: number;
    if (top < shown - 0.5) to = Math.floor(top / cell + 0.001) * cell;
    else if (top + box.height > shown + client + 0.5)
      to = Math.ceil((top + box.height - client) / cell - 0.001) * cell;
    else return;
    viewport.scrollTo({ top: to, behavior: "instant" });
  }

  /** At rest, the offset joins the row (and column) the content is painted
   *  at: nothing moves on screen. */
  private settle() {
    const viewport = this.viewport;
    if (!viewport || !this.stepping()) return;
    const top = wholeCells(viewport.scrollTop, this.cell("block"));
    const left = wholeCells(viewport.scrollLeft, this.cell("inline"));
    const toTop = top * this.cell("block");
    const toLeft = left * this.cell("inline");
    if (
      Math.abs(viewport.scrollTop - toTop) > 0.01 ||
      Math.abs(viewport.scrollLeft - toLeft) > 0.01
    )
      viewport.scrollTo({ top: toTop, left: toLeft, behavior: "instant" });
  }

  /** Whole rows (and columns) for the keys, in every engine. */
  private key(event: KeyboardEvent) {
    const viewport = this.viewport!;
    if (
      event.target !== viewport ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    for (const axis of ["block", "inline"] as const) {
      if (!this.scrolls(axis)) continue;
      const block = axis === "block";
      const cell = this.cell(axis);
      const page = Math.max(
        1,
        Math.floor(
          (block ? viewport.clientHeight : viewport.clientWidth) / cell,
        ) - 1,
      );
      const move = keyCells(event.key, event.shiftKey, page, axis);
      if (move === undefined) continue;
      event.preventDefault();
      const now = wholeCells(
        block ? viewport.scrollTop : viewport.scrollLeft,
        cell,
      );
      // The end across a right-to-left page is to the left, where the
      // offset is negative.
      const end = block
        ? viewport.scrollHeight
        : viewport.scrollWidth * (this.rightToLeft() ? -1 : 1);
      const to =
        move === "start" ? 0 : move === "end" ? end : (now + move) * cell;
      viewport.scrollTo({ [block ? "top" : "left"]: to, behavior: "instant" });
      return;
    }
  }

  /** A press on a bar: a step button moves a cell, the thumb drags, the
   *  track pages towards the press; the button and the track again while
   *  held. */
  private press(
    event: PointerEvent,
    axis: "block" | "inline",
    bar: HTMLElement,
  ) {
    if (event.button !== 0) return;
    const viewport = this.viewport!;
    const block = axis === "block";
    const track = this.track(bar, axis) ?? bar;
    const thumb = track.querySelector<HTMLElement>(
      `:scope > .${BLOCK}__${block ? "vertical" : "horizontal"}-thumb`,
    );
    event.preventDefault();
    bar.setPointerCapture(event.pointerId);
    const release: (() => void)[] = [];
    const dragging = `${BLOCK}__${block ? "vertical" : "horizontal"}-bar--dragging`;
    const end = () => {
      release.forEach((step) => step());
      bar.classList.remove(dragging);
    };
    const on = <Type extends keyof HTMLElementEventMap>(
      type: Type,
      handler: (event: HTMLElementEventMap[Type]) => void,
    ) => {
      bar.addEventListener(type, handler as EventListener);
      release.push(() =>
        bar.removeEventListener(type, handler as EventListener),
      );
    };
    on("pointerup", end);
    on("pointercancel", end);
    const repeat = (step: () => boolean) => {
      if (!step()) return;
      let timer = window.setTimeout(function again() {
        if (step()) timer = window.setTimeout(again, 80);
      }, 400);
      release.push(() => window.clearTimeout(timer));
    };
    const button =
      event.target instanceof Element
        ? event.target.closest(`.${BLOCK}__step`)
        : null;
    if (button && button.parentElement === bar) {
      // The first button steps back, the last forward: across a
      // right-to-left page, back is to the right.
      const cell = this.cell(axis);
      const back = !block && this.rightToLeft() ? cell : -cell;
      const toward = button === bar.firstElementChild ? back : -back;
      repeat(() => {
        const before = block ? viewport.scrollTop : viewport.scrollLeft;
        viewport.scrollBy({
          [block ? "top" : "left"]: toward,
          behavior: "instant",
        });
        return (block ? viewport.scrollTop : viewport.scrollLeft) !== before;
      });
      return;
    }
    if (thumb && event.target instanceof Node && thumb.contains(event.target)) {
      bar.classList.add(dragging);
      const from = block ? event.clientY : event.clientX;
      const offset = block ? viewport.scrollTop : viewport.scrollLeft;
      const travel =
        (block ? track.clientHeight : track.clientWidth) -
        (block ? thumb.offsetHeight : thumb.offsetWidth);
      const range = block
        ? viewport.scrollHeight - viewport.clientHeight
        : viewport.scrollWidth - viewport.clientWidth;
      on("pointermove", (move) => {
        if (!(travel > 0)) return;
        const to =
          offset +
          (((block ? move.clientY : move.clientX) - from) / travel) * range;
        viewport.scrollTo({
          [block ? "top" : "left"]: to,
          behavior: "instant",
        });
      });
      return;
    }
    // The track: a page towards the press, a page less a row.
    const cell = this.cell(axis);
    const page =
      Math.max(
        1,
        Math.floor(
          (block ? viewport.clientHeight : viewport.clientWidth) / cell,
        ) - 1,
      ) * cell;
    let at = block ? event.clientY : event.clientX;
    on("pointermove", (move) => (at = block ? move.clientY : move.clientX));
    const step = () => {
      if (!thumb) return false;
      const box = thumb.getBoundingClientRect();
      const before = block ? box.top : box.left;
      const after = block ? box.bottom : box.right;
      if (at >= before && at < after) return false;
      viewport.scrollBy({
        [block ? "top" : "left"]: at < before ? -page : page,
        behavior: "instant",
      });
      return true;
    };
    repeat(step);
  }
}
