<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { createAttachmentKey } from "svelte/attachments";
  import { TreeEngine } from "charcell/scripts/tree";

  /**
   * `TreeDriver` (Svelte) - pure behavior, the cross-target counterpart:
   * attaches charcell's `TreeEngine` to the root its scoped snippet
   * (`children({ tree })`) spreads `tree.rootProps` onto. See the React
   * driver.
   */
  let {
    rootProps = undefined,
    children,
  }: {
    /** The consumer's attributes for the root. */
    rootProps?: Record<string, unknown>;
    children?: Snippet<
      [
        {
          tree: {
            rootProps: Record<string | symbol, unknown>;
            scripted: boolean;
          };
        },
      ]
    >;
  } = $props();

  // The root's element, through the attachment spread on it.
  const attachKey = createAttachmentKey();
  const attachRoot = (element: Element) => {
    if (!(element instanceof HTMLElement)) return;
    const engine = new TreeEngine(element);
    return () => engine.destroy();
  };
  // Running in the browser: the root's fallback for a failed page is off.
  let scripted = $state(false);
  onMount(() => {
    scripted = true;
  });
  const tree = $derived({
    rootProps: { ...rootProps, [attachKey]: attachRoot },
    scripted,
  });
</script>

{@render children?.({ tree })}
