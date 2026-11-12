// The build carries what charcell needs from the engine: the linked and
// unlinked components of every target, and the Svelte target in runes mode, which the
// svelte drivers are written in. read from the output rather than a version
// Number, so it holds whatever the engine release is called. Run after
// `pnpm build`.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("engine", () => {
  test("the build has the linked and unlinked components", () => {
    expect(existsSync("dist/react/unlinked/index.ts")).toBe(true);
    expect(existsSync("dist/react/linked")).toBe(true);
  });

  test("the svelte target is in runes mode", () => {
    expect(readFileSync("dist/svelte/Select.svelte", "utf8")).toContain(
      "$props()",
    );
  });
});
