/*
 * charcell's components as text: what a character-cell screen would print,
 * every mark a glyph in a cell and every fill a cell's background. Shared by
 * the comparison page (a classic script, so the page works opened as a file)
 * and its generator (`require`d from node).
 */
(function (root) {
  // The google fonts monospace families (fonts.google.com/metadata/fonts,
  // category monospace) that draw charcell's box-drawing glyphs themselves,
  // narrowed from all 51 by how they line up, then by Chromium's report of
  // which font paints each glyph. Out for lacking glyphs charcell
  // draws: cousine, kode mono, pt mono and ubuntu mono (the heavy edge, ╴ ╶),
  // courier prime (all of them). Each with its upright weights of 400 and 700.
  const FAMILIES = [
    ["Fira Code", [400, 700]],
    ["Fira Mono", [400, 700]],
    ["Geist Mono", [400, 700]],
    ["Google Sans Code", [400, 700]],
    ["IBM Plex Mono", [400, 700]],
    ["Intel One Mono", [400, 700]],
    ["Iosevka Charon Mono", [400, 700]],
    ["JetBrains Mono", [400, 700]],
    ["Lilex", [400, 700]],
    ["M PLUS 1 Code", [400, 700]],
    ["Overpass Mono", [400, 700]],
    ["Source Code Pro", [400, 700]],
    ["Victor Mono", [400, 700]],
  ];

  // markup: {code|text} sets a cell tone - i inverted, I dimmed inversion, w wash,
  // m mid, f faint, s strong, M the mid fill, b bold, e italic, u underline,
  // d dotted underline, x struck through. Nestable.
  const strip = (text) => text.replace(/\{[A-Za-z]+\|/g, "").replace(/\}/g, "");
  const width = (text) => [...strip(text)].length;
  const pad = (text, size, align = "start") => {
    const gap = Math.max(0, size - width(text));
    return align === "end" ? " ".repeat(gap) + text : text + " ".repeat(gap);
  };
  const tone = (code, text) => (code ? `{${code}|${text}}` : text);

  // A ring's sides, as the components style them: `single` (or `rounded`),
  // `heavy`, `double` or `none`.
  const EDGE = {
    across: { single: "─", rounded: "─", heavy: "━", double: "═", none: " " },
    down: { single: "│", rounded: "│", heavy: "┃", double: "║", none: " " },
  };
  // A corner from its two sides' styles, the way the ring draws it: the arc
  // where both are rounded, the double glyphs where one is double, nothing
  // where heavy or none meets double, a half line where the other is none,
  // and the light and heavy corners otherwise. `corner` is tl, tr, bl or br.
  const CORNERS = {
    tl: {
      arc: "╭",
      ll: "┌",
      hl: "┍",
      lh: "┎",
      hh: "┏",
      dl: "╒",
      ld: "╓",
      dd: "╔",
      across: { l: "╶", h: "╺" },
      down: { l: "╷", h: "╻" },
    },
    tr: {
      arc: "╮",
      ll: "┐",
      hl: "┑",
      lh: "┒",
      hh: "┓",
      dl: "╕",
      ld: "╖",
      dd: "╗",
      across: { l: "╴", h: "╸" },
      down: { l: "╷", h: "╻" },
    },
    bl: {
      arc: "╰",
      ll: "└",
      hl: "┕",
      lh: "┖",
      hh: "┗",
      dl: "╘",
      ld: "╙",
      dd: "╚",
      across: { l: "╶", h: "╺" },
      down: { l: "╵", h: "╹" },
    },
    br: {
      arc: "╯",
      ll: "┘",
      hl: "┙",
      lh: "┚",
      hh: "┛",
      dl: "╛",
      ld: "╜",
      dd: "╝",
      across: { l: "╴", h: "╸" },
      down: { l: "╵", h: "╹" },
    },
  };
  function cornerOf(corner, across, down) {
    const glyphs = CORNERS[corner];
    const weight = (style) =>
      ({ single: "l", rounded: "l", heavy: "h", double: "d", none: "n" })[
        style
      ];
    const [acrossWeight, downWeight] = [weight(across), weight(down)];
    if (across === "rounded" && down === "rounded") return glyphs.arc;
    if (
      (acrossWeight === "d" && (downWeight === "h" || downWeight === "n")) ||
      (downWeight === "d" && (acrossWeight === "h" || acrossWeight === "n"))
    )
      return " ";
    if (acrossWeight === "n" && downWeight === "n") return " ";
    if (acrossWeight === "n") return glyphs.down[downWeight];
    if (downWeight === "n") return glyphs.across[acrossWeight];
    return (
      glyphs[acrossWeight + downWeight] ??
      glyphs[
        (acrossWeight === "d" ? "d" : "l") + (downWeight === "d" ? "d" : "l")
      ]
    );
  }

  // A ring around lines of content, `inner` cells wide. `border` styles its
  // sides (single unless set); `title` straddles the top stroke; `stroke`
  // tones it.
  function ring(
    lines,
    inner,
    { border = {}, title, stroke = "m", titleTone } = {},
  ) {
    const side = (name) => border[name] ?? "single";
    const [top, right, bottom, left] = ["top", "right", "bottom", "left"].map(
      side,
    );
    const corner = (name, across, down) => cornerOf(name, across, down);
    const topLeft = corner("tl", top, left);
    const topRight = corner("tr", top, right);
    const along = EDGE.across[top];
    const first = title
      ? tone(stroke, topLeft + along) +
        " " +
        tone(titleTone, title) +
        " " +
        tone(stroke, along.repeat(inner - width(title) - 3) + topRight)
      : tone(stroke, topLeft + along.repeat(inner) + topRight);
    return [
      first,
      ...lines.map(
        (line) =>
          tone(stroke, EDGE.down[left]) +
          pad(line, inner) +
          tone(stroke, EDGE.down[right]),
      ),
      tone(
        stroke,
        corner("bl", bottom, left) +
          EDGE.across[bottom].repeat(inner) +
          corner("br", bottom, right),
      ),
    ];
  }
  // The right and bottom sides raised, double or heavy.
  const raised = (style) => ({ right: style, bottom: style });
  // Every side alike.
  const all = (style) => ({
    top: style,
    right: style,
    bottom: style,
    left: style,
  });

  // Blocks side by side, top-aligned, `gap` cells apart.
  function beside(blocks, gap = 3) {
    const height = Math.max(...blocks.map((block) => block.length));
    const widths = blocks.map((block) => Math.max(...block.map(width)));
    const rows = [];
    for (let row = 0; row < height; row++) {
      rows.push(
        blocks
          .map((block, index) => pad(block[row] ?? "", widths[index]))
          .join(" ".repeat(gap))
          .trimEnd(),
      );
    }
    return rows;
  }

  // A table: columns of [label, align], records of cells.
  function table(
    columns,
    records,
    { separators = "both", variant = "boxed", raised = "none" } = {},
  ) {
    const widths = columns.map(([label], index) =>
      Math.max(
        width(label),
        ...records.map((record) => width(String(record[index]))),
      ),
    );
    const cell = (text, index, align) =>
      " " + pad(text, widths[index], align) + " ";
    const columnLines = separators === "both" || separators === "columns";
    const rowLines = separators === "both" || separators === "rows";
    if (variant === "dense") {
      const line = (cells) => cells.join("");
      const header = line(
        columns.map(([label, align], index) =>
          cell(tone("m", label), index, align),
        ),
      );
      return [
        header,
        tone("f", "─".repeat(width(header))),
        ...records.map((record) =>
          line(
            record.map((value, index) =>
              cell(String(value), index, columns[index][1]),
            ),
          ),
        ),
      ];
    }
    const join = (cells, divider) =>
      cells.join(columnLines ? tone("m", divider) : "");
    const rule = (left, cross, right) =>
      tone(
        "m",
        left +
          widths
            .map((size) => "─".repeat(size + 2))
            .join(columnLines ? cross : "") +
          right,
      );
    const edges =
      raised === "double"
        ? ["╖", "║", "╢", "╝", "╘", "═"]
        : raised === "heavy"
          ? ["┒", "┃", "┨", "┛", "┕", "━"]
          : ["┐", "│", "┤", "┘", "└", "─"];
    const [topRight, side, joint, corner, bottomLeft, base] = edges;
    const lines = [rule("┌", "┬", topRight)];
    lines.push(
      tone("m", "│") +
        join(
          columns.map(([label, align], index) =>
            cell(tone("m", label), index, align),
          ),
          "│",
        ) +
        tone("m", side),
    );
    lines.push(rule("├", "┼", joint));
    records.forEach((record, row) => {
      lines.push(
        tone("m", "│") +
          join(
            record.map((value, index) =>
              cell(String(value), index, columns[index][1]),
            ),
            "│",
          ) +
          tone("m", side),
      );
      if (rowLines && row < records.length - 1)
        lines.push(rule("├", "┼", joint));
    });
    lines.push(
      tone(
        "m",
        bottomLeft +
          widths
            .map((size) => base.repeat(size + 2))
            .join(
              columnLines
                ? raised === "none"
                  ? "┴"
                  : base === "═"
                    ? "╧"
                    : "┷"
                : "",
            ) +
          corner,
      ),
    );
    return lines;
  }

  // Folder tabs: [label, state] with state 'selected' | 'disabled' | 'hover' | ''.
  function folderTabs(tabs, panel, panelWidth, { raised = "none" } = {}) {
    let top = "┌",
      labels = "",
      base = "";
    tabs.forEach(([label, state], index) => {
      const size = width(label) + 2;
      const text =
        state === "disabled"
          ? tone("m", label)
          : state === "hover"
            ? `{w|${label}}`
            : label;
      top += "─".repeat(size) + (index === tabs.length - 1 ? "┐" : "┬");
      labels +=
        (index === 0 ? tone("m", "│") : "") +
        (state === "hover" ? `{w| ${label} }` : ` ${text} `) +
        tone("m", "│");
      const open = state === "selected";
      const left =
        index === 0
          ? open
            ? "│"
            : "├"
          : tabs[index - 1][1] === "selected"
            ? "└"
            : open
              ? "┘"
              : "┴";
      base += left + (open ? " " : "─").repeat(size);
    });
    const last = tabs[tabs.length - 1][1] === "selected" ? "└" : "┴";
    const used = width(base) + 1;
    const [corner, side, bottom] = {
      none: ["┐", "│", (inner) => "└" + "─".repeat(inner) + "┘"],
      double: ["╖", "║", (inner) => "╘" + "═".repeat(inner) + "╝"],
      heavy: ["┒", "┃", (inner) => "┕" + "━".repeat(inner) + "┛"],
    }[raised];
    base += last + "─".repeat(Math.max(0, panelWidth - used - 1)) + corner;
    const inner = panelWidth - 2;
    return [
      tone("m", top),
      labels,
      tone("m", base),
      ...panel.map(
        (line) => tone("m", "│") + pad(" " + line, inner) + tone("m", side),
      ),
      tone("m", bottom(inner)),
    ];
  }

  // Cell graphics as typed text: the face draws them itself, glyph for glyph
  // what the reference renderer draws.
  const GLYPH_SAMPLE = [
    "┌─┬─┐╔═╦═╗┏━┳━┓╭─╮╒═╕╓─╖",
    "│ │ │║ ║ ║┃ ┃ ┃│ │╞═╡╟─╢",
    "├─┼─┤╠═╬═╣┣━╋━┫╰─╯╘═╛╙─╜",
    "└─┴─┘╚═╩═╝┗━┻━┛┄┈╌┅┉╍╤╥",
    "┍┎┑┒┕┖┙┚┝┞┟┠┡┢┥┦┧┨╼╽╾╿╪╫",
    "╴╵╶╷╸╹╺╻ ┆┊╎┇┋╏ ╧╨",
    "▀▄█▌▐░▒▓▖▗▘▝▙▚▛▜▞▟▔▕",
    "▁▂▃▅▆▇▉▊▋▍▎▏",
    "⠿⣿⠁⠂⠄⡀⠈⠐⠠⢀⣀⠛⠶⣤⡇⢸⠉",
  ];

  // The running text RichText prints.
  const RICH_TEXT = [
    "{b|{m|# }the souvenir stand}",
    "",
    "the {b|derby} stand sells {e|official} loot.",
    "",
    "priced in {w|{s|loot.txt}}; the {d|stock} is short.",
    "",
    "{b|{m|## }stock}",
    "",
    "{m|•} we got yer hats and yer pennants",
    "{m|•} no credit",
    "",
    "{m|1.} restock the bunny value-pack",
    "{m|2.} change the derby car's batteries",
    "",
    "{f|│} i'm practically givin' this loot away!",
    "{f|│} what's a couple of bucks in exchange",
    "{f|│} for a timeless memento?",
    "",
    ...ring([" hats: plenty"], 38, { stroke: "f" }),
    "",
    tone("f", "─".repeat(40)),
  ];

  // ── the components ──────────────────────────────────────────────────────────
  const ITEMS = [
    ["rider", "start"],
    ["weapon", "start"],
    ["hits", "end"],
  ];
  const RECORDS = [
    ["a vulture", "chain", "4"],
    ["a vulture", "chainsaw", "1"],
    ["a rottwheeler", "mace", "4"],
  ];

  const COMPONENTS = [
    [
      "Button: rest, hover, press, focus",
      beside([
        ring([" kick "], 6),
        ring(["{w| kick }"], 6, { stroke: "s" }),
        ring(["{i| kick }"], 6, { stroke: "" }),
        ring(["\u276Fkick "], 6, { stroke: "" }),
      ]),
    ],
    [
      "Button: raised, double and heavy",
      beside([
        ring([" kick "], 6, { border: raised("double") }),
        ring([" kick "], 6, { border: raised("heavy") }),
      ]),
    ],
    [
      "Button, dense: rest, hover, press",
      [" remove    {w| remove }   {i| remove }"],
    ],
    [
      "SortableList: rest, a grip hovered, an item picked up",
      beside([
        ["{m|⠿} leak", "{m|⠿} table", "{m|⠿} meat"],
        ["{w|{s|⠿}} leak", "{m|⠿} table", "{m|⠿} meat"],
        ["{M|⠿} leak", "{m|⠿} table", "{m|⠿} meat"],
      ]),
    ],
    [
      "Toggle: off, on, hover while on, disabled",
      [" autopilot    {i| autopilot }   {I| autopilot }   {m| autopilot }"],
    ],
    [
      "Checkbox and RadioGroup",
      [
        " [×] ride with the polecats",
        " [ ] {w|engage the autopilot }",
        " [-] every gang",
        "",
        "{m|ride with}  (•) polecats",
        "           ( ) vultures",
        "           ( ) cavefish",
        "           {m|( ) rottwheelers}",
      ],
    ],
    [
      "TextInput: boxed, focused, dense",
      beside([
        ring([" {m|search highway 9}  "], 19),
        ring([" schmorley{m|█}        "], 19, { stroke: "" }),
        [
          "",
          "{w| {s|search highway 9}     }",
          "",
          "{i| schmorley{f|█}        }",
        ],
      ]),
    ],
    [
      "Textarea: three rows, grown to five",
      beside([
        ring([" {m|warning: do not}", "", ""], 20),
        ring(
          [
            " warning: do not",
            " play in or around",
            " dumpster. do not",
            " kick dumpster.",
            "",
          ],
          20,
          { stroke: "" },
        ),
      ]),
    ],
    [
      "Field",
      [
        "      " + ring([" {m|doreen schmorley}"], 19)[0],
        "{m|name}  " + ring([" {m|doreen schmorley}"], 19)[1],
        "      " + ring([" {m|doreen schmorley}"], 19)[2],
        "      {m|read out by the announcer}",
        "      error: give us your name",
      ],
    ],
    [
      "Select: closed, open (attached listbox)",
      beside([
        ring([" ride with    ▾ "], 16),
        [
          "┌──────────────┐",
          "│{i| polecats   ▾ }│",
          "├──────────────┤",
          "│{i| polecats     }│",
          "│ vultures     │",
          "│ cavefish     │",
          "│{w| rottwheelers }│",
          "└──────────────┘",
        ],
      ]),
    ],
    [
      "ActionMenu: raised, a separator ╶──╴ between groups",
      beside([
        ring([" turret "], 8),
        ring(
          [
            "{w| aim      }",
            " fire",
            tone("f", "╶────────╴"),
            tone("m", " raise"),
            " lower",
          ],
          10,
          { border: raised("double"), stroke: "" },
        ),
      ]),
    ],
    [
      "Popover: trigger, then the panel a row below",
      [
        ...ring([" details "], 9),
        "",
        ...ring([" ben, leader of the polecats "], 29, {
          border: raised("double"),
          stroke: "",
        }),
      ],
    ],
    [
      "Frame: titled, active, quiet, raised",
      beside([
        ring([" 2 riders"], 16, { title: "polecats" }),
        ring([" 2 riders"], 16, { title: "vultures", stroke: "" }),
        ring([" no riders"], 16, {
          title: "cavefish",
          stroke: "f",
          titleTone: "m",
        }),
        ring([" 1 rider"], 16, {
          title: "rottwheelers",
          border: raised("double"),
        }),
        ring([" 1 rider"], 16, {
          title: "rottwheelers",
          border: raised("heavy"),
        }),
      ]),
    ],
    [
      "Dialog",
      ring(
        [
          " jumping the poyahoga gorge,",
          " although tempting, is highly",
          " illegal and dangerous.",
          pad("", 28) + "keep",
        ],
        34,
        { title: "poyahoga gorge", border: raised("double"), stroke: "" },
      ),
    ],
    [
      "Table: separators both and rows",
      beside([
        table(ITEMS, RECORDS),
        table(ITEMS, RECORDS, { separators: "rows" }),
      ]),
    ],
    [
      "Table: separators columns and none",
      beside([
        table(ITEMS, RECORDS, { separators: "columns" }),
        table(ITEMS, RECORDS, { separators: "none" }),
      ]),
    ],
    [
      "Table: raised double and heavy",
      beside([
        table(ITEMS, RECORDS, { raised: "double" }),
        table(ITEMS, RECORDS, { raised: "heavy" }),
      ]),
    ],
    ["Table: dense", table(ITEMS, RECORDS, { variant: "dense" })],
    [
      "Windows: menu, popover and dialog raised heavy",
      beside([
        ring(
          [" aim", "{w| fire     }", tone("f", "╶────────╴"), " lower"],
          10,
          { border: raised("heavy"), stroke: "" },
        ),
        ring([" ben, leader of the polecats "], 29, {
          border: raised("heavy"),
          stroke: "",
        }),
        ring([" highly illegal", pad("", 24) + "keep"], 29, {
          title: "poyahoga gorge",
          border: raised("heavy"),
          stroke: "",
        }),
      ]),
    ],
    [
      "Tabs: folder (kickstand selected, melonweed hovered, corville disabled)",
      folderTabs(
        [
          ["kickstand", "selected"],
          ["melonweed", "hover"],
          ["corville", "disabled"],
        ],
        ["a biker bar out on the highway.", "quohog pours."],
        40,
      ),
    ],
    [
      "Tabs: folder, the panel raised double and heavy",
      beside([
        folderTabs(
          [
            ["kickstand", "selected"],
            ["melonweed", ""],
            ["corville", ""],
          ],
          ["a biker bar out on the highway.", "quohog pours."],
          38,
          { raised: "double" },
        ),
        folderTabs(
          [
            ["kickstand", "selected"],
            ["melonweed", ""],
            ["corville", ""],
          ],
          ["a biker bar out on the highway.", "quohog pours."],
          38,
          { raised: "heavy" },
        ),
      ]),
    ],
    [
      "Tabs: folder, the middle tab selected",
      folderTabs(
        [
          ["kickstand", ""],
          ["melonweed", "selected"],
          ["corville", ""],
        ],
        ["what is left of the town sinks a", "foot a year."],
        40,
      ),
    ],
    [
      "Tabs, dense",
      [
        "{i| kickstand } melonweed  {m|corville}",
        tone("f", "─".repeat(36)),
        "a biker bar out on the highway.",
        "quohog pours.",
      ],
    ],
    [
      "Progress",
      [`{m|filling the tank} {i|${" ".repeat(10)}}{w|${" ".repeat(14)}} 40%`],
    ],
    [
      "Tree: a row selected, a nested group open, one hovered",
      beside([
        [
          " {bm|highway 9}      {m|[\u2013]} ",
          " {m|├─} kickstand",
          " {m|├─}{i|" + pad(" melonweed", 17) + "}",
          " {m|├─} {m|the gorge}   {m|[\u2013]} ",
          " {m|│}  {m|├─} tourist stop",
          " {m|│}  {m|└─} ricky's ramp",
          " {m|└─} corley motors",
        ],
        [
          " {bm|highway 9}      {m|[\u2013]} ",
          " {m|├─} kickstand",
          " {m|├─}{w|" + pad(" the gorge   [+]", 17) + "}",
          " {m|└─} corley motors",
        ],
      ]),
    ],
    [
      "Separator: single, double, vertical",
      [
        tone("f", "────────────────────"),
        "",
        tone("f", "════════════════════"),
        "",
        "ben " + tone("f", "│") + " maureen",
      ],
    ],
    [
      "Splitter: the grip at rest, hovered, dragged",
      [
        "stops     {m|⠿}places",
        "stops     {w|{s|⠿}}places",
        "stops     {M|⠿}places",
      ],
    ],
    ["RichText", RICH_TEXT],
    [
      "InlineMessage",
      [
        "{b|warning:} {b|roadblocks ahead}",
        "         police are turning everyone",
        "         around on highway 9.",
        "",
        "{b|error:} out of gas",
      ],
    ],
  ];

  // The box-drawing and block ranges, and the glyphs beyond them the cases use.
  const range = (from, to) =>
    Array.from({ length: to - from + 1 }, (_, index) =>
      String.fromCodePoint(from + index),
    ).join("");
  const BOX = range(0x2500, 0x257f);
  const BLOCKS = range(0x2580, 0x259f);
  const EXTRA = "▾▴▸◂▶◀▲▼●•·×\u2013\u2026\u276E\u276F";

  // ── the comparison cases ────────────────────────────────────────────────────
  // each is one component in one state, as text, cell for cell what the CSS
  // component should paint. `compare.html` sets the rendered component beside
  // it (the generator, `build-compare.tsx`, keys the elements by the same id).
  const CASES = {
    "button-expanded": [
      "Button, its panel open (aria-expanded)",
      ring(["{i| turret }"], 8, { stroke: "" }),
    ],
    ligatures: [
      "Text the face would join: one glyph per cell",
      [" office file -> <-> fly "],
    ],
    frame: [
      "Frame, titled, 20ch",
      ring([" on highway 9"], 18, { title: "polecats" }),
    ],
    "frame-active-double": [
      "Frame, active, raised double",
      ring([" on highway 9"], 18, {
        title: "vultures",
        stroke: "",
        border: raised("double"),
      }),
    ],
    "frame-heavy": [
      "Frame, raised heavy",
      ring([" on highway 9"], 18, {
        title: "polecats",
        border: raised("heavy"),
      }),
    ],
    "frame-rounded": [
      "Frame, rounded",
      ring([" on highway 9"], 18, {
        title: "polecats",
        border: all("rounded"),
      }),
    ],
    "frame-heavy-all": [
      "Frame, heavy",
      ring([" on highway 9"], 18, { title: "polecats", border: all("heavy") }),
    ],
    "frame-double": [
      "Frame, double",
      ring([" on highway 9"], 18, { title: "polecats", border: all("double") }),
    ],
    "frame-apart": [
      "Frame, heavy top and bottom, double sides: the corners empty",
      ring([" on highway 9"], 18, {
        title: "polecats",
        border: {
          top: "heavy",
          bottom: "heavy",
          left: "double",
          right: "double",
        },
      }),
    ],
    "frame-double-single": [
      "Frame, double top and bottom, single sides",
      ring([" on highway 9"], 18, {
        title: "polecats",
        border: { top: "double", bottom: "double" },
      }),
    ],
    "frame-open": [
      "Frame, no top",
      ring([" on highway 9"], 18, {
        title: "polecats",
        border: { top: "none" },
      }),
    ],
    "frame-quiet": [
      "Frame, quiet",
      ring([" on highway 9"], 18, {
        title: "cavefish",
        stroke: "f",
        titleTone: "m",
      }),
    ],
    table: ["Table, separators both", table(ITEMS, RECORDS)],
    "table-rows": [
      "Table, separators rows",
      table(ITEMS, RECORDS, { separators: "rows" }),
    ],
    "table-columns": [
      "Table, separators columns",
      table(ITEMS, RECORDS, { separators: "columns" }),
    ],
    "table-none": [
      "Table, separators none",
      table(ITEMS, RECORDS, { separators: "none" }),
    ],
    "table-double": [
      "Table, raised double",
      table(ITEMS, RECORDS, { raised: "double" }),
    ],
    "table-heavy": [
      "Table, raised heavy",
      table(ITEMS, RECORDS, { raised: "heavy" }),
    ],
    "table-dense": [
      "Table, dense",
      table(ITEMS, RECORDS, { variant: "dense" }),
    ],
    separator: ["Separator, 20ch", [tone("f", "─".repeat(20))]],
    "separator-double": ["Separator, double", [tone("f", "═".repeat(20))]],
    "separator-inset": [
      "Separator, inset",
      [tone("f", "╶" + "─".repeat(18) + "╴")],
    ],
    tree: [
      "Tree, a nested group open, a row selected",
      [
        " {bm|highway 9}      {m|[\u2013]} ",
        " {m|├─} kickstand",
        " {m|├─}{i|" + pad(" melonweed", 17) + "}",
        " {m|├─} {m|the gorge}   {m|[\u2013]} ",
        " {m|│}  {m|├─} tourist stop",
        " {m|│}  {m|└─} ricky's ramp",
        " {m|└─} corley motors",
      ],
    ],
    "tree-fixed": [
      "Tree, a section that keeps open, its label hovered",
      [
        " {bm|highway 9}" + " ".repeat(10),
        " {m|├─} kickstand",
        " {m|├─}{i|" + pad(" melonweed", 17) + "}",
        " {m|└─} corley motors",
      ],
    ],
    glyphs: ["The face's own cell graphics, typed", GLYPH_SAMPLE],
    "tree-hover": [
      "Tree, a nested group hovered",
      [
        " {bm|highway 9}      {m|[\u2013]} ",
        " {m|├─} kickstand",
        " {m|├─}{w|" + pad(" the gorge   [+]", 17) + "}",
        " {m|└─} corley motors",
      ],
    ],
  };

  // The cases by what they hold: `face` the face itself (the docs site's
  // introduction prints the glyphs), and `core` the primitives every component draws with:
  // the rings, their borders and junctions, the separators, the tree
  // connectors and an engaged trigger. A component's own text versions are
  // the snapshots of its scenarios (test/text/snapshots).
  const CASE_GROUPS = {
    face: ["ligatures", "glyphs"],
    core: [
      "frame",
      "frame-active-double",
      "frame-heavy",
      "frame-quiet",
      "frame-rounded",
      "frame-heavy-all",
      "frame-double",
      "frame-apart",
      "frame-double-single",
      "frame-open",
      "table",
      "table-rows",
      "table-columns",
      "table-none",
      "table-double",
      "table-heavy",
      "table-dense",
      "separator",
      "separator-double",
      "separator-inset",
      "tree",
      "tree-hover",
      "tree-fixed",
      "button-expanded",
    ],
  };

  // ── box drawing, drawn ──────────────────────────────────────────────────────
  // a font's box-drawing glyphs do not tile: they overshoot the cell, overlap
  // their neighbors and land between pixels. A terminal draws them itself, and
  // so does this: each box-drawing or block character is a one-cell span whose
  // background paints whole-pixel bars, from the cell's own center pixel
  // (`round(down, 0.5ch, 1px)` across, `round(down, 0.5lh, 1px)` down). A
  // light stroke is that pixel, a heavy one it and the one before, a double
  // one two light strokes an eighth of a cell either side, a pixel apart. The character stays in
  // the text, unpainted, so it copies. The diagonals are left to the font.
  //
  // The arms of the light, heavy and dashed glyphs, from their Unicode
  // names (u, d, l, r: l light, h heavy). The arcs are drawn by `arcBars`.
  const ARMS = {
    "─": { l: "l", r: "l" },
    "━": { l: "h", r: "h" },
    "│": { u: "l", d: "l" },
    "┃": { u: "h", d: "h" },
    "┄": { l: "l", r: "l", dash: 3 },
    "┅": { l: "h", r: "h", dash: 3 },
    "┆": { u: "l", d: "l", dash: 3 },
    "┇": { u: "h", d: "h", dash: 3 },
    "┈": { l: "l", r: "l", dash: 4 },
    "┉": { l: "h", r: "h", dash: 4 },
    "┊": { u: "l", d: "l", dash: 4 },
    "┋": { u: "h", d: "h", dash: 4 },
    "┌": { d: "l", r: "l" },
    "┍": { d: "l", r: "h" },
    "┎": { d: "h", r: "l" },
    "┏": { d: "h", r: "h" },
    "┐": { d: "l", l: "l" },
    "┑": { d: "l", l: "h" },
    "┒": { d: "h", l: "l" },
    "┓": { d: "h", l: "h" },
    "└": { u: "l", r: "l" },
    "┕": { u: "l", r: "h" },
    "┖": { u: "h", r: "l" },
    "┗": { u: "h", r: "h" },
    "┘": { u: "l", l: "l" },
    "┙": { u: "l", l: "h" },
    "┚": { u: "h", l: "l" },
    "┛": { u: "h", l: "h" },
    "├": { u: "l", d: "l", r: "l" },
    "┝": { u: "l", d: "l", r: "h" },
    "┞": { u: "h", r: "l", d: "l" },
    "┟": { d: "h", r: "l", u: "l" },
    "┠": { u: "h", d: "h", r: "l" },
    "┡": { d: "l", r: "h", u: "h" },
    "┢": { u: "l", r: "h", d: "h" },
    "┣": { u: "h", d: "h", r: "h" },
    "┤": { u: "l", d: "l", l: "l" },
    "┥": { u: "l", d: "l", l: "h" },
    "┦": { u: "h", l: "l", d: "l" },
    "┧": { d: "h", l: "l", u: "l" },
    "┨": { u: "h", d: "h", l: "l" },
    "┩": { d: "l", l: "h", u: "h" },
    "┪": { u: "l", l: "h", d: "h" },
    "┫": { u: "h", d: "h", l: "h" },
    "┬": { d: "l", l: "l", r: "l" },
    "┭": { l: "h", r: "l", d: "l" },
    "┮": { r: "h", l: "l", d: "l" },
    "┯": { d: "l", l: "h", r: "h" },
    "┰": { d: "h", l: "l", r: "l" },
    "┱": { r: "l", l: "h", d: "h" },
    "┲": { l: "l", r: "h", d: "h" },
    "┳": { d: "h", l: "h", r: "h" },
    "┴": { u: "l", l: "l", r: "l" },
    "┵": { l: "h", r: "l", u: "l" },
    "┶": { r: "h", l: "l", u: "l" },
    "┷": { u: "l", l: "h", r: "h" },
    "┸": { u: "h", l: "l", r: "l" },
    "┹": { r: "l", l: "h", u: "h" },
    "┺": { l: "l", r: "h", u: "h" },
    "┻": { u: "h", l: "h", r: "h" },
    "┼": { u: "l", d: "l", l: "l", r: "l" },
    "┽": { l: "h", r: "l", u: "l", d: "l" },
    "┾": { r: "h", l: "l", u: "l", d: "l" },
    "┿": { u: "l", d: "l", l: "h", r: "h" },
    "╀": { u: "h", d: "l", l: "l", r: "l" },
    "╁": { d: "h", u: "l", l: "l", r: "l" },
    "╂": { u: "h", d: "h", l: "l", r: "l" },
    "╃": { l: "h", u: "h", r: "l", d: "l" },
    "╄": { r: "h", u: "h", l: "l", d: "l" },
    "╅": { l: "h", d: "h", r: "l", u: "l" },
    "╆": { r: "h", d: "h", l: "l", u: "l" },
    "╇": { d: "l", u: "h", l: "h", r: "h" },
    "╈": { u: "l", d: "h", l: "h", r: "h" },
    "╉": { r: "l", l: "h", u: "h", d: "h" },
    "╊": { l: "l", r: "h", u: "h", d: "h" },
    "╋": { u: "h", d: "h", l: "h", r: "h" },
    "╌": { l: "l", r: "l", dash: 2 },
    "╍": { l: "h", r: "h", dash: 2 },
    "╎": { u: "l", d: "l", dash: 2 },
    "╏": { u: "h", d: "h", dash: 2 },
    "╴": { l: "l" },
    "╵": { u: "l" },
    "╶": { r: "l" },
    "╷": { d: "l" },
    "╸": { l: "h" },
    "╹": { u: "h" },
    "╺": { r: "h" },
    "╻": { d: "h" },
    "╼": { l: "l", r: "h" },
    "╽": { u: "l", d: "h" },
    "╾": { l: "h", r: "l" },
    "╿": { u: "h", d: "l" },
  };

  const C = "round(down, 0.5ch, 1px)";
  const M = "round(down, 0.5lh, 1px)";
  const G = "round(0.125ch, 1px)";
  const AT = {
    0: "0px",
    W: "1ch",
    H: "1lh",
    c: C,
    m: M,
    x1: `calc(${C} - ${G})`,
    x2: `calc(${C} + ${G})`,
    y1: `calc(${M} - ${G})`,
    y2: `calc(${M} + ${G})`,
  };
  const after = (at) =>
    at === "W" || at === "H" ? AT[at] : `calc(${AT[at]} + 1px)`;
  // A bar from x0 to x1 and y0 to y1 (ends exclusive), as CSS lengths.
  const bar = (x0, x1, y0, y1, paint = "currentColor") =>
    `linear-gradient(${paint}, ${paint}) ${x0} ${y0} / calc(${x1} - ${x0}) calc(${y1} - ${y0}) no-repeat`;
  // A one-pixel line along a row from one column to another (inclusive, or to
  // the edge), and down a column.
  const across = (y, from, to) => bar(AT[from], after(to), AT[y], after(y));
  const down = (x, from, to) => bar(AT[x], after(x), AT[from], after(to));

  function armBars({ u, d, l, r, dash }) {
    const band = (center, weight) =>
      weight === "h"
        ? [`calc(${center} - 1px)`, `calc(${center} + 1px)`]
        : [center, `calc(${center} + 1px)`];
    const heavyAcross = l === "h" || r === "h";
    const heavyDown = u === "h" || d === "h";
    if (dash) {
      const bars = [];
      for (let index = 0; index < dash; index++) {
        if (l) {
          const [y0, y1] = band(M, l);
          bars.push(
            bar(
              `round(calc(1ch * ${index} / ${dash}), 1px)`,
              `calc(round(calc(1ch * ${index + 1} / ${dash}), 1px) - 1px)`,
              y0,
              y1,
            ),
          );
        } else {
          const [x0, x1] = band(C, u);
          bars.push(
            bar(
              x0,
              x1,
              `round(calc(1lh * ${index} / ${dash}), 1px)`,
              `calc(round(calc(1lh * ${index + 1} / ${dash}), 1px) - 1px)`,
            ),
          );
        }
      }
      return bars;
    }
    const bars = [];
    if (u) bars.push(bar(...band(C, u), "0px", `calc(${M} + 1px)`));
    if (d)
      bars.push(
        bar(...band(C, d), heavyAcross ? `calc(${M} - 1px)` : M, "1lh"),
      );
    if (l) bars.push(bar("0px", `calc(${C} + 1px)`, ...band(M, l)));
    if (r)
      bars.push(bar(heavyDown ? `calc(${C} - 1px)` : C, "1ch", ...band(M, r)));
    return bars;
  }

  // The arcs, `╭ ╮ ╯ ╰`: a 1px quarter circle on the stroke's center line,
  // from the center row to the center column, its ends on their pixels, and
  // from there the two arms out to the cell's edges. The circle is centered
  // `ARC_REACH` in from the center pixel, `ARC_RADIUS` from the center line;
  // its edges fade over a device pixel, the way an outline antialiases. The
  // ring draws the same gradient (src/styles/_mixins.scss), the font the same
  // curve as an outline (scripts/font/build.py).
  const ARC_RADIUS = 2.5;
  const ARC_REACH = 3;
  const ARCS = { "╭": [1, 1], "╮": [-1, 1], "╯": [-1, -1], "╰": [1, -1] };
  function arcBars(glyph) {
    const [sx, sy] = ARCS[glyph];
    const at = (center, offset) => `calc(${center} + ${offset}px)`;
    const fade = "calc(var(--charcell-device-pixel, 1px) / 2)";
    const inner = `${ARC_RADIUS - 0.5}px`;
    const outer = `${ARC_RADIUS + 0.5}px`;
    const ring =
      `radial-gradient(circle at ${sx > 0 ? ARC_REACH : 0}px ${sy > 0 ? ARC_REACH : 0}px, ` +
      `transparent calc(${inner} - ${fade}), currentColor calc(${inner} + ${fade}), ` +
      `currentColor calc(${outer} - ${fade}), transparent calc(${outer} + ${fade})) ` +
      `${sx > 0 ? C : at(C, 1 - ARC_REACH)} ${sy > 0 ? M : at(M, 1 - ARC_REACH)} / ${ARC_REACH}px ${ARC_REACH}px no-repeat`;
    const bars = [ring];
    bars.push(
      sx > 0
        ? bar(at(C, ARC_REACH), "1ch", M, at(M, 1))
        : bar("0px", at(C, 1 - ARC_REACH), M, at(M, 1)),
    );
    bars.push(
      sy > 0
        ? bar(C, at(C, 1), at(M, ARC_REACH), "1lh")
        : bar(C, at(C, 1), "0px", at(M, 1 - ARC_REACH)),
    );
    return bars;
  }

  // The double and single-and-double glyphs, line by line: `across` runs
  // along a row (y, from x, to x), `down` down a column (x, from y, to y).
  const DOUBLE = {
    "═": [across("y1", 0, "W"), across("y2", 0, "W")],
    "║": [down("x1", 0, "H"), down("x2", 0, "H")],
    "╒": [across("y1", "c", "W"), across("y2", "c", "W"), down("c", "y1", "H")],
    "╓": [down("x1", "m", "H"), down("x2", "m", "H"), across("m", "x1", "W")],
    "╔": [
      across("y1", "x1", "W"),
      down("x1", "y1", "H"),
      across("y2", "x2", "W"),
      down("x2", "y2", "H"),
    ],
    "╕": [across("y1", 0, "c"), across("y2", 0, "c"), down("c", "y1", "H")],
    "╖": [down("x1", "m", "H"), down("x2", "m", "H"), across("m", 0, "x2")],
    "╗": [
      across("y1", 0, "x2"),
      down("x2", "y1", "H"),
      across("y2", 0, "x1"),
      down("x1", "y2", "H"),
    ],
    "╘": [across("y1", "c", "W"), across("y2", "c", "W"), down("c", 0, "y2")],
    "╙": [down("x1", 0, "m"), down("x2", 0, "m"), across("m", "x1", "W")],
    "╚": [
      across("y2", "x1", "W"),
      down("x1", 0, "y2"),
      across("y1", "x2", "W"),
      down("x2", 0, "y1"),
    ],
    "╛": [across("y1", 0, "c"), across("y2", 0, "c"), down("c", 0, "y2")],
    "╜": [down("x1", 0, "m"), down("x2", 0, "m"), across("m", 0, "x2")],
    "╝": [
      across("y2", 0, "x2"),
      down("x2", 0, "y2"),
      across("y1", 0, "x1"),
      down("x1", 0, "y1"),
    ],
    "╞": [down("c", 0, "H"), across("y1", "c", "W"), across("y2", "c", "W")],
    "╟": [down("x1", 0, "H"), down("x2", 0, "H"), across("m", "x2", "W")],
    "╠": [
      down("x1", 0, "H"),
      down("x2", 0, "y1"),
      down("x2", "y2", "H"),
      across("y1", "x2", "W"),
      across("y2", "x2", "W"),
    ],
    "╡": [down("c", 0, "H"), across("y1", 0, "c"), across("y2", 0, "c")],
    "╢": [down("x1", 0, "H"), down("x2", 0, "H"), across("m", 0, "x1")],
    "╣": [
      down("x2", 0, "H"),
      down("x1", 0, "y1"),
      down("x1", "y2", "H"),
      across("y1", 0, "x1"),
      across("y2", 0, "x1"),
    ],
    "╤": [across("y1", 0, "W"), across("y2", 0, "W"), down("c", "y2", "H")],
    "╥": [across("m", 0, "W"), down("x1", "m", "H"), down("x2", "m", "H")],
    "╦": [
      across("y1", 0, "W"),
      across("y2", 0, "x1"),
      across("y2", "x2", "W"),
      down("x1", "y2", "H"),
      down("x2", "y2", "H"),
    ],
    "╧": [across("y1", 0, "W"), across("y2", 0, "W"), down("c", 0, "y1")],
    "╨": [across("m", 0, "W"), down("x1", 0, "m"), down("x2", 0, "m")],
    "╩": [
      across("y2", 0, "W"),
      across("y1", 0, "x1"),
      across("y1", "x2", "W"),
      down("x1", 0, "y1"),
      down("x2", 0, "y1"),
    ],
    "╪": [across("y1", 0, "W"), across("y2", 0, "W"), down("c", 0, "H")],
    "╫": [down("x1", 0, "H"), down("x2", 0, "H"), across("m", 0, "W")],
    "╬": [
      across("y1", 0, "x1"),
      down("x1", 0, "y1"),
      across("y1", "x2", "W"),
      down("x2", 0, "y1"),
      across("y2", 0, "x1"),
      down("x1", "y2", "H"),
      across("y2", "x2", "W"),
      down("x2", "y2", "H"),
    ],
  };

  // The block elements: halves at the center pixel, eighths rounded to whole
  // pixels, quadrants, and the shades as 1px dither, the way dos drew them (a
  // cell is lit or not): one pixel in four, every other pixel, three in
  // four.
  const eighth = (unit, count) => `round(calc(${unit} * ${count} / 8), 1px)`;
  const QUARTER = {
    upperLeft: bar("0px", C, "0px", M),
    upperRight: bar(C, "1ch", "0px", M),
    lowerLeft: bar("0px", C, M, "1lh"),
    lowerRight: bar(C, "1ch", M, "1lh"),
  };
  const dither = (stops) =>
    `conic-gradient(from 90deg at 1px 1px, ${stops}) 0 0 / 2px 2px`;
  const shade = (percent) => [
    {
      25: dither("transparent 0 75%, currentColor 0"),
      50: dither(
        "currentColor 0 25%, transparent 0 50%, currentColor 0 75%, transparent 0",
      ),
      75: dither("currentColor 0 75%, transparent 0"),
    }[percent],
  ];
  const BLOCK_BARS = {
    "▀": [bar("0px", "1ch", "0px", M)],
    "▄": [bar("0px", "1ch", M, "1lh")],
    "█": [bar("0px", "1ch", "0px", "1lh")],
    "▌": [bar("0px", C, "0px", "1lh")],
    "▐": [bar(C, "1ch", "0px", "1lh")],
    "▔": [bar("0px", "1ch", "0px", eighth("1lh", 1))],
    "▕": [bar(eighth("1ch", 7), "1ch", "0px", "1lh")],
    "░": shade(25),
    "▒": shade(50),
    "▓": shade(75),
    "▖": [QUARTER.lowerLeft],
    "▗": [QUARTER.lowerRight],
    "▘": [QUARTER.upperLeft],
    "▝": [QUARTER.upperRight],
    "▙": [QUARTER.upperLeft, QUARTER.lowerLeft, QUARTER.lowerRight],
    "▚": [QUARTER.upperLeft, QUARTER.lowerRight],
    "▛": [QUARTER.upperLeft, QUARTER.upperRight, QUARTER.lowerLeft],
    "▜": [QUARTER.upperLeft, QUARTER.upperRight, QUARTER.lowerRight],
    "▞": [QUARTER.upperRight, QUARTER.lowerLeft],
    "▟": [QUARTER.upperRight, QUARTER.lowerLeft, QUARTER.lowerRight],
  };
  [..."▁▂▃▅▆▇"].forEach((glyph, index) => {
    const count = [1, 2, 3, 5, 6, 7][index];
    BLOCK_BARS[glyph] = [bar("0px", "1ch", eighth("1lh", 8 - count), "1lh")];
  });
  [..."▉▊▋▍▎▏"].forEach((glyph, index) => {
    const count = [7, 6, 5, 3, 2, 1][index];
    BLOCK_BARS[glyph] = [bar("0px", eighth("1ch", count), "0px", "1lh")];
  });

  // braille: a 2 x 4 grid of dots, each a quarter of the cell wide and an
  // eighth of the row tall, centered in its quarter, one bit each (dots 1-3
  // and 7 down the left column, 4-6 and 8 down the right). charcell's grip,
  // `⠿`, is dots 1 to 6, drawn the same way by the kit's `grip` mixin.
  const BRAILLE_DOTS = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 3],
    [1, 3],
  ];
  function braille(glyph) {
    const code = glyph.codePointAt(0) - 0x2800;
    if (code < 0 || code > 0xff) return undefined;
    return BRAILLE_DOTS.filter((_, bit) => code & (1 << bit)).map(
      ([column, row]) => {
        const x = `round(calc(1ch * ${1 + 4 * column} / 8), 1px)`;
        const y = `round(calc(1lh * ${1 + 4 * row} / 16), 1px)`;
        return bar(
          x,
          `calc(${x} + round(calc(1ch / 4), 1px))`,
          y,
          `calc(${y} + round(calc(1lh / 8), 1px))`,
        );
      },
    );
  }

  // The background that draws a glyph, or undefined for one the font draws.
  function drawn(glyph) {
    const bars =
      DOUBLE[glyph] ??
      (ARCS[glyph] && arcBars(glyph)) ??
      BLOCK_BARS[glyph] ??
      (ARMS[glyph] && armBars(ARMS[glyph])) ??
      braille(glyph);
    return bars ? bars.join(", ") : undefined;
  }

  // ── rendering ───────────────────────────────────────────────────────────────
  // markup to HTML. With `draw` (the default), box-drawing and block glyphs are
  // drawn cells (`.drawn`, their bars in the background); without it, the
  // font's. The comparison page and the docs site both take this string.
  // The class each markup code sets on its cells, in cells.css.
  const CODE_CLASSES = {
    i: "inverted",
    I: "inverted-dim",
    w: "wash",
    M: "mid-fill",
    m: "mid",
    f: "faint",
    s: "strong",
    b: "bold",
    e: "italic",
    u: "underline",
    d: "dotted",
    x: "struck",
  };
  const escape = (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ??
    character;
  function renderHtml(text, { draw = true } = {}) {
    let out = "";
    let depth = 0;
    for (let index = 0; index < text.length; index++) {
      const match = /^\{([A-Za-z]+)\|/.exec(text.slice(index));
      const background = draw ? drawn(text[index]) : undefined;
      if (match) {
        out += `<span class="${[...match[1]].map((code) => CODE_CLASSES[code]).join(" ")}">`;
        depth++;
        index += match[0].length - 1;
      } else if (text[index] === "}" && depth > 0) {
        out += "</span>";
        depth--;
      } else if (background) {
        out += `<span class="drawn" style="background: ${escape(background).replace(/"/g, "&quot;")}">${escape(text[index])}</span>`;
      } else {
        out += [...text[index]].map(escape).join("");
      }
    }
    return out + "</span>".repeat(depth);
  }

  // The same, as DOM, for the pages that build themselves in the browser.
  function render(text, options) {
    const template = document.createElement("template");
    template.innerHTML = renderHtml(text, options);
    return template.content;
  }

  const api = {
    FAMILIES,
    drawn,
    strip,
    width,
    pad,
    tone,
    ring,
    beside,
    table,
    folderTabs,
    render,
    renderHtml,
    COMPONENTS,
    CASES,
    CASE_GROUPS,
    BOX,
    BLOCKS,
    EXTRA,
    range,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CharcellText = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
