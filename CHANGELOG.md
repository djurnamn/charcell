# changelog

notable changes to charcell. the format follows
[keep a changelog](https://keepachangelog.com/en/1.1.0/). versions follow
[semantic versioning](https://semver.org/) from 1.0. before that, a minor
version may break.

## [0.1.0] - 2026-11-12

the first release: a monochrome, monospace ui kit that draws only what a
character-cell terminal could, for react, vue and svelte.

### Added

- `Button`, `Toggle`, `Checkbox`, `RadioGroup`, `Tree` with `TreeItem` and
  `TreeGroup`, `Accordion` with `AccordionItem`, `Frame`, `Field`,
  `TextInput`, `Textarea`, `Separator`, `InlineMessage`, `Table`, `Progress` and
  `RichText`
- `Select`, `Splitter`, `SplitGrid`, `Popover`, `Dialog`, `ActionMenu` and `Tabs`,
  on [zag](https://zagjs.com) machines
- `CodeBlock`: lines of code on the `faint` wash, scrolling a cell at a time
  or wrapping with `wrap`, a double press selecting a source line and a triple
  the block
- `legendEnd` on `Frame`, at the far end of its title row
- `SortableList` and `SortableGroup`, reordering by drag, arrow keys or click
  and place, on [dnd-kit](https://dndkit.com)'s dom layer
- `border` on the components with a ring, a boxed `Toggle` and a `Tooltip`
  aside: `single`, `rounded`, `heavy`,
  `double` or `none`, set per side through `borderX`, `borderY`, `borderTop`
  and the rest, each corner the box drawing glyph its two sides make
- a `Splitter` snapping its boundaries to whole columns side by side and to
  whole rows stacked, with each press of an arrow key stepping one cell. when
  its panels change, the ones that stay keep their cells, and a panel that
  leaves comes back at its last size. a panel's
  `minimumCells` is the least it keeps, in whole cells, and `keep` holds a panel's
  cells when the split resizes, as a terminal's sidebar keeps its columns
- a `ScrollArea` that scrolls a whole row at a time where the browser can
  paint it so (fluidly elsewhere), keeping the browser's own momentum and
  bounce, with a scrollbar drawn in cells (a track of `faint` cells and a
  step button at each end), hidden or native. `Select`'s listbox and `ActionMenu`
  scroll their items in one, keeping the active item in view
- a `SplitGrid` of panes in columns and rows, each handle moving its
  boundary through the whole grid and a press where two cross moving both,
  snapped to whole columns and rows. a track's `minimumCells` is the least it
  keeps, `keepCells` holds its cells when the grid resizes, and `defaultCells`
  starts it at a count of cells, or at its content's own length
- a `Tooltip`: a short hint beside a control on hover or keyboard focus, in a
  ring at `mid`
- a `Combobox`: a Select to type in, its list narrowing to the items whose
  label holds what the reader typed
- `fit: 'value'` on `Select`, sizing the trigger to its chosen value, the list
  opening as wide as its items and meeting the trigger at a junction
- a `Tree` that is one tab stop, moved through with the arrow keys, home,
  end and typing a label, as the ARIA tree pattern has it; its groups open
  and close with `[–]` and `[+]` at the row's end, `mid` at every depth.
  `disclosure` swaps the mark for `▾` and `▸`, and `disclosurePosition` moves
  it beside the label or to the row's start
- content on a stacked split's handle: `handleStart` and `handleEnd` on
  `Splitter`, `rowHandleStart` and `rowHandleEnd` on `SplitGrid`, packed at
  the row's start and end around the grip (`SplitterHandleRow`,
  `SplitGridHandleRow`), and `rowGrips` for one grip on a grid's row handle
- `join` on `Separator` and on the ruled handles (`rule`) of `Splitter` and
  `SplitGrid`, running a
  line's ends on to meet a frame's ring or the line beside it, as box drawing
  joins them (`├ ┤ ┬ ┴`)
- `Popover`, `Select` and `ActionMenu` opening a whole number of cells from their
  trigger, on whole pixels, even when moved to fit the screen
- `fill` on `Frame`, `Splitter`, `SplitterVisual`, `SplitGrid`,
  `SplitGridVisual`, `ScrollArea`, `ScrollAreaVisual`, `Tabs`, `TabPanel` and
  `CodeBlock`,
  which sizes the component by its container in a flex, grid or block layout
- `width` and `minWidth` on `Popover`, `Dialog` and `ActionMenu` and their panels,
  in whole cells with the ring included
- two ways to take the styles: components that link their own stylesheets
  beside `charcell/css/base`, or the `charcell/css` bundle with
  `charcell/<target>/unlinked`. every style rule sits in a `charcell.*` cascade
  layer and none targets a bare element. `charcell/css/preflight` lets
  charcell own the page.
- light and dark modes through `data-charcell-mode`
- the `hidden` attribute hiding any component, a split's panels and a
  grid's cells included
- a description on every component, shown by your editor when you hover it
- overpass mono and lilex italic, tuned to an exact 8 x 16 cell, with the box
  drawing, block, shade and braille characters redrawn on whole pixels
- `npx charcell add`, which copies components into a project
- each component's markup in `dist/html`, for reference
