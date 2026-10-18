"""Browser regression checks: python3 tests/menu_ui.py (requires Playwright + Chromium)."""
from playwright.sync_api import sync_playwright
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading, functools, atexit
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parents[1]/'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
atexit.register(server.server_close)
atexit.register(server.shutdown)
base = f'http://127.0.0.1:{server.server_port}/' 
rows=[dict(id=str(i),name=name,category='Specials',price=price,description=desc,image=image,featured=True,available=True,order=i) for i,name,price,desc,image in [(1,'Something worth sharing',100,'Your next good find. Discover something special, made to brighten your day.','2.png'),(2,'A little inspiration',150,'Fresh ideas, thoughtful details. Find your favorite and make it yours.','1.png'),(3,'Make it a good day',250,'Explore our latest special. Message us and we’ll take care of the rest.','')]]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(390,844),(1280,900),(320,640)]:
  c=b.new_context(viewport={'width':w,'height':h},service_workers='block')
  page=c.new_page(); errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  page.route('**/api/menu',lambda r:r.fulfill(json={'rows':rows,'updatedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()}))
  page.goto(base,wait_until='networkidle')
  page.wait_for_function('() => document.querySelectorAll(".slide").length === 3')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.locator('[data-open="1"]').click()
  assert page.locator('.sheet').is_visible()
  assert page.locator('#appShell').evaluate('(e)=>e.inert')
  page.locator('#modalDoneBtn').focus();page.keyboard.press('Tab')
  assert page.locator('#modalClose').evaluate('(e)=>e===document.activeElement')
  page.keyboard.press('Shift+Tab')
  assert page.locator('#modalDoneBtn').evaluate('(e)=>e===document.activeElement')
  page.keyboard.press('Escape')
  assert page.locator('[data-open="1"]').evaluate('(e)=>e===document.activeElement')
  page.locator('#nextBtn').click();page.wait_for_timeout(700)
  assert page.locator('#dots button').nth(1).get_attribute('aria-current')=='true'
  page.locator('#prevBtn').click();page.wait_for_timeout(700)
  page.screenshot(path=f'/tmp/menu-new-{w}.png',full_page=True)
  page.emulate_media(reduced_motion='reduce')
  page.locator('#deck').focus();page.keyboard.press('End');page.wait_for_timeout(100)
  assert page.locator('#dots button').nth(2).get_attribute('aria-current')=='true'
  assert not errors,errors
  print(f'PASS {w}: layout, focus trap/restoration, modal, navigation, reduced motion, no JS errors')
  c.close()
 # First-load failure, retry, then saved-menu fallback.
 c=b.new_context(service_workers='block'); page=c.new_page()
 page.route('**/api/menu',lambda r:r.abort())
 page.goto(base,wait_until='networkidle')
 assert page.locator('.slide').count()==1
 assert 'Saved menu' in page.locator('#statusPill').inner_text()
 page.unroute('**/api/menu')
 page.route('**/api/menu',lambda r:r.fulfill(json={'rows':rows,'updatedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()}))
 page.locator('#refreshBtn').click();page.wait_for_function('() => document.querySelectorAll(".slide").length === 3')
 page.unroute('**/api/menu');page.route('**/api/menu',lambda r:r.abort())
 page.reload(wait_until='networkidle')
 page.wait_for_function('() => document.querySelectorAll(".slide").length === 3')
 assert 'Saved menu' in page.locator('#statusPill').inner_text()
 print('PASS error, retry and saved-menu fallback')
 b.close()
