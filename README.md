```text
       ▄▄                                  ▄▄  ▄▄
      ▀██                                 ▀██ ▀██
▄█▀▀█▄ ██▀▀█▄ ▄▀▀▀█▄ ▀█▄▀▀█▄ ▄█▀▀█▄ ▄█▀▀█▄ ██  ██
██     ██  ██ ▄█▀▀██  ██  ▀  ██     ██▄▄█▀ ██  ██
▀█▄▄▄▀ ██  ██▀▀█▄▄▀█▄▄██▄    ▀█▄▄▄▀ ▀█▄▄▄▀ ██▀ ██▀
```

charcell is a ui kit for react, vue and svelte that looks like a terminal. it
draws only what a character-cell screen could: every component sits on a grid
of cells, and each cell holds one character, its font color and background
color. it relies on box drawing characters for framing and segmentation. the
palette is black, white and three shades of gray. those constraints are the
design.

demo: [djurnamn.github.io/charcell](https://djurnamn.github.io/charcell/)

## install

```
pnpm add charcell @zag-js/react    # or @zag-js/vue, @zag-js/svelte
```

load base and the preflight once, then import components from your
framework's entry:

```tsx
import 'charcell/css/base';
import 'charcell/css/preflight';
import { Button } from 'charcell/react';

<Button label="kick" />
```

`charcell/vue` and `charcell/svelte` export the same components. the
[use](https://djurnamn.github.io/charcell/use/) page covers the rest: the
stylesheets, bundler setup, binding values, copying components to own them,
cascade layers and modes, accessibility and the browsers charcell needs.

## status

pre-1.0: until then, a minor version may break. each release's changes are in
the [changelog](CHANGELOG.md).

## fonts

charcell bundles two fonts: overpass mono for upright text and lilex italic for
italics. both are modified to fit the cell exactly, 8 x 16 pixels at 14px, and
renamed charcell overpass mono and charcell lilex. the box drawing, block,
shade and braille characters are redrawn as whole-pixel shapes, and ❯, ❮, the
triangles, the bullets and the pipe are drawn to fit the cell.

## your own font

another monospace font can replace the bundled ones once it's adjusted to the
cell: [guides/your-own-font.md](guides/your-own-font.md).

## develop

```
pnpm install
pnpm build        # dist/<target>/, the stylesheets and the fonts
pnpm test         # the css conventions, a smoke per framework and the text checks
pnpm verify       # the format and lint checks, the build, the typecheck and the
                  # suite, in order
```

each component is held to its text version, saved in `test/text/snapshots/`.
after a change to how one looks, `pnpm text:build` renders the scenarios again
and `pnpm text:accept` reads them back into new snapshots, to review in the
diff like any other change.

the fonts are built from their upstream sources with
`python3 scripts/font/build.py` (fonttools and brotli).
[guides/your-own-font.md](guides/your-own-font.md) covers what it does.

## license

charcell is [mit](LICENSE). the fonts are under the sil open font license 1.1,
and their licenses ship beside them in `dist/fonts/`.
