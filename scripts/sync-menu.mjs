import {readMenuSource} from '../lib/sheet.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {selectSpecials} from '../lib/menu.mjs';
const root = new URL('../',import.meta.url);
const config = JSON.parse(await readFile(new URL('menu.config.json',root),'utf8'));
const rows = selectSpecials(await readMenuSource(config));
await writeFile(new URL('menu.snapshot.json',root),JSON.stringify({rows,updatedAt:new Date().toISOString()},null,2)+'\n');
console.log(`Published snapshot: ${rows.length} specials`);
