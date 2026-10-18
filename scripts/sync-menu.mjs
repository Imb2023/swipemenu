import {readFile,writeFile} from 'node:fs/promises';
import {selectSpecials} from '../lib/menu.mjs';
const root = new URL('../',import.meta.url);
const config = JSON.parse(await readFile(new URL('menu.config.json',root),'utf8'));
const response = await fetch(config.sheetUrl,{signal:AbortSignal.timeout(30000)});
if (!response.ok) throw new Error(`Sheet returned ${response.status}`);
const rows = selectSpecials(await response.json());
await writeFile(new URL('menu.snapshot.json',root),JSON.stringify({rows,updatedAt:new Date().toISOString()},null,2)+'\n');
console.log(`Published snapshot: ${rows.length} specials`);
