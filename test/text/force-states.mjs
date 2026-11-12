// Forced states: a copy of every rule a pointer or keyboard state selects,
// under a class instead, so a static page can show the state. `.force-hover`
// stands for `:hover`, `.force-active` for `:active`, `.force-focus` for
// `:focus-visible` and `.force-indeterminate` for a checkbox's
// `:indeterminate`, which no attribute can set. Each copy keeps its place in the cascade: it sits in the
// same layer, right after the rule it copies. The comparison page and the docs
// site both show their cases through it.
import postcss from "postcss";

const STATES = [
  [/:hover/g, ".force-hover"],
  [/:active/g, ".force-active"],
  [/:focus-visible/g, ".force-focus"],
  [/:indeterminate/g, ".force-indeterminate"],
];

const selects = (selector) =>
  STATES.some(([state]) => new RegExp(state.source).test(selector));
const forced = (selector) =>
  STATES.reduce(
    (text, [state, replacement]) => text.replace(state, replacement),
    selector,
  );

/**
 * The stylesheet with every state rule followed by its forced copy.
 * @param {string} css - a compiled charcell stylesheet.
 * @returns {string} The stylesheet with the copies added.
 */
export function withForcedStates(css) {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (selects(rule.selector))
      rule.after(rule.clone({ selector: forced(rule.selector) }));
  });
  return root.toString();
}

/**
 * Only the forced copies, each wrapped in the at-rules (layers, media queries)
 * its original sits in, for a page that already loads the stylesheet itself.
 * @param {string} css - a compiled charcell stylesheet.
 * @returns {string} The forced copies alone.
 */
export function forcedStatesOnly(css) {
  const out = postcss.root();
  const source = postcss.parse(css);
  // The layer order comes first, as in the stylesheet itself, so the copies
  // cannot set it however the page orders its stylesheets.
  source.each((node) => {
    if (node.type === "atrule" && node.name === "layer" && !node.nodes)
      out.append(node.clone());
  });
  source.walkRules((rule) => {
    if (!selects(rule.selector)) return;
    let copy = rule.clone({ selector: forced(rule.selector) });
    for (
      let parent = rule.parent;
      parent && parent.type === "atrule";
      parent = parent.parent
    ) {
      copy = parent.clone({ nodes: [] }).append(copy);
    }
    out.append(copy);
  });
  return out.toString();
}
