"""Exercise the actual browser download, inspect its ZIP, and build the result."""
import functools,json,threading,tempfile,zipfile,subprocess,sys,uuid
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):
  for h in json.loads((root/'vercel.json').read_text())['headers'][0]['headers']:self.send_header(h['key'],h['value'])
  super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with tempfile.TemporaryDirectory() as folder, sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':390,'height':844})
  page.route('**/api/setup-check',lambda r:r.fulfill(json={'rows':[{'name':'Own offer </script>','category':'Specials','available':True,'price':'12'}],'updatedAt':'2026-10-18T00:00:00Z'}))
  page.goto(f'http://127.0.0.1:{server.server_port}/setup.html')
  page.locator('[name=restaurant]').fill('Café <Test>')
  page.locator('[name=sheetUrl]').fill('https://docs.google.com/spreadsheets/d/abc123/edit#gid=7')
  page.locator('[name=currency]').fill('€')
  with page.expect_download() as result:page.locator('button').click()
  download=result.value;archive=Path(folder)/'menu.zip';download.save_as(archive)
  assert download.suggested_filename.startswith('IsmaSigns-Specials-')
  with zipfile.ZipFile(archive) as z:
   assert z.testzip() is None
   z.extractall(Path(folder)/'app')
  app=Path(folder)/'app'
  assert 'Don Pedro' not in (app/'menu.snapshot.json').read_text()
  assert 'Café &lt;Test&gt;' in (app/'index.html').read_text()
  assert '€' in (app/'app.js').read_text()
  subprocess.run(['node','scripts/build.mjs'],cwd=app,check=True)
  seed=(app/'dist/menu-data.js').read_text()
  assert '</script>' not in seed,seed
  assert '\\u003c/script>' in seed,seed
  assert (app/'dist/brand.svg').exists()
  for file in ['Dockerfile','.dockerignore','compose.yaml','server.mjs']:assert (app/file).exists()
  if '--docker' in sys.argv:
   subprocess.run(['docker','build','-t','ismasigns-specials:package-test','.'],cwd=app,check=True)
   name='ismasigns-package-test-'+uuid.uuid4().hex[:8]
   try:
    subprocess.run(['docker','run','-d','--name',name,'--read-only','--cap-drop','ALL','ismasigns-specials:package-test'],check=True)
    subprocess.run(['docker','exec',name,'node','-e',"fetch('http://127.0.0.1:3000/').then(async r=>{if(!r.ok||!(await r.text()).includes('Café &lt;Test&gt;'))process.exit(1)})"],check=True)
   finally:subprocess.run(['docker','rm','-f',name],check=True)
  assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
  browser.close()
  print('PASS: personalized ZIP download, CRC integrity, safe branding, own snapshot, generated project build')
finally:server.shutdown();server.server_close()
