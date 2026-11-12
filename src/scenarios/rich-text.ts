import type { ComponentScenarios } from "./types";

const html = [
  "<h2>the souvenir stand</h2>",
  '<p>every <strong>derby</strong> night the stand sells <em>official</em> smash-a-torium loot, priced in <code>loot.txt</code>. the <a href="#stock">stock</a> is short again: <s>bunnies</s> stolen.</p>',
  '<h3 id="stock">stock</h3>',
  "<ul><li>we got yer hats and yer pennants</li><li>we watch the <mark>till</mark> whenever the polecats come by</li></ul>",
  "<ol><li>restock the bunny value-pack</li><li>change the derby car's batteries</li></ol>",
  "<blockquote><p>i'm practically givin' this loot away! what's a couple of bucks in exchange for a timeless memento?</p></blockquote>",
  "<pre><code>hats: plenty\nbunnies: gone</code></pre>",
  "<hr />",
  "<table><thead><tr><th>item</th><th>count</th></tr></thead><tbody><tr><td>pennant</td><td>300</td></tr><tr><td>bunny</td><td>0</td></tr></tbody></table>",
].join("");

// The running text, as HTML, in an element that leaves the layout to it.
export default {
  children: {
    tag: "div",
    props: { innerHTML: html, style: "display: contents" },
  },
  columns: 40,
  scenarios: [],
} satisfies ComponentScenarios;
