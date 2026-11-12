// @vitest-environment jsdom
//
// A page with a DOM and no ResizeObserver (jsdom, as most test setups run)
// imports every target without a stub: nothing reaches for it as it loads.
import { expect, test } from "vitest";

// The first import transforms the whole React target, which takes longer
// than vitest's five seconds while the rest of the suite runs beside it.
test(
  "importing charcell needs no ResizeObserver",
  { timeout: 30_000 },
  async () => {
    expect("ResizeObserver" in globalThis).toBe(false);
    await expect(import("../dist/react/index")).resolves.toBeDefined();
    await expect(import("../src/scripts/index")).resolves.toBeDefined();
  },
);
