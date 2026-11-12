// @vitest-environment jsdom
//
// driver-track smoke: mount the zag-backed compounds in jsdom and drive them -
// click a select open, choose an item, dismiss a popover - verifying the
// machine → api → visual wiring runs, beyond rendering.
// (Positioning geometry is meaningless in jsdom - layout is not asserted, only
// behavior and the state-mirrored BEM classes.)
import { afterEach, describe, expect, test, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import {
  AccordionItem,
  Button,
  Combobox,
  Field,
  ActionMenu,
  Dialog,
  Popover,
  ScrollArea,
  Select,
  SortableGroup,
  SortableList,
  SplitGrid,
  Splitter,
  Tabs,
  Tree,
  TreeGroup,
  TreeItem,
} from "../dist/react/index";
import { ScrollAreaEngine } from "charcell/scripts/scroll-area";
import { TreeEngine } from "charcell/scripts/tree";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no ResizeObserver; the splitter machine observes its root, and
// the drag engine reaches for it as it loads - so the stub is hoisted above the
// imports. The geometry is meaningless here anyway.
vi.hoisted(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// jsdom also lacks Element#scrollTo; the select machine scrolls its listbox.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

const ITEMS = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "svelte", label: "Svelte" },
];

let container: HTMLElement | null = null;
let root: Root | null = null;

function mount(element: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(element));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  document.body.innerHTML = "";
  container = null;
  root = null;
});

// Zag schedules machine transitions through microtasks/frames - awaiting a
// macrotask inside `act` lets the transition land and React re-render.
async function click(element: Element) {
  await act(async () => {
    // Pointermove first: Zag highlights an item under the pointer before a
    // pointerup selects it.
    element.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    (element as HTMLElement).click();
    // A frame's worth of flush: Zag registers dismissable-layer listeners and
    // runs machine actions on animation frames (timer-backed in jsdom).
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}

describe("Select (react, jsdom)", () => {
  test("closed: boxed trigger with placeholder at the placeholder tone; no listbox", () => {
    mount(createElement(Select, { items: ITEMS, placeholder: "pick one" }));
    const trigger = document.querySelector(".CharcellSelectTrigger");
    expect(trigger).not.toBeNull();
    expect(trigger!.className).toContain("CharcellSelectTrigger--boxed");
    expect(trigger!.textContent).toContain("pick one");
    expect(
      trigger!.querySelector(".CharcellSelectTrigger__value--placeholder"),
    ).not.toBeNull();
    // One hidden sizer per item sets the trigger's width, as a native select's.
    const sizers = trigger!.querySelectorAll(".CharcellSelectTrigger__sizer");
    expect([...sizers].map((sizer) => sizer.textContent)).toEqual([
      "React",
      "Vue",
      "Svelte",
    ]);
    expect(sizers[0].getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector(".CharcellSelectListbox")).toBeNull();
  });

  test("defaultValue resolves to its label through the collection", () => {
    mount(createElement(Select, { items: ITEMS, defaultValue: "vue" }));
    expect(
      document.querySelector(".CharcellSelectTrigger__value")!.textContent,
    ).toBe("Vue");
  });

  test("click opens the listbox: items render, the selected one is inverted, trigger goes --open", async () => {
    mount(createElement(Select, { items: ITEMS, defaultValue: "vue" }));
    await click(document.querySelector(".CharcellSelectTrigger")!);
    const items = document.querySelectorAll(".CharcellSelectListbox__item");
    expect(items).toHaveLength(3);
    expect(items[1].className).toContain(
      "CharcellSelectListbox__item--selected",
    );
    expect(
      document.querySelector(".CharcellSelectTrigger")!.className,
    ).toContain("CharcellSelectTrigger--open");
    // The boxed listbox is attached: it shares the trigger's stroke row.
    expect(
      document.querySelector(".CharcellSelectListbox")!.className,
    ).toContain("CharcellSelectListbox--attached");
  });

  test("choosing an item reports the plain string value and closes", async () => {
    const onValueChange = vi.fn();
    mount(createElement(Select, { items: ITEMS, onValueChange }));
    await click(document.querySelector(".CharcellSelectTrigger")!);
    await click(document.querySelectorAll(".CharcellSelectListbox__item")[2]);
    expect(onValueChange).toHaveBeenCalledWith("svelte");
    expect(document.querySelector(".CharcellSelectListbox")).toBeNull();
    expect(
      document.querySelector(".CharcellSelectTrigger__value")!.textContent,
    ).toBe("Svelte");
  });
});

// The text an `aria-labelledby` resolves to, failing on an id that points
// nowhere: a dangling reference names nothing.
function labeledByText(element: Element): string {
  return element
    .getAttribute("aria-labelledby")!
    .split(" ")
    .map((id) => {
      const target = document.getElementById(id);
      expect(
        target,
        `aria-labelledby points at a missing #${id}`,
      ).not.toBeNull();
      return target!.textContent!.trim();
    })
    .join(" ");
}

describe("Select naming and forms (react, jsdom)", () => {
  test("the trigger is named by its Field's label and its value; the caret is hidden", () => {
    mount(
      createElement(
        Field,
        { label: "framework", htmlFor: "framework" },
        createElement(Select, {
          items: ITEMS,
          defaultValue: "vue",
          id: "framework",
        }),
      ),
    );
    const trigger = document.querySelector(".CharcellSelectTrigger")!;
    expect(trigger.id).toBe("framework");
    expect(document.querySelector("label")!.getAttribute("for")).toBe(
      "framework",
    );
    expect(trigger.getAttribute("role")).toBe("combobox");
    expect(labeledByText(trigger)).toBe("framework Vue");
    expect(
      document
        .querySelector(".CharcellSelectTrigger__caret")!
        .getAttribute("aria-hidden"),
    ).toBe("true");
  });

  test("without a label the value names it, and triggerProps can name it outright", () => {
    mount(createElement(Select, { items: ITEMS, defaultValue: "vue" }));
    expect(
      labeledByText(document.querySelector(".CharcellSelectTrigger")!),
    ).toBe("Vue");
    act(() =>
      root!.render(
        createElement(Select, {
          items: ITEMS,
          triggerProps: { "aria-label": "framework", id: "fw" },
        }),
      ),
    );
    const trigger = document.querySelector(".CharcellSelectTrigger")!;
    expect(trigger.getAttribute("aria-label")).toBe("framework");
    expect(trigger.hasAttribute("aria-labelledby")).toBe(false);
    expect(trigger.id).toBe("fw");
  });

  test("the open listbox is named by the Field's label", async () => {
    mount(
      createElement(
        Field,
        { label: "framework", htmlFor: "framework" },
        createElement(Select, { items: ITEMS, id: "framework" }),
      ),
    );
    await click(document.querySelector(".CharcellSelectTrigger")!);
    // The listbox is the scroll area's content, its options' own parent.
    const listbox = document.querySelector(
      ".CharcellSelectListbox .CharcellScrollArea__columns",
    )!;
    expect(listbox.getAttribute("role")).toBe("listbox");
    expect(labeledByText(listbox)).toBe("framework");
  });

  test("a name renders the hidden select, which carries the value to a form", async () => {
    mount(
      createElement(
        "form",
        null,
        createElement(Select, {
          items: ITEMS,
          name: "framework",
          defaultValue: "vue",
        }),
      ),
    );
    const hidden = document.querySelector(
      'select[name="framework"]',
    ) as HTMLSelectElement;
    expect(hidden).not.toBeNull();
    expect(hidden.options).toHaveLength(3);
    expect(new FormData(document.querySelector("form")!).get("framework")).toBe(
      "vue",
    );
  });

  test("a number-valued item comes back as its number", async () => {
    const onValueChange = vi.fn();
    const items = [
      { value: 10, label: "ten" },
      { value: 20, label: "twenty" },
    ];
    mount(createElement(Select, { items, defaultValue: 10, onValueChange }));
    expect(
      document.querySelector(".CharcellSelectTrigger__value")!.textContent,
    ).toBe("ten");
    await click(document.querySelector(".CharcellSelectTrigger")!);
    await click(document.querySelectorAll(".CharcellSelectListbox__item")[1]);
    expect(onValueChange).toHaveBeenCalledWith(20);
  });

  test("required and form reach the hidden select", () => {
    mount(
      createElement(Select, {
        items: ITEMS,
        name: "framework",
        required: true,
        form: "settings",
      }),
    );
    const hidden = document.querySelector(
      'select[name="framework"]',
    ) as HTMLSelectElement;
    expect(hidden.required).toBe(true);
    expect(hidden.getAttribute("form")).toBe("settings");
  });

  test("closeOnSelect false keeps the listbox open while the reader browses", async () => {
    mount(createElement(Select, { items: ITEMS, closeOnSelect: false }));
    await click(document.querySelector(".CharcellSelectTrigger")!);
    await click(document.querySelectorAll(".CharcellSelectListbox__item")[1]);
    expect(document.querySelector(".CharcellSelectListbox")).not.toBeNull();
  });

  test("a controlled open state reports the change and stays as given", async () => {
    const onOpenChange = vi.fn();
    mount(createElement(Select, { items: ITEMS, open: true, onOpenChange }));
    expect(document.querySelector(".CharcellSelectListbox")).not.toBeNull();
    await click(document.querySelector(".CharcellSelectTrigger")!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(document.querySelector(".CharcellSelectListbox")).not.toBeNull();
  });

  test("a disabled item is marked and cannot be chosen", async () => {
    const onValueChange = vi.fn();
    const items = [
      ...ITEMS.slice(0, 2),
      { value: "svelte", label: "Svelte", disabled: true },
    ];
    mount(createElement(Select, { items, onValueChange }));
    await click(document.querySelector(".CharcellSelectTrigger")!);
    const disabled = document.querySelectorAll(
      ".CharcellSelectListbox__item",
    )[2];
    expect(disabled.className).toContain(
      "CharcellSelectListbox__item--disabled",
    );
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    await click(disabled);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("Popover (react, jsdom)", () => {
  // The `trigger` slot is scoped: the call site spreads the machine's trigger
  // record onto its own Button.
  const trigger = ({
    triggerProps,
  }: {
    triggerProps: Record<string, unknown>;
  }) => createElement(Button, { ...triggerProps, label: "open" });

  test("click opens the panel (portalled to body); Escape closes it", async () => {
    mount(
      createElement(
        Popover,
        { trigger, label: "settings" },
        createElement("p", null, "panel content"),
      ),
    );
    expect(document.querySelector(".CharcellPopoverPanel")).toBeNull();
    await click(document.querySelector(".CharcellButton")!);
    const panel = document.querySelector(".CharcellPopoverPanel");
    expect(panel).not.toBeNull();
    expect(panel!.className).toContain(
      "CharcellPopoverPanel--border-end-double",
    );
    expect(panel!.textContent).toContain("panel content");
    await act(async () => {
      // Zag's dismissable layer listens at the document level.
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    expect(document.querySelector(".CharcellPopoverPanel")).toBeNull();
  });

  test("the trigger's ARIA lands on the focusable button, and the panel is a named dialog", async () => {
    mount(
      createElement(Popover, { trigger, label: "settings" }, "panel content"),
    );
    const button = document.querySelector("button.CharcellButton")!;
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    await click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const panel = document.querySelector(".CharcellPopoverPanel")!;
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-label")).toBe("settings");
    expect(panel.hasAttribute("aria-labelledby")).toBe(false);
    expect(button.getAttribute("aria-controls")).toBe(panel.id);
  });

  test("a controlled popover reports open changes, so it can close", async () => {
    const onOpenChange = vi.fn();
    mount(
      createElement(
        Popover,
        { trigger, label: "settings", open: true, onOpenChange },
        "panel content",
      ),
    );
    expect(document.querySelector(".CharcellPopoverPanel")).not.toBeNull();
    // A frame for the machine to register its dismissable layer.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Splitter (react, jsdom)", () => {
  test("renders both panels and the keyboard-accessible double-rule handle", () => {
    mount(
      createElement(Splitter, {
        defaultSize: [30, 70],
        start: createElement("div", null, "left pane"),
        end: createElement("div", null, "right pane"),
      }),
    );
    const rootElement = document.querySelector(".CharcellSplitter");
    expect(rootElement).not.toBeNull();
    expect(document.querySelectorAll(".CharcellSplitter__panel")).toHaveLength(
      2,
    );
    const handle = document.querySelector(".CharcellSplitter__handle");
    expect(handle).not.toBeNull();
    expect(handle!.getAttribute("role")).toBe("separator");
    expect(rootElement!.textContent).toContain("left pane");
    expect(rootElement!.textContent).toContain("right pane");
  });
});

describe("ScrollArea (react, jsdom)", () => {
  test("renders a named region around its content, a tab stop while it scrolls, a bar of cells beside it, and moves whole rows for the keys", async () => {
    const area = (scrolling: "stepped" | "fluid") =>
      createElement(
        ScrollArea,
        { label: "everyone on highway 9", scrolling },
        createElement("div", null, "ps: send a postcard"),
      );
    mount(area("stepped"));
    const viewport = document.querySelector<HTMLElement>(
      ".CharcellScrollArea__viewport",
    )!;
    expect(viewport.getAttribute("role")).toBe("region");
    expect(viewport.getAttribute("aria-label")).toBe("everyone on highway 9");
    // jsdom lays nothing out, so nothing scrolls: no tab stop.
    expect(viewport.tabIndex).toBe(-1);
    // Content taller than the area, measured again as an option changes.
    Object.defineProperty(viewport, "scrollHeight", {
      value: 160,
      configurable: true,
    });
    act(() => root!.render(area("fluid")));
    expect(viewport.tabIndex).toBe(0);
    expect(viewport.textContent).toBe("ps: send a postcard");
    const bar = document.querySelector(".CharcellScrollArea__vertical-bar");
    expect(bar?.getAttribute("aria-hidden")).toBe("true");
    // jsdom lays nothing out: a row is the line height it is given.
    viewport.style.lineHeight = "16px";
    let to: ScrollToOptions | undefined;
    viewport.scrollTo = ((options: ScrollToOptions) => {
      to = options;
    }) as typeof viewport.scrollTo;
    viewport.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    expect(to?.top).toBe(16);
  });
});

describe("Combobox forms (react, jsdom)", () => {
  test("a form gets the chosen item's value, never the text, and a reset clears it", async () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    container = document.createElement("div");
    form.appendChild(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        createElement(Combobox, {
          name: "heir",
          defaultValue: "ripburger",
          items: [
            { value: "ripburger", label: "adrian ripburger" },
            { value: "maureen", label: "maureen" },
          ],
        }),
      ),
    );
    expect(new FormData(form).getAll("heir")).toEqual(["ripburger"]);
    expect(form.querySelector<HTMLInputElement>("[role=combobox]")!.name).toBe(
      "",
    );
    await act(async () => {
      form.reset();
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    expect(new FormData(form).getAll("heir")).toEqual([""]);
    form.remove();
  });

  test("form points the hidden input at a form elsewhere", () => {
    mount(
      createElement(Combobox, {
        name: "heir",
        form: "inherit",
        items: [{ value: "maureen", label: "maureen" }],
      }),
    );
    expect(
      document
        .querySelector('input[type="hidden"][name="heir"]')!
        .getAttribute("form"),
    ).toBe("inherit");
  });
});

describe("disclosures (react, jsdom)", () => {
  test("a held TreeGroup and AccordionItem report a press and stay as given", () => {
    const groupChange = vi.fn();
    const itemChange = vi.fn();
    mount(
      createElement(
        "div",
        null,
        createElement(
          TreeGroup,
          { label: "the factory", open: false, onOpenChange: groupChange },
          createElement(TreeItem, { label: "polecats" }),
        ),
        createElement(
          AccordionItem,
          { title: "torch", open: true, onOpenChange: itemChange },
          "todd has it",
        ),
      ),
    );
    const group = document.querySelector<HTMLElement>(
      ".CharcellTreeGroup__summary",
    )!;
    const item = document.querySelector("details")!;
    act(() => group.click());
    act(() => item.querySelector("summary")!.click());
    expect(groupChange).toHaveBeenCalledWith(true);
    expect(itemChange).toHaveBeenCalledWith(false);
    expect(group.getAttribute("aria-expanded")).toBe("false");
    expect(item.open).toBe(true);
    // A change from elsewhere, a sibling sharing a name, is reported and put
    // back.
    act(() => {
      item.open = false;
      item.dispatchEvent(new Event("toggle"));
    });
    expect(itemChange).toHaveBeenLastCalledWith(false);
    expect(item.open).toBe(true);
  });

  test("an uncontrolled TreeGroup reports its new open state", () => {
    const change = vi.fn();
    mount(
      createElement(
        TreeGroup,
        { label: "the factory", defaultOpen: false, onOpenChange: change },
        createElement(TreeItem, { label: "polecats" }),
      ),
    );
    const row = document.querySelector<HTMLElement>(
      ".CharcellTreeGroup__summary",
    )!;
    expect(row.getAttribute("aria-expanded")).toBe("false");
    act(() => row.click());
    expect(change).toHaveBeenCalledWith(true);
    expect(row.getAttribute("aria-expanded")).toBe("true");
    // Enter and space press it, as a button.
    act(() => {
      row.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(change).toHaveBeenLastCalledWith(false);
    expect(row.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("engines attached by ref (react, jsdom)", () => {
  test("Tree and ScrollArea keep their engine across renders, and let it go on unmount", () => {
    const treeDestroy = vi.spyOn(TreeEngine.prototype, "destroy");
    const areaDestroy = vi.spyOn(ScrollAreaEngine.prototype, "destroy");
    const consumer = { current: null as HTMLElement | null };
    const page = (subject: string) =>
      createElement(
        "div",
        null,
        createElement(
          Tree,
          { label: "highway 9" },
          createElement(TreeItem, { label: subject }),
        ),
        createElement(
          ScrollArea,
          { label: "everyone on highway 9", ref: consumer },
          createElement("div", null, subject),
        ),
      );
    mount(page("melonweed"));
    act(() => root!.render(page("corville")));
    act(() => root!.render(page("mink ranch")));
    expect(treeDestroy).not.toHaveBeenCalled();
    expect(areaDestroy).not.toHaveBeenCalled();
    expect(consumer.current).toBeInstanceOf(HTMLElement);
    act(() => root!.unmount());
    root = null;
    expect(treeDestroy).toHaveBeenCalledTimes(1);
    expect(areaDestroy).toHaveBeenCalledTimes(1);
    expect(consumer.current).toBeNull();
    treeDestroy.mockRestore();
    areaDestroy.mockRestore();
  });
});

describe("SplitGrid (react, jsdom)", () => {
  const rows = [{ id: "roster" }, { id: "detail" }];
  const grid = (columns: { id: string }[]) =>
    createElement(SplitGrid, {
      columns,
      rows,
      children: ({ column, row }: { column: string; row: string }) =>
        createElement("span", null, `${column} ${row}`),
    });

  test("renders a cell per column and row and a separator between each two, and follows a new track set", () => {
    mount(grid([{ id: "gangs" }, { id: "riders" }]));
    const cells = () => document.querySelectorAll(".CharcellSplitGrid__cell");
    const handles = (axis: string) =>
      document.querySelectorAll(`.CharcellSplitGrid__handle--${axis}`);
    expect(cells()).toHaveLength(4);
    expect(cells()[1].textContent).toBe("riders roster");
    expect(handles("column")).toHaveLength(1);
    expect(handles("row")).toHaveLength(1);
    expect(handles("column")[0].getAttribute("role")).toBe("separator");
    expect(handles("column")[0].getAttribute("aria-label")).toBe(
      "resize columns",
    );
    // A span (and grip) per track crossed, a crossing between.
    expect(
      handles("column")[0].querySelectorAll(".CharcellSplitGrid__grip"),
    ).toHaveLength(2);
    expect(
      handles("column")[0].querySelectorAll(".CharcellSplitGrid__crossing"),
    ).toHaveLength(1);

    act(() =>
      root!.render(grid([{ id: "gangs" }, { id: "riders" }, { id: "bikes" }])),
    );
    expect(cells()).toHaveLength(6);
    expect(handles("column")).toHaveLength(2);
    expect(
      handles("row")[0].querySelectorAll(".CharcellSplitGrid__grip"),
    ).toHaveLength(3);
  });

  test("each handle controls the cells on either side of it, by ids in the page", () => {
    mount(grid([{ id: "gangs" }, { id: "riders" }, { id: "bikes" }]));
    const controlled = (handle: Element) =>
      (handle.getAttribute("aria-controls") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.textContent);
    const [first, second] = document.querySelectorAll(
      ".CharcellSplitGrid__handle--column",
    );
    expect(controlled(first!)).toEqual([
      "gangs roster",
      "gangs detail",
      "riders roster",
      "riders detail",
    ]);
    expect(controlled(second!)).toEqual([
      "riders roster",
      "riders detail",
      "bikes roster",
      "bikes detail",
    ]);
    expect(
      controlled(document.querySelector(".CharcellSplitGrid__handle--row")!),
    ).toEqual([
      "gangs roster",
      "riders roster",
      "bikes roster",
      "gangs detail",
      "riders detail",
      "bikes detail",
    ]);
  });
});

async function pressEscape() {
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}

describe("Dialog (react, jsdom)", () => {
  const trigger = ({
    triggerProps,
  }: {
    triggerProps: Record<string, unknown>;
  }) => createElement(Button, { ...triggerProps, label: "open" });
  const actions = ({ closeProps }: { closeProps: Record<string, unknown> }) =>
    createElement(Button, { ...closeProps, label: "close", variant: "dense" });

  test("the trigger opens a named dialog in a titled Frame; the close action closes it", async () => {
    mount(
      createElement(
        Dialog,
        { trigger, actions, label: "settings" },
        createElement("p", null, "body"),
      ),
    );
    expect(document.querySelector(".CharcellDialogPanel")).toBeNull();
    await click(document.querySelector(".CharcellButton")!);
    const window = document.querySelector(
      ".CharcellDialogPanel .CharcellFrame",
    )!;
    expect(window.getAttribute("role")).toBe("dialog");
    expect(window.getAttribute("aria-label")).toBe("settings");
    expect(window.hasAttribute("aria-labelledby")).toBe(false);
    expect(window.className).toContain("CharcellFrame--active");
    expect(window.className).toContain("CharcellFrame--border-end-double");
    expect(window.textContent).toContain("settings");
    expect(window.textContent).toContain("body");
    await click(
      [...document.querySelectorAll(".CharcellDialogPanel button")].find(
        (button) => button.textContent === "close",
      )!,
    );
    expect(document.querySelector(".CharcellDialogPanel")).toBeNull();
  });

  test("a plain node as the trigger renders nothing, never a button that opens nothing", () => {
    mount(
      createElement(Dialog, {
        // What the types refuse, as an untyped consumer could still pass it.
        trigger: createElement(Button, {
          label: "open",
        }) as unknown as typeof trigger,
        label: "settings",
      }),
    );
    expect(document.querySelector(".CharcellButton")).toBeNull();
  });

  test("Escape closes it", async () => {
    mount(
      createElement(
        Dialog,
        { trigger, label: "settings", defaultOpen: true },
        "body",
      ),
    );
    expect(document.querySelector(".CharcellDialogPanel")).not.toBeNull();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    await pressEscape();
    expect(document.querySelector(".CharcellDialogPanel")).toBeNull();
  });

  // A modal dialog hands initialFocus to its focus trap, which needs layout
  // jsdom lacks; a non-modal one focuses it the same way, without the trap.
  test("describedBy describes the window, and initialFocus takes focus as it opens", async () => {
    mount(
      createElement(
        Dialog,
        {
          trigger,
          label: "landing gear",
          modal: false,
          describedBy: "gear-warning",
          initialFocus: () => document.getElementById("keep"),
        },
        createElement("p", { id: "gear-warning" }, "no going back"),
        createElement("button", { id: "detach" }, "detach"),
        createElement("button", { id: "keep" }, "keep it"),
      ),
    );
    await click(document.querySelector(".CharcellButton")!);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    const window = document.querySelector(
      ".CharcellDialogPanel .CharcellFrame",
    )!;
    expect(window.getAttribute("aria-describedby")).toBe("gear-warning");
    expect(document.activeElement?.id).toBe("keep");
  });

  test("closing after what opened it has gone sends focus to finalFocus", async () => {
    const page = (opener: boolean, open: boolean) =>
      createElement(
        "div",
        null,
        createElement("h2", { id: "polecats", tabIndex: -1 }, "polecats"),
        opener ? createElement("button", { id: "open-gear" }, "gear") : null,
        createElement(
          Dialog,
          {
            label: "landing gear",
            open,
            onOpenChange: () => {},
            finalFocus: () => document.getElementById("polecats"),
          },
          "no going back",
        ),
      );
    mount(page(true, false));
    const opener = document.getElementById("open-gear") as HTMLButtonElement;
    opener.focus();
    act(() => root!.render(page(true, true)));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    // What opened the dialog is removed while it is open.
    act(() => root!.render(page(false, true)));
    act(() => root!.render(page(false, false)));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    expect(document.activeElement?.id).toBe("polecats");
  });
});

describe("ActionMenu (react, jsdom)", () => {
  const trigger = ({
    triggerProps,
  }: {
    triggerProps: Record<string, unknown>;
  }) => createElement(Button, { ...triggerProps, label: "actions" });
  const items = [
    { value: "rename", label: "rename" },
    { value: "break", separator: true },
    { value: "delete", label: "delete" },
    { value: "raise", label: "raise", disabled: true },
  ];

  test("opens a menu of items with a separator; choosing one reports it and closes", async () => {
    const onSelect = vi.fn();
    mount(createElement(ActionMenu, { trigger, items, onSelect }));
    await click(document.querySelector(".CharcellButton")!);
    const list = document.querySelector(".CharcellActionMenuList")!;
    // The menu is the scroll area's content, its items' own parent.
    const menu = list.querySelector(".CharcellScrollArea__columns")!;
    expect(menu.getAttribute("role")).toBe("menu");
    expect(
      [...menu.children].every((child) =>
        ["menuitem", "separator"].includes(child.getAttribute("role") ?? ""),
      ),
    ).toBe(true);
    expect(list.className).toContain(
      "CharcellActionMenuList--border-end-double",
    );
    expect(list.querySelectorAll(".CharcellActionMenuList__item")).toHaveLength(
      3,
    );
    expect(list.querySelector(".CharcellSeparator")).not.toBeNull();
    expect(
      list.querySelectorAll(".CharcellActionMenuList__item")[2].className,
    ).toContain("CharcellActionMenuList__item--disabled");
    await click(list.querySelectorAll(".CharcellActionMenuList__item")[1]);
    expect(onSelect).toHaveBeenCalledWith("delete");
    expect(document.querySelector(".CharcellActionMenuList")).toBeNull();
  });
});

describe("Tabs (react, jsdom)", () => {
  const items = [
    { value: "props", label: "props" },
    { value: "slots", label: "slots" },
  ];
  const panel = ({ value }: { value: string }) =>
    createElement("p", null, `${value} panel`);

  test("the first tab is selected; clicking another selects it and shows its panel", async () => {
    const onValueChange = vi.fn();
    mount(
      createElement(Tabs, { items, panel, label: "editor", onValueChange }),
    );
    const tabs = document.querySelectorAll(".CharcellTabList__tab");
    expect(
      document.querySelector(".CharcellTabList")!.getAttribute("aria-label"),
    ).toBe("editor");
    // Boxed by default: folder tabs, the base run on by the row's rest.
    expect(document.querySelector(".CharcellTabList")!.className).not.toContain(
      "--dense",
    );
    expect(document.querySelector(".CharcellTabList__rest")).not.toBeNull();
    expect(tabs[0].className).toContain("CharcellTabList__tab--selected");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    const panels = document.querySelectorAll(".CharcellTabPanel");
    expect(panels).toHaveLength(2);
    expect(panels[1].hasAttribute("hidden")).toBe(true);
    expect(tabs[0].getAttribute("aria-controls")).toBe(panels[0].id);
    await click(tabs[1]);
    expect(tabs[1].getAttribute("aria-controls")).toBe(panels[1].id);
    expect(onValueChange).toHaveBeenCalledWith("slots");
    expect(tabs[1].className).toContain("CharcellTabList__tab--selected");
    expect(
      document.querySelectorAll(".CharcellTabPanel")[1].hasAttribute("hidden"),
    ).toBe(false);
    expect(document.querySelectorAll(".CharcellTabPanel")[1].textContent).toBe(
      "slots panel",
    );
  });
});

describe("Tabs, right to left (react, jsdom)", () => {
  const items = [
    { value: "props", label: "props" },
    { value: "slots", label: "slots" },
  ];
  const panel = ({ value }: { value: string }) =>
    createElement("p", null, `${value} panel`);
  const arrow = async (element: Element, key: string) => {
    await act(async () => {
      (element as HTMLElement).focus();
      element.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
  };

  test("given `direction`, the machine writes it on its parts as `dir` and the left arrow moves to the next tab", async () => {
    const onValueChange = vi.fn();
    mount(
      createElement(Tabs, {
        items,
        panel,
        label: "editor",
        direction: "rtl",
        onValueChange,
      }),
    );
    expect(
      document.querySelector(".CharcellTabList")!.getAttribute("dir"),
    ).toBe("rtl");
    const tabs = document.querySelectorAll(".CharcellTabList__tab");
    await arrow(tabs[0], "ArrowLeft");
    expect(document.activeElement).toBe(tabs[1]);
  });
});

describe("Tabs, dense (react, jsdom)", () => {
  test("the dense row over a rule, the panel bare", () => {
    mount(
      createElement(Tabs, {
        items: [{ value: "a", label: "a" }],
        panel: () => "panel",
        variant: "dense",
      }),
    );
    expect(document.querySelector(".CharcellTabList")!.className).toContain(
      "CharcellTabList--dense",
    );
    expect(document.querySelector(".CharcellTabPanel")!.className).toContain(
      "CharcellTabPanel--dense",
    );
  });
});

describe("SortableList (react, jsdom)", () => {
  const labels = () =>
    [...document.querySelectorAll(".CharcellSortableList__content")].map(
      (node) => node.textContent,
    );
  const grips = () => [
    ...document.querySelectorAll<HTMLButtonElement>(
      ".CharcellSortableList__grip",
    ),
  ];
  const key = async (element: Element, name: string) => {
    await act(async () => {
      element.dispatchEvent(
        new KeyboardEvent("keydown", { key: name, bubbles: true }),
      );
    });
  };
  const renderItem = ({ item }: { item: string }) => item;

  test("a list of rows, each a named grip before its item", () => {
    mount(
      createElement(SortableList<string>, {
        items: ["alpha", "beta", "gamma"],
        children: renderItem,
      }),
    );
    expect(
      document.querySelector(".CharcellSortableList")!.getAttribute("role"),
    ).toBe("list");
    expect(document.querySelectorAll('[role="listitem"]')).toHaveLength(3);
    expect(labels()).toEqual(["alpha", "beta", "gamma"]);
    const grip = grips()[0];
    expect(grip.getAttribute("aria-label")).toBe("reorder alpha");
    expect(
      document.getElementById(grip.getAttribute("aria-describedby")!)!
        .textContent,
    ).toContain("arrow keys");
    expect(grip.getAttribute("aria-pressed")).toBe("false");
  });

  test("the arrow keys move an item a step, and say where it went", async () => {
    const onItemsChange = vi.fn();
    mount(
      createElement(SortableList<string>, {
        items: ["alpha", "beta", "gamma"],
        onItemsChange,
        children: renderItem,
      }),
    );
    await key(grips()[0], "ArrowDown");
    expect(labels()).toEqual(["beta", "alpha", "gamma"]);
    expect(onItemsChange).toHaveBeenLastCalledWith(["beta", "alpha", "gamma"]);
    expect(document.querySelector('[role="status"]')!.textContent).toBe(
      "moved alpha to position 2 of 3",
    );
    // The ends hold.
    await key(grips()[0], "ArrowUp");
    expect(onItemsChange).toHaveBeenCalledTimes(1);
  });

  test("a click picks an item up, a click on another grip places it there", async () => {
    const onItemsChange = vi.fn();
    mount(
      createElement(SortableList<string>, {
        items: ["alpha", "beta", "gamma"],
        onItemsChange,
        children: renderItem,
      }),
    );
    await click(grips()[2]);
    expect(grips()[2].getAttribute("aria-pressed")).toBe("true");
    expect(grips()[2].className).toContain(
      "CharcellSortableList__grip--engaged",
    );
    expect(document.querySelector('[role="status"]')!.textContent).toContain(
      "gamma picked up, item 3 of 3",
    );
    await click(grips()[0]);
    expect(labels()).toEqual(["gamma", "alpha", "beta"]);
    expect(onItemsChange).toHaveBeenLastCalledWith(["gamma", "alpha", "beta"]);
    expect(
      document.querySelector(".CharcellSortableList__grip--engaged"),
    ).toBeNull();
  });

  test("Escape, or the same grip again, lets a picked item go", async () => {
    mount(
      createElement(SortableList<string>, {
        items: ["alpha", "beta"],
        children: renderItem,
      }),
    );
    await click(grips()[0]);
    await key(document.body, "Escape");
    expect(grips()[0].getAttribute("aria-pressed")).toBe("false");
    await click(grips()[1]);
    await click(grips()[1]);
    expect(grips()[1].getAttribute("aria-pressed")).toBe("false");
  });
});

describe("SortableGroup (react, jsdom)", () => {
  type Node = { name: string; children: Node[] };
  const PLAN: Node[] = [
    {
      name: "templates",
      children: [
        { name: "button", children: [] },
        { name: "frame", children: [] },
      ],
    },
    { name: "release", children: [] },
  ];
  const grip = (name: string) =>
    [...document.querySelectorAll(".CharcellSortableList__row")]
      .find(
        (row) =>
          row.querySelector(":scope > .CharcellSortableList__content span")
            ?.textContent === name,
      )!
      .querySelector<HTMLButtonElement>(
        ":scope > .CharcellSortableList__grip",
      )!;
  const tree = (
    list: Element = document.querySelector(".CharcellSortableList")!,
  ): string =>
    [...list.children]
      .filter((child) => child.classList.contains("CharcellSortableList__row"))
      .map((row) => {
        const content = row.querySelector(
          ":scope > .CharcellSortableList__content",
        )!;
        const nested = content.querySelector(".CharcellSortableList");
        return `${content.querySelector("span")!.textContent}${nested ? `[${tree(nested)}]` : ""}`;
      })
      .join(" ");
  const renderPlan = (
    onMove: (move: unknown) => void,
    empty?: (scope: { state: string; placeProps: object }) => unknown,
  ) =>
    mount(
      createElement(SortableGroup, {
        onMove,
        children: createElement(SortableList<Node>, {
          id: "plan",
          items: PLAN,
          getKey: (item) => item.name,
          children: ({ item }) =>
            createElement(
              "div",
              null,
              createElement("span", null, item.name),
              createElement(SortableList<Node>, {
                id: item.name,
                items: item.children,
                getKey: (child) => child.name,
                ...(empty ? { empty } : {}),
                children: ({ item: child }) =>
                  createElement("span", null, child.name),
              }),
            ),
        }),
      }),
    );

  test("nested lists render inside their items, an empty one a row tall", () => {
    renderPlan(() => {});
    expect(tree()).toBe("templates[button frame] release[]");
    expect(
      document.querySelector(".CharcellSortableList--empty"),
    ).not.toBeNull();
  });

  test("a picked item is placed by a grip in another list, and the group reports the move", async () => {
    const onMove = vi.fn();
    renderPlan(onMove);
    await click(grip("frame"));
    await click(grip("release"));
    expect(onMove).toHaveBeenCalledWith({
      key: "frame",
      from: { list: "templates", index: 1 },
      to: { list: "plan", index: 1 },
    });
    expect(tree()).toBe("templates[button] frame[] release[]");
  });

  test("an empty list offers its place button while an item is picked up", async () => {
    const onMove = vi.fn();
    renderPlan(onMove);
    expect(document.querySelector(".CharcellSortableList__place")).toBeNull();
    await click(grip("button"));
    const place = document.querySelector<HTMLButtonElement>(
      ".CharcellSortableList__place",
    )!;
    expect(place.textContent).toBe("place here");
    await click(place);
    expect(tree()).toBe("templates[frame] release[button]");
  });

  test("a list inside the picked item offers no way in", async () => {
    renderPlan(() => {});
    await click(grip("release"));
    // Release's own (empty) list sits inside it; templates' list does not.
    expect(
      document.querySelectorAll(".CharcellSortableList__place"),
    ).toHaveLength(0);
  });

  test("an empty list renders its own row from the empty scope", async () => {
    renderPlan(
      () => {},
      ({ state, placeProps }) =>
        state === "picked"
          ? createElement(
              "button",
              { ...placeProps, className: "mine" },
              "put it here",
            )
          : createElement("i", null, state),
    );
    expect(
      document.querySelector(".CharcellSortableList--empty i")!.textContent,
    ).toBe("idle");
    await click(grip("button"));
    await click(document.querySelector(".mine")!);
    expect(tree()).toBe("templates[frame] release[button]");
  });
});

describe("SortableList with its own grip (react, jsdom)", () => {
  test("the item places the grip, which takes the look, the name and the clicks", async () => {
    const onItemsChange = vi.fn();
    mount(
      createElement(SortableList<string>, {
        items: ["alpha", "beta"],
        customGrip: true,
        onItemsChange,
        children: ({ item, gripProps }) =>
          createElement(
            "header",
            null,
            createElement("span", null, item),
            createElement("button", gripProps),
          ),
      }),
    );
    const rows = document.querySelectorAll(".CharcellSortableList__row");
    expect(rows[0].className).toContain(
      "CharcellSortableList__row--custom-grip",
    );
    // No grip column: the only grip is the item's, inside its header.
    expect(
      rows[0].querySelector(":scope > .CharcellSortableList__grip"),
    ).toBeNull();
    const grips = [
      ...document.querySelectorAll<HTMLButtonElement>(
        "header > .CharcellSortableList__grip",
      ),
    ];
    expect(grips).toHaveLength(2);
    expect(grips[0].getAttribute("aria-label")).toBe("reorder alpha");
    expect(grips[0].type).toBe("button");
    await click(grips[0]);
    expect(
      document.querySelector("header > .CharcellSortableList__grip")!.className,
    ).toContain("CharcellSortableList__grip--engaged");
    await click(
      document.querySelectorAll("header > .CharcellSortableList__grip")[1],
    );
    expect(onItemsChange).toHaveBeenLastCalledWith(["beta", "alpha"]);
  });
});
