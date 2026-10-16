"""Test built output with Vercel headers: python3 tests/production_browser.py."""
import functools, json, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
config = json.loads((root / 'vercel.json').read_text())
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        for h in config['headers'][0]['headers']:
            self.send_header(h['key'], h['value'])
        super().end_headers()
server = ThreadingHTTPServer(('127.0.0.1',0), functools.partial(Handler,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'
rows = [dict(id='1',name='Test special',price='',description='Sheet content',image='1.png',featured=True,available=True),dict(name='',featured=True,available=True)]
try:
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        c=b.new_context()
        c.route('https://script.google.com/**',lambda r:r.fulfill(json=rows))
        page=c.new_page(); errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script("window.violations=[];document.addEventListener('securitypolicyviolation',e=>window.violations.push(e.violatedDirective));")
        page.goto(base,wait_until='networkidle')
        assert page.locator('.slide').count()==1, 'Blank Sheet rows must not create phantom specials'
        assert page.locator('.price').first.inner_text()=='', 'Blank prices must not become $0'
        page.locator('[data-open]').click()
        assert page.locator('#modalTitle').inner_text()=='Test special'
        page.wait_for_function('() => document.querySelector("#modalImage").naturalWidth > 0')
        page.keyboard.press('Escape')
        assert not page.evaluate('window.violations'), page.evaluate('window.violations')
        assert not errors,errors
        page.evaluate('async()=>await navigator.serviceWorker.ready')
        c.unroute('https://script.google.com/**'); c.set_offline(True)
        page.reload(wait_until='networkidle')
        assert page.locator('.slide').count()==1
        assert 'Saved menu' in page.locator('#statusPill').inner_text()
        print('PASS: built bundle + CSP headers, Sheet normalization, images, modal, service worker, offline restore')
        b.close()
finally:
    server.shutdown(); server.server_close()
