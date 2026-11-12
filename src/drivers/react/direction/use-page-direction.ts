import { useEffect, useState } from "react";
import {
  pageDirectionOf,
  type TextDirection,
} from "charcell/scripts/direction";

/**
 * The reading direction a driver hands its machine: `given`, the call site's,
 * or else the one the page lays the component out in, read once it is
 * mounted (`pageDirectionOf` on the first of `ids` on the page). Undefined
 * until then, which the machine takes as left to right, as a server render
 * does.
 */
export function usePageDirection(
  given: TextDirection | undefined,
  ids: () => unknown[],
): TextDirection | undefined {
  const [page, setPage] = useState<TextDirection>();
  useEffect(() => {
    if (given === undefined) setPage(pageDirectionOf(...ids()));
  }, [given]);
  return given ?? page;
}
