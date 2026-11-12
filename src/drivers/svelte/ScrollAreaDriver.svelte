<script lang="ts">
  import type { Snippet } from "svelte";
  import { createAttachmentKey } from "svelte/attachments";
  import {
    ScrollAreaEngine,
    type ScrollAreaOrientation,
  } from "charcell/scripts/scroll-area";

  /**
   * `ScrollAreaDriver` (Svelte) - pure behavior, the cross-target
   * counterpart: attaches charcell's `ScrollAreaEngine` to the root its
   * scoped snippet (`children({ area })`) spreads `area.rootProps` onto.
   * See the React driver.
   */
  let {
    scrolling = "stepped",
    orientation = "vertical",
    rootProps = undefined,
    children,
  }: {
    /** `stepped` paints the content at whole rows and columns; `fluid` as the browser scrolls it. */
    scrolling?: "stepped" | "fluid";
    /** The axes that scroll. */
    orientation?: ScrollAreaOrientation;
    /** The consumer's attributes for the root. */
    rootProps?: Record<string, unknown>;
    children?: Snippet<
      [{ area: { rootProps: Record<string | symbol, unknown> } }]
    >;
  } = $props();

  let engine: ScrollAreaEngine | undefined;
  // The root's element, through the attachment spread on it.
  const attachKey = createAttachmentKey();
  const attachRoot = (element: Element) => {
    if (!(element instanceof HTMLElement)) return;
    engine = new ScrollAreaEngine(element, {
      stepped: scrolling !== "fluid",
      orientation,
    });
    return () => {
      engine?.destroy();
      engine = undefined;
    };
  };
  $effect(() => {
    engine?.update({ stepped: scrolling !== "fluid", orientation });
  });
  const area = $derived({
    rootProps: { ...rootProps, [attachKey]: attachRoot },
  });
</script>

{@render children?.({ area })}
