import assert from 'node:assert/strict';
import {ProgressRegistry,mergeProgress} from './progress.mjs';
const rows=new Map(),storage={async get(k){return structuredClone(rows.get(k))},async put(k,v){rows.set(k,structuredClone(v))},async delete(k){rows.delete(k)},alarmAt:null,async getAlarm(){return this.alarmAt},async setAlarm(t){this.alarmAt=t},async list({prefix}){return new Map([...rows].filter(([k])=>k.startsWith(prefix)))},async transaction(fn){return fn(this)}};
const registry=new ProgressRegistry({storage});let n=0;
async function call(op,body){const r=await registry.fetch(new Request('https://test/progress/'+op,{method:'POST',headers:{'CF-Connecting-IP':'test-'+n++},body:JSON.stringify(body)}));return {status:r.status,...await r.json()}}
const a=await call('create',{progress:{characters:[0,2],levels:{0:3},flags:['gallery_unlocked'],runs:[{secret:'must not sync'}],wins:99}});assert.equal(a.status,200);assert.equal(a.code.length,8);
const b=await call('join',{code:a.code,progress:{characters:[1,3],levels:{0:1,1:4},flags:['cpu_viewer_unlocked'],achievements:['character:3']}});assert.equal(b.group,a.group);assert.equal(b.token,a.token);assert.deepEqual(b.progress.characters,[0,1,2,3]);assert.deepEqual(b.progress.levels,{'0':3,'1':4});assert(!('wins'in b.progress));assert(!('runs'in b.progress));
assert.equal((await call('join',{code:a.code})).status,400);
assert.equal((await call('sync',{group:a.group,token:'wrong'})).status,400);
const synced=await call('sync',{group:a.group,token:a.token,progress:{characters:[5],levels:{1:5},flags:['relicless_unlocked']}});assert.deepEqual(synced.progress.characters,[0,1,2,3,5]);assert.equal(synced.progress.levels[1],5);assert.equal(synced.progress.flags.length,3);
const next=await call('create',{group:a.group,token:a.token});
// Codes last 24 hours (user, 2026-11-23).
{const left=rows.get('code:'+next.code).expires-Date.now();assert(left>23.9*3600000&&left<=24*3600000,'link code lasts 24 hours')}const pair=rows.get('code:'+next.code);pair.expires=0;assert.equal((await call('join',{code:next.code})).status,400);await registry.alarm();assert(!rows.has('code:'+next.code));
assert.deepEqual(mergeProgress(synced.progress,synced.progress),synced.progress);
console.log('PASS pairing, shared updates, monotonic merging, consumed/expired codes, authorization, secret/challenge unlocks, no runs/stats in cloud payload');
// Regression: a Level 6 clear (rainbow portrait) must survive the Worker merge so linked devices show it.
const top=await call('sync',{group:a.group,token:a.token,progress:{levels:{0:6,2:6}}});assert.equal(top.progress.levels[0],6);assert.equal(top.progress.levels[2],6);
assert.deepEqual(mergeProgress({levels:{0:2}},{levels:{0:6,1:7}}).levels,{'0':6});
console.log('PASS Level 6 clears sync; levels above 6 are rejected');
// Card sleeves and the sleevesforall unlock sync between linked devices (user, 2026-11-14).
const sl=await call('sync',{group:a.group,token:a.token,progress:{achievements:['sleeve:gate-guardian','sleeve:3','sleeve:../x','sleeve:BAD',7],flags:['sleeves_all','made_up']}});
assert(sl.progress.achievements.includes('sleeve:gate-guardian')&&sl.progress.achievements.includes('sleeve:3'));
assert(!sl.progress.achievements.some(x=>x==='sleeve:../x'||x==='sleeve:BAD'));assert(sl.progress.flags.includes('sleeves_all')&&!sl.progress.flags.includes('made_up'));
const kept=await call('sync',{group:a.group,token:a.token,progress:{}});assert(kept.progress.achievements.includes('sleeve:gate-guardian')&&kept.progress.flags.includes('sleeves_all'));
console.log('PASS card sleeve achievements and sleevesforall sync; bad sleeve ids are dropped');
