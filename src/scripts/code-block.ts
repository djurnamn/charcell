// What repeated presses select in a code block: a double press the source
// line under the pointer, however many rows it wraps across, and a triple
// press the whole block (`charcell/scripts`).

/** The start and end of the source line holding `offset` in `text`, its
 *  line break left out. */
export function sourceLineAt(text: string, offset: number): [number, number] {
  const start = offset <= 0 ? 0 : text.lastIndexOf("\n", offset - 1) + 1;
  const next = text.indexOf("\n", offset);
  return [start, next === -1 ? text.length : next];
}

/** The caret under a point, in the spelling each engine has. */
function caretAt(document: Document, x: number, y: number) {
  const position = document.caretPositionFromPoint?.(x, y);
  if (position)
    return { node: position.offsetNode, offset: position.offset as number };
  const range = document.caretRangeFromPoint?.(x, y);
  return range
    ? { node: range.startContainer as Node, offset: range.startOffset }
    : undefined;
}

/**
 * On a press in a code block (its root, the event's `currentTarget`): selects
 * the source line on a double press and the whole code on a triple one, in
 * place of the browser's word and line. A single press is left alone.
 */
export function selectCodeOnPress(event: {
  button: number;
  detail: number;
  clientX: number;
  clientY: number;
  currentTarget: EventTarget | null;
  preventDefault(): void;
}) {
  if (event.button !== 0 || event.detail < 2) return;
  const block = event.currentTarget;
  if (!(block instanceof HTMLElement)) return;
  const code = block.querySelector("code");
  const text = [...(code?.childNodes ?? [])].find(
    (node): node is Text => node instanceof Text,
  );
  if (!code || !text) return;
  event.preventDefault();
  const length = text.data.replace(/\n$/, "").length;
  let start = 0;
  let end = length;
  if (event.detail === 2) {
    const caret = caretAt(block.ownerDocument, event.clientX, event.clientY);
    // Off the text, on the padding, the nearest end of it.
    const offset =
      caret?.node === text
        ? Math.min(caret.offset, length)
        : event.clientY < code.getBoundingClientRect().top
          ? 0
          : length;
    [start, end] = sourceLineAt(text.data.slice(0, length), offset);
  }
  block.ownerDocument.getSelection()?.setBaseAndExtent(text, start, text, end);
}
