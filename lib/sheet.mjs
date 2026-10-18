// Accept a normal public Google Sheet link; never fetch arbitrary setup URLs.
export function sheetCsvUrl(value) {
  const u=new URL(value);
  const match=u.pathname.match(/^\/spreadsheets\/d\/([\w-]+)\/(?:edit|view|)$/);
  if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||u.username||u.password||!match) throw new Error('Use a Google Sheets /spreadsheets/d/…/edit link.');
  const gid=u.searchParams.get('gid')||new URLSearchParams(u.hash.slice(1)).get('gid')||'0';
  if(!/^\d+$/.test(gid)) throw new Error('Invalid Sheet tab.');
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
}
export function parseSheetCsv(text) {
  if(text.length>1000000) throw new Error('Use a smaller dedicated menu Sheet.');
  const records=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&(c===','||c==='\n')) {row.push(cell.replace(/\r$/,''));cell='';if(c==='\n'){records.push(row);row=[];}}
    else cell+=c;
  }
  if(quoted) throw new Error('Invalid CSV.');
  if(cell||row.length){row.push(cell.replace(/\r$/,''));records.push(row);}
  const headers=(records.shift()||[]).map(x=>x.replace(/^\uFEFF/,'').trim().toLowerCase());
  if(!['name','category','available'].every(x=>headers.includes(x))) throw new Error('The Sheet needs name, category and available columns.');
  return records.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])));
}
export async function readMenuSource(config) {
  const csv=config.source==='google-sheet';
  const url=csv?sheetCsvUrl(config.sheetUrl):config.sheetUrl;
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok) throw new Error('Cannot read the Sheet. Set General access to Anyone with the link, Viewer.');
  if(!csv)return response.json();
  const reader=response.body.getReader();const chunks=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1000000)throw new Error('Use a smaller dedicated menu Sheet.');chunks.push(value);}}finally{await reader.cancel();}
  const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}
  return parseSheetCsv(new TextDecoder().decode(all));
}
