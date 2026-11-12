// kit-wide conventions, held against the compiled stylesheets. Each
// invariant that tolerates exceptions keeps an exact ledger: a new exception
// fails, and so does a stale one, so the ledger is always the true list.
// Run after `pnpm build`.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import postcss, {
  type AtRule,
  type Declaration,
  type Root,
  type Rule,
} from "postcss";
import selectorParser from "postcss-selector-parser";
import { describe, expect, test } from "vitest";

const DIST = resolve(__dirname, "../dist");
// The order the scaffolder writes from the kit's `stylingLayer.order`.
const LAYER_ORDER = readFileSync(
  resolve(DIST, "react/_layer-order.scss"),
  "utf8",
).trim();

const ENTRIES = {
  components: "charcell.css",
  base: "charcell.base.css",
  preflight: "charcell.preflight.css",
  full: "charcell.full.css",
} as const;

const read = (path: string) => readFileSync(resolve(DIST, path), "utf8");
const parse = (path: string) => postcss.parse(read(path));

// Every compiled sheet charcell ships: the four entries plus each component
// sheet a linked face imports, on every module target. Followed from the
// imports rather than globbed, so the list is whatever the faces really load.
const linkedSheets = [
  ...new Set(
    ["react", "vue", "svelte"].flatMap((target) => {
      const directory = resolve(DIST, target, "linked");
      return readdirSync(directory)
        .filter((file) => file.endsWith(".ts"))
        .flatMap((file) =>
          [
            ...readFileSync(resolve(directory, file), "utf8").matchAll(
              /import '([^']+\.css)';/g,
            ),
          ].map((match) => relative(DIST, resolve(directory, match[1]))),
        );
    }),
  ),
].sort();
const allSheets = [...Object.values(ENTRIES), ...linkedSheets];

// The enclosing `@layer` of a node, or undefined when it sits outside every
// layer block.
function layerOf(node: Rule | AtRule): string | undefined {
  let parent = node.parent;
  while (parent && parent.type !== "root") {
    if (parent.type === "atrule" && (parent as AtRule).name === "layer")
      return (parent as AtRule).params;
    parent = parent.parent;
  }
  return undefined;
}

// Whether a rule is a keyframe (`from`, `to`) rather than a style rule.
const inKeyframes = (rule: Rule) =>
  rule.parent?.type === "atrule" &&
  (rule.parent as AtRule).name === "keyframes";

// Every style rule in the components layer of the components entry.
function componentRules(): Rule[] {
  const rules: Rule[] = [];
  parse(ENTRIES.components).walkRules((rule) => {
    if (layerOf(rule) === "charcell.components" && !inKeyframes(rule))
      rules.push(rule);
  });
  return rules;
}

// A rule's identity for the partition check: its layer, its at-rule context
// and its full text.
function ruleIdentities(root: Root): string[] {
  const identities: string[] = [];
  root.walkRules((rule) => {
    const context: string[] = [];
    let parent = rule.parent;
    while (parent && parent.type !== "root") {
      if (parent.type === "atrule")
        context.unshift(
          `@${(parent as AtRule).name} ${(parent as AtRule).params}`,
        );
      parent = parent.parent;
    }
    identities.push(`${context.join(" ")} ${rule.toString()}`);
  });
  root.walkAtRules("font-face", (rule) => {
    identities.push(`${layerOf(rule)} ${rule.toString()}`);
  });
  return identities;
}

describe("the layers", () => {
  test("every linked face links compiled sheets", () => {
    // One compiled sheet per styled component (every component that emits one);
    // the build's `_index.scss` partial gathers them and is not one.
    const styled = readdirSync(resolve(DIST, "react")).filter(
      (file) => file.endsWith(".scss") && !file.startsWith("_"),
    );
    expect(linkedSheets).toHaveLength(styled.length);
  });

  test.each(allSheets)("%s states the layer order first", (sheet) => {
    expect(read(sheet).startsWith(LAYER_ORDER)).toBe(true);
    expect(read(sheet).split(LAYER_ORDER)).toHaveLength(2);
  });

  test.each(allSheets)("%s emits nothing outside a layer", (sheet) => {
    const outside: string[] = [];
    parse(sheet).walkRules((rule) => {
      if (!layerOf(rule)) outside.push(rule.selector);
    });
    parse(sheet).walkAtRules("font-face", (rule) => {
      if (!layerOf(rule)) outside.push("@font-face");
    });
    expect(outside).toEqual([]);
  });

  test.each(linkedSheets)("%s sits in charcell.components", (sheet) => {
    const layers = new Set<string>();
    parse(sheet).walkRules((rule) => {
      layers.add(layerOf(rule) ?? "none");
    });
    expect([...layers]).toEqual(["charcell.components"]);
  });

  test("no sheet carries !important", () => {
    // Important declarations reverse layer order: one in the reset would
    // outrank a consumer's own unlayered !Important.
    expect(
      allSheets.filter((sheet) => read(sheet).includes("!important")),
    ).toEqual([]);
  });
});

describe("the entries", () => {
  test("base, preflight and components partition full, with no overlap", () => {
    const full = new Set(ruleIdentities(parse(ENTRIES.full)));
    const components = ruleIdentities(parse(ENTRIES.components));
    const preflight = ruleIdentities(parse(ENTRIES.preflight));
    const union = new Set([...components, ...preflight]);

    expect([...full].filter((rule) => !union.has(rule))).toEqual([]);
    expect([...union].filter((rule) => !full.has(rule))).toEqual([]);
    expect(components.filter((rule) => preflight.includes(rule))).toEqual([]);
  });

  test("base is the head of the components entry", () => {
    expect(
      read(ENTRIES.components).startsWith(read(ENTRIES.base).trimEnd()),
    ).toBe(true);
  });

  test("the components entry paints nothing through a bare element selector", () => {
    // The promise of `charcell/css`: it cannot restyle a host's own markup.
    // Custom properties on `:root` paint nothing, and the mode blocks apply
    // only where a consumer stamped the attribute.
    const guarded = (selector: string) =>
      selector.includes(".Charcell") ||
      selector === ":root" ||
      selector.startsWith("[data-charcell-mode=");
    const unguarded: string[] = [];
    parse(ENTRIES.components).walkRules((rule) => {
      if (inKeyframes(rule)) return;
      for (const selector of rule.selectors)
        if (!guarded(selector.trim())) unguarded.push(selector);
    });
    expect(unguarded).toEqual([]);
  });

  test("the preflight carries no literal color", () => {
    // Every value is a token reference, so one preflight serves both modes.
    expect(read(ENTRIES.preflight)).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i,
    );
  });
});

describe("the components", () => {
  test("no transition or animation anywhere, but those the scroll drives", () => {
    // The terminal look is binary state. The one motion is the scroll's own:
    // an animation bound to a scroll timeline in the same rule moves only as
    // the reader scrolls (the ScrollArea's stepped painting), and its
    // keyframes are those such a rule names.
    const moving: string[] = [];
    for (const sheet of allSheets) {
      const root = parse(sheet);
      const driven = new Set<string>();
      root.walkRules((rule) => {
        const timeline = rule.nodes.find(
          (node) => node.type === "decl" && node.prop === "animation-timeline",
        ) as Declaration | undefined;
        const scrolled =
          timeline !== undefined &&
          timeline.value
            .split(",")
            .every((name) =>
              name.trim().startsWith("--charcell-scroll-area--"),
            );
        for (const node of rule.nodes) {
          if (
            node.type !== "decl" ||
            !/^(transition|animation)/.test(node.prop)
          )
            continue;
          if (scrolled && node.prop.startsWith("animation")) {
            for (const name of node.value.matchAll(/charcell-[a-z-]+/g))
              driven.add(name[0]);
            continue;
          }
          moving.push(`${sheet}: ${rule.selector} { ${node.prop} }`);
        }
      });
      root.walkAtRules("keyframes", (rule) => {
        if (!driven.has(rule.params))
          moving.push(`${sheet}: @keyframes ${rule.params}`);
      });
    }
    expect(moving).toEqual([]);
  });

  test("bare :focus appears only on text-entry controls", () => {
    // Keyboard focus is `:focus-visible`; a text field shows focus from any
    // input source, so it alone may use `:focus`.
    const textEntry = ["CharcellTextInput", "CharcellTextarea"];
    const bare: string[] = [];
    for (const rule of componentRules()) {
      for (const selector of rule.selectors) {
        if (!/:focus(?![-\w])/.test(selector)) continue;
        if (!textEntry.some((block) => selector.startsWith(`.${block}`)))
          bare.push(selector);
      }
    }
    expect(bare).toEqual([]);
  });

  test("component colors are tokens or system colors, never literals", () => {
    const literal: string[] = [];
    for (const rule of componentRules()) {
      rule.walkDecls((declaration) => {
        // `transparent` is no color choice; Sass compiles it to rgba(0,0,0,0).
        const value = declaration.value.replaceAll(
          "rgba(0,0,0,0)",
          "transparent",
        );
        if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(value)) {
          literal.push(`${rule.selector} { ${declaration.toString()} }`);
        }
      });
    }
    expect(literal).toEqual([]);
  });

  test("outline is removed only where a focus cue replaces it", () => {
    // `outline: none` without a replacement strips the focus indicator. Each
    // removal either is in a block that draws the focus pointer (`focusable`
    // beside `pointer`) or is a part whose cue is a fill or a stroke, ledgered
    // here by selector with the cue.
    const replacedByFillOrStroke: Record<string, string> = {
      ".CharcellTextInput--boxed:where(:not(.CharcellTextInput--dense))":
        "the ring climbs to the foreground on focus",
      ".CharcellTextarea--boxed:where(:not(.CharcellTextarea--dense))":
        "the ring climbs to the foreground on focus",
      ".CharcellTextInput--dense": "the dense field inverts on focus",
      ".CharcellTextarea--dense": "the dense field inverts on focus",
      ".CharcellScrollArea__columns":
        "a menu or listbox focused here keeps its cue on the highlighted item",
      ".CharcellSplitter__handle": "the column fills solid on focus",
      ".CharcellSplitGrid__handle": "its whole length fills solid on focus",
      ".CharcellScrollArea:where(:not(.CharcellScrollArea--scrollbar-hidden,.CharcellScrollArea--scrollbar-native))>.CharcellScrollArea__viewport":
        "drawn in cells, the scrollbar's thumb climbs to the foreground on focus",
      ".CharcellSortableList__grip": "the grip fills mid on focus",
      ".CharcellPopoverPanel":
        "the panel takes focus only when nothing in it can, and its foreground ring already marks it open",
      ".CharcellComboboxField__input":
        "the field's ring climbs to the foreground (the dense strip inverts) while the reader types in it",
      ":where(.CharcellRichText) a":
        "a link in running text has no cell for the pointer: its dotted underline turns solid",
    };
    const block = (selector: string) =>
      /\.Charcell[A-Za-z]+/.exec(selector)?.[0];
    const rules = componentRules();
    const pointing = new Set(
      rules
        .filter((rule) =>
          rule.nodes.some(
            (node) =>
              node.type === "decl" &&
              node.prop === "content" &&
              node.value.includes("--charcell-pointer--resolved"),
          ),
        )
        .flatMap((rule) => rule.selectors.map(block)),
    );
    const unreplaced: string[] = [];
    for (const rule of rules) {
      const removes = rule.nodes.some(
        (node) =>
          node.type === "decl" &&
          node.prop === "outline" &&
          node.value === "none",
      );
      if (!removes) continue;
      unreplaced.push(
        ...rule.selectors.filter(
          (selector) =>
            selector in replacedByFillOrStroke ||
            !pointing.has(block(selector)),
        ),
      );
    }
    expect(unreplaced.sort()).toEqual(
      Object.keys(replacedByFillOrStroke).sort(),
    );
  });

  test("a block gives its display up to the hidden attribute", () => {
    // The browser's `[hidden] { display: none }` sits below every layer, so a
    // block root's display holds only where it is not hidden (`displayed`).
    const unguarded = componentRules()
      .filter((rule) =>
        rule.nodes.some(
          (node) =>
            node.type === "decl" &&
            node.prop === "display" &&
            node.value !== "none",
        ),
      )
      .flatMap((rule) =>
        rule.selectors.filter((selector) =>
          /^\.Charcell[A-Za-z]+$/.test(selector),
        ),
      );
    expect(unguarded).toEqual([]);
  });

  test("a block reaches its own elements by a child path, never as any descendant", () => {
    // `.CharcellFrame--flush .CharcellFrame__body` would also reach the body
    // of a frame nested inside, which carries its own modifiers. Between a
    // block (or its modifier) and an element of the same block, every step is
    // a child or sibling combinator.
    const leaks: string[] = [];
    const elementsOf = (compound: selectorParser.Node[]) =>
      compound.flatMap((node) => {
        if (node.type === "class") return [node.value];
        if (node.type !== "pseudo" || node.value !== ":is") return [];
        const classes: string[] = [];
        node.walkClasses((inner) => {
          classes.push(inner.value);
        });
        return classes;
      });
    for (const rule of componentRules()) {
      selectorParser((root) => {
        root.each((selector) => {
          // Each block met so far, and whether a descendant step has passed
          // since.
          const blocks = new Map<string, boolean>();
          let compound: selectorParser.Node[] = [];
          const close = () => {
            for (const name of elementsOf(compound)) {
              const block = /^(Charcell[A-Za-z]+)__/.exec(name)?.[1];
              if (block && blocks.get(block)) leaks.push(selector.toString());
            }
            for (const node of compound) {
              const block =
                node.type === "class" &&
                /^(Charcell[A-Za-z]+)(--.*)?$/.exec(node.value)?.[1];
              if (block) blocks.set(block, false);
            }
            compound = [];
          };
          selector.each((node) => {
            if (node.type !== "combinator") {
              compound.push(node);
              return;
            }
            close();
            if (node.value.trim() === "")
              for (const block of blocks.keys()) blocks.set(block, true);
          });
          close();
        });
      }).processSync(rule.selector);
    }
    expect([...new Set(leaks)]).toEqual([]);
  });

  test("no component restates what the reset gives every element", () => {
    // The components expect the reset underneath. Its universal rule
    // gives every element these values, so a component declaring one again
    // repeats it; a zeroed longhand of a zeroed shorthand counts too.
    const universal = new Map<string, string>();
    parse(ENTRIES.preflight).walkRules((rule) => {
      if (layerOf(rule) === "charcell.reset" && rule.selector.startsWith("*"))
        rule.walkDecls((declaration) => {
          universal.set(declaration.prop, declaration.value);
        });
    });
    const equivalent = (property: string, value: string) => {
      const shorthand = /^(margin|padding)-(inline|block)(-start|-end)?$/.exec(
        property,
      )?.[1];
      const reset = universal.get(shorthand ?? property);
      if (reset === undefined) return false;
      if (value === reset) return true;
      if (property === "border")
        return ["0", "none", "0 solid"].includes(value);
      if (property === "background") return value === "transparent";
      return reset === "0" && /^0(px)?$/.test(value);
    };
    // Where the reset's own element rules give these elements another value,
    // so the declaration is an override, not a repeat: an accordion summary
    // drops the disclosure marker the reset gives `summary`, and a
    // panel the `margin: auto` it gives an open popover.
    const OVERRIDES = new Set([
      ".CharcellAccordionItem__summary { list-style: none }",
      ".CharcellPopoverPanel { margin-block: 0 }",
    ]);
    const found = new Set<string>();
    for (const rule of componentRules())
      rule.walkDecls((declaration) => {
        if (declaration.parent !== rule) return;
        if (equivalent(declaration.prop, declaration.value))
          found.add(
            `${rule.selector} { ${declaration.prop}: ${declaration.value} }`,
          );
      });
    expect([...found].filter((entry) => !OVERRIDES.has(entry))).toEqual([]);
    expect([...OVERRIDES].filter((entry) => !found.has(entry))).toEqual([]);
  });
});

// Each property is declared once, an invariant in two halves. A state
// (hover, active, focus, disabled, checked, and the forced-colors band) only
// assigns the slots the resting rules read. An authored modifier states its
// declarations under its own condition, so no two rules that can match the same
// element declare the same property, the slots included, and neither weight nor
// order decides anything.
describe("each property is declared once", () => {
  const STATE = new Set([
    ":hover",
    ":active",
    ":focus",
    ":focus-visible",
    ":focus-within",
    ":disabled",
    ":checked",
  ]);

  interface Condition {
    selector: string;
    // The element the rule paints: its BEM base classes and pseudo-element.
    subject: string;
    // The element types it can paint (`h1`, or each of `:where(h1, h2)`), or
    // undefined for any: rich text styles elements, not classes, and two rules
    // for different elements cannot meet.
    tags?: Set<string>;
    // What must hold for the rule to match, and what must not.
    holds: Set<string>;
    fails: Set<string>;
    state: boolean;
    properties: string[];
  }

  // The atoms a compound contributes: its modifiers, attributes and
  // pseudo-classes; a `:where()` or `:is()` contributes its contents, a
  // `:not()` contributes each of its selectors as a failing atom. A negated
  // descendant (`:not(.A *)`) is the ancestor condition `ancestor .A`.
  function atoms(
    nodes: selectorParser.Node[],
    holds: Set<string>,
    fails: Set<string>,
    ancestor: boolean,
  ) {
    for (const node of nodes) {
      if (node.type === "class") {
        if (node.value.includes("--")) holds.add(`.${node.value}`);
        else if (ancestor) holds.add(`ancestor .${node.value}`);
      } else if (node.type === "attribute") {
        holds.add(node.toString().trim());
      } else if (node.type === "pseudo" && !node.value.startsWith("::")) {
        if (node.value === ":where" || node.value === ":is") {
          for (const inner of node.nodes)
            atoms(inner.nodes, holds, fails, ancestor);
        } else if (node.value === ":not") {
          for (const inner of node.nodes) {
            const combinator = inner.nodes.findIndex(
              (part) => part.type === "combinator",
            );
            const text =
              combinator === -1
                ? inner.toString().trim()
                : `ancestor ${inner.nodes.slice(0, combinator).join("").trim()}`;
            fails.add(text);
          }
        } else {
          holds.add(node.toString().trim());
        }
      }
    }
  }

  function conditions(): Condition[] {
    const out: Condition[] = [];
    const parser = selectorParser();
    for (const rule of componentRules()) {
      const properties = rule.nodes
        .filter((node): node is Declaration => node.type === "decl")
        .map((declaration) => declaration.prop);
      const media: string[] = [];
      for (
        let parent = rule.parent;
        parent && parent.type !== "root";
        parent = parent.parent
      ) {
        if (parent.type === "atrule" && (parent as AtRule).name === "media")
          media.push((parent as AtRule).params);
      }
      for (const selector of rule.selectors) {
        const [parsed] = parser.astSync(selector).nodes;
        const lastCombinator = parsed.nodes
          .map((node) => node.type)
          .lastIndexOf("combinator");
        const subjectNodes = parsed.nodes.slice(lastCombinator + 1);
        const holds = new Set<string>();
        const fails = new Set<string>();
        atoms(parsed.nodes.slice(0, lastCombinator + 1), holds, fails, true);
        atoms(subjectNodes, holds, fails, false);
        const classes = subjectNodes
          .filter((node) => node.type === "class")
          .map((node) => node.value.split("--")[0]);
        const pseudoElement = subjectNodes.find(
          (node) => node.type === "pseudo" && node.value.startsWith("::"),
        );
        const universal = subjectNodes.some(
          (node) => node.type === "universal",
        );
        const subject = `${universal ? "*" : [...new Set(classes)].sort().join("")}${pseudoElement?.value ?? ""}`;
        const tags = (() => {
          const direct = subjectNodes
            .filter((node) => node.type === "tag")
            .map((node) => node.value);
          if (direct.length) return new Set(direct);
          const list = subjectNodes.find(
            (node) =>
              node.type === "pseudo" &&
              (node.value === ":where" || node.value === ":is"),
          ) as
            | { nodes: { nodes: { type: string; value?: string }[] }[] }
            | undefined;
          const names = list?.nodes.map((inner) =>
            inner.nodes.length === 1 && inner.nodes[0].type === "tag"
              ? inner.nodes[0].value
              : undefined,
          );
          return names && names.every(Boolean)
            ? new Set(names as string[])
            : undefined;
        })();
        for (const condition of media) holds.add(`@media ${condition}`);
        const state =
          media.length > 0 ||
          [...holds].some(
            (atom) =>
              STATE.has(atom.replace(/\(.*$/, "")) ||
              /:checked|:disabled|:focus|:active/.test(atom),
          );
        out.push({ selector, subject, tags, holds, fails, state, properties });
      }
    }
    return out;
  }

  test("a state assigns slots and declares no property", () => {
    const declaring = conditions()
      .filter((condition) => condition.state)
      .flatMap((condition) =>
        condition.properties
          .filter((property) => !property.startsWith("--"))
          .map((property) => `${condition.selector} { ${property} }`),
      );
    expect(declaring).toEqual([]);
  });

  test("no rule declares a property twice", () => {
    const twice: string[] = [];
    for (const rule of componentRules()) {
      const seen = new Set<string>();
      for (const node of rule.nodes) {
        if (node.type !== "decl") continue;
        if (seen.has(node.prop))
          twice.push(`${rule.selector} { ${node.prop} }`);
        seen.add(node.prop);
      }
    }
    expect(twice).toEqual([]);
  });

  test("no two resting rules that can match one element declare the same property", () => {
    const resting = conditions().filter((condition) => !condition.state);
    const exclusive = (first: Condition, second: Condition) =>
      [...first.holds].some((atom) => second.fails.has(atom)) ||
      [...second.holds].some((atom) => first.fails.has(atom)) ||
      (first.tags !== undefined &&
        second.tags !== undefined &&
        ![...first.tags].some((tag) => second.tags!.has(tag)));
    const overlaps: string[] = [];
    resting.forEach((first, index) => {
      for (const second of resting.slice(index + 1)) {
        if (first.subject !== second.subject || exclusive(first, second))
          continue;
        // A shorthand covers its longhands: `border` and `border-top-width`
        // set the same thing.
        const covers = (one: string, other: string) =>
          one === other ||
          (!one.startsWith("--") && other.startsWith(`${one}-`));
        const shared = first.properties.filter((property) =>
          second.properties.some(
            (other) => covers(property, other) || covers(other, property),
          ),
        );
        if (shared.length)
          overlaps.push(
            `${first.selector} / ${second.selector}: ${shared.join(", ")}`,
          );
      }
    });
    expect(overlaps).toEqual([]);
  });
});

// A React module that hands a function to a client driver is a client module
// itself; a declarative visual stays a server component.
describe("React client boundaries", () => {
  const react = resolve(DIST, "react");
  const modules = readdirSync(react).filter((file) => file.endsWith(".tsx"));
  // Either quote: the directive and the import are read as text, and the
  // formatter writes double quotes.
  const client = (file: string) =>
    /^["']use client["']/.test(readFileSync(resolve(react, file), "utf8"));
  const composesDriver = (file: string) =>
    /from ["']\.\/[A-Za-z]+Driver["']/.test(
      readFileSync(resolve(react, file), "utf8"),
    );
  // A hand-written driver: copied from `src/drivers/react`, named for its role
  // (`SelectDriver`) or, when it composes the visuals itself, for the control.
  const driver = (file: string) =>
    existsSync(resolve("src/drivers/react", file));

  // A server component can't give an element a function of its own; one that
  // only passes on its consumer's handler stays declarative.
  const setsHandler = (file: string) =>
    /\son[A-Z][A-Za-z]*=\{(?!on[A-Z])/.test(
      readFileSync(resolve(react, file), "utf8"),
    );
  const needsClient = (file: string) =>
    driver(file) || composesDriver(file) || setsHandler(file);

  test("every driver, compound composing one and component setting a handler is a client module", () => {
    const missing = modules.filter(
      (file) => needsClient(file) && !client(file),
    );
    expect(missing).toEqual([]);
  });

  test("no purely declarative Visual is marked client", () => {
    const marked = modules.filter((file) => !needsClient(file) && client(file));
    expect(marked).toEqual([]);
  });
});
