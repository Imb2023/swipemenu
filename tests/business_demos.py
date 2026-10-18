"""Exercise business switches, weekday previews, templates, and deep links."""
import functools,json,threading,csv,io,urllib.request
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):
  for h in json.loads((root/'vercel.json').read_text())['headers'][0]['headers']:self.send_header(h['key'],h['value'])
  super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width in [320,390,1280]:
   page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce',service_workers='block')
   errors=[];requests=[]
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
   page.goto(base+'demos.html',wait_until='networkidle')
   assert not any('demo-barber.svg' in url or 'demo-dental.svg' in url for url in requests)
   for business,label in [('barber','Ask your barber'),('dentist','Ask the front desk')]:
    page.locator(f'[data-business="{business}"]').click()
    assert page.locator('#focusMenu .demo-item').count()==5
    assert page.locator('#weekdayControls').is_visible()
    assert page.locator('#itemCountControls').is_hidden()
    assert label in page.locator('.preview-contact').first.inner_text()
    page.locator('[data-day="Friday"]').click()
    assert page.locator('#focusMenu .demo-item').count()==1
    assert 'FRIDAY' in page.locator('#focusMenu .offer-meta').inner_text()
    assert 'FRIDAY' in page.locator('#focusMenu').inner_text()
    page.locator('[data-layout="1"]').click()
    page.wait_for_function('() => document.querySelector("#designStatus").textContent.includes("Quick list")')
    page.wait_for_function('() => document.querySelector("#quickMenu img").naturalWidth > 0')
    assert 'FRIDAY' in page.locator('#quickMenu').inner_text()
    page.locator('[data-day="all"]').click()
    assert page.locator('#quickMenu .demo-item').count()==5
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert page.locator('#businessSetup').get_attribute('href').endswith('business='+business)
    if width==390:page.locator('[data-panel="1"]').screenshot(path='/tmp/'+business+'-demo.png')
   page.goto(base+'demos.html?business=dentist',wait_until='networkidle')
   assert page.locator('[data-business="dentist"]').get_attribute('aria-pressed')=='true'
   assert page.locator('#focusMenu .demo-item').count()==5
   page.locator('[data-business="restaurant"]').click()
   assert page.locator('#focusMenu .demo-item').count()==3
   assert page.locator('#weekdayControls').is_hidden()
   assert not any('/api/' in url for url in requests)
   assert not errors,errors
   page.goto(base+'setup.html?business=barber',wait_until='networkidle')
   assert page.locator('[name=business]').input_value()=='barber'
   assert page.locator('#setupTemplate').get_attribute('href')=='barber-template.csv'
   page.close();print(f'PASS {width}: business demos, weekdays, lazy art, deep links, setup selection, no overflow')
  browser.close()
 for business in ['barber','dentist']:
  with urllib.request.urlopen(base+business+'-template.csv') as r:rows=list(csv.DictReader(io.StringIO(r.read().decode())))
  assert len(rows)==5 and all(row['available']=='FALSE' for row in rows)
 print('PASS: five-day templates start unpublished')
finally:server.shutdown();server.server_close()
