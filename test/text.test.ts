// text: every case in `test/text/cases.cjs` - a component in one
// state, written as the text a character-cell screen would print - is
// rendered beside the component and compared pixel for pixel
// (`test/text/check.mjs`, zero tolerance). The text is the source of
// truth for what each cell shows; a component that paints anything a cell
// could not fails here. Run after `pnpm build`. Skipped where Playwright has
// no Chromium to drive.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { describe, expect, test } from "vitest";

const browser = (() => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

describe.skipIf(!browser)("text", () => {
  test("every component case paints exactly its text, cell for cell, in both modes at 1x and 2x", () => {
    execFileSync("pnpm", ["text:build"], { stdio: "pipe" });
    for (const [mode, scale] of [
      ["dark", "2"],
      ["light", "2"],
      ["dark", "1"],
      ["light", "1"],
    ]) {
      execFileSync(
        "node",
        [
          "test/text/check.mjs",
          "--report-only",
          "--mode",
          mode,
          "--scale",
          scale,
        ],
        { stdio: "pipe" },
      );
      const report = JSON.parse(
        readFileSync("test/text/report.json", "utf8"),
      ) as {
        cases: Record<string, { cells: { column: number; row: number }[] }>;
      };
      const off = Object.entries(report.cases)
        .filter(([, result]) => result.cells.length)
        .map(
          ([id, result]) =>
            `${mode} ${scale}x ${id}: ${result.cells.map(({ column, row }) => `${column},${row}`).join(" ")}`,
        );
      expect(off).toEqual([]);
    }
  }, 120_000);

  // The reader turns a rendered component back into its text version. It
  // writes every case's own text, save the face's: its rounded corners draw
  // the same pixels as square ones, so only a person can say which was meant.
  test("the cell reader reads every case back into its text, in both modes", () => {
    for (const mode of ["dark", "light"]) {
      execFileSync("node", ["test/text/read-check.mjs", "--mode", mode], {
        stdio: "pipe",
      });
      const report = JSON.parse(
        readFileSync("test/text/read-report.json", "utf8"),
      ) as Record<
        string,
        {
          unread: number;
          cells: {
            column: number;
            row: number;
            first: string;
            second: string;
          }[];
        }
      >;
      const off = Object.entries(report)
        .filter(
          ([id, result]) =>
            id !== "glyphs" && (result.unread || result.cells.length),
        )
        .map(
          ([id, result]) =>
            `${mode} ${id}: ${result.unread} unread, ${result.cells.map(({ column, row, first, second }) => `${column},${row} ${first}/${second}`).join(" ")}`,
        );
      expect(off).toEqual([]);
    }
  }, 120_000);

  // Every component scenario (src/scenarios), at rest and in each state its
  // stylesheet offers, reads back into the text accepted for it
  // (test/text/snapshots). A reading holds no cell a character-cell screen
  // could not print, and where two glyphs draw the same pixels, the accepted
  // one stands: the render matches its text pixel for pixel.
  test("every component scenario reads back into its snapshot, in both modes at 1x and 2x", () => {
    for (const [mode, scale] of [
      ["dark", "2"],
      ["light", "2"],
      ["dark", "1"],
      ["light", "1"],
    ]) {
      execFileSync(
        "node",
        [
          "test/text/snapshots.mjs",
          "--report-only",
          "--mode",
          mode,
          "--scale",
          scale,
        ],
        { stdio: "pipe" },
      );
      const report = JSON.parse(
        readFileSync("test/text/snapshot-report.json", "utf8"),
      ) as {
        components: Record<
          string,
          Record<
            string,
            {
              unread?: number;
              missing?: boolean;
              stale?: boolean;
              rows?: number[];
            }
          >
        >;
      };
      const off = Object.entries(report.components).flatMap(([name, views]) =>
        Object.entries(views)
          .filter(
            ([, view]) =>
              view.unread || view.missing || view.stale || view.rows?.length,
          )
          .map(
            ([key, view]) =>
              `${mode} ${scale}x ${name} ${key}: ${JSON.stringify(view)}`,
          ),
      );
      expect(off).toEqual([]);
    }
    // Four readings of every scenario in a browser: several minutes, more
    // when the machine is busy.
  }, 480_000);

  // On a right-to-left page every scenario draws its snapshot's mirror
  // image: the cells in reverse, each one-sided glyph turned (`├` as `┤`),
  // the text left to the browser's bidirectional layout (`mirrored` and
  // `drawingOf` in markup.mjs). The direction moves no pixel within a
  // cell's tone, so one mode holds it, at both scales.
  test("every component scenario on a right-to-left page draws its snapshot mirrored, at 1x and 2x", () => {
    for (const scale of ["2", "1"]) {
      execFileSync(
        "node",
        [
          "test/text/snapshots.mjs",
          "--report-only",
          "--direction",
          "rtl",
          "--scale",
          scale,
        ],
        { stdio: "pipe" },
      );
      const report = JSON.parse(
        readFileSync("test/text/snapshot-report-rtl.json", "utf8"),
      ) as {
        components: Record<
          string,
          Record<
            string,
            { unread?: number; missing?: boolean; rows?: number[] }
          >
        >;
      };
      const off = Object.entries(report.components).flatMap(([name, views]) =>
        Object.entries(views)
          .filter(
            ([, view]) => view.unread || view.missing || view.rows?.length,
          )
          .map(
            ([key, view]) =>
              `rtl ${scale}x ${name} ${key}: ${JSON.stringify(view)}`,
          ),
      );
      expect(off).toEqual([]);
    }
  }, 300_000);
});
