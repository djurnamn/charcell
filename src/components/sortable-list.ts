import { defineTemplate } from "@js-template-engine/types";

/**
 * `SortableList` - a list the user reorders: the hand-written
 * `SortableListDriver` (the drag, on one `SortableGroupEngine`) composed with
 * `SortableListVisual`, a `SortableItemDriver` per item (its row's place in
 * the drag, and the lists nested in it) and that item's `SortableRow`.
 *
 * **One grip, three uses.** The grip drags; the up and down arrow keys move
 * its item a step; and a click that is not a drag picks the item up, so a
 * click on another item's grip places it there (a second click on the same
 * grip, escape, or a press anywhere else lets it go) - the single-pointer
 * alternative wcag 2.2 sc 2.5.7 asks for. A grip is one cell in a one-row
 * item, smaller than the 24px target size of sc 2.5.8 and too close to its
 * neighbors for the spacing exception; `spacious` gives each item two rows,
 * the grip both rows tall, which meets it.
 *
 * It keeps its own copy of `items`, synced whenever they change, so it
 * reorders whether or not the consumer feeds them back, and reports
 * `onItemsChange(items)` after every move that touches it. Inside a
 * `SortableGroup` it is one of the group's lists, named by `id`: an item
 * moves into it from any other, and the group reports each move once.
 *
 * A drag within a list moves its item live, the rows it passes jumping to
 * their places; a drag into another list marks where the item lands there
 * (the `drop here` row, inverted) and moves it on the drop.
 *
 * Each item renders through the default slot (`{ item, index, dragging,
 * picked, gripProps }`); an empty list's row through `empty`
 * (`{ state, placeProps }`).
 */
export default defineTemplate({
  type: "component",
  name: "SortableList",
  description: "a list reordered by its grips, with the mouse or the keyboard.",
  typeParameters: ["Item"],
  rest: { tag: "div" },
  extensions: {
    react: {
      // It hands function children to its client drivers, so it is a client module too.
      client: true,
      imports: [
        "import type { SortableListTranslations } from 'charcell/scripts/sortable';",
        "import { SortableListDriver, SortableItemDriver, type SortableGripProps, type SortablePlaceButtonProps } from './SortableListDriver';",
        "import { SortableListVisual } from './SortableListVisual';",
        "import { SortableRow } from './SortableRow';",
        "import { SortablePlace } from './SortablePlace';",
      ],
    },
    vue: {
      imports: [
        "import type { SortableListTranslations } from 'charcell/scripts/sortable';",
        "import SortableListDriver from './SortableListDriver.vue';",
        "import SortableItemDriver from './SortableItemDriver.vue';",
        "import SortableListVisual from './SortableListVisual.vue';",
        "import SortableRow from './SortableRow.vue';",
        "import SortablePlace from './SortablePlace.vue';",
      ],
    },
    svelte: {
      imports: [
        "import type { SortableListTranslations } from 'charcell/scripts/sortable';",
        "import SortableListDriver from './SortableListDriver.svelte';",
        "import SortableItemDriver from './SortableItemDriver.svelte';",
        "import SortableListVisual from './SortableListVisual.svelte';",
        "import SortableRow from './SortableRow.svelte';",
        "import SortablePlace from './SortablePlace.svelte';",
        "export type SortableGripProps = Record<string, unknown>;",
        "export type SortablePlaceButtonProps = { type: 'button'; class: string; onclick: () => void };",
      ],
    },
  },
  props: {
    /** The items, in order. */
    items: { type: "Item[]", required: true },
    /** Called with the list's items after every move that touches it. */
    onItemsChange: { type: "(items: Item[]) => void" },
    /** A list in a group: its name in the group's moves. */
    id: { type: "string" },
    /** A stable key per item. In a group it travels with the item between
     *  lists; without it the list keeps its own keys beside the items. */
    getKey: { type: "(item: Item, index: number) => string" },
    /** The item's name, for its grip ("reorder ben") and what the list says
     *  about it; a string or number item names itself, any other its
     *  position. */
    getLabel: { type: "(item: Item, index: number) => string" },
    /** The item places its own grip: spread `gripProps` on a button anywhere
     *  in it (their class gives it the grip's look and states), and the row
     *  draws no grip column. */
    customGrip: { type: "boolean" },
    /** Each item takes two rows, its grip a cell wide and both rows tall, so
     *  grips sit far enough apart to meet the 24px target size (wcag 2.5.8),
     *  which one-row items fall short of. */
    spacious: { type: "boolean" },
    /** A list on its own: every string it says (English defaults). */
    translations: { type: "SortableListTranslations" },
    /** A list on its own: how a drag moves, `'character'` (the default) in
     *  whole cells, `'row'` in whole rows down only, `'none'` freely. */
    snap: { type: "'character' | 'row' | 'none'", default: "character" },
  },
  children: [
    {
      type: "element",
      tag: "SortableListDriver",
      slotScope: ["list"],
      attributes: {
        items: { $expression: "items" },
        id: { $expression: "id" },
        getKey: { $expression: "getKey" },
        getLabel: { $expression: "getLabel" },
        onItemsChange: { $expression: "onItemsChange" },
        translations: { $expression: "translations" },
        snap: { $expression: "snap" },
        rootProps: { $expression: "rest" },
      },
      children: [
        {
          type: "element",
          tag: "SortableListVisual",
          attributes: {
            $spread: { $expression: "list.rootProps ?? rest" },
            empty: { $expression: "list.empty ?? items.length === 0" },
            spacious: { $expression: "spacious" },
          },
          children: [
            {
              type: "iteration",
              items: "(list.items ?? items)",
              item: "item",
              index: "index",
              key: "list.keys?.[index] ?? index",
              children: [
                {
                  type: "element",
                  tag: "SortableItemDriver",
                  slotScope: ["row"],
                  attributes: {
                    list: { $expression: "list" },
                    index: { $expression: "index" },
                  },
                  children: [
                    // A drag from another list lands before this row.
                    {
                      type: "conditional",
                      conditions: [
                        {
                          statement: "if",
                          condition: "row.markerBefore",
                          children: [
                            {
                              type: "element",
                              tag: "SortablePlace",
                              attributes: {
                                hint: true,
                                target: true,
                                label: {
                                  $expression: "list.labels.dropHereMessage",
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: "element",
                      tag: "SortableRow",
                      attributes: {
                        $spread: { $expression: "row.attach" },
                        engaged: { $expression: "row.engaged" },
                        dragging: { $expression: "row.dragging" },
                        customGrip: { $expression: "customGrip" },
                        gripProps: { $expression: "row.rowGripProps" },
                      },
                      children: [
                        /** An item's row, given the `item`, its `index`, whether it's `dragging` or `picked`, and the `gripProps` an item that places its own grip (`customGrip`) spreads on it. */
                        {
                          type: "slot",
                          exposes: {
                            item: { value: "item", type: "Item" },
                            index: { value: "index", type: "number" },
                            dragging: {
                              value: "row.dragging === true",
                              type: "boolean",
                            },
                            picked: {
                              value: "row.picked === true",
                              type: "boolean",
                            },
                            gripProps: {
                              value: "row.gripProps",
                              type: "SortableGripProps",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            // Or after the last row, or in an empty list's place.
            {
              type: "conditional",
              conditions: [
                {
                  statement: "if",
                  condition: "list.markerAtEnd",
                  children: [
                    {
                      type: "element",
                      tag: "SortablePlace",
                      attributes: {
                        hint: true,
                        target: true,
                        label: { $expression: "list.labels.dropHereMessage" },
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: "conditional",
              conditions: [
                {
                  statement: "if",
                  condition: "list.emptyState && !list.markerAtEnd",
                  children: [
                    /** What an empty list shows in place of its place and drop rows, given its `state`. Spread `placeProps` onto an element to place the picked item there. */
                    {
                      type: "slot",
                      name: "empty",
                      exposes: {
                        state: {
                          value: "list.emptyState",
                          type: "'idle' | 'picked' | 'dragging'",
                        },
                        placeProps: {
                          value: "list.placeProps",
                          type: "SortablePlaceButtonProps",
                        },
                      },
                      fallback: [
                        {
                          type: "conditional",
                          conditions: [
                            {
                              statement: "if",
                              condition: "list.emptyState === 'picked'",
                              children: [
                                {
                                  type: "element",
                                  tag: "SortablePlace",
                                  attributes: {
                                    label: {
                                      $expression: "list.labels.placeHereLabel",
                                    },
                                  },
                                  // svelte's handlers are lowercase props.
                                  extensions: {
                                    react: {
                                      attributes: {
                                        onClick: {
                                          $expression: "list.placeInto",
                                        },
                                      },
                                    },
                                    vue: {
                                      attributes: {
                                        onClick: {
                                          $expression: "list.placeInto",
                                        },
                                      },
                                    },
                                    svelte: {
                                      attributes: {
                                        onclick: {
                                          $expression: "list.placeInto",
                                        },
                                      },
                                    },
                                  },
                                },
                              ],
                            },
                            {
                              statement: "else-if",
                              condition: "list.emptyState === 'dragging'",
                              children: [
                                {
                                  type: "element",
                                  tag: "SortablePlace",
                                  attributes: {
                                    hint: true,
                                    label: {
                                      $expression:
                                        "list.labels.dropHereMessage",
                                    },
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
