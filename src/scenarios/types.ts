// The shapes a component's scenarios are written in: plain data, so the docs
// site and the cell check can each read them in their own terms.

/** A value a prop can take in a scenario. */
export type Value =
  | string
  | number
  | boolean
  | null
  | undefined
  | Value[]
  | { [key: string]: Value };

/**
 * What fills a slot: text, a list of fills, a kit component by name (with
 * its named slots), a plain HTML element, or content the component hands
 * values to. An element's
 * `style` is CSS text and its `class` its classes.
 *
 * Inside a `scope`, the values it names are the component's to give: a text's
 * `{name}` (or `{name.key}`) prints one, a prop set to `{ scope: 'name.key' }`
 * takes one, and an element's `spread` passes one on as its props (a menu's
 * trigger takes the props that open the menu). A scope can rename a value,
 * `'item: child'`, so a scope inside another keeps both apart.
 *
 * Content shaped like its data, lists nested in each other's items, is a
 * `part`: declared once by name, called here with `props`, its body reading
 * its `parameters` as a scope gives values. Inside the body, `call` renders
 * the part again with the props it names, and `when` renders its children
 * only where the scope holds a value at its path, so the part ends where the
 * data does, however deep. With `is`, it renders them only where that value
 * is the one named: a panel's content for one tab.
 */
export type Content =
  | string
  | Content[]
  | {
      component: string;
      props?: Record<string, Value>;
      spread?: string;
      slots?: Record<string, Content>;
      children?: Content;
    }
  | {
      tag: string;
      props?: Record<string, Value>;
      spread?: string;
      children?: Content;
    }
  | { scope: string[]; children: Content }
  | {
      part: string;
      parameters: string[];
      props?: Record<string, Value>;
      children: Content;
    }
  | { call: string; props?: Record<string, Value> }
  | { when: string; is?: string; children: Content };

/** One configuration of a component: the props it sets over the shared ones. */
export interface Scenario {
  id: string;
  label: string;
  /** What the scenario shows and why it is worth a look, beside its
   *  example. */
  description?: string;
  /** The props set over the shared ones; null unsets a shared prop. */
  props?: Record<string, Value>;
  /** The default slot's content, in place of the shared one. */
  children?: Content;
  /** The height this scenario is shown at, in rows, over the component's own. */
  rows?: number;
  /** The configuration a page shows first. At most one. */
  default?: boolean;
  /** Made by `withGenerated` from one enum value or boolean. */
  generated?: boolean;
  /**
   * States no markup can carry, forced on the first element each selector
   * finds: a checkbox's `indeterminate` is a property with no attribute.
   */
  forced?: Record<string, "indeterminate">;
  /**
   * What the cell check reads in place of the scenario, for one that shows
   * nothing on its own: a vertical separator, between two words.
   */
  check?: Content;
  /**
   * The scenario is for the cell check alone: what it is named for is the
   * composition its `check` draws (a line joining a frame's ring), which
   * the component's own example cannot show, so it shows on no page.
   */
  checkOnly?: true;
  /**
   * Looks no prop and no stylesheet state reaches, each drawn from the
   * component's parts: an open select, an item picked up.
   */
  states?: Record<string, Content>;
}

/** A component's scenarios and what they share. */
export interface ComponentScenarios {
  /** The props every scenario starts from. */
  props?: Record<string, Value>;
  /** The default slot. An empty list is an empty slot. */
  children?: Content;
  /** The named slots. */
  slots?: Record<string, Content>;
  /**
   * The width a component that fills its container is shown at, in cells;
   * one that sizes itself leaves it out.
   */
  columns?: number;
  /**
   * The height of the container a component that takes its height from one
   * is shown in, in rows, on every page: ten for a split, room for a stacked
   * boundary to step a few rows either way, and fewer than a scroll area's
   * content. One that sizes itself leaves it out.
   */
  rows?: number;
  scenarios: Scenario[];
}
