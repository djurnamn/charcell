// The shared scenarios (src/scenarios): each component's ids are unique, at
// most one is its default, and every one has a snapshot of its text version
// (test/text/snapshots), which the cell check holds the render to.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { SCENARIOS, withGenerated } from "../src/scenarios";
import { parseSnapshots } from "./text/markup.mjs";

describe("scenarios", () => {
  test("a component names each scenario once, marks at most one default, and has a snapshot of each", () => {
    for (const [name, source] of Object.entries(SCENARIOS)) {
      const ids = source.scenarios.map((scenario) => scenario.id);
      expect(new Set(ids).size, name).toBe(ids.length);
      expect(
        source.scenarios.filter((scenario) => scenario.default).length,
        name,
      ).toBeLessThanOrEqual(1);
      const path = `test/text/snapshots/${name}.txt`;
      expect(existsSync(path), path).toBe(true);
      const keys = Object.keys(parseSnapshots(readFileSync(path, "utf8")));
      for (const id of ids.length ? ids : ["default"])
        expect(keys, `${name} ${id}`).toContain(id);
    }
  });

  test("a generated scenario flips a boolean or picks another enum value, unless a written one already does", () => {
    const template = {
      props: {
        variant: { type: "'boxed' | 'dense'", default: "boxed" },
        quiet: { type: "boolean" },
        open: { type: "boolean" },
        label: { type: "string" },
      },
    };
    const scenarios = withGenerated(template, ["variant", "quiet", "open"], {
      props: { open: true },
      scenarios: [{ id: "calm", label: "calm", props: { quiet: true } }],
    });
    expect(
      scenarios.map(({ id, label, props }) => ({ id, label, props })),
    ).toEqual([
      { id: "calm", label: "calm", props: { quiet: true } },
      {
        id: "variant-dense",
        label: "variant: dense",
        props: { variant: "dense" },
      },
      { id: "open-false", label: "open: false", props: { open: false } },
    ]);
    expect(() => withGenerated(template, ["label"], {})).toThrow(
      /neither an enum nor a boolean/,
    );
  });
});
