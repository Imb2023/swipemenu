import test from 'node:test';
import assert from 'node:assert/strict';
import {selectSpecials} from '../lib/menu.mjs';
import handler from '../api/menu.mjs';
test('only published specials appear; unrelated featured rows and blanks are excluded',()=>{
 const rows=selectSpecials([{name:'Drink',category:'Specials',available:'TRUE',order:'2'}, {name:'Food',category:'special',available:true,order:0},{name:'Signage',category:'Menu',available:true,featured:true},{name:'Unavailable',category:'Specials',available:false},{name:'',category:'Specials',available:true}]);
 assert.deepEqual(rows.map(r=>r.name),['Food','Drink']);assert.equal(rows[0].order,0);
});
test('a valid empty Sheet response can withdraw all specials',()=>assert.deepEqual(selectSpecials([]),[]));
test('invalid response does not masquerade as an empty menu',()=>assert.throws(()=>selectSpecials({error:'unavailable'})));
test('menu endpoint preserves its snapshot when upstream fails, then shares and caches successful refreshes',async()=>{
 const original=globalThis.fetch;let calls=0;
 function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(b){this.body=b;return this;}};}
 try{
  globalThis.fetch=async()=>{calls++;throw new Error('offline');};
  const fallback=response();await handler({method:'GET'},fallback);
  assert.equal(fallback.code,200);assert.equal(fallback.body.stale,true);assert.ok(fallback.body.rows.length);
  globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>[{name:'Updated drink',category:'Specials',available:true}]};};
  const a=response(),b=response();await Promise.all([handler({method:'GET'},a),handler({method:'GET'},b)]);
  assert.equal(calls,2);assert.equal(a.body.rows[0].name,'Updated drink');assert.equal(a.body.stale,false);
  await handler({method:'GET'},response());assert.equal(calls,2);
  assert.match(a.headers['Cache-Control'],/s-maxage=60/);
 }finally{globalThis.fetch=original;}
});
