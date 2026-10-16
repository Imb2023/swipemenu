import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root });
const read = file => readFile(path.join(root, 'dist', file));
function pngSize(buffer) {
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
  return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
}
test('manifest icons and screenshots exist with declared dimensions', async () => {
  const manifest = JSON.parse(await read('manifest.json'));
  assert.equal(manifest.scope, './');
  assert.equal(manifest.theme_color, '#111210');
  for (const asset of [...manifest.icons, ...manifest.screenshots]) {
    assert.equal(pngSize(await read(asset.src)), asset.sizes, asset.src);
  }
  assert.equal(pngSize(await read('apple-touch-icon.png')), '180x180');
  assert.equal(pngSize(await read('assets/social-preview.png')), '1200x630');
});
test('production HTML uses only local scripts and all local references exist', async () => {
  const html = (await read('index.html')).toString();
  assert.doesNotMatch(html, /<script\b(?![^>]*src=)/i);
  assert.doesNotMatch(html, /cdn\.tailwindcss/);
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (!ref.startsWith('http')) await read(ref.replace(/^\.\//, ''));
  }
});
test('deployment output excludes development files and Vercel uses dist', async () => {
  const files = await readdir(path.join(root, 'dist'));
  for (const privateName of ['tests', '.git', '.agents', 'scripts', 'package.json', 'node_modules']) assert.ok(!files.includes(privateName));
  const vercel = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
  assert.equal(vercel.outputDirectory, 'dist');
  assert.equal(vercel.buildCommand, 'npm run build');
  const headers = vercel.headers[0].headers;
  const csp = headers.find(h => h.key === 'Content-Security-Policy').value;
  assert.ok(csp.includes("script-src 'self'"));
  assert.ok(csp.includes('https://script.googleusercontent.com'));
});
test('every offline shell asset exists and built worker has a content-derived version', async () => {
  const worker = (await read('sw.js')).toString();
  assert.match(worker, /const CACHE = "instant-menu-[a-f0-9]{12}";/);
  const assets = worker.match(/const ASSETS = (\[[\s\S]*?\]);/)[1];
  for (const ref of JSON.parse(assets)) await read(ref === './' ? 'index.html' : ref.slice(2));
  const previous = worker;
  execFileSync(process.execPath, ['scripts/build.mjs'], {cwd:root});
  assert.equal((await read('sw.js')).toString(), previous, 'identical inputs produce an identical offline cache');
});
test('public deployment URL generates absolute sharing links, canonical URL, and sitemap', async () => {
  try {
    execFileSync(process.execPath, ['scripts/build.mjs'], {cwd:root, env:{...process.env,SITE_URL:'https://menu.example.com/'}});
    const html = (await read('index.html')).toString();
    assert.ok(html.includes('rel="canonical" href="https://menu.example.com/"'));
    assert.ok(html.includes('content="https://menu.example.com/assets/social-preview.png"'));
    assert.ok((await read('sitemap.xml')).toString().includes('https://menu.example.com/'));
    assert.ok((await read('robots.txt')).toString().includes('Sitemap: https://menu.example.com/sitemap.xml'));
  } finally {
    execFileSync(process.execPath, ['scripts/build.mjs'], {cwd:root});
  }
});

test('uploaded media is copied byte-for-byte into the public deployment', async () => {
  const source = await readFile(path.join(root, 'media/don-pedro.webp'));
  assert.deepEqual(await read('media/don-pedro.webp'), source);
  assert.equal(source.subarray(0,4).toString(), 'RIFF');
  assert.equal(source.subarray(8,12).toString(), 'WEBP');
  assert.ok(source.length < 60000, 'First special image should remain lightweight');
  const publicMedia = await readdir(path.join(root,'dist/media'));
  assert.ok(publicMedia.includes('don-pedro.webp'));
  assert.ok(publicMedia.every(name => /\.(avif|webp|jpe?g|png|mp4|webm)$/i.test(name)), 'Only supported media enters the public folder');
});
