// The section tracker's choice: which section a scroll position is reading.
import { describe, expect, test } from "vitest";
import { currentSection, readingLine } from "../src/scripts/sections";

describe("the section being read", () => {
  test("the last section whose top has reached the line", () => {
    expect(currentSection([-400, -20, 120, 900], 100)).toBe(1);
    expect(currentSection([-400, -20, 100, 900], 100)).toBe(2);
  });

  test("the first section until any reaches the line", () => {
    expect(currentSection([300, 900], 100)).toBe(0);
  });

  test("none without sections", () => {
    expect(currentSection([], 100)).toBe(-1);
  });
});

describe("the reading line", () => {
  test("holds until the last screen of scrolling", () => {
    expect(readingLine(100, 800, 2000, 5000)).toBe(100);
    expect(readingLine(100, 800, 800, 5000)).toBe(100);
  });

  test("slides to the foot as the scroll reaches its end", () => {
    expect(readingLine(100, 800, 400, 5000)).toBe(450);
    expect(readingLine(100, 800, 0, 5000)).toBe(800);
  });

  test("a page under two screens long slides over the whole of its range", () => {
    expect(readingLine(100, 800, 400, 400)).toBe(100);
    expect(readingLine(100, 800, 200, 400)).toBe(450);
    expect(readingLine(100, 800, 0, 400)).toBe(800);
  });

  test("holds where nothing scrolls", () => {
    expect(readingLine(100, 800, 0, 0)).toBe(100);
  });
});
