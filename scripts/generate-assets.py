"""Generate app screenshots and an evergreen sharing card.
Requires Python Playwright + Chromium. Sheet snapshot is fetched with TLS verification.
Browser screenshots use that verified snapshot; this is not an end-to-end API test.
"""
import functools, json, re, threading, urllib.request
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
url=re.search(r'const SHEET_API_URL = "([^"]+)"', (root/'app.js').read_text())[1]
with urllib.request.urlopen(url,timeout=30) as response:
    rows=json.load(response)
assert isinstance(rows,list)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
(root/'assets').mkdir(exist_ok=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for width,height,name in [(390,844,'screenshot-mobile.png'),(1280,900,'screenshot-desktop.png')]:
            context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,service_workers='block',reduced_motion='reduce')
            context.route('https://script.google.com/**',lambda route:route.fulfill(json=rows))
            page=context.new_page();page.goto(base,wait_until='networkidle');page.wait_for_selector('.slide')
            page.screenshot(path=str(root/'assets'/name));context.close()
        page=browser.new_page(viewport={'width':1200,'height':630},device_scale_factor=1)
        page.goto(base,wait_until='domcontentloaded')
        page.set_content('''<!doctype html><html lang="en"><meta charset="utf-8"><style>
          *{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#111210;color:#f7f4eb}
          main{width:1200px;height:630px;padding:62px 74px;background:radial-gradient(ellipse at 90% 90%,#51432c88,transparent 65%);position:relative}
          header{display:flex;align-items:center;gap:18px;font-size:24px;font-weight:600}img{width:60px;height:60px;border-radius:50%}
          .eyebrow{font-size:15px;letter-spacing:4px;color:#b8b9ad;margin-top:62px}h1{font-size:100px;line-height:1.02;letter-spacing:-6px;margin:20px 0 24px;font-weight:600}h1 span{color:#f4bd72}
          p{font-size:25px;color:#cccdc2;margin:0}.pill{position:absolute;right:74px;bottom:64px;padding:18px 28px;border-radius:20px;background:#f4bd72;color:#211a10;font-size:22px;font-weight:650}
          </style><main><header><img src="'''+base+'''logo.png" alt="">Instant Specials Menu</header><div class="eyebrow">FRESH PICKS. GOOD FINDS.</div><h1>Today’s specials<span>.</span></h1><p>Find your favorite. Make it a good day.</p><div class="pill">Explore the menu →</div></main></html>''')
        page.locator('img').wait_for();page.wait_for_function('document.querySelector("img").complete')
        page.screenshot(path=str(root/'assets/social-preview.png'))
        browser.close()
    print('Generated mobile, desktop, and social-sharing assets.')
finally:
    server.shutdown();server.server_close()
