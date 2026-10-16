"""Staff upload UI contract checks, no provider credentials or real uploads."""
import functools,io,json,threading,subprocess,tempfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
clips=tempfile.TemporaryDirectory()
for duration,name in [(1,'short.mp4'),(16,'long.mp4')]:
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i',f'color=c=orange:s=160x120:d={duration}','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an','-y',str(Path(clips.name)/name)],check=True)

headers=json.loads((root/'vercel.json').read_text())['headers'][0]['headers']
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):
  for h in headers:self.send_header(h['key'],h['value'])
  super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
image=io.BytesIO();Image.new('RGB',(2400,1600),'orange').save(image,'PNG')
signing=dict(cloudName='test-cloud',apiKey='public-test-key',kind='image',signature='test-signature',params=dict(timestamp=123,public_id='specials/test',overwrite=False,upload_preset='signed-test'))
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  c=b.new_context(viewport={'width':390,'height':844},service_workers='block')
  page=c.new_page();violations=[]
  page.on('console',lambda m:violations.append(m.text) if 'Content Security Policy' in m.text else None)
  page.route('**/api/upload-signature',lambda r:r.fulfill(status=503,json={'error':'Staff uploads are not configured yet.'}))
  page.goto(base+'upload.html',wait_until='networkidle')
  page.locator('#mediaFile').set_input_files({'name':'photo.png','mimeType':'image/png','buffer':image.getvalue()})
  page.locator('#staffPassword').fill('test-only-staff-password-12345');page.locator('#uploadButton').click()
  page.wait_for_function('() => document.querySelector("#uploadStatus").textContent.includes("not configured")')
  assert page.locator('#staffPassword').input_value()==''
  page.unroute('**/api/upload-signature')
  page.route('**/api/upload-signature',lambda r:r.fulfill(json=signing))
  uploaded=[]
  def upload(route):
   uploaded.append(route.request.post_data_buffer)
   route.fulfill(json={'secure_url':'https://res.cloudinary.com/test-cloud/image/upload/v1/specials/test.webp','public_id':'specials/test'})
  page.route('https://api.cloudinary.com/**',upload)
  page.locator('#staffPassword').fill('test-only-staff-password-12345');page.locator('#uploadButton').click()
  page.wait_for_selector('#uploadResult:not([hidden])')
  link=page.locator('#mediaUrl').input_value()
  assert '/image/upload/f_auto,q_auto,c_limit,w_1200/' in link
  assert uploaded and b'filename="special.webp"' in uploaded[0]
  assert b'test-only-staff-password' not in uploaded[0]
  optimized=uploaded[0].split(b'Content-Type: image/webp\r\n\r\n')[1].split(b'\r\n--')[0]
  assert Image.open(io.BytesIO(optimized)).size==(1200,800)

  assert page.locator('#staffPassword').input_value()==''
  assert page.locator('#posterResult').is_hidden()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not violations,violations
  page.screenshot(path='/tmp/swipemenu-staff-upload.png',full_page=True)
  print('PASS: missing-config feedback, signed photo upload, WebP preparation, optimized links, password cleared, mobile layout and CSP')
  page.locator('#mediaFile').set_input_files(str(Path(clips.name)/'long.mp4'))
  page.locator('#staffPassword').fill('test-only-staff-password-12345');page.locator('#uploadButton').click()
  page.wait_for_function('() => document.querySelector("#uploadStatus").textContent.includes("15 seconds")')
  assert page.locator('#uploadResult').is_hidden()
  page.unroute('**/api/upload-signature')
  video_signing={**signing,'kind':'video'}
  page.route('**/api/upload-signature',lambda r:r.fulfill(json=video_signing))
  page.unroute('https://api.cloudinary.com/**')
  page.route('https://api.cloudinary.com/**',lambda r:r.fulfill(json={'secure_url':'https://res.cloudinary.com/test-cloud/video/upload/v1/specials/test.mp4','public_id':'specials/test'}))
  page.locator('#mediaFile').set_input_files(str(Path(clips.name)/'short.mp4'))
  page.locator('#staffPassword').fill('test-only-staff-password-12345');page.locator('#uploadButton').click()
  page.wait_for_selector('#uploadResult:not([hidden])')
  assert '/video/upload/f_auto,q_auto,c_limit,w_960/' in page.locator('#mediaUrl').input_value()
  assert '/so_0,f_jpg,q_auto,c_limit,w_1200/' in page.locator('#posterUrl').input_value()
  assert page.locator('#posterUrl').input_value().endswith('.jpg')
  assert 'video' in page.locator('#urlLabel').inner_text()
  print('PASS: clip duration rejection, video upload and lightweight poster links')
  video_requests=[]
  def serve_clip(route):
   video_requests.append(route.request.url)
   route.fulfill(body=(Path(clips.name)/'short.mp4').read_bytes(),content_type='video/mp4')
  page.route('https://res.cloudinary.com/**',serve_clip)
  page.route('https://script.google.com/**',lambda r:r.fulfill(json=[dict(id='1',name='Special with clip',image='1.png',video='https://res.cloudinary.com/test-cloud/video/upload/v1/specials/test.mp4',available=True,featured=True),dict(id='2',name='Photo special',image='2.png',video='javascript:alert(1)',available=True,featured=True)]))
  page.goto(base,wait_until='networkidle')
  assert not video_requests, 'No video request before deliberate play'
  assert page.locator('[data-play]').count()==1
  assert page.locator('video').get_attribute('src') is None
  assert page.locator('#modalOrderBtn').count()==0
  assert page.locator('[data-share]').count()==0
  page.locator('[data-play]').click()
  page.wait_for_function('() => document.querySelector("video").currentTime > 0')
  assert video_requests
  page.locator('#nextBtn').click()
  page.wait_for_function('() => document.querySelector("video").getAttribute("src") === null')
  assert page.locator('video').evaluate('(v)=>v.paused')
  assert not violations,violations
  print('PASS: viewer-only experience, no video bytes before Play, playback works, clip released on swipe')
  b.close()
finally:server.shutdown();server.server_close();clips.cleanup()
