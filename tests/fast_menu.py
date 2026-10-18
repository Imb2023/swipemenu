"""Prove the first offer works before an API response, then accepts withdrawals."""
import functools,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width,height in [(390,844),(1280,900),(320,640)]:
   c=b.new_context(viewport={'width':width,'height':height},service_workers='block')
   page=c.new_page();held=[];requests=[]
   page.on('request',lambda r:requests.append(r.url))
   page.route('**/api/menu',lambda route:held.append(route))
   page.route('https://swipemenu.vercel.app/media/don-pedro.webp',lambda r:r.fulfill(path=str(root/'media/don-pedro.webp'),content_type='image/webp'))
   page.goto(base,wait_until='domcontentloaded')
   page.wait_for_selector('.card-art > img')
   assert page.locator('.offer-heading h2').inner_text().lower()=='don pedro'
   assert page.locator('.price').first.inner_text()=='$100'
   assert page.locator('#deck').get_attribute('aria-busy')=='false'
   assert not any('script.google' in url for url in requests)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if width==390:
    box=page.locator('.card-description').bounding_box();assert box['y']+box['height']<height
   page.screenshot(path=f'/tmp/approved-menu-{width}.png',full_page=True)
   assert held, 'Request remains pending while offer is already visible'
   held[0].fulfill(json={'rows':[],'updatedAt':'2026-10-18T01:00:00Z','stale':False})
   page.wait_for_selector('.state-card')
   assert page.locator('.slide').count()==0
   print(f'PASS {width}: first offer before API, no Google request, price/description visible, valid empty update removes offer')
   c.close()
  b.close()
finally:server.shutdown();server.server_close()
