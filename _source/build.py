"""One-command build: python3 build.py -> dist/"""
import os, shutil, build_pages as bp

ROOT = bp.ROOT; OUT = bp.OUT
if os.path.isdir(OUT): shutil.rmtree(OUT)
os.makedirs(OUT)
bp.build()
home = open(os.path.join(ROOT, 'index_template.html'), encoding='utf-8').read()
home = home.replace('{{LOGO}}', bp.LOGO).replace('https://YOUR-DOMAIN.com', bp.BASE_URL)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(home)
shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(OUT, 'assets'))
for f in ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', 'og-image-1200x630.png', 'AGENTS.md']:
    shutil.copy(os.path.join(ROOT, f), os.path.join(OUT, f))
# write the contact email into every data-email link so it works without JavaScript too
import re, glob
for f in glob.glob(os.path.join(OUT, '**', '*.html'), recursive=True):
    h = open(f, encoding='utf-8').read()
    h2 = re.sub(r'<a([^>]*?)href="#"([^>]*?)data-email="[a-z]+"([^>]*)></a>', lambda m: f'<a{m.group(1)}href="mailto:{bp.EMAIL}"{m.group(2)}data-email="general"{m.group(3)}>{bp.EMAIL}</a>', h)
    h2 = re.sub(r'<a([^>]*?)data-email="([a-z]+)"([^>]*?)href="#"([^>]*)></a>', lambda m: f'<a{m.group(1)}data-email="{m.group(2)}"{m.group(3)}href="mailto:{bp.EMAIL}"{m.group(4)}>{bp.EMAIL}</a>', h2)
    if h2 != h: open(f, 'w', encoding='utf-8').write(h2)
print('dist ready')
