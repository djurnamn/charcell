// Render smoke over the rendered React target: mount every component via
// renderToStaticMarkup and assert the load-bearing markup - the BEM classes,
// the conditional modifiers, the polymorphic roots. Verifies the components
// run (useBem, conditionals, passthrough), which a typecheck cannot show; run
// after `pnpm build`.
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Accordion,
  AccordionItem,
  Button,
  Checkbox,
  Field,
  Frame,
  InlineMessage,
  Progress,
  RadioGroup,
  RichText,
  Separator,
  SortableGroup,
  SortableList,
  Splitter,
  SplitterHandle,
  SplitterPanel,
  Table,
  Textarea,
  TextInput,
  Toggle,
  Tree,
  TreeGroup,
  TreeItem,
} from "../dist/react/index";

describe("Button", () => {
  test('interactive: a type="button" <button>, boxed by default', () => {
    const html = renderToStaticMarkup(<Button label="edit" />);
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain("CharcellButton--interactive");
    expect(html).toContain("CharcellButton--boxed");
    expect(html).toContain("edit");
  });

  test("dense variant", () => {
    const html = renderToStaticMarkup(
      <Button label="remove" variant="dense" />,
    );
    expect(html).toContain("CharcellButton--dense");
    expect(html).not.toContain("--boxed");
  });

  test("submit stays an explicit opt-in", () => {
    expect(
      renderToStaticMarkup(<Button label="save" type="submit" />),
    ).toContain('type="submit"');
  });

  test("nonInteractive: an inert <span> twin, no type attribute", () => {
    const html = renderToStaticMarkup(<Button label="edit" nonInteractive />);
    expect(html).toContain("<span");
    expect(html).not.toContain("type=");
    expect(html).not.toContain("--interactive");
  });

  test("border styles each side of the boxed ring, the narrower prop winning", () => {
    expect(
      renderToStaticMarkup(<Button label="save" border="heavy" />),
    ).toContain(
      "CharcellButton--border-top-heavy CharcellButton--border-end-heavy CharcellButton--border-bottom-heavy CharcellButton--border-start-heavy",
    );
    const raised = renderToStaticMarkup(
      <Button
        label="save"
        border="rounded"
        borderX="double"
        borderStart="none"
      />,
    );
    expect(raised).toContain("CharcellButton--border-top-rounded");
    expect(raised).toContain("CharcellButton--border-end-double");
    expect(raised).toContain("CharcellButton--border-start-none");
    expect(renderToStaticMarkup(<Button label="save" />)).not.toContain(
      "--border-",
    );
  });
});

describe("Toggle", () => {
  test("checkbox-backed: hidden input carries the state natively", () => {
    const html = renderToStaticMarkup(
      <Toggle label="react" defaultPressed onPressedChange={() => {}} />,
    );
    expect(html).toContain("<label");
    expect(html).toContain("CharcellToggle__input");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
  });

  test("unpressed renders an unchecked box", () => {
    const html = renderToStaticMarkup(<Toggle label="vue" />);
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain("checked");
  });

  test("boxed by default, like Button", () => {
    expect(renderToStaticMarkup(<Toggle label="autopilot" />)).toContain(
      "CharcellToggle--boxed",
    );
  });
});

describe("Tree", () => {
  test("a row with href is a link, marked as the current page when selected", () => {
    const html = renderToStaticMarkup(
      <TreeItem label="stadium" href="/places/stadium" current />,
    );
    expect(html).toMatch(/^<a /);
    expect(html).toContain('href="/places/stadium"');
    expect(html).toContain('aria-current="page"');
    const anchor = renderToStaticMarkup(
      <TreeItem label="stadium" href="#stadium" current />,
    );
    expect(anchor).toContain('aria-current="location"');
    expect(html).not.toContain('type="button"');
    const button = renderToStaticMarkup(<TreeItem label="stadium" current />);
    expect(button).toMatch(/^<button /);
    expect(button).toContain('aria-current="true"');
  });
  test("nested structure: div groups, structural depth, the open state on the row", () => {
    const html = renderToStaticMarkup(
      <Tree>
        <TreeGroup label="Components" root>
          <TreeItem label="Button" current />
          <TreeGroup label="form" defaultOpen={false}>
            <TreeItem label="Toggle" />
          </TreeGroup>
        </TreeGroup>
      </Tree>,
    );
    expect(html).toContain("CharcellTree");
    expect(html).toContain("CharcellTreeGroup--root");
    expect(html).toContain("CharcellTreeGroup__summary");
    expect(html).toContain("CharcellTreeGroup__children");
    // The driver marks its root only once it mounts in the browser.
    expect(html).not.toContain("CharcellTree--scripted");
    expect(html).toMatch(
      /class="CharcellTreeItem CharcellTreeItem--current"[^>]*aria-current="true"|aria-current="true"[^>]*class="CharcellTreeItem CharcellTreeItem--current"/,
    );
    // The root group is open, the nested one seeded closed.
    expect(html).not.toMatch(/<details|<summary/);
    const rows = html.match(/<div class="CharcellTreeGroup__summary"[^>]*>/g)!;
    expect(rows).toHaveLength(2);
    expect(rows.map((tag) => /aria-expanded="(\w+)"/.exec(tag)![1])).toEqual([
      "true",
      "false",
    ]);
    expect(rows[0]).toContain('role="button"');
    expect(rows[0]).toContain('tabindex="0"');
  });

  test("a held open state follows the prop", () => {
    const open = renderToStaticMarkup(
      <TreeGroup label="form" open defaultOpen={false} />,
    );
    const closed = renderToStaticMarkup(
      <TreeGroup label="form" open={false} />,
    );
    expect(open).toContain('aria-expanded="true"');
    expect(closed).toContain('aria-expanded="false"');
  });

  test("a section that keeps open is no disclosure", () => {
    const html = renderToStaticMarkup(
      <TreeGroup label="form" collapsible={false} defaultOpen={false} />,
    );
    expect(html).toMatch(
      /^<div class="CharcellTreeGroup"><div class="CharcellTreeGroup__summary">/,
    );
    expect(html).not.toContain("aria-expanded");
  });
});

describe("Accordion", () => {
  test("items are native disclosures in the ring, titles in their headings", () => {
    const html = renderToStaticMarkup(
      <Accordion>
        <AccordionItem title="forks" defaultOpen headingAs="h3">
          need new ones.
        </AccordionItem>
        <AccordionItem title="torch" name="bike">
          todd has it.
        </AccordionItem>
      </Accordion>,
    );
    expect(html).toMatch(/^<div class="CharcellAccordion">/);
    const details = html.match(/<details[^>]*>/g)!;
    expect(details.map((tag) => / open(=""|\b)/.test(tag))).toEqual([
      true,
      false,
    ]);
    expect(details[1]).toContain('name="bike"');
    expect(html).toContain(
      '<h3 class="CharcellAccordionItem__title">forks</h3>',
    );
  });

  test("a dense accordion is the bare stack", () => {
    expect(renderToStaticMarkup(<Accordion variant="dense" />)).toContain(
      "CharcellAccordion--dense",
    );
  });
});

describe("Frame", () => {
  test("titled + raised: header row and the border modifiers", () => {
    const html = renderToStaticMarkup(
      <Frame title="react" borderEnd="double" borderBottom="double">
        pane content
      </Frame>,
    );
    expect(html).toContain("CharcellFrame--border-end-double");
    expect(html).toContain("CharcellFrame--border-bottom-double");
    expect(html).toContain("CharcellFrame__title");
    expect(html).toContain("CharcellFrame__body");
    expect(html).toContain("pane content");
  });

  test("untitled + flush: no title row, the flush modifier", () => {
    const html = renderToStaticMarkup(<Frame flush>edge to edge</Frame>);
    expect(html).not.toContain("__title");
    expect(html).toContain("CharcellFrame--flush");
  });

  test("active: the focused pane earns the bright stroke", () => {
    expect(renderToStaticMarkup(<Frame active>pane</Frame>)).toContain(
      "CharcellFrame--active",
    );
  });

  test("quiet, on a div: a grouping ring that is not a landmark", () => {
    const html = renderToStaticMarkup(
      <Frame quiet as="div">
        node
      </Frame>,
    );
    expect(html.startsWith("<div")).toBe(true);
    expect(html).toContain("CharcellFrame--quiet");
    expect(
      renderToStaticMarkup(<Frame>pane</Frame>).startsWith("<section"),
    ).toBe(true);
  });

  test("legend: controls sit in the straddling title beside the title text", () => {
    const html = renderToStaticMarkup(
      <Frame title="slot" legend={<Toggle label="text" />}>
        body
      </Frame>,
    );
    expect(html).toMatch(
      /CharcellFrame__title.*CharcellFrame__label.*slot.*CharcellToggle/s,
    );
    const legendOnly = renderToStaticMarkup(
      <Frame legend={<span>count</span>}>body</Frame>,
    );
    expect(legendOnly).toContain("CharcellFrame__title");
    expect(legendOnly).not.toContain("CharcellFrame__label");
  });
});

describe("Splitter parts", () => {
  test("the panel and the handle carry the block's part classes and pass props through", () => {
    const panel = renderToStaticMarkup(
      <SplitterPanel id="a">pane</SplitterPanel>,
    );
    expect(panel).toContain('class="CharcellSplitter__panel"');
    expect(panel).toContain('id="a"');
    const handle = renderToStaticMarkup(
      <SplitterHandle label="resize a and b" />,
    );
    expect(handle).toContain("<button");
    expect(handle).toContain('type="button"');
    expect(handle).toContain("CharcellSplitter__handle");
    expect(handle).toContain('aria-label="resize a and b"');
  });

  test("the compound names its handle, by default and by its translations", () => {
    expect(renderToStaticMarkup(<Splitter />)).toContain(
      'aria-label="resize panels"',
    );
    expect(
      renderToStaticMarkup(
        <Splitter translations={{ handleLabel: "resize the editor" }} />,
      ),
    ).toContain('aria-label="resize the editor"');
  });
});

describe("Field + TextInput", () => {
  test("hands a control its id, its message and description, and its invalid state", () => {
    const html = renderToStaticMarkup(
      <Field
        label="id"
        htmlFor="id"
        description="for roadblocks"
        errorMessage="id is clearly fake"
      >
        {({ control }) => <TextInput {...control} />}
      </Field>,
    );
    const input = html.match(/<input[^>]*>/)![0];
    expect(input).toContain('id="id"');
    expect(input).toContain('aria-describedby="id-error id-description"');
    expect(input).toContain('aria-invalid="true"');
    // Plain children still render as they are.
    const plain = renderToStaticMarkup(
      <Field label="id" htmlFor="id">
        <TextInput id="id" />
      </Field>,
    );
    expect(plain).toMatch(/<input[^>]*id="id"/);
    expect(plain).not.toContain("aria-invalid");
  });

  test("the label points at the bare control by its id; the parts derive their ids", () => {
    const html = renderToStaticMarkup(
      <Field
        label="name"
        htmlFor="name"
        description="shown in the prompt"
        errorMessage="required"
      >
        <TextInput id="name" placeholder="type here" />
      </Field>,
    );
    expect(html).toMatch(/<div class="CharcellField CharcellField--labeled"/);
    expect(html).toContain(
      '<label class="CharcellField__label" for="name" id="name-label">name</label>',
    );
    expect(html).toContain(
      '<div class="CharcellField__message" id="name-error">error: required</div>',
    );
    expect(html).toContain(
      '<div class="CharcellField__description" id="name-description">shown in the prompt</div>',
    );
    expect(html).toMatch(/CharcellField__message.*CharcellField__description/s);
    expect(html).toContain("CharcellTextInput--boxed");
    expect(html).toContain('placeholder="type here"');
  });

  test("without htmlFor the label is text a group can reference by labelId", () => {
    const html = renderToStaticMarkup(
      <Field label="frameworks" labelId="frameworks-label">
        <span>toggles</span>
      </Field>,
    );
    expect(html).not.toContain("<label");
    expect(html).toContain(
      '<span class="CharcellField__label" id="frameworks-label">frameworks</span>',
    );
  });

  test("dense input variant", () => {
    expect(renderToStaticMarkup(<TextInput variant="dense" />)).toContain(
      "CharcellTextInput--dense",
    );
  });
});

describe("Separator", () => {
  test("a horizontal separator by default; vertical and decorative; single and double", () => {
    const plain = renderToStaticMarkup(<Separator />);
    expect(plain).toContain('role="separator"');
    expect(plain).not.toContain("aria-orientation");
    const vertical = renderToStaticMarkup(
      <Separator orientation="vertical" border="double" />,
    );
    expect(vertical).toContain('aria-orientation="vertical"');
    expect(vertical).toContain("CharcellSeparator--vertical");
    expect(vertical).toContain("CharcellSeparator--border-double");
    expect(renderToStaticMarkup(<Separator inset />)).toContain(
      "CharcellSeparator--inset",
    );
    const decorative = renderToStaticMarkup(
      <Separator orientation="vertical" decorative />,
    );
    expect(decorative).toContain('role="none"');
    expect(decorative).not.toContain("aria-orientation");
  });
});

describe("Checkbox", () => {
  test("a label around a native checkbox and the hidden check cell", () => {
    const html = renderToStaticMarkup(
      <Checkbox label="boost" name="boost" defaultChecked />,
    );
    expect(html).toMatch(/^<label class="CharcellCheckbox"/);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="boost"');
    expect(html).toContain('checked=""');
    expect(html).toContain(
      '<span class="CharcellCheckbox__box" aria-hidden="true"></span>',
    );
    expect(html).toContain("boost</label>");
  });
});

describe("RadioGroup", () => {
  const items = [
    { value: "dark", label: "dark" },
    { value: "light", label: "light", disabled: true },
  ];

  test("a radiogroup named by its label, one native radio per item", () => {
    const html = renderToStaticMarkup(
      <RadioGroup
        name="mode"
        label="mode"
        items={items}
        defaultValue="dark"
        orientation="horizontal"
      />,
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-labelledby="mode-label"');
    expect(html).toContain(
      '<span class="CharcellRadioGroup__label" id="mode-label">mode</span>',
    );
    expect(html).toContain("CharcellRadioGroup--horizontal");
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html.match(/name="mode"/g)).toHaveLength(2);
    const input = (value: string) =>
      html.match(new RegExp(`<input[^>]*value="${value}"[^>]*>`))![0];
    expect(input("dark")).toContain('checked=""');
    expect(input("light")).toContain('disabled=""');
    expect(input("light")).not.toContain("checked");
  });
});

describe("Textarea", () => {
  test("a bare textarea, boxed, three rows and growing with its content unless told", () => {
    const html = renderToStaticMarkup(
      <Textarea id="note" placeholder="notes" />,
    );
    expect(html).toContain("<textarea");
    expect(html).toContain('rows="3"');
    expect(html).toContain("CharcellTextarea--boxed");
    expect(html).toContain("CharcellTextarea--autosize");
    const fixed = renderToStaticMarkup(
      <Textarea variant="dense" rows={5} autosize={false} />,
    );
    expect(fixed).toContain('rows="5"');
    expect(fixed).not.toContain("--autosize");
  });

  test("defaultValue seeds the text of a textarea and a text input", () => {
    expect(renderToStaticMarkup(<Textarea defaultValue="maureen" />)).toContain(
      ">maureen</textarea>",
    );
    expect(renderToStaticMarkup(<TextInput defaultValue="ben" />)).toContain(
      'value="ben"',
    );
  });
});

describe("InlineMessage", () => {
  test("the context leads as text; an error is an alert, the rest a status", () => {
    const error = renderToStaticMarkup(
      <InlineMessage context="error" title="build failed">
        2 errors
      </InlineMessage>,
    );
    expect(error).toContain('role="alert"');
    expect(error).toContain(
      '<span class="CharcellInlineMessage__context">error:</span>',
    );
    expect(error).toContain(
      '<div class="CharcellInlineMessage__title">build failed</div>',
    );
    const status = renderToStaticMarkup(<InlineMessage>saved</InlineMessage>);
    expect(status).toContain('role="status"');
    expect(status).toContain("info:");
    expect(status).not.toContain("CharcellInlineMessage__title");
  });
});

describe("Table", () => {
  test("a caption names the table and its scroll area, and an empty cell prints nothing", () => {
    const html = renderToStaticMarkup(
      <Table
        caption="the polecats"
        columns={[
          { key: "name", label: "name" },
          { key: "keys", label: "keys" },
        ]}
        rows={[{ name: "ben", keys: null }]}
      />,
    );
    expect(html).toMatch(/^<div class="CharcellScrollArea[^"]*"[^>]*>/);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="the polecats"');
    expect(html).toContain(
      '<table class="CharcellTable__table"><caption class="CharcellTable__caption">the polecats</caption><thead',
    );
    expect(html).toContain('<td class="CharcellTable__cell"></td>');
  });

  test("the scroll area is a region only when a caption names it", () => {
    const html = renderToStaticMarkup(<Table columns={[]} rows={[]} />);
    expect(html).not.toContain("role=");
    expect(
      renderToStaticMarkup(<Table caption="polecats" columns={[]} rows={[]} />),
    ).toContain('role="region"');
  });

  test("a header of column labels over one row per record; alignment by column", () => {
    const html = renderToStaticMarkup(
      <Table
        columns={[
          { key: "name", label: "name" },
          { key: "size", label: "size", align: "end" },
        ]}
        rows={[
          { name: "Button", size: 12 },
          { name: "Frame", size: 9 },
        ]}
      />,
    );
    expect(html).toContain(
      '<th class="CharcellTable__heading" scope="col">name</th>',
    );
    expect(html).toContain(
      "CharcellTable__heading CharcellTable__heading--end",
    );
    expect(html.match(/<tr class="CharcellTable__row">/g)).toHaveLength(3);
    expect(html).toContain(
      '<td class="CharcellTable__cell CharcellTable__cell--end">12</td>',
    );
    expect(
      renderToStaticMarkup(<Table columns={[]} rows={[]} hideHeader />),
    ).toContain("CharcellTable--headless");
  });

  test("boxed by default with both separators; each opts out; dense draws neither", () => {
    const classes = (props: Record<string, unknown>) =>
      renderToStaticMarkup(<Table columns={[]} rows={[]} {...props} />).match(
        /class="(CharcellTable(?:\s[^"]*)?)"/,
      )![1];
    expect(classes({})).toBe(
      "CharcellTable CharcellTable--row-lines CharcellTable--column-lines",
    );
    expect(classes({ separators: "rows" })).toBe(
      "CharcellTable CharcellTable--row-lines",
    );
    expect(classes({ separators: "columns" })).toBe(
      "CharcellTable CharcellTable--column-lines",
    );
    expect(classes({ separators: "none" })).toBe("CharcellTable");
    expect(classes({ variant: "dense" })).toBe(
      "CharcellTable CharcellTable--dense",
    );
    expect(classes({ borderY: "heavy", separators: "none" })).toBe(
      "CharcellTable CharcellTable--border-top-heavy CharcellTable--border-bottom-heavy",
    );
  });
});

describe("Progress", () => {
  test("a named progressbar; the fill carries its ratio; the percent is drawn", () => {
    const html = renderToStaticMarkup(
      <Progress value={42} label="build" showValue />,
    );
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="42"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-label="build"');
    expect(html).toContain('style="--charcell-progress--ratio:0.42"');
    expect(html).toContain("42%");
    expect(renderToStaticMarkup(<Progress value={150} />)).toContain(
      "--charcell-progress--ratio:1",
    );
  });

  test("with no value it is indeterminate: no aria-valuenow, no percent", () => {
    const html = renderToStaticMarkup(<Progress label="build" showValue />);
    expect(html).toContain("CharcellProgress--indeterminate");
    expect(html).not.toContain("aria-valuenow");
    expect(html).not.toContain("%<");
    expect(
      renderToStaticMarkup(<Progress value={0} label="build" showValue />),
    ).not.toContain("CharcellProgress--indeterminate");
  });
});

describe("RichText", () => {
  test("a block of the rich text look around any HTML", () => {
    const html = renderToStaticMarkup(
      <RichText>
        <h1>charcell</h1>
        <p>
          A <em>quiet</em> <a href="#notes">kit</a>.
        </p>
      </RichText>,
    );
    expect(html).toMatch(
      /^<div class="CharcellRichText"><h1>charcell<\/h1><p>/,
    );
  });
});

describe("SortableList", () => {
  const gripIds = (html: string) =>
    [...html.matchAll(/id="[^"]*-grip-([^"]+)"/g)].map((match) => match[1]);
  const lists = () => (
    <>
      <SortableList items={["alpha", "beta"]}>
        {({ item }) => <span>{item}</span>}
      </SortableList>
      <SortableList items={["gamma", "delta"]}>
        {({ item }) => <span>{item}</span>}
      </SortableList>
    </>
  );

  // The server and the hydration have to name each grip alike, so the keys
  // the engine keeps carry nothing over from an earlier render or list.
  test("names its grips the same on every render, and apart from other lists", () => {
    const first = renderToStaticMarkup(lists());
    expect(renderToStaticMarkup(lists())).toBe(first);
    expect(gripIds(first)).toEqual([
      expect.stringMatching(/^charcell-sortable-.+-0$/),
      expect.stringMatching(/^charcell-sortable-.+-1$/),
      expect.stringMatching(/^charcell-sortable-.+-0$/),
      expect.stringMatching(/^charcell-sortable-.+-1$/),
    ]);
  });

  test("a group's lists each count their own keys, the same on every render", () => {
    const group = () => (
      <SortableGroup>
        <SortableList id="plan" items={["templates"]}>
          {({ item }) => <span>{item}</span>}
        </SortableList>
        <SortableList id="release" items={["button"]}>
          {({ item }) => <span>{item}</span>}
        </SortableList>
      </SortableGroup>
    );
    const first = renderToStaticMarkup(group());
    expect(renderToStaticMarkup(group())).toBe(first);
    expect(gripIds(first)).toEqual([
      "charcell-sortable-plan-0",
      "charcell-sortable-release-0",
    ]);
  });
});
