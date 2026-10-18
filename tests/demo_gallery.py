"""Exercise native horizontal/vertical demos and validate image budgets."""
import functools,json,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
headers=json.loads((root/'vercel.json').read_text())['headers'][0]['headers']
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):
  for h in headers:self.send_header(h['key'],h['value'])
  super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
try:
 for path in (root/'media').glob('demo-*.webp'):
  thumb='-thumb' in path.name
  with Image.open(path) as im:assert im.size==((240,300) if thumb else (800,1000)),(path,im.size)
  assert path.stat().st_size<(15000 if thumb else 100000),path
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width,height in [(390,844),(320,640),(1280,900)]:
   c=b.new_context(viewport={'width':width,'height':height},has_touch=True,service_workers='block',reduced_motion='reduce')
   page=c.new_page();errors=[];requests=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda r:requests.append(r.url))
   page.goto(base+'demos.html',wait_until='networkidle')
   assert page.locator('.design-panel').count()==3
   assert page.locator('#focusMenu .demo-item').count()==3
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert page.locator('#quickMenu img[src]').count()==0
   assert page.locator('#spotlightMenu img[src]').count()==0
   assert not any('/api/' in r for r in requests)
   page.locator('[data-layout="1"]').click()
   page.wait_for_function('() => document.querySelector("#designStatus").textContent.includes("Quick list")')
   page.wait_for_function('() => [...document.querySelectorAll("#quickMenu img")].every(i=>i.complete && i.naturalWidth>0)')
   assert all('-thumb.webp' in src for src in page.locator('#quickMenu img').evaluate_all('(images)=>images.map(i=>i.src)'))
   quick=page.locator('#quickMenu').bounding_box()
   last=page.locator('#quickMenu .demo-item').last.bounding_box()
   assert last['y']+last['height']<=quick['y']+quick['height']+2,'Three compact offers fit in the preview'
   page.locator('[data-count="5"]').click()
   assert page.locator('#quickMenu .demo-item').count()==5
   page.locator('#quickMenu').evaluate('(e)=>e.scrollTop=e.scrollHeight')
   assert page.locator('#quickMenu').evaluate('(e)=>e.scrollTop>0')
   page.locator('[data-layout="2"]').click()
   page.wait_for_function('() => document.querySelector("#designStatus").textContent.includes("Spotlight")')
   assert page.locator('#spotlightMenu .featured').count()==1
   assert page.locator('#spotlightMenu .compact').count()==4
   page.locator('[data-count="1"]').click()
   assert page.locator('#spotlightMenu .demo-item').count()==1
   page.locator('[data-count="3"]').click()
   page.wait_for_function('() => Math.abs(document.querySelector("#designs").scrollLeft-2*document.querySelector("#designs").clientWidth)<2')
   page.locator('#designs').focus();page.keyboard.press('ArrowLeft')
   page.wait_for_function('() => document.querySelector("#designStatus").textContent.includes("Quick list")')
   if width==390:
    page.locator('[data-layout="0"]').click()
    page.wait_for_function('() => document.querySelector("#designStatus").textContent.includes("Focus")')
    page.locator('#designs').scroll_into_view_if_needed()
    box=page.locator('#designs').bounding_box()
    y=min(height-80,max(150,box['y']+150))
    session=c.new_cdp_session(page)
    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':330,'y':y}]})
    for x in [290,240,180,120,60]:
     session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y}]})
     page.wait_for_timeout(30)
    session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    page.wait_for_function('() => document.querySelector("#designStatus").textContent.includes("Quick list")')
   selected=page.locator('[data-layout][aria-current="true"]').get_attribute('data-layout')
   page.locator(f'[data-panel="{selected}"]').screenshot(path=f'/tmp/demo-gallery-{width}.png')
   assert not errors,errors
   print(f'PASS {width}: 3 layouts, 1/3/5 offers, lazy assets, thumbnail list, keyboard navigation, no overflow or JS errors')
   c.close()
  b.close()
 print('PASS: generated images within size budgets; native sideways touch swipe works')
finally:server.shutdown();server.server_close()
