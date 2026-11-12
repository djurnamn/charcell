/**
 * Which of a page's sections is being read, for a list of links to them: a
 * Tree of rows, say, whose consumer marks the reported section's row
 * `selected`. The components know nothing of it; any target calls
 * `trackSections` from its own mount and hands the cleanup to its unmount.
 */

/**
 * The index of the section being read: the last whose top has reached the
 * reading line, the first while none has. -1 without sections.
 */
export function currentSection(tops: number[], line: number): number {
  if (tops.length === 0) return -1;
  let current = 0;
  tops.forEach((top, index) => {
    if (top <= line) current = index;
  });
  return current;
}

/**
 * The reading line, in pixels below the scroller's top. Over the last
 * screen of scrolling it slides from `line` down to the scroller's foot, so
 * the sections that end the page each have their turn: a short last section
 * could never reach a fixed line.
 */
export function readingLine(
  line: number,
  height: number,
  remaining: number,
  range: number,
): number {
  const approach = Math.min(height, range);
  if (approach <= 0 || remaining >= approach) return line;
  return line + (height - line) * (1 - Math.max(0, remaining) / approach);
}

export interface SectionTrackerOptions {
  /** The sections' element ids, in page order. */
  ids: string[];
  /** Called with a section's id each time another one is being read. */
  onChange: (id: string) => void;
  /** The element that scrolls the sections; the page itself without one. */
  root?: HTMLElement | null;
  /** The reading line, in pixels below the scroller's top; a fifth of its height without one. */
  line?: number;
}

/**
 * Follows the scroll and reports the section being read: once at the start,
 * then whenever it changes. A section reached by its link (the address's
 * hash) is the one being read for as long as any of it shows. Returns the
 * cleanup.
 */
export function trackSections({
  ids,
  onChange,
  root = null,
  line,
}: SectionTrackerOptions): () => void {
  const scroller =
    root ?? document.scrollingElement ?? document.documentElement;
  const target: HTMLElement | Window = root ?? window;
  let current: string | undefined;
  let reached: string | undefined;
  let frame = 0;

  const report = (id: string) => {
    if (id === current) return;
    current = id;
    onChange(id);
  };
  const update = () => {
    frame = 0;
    const present = ids.flatMap((id) => {
      const element = document.getElementById(id);
      return element ? [{ id, element }] : [];
    });
    // The root's visible area is its padding box: `clientHeight` tall, from
    // inside its top border.
    const top = root ? root.getBoundingClientRect().top + root.clientTop : 0;
    const height = root ? root.clientHeight : window.innerHeight;
    const tops = present.map(
      (section) => section.element.getBoundingClientRect().top - top,
    );

    const linked = present.findIndex((section) => section.id === reached);
    if (linked >= 0) {
      const end = tops[linked + 1] ?? Infinity;
      if (tops[linked]! < height && end > 0) return report(reached!);
      reached = undefined;
    }

    const range = scroller.scrollHeight - scroller.clientHeight;
    const index = currentSection(
      tops,
      readingLine(
        line ?? height / 5,
        height,
        range - scroller.scrollTop,
        range,
      ),
    );
    if (index >= 0) report(present[index]!.id);
  };
  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(update);
  };
  const follow = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    reached = ids.includes(id) ? id : undefined;
    schedule();
  };

  target.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("hashchange", follow);
  follow();
  return () => {
    target.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("hashchange", follow);
    cancelAnimationFrame(frame);
  };
}
