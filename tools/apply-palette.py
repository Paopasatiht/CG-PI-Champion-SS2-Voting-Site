"""Remap the design's greens/golds onto the PI Champion S2 palette.
#063F35 deep · #006B68 teal · #596D69 slate · #D9F0E5 mint · #F6F5F0 paper
Medal / podium colours are left alone. Run once: python3 tools/apply-palette.py
"""
import colorsys, re, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_RULE = re.compile(r'medal|podium|silver|bronze|gold|\.first\b|rank-1|rank-2|rank-3', re.I)

def remap(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hd = h * 360
    if s < 0.12:
        return None                                    # neutrals stay
    if 65 <= hd <= 200:                                # greens / teals
        if l >= 0.78:   nh, ns, nl = 151, min(s, 0.48), l          # mint family
        elif l < 0.18:  nh, ns, nl = 166, min(max(s, .6), .83), l  # deep
        elif s < 0.35:  nh, ns, nl = 168, min(s, .12), l           # slate
        else:           nh, ns, nl = 178, min(s, .95), 0.15 + (l - 0.18) * 0.72  # teal
    elif 35 <= hd < 65 and s > 0.25:                   # golds / yellows
        if l >= 0.45:   nh, ns, nl = 151, 0.45, max(l, 0.82)       # → mint
        else:           nh, ns, nl = 168, 0.10, 0.39               # → slate
    else:
        return None                                    # reds/oranges/blues keep meaning
    rr, gg, bb = colorsys.hls_to_rgb(nh / 360, nl, ns)
    return round(rr * 255), round(gg * 255), round(bb * 255)

HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])([0-9a-fA-F]{2})?')
RGBA = re.compile(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)')

def sub_colors(text):
    def hx(m):
        v = m.group(1)
        if len(v) == 3: v = ''.join(c * 2 for c in v)
        out = remap(int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16))
        if not out: return m.group(0)
        return '#%02x%02x%02x' % out + (m.group(2) or '')
    def rg(m):
        out = remap(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if not out: return m.group(0)
        a = m.group(4)
        return f'rgba({out[0]},{out[1]},{out[2]}{a})' if a else f'rgb({out[0]},{out[1]},{out[2]})'
    return RGBA.sub(rg, HEX.sub(hx, text))

def css(text):
    out, pos = [], 0
    for m in re.finditer(r'[^{}]*\{[^{}]*\}', text):     # innermost rules
        out.append(text[pos:m.start()])
        rule = m.group(0); sel = rule.split('{', 1)[0]
        out.append(rule if SKIP_RULE.search(sel) else sub_colors(rule))
        pos = m.end()
    out.append(text[pos:])
    return ''.join(out)

def js(text):
    # leave medal artwork and url-encoded SVG/data URIs untouched
    keep = []
    def stash(m): keep.append(m.group(0)); return f'\x00{len(keep)-1}\x00'
    text = re.sub(r'function medalGraphic\(.*?\n  function', stash, text, flags=re.S)
    text = re.sub(r'data:image/[^"\'`)\s]+', stash, text)
    text = sub_colors(text)
    return re.sub(r'\x00(\d+)\x00', lambda m: keep[int(m.group(1))], text)

for rel in ['assets/css/base.css', 'assets/css/design-v2.css', 'assets/css/design-v4.css']:
    p = ROOT / rel; p.write_text(css(p.read_text(encoding='utf-8')), encoding='utf-8')
p = ROOT / 'assets/js/app.js'; p.write_text(js(p.read_text(encoding='utf-8')), encoding='utf-8')
print('palette applied')
