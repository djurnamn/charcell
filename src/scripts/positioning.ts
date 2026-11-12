// The floating surfaces' place on the cell grid: Zag positions a popover, a
// select's listbox and a menu at whatever pixel its placement works out to,
// rounded only to the device's pixels, so a surface shifted to fit the
// screen, or set against an edge that is not a whole cell from its trigger's,
// lands between cells and its strokes and text sit at another phase from the
// page around it. Shared by the three framework drivers (`charcell/scripts`).
import { measureCellSize } from "./character-snap";

/** The side a floating surface opened on, from its machine record's
 *  `data-side`. */
export function sideOf(props: object): unknown {
  return (props as Record<string, unknown>)["data-side"];
}

/** The placement a floating surface opened at, from its machine record's
 *  `data-placement`: where Zag put it once it fitted it to the screen,
 *  which may be another than the one asked for (`requested`, until it is
 *  placed). */
export function placementOf(
  props: object,
  requested: string | undefined,
): string | undefined {
  const placed = (props as Record<string, unknown>)["data-placement"];
  return typeof placed === "string" ? placed : requested;
}

/** Whether a floating surface opened above its trigger. */
export function opensAbove(props: object): boolean {
  return sideOf(props) === "top";
}

/** Where a value lands, moved to a whole number of cells from `anchor`. */
export function onCells(value: number, anchor: number, cell: number): number {
  if (!(cell > 0)) return value;
  return anchor + Math.round((value - anchor) / cell) * cell;
}

/** A length rounded to the device's pixels, as Zag rounds it. */
const toDevicePixels = (value: number) => {
  const ratio = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  return Math.round(value * ratio) / ratio;
};

/** How far an element's own transform moves it, across and down. */
const translation = (element: Element): [number, number] => {
  const matrix = /^matrix\(([^)]+)\)$/.exec(
    getComputedStyle(element).transform,
  );
  const values = matrix?.[1]?.split(",").map(parseFloat) ?? [];
  return [values[4] ?? 0, values[5] ?? 0];
};

/**
 * Zag's positioning options with the surface held a whole number of cells
 * from its trigger (`anchor`), across and down, on the device's pixels, so
 * the surface's strokes and text share the trigger's cells. Once Zag has
 * placed the surface, its offset from the trigger is measured and its
 * `--x` and `--y` moved by what that offset is off the grid; the cell is the
 * surface's own face. `updatePosition` is this helper's; the rest of
 * `options` passes through.
 */
export function onCellGrid<Options extends object>(
  options: Options,
  anchor: () => Element | null | undefined,
) {
  return {
    ...options,
    async updatePosition({
      updatePosition,
      floatingElement,
    }: {
      updatePosition: () => Promise<void>;
      floatingElement?: HTMLElement | null;
    }) {
      await updatePosition();
      const trigger = anchor();
      if (!floatingElement || !trigger) return;
      const surface =
        floatingElement.firstElementChild instanceof HTMLElement
          ? floatingElement.firstElementChild
          : floatingElement;
      const placed = floatingElement.getBoundingClientRect();
      const from = trigger.getBoundingClientRect();
      const [movedAcross, movedDown] = translation(floatingElement);
      // Where `--x` and `--y` put the surface, whatever moves it right now:
      // until it has a placement Zag parks it a screen above the page.
      const move = (property: "--x" | "--y", origin: number, cell: number) => {
        const current = parseFloat(
          floatingElement.style.getPropertyValue(property),
        );
        if (Number.isNaN(current)) return;
        const offset = origin + current;
        const shift = onCells(offset, 0, cell) - offset;
        if (Math.abs(shift) < 0.01) return;
        floatingElement.style.setProperty(
          property,
          `${toDevicePixels(current + shift)}px`,
        );
      };
      move(
        "--x",
        placed.left - movedAcross - from.left,
        measureCellSize(surface),
      );
      move(
        "--y",
        placed.top - movedDown - from.top,
        measureCellSize(surface, "vertical"),
      );
    },
  };
}

/** What a machine hands its `onInteractOutside`: Zag's event around the
 *  press or focus that left the widget. */
interface InteractOutsideEvent {
  detail: { originalEvent: Event };
  preventDefault(): void;
}

/**
 * An `onInteractOutside` for a widget whose role sits on the content inside
 * its panel, as a menu's or a listbox's does on its scroll area's content: a
 * press or a focus on the panel around it, its ring and padding, is not
 * outside, so the widget stays open. Zag counts only the content as inside.
 *
 * @param positioner - The id of the widget's positioner, which holds the panel.
 */
export function keepingPanelInside(
  positioner: () => unknown,
): (event: InteractOutsideEvent) => void {
  return (event) => {
    const original = event.detail.originalEvent;
    const target = original.composedPath()[0] ?? original.target;
    const id = positioner();
    const element = typeof id === "string" ? document.getElementById(id) : null;
    if (target instanceof Node && element?.contains(target))
      event.preventDefault();
  };
}
