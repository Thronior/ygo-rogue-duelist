import assert from 'node:assert/strict';
import {ProgressRegistry,mergeProgress} from './progress.mjs';
const rows=new Map(),storage={async get(k){return structuredClone(rows.get(k))},async put(k,v){rows.set(k,structuredClone(v))},async delete(k){rows.delete(k)},async setAlarm(){},async list({prefix}){return new Map([...rows].filter(([k])=>k.startsWith(prefix)))},async transaction(fn){return fn(this)}};
const registry=new ProgressRegistry({storage});let n=0;
async function call(op,body){const r=await registry.fetch(new Request('https://test/progress/'+op,{method:'POST',headers:{'CF-Connecting-IP':'test-'+n++},body:JSON.stringify(body)}));return {status:r.status,...await r.json()}}
const a=await call('create',{progress:{characters:[0,2],levels:{0:3},flags:['gallery_unlocked'],runs:[{secret:'must not sync'}],wins:99}});assert.equal(a.status,200);assert.equal(a.code.length,8);
const b=await call('join',{code:a.code,progress:{characters:[1,3],levels:{0:1,1:4},flags:['cpu_viewer_unlocked'],achievements:['character:3']}});assert.equal(b.group,a.group);assert.equal(b.token,a.token);assert.deepEqual(b.progress.characters,[0,1,2,3]);assert.deepEqual(b.progress.levels,{'0':3,'1':4});assert(!('wins'in b.progress));assert(!('runs'in b.progress));
assert.equal((await call('join',{code:a.code})).status,400);
assert.equal((await call('sync',{group:a.group,token:'wrong'})).status,400);
const synced=await call('sync',{group:a.group,token:a.token,progress:{characters:[5],levels:{1:5},flags:['relicless_unlocked']}});assert.deepEqual(synced.progress.characters,[0,1,2,3,5]);assert.equal(synced.progress.levels[1],5);assert.equal(synced.progress.flags.length,3);
const next=await call('create',{group:a.group,token:a.token});const pair=rows.get('code:'+next.code);pair.expires=0;assert.equal((await call('join',{code:next.code})).status,400);await registry.alarm();assert(!rows.has('code:'+next.code));
assert.deepEqual(mergeProgress(synced.progress,synced.progress),synced.progress);
console.log('PASS pairing, shared updates, monotonic merging, consumed/expired codes, authorization, secret/challenge unlocks, no runs/stats in cloud payload');
