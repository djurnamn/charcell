// Render smoke over the rendered Vue target: the Zag compounds server-render
// through their Vue drivers, with the naming the Select and Popover carry.
import { describe, expect, test } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
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
  Tabs,
} from "../dist/vue/index";

const ITEMS = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
];

const renderComponent = (
  component: unknown,
  props: Record<string, unknown>,
  slots?: Record<string, unknown>,
) =>
  renderToString(
    createSSRApp({
      render: () => h(component as never, props, slots as never),
    }),
  );

describe("Vue target", () => {
  test("a declarative Visual renders its block", async () => {
    const html = await renderComponent(Button, { label: "edit" });
    expect(html).toContain("CharcellButton--boxed");
  });

  test("Accordion renders its items as disclosures", async () => {
    const html = await renderComponent(
      Accordion,
      {},
      {
        default: () =>
          h(
            AccordionItem,
            { title: "forks", defaultOpen: true },
            { default: () => "need new ones." },
          ),
      },
    );
    expect(html).toContain("CharcellAccordion");
    expect(html).toMatch(/<details[^>]*open/);
    expect(html).toContain("need new ones.");
  });

  test("Select is named by its Field's label and its value", async () => {
    const html = await renderComponent(
      Field,
      { label: "framework", htmlFor: "framework" },
      {
        default: () =>
          h(Select, {
            items: ITEMS,
            defaultValue: "vue",
            id: "framework",
            name: "framework",
          }),
      },
    );
    expect(html).toContain('for="framework"');
    const labeledBy = html.match(/aria-labelledby="([^"]+)"/)![1].split(" ");
    for (const id of labeledBy) expect(html).toContain(`id="${id}"`);
    expect(html).toContain("CharcellField__label");
    expect(html).toContain('name="framework"');
    expect(html).toContain('aria-hidden="true"');
  });

  test("Popover hands the machine's trigger props to the trigger slot", async () => {
    const html = await renderComponent(
      Popover,
      { label: "settings" },
      {
        trigger: ({
          triggerProps,
        }: {
          triggerProps: Record<string, unknown>;
        }) => h(Button, { ...triggerProps, label: "open" }),
      },
    );
    expect(html).toContain("CharcellButton");
    expect(html).toContain('aria-expanded="false"');
  });

  test("Dialog and ActionMenu hand their trigger props to the trigger slot", async () => {
    const trigger = ({
      triggerProps,
    }: {
      triggerProps: Record<string, unknown>;
    }) => h(Button, { ...triggerProps, label: "open" });
    const modal = await renderComponent(
      Dialog,
      { label: "settings" },
      { trigger },
    );
    expect(modal).toContain('aria-haspopup="dialog"');
    const menu = await renderComponent(
      ActionMenu,
      { items: [{ value: "rename", label: "rename" }] },
      { trigger },
    );
    expect(menu).toContain('aria-haspopup="menu"');
  });

  test("Tabs renders the tabs and one panel per item through the driver", async () => {
    const html = await renderComponent(
      Tabs,
      { items: ITEMS },
      { panel: ({ value }: { value: string }) => h("p", `${value} panel`) },
    );
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html).toContain("CharcellTabList__tab--selected");
    expect(html).toContain("react panel");
    expect(html).toContain("vue panel");
    // The driver marks its root only once it mounts in the browser.
    expect(html).not.toContain("CharcellTabs--scripted");
  });

  test("ScrollArea renders its content in a named region through the driver", async () => {
    const html = await renderComponent(
      ScrollArea,
      { label: "everyone on highway 9" },
      { default: () => h("div", "ps: send a postcard") },
    );
    expect(html).toContain("CharcellScrollArea__viewport");
    expect(html).toContain("ps: send a postcard");
    expect(html).toContain("CharcellScrollArea__vertical-bar");
  });

  test("SplitGrid renders a cell per column and row and its handles through the driver", async () => {
    const html = await renderComponent(
      SplitGrid,
      {
        columns: [{ id: "gangs" }, { id: "riders" }],
        rows: [{ id: "roster" }, { id: "detail" }],
      },
      {
        default: ({ column, row }: { column: string; row: string }) =>
          h("span", `${column} ${row}`),
      },
    );
    expect(html.match(/CharcellSplitGrid__cell/g)).toHaveLength(4);
    expect(html.match(/CharcellSplitGrid__handle--column/g)).toHaveLength(1);
    expect(html.match(/CharcellSplitGrid__handle--row/g)).toHaveLength(1);
    expect(html).toContain("riders detail");
  });

  test("Checkbox and RadioGroup render their native controls", async () => {
    expect(await renderComponent(Checkbox, { label: "boost" })).toContain(
      'type="checkbox"',
    );
    const group = await renderComponent(RadioGroup, {
      name: "framework",
      items: ITEMS,
      defaultValue: "vue",
    });
    expect(group.match(/type="radio"/g)).toHaveLength(2);
  });

  test("SortableList renders each item behind its grip", async () => {
    const html = await renderComponent(
      SortableList,
      { items: ["alpha", "beta"] },
      { default: ({ item }: { item: string }) => h("span", item) },
    );
    expect(html).toContain('role="list"');
    expect(html.match(/CharcellSortableList__grip/g)).toHaveLength(2);
    expect(html).toContain('aria-label="reorder alpha"');
    expect(html.indexOf("alpha")).toBeLessThan(html.indexOf("beta"));
  });

  test("SortableGroup renders nested lists inside their items", async () => {
    const html = await renderComponent(
      SortableGroup,
      {},
      {
        default: () =>
          h(
            SortableList,
            {
              id: "plan",
              items: [{ name: "templates", children: ["button"] }],
              getKey: (item: { name: string }) => item.name,
            },
            {
              default: ({
                item,
              }: {
                item: { name: string; children: string[] };
              }) => [
                h("span", item.name),
                h(
                  SortableList,
                  { id: item.name, items: item.children },
                  {
                    default: ({ item: child }: { item: string }) =>
                      h("span", child),
                  },
                ),
              ],
            },
          ),
      },
    );
    expect(html.match(/role="list"/g)).toHaveLength(2);
    expect(html.indexOf(">templates<")).toBeLessThan(html.indexOf(">button<"));
    expect(html).toContain('role="status"');
  });

  // The server and the hydration have to name each grip alike, so the keys
  // the engine keeps carry nothing over from an earlier render or list.
  test("SortableList names its grips the same on every render, and apart from other lists", async () => {
    const lists = () =>
      renderToString(
        createSSRApp({
          render: () => [
            h(
              SortableList,
              { items: ["alpha", "beta"] },
              { default: ({ item }: { item: string }) => h("span", item) },
            ),
            h(
              SortableList,
              { items: ["gamma", "delta"] },
              { default: ({ item }: { item: string }) => h("span", item) },
            ),
          ],
        }),
      );
    const first = await lists();
    expect(await lists()).toBe(first);
    expect(
      [...first.matchAll(/id="[^"]*-grip-([^"]+)"/g)].map((match) => match[1]),
    ).toEqual([
      expect.stringMatching(/^charcell-sortable-.+-0$/),
      expect.stringMatching(/^charcell-sortable-.+-1$/),
      expect.stringMatching(/^charcell-sortable-.+-0$/),
      expect.stringMatching(/^charcell-sortable-.+-1$/),
    ]);
  });

  test("a SortableList item can place its own grip", async () => {
    const html = await renderComponent(
      SortableList,
      { items: ["alpha"], customGrip: true },
      {
        default: ({
          item,
          gripProps,
        }: {
          item: string;
          gripProps: Record<string, unknown>;
        }) => h("header", [h("span", item), h("button", gripProps)]),
      },
    );
    expect(html).toContain("CharcellSortableList__row--custom-grip");
    expect(html).toMatch(
      /<header><span>alpha<\/span><button[^>]*class="CharcellSortableList__grip"/,
    );
  });
});
