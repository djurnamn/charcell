/**
 * The Progress bar's arithmetic, shared by every target.
 */

/** `value` as a fraction of the `min`..`max` range, clamped to 0..1. */
export function progressRatio(
  value: number | undefined,
  min = 0,
  max = 100,
): number {
  if (value === undefined || !Number.isFinite(value) || max <= min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** The whole percent a progress bar shows beside its track. */
export function progressPercent(
  value: number | undefined,
  min = 0,
  max = 100,
): string {
  return `${Math.round(progressRatio(value, min, max) * 100)}%`;
}

/**
 * The fill's props: the ratio as a custom property on its inline style, which
 * the stylesheet snaps to whole cells. Vue and Svelte take the declaration
 * string; React takes a style object (`progressFillPropsObject`).
 */
export function progressFillProps(
  value: number | undefined,
  min = 0,
  max = 100,
): { style: string } {
  return {
    style: `--charcell-progress--ratio: ${progressRatio(value, min, max)}`,
  };
}

export function progressFillPropsObject(
  value: number | undefined,
  min = 0,
  max = 100,
): { style: Record<string, string> } {
  return {
    style: {
      "--charcell-progress--ratio": String(progressRatio(value, min, max)),
    },
  };
}
