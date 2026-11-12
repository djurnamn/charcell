// The English ledger: every string a component says, with its default. A
// string added, renamed or reworded shows up here first.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  resolveComboboxTranslations,
  resolveFieldTranslations,
  resolveInlineMessageTranslations,
  resolveSplitGridTranslations,
  resolveSplitterTranslations,
} from "../src/scripts/translations";
import {
  fillSortablePositions,
  resolveSortableListTranslations,
} from "../src/scripts/sortable";
import { Field, InlineMessage } from "../dist/react/index";

describe("translations", () => {
  test("each component's english defaults", () => {
    expect({
      Combobox: resolveComboboxTranslations(),
      Field: resolveFieldTranslations(),
      InlineMessage: resolveInlineMessageTranslations(),
      SortableList: resolveSortableListTranslations(),
      SplitGrid: resolveSplitGridTranslations(),
      Splitter: resolveSplitterTranslations(),
    }).toEqual({
      Combobox: {
        noMatchesMessage: "no matches",
        triggerLabel: "toggle suggestions",
      },
      Field: { errorPrefix: "error: " },
      InlineMessage: {
        informationPrefix: "info",
        successPrefix: "success",
        warningPrefix: "warning",
        errorPrefix: "error",
      },
      SortableList: {
        reorderLabel: "reorder {label}",
        reorderHintMessage:
          "press the up and down arrow keys to move the item, or pick it up and choose another item's grip to place it there.",
        pickedMessage:
          "{label} picked up, item {from} of {count}. choose another item's grip to place it there.",
        movedMessage: "moved {label} to position {to} of {count}",
        canceledMessage:
          "{label} put back where it was, item {from} of {count}",
        placeHereLabel: "place here",
        dropHereMessage: "drop here",
      },
      SplitGrid: {
        columnHandleLabel: "resize columns",
        rowHandleLabel: "resize rows",
      },
      Splitter: { handleLabel: "resize panels" },
    });
  });

  test("a consumer's record changes only the strings it names", () => {
    expect(resolveSplitGridTranslations({ rowHandleLabel: "größe" })).toEqual({
      columnHandleLabel: "resize columns",
      rowHandleLabel: "größe",
    });
  });

  test("a component says what its translations give it", () => {
    const field = renderToStaticMarkup(
      createElement(Field, {
        label: "name",
        htmlFor: "name",
        errorMessage: "ein name fehlt",
        translations: { errorPrefix: "fehler: " },
      }),
    );
    expect(field).toContain("fehler: ein name fehlt");
    const message = renderToStaticMarkup(
      createElement(InlineMessage, {
        context: "warning",
        translations: { warningPrefix: "achtung" },
      }),
    );
    expect(message).toContain("achtung:");
  });
});

describe("placeholders", () => {
  test("a placeholder given no value stays as written", () => {
    expect(
      fillSortablePositions("moved {label} to {to} of {count}", {
        label: "frame",
        to: 2,
      }),
    ).toBe("moved frame to 2 of {count}");
  });
});
