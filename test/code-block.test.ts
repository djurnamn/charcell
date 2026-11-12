// What a double press selects in a code block: the source line around an
// offset, its line break left out.
import { describe, expect, test } from "vitest";
import { sourceLineAt } from "../src/scripts/code-block";

describe("the code block", () => {
  const text = "one\ntwo two\n\nfour";

  test("an offset anywhere on a line selects that line", () => {
    expect(sourceLineAt(text, 0)).toEqual([0, 3]);
    expect(sourceLineAt(text, 2)).toEqual([0, 3]);
    expect(sourceLineAt(text, 6)).toEqual([4, 11]);
  });

  test("an offset at a line's end is still on that line, and the next one's start on the next", () => {
    expect(sourceLineAt(text, 3)).toEqual([0, 3]);
    expect(sourceLineAt(text, 4)).toEqual([4, 11]);
  });

  test("an empty line selects nothing, and the last runs to the end", () => {
    expect(sourceLineAt(text, 12)).toEqual([12, 12]);
    expect(sourceLineAt(text, text.length)).toEqual([13, 17]);
  });
});
