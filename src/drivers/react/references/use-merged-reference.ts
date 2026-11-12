import { useCallback, useRef, type Ref } from "react";

/**
 * One stable ref callback that sets the driver's own reference and the
 * consumer's. A new callback each render would make React detach and attach
 * again, destroying and rebuilding whatever the driver attaches by its ref;
 * this one keeps its identity and reads the consumer's ref at call time.
 */
export function useMergedReference<Element>(
  own: Ref<Element>,
  consumer: Ref<Element> | undefined,
): (element: Element | null) => void {
  const references = useRef({ own, consumer });
  references.current = { own, consumer };
  return useCallback((element: Element | null) => {
    for (const reference of [
      references.current.own,
      references.current.consumer,
    ]) {
      if (typeof reference === "function") reference(element);
      else if (reference)
        (reference as { current: Element | null }).current = element;
    }
  }, []);
}
