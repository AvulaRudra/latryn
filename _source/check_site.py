"""Static checks: internal links and anchors resolve, CTA prefills match form options,
no em/en dashes in visible copy, one h1 per page. Usage: python3 check_site.py dist"""
import os, re, sys
from html.parser import HTMLParser

root = sys.argv[1] if len(sys.argv) > 1 else 'dist'
pages, problems = {}, []

class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.ids = set(); s.links = []; s.h1 = 0; s.ctas = []; s.options = {}; s.sel = None; s.in_opt = False; s.text = []; s.skip = 0
    def handle_starttag(s, t, a):
        a = dict(a)
        if 'id' in a: s.ids.add(a['id'])
        if t == 'a' and 'href' in a: s.links.append(a['href'])
        if t == 'h1': s.h1 += 1
        if 'data-cta' in a and a['data-cta'] != 'apply': s.ctas.append(('type', a['data-cta']))
        if 'data-audience' in a: s.ctas.append(('audience', a['data-audience']))
        if 'data-role' in a: s.ctas.append(('role', a['data-role']))
        if t == 'select': s.sel = a.get('name'); s.options.setdefault(s.sel, [])
        if t == 'option': s.in_opt = True
        if t in ('script', 'style'): s.skip += 1
    def handle_endtag(s, t):
        if t == 'select': s.sel = None
        if t == 'option': s.in_opt = False
        if t in ('script', 'style'): s.skip -= 1
    def handle_data(s, d):
        if s.in_opt and s.sel: s.options[s.sel].append(d.strip())
        if not s.skip: s.text.append(d)

for dp, _, fs in os.walk(root):
    for f in fs:
        if f.endswith('.html'):
            p = os.path.join(dp, f); x = P(); x.feed(open(p, encoding='utf-8').read()); pages[os.path.relpath(p, root)] = x

for name, x in pages.items():
    if x.h1 != 1: problems.append(f'{name}: {x.h1} h1 elements')
    txt = ''.join(x.text)
    if '—' in txt or '–' in txt: problems.append(f'{name}: contains an em or en dash')
    base = os.path.dirname(name)
    for href in x.links:
        if href.startswith(('http', 'mailto:')) or href == '#': continue
        path, _, frag = href.partition('#')
        path = path.split('?')[0]
        target = os.path.normpath(os.path.join(base, path)) if path else name
        if path.startswith('/'): target = path.lstrip('/') or 'index.html'
        if target.endswith('/') or os.path.isdir(os.path.join(root, target)): target = os.path.join(target, 'index.html')
        if not os.path.exists(os.path.join(root, target)):
            problems.append(f'{name}: broken link {href}'); continue
        if frag and target in pages and frag not in pages[target].ids and target.endswith('.html'):
            problems.append(f'{name}: missing anchor #{frag} in {target}')

home = pages.get('index.html')
if home:
    opts = home.options
    for kind, val in home.ctas:
        if val not in opts.get(kind, []): problems.append(f'index.html: CTA {kind}="{val}" has no matching <option>')
    for name, x in pages.items():
        for href in x.links:
            m = re.search(r'index\.html\?type=([^#]+)', href)
            if m:
                v = m.group(1).replace('%20', ' ')
                if v not in opts.get('type', []): problems.append(f'{name}: ?type={v} has no matching option')

print(f'{len(pages)} pages checked')
print('\n'.join(problems) if problems else 'No problems found')
sys.exit(1 if problems else 0)
