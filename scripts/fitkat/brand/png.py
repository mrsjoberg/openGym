"""Draws the PNG icons from icon.svg and badge.svg with a headless browser (pip install playwright).

    python3 png.py <folder with the SVGs> <frontend/public>

CHROME may name the browser to use; otherwise Playwright's own Chromium.
"""
import os, sys
from playwright.sync_api import sync_playwright
src, out = sys.argv[1], sys.argv[2]
jobs = [('icon.svg', 'icon-512.png', 512, False), ('icon.svg', 'icon-180.png', 180, False), ('badge.svg', 'badge-96.png', 96, True)]
with sync_playwright() as p:
    chrome = os.environ.get('CHROME')
    b = p.chromium.launch(executable_path=chrome, args=['--no-sandbox']) if chrome else p.chromium.launch()
    for name, dst, px, clear in jobs:
        page = b.new_context(viewport={'width': px, 'height': px}, device_scale_factor=1).new_page()
        svg = open(os.path.join(src, name)).read()
        page.set_content(f'<body style="margin:0;background:transparent">{svg}<style>svg{{display:block;width:{px}px;height:{px}px}}</style>')
        page.screenshot(path=os.path.join(out, dst), omit_background=clear)
    b.close()
