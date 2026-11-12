"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { TreeEngine } from "charcell/scripts/tree";
import { useMergedReference } from "./references/use-merged-reference";

/**
 * `TreeDriver` - pure behavior: attaches charcell's `TreeEngine` (one tab
 * stop, the arrow keys, type-ahead) to the root its scoped slot
 * (`children({ tree })`) spreads `tree.rootProps` onto, `TreeVisual`'s;
 * `tree.scripted` once it has mounted, never on the server. No
 * markup or styles; the generated `Tree` compound composes the two.
 */
export interface TreeDriverProps {
  /** The consumer's attributes for the root, its ref among them. */
  rootProps?: Record<string, unknown>;
  /** Scoped slot: the root's props, with the ref the engine attaches by. */
  children: (scope: {
    tree: { rootProps: Record<string, unknown>; scripted: boolean };
  }) => ReactNode;
}

export function TreeDriver({ rootProps, children }: TreeDriverProps) {
  const engine = useRef<TreeEngine | null>(null);
  // The engine, on the root's element while it is in the document.
  const attach = useRef((element: HTMLElement | null) => {
    engine.current?.destroy();
    engine.current = element ? new TreeEngine(element) : null;
  }).current;
  const reference = useMergedReference(
    attach,
    rootProps?.ref as Ref<HTMLElement> | undefined,
  );
  // Running in the browser: the root's fallback for a failed page is off.
  const [scripted, setScripted] = useState(false);
  useEffect(() => setScripted(true), []);
  return children({
    tree: {
      rootProps: {
        ...rootProps,
        ref: reference,
      },
      scripted,
    },
  });
}
