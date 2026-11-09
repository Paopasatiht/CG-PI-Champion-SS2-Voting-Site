"""Add ?v=<content hash> to CSS/JS/IMG URLs in index.html and admin.html so browsers
(and ngrok/proxy caches) always load the current version. Run after changing assets."""
import hashlib, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
def ver(rel):
    f = root / rel
    return hashlib.sha1(f.read_bytes()).hexdigest()[:8] if f.exists() else None
for page in ['index.html', 'admin.html']:
    p = root / page; html = p.read_text(encoding='utf-8')
    def sub(m):
        rel = m.group(2); v = ver(rel)
        return f'{m.group(1)}./{rel}{"?v=" + v if v else ""}"'
    html = re.sub(r'((?:href|src)=")\./(assets/[^"?]+)(?:\?v=[0-9a-f]*)?"', sub, html)
    p.write_text(html, encoding='utf-8')
print('stamped')
