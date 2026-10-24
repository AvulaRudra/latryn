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
for f in ['favicon.svg', 'og-image-1200x630.png', 'AGENTS.md']:
    shutil.copy(os.path.join(ROOT, f), os.path.join(OUT, f))
print('dist ready')
