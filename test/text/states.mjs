// The interaction states a rendered component can show, read from the
// stylesheet: every rule that selects `:hover`, `:active` or `:focus-visible`
// names the element it styles, and each such element in the markup is a state
// to force (`force-states.mjs` turns the classes back into the states). A
// state inside `:not()` is the absence of one, and is not offered.
import postcss from "postcss";
import parser from "postcss-selector-parser";
import { JSDOM } from "jsdom";

// A state, and the classes that force it: a press is a hovered element held down.
const STATES = {
  ":hover": { name: "hover", classes: ["force-hover"] },
  ":active": { name: "press", classes: ["force-hover", "force-active"] },
  ":focus-visible": { name: "focus", classes: ["force-focus"] },
};
const ORDER = ["hover", "press", "focus"];

/**
 * The element each state rule styles, as a selector the markup can be searched
 * with: the rule's selector up to the compound the state sits on, without the
 * state itself or a pseudo-element.
 * @param {string} css - a compiled charcell stylesheet.
 * @returns {{ state: string, selector: string }[]}
 */
export function stateTargets(css) {
  const targets = new Map();
  postcss.parse(css).walkRules((rule) => {
    parser((selectors) => {
      selectors.walkPseudos((pseudo) => {
        const state = STATES[pseudo.value];
        if (!state) return;
        for (let parent = pseudo.parent; parent; parent = parent.parent) {
          if (parent.type === "pseudo" && parent.value === ":not") return;
        }
        const selector = pseudo.parent;
        const nodes = selector.nodes;
        let end = nodes.indexOf(pseudo);
        while (end + 1 < nodes.length && nodes[end + 1].type !== "combinator")
          end++;
        const target = parser.selector({ value: "" });
        for (const node of nodes.slice(0, end + 1)) target.append(node.clone());
        target.walkPseudos((each) => {
          if (STATES[each.value] && !insideNot(each)) each.remove();
          else if (each.value.startsWith("::")) each.remove();
        });
        const text = target.toString().trim();
        if (text)
          targets.set(`${state.name} ${text}`, {
            state: state.name,
            selector: text,
          });
      });
    }).processSync(rule.selector);
  });
  return [...targets.values()];
}

const insideNot = (node) => {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === "pseudo" && parent.value === ":not") return true;
  }
  return false;
};

// What kind of element a state lands on: its first charcell class without the
// modifier (or its tag), and that class's modifiers. A selected tab is
// another kind than a plain one.
const kindOf = (element) => {
  const base =
    [...element.classList]
      .find((name) => name.startsWith("Charcell"))
      ?.replace(/--.*$/, "") ?? element.tagName.toLowerCase();
  const modifiers = [...element.classList]
    .filter((name) => name.startsWith(`${base}--`))
    .map((name) => name.slice(base.length + 2))
    .sort();
  return { base, modifiers, key: [base, ...modifiers].join("--") };
};

// The part of a state's name an element's class gives, beside the component's
// own block: `CharcellTreeGroup__summary` is `summary`, `CharcellTreeItem` is
// `tree-item`.
const partOf = (base, block) => {
  if (base === block) return "";
  if (base.includes("__"))
    return base
      .split("__")[1]
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase();
  return base
    .replace(/^Charcell/, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
};

// A state's name on each kind it lands on: the state alone on one kind; on
// several, the element's part where the kinds differ in it, and the
// modifiers that set one apart from the others of its element.
const namesOf = (state, kinds, block) => {
  const bases = new Set(kinds.map((kind) => kind.base));
  return kinds.map((kind) => {
    const same = kinds.filter((other) => other.base === kind.base);
    const shared = kind.modifiers.filter((modifier) =>
      same.every((other) => other.modifiers.includes(modifier)),
    );
    const parts = [
      bases.size > 1 ? partOf(kind.base, block) : "",
      ...(same.length > 1
        ? kind.modifiers.filter((modifier) => !shared.includes(modifier))
        : []),
      state,
    ];
    return parts.filter(Boolean).join("-");
  });
};

/**
 * Forces states no markup can carry: each selector's first element takes the state.
 * @param {string} html - rendered markup.
 * @param {Record<string, string>} forced - a state per selector.
 * @returns {string}
 */
export function forceProperties(html, forced) {
  const dom = JSDOM.fragment(`<div>${html}</div>`);
  const root = dom.firstChild;
  for (const [selector, state] of Object.entries(forced)) {
    const element = root.querySelector(selector);
    if (!element)
      throw new Error(
        `nothing in the markup for ${selector} to force ${state} on`,
      );
    element.classList.add(`force-${state}`);
  }
  return root.innerHTML;
}

/**
 * The states a rendered component shows, each with its markup: per state, the
 * first element of each kind a state rule styles, a disabled one never focused
 * or pressed. A state on one kind of element is named for the state alone
 * (`hover`); on several, for what sets each apart (`summary-hover`,
 * `tree-item-current-hover`).
 * @param {string} html - the component's rendered markup.
 * @param {{ state: string, selector: string }[]} targets - from `stateTargets`.
 * @param {string} block - the component's own block, such as `CharcellTree`.
 * @returns {{ state: string, markup: string }[]}
 */
export function statesOf(html, targets, block) {
  const parse = () => JSDOM.fragment(`<div>${html}</div>`).firstChild;
  const root = parse();
  const all = [...root.querySelectorAll("*")];
  const found = new Map();
  for (const { state, selector } of targets) {
    let matches;
    try {
      matches = new Set(root.querySelectorAll(selector));
    } catch {
      continue;
    }
    // A disabled control takes no focus and no press.
    const first = all.find(
      (element) =>
        matches.has(element) &&
        (state === "hover" || !element.matches(":disabled")),
    );
    if (!first) continue;
    const byKind = found.get(state) ?? new Map();
    const kind = kindOf(first);
    const index = all.indexOf(first);
    if (!byKind.has(kind.key) || index < byKind.get(kind.key).index)
      byKind.set(kind.key, { kind, index });
    found.set(state, byKind);
  }
  const out = [];
  for (const state of ORDER) {
    const byKind = found.get(state);
    if (!byKind) continue;
    const entries = [...byKind.values()].sort((a, b) => a.index - b.index);
    const names = namesOf(
      state,
      entries.map((entry) => entry.kind),
      block,
    );
    entries.forEach(({ index }, position) => {
      const copy = parse();
      copy
        .querySelectorAll("*")
        [index].classList.add(
          ...Object.values(STATES).find((each) => each.name === state).classes,
        );
      out.push({ state: names[position], markup: copy.innerHTML });
    });
  }
  return out;
}
