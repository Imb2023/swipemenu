import config from '../menu.config.json' with {type:'json'};
import snapshot from '../menu.snapshot.json' with {type:'json'};
import {selectSpecials} from '../lib/menu.mjs';
let latest = snapshot;
let refreshed = 0;
let pending;
export default async function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if (req.method !== 'GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET'});}
  // Cache on the CDN; the seeded menu is already visible while this revalidates.
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=86400');
  res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=60, stale-while-revalidate=86400');
  if (Date.now()-refreshed > 60000) {
    pending ||= (async () => {
      const response = await fetch(config.sheetUrl,{signal:AbortSignal.timeout(25000)});
      if (!response.ok) throw new Error('Menu source unavailable');
      const rows = selectSpecials(await response.json());
      latest = {rows,updatedAt:new Date().toISOString()};refreshed=Date.now();
    })().finally(() => {pending=undefined;});
    try {await pending;} catch {
      res.setHeader('Cache-Control','public, max-age=0, s-maxage=15, stale-while-revalidate=300');
      res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=15, stale-while-revalidate=300');
      return res.status(200).json({...latest,stale:true});
    }
  }
  return res.status(200).json({...latest,stale:false});
}
