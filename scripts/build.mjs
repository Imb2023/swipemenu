import {writePackageTemplate} from './package-template.mjs';
import { copyFile, mkdir, readdir, rm, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
// Only public runtime files enter the deployment; tests and skills stay private.
const snapshot = JSON.parse(await readFile(path.join(root, 'menu.snapshot.json'), 'utf8'));
const files = ['setup.html', 'setup.js', 'zip.js', 'guide.html', 'guide.css', 'guide-captions.vtt', 'demos.html', 'demos.css', 'demos.js', 'upload.html', 'upload.css', 'upload.js', 'upload-setup.html', 'index.html', 'app.js', 'register-sw.js', 'styles.css', 'sw.js', 'manifest.json',
  'robots.txt', 'logo.png', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png',
  'apple-touch-icon.png', 'icon-196.png', 'android-chrome-512x512.png', '1.png', '2.png', '3.png'];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) await copyFile(path.join(root, file), path.join(output, file));
await writeFile(path.join(output, 'menu-data.js'), 'window.INITIAL_MENU = ' + JSON.stringify(snapshot).replaceAll('<','\\u003c') + ';\n');
files.push('menu-data.js');
for (const [source, target] of [['docs/specials-template.csv', 'specials-template.csv'], ['docs/google-apps-script.gs', 'google-apps-script.txt']]) {
  await copyFile(path.join(root, source), path.join(output, target));
  files.push(target);
}
await mkdir(path.join(output, 'assets'), { recursive: true });
for (const file of await readdir(path.join(root, 'assets'))) {
  if (/\.(png|svg|webp)$/.test(file)) await copyFile(path.join(root, 'assets', file), path.join(output, 'assets', file));
}
// Keep staff-owned media in the checkout; deploy only supported public file types.
const mediaFiles = [];
await mkdir(path.join(output, 'media'), { recursive: true });
for (const entry of await readdir(path.join(root, 'media'), { withFileTypes: true })) {
  if (entry.isFile() && /\.(avif|webp|jpe?g|png|mp4|webm)$/i.test(entry.name)) {
    const file = `media/${entry.name}`;
    await copyFile(path.join(root, file), path.join(output, file));
    mediaFiles.push(file);
  }
}
mediaFiles.sort();
// Vercel supplies a deployment hostname; SITE_URL can pin a custom domain.
const siteConfig = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
const configuredSite = process.env.SITE_URL || siteConfig.url || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
if (configuredSite) {
  const site = new URL(configuredSite.includes('://') ? configuredSite : `https://${configuredSite}`);
  if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash) throw new Error('SITE_URL must be a public HTTPS site URL without credentials, query, or fragment');
  if (!site.pathname.endsWith('/')) site.pathname += '/';
  const htmlPath = path.join(output, 'index.html');
  let html = await readFile(htmlPath, 'utf8');
  html = html.replaceAll('content="/assets/social-preview.png"', `content="${new URL('assets/social-preview.png', site).href}"`);
  html = html.replace('  <title>', `  <link rel="canonical" href="${site.href}" />\n  <meta property="og:url" content="${site.href}" />\n  <title>`);
  await writeFile(htmlPath, html);
  await writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site.href}</loc></url></urlset>\n`);
  await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', site).href}\n`);
} else {
  console.warn('No public URL supplied: set SITE_URL for canonical metadata and absolute sharing images; Vercel hostnames are used automatically when provided.');
}
const manifest = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8'));
for (const entry of [...manifest.icons, ...manifest.screenshots]) await readFile(path.join(output, entry.src));
// New runtime contents get a new offline cache name on every build.
const hash = createHash('sha256');
for (const file of [...files, ...mediaFiles]) {hash.update(file); hash.update(await readFile(path.join(output, file)));}
const worker = await readFile(path.join(output, 'sw.js'), 'utf8');
await writeFile(path.join(output, 'sw.js'), worker.replace(/const CACHE = "[^"]+";/, `const CACHE = "instant-menu-${hash.digest('hex').slice(0, 12)}";`));
console.log(`Built static production site in ${output}`);

await writePackageTemplate(new URL('../',import.meta.url),new URL('../dist/',import.meta.url));
