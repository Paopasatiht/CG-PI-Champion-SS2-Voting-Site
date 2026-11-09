"""Build demo-single-file.html (Judge flow) by inlining index.html's CSS, JS and logo.

Usage: python3 tools/build-single-file.py
"""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
def inline_images(src):
    for img in sorted((root / 'assets/img').glob('*.webp')):
        uri = 'data:image/webp;base64,' + base64.b64encode(img.read_bytes()).decode()
        src = src.replace(f'./assets/img/{img.name}', uri)
    return src

def css(m):
    return '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</style>'

def js(m):
    if m.group(1).endswith('access-codes.js'):
        return ''  # issued codes never go into the committed single file
    src = inline_images((root / m.group(1)).read_text(encoding='utf-8'))
    return '<script>\n' + src + '\n</script>'

html = re.sub(r'<link rel="stylesheet" href="\./([^"]+)">', css, html)
html = re.sub(r'<script src="\./([^"]+)" defer></script>', js, html)
(root / 'demo-single-file.html').write_text(html, encoding='utf-8')
print('wrote demo-single-file.html', len(html), 'bytes')
