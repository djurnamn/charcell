// An ActionMenu's list or a Popover's panel attached to its trigger: the
// window moves one row onto the trigger, so the two share a stroke row, one
// box growing out of the other, as a Select's listbox does with its own
// trigger. The trigger is the call site's element (a boxed Button), so while
// the pair is open this marks the shared row's corners on both, as the ring's
// flags (`ring-corner`): the start corners are tees, `├`; the end corners are
// tees while the two are as wide, `┤`; wider than the trigger, the window's
// line starts past the trigger's and the trigger's end corner runs on
// through it, `┴`; narrower, the window's end corner runs on along the
// trigger's line, `┬`. Opened above, the same on the other row. The drivers
// call it (`charcell/scripts`).

/** A side that meets a boxed Button's single side in a junction. */
const joins = (side: string | undefined) =>
  side === undefined || side === "single" || side === "rounded";

/** Whether the element a trigger record names draws a ring to share; taken
 *  to until it is in the document. */
const boxed = (trigger: object | undefined) => {
  const id = (trigger as Record<string, unknown> | undefined)?.id;
  const element =
    typeof id === "string" && typeof document !== "undefined"
      ? document.getElementById(id)
      : null;
  return !element || element.classList.contains("CharcellButton--boxed");
};

/**
 * Whether a window opened at `placement` attaches to its trigger: when
 * `attached` asks it to, the two start at the same column, above or below
 * it, and both the window's start side (`start`) and the side it shares
 * (`shared`: its top below the trigger, its bottom above it), as their
 * border styles, are single or rounded, as the trigger's are. Against a
 * single side, a double one has no junction in the box-drawing set (`├`
 * over `╟`), a heavy one runs on through the trigger's, and a window with
 * none has no line to share, so those stand apart. So does a window on a
 * `trigger` (its machine record) that draws no ring, as a `dense` Button.
 */
export function attachedAt(
  attached: boolean | undefined,
  placement: string | undefined,
  start?: string,
  shared?: string,
  trigger?: object,
): boolean {
  return (
    attached !== false &&
    boxed(trigger) &&
    joins(start) &&
    joins(shared) &&
    ["bottom-start", "top-start"].includes(placement ?? "bottom-start")
  );
}

/** The window a positioner holds, for a widget whose machine record for its
 *  content goes on something inside the window, as a menu's does. */
export function windowIn(positioner: unknown): HTMLElement | null {
  const element =
    typeof positioner === "string" ? document.getElementById(positioner) : null;
  return element?.firstElementChild instanceof HTMLElement
    ? element.firstElementChild
    : null;
}

/** The flags a ring reads on one of its sides, by name. */
const flagsOf = (side: "top" | "bottom") => [
  `--charcell-ring--${side}-left-tee`,
  `--charcell-ring--${side}-right-tee`,
  `--charcell-ring--${side}-left-run`,
  `--charcell-ring--${side}-right-run`,
  `--charcell-ring--${side}-from`,
  `--charcell-ring--${side}-until`,
  `--charcell-ring--${side}-shared`,
  `--charcell-ring--${side}-ground`,
];

const clear = (element: HTMLElement | null | undefined) => {
  for (const side of ["top", "bottom"] as const)
    for (const flag of flagsOf(side)) element?.style.removeProperty(flag);
};

/**
 * While the pair `parts` gives is open, marks the trigger and the window
 * with the corners of the row they share, again as either resizes or the
 * window moves to the other side; returns the detach, which takes the marks
 * away. A window says it is attached in its style (`--charcell-attached:
 * 1`, as its compound chose); one that stands apart leaves both unmarked.
 */
export function attachingToTrigger(
  parts: () => (HTMLElement | null)[],
): () => void {
  const mark = () => {
    const [trigger, surface] = parts();
    clear(trigger);
    clear(surface);
    if (!trigger || !surface) return;
    const attached = getComputedStyle(surface)
      .getPropertyValue("--charcell-attached")
      .trim();
    if (attached !== "1") return;
    const from = trigger.getBoundingClientRect();
    const to = surface.getBoundingClientRect();
    const above = to.top < from.top;
    const wider = to.width > from.width + 0.5;
    const narrower = to.width < from.width - 0.5;
    const triggerSide = above ? "top" : "bottom";
    const surfaceSide = above ? "bottom" : "top";
    // The start and end corners are physical in the ring: on a
    // right-to-left page the start is the right one.
    const rightToLeft = getComputedStyle(trigger).direction === "rtl";
    const start = rightToLeft ? "right" : "left";
    const end = rightToLeft ? "left" : "right";
    const set = (element: HTMLElement, name: string, value: string) =>
      element.style.setProperty(name, value);
    set(trigger, `--charcell-ring--${triggerSide}-${start}-tee`, "1");
    // The shared row is the window's: its cells take the window's ground.
    set(
      trigger,
      `--charcell-ring--${triggerSide}-ground`,
      "var(--charcell-background)",
    );
    set(
      trigger,
      `--charcell-ring--${triggerSide}-${end}-tee`,
      wider || narrower ? "0" : "1",
    );
    set(
      trigger,
      `--charcell-ring--${triggerSide}-${end}-run`,
      wider ? "1" : "0",
    );
    set(surface, `--charcell-ring--${surfaceSide}-${start}-tee`, "1");
    set(
      surface,
      `--charcell-ring--${surfaceSide}-${end}-tee`,
      wider || narrower ? "0" : "1",
    );
    set(
      surface,
      `--charcell-ring--${surfaceSide}-${end}-run`,
      narrower ? "1" : "0",
    );
    // Wider, the trigger draws the shared line under itself, its junction
    // among it: the window's starts past it, its ground below the line.
    set(
      surface,
      `--charcell-ring--${surfaceSide}-${rightToLeft ? "until" : "from"}`,
      wider ? `${from.width}px` : "0px",
    );
    set(surface, `--charcell-ring--${surfaceSide}-shared`, wider ? "1" : "0");
  };
  const observer =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(mark);
  // The window may render a frame after it opens, and is placed after that.
  let frame = requestAnimationFrame(() => {
    for (const element of parts()) if (element) observer?.observe(element);
    mark();
    frame = requestAnimationFrame(mark);
  });
  mark();
  return () => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    for (const element of parts()) clear(element);
  };
}
