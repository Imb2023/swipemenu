import {readFile,writeFile} from 'node:fs/promises';
export async function writePackageTemplate(root,output) {
 const files=['index.html','app.js','styles.css','sw.js','register-sw.js','manifest.json','api/menu.mjs','lib/menu.mjs','lib/sheet.mjs','scripts/sync-menu.mjs','LICENSE'];
 const entries={};for(const file of files)entries[file]=await readFile(new URL(file,root),'utf8');
 entries['package.json']=JSON.stringify({name:'ismasigns-specials',version:'1.0.0',private:true,license:'MIT',type:'module',engines:{node:'>=24'},scripts:{build:'node scripts/build.mjs','sync-menu':'node scripts/sync-menu.mjs'}},null,2);
 entries['vercel.json']=JSON.stringify({framework:null,buildCommand:'npm run build',outputDirectory:'dist',functions:{'api/menu.mjs':{maxDuration:30}},headers:[{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: blob:; media-src 'self' https://res.cloudinary.com blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"}]}]},null,2);
 entries['scripts/build.mjs']=`import {mkdir,copyFile,readFile,writeFile,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','app.js','styles.css','sw.js','register-sw.js','manifest.json','brand.svg'])await copyFile(file,'dist/'+file);
const data=await readFile('menu.snapshot.json','utf8');
await writeFile('dist/menu-data.js','window.INITIAL_MENU = '+data.replaceAll('<','\\\\u003c')+';');
const config=JSON.parse(await readFile('site.config.json','utf8'));
if(config.url){const u=new URL(config.url);if(u.protocol!=='https:')throw Error('Use HTTPS');let html=await readFile('dist/index.html','utf8');html=html.replaceAll('content="/brand.svg"','content="'+new URL('brand.svg',u).href+'"');await writeFile('dist/index.html',html);}
try{await cp('media','dist/media',{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}
let worker=await readFile('dist/sw.js','utf8');const hash=createHash('sha256');for(const f of ['index.html','app.js','styles.css','menu-data.js','brand.svg'])hash.update(await readFile('dist/'+f));worker=worker.replace(/const CACHE = "[^"]+";/,'const CACHE = "instant-menu-'+hash.digest('hex').slice(0,12)+'";');await writeFile('dist/sw.js',worker);
`;
 entries['START-HERE.md']=`# IsmaSigns Specials\n\n1. Unzip this package. Upload the contents (not the enclosing folder) into your own new GitHub repository. Keep api/, lib/ and scripts/ folders intact.\n2. Import that repository into Vercel: framework Other, build npm run build, output dist. Choose a hosting plan permitting restaurant commercial use.\n3. Open your site and /api/menu. Check prices, images and availability on mobile data before printing a QR code.\n4. Edit your dedicated public Sheet for daily changes; up to three available Specials rows appear in order. Allow about a minute plus Google response time.\n\nYour saved menu is already included. For major changes, with Node 24 installed run npm run sync-menu, commit menu.snapshot.json and redeploy. If live refresh fails, the saved menu remains visible; staff must confirm availability. Never add private information to the publicly readable Sheet.\n\nUpload your own small WebP photos (about 800×1000, under 150 KB) in media/, deploy, then paste https://YOUR-SITE/media/filename.webp into the image column. Images are linked, not copied into this package. Replace app icons/share artwork before promoting the site; the included letter icon is a starter, and SVG social previews are not supported by all services.\n\nMIT covers code, not third-party photos or hosting. No credentials are required in this package.\n`;
 entries['.gitignore']='dist/\nnode_modules/\n.env*\n';
 await writeFile(new URL('package-template.json',output),JSON.stringify(entries));
}
