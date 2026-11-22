"""FitKat's wordmark and app icon as outlines, from the fonts the app ships.

Writes, into the folder given as the first argument (default: this one):
  wordmark.svg         "Fit" upright, "Kat" italic, a full stop, as three paths (classes fit, kat, dot)
  wordmark-boot.html   the same in ivory and rose, as the boot screen's markup in frontend/index.html
  icon.svg             the app icon: F and italic K in ivory on forest, the stop in rose
  badge.svg            the monogram alone in white, for the notification badge
Needs fonttools, brotli and uharfbuzz. The PNG files are drawn from the SVGs by a browser (see README).
"""
import sys, os
import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.environ.get('FITKAT_FONTS') or os.path.join(HERE, '..', '..', '..', 'frontend', 'src', 'fitkat', 'fonts')
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE
IVORY, FOREST, ROSE, ROSE_DEEP, INK = '#f8f6f0', '#405849', '#b48276', '#8a5548', '#303c35'
UPRIGHT, ITALIC = 'cormorant-garamond-latin-wght-normal.woff2', 'cormorant-garamond-latin-wght-italic.woff2'

def load(name, wght):
    from fontTools.ttLib import TTFont
    import io
    tt = TTFont(os.path.join(FONTS, name)); tt.flavor = None
    buf = io.BytesIO(); tt.save(buf)
    face = hb.Face(buf.getvalue()); font = hb.Font(face)
    font.set_variations({'wght': wght})
    return font, face.upem

def run(text, name, wght, x0, size, track=0.0):
    """Shape `text` and return (path data, end x) at `size` px per em, baseline at y = 0."""
    font, upem = load(name, wght)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True, 'liga': False})
    s = size / upem
    x = x0
    out = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        pen = SVGPathPen(None, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
        tp = TransformPen(pen, (s, 0, 0, -s, x + pos.x_offset * s, -pos.y_offset * s))
        font.draw_glyph_with_pen(info.codepoint, tp)
        out.append(pen.getCommands())
        x += pos.x_advance * s + track * size
    return ' '.join(o for o in out if o), x

def wordmark(size=100, wght=500, track=-0.02):
    fit, x = run('Fit', UPRIGHT, wght, 0, size, track)
    kat, x = run('Kat', ITALIC, wght, x, size, track)
    dot, x = run('.', UPRIGHT, wght, x + 0.01 * size, size, 0)
    return fit, kat, dot, x

def monogram(size, wght=600, track=-0.03):
    f, x = run('F', UPRIGHT, wght, 0, size, track)
    k, x = run('K', ITALIC, wght, x, size, track)
    d, x = run('.', UPRIGHT, wght, x + 0.01 * size, size, 0)
    return f, k, d, x

os.makedirs(OUT, exist_ok=True)
fit, kat, dot, w = wordmark()
# cap height of Cormorant is about 0.63 em; the box leaves room for the K's reach and the t
vb = f'-2 -72 {w + 4:.0f} 76'
open(os.path.join(OUT, 'wordmark.svg'), 'w').write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="FitKat">'
    f'<path class="fit" fill="{FOREST}" d="{fit}"/><path class="kat" fill="{FOREST}" d="{kat}"/><path class="dot" fill="{ROSE_DEEP}" d="{dot}"/></svg>\n')
open(os.path.join(OUT, 'wordmark-boot.html'), 'w').write(
    f'  <svg viewBox="{vb}">\n    <path class="w" fill="{IVORY}" d="{fit}"/>\n    <path class="w w2" fill="{IVORY}" d="{kat}"/>\n'
    f'    <g class="dot"><path class="db" fill="{ROSE}" d="{dot}"/></g>\n  </svg>\n')

S = 512
f, k, d, mw = monogram(S * 0.52)
x0 = (S - mw) / 2
base = S / 2 + S * 0.52 * 0.63 / 2            # cap height centred
move = f'translate({x0:.1f} {base:.1f})'
open(os.path.join(OUT, 'icon.svg'), 'w').write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" role="img" aria-label="FitKat">'
    f'<rect width="{S}" height="{S}" fill="{FOREST}"/><g transform="{move}"><path fill="{IVORY}" d="{f}"/><path fill="{IVORY}" d="{k}"/><path fill="{ROSE}" d="{d}"/></g></svg>\n')
B = 96
f, k, d, mw = monogram(B * 0.62)
open(os.path.join(OUT, 'badge.svg'), 'w').write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {B} {B}"><g transform="translate({(B - mw) / 2 + 1:.1f} {B / 2 + B * 0.62 * 0.63 / 2:.1f})" fill="#fff">'
    f'<path d="{f}"/><path d="{k}"/><path d="{d}"/></g></svg>\n')
print('wordmark width', round(w), '| monogram', round(mw), '| files in', OUT)
