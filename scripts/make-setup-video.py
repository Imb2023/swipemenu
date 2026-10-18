"""Create a silent captioned tutorial from instruction screens and an app screenshot.
Requires Playwright, Pillow, Chromium, and FFmpeg. No external accounts recorded.
"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import base64, functools, html, json, subprocess, tempfile, threading
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
scenes=json.loads((root/'docs/video-storyboard.json').read_text())
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
def stamp(seconds):
 return f'{seconds//3600:02}:{seconds%3600//60:02}:{seconds%60:02}.000'
try:
 with tempfile.TemporaryDirectory(prefix='swipemenu-guide-') as folder:
  folder=Path(folder)
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   context=browser.new_context(viewport={'width':390,'height':844},service_workers='block',reduced_motion='reduce')
   page=context.new_page()
   example={'rows':[{'id':'example','category':'Specials','name':'Don Pedro','price':100,'description':'Orange juice, gin & Sprite.','image':'media/don-pedro.webp','available':True,'order':1}],'updatedAt':'2026-10-18T00:00:00Z'}
   page.route('**/menu-data.js',lambda r:r.fulfill(body='window.INITIAL_MENU='+json.dumps(example)+';',content_type='application/javascript'))
   page.route('**/api/menu',lambda r:r.fulfill(json=example))
   page.goto(base,wait_until='networkidle')
   page.screenshot(path=str(folder/'menu.png'))
   context.close()
   photo='data:image/png;base64,'+base64.b64encode((folder/'menu.png').read_bytes()).decode()
   page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
   style='''*{box-sizing:border-box}body{margin:0;background:#111210;color:#f7f4eb;font-family:system-ui,sans-serif}main{width:1280px;height:720px;padding:58px 64px;position:relative;background:radial-gradient(ellipse at 90% 100%,#4e3b2060,transparent 65%)}.label{font-size:15px;letter-spacing:3px;color:#f4bd72;font-weight:600}h1{font-size:54px;line-height:1.06;letter-spacing:-2px;margin:22px 0 26px;white-space:pre-line;font-weight:600}.body{width:650px}ul{padding-left:24px;margin:0;color:#d4d3c9;font-size:21px;line-height:1.5}li{margin:12px 0}.why{position:absolute;left:64px;bottom:70px;width:710px;color:#f4bd72;font-size:17px;line-height:1.5}.footer{position:absolute;left:64px;right:64px;bottom:26px;display:flex;justify-content:space-between;color:#9e9f93;font-size:13px}.visual{position:absolute;right:64px;top:80px;width:410px;height:535px;display:flex;align-items:center;justify-content:center}.phone{height:510px;width:auto;display:block;border:1px solid #ffffff25;border-radius:20px}.example-label{position:absolute;bottom:0;font-size:12px;color:#b8b9ad}.code{width:100%;background:#1e211b;border:1px solid #ffffff25;border-radius:20px;padding:26px;color:#f4bd72;font:17px/1.7 monospace;white-space:pre-wrap;overflow-wrap:anywhere}.sheet{width:100%;border:1px solid #ffffff25;border-radius:16px;overflow:hidden;background:#1e211b}.sheet-title{padding:18px;color:#f4bd72;font-size:20px}.sheet table{border-collapse:collapse;width:100%;font-size:14px}.sheet td,.sheet th{text-align:left;padding:13px 10px;border:1px solid #ffffff20}.sheet th{background:#333c2c;font-weight:500}.sheet p{padding:16px;color:#b8b9ad;font-size:13px;line-height:1.6}'''
   playlist=[];captions=['WEBVTT',''];transcript=['# Setup video transcript','','This is a silent, captioned walkthrough. Google/Vercel steps are instruction screens, not a recording of a signed-in account. The menu screenshot is a local example. Follow README.md for complete steps.',''];elapsed=0
   for index,scene in enumerate(scenes):
    if scene['visual']=='menu':visual=f'<img class="phone" src="{photo}" alt="Example menu"><span class="example-label">EXAMPLE MENU · RECORDED LOCALLY</span>'
    elif scene['visual']=='sheet':visual='''<div class="sheet"><div class="sheet-title">Specials</div><table><tr><th>name</th><th>price</th><th>available</th><th>order</th></tr><tr><td>House drink</td><td>100</td><td>TRUE</td><td>1</td></tr><tr><td>Food special</td><td>150</td><td>FALSE</td><td>2</td></tr></table><p>Category: Specials<br>Full columns are in the provided CSV.<br>Illustration, not a live Google Sheet.</p></div>'''
    else:visual='<pre class="code">'+html.escape(scene.get('code',''))+'</pre>'
    bullets=''.join('<li>'+html.escape(text)+'</li>' for text in scene['bullets'])
    content=f'<!doctype html><html lang="en"><meta charset="utf-8"><style>{style}</style><main><div class="body"><div class="label">{html.escape(scene["label"])}</div><h1>{html.escape(scene["title"])}</h1><ul>{bullets}</ul></div><div class="visual">{visual}</div><p class="why">WHY: {html.escape(scene["why"])}</p><div class="footer"><span>SwipeMenu · Restaurant setup · Silent captioned guide</span><span>{index+1:02} / {len(scenes):02}</span></div></main></html>'
    page.set_content(content,wait_until='load')
    target=folder/f'{index:02}.png';page.screenshot(path=str(target))
    playlist.extend([f"file '{target}'",f'duration {scene["duration"]}'])
    if index==0:
     with Image.open(target) as im:im.save(root/'assets/setup-guide-poster.webp','WEBP',quality=80,method=6)
    end=elapsed+scene['duration']
    captions.extend([f'{index+1}',f'{stamp(elapsed)} --> {stamp(end)}',scene['title'].replace('\n',' '),scene['why'],''])
    transcript.extend([f'## {stamp(elapsed)[:8]} — {scene["title"].replace(chr(10)," ")}',*['- '+text for text in scene['bullets']],'','Why: '+scene['why'],''])
    elapsed=end
   playlist.append(f"file '{target}'")
   (folder/'frames.txt').write_text('\n'.join(playlist)+'\n')
   browser.close()
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(folder/'frames.txt'),'-t',str(elapsed),'-vf','fps=24,format=yuv420p','-c:v','libx264','-preset','medium','-crf','23','-movflags','+faststart','-an','-y',str(root/'media/setup-guide.mp4')],check=True)
  (root/'guide-captions.vtt').write_text('\n'.join(captions))
  (root/'docs/video-transcript.md').write_text('\n'.join(transcript))
  print(f'Created {elapsed}s guide: {(root/"media/setup-guide.mp4").stat().st_size} bytes')
finally:server.shutdown();server.server_close()
