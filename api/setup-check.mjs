import {readMenuSource,sheetCsvUrl} from '../lib/sheet.mjs';
import {selectSpecials} from '../lib/menu.mjs';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST'});}
  try {
    const sheetUrl=req.body?.sheetUrl;
    if(typeof sheetUrl!=='string'||sheetUrl.length>500)throw new Error('Paste your Google Sheet link.');
    sheetCsvUrl(sheetUrl);
    const rows=selectSpecials(await readMenuSource({source:'google-sheet',sheetUrl}));
    // Never put another restaurant’s specials into a newly generated package.
    return res.status(200).json({rows,updatedAt:new Date().toISOString()});
  }catch(error){return res.status(400).json({error:/Google|Sheet|columns|CSV|tab/.test(error.message)?error.message:'Cannot read that Sheet. Check link sharing and try again.'});}
}
