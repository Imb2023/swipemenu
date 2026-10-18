"""Run with python3 tests/image_urls.py (requires Python Playwright and Chromium)."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
handler = functools.partial(SimpleHTTPRequestHandler, directory=str(root/'dist'))
server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        context = browser.new_context(service_workers='block')
        page = context.new_page()
        rows = [dict(id='1', category='Specials', name='Sheet special', price='12.50', image='1.png',
                     description='From Sheets', featured=True, available=True, order=1)]
        page.route('**/api/menu', lambda route: route.fulfill(json={'rows':rows,'updatedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()}))
        page.goto(base, wait_until='networkidle')
        page.wait_for_selector('[data-open="1"]')
        hero = page.locator('.card-art')
        assert '1.png' in page.locator('.card-art > img').get_attribute('src')
        page.locator('[data-open]').click()
        assert page.locator('#modalImage').evaluate('(e) => e.complete && e.naturalWidth > 0')
        page.keyboard.press('Escape')
        assert page.evaluate('safeImageUrl("https://example.com/image.png")') == 'https://example.com/image.png'
        for value in ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'file:///etc/passwd',
                      'https://user:password@example.com/a.png', 'http://[invalid']:
            assert page.evaluate('(value) => safeImageUrl(value)', value) == ''
        for value in ['javascript:alert(1)', '\'");"><img id="injected" src=x onerror="window.injected=true">']:
            page.evaluate('''(value) => {
                specials[0].image = value;
                renderDeck();
                openModal(specials[0]);
            }''', value)
            page.wait_for_timeout(100)
            assert page.locator('#injected').count() == 0
            assert not page.evaluate('window.injected === true')
            if value.startswith('javascript:'):
                assert page.locator('#modalImageWrap').is_hidden()
                assert page.locator('#modalImage').get_attribute('src') is None
            page.keyboard.press('Escape')
        browser.close()
        print('PASS: Sheet rendering, local/HTTPS images, modal image, unsafe schemes and HTML injection')
finally:
    server.shutdown()
    server.server_close()
