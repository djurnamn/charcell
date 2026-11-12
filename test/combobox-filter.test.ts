import { describe, expect, test } from "vitest";
import { matchingItems } from "../src/scripts/combobox";

const labels = (items: { label: string }[]) => items.map((item) => item.label);

describe("matchingItems", () => {
  const items = [
    { label: "adrian ripburger" },
    { label: "Maureen Corley" },
    { label: "café flambé" },
  ];

  test("every item while nothing is typed", () => {
    expect(matchingItems(items, "  ")).toBe(items);
  });

  test("any part of the label, case aside", () => {
    expect(labels(matchingItems(items, "CORLEY"))).toEqual(["Maureen Corley"]);
    expect(labels(matchingItems(items, "burg"))).toEqual(["adrian ripburger"]);
  });

  test("accents fold, and composed and decomposed forms match", () => {
    expect(labels(matchingItems(items, "cafe"))).toEqual(["café flambé"]);
    expect(labels(matchingItems(items, "flambé"))).toEqual(["café flambé"]);
  });

  test("case folds by the locale's own rules", () => {
    const turkish = [{ label: "İstanbul" }, { label: "Izmir" }];
    expect(labels(matchingItems(turkish, "istanbul", "tr"))).toEqual([
      "İstanbul",
    ]);
    // In Turkish a dotless capital I pairs with a dotless ı, not with i.
    expect(labels(matchingItems(turkish, "izmir", "tr"))).toEqual([]);
    expect(labels(matchingItems(turkish, "ızmir", "tr"))).toEqual(["Izmir"]);
    expect(labels(matchingItems(turkish, "izmir", "en"))).toEqual(["Izmir"]);
  });
});
