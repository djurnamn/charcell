// The comparison cases' grouping: every case in cases.cjs belongs to exactly
// one group, so each shows on one docs page and none is left out.
import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";

const { CASES, CASE_GROUPS } = createRequire(import.meta.url)(
  "./text/cases.cjs",
) as {
  CASES: Record<string, unknown>;
  CASE_GROUPS: Record<string, string[]>;
};

describe("text cases", () => {
  test("every case sits in exactly one group", () => {
    const grouped = Object.values(CASE_GROUPS).flat();
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual(Object.keys(CASES).sort());
  });
});
