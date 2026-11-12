// Every comparison case's rendered side: the charcell component, in the state
// its text version describes, keyed by the case's id in `cases.cjs`. The
// comparison page (`build-compare.tsx`) and the docs site both render these.
// A state no prop reaches carries a `force-*` class, which `force-states.mjs`
// turns into the state.
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Button,
  Frame,
  Separator,
  Table,
  Tree,
  TreeGroup,
  TreeItem,
} from "../../dist/react/unlinked/index";

const COLUMNS = [
  { key: "rider", label: "rider" },
  { key: "weapon", label: "weapon" },
  { key: "hits", label: "hits", align: "end" as const },
];
const RECORDS = [
  { rider: "a vulture", weapon: "chain", hits: "4" },
  { rider: "a vulture", weapon: "chainsaw", hits: "1" },
  { rider: "a rottwheeler", weapon: "mace", hits: "4" },
];
const sized = (width: string, element: ReactElement) => (
  <div style={{ width }}>{element}</div>
);
const shrink = (element: ReactElement) => (
  <div style={{ display: "inline-block" }}>{element}</div>
);

export function caseElements(glyphs: string[]): Record<string, ReactElement> {
  return {
    "button-expanded": <Button label="turret" aria-expanded="true" />,
    ligatures: <Button label="office file -> <-> fly" variant="dense" />,
    frame: (
      <Frame title="polecats" style={{ width: "20ch" }}>
        on highway 9
      </Frame>
    ),
    "frame-active-double": (
      <Frame
        title="vultures"
        active
        borderEnd="double"
        borderBottom="double"
        style={{ width: "20ch" }}
      >
        on highway 9
      </Frame>
    ),
    "frame-heavy": (
      <Frame
        title="polecats"
        borderEnd="heavy"
        borderBottom="heavy"
        style={{ width: "20ch" }}
      >
        on highway 9
      </Frame>
    ),
    "frame-rounded": (
      <Frame title="polecats" border="rounded" style={{ width: "20ch" }}>
        on highway 9
      </Frame>
    ),
    "frame-heavy-all": (
      <Frame title="polecats" border="heavy" style={{ width: "20ch" }}>
        on highway 9
      </Frame>
    ),
    "frame-double": (
      <Frame title="polecats" border="double" style={{ width: "20ch" }}>
        on highway 9
      </Frame>
    ),
    "frame-apart": (
      <Frame
        title="polecats"
        borderY="heavy"
        borderX="double"
        style={{ width: "20ch" }}
      >
        on highway 9
      </Frame>
    ),
    "frame-double-single": (
      <Frame title="polecats" borderY="double" style={{ width: "20ch" }}>
        on highway 9
      </Frame>
    ),
    "frame-open": (
      <Frame title="polecats" borderTop="none" style={{ width: "20ch" }}>
        on highway 9
      </Frame>
    ),
    "frame-quiet": (
      <Frame title="cavefish" quiet style={{ width: "20ch" }}>
        on highway 9
      </Frame>
    ),
    table: <Table columns={COLUMNS} rows={RECORDS} />,
    "table-rows": <Table columns={COLUMNS} rows={RECORDS} separators="rows" />,
    "table-columns": (
      <Table columns={COLUMNS} rows={RECORDS} separators="columns" />
    ),
    "table-none": <Table columns={COLUMNS} rows={RECORDS} separators="none" />,
    "table-double": (
      <Table
        columns={COLUMNS}
        rows={RECORDS}
        borderEnd="double"
        borderBottom="double"
      />
    ),
    "table-heavy": (
      <Table
        columns={COLUMNS}
        rows={RECORDS}
        borderEnd="heavy"
        borderBottom="heavy"
      />
    ),
    "table-dense": <Table columns={COLUMNS} rows={RECORDS} variant="dense" />,
    separator: sized("20ch", <Separator />),
    "separator-double": sized("20ch", <Separator border="double" />),
    "separator-inset": sized("20ch", <Separator inset />),
    tree: shrink(
      <Tree style={{ width: "20ch" }}>
        <TreeGroup label="highway 9" root>
          <TreeItem label="kickstand" />
          <TreeItem label="melonweed" current />
          <TreeGroup label="the gorge">
            <TreeItem label="tourist stop" />
            <TreeItem label="ricky's ramp" />
          </TreeGroup>
          <TreeItem label="corley motors" />
        </TreeGroup>
      </Tree>,
    ),
    "tree-fixed": shrink(
      <Tree style={{ width: "20ch" }}>
        <TreeGroup
          label="highway 9"
          root
          collapsible={false}
          className="force-hover-summary"
        >
          <TreeItem label="kickstand" />
          <TreeItem label="melonweed" current />
          <TreeItem label="corley motors" />
        </TreeGroup>
      </Tree>,
    ),
    // The face itself, no component: the same lines, typed.
    glyphs: (
      <pre
        style={{
          margin: 0,
          fontFamily: "var(--charcell-font-family)",
          fontSize: "var(--charcell-font-size)",
          lineHeight: "var(--charcell-row)",
          fontVariantLigatures: "none",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {glyphs.join("\n")}
      </pre>
    ),
    "tree-hover": shrink(
      <Tree style={{ width: "20ch" }}>
        <TreeGroup label="highway 9" root>
          <TreeItem label="kickstand" />
          <TreeGroup
            label="the gorge"
            defaultOpen={false}
            className="force-hover-summary"
          >
            <TreeItem label="tourist stop" />
          </TreeGroup>
          <TreeItem label="corley motors" />
        </TreeGroup>
      </Tree>,
    ),
  };
}

// A state on an element no prop reaches: the hovered summary of the group
// marked `force-hover-summary`.
const forceInnerStates = (markup: string) =>
  markup.replace(
    /(force-hover-summary[^>]*>\s*<(?:summary|div) class="CharcellTreeGroup__summary)"/g,
    '$1 force-hover"',
  );

/**
 * Every case's rendered markup, by id.
 * @param cases - the cases from `cases.cjs`.
 * @returns The static markup per case id.
 */
export function caseMarkup(
  cases: Record<string, [string, string[]]>,
): Record<string, string> {
  const elements = caseElements(cases.glyphs[1]);
  const missing = Object.keys(cases).filter((id) => !(id in elements));
  if (missing.length)
    throw new Error(`No element for case ${missing.join(", ")}`);
  return Object.fromEntries(
    Object.keys(cases).map((id) => [
      id,
      forceInnerStates(renderToStaticMarkup(elements[id])),
    ]),
  );
}
