import test from 'node:test';
import assert from 'node:assert/strict';
import {sheetCsvUrl,parseSheetCsv,readMenuSource} from '../lib/sheet.mjs';
import handler from '../api/setup-check.mjs';
test('normal Sheet links preserve selected tab and reject arbitrary hosts',()=>{
 assert.equal(sheetCsvUrl('https://docs.google.com/spreadsheets/d/abc123/edit#gid=42'),'https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=42');
 for(const url of ['http://docs.google.com/spreadsheets/d/abc/edit','https://evil.example/spreadsheets/d/abc/edit','https://docs.google.com@evil.example/spreadsheets/d/abc/edit','https://docs.google.com/spreadsheets/d/abc/edit#gid=bad'])assert.throws(()=>sheetCsvUrl(url));
});
test('CSV handles quotes, commas, newlines, and missing schema',()=>{
 const rows=parseSheetCsv('name,category,available,description\r\n"Chef’s, special",Specials,TRUE,"A ""great"" meal\nwith rice"\r\n');
 assert.equal(rows[0].name,'Chef’s, special');assert.equal(rows[0].description,'A "great" meal\nwith rice');
 assert.throws(()=>parseSheetCsv('<html>Login</html>'));assert.throws(()=>parseSheetCsv('name,category,available\n"broken'));
});
test('setup check returns published fields only and rejects unreadable sources',async()=>{
 const original=globalThis.fetch;
 const res=()=>({setHeader(){},status(n){this.code=n;return this;},json(value){this.value=value;return this;}});
 try {
  globalThis.fetch=async()=>new Response('name,category,available,private\nPublic,Specials,TRUE,secret\nDraft,Draft,TRUE,secret');
  const output=res();await handler({method:'POST',body:{sheetUrl:'https://docs.google.com/spreadsheets/d/abc/edit'}},output);
  assert.equal(output.code,200);assert.equal(output.value.rows.length,1);assert.ok(!JSON.stringify(output.value).includes('secret'));
  globalThis.fetch=async()=>new Response('denied',{status:403});
  await assert.rejects(readMenuSource({source:'google-sheet',sheetUrl:'https://docs.google.com/spreadsheets/d/abc/edit'}));
 }finally{globalThis.fetch=original;}
});
