"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";
import {
  ScrollAreaEngine,
  type ScrollAreaOrientation,
} from "charcell/scripts/scroll-area";
import { useMergedReference } from "./references/use-merged-reference";

/**
 * `ScrollAreaDriver` - pure behavior: attaches charcell's `ScrollAreaEngine`
 * (whole rows, the settle at rest, the keys, the scrollbar drawn in cells)
 * to the root its scoped slot (`children({ area })`) spreads
 * `area.rootProps` onto, `ScrollAreaVisual`'s. No markup or styles; the
 * generated `ScrollArea` compound composes the two.
 */
export interface ScrollAreaDriverProps {
  /** `stepped` paints the content at whole rows and columns; `fluid` as the browser scrolls it. */
  scrolling?: "stepped" | "fluid";
  /** The axes that scroll. */
  orientation?: ScrollAreaOrientation;
  /** The consumer's attributes for the root, its ref among them. */
  rootProps?: Record<string, unknown>;
  /** Scoped slot: the root's props, with the ref the engine attaches by. */
  children: (scope: {
    area: { rootProps: Record<string, unknown> };
  }) => ReactNode;
}

export function ScrollAreaDriver({
  scrolling = "stepped",
  orientation = "vertical",
  rootProps,
  children,
}: ScrollAreaDriverProps) {
  const engine = useRef<ScrollAreaEngine | null>(null);
  const options = { stepped: scrolling !== "fluid", orientation };
  const optionsReference = useRef(options);
  optionsReference.current = options;
  // The engine, on the root's element while it is in the document.
  const attach = useRef((element: HTMLElement | null) => {
    engine.current?.destroy();
    engine.current = element
      ? new ScrollAreaEngine(element, optionsReference.current)
      : null;
  }).current;
  useEffect(() => {
    engine.current?.update({ stepped: scrolling !== "fluid", orientation });
  }, [scrolling, orientation]);
  const reference = useMergedReference(
    attach,
    rootProps?.ref as Ref<HTMLElement> | undefined,
  );
  return children({
    area: {
      rootProps: {
        ...rootProps,
        ref: reference,
      },
    },
  });
}
