"""Check guide playback and responsive layout against deployment CSP."""
import functools, json, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
config = json.loads((root/'vercel.json').read_text())
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        for h in config['headers'][0]['headers']:
            self.send_header(h['key'], h['value'])
        super().end_headers()
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':390,'height':844})
        requests=[]
        page.on('request',lambda r:requests.append(r.url))
        page.add_init_script("window.violations=[];document.addEventListener('securitypolicyviolation',e=>window.violations.push(e.violatedDirective));")
        page.goto(f'http://127.0.0.1:{server.server_port}/guide.html',wait_until='networkidle')
        assert not any('.mp4' in url for url in requests), 'Video must not download before play'
        for width in [320,390,1280]:
            page.set_viewport_size({'width':width,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.locator('video').evaluate('(v)=>v.play()')
        page.wait_for_function('() => document.querySelector("video").currentTime > 0.2')
        duration=page.locator('video').evaluate('(v)=>{v.pause();return v.duration}')
        assert abs(duration-95)<0.1,duration
        assert not page.evaluate('window.violations')
        browser.close()
        print('PASS: mobile layout, deferred video loading, 95s playback, deployment CSP')
finally:
    server.shutdown();server.server_close()
