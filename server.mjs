import http from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';

const root=fileURLToPath(new URL('./',import.meta.url));
const publicRoot=await realpath(path.join(root,'dist'));
const config=JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8'));
const routes=new Map();
for(const name of ['menu','setup-check','upload-signature']) {
  try {await stat(path.join(root,'api',name+'.mjs'));}
  catch(error){if(error.code==='ENOENT')continue;throw error;}
  routes.set('/api/'+name,(await import('./api/'+name+'.mjs')).default);
}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm','.vtt':'text/vtt; charset=utf-8','.csv':'text/csv; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  res.status=code=>{res.statusCode=code;return res;};
  res.json=data=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));return res;};
  for(const {key,value} of config.headers?.find(h=>h.source==='/(.*)')?.headers||[])res.setHeader(key,value);
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/healthz')return res.status(200).json({status:'ok'});
    if(routes.has(pathname)){
      if(req.method==='POST'){
        if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return res.status(415).json({error:'Use JSON.'});
        if(Number(req.headers['content-length'])>4096){req.resume();return res.status(413).json({error:'Request too large.'});}
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>4096)return res.status(413).json({error:'Request too large.'});chunks.push(chunk);}
        try{req.body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return res.status(400).json({error:'Invalid JSON.'});}
      }
      return await routes.get(pathname)(req,res);
    }
    if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'Use GET or HEAD.'});}
    // Resolve real paths too, so a symlink cannot expose files outside dist.
    const candidate=path.resolve(publicRoot,'.'+(pathname==='/'?'/index.html':pathname));
    if(!candidate.startsWith(publicRoot+path.sep))return res.status(404).json({error:'Not found.'});
    const file=await realpath(candidate);
    if(!file.startsWith(publicRoot+path.sep))return res.status(404).json({error:'Not found.'});
    const info=await stat(file);if(!info.isFile())return res.status(404).json({error:'Not found.'});
    res.setHeader('Content-Type',types[path.extname(file).toLowerCase()]||'application/octet-stream');
    res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
    res.setHeader('Accept-Ranges','bytes');
    let start=0,end=info.size-1;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(match&&(match[1]||match[2])){
        start=match[1]?Number(match[1]):Math.max(0,info.size-Number(match[2]));
        end=match[1]?(match[2]?Math.min(Number(match[2]),end):end):end;
      }else start=NaN;
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=info.size){res.setHeader('Content-Range',`bytes */${info.size}`);return res.status(416).end();}
      res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
    }
    res.setHeader('Content-Length',Math.max(0,end-start+1));
    if(req.method==='HEAD'||info.size===0)return res.end();
    await pipeline(createReadStream(file,{start,end}),res);
  }catch(error){
    if(res.headersSent){res.destroy();return;}
    res.status(['ENOENT','ENOTDIR','EINVAL'].includes(error.code)||error instanceof URIError?404:500).json({error:'Request unavailable.'});
  }
});
server.requestTimeout=35000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('IsmaSigns Specials listening on port '+server.address().port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();});
