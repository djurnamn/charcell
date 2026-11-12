/**
 * What a split on the character grid keeps beside its Zag `splitter`
 * machine, the same in every target: the snapped sizes the machine is
 * controlled on, the percent one cell takes (the arrow keys' step), whether
 * the start in cells still stands, the panels that joined at their content,
 * and the cells a panel that left will come back with. Each driver runs the
 * machine and re-renders when the split says it changed; the split reads the
 * driver's settings afresh each time it acts.
 *
 * The sizes are held here, not in a framework's state, so a change is read
 * back at once: an arrow key that follows another before a render steps from
 * where the first left.
 */
import {
  carrySizesIn,
  holdCharacterGrid,
  joiningAtContent,
  measureCellSize,
  measurePanelSpace,
  panelMinimums,
  snapToCharacterGrid,
  splitStart,
  startContent,
  startingSizesIn,
  withCellSteps,
  withExactPanels,
  withHeldPointer,
  withOpenEdges,
  withReset,
  type Redistribution,
  type SplitOrientation,
  type TrackMemory,
} from "./character-snap";

/** A panel as the split takes it: its id, its limits in percent, and,
 *  snapping, in cells. */
export interface SplitterPanelSpecification {
  id: string;
  /** The least the panel takes, in percent of the split. */
  minimumSize?: number;
  /** The most the panel takes, in percent of the split. */
  maximumSize?: number;
  /** The least the panel keeps in whole cells, held by the snapping. */
  minimumCells?: number;
  /** The panel keeps its cells when the split resizes, the others
   *  taking the difference. */
  keepCells?: boolean;
  /** Where the panel starts, in whole cells: a count, or `'content'`, the
   *  length its content takes, up to `contentCap`. Over `defaultSize`. */
  defaultCells?: number | "content";
  /** The most a panel starting at its content takes, in percent of the
   *  split (50 by default). */
  contentCap?: number;
}

/** What a split reads from its driver each time it acts. */
export interface SnappedSplitSettings {
  /** Whether the split holds the character grid: `snap: 'character'` with
   *  no `size` given, since a controlled consumer does its own snapping. */
  snapping: boolean;
  orientation: SplitOrientation;
  panels: SplitterPanelSpecification[];
  defaultSize?: number[];
  /** How the cells are shared when the panels change (`Redistribution`): a
   *  leaving panel's to the panel beside it, the default, or to every panel
   *  that stays, by its length. */
  redistribute?: Redistribution;
  /** The element the panels and handles lie in, measured for the grid,
   *  when it is not the split's root (a grid's rows). */
  measure?: () => HTMLElement | null;
  /** The elements a panel's content lies in, measured for a start at its
   *  content (`defaultCells: 'content'`): the panel by default, a track's
   *  cells in a grid. */
  contentOf?: (id: string) => (HTMLElement | null)[];
}

/** The parts of a connected splitter api the split reads and wraps. */
export interface SnappedSplitApi {
  getRootProps(): { id?: unknown; style?: unknown };
  getPanelProps(props: { id: string }): { id?: unknown; style?: unknown };
  getResizeTriggerProps(props: { id: string; disabled?: boolean }): object;
  getSizes(): number[];
  resetSizes(): void;
}

const keyOf = (panels: SplitterPanelSpecification[]) =>
  panels.map((panel) => panel.id).join("\n");

const elementById = (id: unknown) =>
  typeof id === "string" ? document.getElementById(id) : null;

export class SnappedSplit {
  #sizes: number[] | undefined;
  #step: number | undefined;
  // A start in cells stands until the reader moves the split or its panel set
  // changes; it is measured again at every hold until then.
  #settled = false;
  // The panels that joined the set starting at their content, fitted to it
  // once they render.
  #joined: string[] = [];
  // A panel that left, and the cells it comes back with (`carrySizes`).
  readonly #memory = new Map<string, TrackMemory>();
  #heldPanels: string;
  readonly #listeners = new Set<() => void>();

  readonly #settings: () => SnappedSplitSettings;
  readonly #api: () => SnappedSplitApi | undefined;

  /**
   * @param settings - The driver's settings, read afresh each time.
   * @param api - The machine's connected api, once there is one.
   */
  constructor(
    settings: () => SnappedSplitSettings,
    api: () => SnappedSplitApi | undefined,
  ) {
    this.#settings = settings;
    this.#api = api;
    const initial = settings();
    this.#sizes = initial.defaultSize;
    this.#heldPanels = keyOf(initial.panels);
  }

  /** The snapped sizes the machine is controlled on; the `defaultSize` until
   *  the split holds the grid. */
  get sizes(): number[] | undefined {
    return this.#sizes;
  }

  /** One cell as a percentage while snapping, once measured. */
  get step(): number | undefined {
    return this.#step;
  }

  /** Call `listener` after each change to `sizes` or `step`. */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #changed() {
    for (const listener of this.#listeners) listener();
  }

  #apply = (sizes: number[]) => {
    this.#sizes = sizes;
    this.#changed();
  };

  #held = () => this.#sizes ?? this.#api()?.getSizes() ?? [];

  /** The element the panels share: the root, or the grid it holds. */
  #measured = () =>
    this.#settings().measure?.() ?? elementById(this.#api()?.getRootProps().id);

  /** The elements a panel's content lies in: its own, by default. */
  #contentOf = (id: string) => {
    const given = this.#settings().contentOf;
    if (given) return given(id);
    return [elementById(this.#api()?.getPanelProps({ id }).id)];
  };

  /**
   * The machine reported a resize, by a drag or a key it handled itself: the
   * start no longer stands, and snapping, the sizes land on whole cells.
   */
  resized(size: number[]): void {
    const { snapping, orientation, panels } = this.#settings();
    this.#settled = true;
    if (!snapping) return;
    const element = this.#measured();
    if (!element) return;
    this.#apply(
      snapToCharacterGrid(
        size,
        measurePanelSpace(element, orientation),
        measureCellSize(element, orientation),
        panelMinimums(panels, orientation),
      ),
    );
  }

  /**
   * Carry the sizes to a new panel set, if the set changed: the panels that
   * stay keep their cells and a panel that comes back returns at its own,
   * measured in the layout the old set still has. Asked again for the same
   * set, it does nothing, so a render of the same change again (React's
   * strict mode, or a render it throws away) keeps the first one's result.
   * Returns whether the set changed.
   */
  carryPanels(): boolean {
    const { panels, orientation, defaultSize, redistribute } = this.#settings();
    const key = keyOf(panels);
    if (key === this.#heldPanels) return false;
    const previousIds = this.#heldPanels.split("\n");
    this.#heldPanels = key;
    this.#joined = joiningAtContent(panels, previousIds, this.#memory);
    this.#settled = this.#joined.length === 0;
    const carried = carrySizesIn(this.#measured(), {
      orientation,
      previousIds,
      previousSizes: this.#held(),
      panels,
      defaultSize,
      memory: this.#memory,
      redistribute,
    });
    this.#sizes = carried;
    this.#changed();
    return true;
  }

  /**
   * Hold the grid in the split's element while it is mounted: the starting
   * sizes, and the sizes after the container resizes, as well as those a
   * drag reports. Returns the release; not snapping, or before the element
   * is in the document, there is nothing to hold.
   */
  hold(): () => void {
    const { snapping, orientation } = this.#settings();
    if (!snapping) return () => {};
    const element = this.#measured();
    if (!element) return () => {};
    return holdCharacterGrid(
      element,
      this.#held,
      this.#apply,
      (percent) => {
        this.#step = percent;
        this.#changed();
      },
      orientation,
      () => this.#settings().panels,
      (space, cell) => {
        const { panels, defaultSize } = this.#settings();
        return splitStart({
          settled: this.#settled,
          joined: this.#joined,
          sizes: this.#held(),
          panels,
          space,
          cell,
          content: this.#contentOf,
          defaultSize,
          orientation,
        });
      },
      () =>
        startContent(
          this.#settled,
          this.#joined,
          this.#settings().panels,
          this.#contentOf,
        ),
    );
  }

  /** Back where the split started, measured as at mount and standing until
   *  the reader moves it again. */
  reset = (): void => {
    const { panels, defaultSize, orientation } = this.#settings();
    const next = startingSizesIn(this.#measured(), {
      panels,
      defaultSize,
      orientation,
      content: this.#contentOf,
    });
    if (!next) return;
    this.#settled = false;
    this.#joined = [];
    this.#apply(next);
  };

  /**
   * The api as the parts read it: the edges open to joined lines and the
   * pointer held through a drag; snapping, the panels at the exact snapped
   * sizes past Zag's rounding, the arrow keys stepping a cell from them, and
   * `resetSizes` putting the split back where it started.
   */
  wrap<Api extends SnappedSplitApi>(api: Api): Api {
    const { snapping, panels, orientation } = this.#settings();
    const open = withHeldPointer(withOpenEdges(api));
    if (!snapping) return open;
    return withReset(
      withCellSteps(
        withExactPanels(
          open,
          panels.map((panel) => panel.id),
          this.#sizes,
        ),
        {
          panels,
          sizes: this.#held,
          apply: (next) => {
            this.#settled = true;
            this.#apply(next);
          },
          orientation,
        },
      ),
      this.reset,
    );
  }
}
