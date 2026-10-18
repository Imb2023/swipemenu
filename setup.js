import {zip} from './zip.js';
const form=document.querySelector('#setup'),status=document.querySelector('#result');
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button');button.disabled=true;status.textContent='Checking your Sheet…';
  try {
    const data=Object.fromEntries(new FormData(form));data.restaurant=data.restaurant.trim();
    if(!data.restaurant)throw new Error('Enter your restaurant name.');
    if(data.siteUrl){const u=new URL(data.siteUrl);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw new Error('Use a public HTTPS website address without a query or fragment.');data.siteUrl=u.href;}
    const response=await fetch('/api/setup-check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sheetUrl:data.sheetUrl})});
    const snapshot=await response.json();if(!response.ok)throw new Error(snapshot.error);
    status.textContent='Preparing your menu package…';
    const template=await fetch('package-template.json');if(!template.ok)throw new Error('Package template unavailable. Please try again.');
    const entries=await template.json();
    entries['menu.config.json']=JSON.stringify({source:'google-sheet',sheetUrl:data.sheetUrl},null,2);
    entries['menu.snapshot.json']=JSON.stringify(snapshot,null,2);
    entries['site.config.json']=JSON.stringify({url:data.siteUrl||''},null,2);
    entries['index.html']=entries['index.html'].replace(/<h1>.*?<\/h1>/,`<h1>${escape(data.restaurant)}</h1>`).replace(/<title>.*?<\/title>/,`<title>${escape(data.restaurant)} · Specials</title>`).replace(/<a class="demo-link".*?<\/a>/,'').replaceAll('Instant Specials Menu',escape(data.restaurant));
    entries['styles.css']+='\n:root{--accent:'+data.accent+';}\n';
    entries['app.js']=entries['app.js'].replace('return `$${num.toFixed(decimals)}`;', 'return '+JSON.stringify(data.currency)+' + num.toFixed(decimals);');
    const manifest=JSON.parse(entries['manifest.json']);manifest.name=data.restaurant;manifest.short_name=data.restaurant.slice(0,20);manifest.icons=[{src:'brand.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}];delete manifest.screenshots;entries['manifest.json']=JSON.stringify(manifest,null,2);
    entries['brand.svg']='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#171a18"/><text x="256" y="340" text-anchor="middle" font-family="sans-serif" font-size="300" fill="'+data.accent+'">'+escape(data.restaurant[0].toUpperCase())+'</text></svg>';
    entries['index.html']=entries['index.html'].replaceAll('favicon.ico','brand.svg').replaceAll('apple-touch-icon.png','brand.svg').replaceAll('/assets/social-preview.png','/brand.svg');
    entries['sw.js']=entries['sw.js'].replace(/const ASSETS = \[[\s\S]*?\];/,'const ASSETS = ["./", "./index.html", "./app.js", "./menu-data.js", "./register-sw.js", "./styles.css", "./manifest.json", "./brand.svg"];');
    const filename='IsmaSigns-Specials-'+data.restaurant.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)+'.zip';
    const url=URL.createObjectURL(zip(entries)),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    status.textContent=`Downloaded ${filename}. ${snapshot.rows.length} published special${snapshot.rows.length===1?'':'s'} included. Open START-HERE.md inside your package for deployment steps.`;
  } catch(error){status.textContent=error.message||'Could not create your package. Please try again.';}
  finally{button.disabled=false;}
});
