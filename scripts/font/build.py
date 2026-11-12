"""
builds charcell's faces from their upstream variable fonts beside this
script (both ofl):

- `src/styles/fonts/OverpassMono.woff2`, the upright, from overpass mono:
  units per em 2000 -> 2002, a uniform 0.1% smaller, so `size-adjust` can
  land the face at 13px (chromium rounds the adjusted size to 0.01px), where
  its 1232-unit advance is exactly 8px and one pixel is exactly 154 units.
  renamed charcell overpass mono.
- `src/styles/fonts/LilexItalic.woff2`, the italic, from lilex italic:
  units per em 1000 -> 975, a uniform 2.6% larger, so at the same 13px its
  600-unit advance is exactly 8px and one pixel is exactly 75 units; both
  faces share one `size-adjust` and one line box. renamed charcell lilex.

into each:

1. the cell graphics drawn in: box drawing (U+2500-257F, all but the
   diagonals), block elements and shades (U+2580-259F) and braille
   (U+2800-28FF), as whole-pixel outlines on the 8 x 16 cell, identical to the
   reference renderer in `test/text/cases.cjs`, but for the curves of the
   arcs `╭ ╮ ╯ ╰`, outlines like the type's - the way a terminal draws
   these itself rather than trusting a face's glyphs, which overshoot the cell
   and blur where they overlap. upright in the italic too, as a terminal
   draws them. exact at the tuned 14px token; they scale with the face at
   any other size.
2. with `shapes`, the pointers `❯` and `❮` (U+276F, U+276E), which neither
   face has:
   chevrons with 45-degree arms as thick as overpass mono's bold `l` stem,
   their points on the x-height's center, as wide as the side bearings of the
   bold `>` leave them. and the triangles, each filling a box centered 3px
   above the baseline, on the x-height's center to the nearest pixel so their
   flat sides stay sharp: `▶ ◀ ▲ ▼` (U+25B6, 25C0, 25B2, 25BC) an 8 x 8 box,
   `▸ ◂ ▴ ▾` (U+25B8, 25C2, 25B4, 25BE) a 6 x 6 one; the bullets the same way,
   `●` (U+25CF) a circle filling the 8 x 8 box, `•` (U+2022) the 6 x 6 one;
   and `|`, a 1px bar on the center column a pixel short of the line at
   either end, where overpass mono's reaches past it.
   outlines like the type's,
   measured in pixels so both faces draw the same ones. a matter of taste,
   unlike the cell graphics: a face that has these keeps its own without it.
3. every new glyph's advance on the variation entry that varies nothing:
   every advance is the cell, at every weight.
4. no glyph names (`post` format 3): on macos a glyph named `o` sets every
   glyph's vertical placement, which would leave a faint edge on the cell
   graphics at 1x.

run `python3 scripts/font/build.py` (fontTools and brotli).
"""

import math
import re
import unicodedata
from pathlib import Path

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables

HERE = Path(__file__).parent
FONTS = HERE.parent.parent / 'src/styles/fonts'

EM = 13  # the tuned em, in pixels: `size-adjust` on the 14px token
BASELINE = 11  # the ascent override (84.6154%) in pixels: the line's top, 11px
               # above a baseline chromium snaps to a whole pixel
WIDTH, HEIGHT = 8, 16  # the cell, in pixels

# each face: its source, its output, its units per em (so the advance is the
# 8px cell at the 13px em), its renaming, in the family names and in the
# postscript ones (no spaces), and whether to draw charcell's pointers,
# triangles, bullets and pipe in (`shapes`, off when left out).
FACES = [
    {
        'source': HERE / 'OverpassMono[wght].ttf',
        'target': FONTS / 'OverpassMono.woff2',
        'upem': 2002,
        'family': ('Overpass Mono', 'Charcell Overpass Mono'),
        'postscript': ('OverpassMono', 'CharcellOverpassMono'),
        'shapes': True,
    },
    {
        'source': HERE / 'Lilex-Italic[wght].ttf',
        'target': FONTS / 'LilexItalic.woff2',
        'upem': 975,
        'family': ('Lilex', 'Charcell Lilex'),
        'postscript': ('Lilex', 'CharcellLilex'),
        'shapes': True,
    },
]
C = WIDTH // 2  # the center column, `round(down, 0.5ch, 1px)`
M = HEIGHT // 2  # the center row
G = round(WIDTH / 8)  # a double line's offset either side of the center


def css_round(value):
    """css `round()` to the nearest pixel, ties up."""
    return int(value + 0.5) if value >= 0 else -int(-value + 0.5)


# ── the bars of each glyph, as pixel rectangles (x0, x1, y0, y1; ends
#    exclusive, y down from the cell's top) ──────────────────────────────────


def bar(x0, x1, y0, y1):
    return (x0, x1, y0, y1)


AT = {0: 0, 'W': WIDTH, 'H': HEIGHT, 'c': C, 'm': M, 'x1': C - G, 'x2': C + G, 'y1': M - G, 'y2': M + G}


def after(at):
    return AT[at] if at in ('W', 'H') else AT[at] + 1


def across(y, start, end):
    return bar(AT[start], after(end), AT[y], AT[y] + 1)


def down(x, start, end):
    return bar(AT[x], AT[x] + 1, AT[start], after(end))


def arms(name):
    """the arms of a light, heavy or dashed glyph, from its unicode name."""
    name = name.replace('BOX DRAWINGS ', '')
    dashed = re.match(r'(LIGHT|HEAVY) (DOUBLE|TRIPLE|QUADRUPLE) DASH (HORIZONTAL|VERTICAL)', name)
    if dashed:
        weight = 'l' if dashed.group(1) == 'LIGHT' else 'h'
        count = {'DOUBLE': 2, 'TRIPLE': 3, 'QUADRUPLE': 4}[dashed.group(2)]
        sides = ('l', 'r') if dashed.group(3) == 'HORIZONTAL' else ('u', 'd')
        return {**{side: weight for side in sides}, 'dash': count}
    name = name.replace('ARC ', '')
    directions = {'UP': 'u', 'DOWN': 'd', 'LEFT': 'l', 'RIGHT': 'r', 'VERTICAL': 'ud', 'HORIZONTAL': 'lr'}
    parts = [part.split() for part in name.split(' AND ')]
    default = parts[0][0] if parts[0][0] in ('LIGHT', 'HEAVY') else None
    spec = {}
    for words in parts:
        weight = None
        sides = ''
        for word in words:
            if word in ('LIGHT', 'HEAVY'):
                weight = word
            else:
                sides += directions[word]
        for side in sides:
            spec[side] = 'l' if (weight or default) == 'LIGHT' else 'h'
    return spec


def arm_bars(spec):
    def band(center, weight):
        return (center - 1, center + 1) if weight == 'h' else (center, center + 1)

    u, d, l, r = (spec.get(side) for side in 'udlr')
    heavy_across = 'h' in (l, r)
    heavy_down = 'h' in (u, d)
    bars = []
    if spec.get('dash'):
        count = spec['dash']
        for index in range(count):
            if l:
                y0, y1 = band(M, l)
                bars.append(bar(css_round(WIDTH * index / count), css_round(WIDTH * (index + 1) / count) - 1, y0, y1))
            else:
                x0, x1 = band(C, u)
                bars.append(bar(x0, x1, css_round(HEIGHT * index / count), css_round(HEIGHT * (index + 1) / count) - 1))
        return bars
    if u:
        bars.append(bar(*band(C, u), 0, M + 1))
    if d:
        bars.append(bar(*band(C, d), M - 1 if heavy_across else M, HEIGHT))
    if l:
        bars.append(bar(0, C + 1, *band(M, l)))
    if r:
        bars.append(bar(C - 1 if heavy_down else C, WIDTH, *band(M, r)))
    return bars


a, v = across, down
DOUBLE = {
    '═': [a('y1', 0, 'W'), a('y2', 0, 'W')],
    '║': [v('x1', 0, 'H'), v('x2', 0, 'H')],
    '╒': [a('y1', 'c', 'W'), a('y2', 'c', 'W'), v('c', 'y1', 'H')],
    '╓': [v('x1', 'm', 'H'), v('x2', 'm', 'H'), a('m', 'x1', 'W')],
    '╔': [a('y1', 'x1', 'W'), v('x1', 'y1', 'H'), a('y2', 'x2', 'W'), v('x2', 'y2', 'H')],
    '╕': [a('y1', 0, 'c'), a('y2', 0, 'c'), v('c', 'y1', 'H')],
    '╖': [v('x1', 'm', 'H'), v('x2', 'm', 'H'), a('m', 0, 'x2')],
    '╗': [a('y1', 0, 'x2'), v('x2', 'y1', 'H'), a('y2', 0, 'x1'), v('x1', 'y2', 'H')],
    '╘': [a('y1', 'c', 'W'), a('y2', 'c', 'W'), v('c', 0, 'y2')],
    '╙': [v('x1', 0, 'm'), v('x2', 0, 'm'), a('m', 'x1', 'W')],
    '╚': [a('y2', 'x1', 'W'), v('x1', 0, 'y2'), a('y1', 'x2', 'W'), v('x2', 0, 'y1')],
    '╛': [a('y1', 0, 'c'), a('y2', 0, 'c'), v('c', 0, 'y2')],
    '╜': [v('x1', 0, 'm'), v('x2', 0, 'm'), a('m', 0, 'x2')],
    '╝': [a('y2', 0, 'x2'), v('x2', 0, 'y2'), a('y1', 0, 'x1'), v('x1', 0, 'y1')],
    '╞': [v('c', 0, 'H'), a('y1', 'c', 'W'), a('y2', 'c', 'W')],
    '╟': [v('x1', 0, 'H'), v('x2', 0, 'H'), a('m', 'x2', 'W')],
    '╠': [v('x1', 0, 'H'), v('x2', 0, 'y1'), v('x2', 'y2', 'H'), a('y1', 'x2', 'W'), a('y2', 'x2', 'W')],
    '╡': [v('c', 0, 'H'), a('y1', 0, 'c'), a('y2', 0, 'c')],
    '╢': [v('x1', 0, 'H'), v('x2', 0, 'H'), a('m', 0, 'x1')],
    '╣': [v('x2', 0, 'H'), v('x1', 0, 'y1'), v('x1', 'y2', 'H'), a('y1', 0, 'x1'), a('y2', 0, 'x1')],
    '╤': [a('y1', 0, 'W'), a('y2', 0, 'W'), v('c', 'y2', 'H')],
    '╥': [a('m', 0, 'W'), v('x1', 'm', 'H'), v('x2', 'm', 'H')],
    '╦': [a('y1', 0, 'W'), a('y2', 0, 'x1'), a('y2', 'x2', 'W'), v('x1', 'y2', 'H'), v('x2', 'y2', 'H')],
    '╧': [a('y1', 0, 'W'), a('y2', 0, 'W'), v('c', 0, 'y1')],
    '╨': [a('m', 0, 'W'), v('x1', 0, 'm'), v('x2', 0, 'm')],
    '╩': [a('y2', 0, 'W'), a('y1', 0, 'x1'), a('y1', 'x2', 'W'), v('x1', 0, 'y1'), v('x2', 0, 'y1')],
    '╪': [a('y1', 0, 'W'), a('y2', 0, 'W'), v('c', 0, 'H')],
    '╫': [v('x1', 0, 'H'), v('x2', 0, 'H'), a('m', 0, 'W')],
    '╬': [a('y1', 0, 'x1'), v('x1', 0, 'y1'), a('y1', 'x2', 'W'), v('x2', 0, 'y1'),
          a('y2', 0, 'x1'), v('x1', 'y2', 'H'), a('y2', 'x2', 'W'), v('x2', 'y2', 'H')],
}


def dither(lit):
    """whole pixels lit where `lit(x % 2, y % 2)`, tiled from the cell's corner."""
    return [bar(x, x + 1, y, y + 1) for y in range(HEIGHT) for x in range(WIDTH) if lit(x % 2, y % 2)]


QUARTER = {
    'upper left': bar(0, C, 0, M),
    'upper right': bar(C, WIDTH, 0, M),
    'lower left': bar(0, C, M, HEIGHT),
    'lower right': bar(C, WIDTH, M, HEIGHT),
}
BLOCKS = {
    '▀': [bar(0, WIDTH, 0, M)],
    '▄': [bar(0, WIDTH, M, HEIGHT)],
    '█': [bar(0, WIDTH, 0, HEIGHT)],
    '▌': [bar(0, C, 0, HEIGHT)],
    '▐': [bar(C, WIDTH, 0, HEIGHT)],
    '▔': [bar(0, WIDTH, 0, css_round(HEIGHT / 8))],
    '▕': [bar(css_round(WIDTH * 7 / 8), WIDTH, 0, HEIGHT)],
    '░': dither(lambda x, y: (x, y) == (1, 0)),
    '▒': dither(lambda x, y: x == y),
    '▓': dither(lambda x, y: (x, y) != (1, 0)),
    '▖': [QUARTER['lower left']],
    '▗': [QUARTER['lower right']],
    '▘': [QUARTER['upper left']],
    '▝': [QUARTER['upper right']],
    '▙': [QUARTER['upper left'], QUARTER['lower left'], QUARTER['lower right']],
    '▚': [QUARTER['upper left'], QUARTER['lower right']],
    '▛': [QUARTER['upper left'], QUARTER['upper right'], QUARTER['lower left']],
    '▜': [QUARTER['upper left'], QUARTER['upper right'], QUARTER['lower right']],
    '▞': [QUARTER['upper right'], QUARTER['lower left']],
    '▟': [QUARTER['upper right'], QUARTER['lower left'], QUARTER['lower right']],
}
for glyph, count in zip('▁▂▃▅▆▇', (1, 2, 3, 5, 6, 7)):
    BLOCKS[glyph] = [bar(0, WIDTH, css_round(HEIGHT * (8 - count) / 8), HEIGHT)]
for glyph, count in zip('▉▊▋▍▎▏', (7, 6, 5, 3, 2, 1)):
    BLOCKS[glyph] = [bar(0, css_round(WIDTH * count / 8), 0, HEIGHT)]

BRAILLE_DOTS = [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2), (0, 3), (1, 3)]


def braille(code):
    dot_width, dot_height = css_round(WIDTH / 4), css_round(HEIGHT / 8)
    bars = []
    for bit, (column, row) in enumerate(BRAILLE_DOTS):
        if code & (1 << bit):
            x = css_round(WIDTH * (1 + 4 * column) / 8)
            y = css_round(HEIGHT * (1 + 4 * row) / 16)
            bars.append(bar(x, x + dot_width, y, y + dot_height))
    return bars


# the arcs, `╭ ╮ ╯ ╰`: a 1px quarter circle on the stroke's center line, from
# the center row to the center column, its ends on their pixels, and from
# there the two arms out to the cell's edges, `ARC_REACH` from the center
# pixel. the arms are pixels; the curve is an outline (`arc`), like the type's,
# and the ring and the reference text draw the same curve as a gradient.
ARC_RADIUS = 2.5
ARC_REACH = 3
ARCS = {'\u256D': (1, 1), '\u256E': (-1, 1), '\u256F': (-1, -1), '\u2570': (1, -1)}


def arc_bars(glyph):
    """the arc's two arms."""
    sx, sy = ARCS[glyph]
    return [
        bar(C + ARC_REACH, WIDTH, M, M + 1) if sx > 0 else bar(0, C - ARC_REACH + 1, M, M + 1),
        bar(C, C + 1, M + ARC_REACH, HEIGHT) if sy > 0 else bar(C, C + 1, 0, M - ARC_REACH + 1),
    ]


def cell_graphics():
    glyphs = {}
    for code in range(0x2500, 0x2580):
        glyph = chr(code)
        name = unicodedata.name(glyph)
        if 'DIAGONAL' in name:
            continue
        if glyph in ARCS:
            glyphs[glyph] = arc_bars(glyph)
        else:
            glyphs[glyph] = DOUBLE[glyph] if glyph in DOUBLE else arm_bars(arms(name))
    glyphs.update(BLOCKS)
    for code in range(0x2800, 0x2900):
        glyphs[chr(code)] = braille(code - 0x2800)
    return glyphs


# ── into the font ───────────────────────────────────────────────────────────


def outline(bars, pixel, pen=None):
    """the bars as whole-pixel outlines, `pixel` units to a pixel, added to
    `pen` when given."""
    ascent = BASELINE * pixel
    pen = pen or TTGlyphPen(None)
    for x0, x1, y0, y1 in bars:
        left, right = x0 * pixel, x1 * pixel
        top, bottom = ascent - y0 * pixel, ascent - y1 * pixel
        # clockwise, y up: truetype's outer contour direction.
        pen.moveTo((left, bottom))
        pen.lineTo((left, top))
        pen.lineTo((right, top))
        pen.lineTo((right, bottom))
        pen.closePath()
    return pen.glyph()


def arc(glyph, pixel):
    """`╭ ╮ ╯ ╰`: the arms as pixels, the curve between them a quarter ring
    1px thick, in quadratic segments, each control point where the tangents
    at its ends meet."""
    sx, sy = ARCS[glyph]
    line_x, line_y = C + 0.5, M + 0.5  # the stroke's center lines
    center_x, center_y = line_x + sx * ARC_RADIUS, line_y + sy * ARC_RADIUS
    to_vertical = math.atan2(0, -sx)  # from the center toward the column
    sweep = (math.atan2(-sy, 0) - to_vertical + math.pi) % (2 * math.pi) - math.pi
    segments = 4
    def side(distance):
        """(x, y, on the curve) along the arc, the column's end first, in
        pixels down from the line's top."""
        reach = distance / math.cos(abs(sweep) / segments / 2)
        points = []
        for step in range(segments + 1):
            angle = to_vertical + sweep * step / segments
            if step:
                middle = angle - sweep / segments / 2
                points.append((center_x + reach * math.cos(middle), center_y + reach * math.sin(middle), False))
            points.append((center_x + distance * math.cos(angle), center_y + distance * math.sin(angle), True))
        return points
    def unit(x, y):
        return (round(x * pixel), round((BASELINE - y) * pixel))
    ring = side(ARC_RADIUS + 0.5) + list(reversed(side(ARC_RADIUS - 0.5)))
    on_curve = [unit(x, y) for x, y, on in ring if on]
    area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(on_curve, on_curve[1:] + on_curve[:1]))
    if area > 0:
        ring.reverse()  # clockwise, y up: truetype's outer contour direction
    pen = TTGlyphPen(None)
    pen.moveTo(unit(*ring[0][:2]))
    index = 1
    while index < len(ring):
        x, y, on = ring[index]
        if on:
            pen.lineTo(unit(x, y))
            index += 1
        else:
            pen.qCurveTo(unit(x, y), unit(*ring[index + 1][:2]))
            index += 2
    pen.closePath()
    return outline(arc_bars(glyph), pixel, pen)


# the focus pointer, in pixels at the tuned em, from overpass mono's own
# measures (2000 units to its em, 13px): the bold `l` stem is 230 units, the
# x-height 1022, the bold `>` stands 146 units clear of either side of the
# cell.
POINTER_STEM = 230 / 2000 * EM
POINTER_CENTER = 1022 / 2 / 2000 * EM  # above the baseline
POINTER_BEARING = 146 / 2000 * EM


def circle(diameter, pixel):
    """a filled circle `diameter` pixels across, centered across the cell and
    3px above the baseline: eight quadratic arcs, each control point where the
    tangents at its ends meet."""
    radius = diameter / 2
    center_x, center_y = WIDTH / 2, 3
    pen = TTGlyphPen(None)
    steps = 8
    reach = radius / math.cos(math.pi / steps)  # out to a tangents' crossing
    def at(distance, angle):
        return (round((center_x + distance * math.cos(angle)) * pixel),
                round((center_y + distance * math.sin(angle)) * pixel))
    # clockwise, y up: truetype's outer contour direction.
    pen.moveTo(at(radius, 0))
    for step in range(steps):
        angle = -2 * math.pi * step / steps
        pen.qCurveTo(at(reach, angle - math.pi / steps), at(radius, angle - 2 * math.pi / steps))
    pen.closePath()
    return pen.glyph()


def polygon(points, pixel):
    """one closed outline through `points`, in pixels: x from the cell's left
    edge, y up from the baseline, clockwise (truetype's outer direction)."""
    pen = TTGlyphPen(None)
    pen.moveTo((round(points[0][0] * pixel), round(points[0][1] * pixel)))
    for x, y in points[1:]:
        pen.lineTo((round(x * pixel), round(y * pixel)))
    pen.closePath()
    return pen.glyph()


def mirrored(points):
    """the same outline facing the other way, still clockwise."""
    return [(WIDTH - x, y) for x, y in reversed(points)]


def pointer():
    """`❯`: two arms at 45 degrees, `POINTER_STEM` thick, their ends cut level,
    meeting in a point on the x-height's center; as wide as the bearings leave
    it, which sets its height."""
    left = POINTER_BEARING
    span = WIDTH - 2 * POINTER_BEARING  # the outer point's distance
    run = POINTER_STEM * 2 ** 0.5  # an arm's width along a row
    reach = span - run  # how far each arm climbs and drops from the point
    center = POINTER_CENTER
    return [
        (left, center + reach),
        (left + run, center + reach),
        (left + span, center),
        (left + run, center - reach),
        (left, center - reach),
        (left + reach, center),
    ]


def triangles(size):
    """the four triangles filling a `size` box centered across the cell and
    3px above the baseline: right, left, up and down."""
    x0, x1 = (WIDTH - size) / 2, (WIDTH + size) / 2
    y0, y1 = 3 - size / 2, 3 + size / 2
    middle_x, middle_y = WIDTH / 2, 3
    return [
        [(x0, y0), (x0, y1), (x1, middle_y)],
        [(x1, y0), (x0, middle_y), (x1, y1)],
        [(x0, y0), (middle_x, y1), (x1, y0)],
        [(x0, y1), (x1, y1), (middle_x, y0)],
    ]


def pipe():
    """`|`: a bar on the cell's center column, 1px like overpass mono's
    regular `l` stem, a pixel short of the line at either end, so stacked
    pipes stay apart and read as characters, not as `│`."""
    top, bottom = BASELINE - 1, BASELINE - HEIGHT + 1
    return [(C, bottom), (C, top), (C + 1, top), (C + 1, bottom)]


def outlined_shapes():
    """the pointers, the triangles and the pipe, as outlines in pixels."""
    shapes = {'\u276F': pointer(), '\u276E': mirrored(pointer()), '|': pipe()}
    shapes.update(zip('\u25B6\u25C0\u25B2\u25BC', triangles(8)))
    shapes.update(zip('\u25B8\u25C2\u25B4\u25BE', triangles(6)))
    return shapes


def build(face):
    font = TTFont(face['source'])
    upem = face['upem']
    assert upem % EM == 0, upem
    pixel = upem // EM
    font['head'].unitsPerEm = upem
    # scale to whole pixels per em: the adjusted size lands a hair over 13px,
    # and an unrounded scale leaves a faint edge on every whole-pixel outline.
    font['head'].flags |= 1 << 3
    for record in font['name'].names:
        if record.nameID in (1, 4, 16, 21):
            old, new = face['family']
        elif record.nameID in (3, 6, 25):
            old, new = face['postscript']
        else:
            continue
        record.string = record.toUnicode().replace(old, new)

    cmap = font.getBestCmap()
    zero = cmap[ord('0')]
    advance = font['hmtx'][zero][0]
    assert advance == WIDTH * pixel, advance
    # read every glyph's variations before any outline changes: they decode
    # lazily, against the outline they belong to.
    font['gvar'].ensureDecompiled()
    gvar = font['gvar'].variations
    # a face without an advance map indexes its advance variations by glyph
    # id, which an appended glyph would run past: write the map out first.
    hvar = font['HVAR'].table
    if hvar.AdvWidthMap is None:
        hvar.AdvWidthMap = otTables.VarIdxMap()
        hvar.AdvWidthMap.mapping = {name: index for index, name in enumerate(font.getGlyphOrder())}
    advances = hvar.AdvWidthMap.mapping
    new_names = []
    drawn = {glyph: arc(glyph, pixel) if glyph in ARCS else outline(bars, pixel)
             for glyph, bars in cell_graphics().items()}
    shapes = {}
    if face.get('shapes'):
        shapes = {glyph: polygon(points, pixel) for glyph, points in outlined_shapes().items()}
        shapes['\u25CF'] = circle(8, pixel)
        shapes['\u2022'] = circle(6, pixel)
    drawn.update(shapes)
    for glyph, outlined in drawn.items():
        code = ord(glyph)
        name = cmap.get(code) or f'uni{code:04X}'
        if code not in cmap:
            new_names.append((code, name))
        # setting a glyph that is not there yet also appends it to the order.
        font['glyf'][name] = outlined
        font['glyf'][name].recalcBounds(font['glyf'])
        gvar.pop(name, None)  # the same at every weight
        font['hmtx'][name] = (advance, font['glyf'][name].xMin)
    for table in font['cmap'].tables:
        if table.isUnicode():
            for code, name in new_names:
                if code <= 0xFFFF or table.format == 12:
                    table.cmap[code] = name
    # every advance is the cell, at every weight: the new glyphs take the
    # advance-variation entry that varies nothing, as almost every glyph does.
    for _, name in new_names:
        advances[name] = advances[zero]
    # no glyph names: macos's renderer looks a glyph named `o` up and places
    # every glyph against that glyph's height, which would put the cell
    # graphics' edges a fifteenth of a pixel off the grid at 1x.
    font['post'].formatType = 3.0
    font.flavor = 'woff2'
    font.save(face['target'])
    print(f"{face['target'].name}: {len(cell_graphics())} cell graphics" + (f" and {len(shapes)} outlined shapes" if shapes else '') + f", {len(new_names)} glyphs new")
    report_outlines_past_the_line(font, cmap, drawn, pixel)


def report_outlines_past_the_line(font, cmap, drawn, pixel):
    """the glyphs whose outlines reach past the 16px line, 11px above the
    baseline and 5px below, at the default weight. the overrides set the line
    whatever the face's own metrics say, so what reaches past it antialiases
    into the row above or below, where it shows on a filled row. ascii is
    named, the rest counted."""
    top, bottom = BASELINE * pixel, (BASELINE - HEIGHT) * pixel
    past = {}
    for code, name in cmap.items():
        glyph = font['glyf'][name]
        if chr(code) in drawn or not hasattr(glyph, 'yMax'):
            continue
        reach = max(glyph.yMax - top, bottom - glyph.yMin) / pixel
        if reach > 0:
            past[chr(code)] = reach
    if not past:
        return
    ascii_past = [f'{character} {reach:.2f}px' for character, reach in sorted(past.items()) if ' ' < character <= '~']
    rest = len(past) - len(ascii_past)
    print(f"  past the line: {', '.join(ascii_past) or 'nothing in ascii'}" + (f", and {rest} glyphs outside ascii" if rest else ''))


if __name__ == '__main__':
    for face in FACES:
        build(face)
