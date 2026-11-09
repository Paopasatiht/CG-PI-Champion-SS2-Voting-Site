"""Build demo-single-file.html (Judge flow) by inlining index.html's CSS, JS and logo.

Usage: python3 tools/build-single-file.py
"""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
logo = 'data:image/webp;base64,' + base64.b64encode((root / 'assets/img/kasset-logo.webp').read_bytes()).decode()

def css(m):
    return '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</style>'

def js(m):
    if m.group(1).endswith('access-codes.js'):
        return ''  # issued codes never go into the committed single file
    src = (root / m.group(1)).read_text(encoding='utf-8').replace('./assets/img/kasset-logo.webp', logo)
    return '<script>\n' + src + '\n</script>'

html = re.sub(r'<link rel="stylesheet" href="\./([^"]+)">', css, html)
html = re.sub(r'<script src="\./([^"]+)" defer></script>', js, html)
(root / 'demo-single-file.html').write_text(html, encoding='utf-8')
print('wrote demo-single-file.html', len(html), 'bytes')
