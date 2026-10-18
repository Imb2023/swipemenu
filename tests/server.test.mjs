import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('standalone runtime serves the menu API, protects source files and supports video ranges',async()=>{
  // Test the real API modules without depending on a live Google account.
  const mock=`const original=globalThis.fetch;globalThis.fetch=(url,options)=>new URL(url).hostname==='script.google.com'?Promise.resolve(new Response(JSON.stringify([{name:'Runtime special',category:'Specials',available:true,private:'secret'}]))):original(url,options);`;
  const child=spawn(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(mock),'server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  let output='';child.stderr.on('data',chunk=>{output+=chunk;});
  try{
    const port=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Server startup timed out: '+output)),10000);
      child.stdout.on('data',chunk=>{const match=String(chunk).match(/port (\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
      child.once('exit',code=>{clearTimeout(timer);reject(new Error('Server exited '+code+': '+output));});
    });
    const base='http://127.0.0.1:'+port;
    const health=await fetch(base+'/healthz');assert.equal(health.status,200);assert.equal((await health.json()).status,'ok');
    const home=await fetch(base+'/');assert.equal(home.status,200);assert.match(home.headers.get('content-security-policy'),/script-src 'self'/);
    for(const file of ['/menu.config.json','/server.mjs','/.git/config','/%2e%2e%2fmenu.config.json'])assert.equal((await fetch(base+file)).status,404,file);
    const menu=await (await fetch(base+'/api/menu')).json();assert.equal(menu.rows[0].name,'Runtime special');assert.equal(menu.stale,false);assert.ok(!JSON.stringify(menu).includes('secret'));
    const wrong=await fetch(base+'/index.html',{method:'POST'});assert.equal(wrong.status,405);
    const malformed=await fetch(base+'/api/setup-check',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);
    const huge=await fetch(base+'/api/setup-check',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(5000)});assert.equal(huge.status,413);
    const range=await fetch(base+'/app.js',{headers:{Range:'bytes=0-19'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,20);assert.match(range.headers.get('content-range'),/^bytes 0-19\//);
    const invalid=await fetch(base+'/app.js',{headers:{Range:'bytes=99999999-'}});assert.equal(invalid.status,416);
    const head=await fetch(base+'/app.js',{method:'HEAD'});assert.equal(head.status,200);assert.ok(Number(head.headers.get('content-length'))>20);assert.equal((await head.text()).length,0);
  }finally{const exited=once(child,'exit');child.kill('SIGTERM');await exited;}
});
