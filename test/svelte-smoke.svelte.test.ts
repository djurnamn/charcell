// Render smoke over the rendered Svelte target: every compound server-renders
// through its runes driver, so a driver that cannot serve the compound's
// `children({ api })` snippet fails here rather than in a consumer's app.
import { describe, expect, test } from "vitest";
import { render } from "svelte/server";
import { createRawSnippet } from "svelte";
import {
  Accordion,
  AccordionItem,
  Button,
  Checkbox,
  Field,
  ActionMenu,
  Dialog,
  Popover,
  RadioGroup,
  ScrollArea,
  Select,
  SortableGroup,
  SortableList,
  SplitGrid,
  Splitter,
  Tabs,
} from "../dist/svelte/index";

const text = (value: string) =>
  createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));

describe("Svelte target", () => {
  test("a declarative Visual renders its block", () => {
    const { body } = render(Button, { props: { label: "edit" } });
    expect(body).toContain("CharcellButton--boxed");
    expect(body).toContain("edit");
  });

  test("Accordion renders its items, and an item its disclosure", () => {
    const accordion = render(Accordion, { props: { children: text("items") } });
    expect(accordion.body).toContain("<span>items</span>");
    const item = render(AccordionItem, {
      props: {
        title: "forks",
        defaultOpen: true,
        children: text("need new ones."),
      },
    });
    expect(item.body).toMatch(/<details[^>]*open/);
    expect(item.body).toContain("need new ones.");
  });

  test("Select renders its trigger through the driver", () => {
    const { body } = render(Select, {
      props: {
        items: [
          { value: "react", label: "React" },
          { value: "vue", label: "Vue" },
        ],
        defaultValue: "vue",
      },
    });
    expect(body).toContain("CharcellSelectTrigger");
    expect(body).toContain('role="combobox"');
    expect(body).toContain("Vue");
  });

  test("a Select with an id is named by its Field's label, then its value", () => {
    const { body } = render(Select, {
      props: {
        items: [{ value: "vue", label: "Vue" }],
        defaultValue: "vue",
        id: "framework",
      },
    });
    expect(body).toContain('id="framework"');
    expect(body.match(/aria-labelledby="([^"]+)"/)![1]).toBe(
      "framework-label framework-value",
    );
    const field = render(Field, {
      props: { label: "framework", htmlFor: "framework" },
    }).body;
    expect(field).toContain('for="framework"');
    expect(field).toContain('id="framework-label"');
  });

  test("Popover hands the machine's trigger props to the trigger snippet", () => {
    // The snippet stands in for a call site spreading `triggerProps` onto its
    // own button.
    const trigger = createRawSnippet(
      (scope: () => { triggerProps: Record<string, unknown> }) => ({
        render: () =>
          `<button aria-expanded="${scope().triggerProps["aria-expanded"]}" aria-haspopup="${scope().triggerProps["aria-haspopup"]}">open</button>`,
      }),
    );
    const { body } = render(Popover, { props: { trigger } });
    expect(body).toContain('aria-expanded="false"');
    expect(body).toContain('aria-haspopup="dialog"');
  });

  test("Splitter renders both panels and the handle through the driver", () => {
    const { body } = render(Splitter, {
      props: { defaultSize: [50, 50], start: text("left"), end: text("right") },
    });
    expect(body.match(/CharcellSplitter__panel/g)).toHaveLength(2);
    expect(body).toContain("CharcellSplitter__handle");
    expect(body).toContain("left");
    expect(body).toContain("right");
  });

  test("ScrollArea renders its content in a named region through the driver", () => {
    const { body } = render(ScrollArea, {
      props: {
        label: "everyone on highway 9",
        children: text("ps: send a postcard"),
      },
    });
    expect(body).toContain("CharcellScrollArea__viewport");
    expect(body).toContain('aria-label="everyone on highway 9"');
    expect(body).toContain("ps: send a postcard");
    expect(body).toContain("CharcellScrollArea__vertical-bar");
  });

  test("SplitGrid renders a cell per column and row and its handles through the driver", () => {
    const cell = createRawSnippet(
      (scope: () => { column: string; row: string }) => ({
        render: () => `<span>${scope().column} ${scope().row}</span>`,
      }),
    );
    const { body } = render(SplitGrid, {
      props: {
        columns: [{ id: "gangs" }, { id: "riders" }],
        rows: [{ id: "roster" }, { id: "detail" }],
        children: cell,
      },
    });
    expect(body.match(/CharcellSplitGrid__cell/g)).toHaveLength(4);
    expect(body.match(/CharcellSplitGrid__handle--column/g)).toHaveLength(1);
    expect(body.match(/CharcellSplitGrid__handle--row/g)).toHaveLength(1);
    expect(body).toContain("riders detail");
  });

  test("Dialog and ActionMenu hand their trigger props to the trigger snippet", () => {
    const trigger = createRawSnippet(
      (scope: () => { triggerProps: Record<string, unknown> }) => ({
        render: () =>
          `<button aria-haspopup="${scope().triggerProps["aria-haspopup"]}">open</button>`,
      }),
    );
    expect(
      render(Dialog, { props: { label: "settings", trigger } }).body,
    ).toContain('aria-haspopup="dialog"');
    expect(
      render(ActionMenu, {
        props: { items: [{ value: "rename", label: "rename" }], trigger },
      }).body,
    ).toContain('aria-haspopup="menu"');
  });

  test("Tabs renders the tabs and one panel per item through the driver", () => {
    const panel = createRawSnippet((scope: () => { value: string }) => ({
      render: () => `<p>${scope().value} panel</p>`,
    }));
    const { body } = render(Tabs, {
      props: {
        items: [
          { value: "props", label: "props" },
          { value: "slots", label: "slots" },
        ],
        panel,
      },
    });
    expect(body.match(/<button/g)).toHaveLength(2);
    expect(body).toContain("CharcellTabList__tab--selected");
    expect(body).toContain("slots panel");
    // The driver marks its root only once it mounts in the browser.
    expect(body).not.toContain("CharcellTabs--scripted");
  });

  test("Checkbox and RadioGroup render their native controls", () => {
    expect(render(Checkbox, { props: { label: "boost" } }).body).toContain(
      'type="checkbox"',
    );
    const items = [
      { value: "a", label: "a" },
      { value: "b", label: "b" },
    ];
    const { body } = render(RadioGroup, { props: { name: "pick", items } });
    expect(body.match(/type="radio"/g)).toHaveLength(2);
  });

  test("SortableList renders each item behind its grip", () => {
    const children = createRawSnippet((scope: () => { item: string }) => ({
      render: () => `<span>${scope().item}</span>`,
    }));
    const { body } = render(SortableList, {
      props: { items: ["alpha", "beta"], children },
    });
    expect(body).toContain('role="list"');
    expect(body.match(/CharcellSortableList__grip/g)).toHaveLength(2);
    expect(body).toContain('aria-label="reorder alpha"');
    expect(body.indexOf("alpha")).toBeLessThan(body.indexOf("beta"));
  });

  test("SortableGroup renders its lists and its live region", () => {
    const children = createRawSnippet(() => ({ render: () => "<p>lists</p>" }));
    const { body } = render(SortableGroup, { props: { children } });
    expect(body).toContain("<p>lists</p>");
    expect(body).toContain('role="status"');
  });

  // The server and the hydration have to name each grip alike, so the keys
  // the engine keeps carry nothing over from an earlier render.
  test("SortableList names its grips the same on every render", () => {
    const children = createRawSnippet((scope: () => { item: string }) => ({
      render: () => `<span>${scope().item}</span>`,
    }));
    const first = render(SortableList, {
      props: { items: ["alpha", "beta"], children },
    }).body;
    const second = render(SortableList, {
      props: { items: ["alpha", "beta"], children },
    }).body;
    expect(second).toBe(first);
    expect(
      [...first.matchAll(/id="[^"]*-grip-([^"]+)"/g)].map((match) => match[1]),
    ).toEqual([
      expect.stringMatching(/^charcell-sortable-.+-0$/),
      expect.stringMatching(/^charcell-sortable-.+-1$/),
    ]);
  });

  test("a SortableList item can place its own grip", () => {
    const children = createRawSnippet(
      (scope: () => { item: string; gripProps: Record<string, unknown> }) => ({
        render: () =>
          `<header><span>${scope().item}</span><button class="${scope().gripProps.class}" aria-label="${scope().gripProps["aria-label"]}"></button></header>`,
      }),
    );
    const { body } = render(SortableList, {
      props: { items: ["alpha"], customGrip: true, children },
    });
    expect(body).toContain("CharcellSortableList__row--custom-grip");
    expect(body).toContain(
      '<header><span>alpha</span><button class="CharcellSortableList__grip" aria-label="reorder alpha">',
    );
  });
});
