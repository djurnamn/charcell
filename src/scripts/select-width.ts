// A Select whose trigger fits its value opens a listbox as wide as its items,
// which can be wider than the trigger. The boxed pair shares a stroke row,
// whose far corner is a tee while the two are as wide and the listbox's own
// corner once it is wider, the trigger's corner meeting its line short of
// it. The drivers keep `--charcell-select--wider` on both while it is open
// (`charcell/scripts`).

const WIDER = "--charcell-select--wider";
const TRIGGER_WIDTH = "--charcell-select--trigger-width";

/**
 * While attached, marks the trigger and the listbox `parts` gives with
 * whether the listbox is the wider, and the listbox with the trigger's
 * width, again as either resizes; returns the detach, which takes the marks
 * away.
 */
export function markingWider(parts: () => (HTMLElement | null)[]): () => void {
  const mark = () => {
    const [trigger, listbox] = parts();
    if (!trigger || !listbox) return;
    const wider =
      listbox.getBoundingClientRect().width >
      trigger.getBoundingClientRect().width + 0.5;
    for (const element of [trigger, listbox])
      element.style.setProperty(WIDER, wider ? "1" : "0");
    listbox.style.setProperty(
      TRIGGER_WIDTH,
      `${trigger.getBoundingClientRect().width}px`,
    );
  };
  const observer =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(mark);
  // The listbox may render a frame after it opens.
  const start = requestAnimationFrame(() => {
    for (const element of parts()) if (element) observer?.observe(element);
    mark();
  });
  mark();
  return () => {
    cancelAnimationFrame(start);
    observer?.disconnect();
    for (const element of parts()) {
      element?.style.removeProperty(WIDER);
      element?.style.removeProperty(TRIGGER_WIDTH);
    }
  };
}
