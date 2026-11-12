import { attachedAt } from "../scripts/attach";
import type { Value } from "./types";

/** A window part's border, as its compound resolves it: the scenario's
 *  `border`, or the window's own right and bottom doubles when it sets none. */
export const windowBorder = (
  props: Record<string, Value> | undefined,
): Record<string, string> =>
  props?.border === undefined
    ? { borderEnd: "double", borderBottom: "double" }
    : { border: String(props.border) };

/** A window and its trigger attached as their compound attaches them
 *  (`attachedAt`), marked as `attachingToTrigger` marks a window wider than
 *  its trigger of `cells` cells: the trigger's end corner runs on through
 *  the row they share and the window's line starts past it. The window's row
 *  onto the trigger is given back below it. A window that stands apart takes
 *  no marks. */
export const attachedMarks = (
  border: Record<string, string>,
  cells: number,
): { trigger: Record<string, Value>; window: Record<string, Value> } =>
  attachedAt(
    true,
    undefined,
    border.borderStart ?? border.border,
    border.borderTop ?? border.border,
  )
    ? {
        trigger: {
          style:
            "--charcell-ring--bottom-left-tee: 1; --charcell-ring--bottom-right-run: 1",
        },
        window: {
          attached: true,
          style: `--reference-width: ${cells}ch; --charcell-ring--top-right-tee: 0; --charcell-ring--top-from: ${cells}ch; --charcell-ring--top-shared: 1; margin-bottom: calc(var(--charcell-row) * -1)`,
        },
      }
    : { trigger: {}, window: {} };
