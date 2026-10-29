import assert from 'node:assert/strict';
import {BackupRegistry} from './backup.mjs';
let time=1900000000000;Date.now=()=>time;
const rows=new Map(),storage={async get(k){return structuredClone(rows.get(k))},async put(k,v){assert(Buffer.byteLength(JSON.stringify(v))<128*1024,'DO value size');rows.set(k,structuredClone(v))},async delete(k){rows.delete(k)},async list({prefix,limit=100,startAfter=''}){return new Map([...rows].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort().slice(0,limit))},async transaction(fn){const old=structuredClone(rows);try{return await fn(this)}catch(e){rows.clear();for(const [k,v] of old)rows.set(k,v);throw e}}};
const registry=new BackupRegistry({storage},{BACKUP_ADMIN_TOKEN:'admin-test'});let calls=0;
async function call(op,v={},auth){const r=await registry.fetch(new Request('https://test/backup/'+op,{method:'POST',headers:{'CF-Connecting-IP':'test-'+calls++,...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify(v)}));return {status:r.status,...await r.json()}}
const code='SB-'+'A'.repeat(24),token='b'.repeat(64),backup={schema:1,files:{'profile.json':JSON.stringify({unlocked:[0,1,3],wins:42}), 'collector.json':JSON.stringify({duelists:[{name:'Test Collector',id:'owner',token:'private-uc-token',status:'alive',character:3,pool:Array(30000).fill(42)}]}),'run.json':JSON.stringify({gold:123}), 'profile.bak':'{}'},extras:{'ygo-global-stats-v1':'{"counts":{"seconds":500}}'},version:'test',platform:'Home Screen'};
assert.equal((await call('list')).status,401);assert.equal((await call('export',{code})).status,401);
assert.equal((await call('put',{code,token,backup})).status,200);
assert.equal((await call('put',{code,token:'c'.repeat(64),backup})).status,401);
const listing=await call('list',{},'admin-test');assert.equal(listing.backups.length,1);assert(!JSON.stringify(listing).includes(token));assert(!JSON.stringify(listing).includes('private-uc-token'));assert.equal(listing.backups[0].summary.collectors[0].name,'Test Collector');const first=listing.backups[0].latest;
const exported=await call('export',{code},'admin-test');assert.deepEqual(exported.backup,backup);
time+=31000;const changed=structuredClone(backup);changed.files['run.json']='{"gold":456}';assert.equal((await call('put',{code,token,backup:changed})).status,200);assert.equal((await call('export',{code,revision:first},'admin-test')).backup.files['run.json'],'{"gold":123}');
const count=rows.size;time+=31000;assert((await call('put',{code,token,backup:changed})).unchanged);assert.equal(rows.size,count);
const malformed=structuredClone(backup);malformed.files['../escape.json']='{}';time+=31000;assert.equal((await call('put',{code,token,backup:malformed})).status,400);
for(let i=0;i<45;i++){time+=86400000;changed.files['run.json']=JSON.stringify({gold:i});assert.equal((await call('put',{code,token,backup:changed})).status,200)}
const meta=rows.get('meta:'+code);assert(meta.snapshots.length<=34);assert(meta.snapshots.some(s=>s.id===first));assert.equal((await call('export',{code,revision:first},'admin-test')).backup.files['run.json'],'{"gold":123}');
// Encrypted cloud saves: the server stores an opaque blob under a derived id, readable back only with the
// matching write password; a wrong password and a missing save look the same.
let alarm=null;storage.getAlarm=async()=>alarm;storage.setAlarm=async t=>{alarm=t};
const id='d'.repeat(64),auth='e'.repeat(64),blob='ygo1g.'+'A'.repeat(16)+'.'+'QUJD'.repeat(20000);
time+=31000;assert.equal((await call('save',{id,auth,blob})).status,200);assert(alarm>time,'the daily retention sweep is scheduled');
const stored=JSON.stringify([...rows].filter(([k])=>k.startsWith('enc:')||k.startsWith('blob:')));assert(!stored.includes(auth),'only a hash of the write password is kept');
assert.deepEqual((await call('load',{id,auth})).blob,blob);
const wrongAuth=await call('load',{id,auth:'f'.repeat(64)}),noSave=await call('load',{id:'9'.repeat(64),auth});
assert.equal(wrongAuth.status,404);assert.equal(noSave.status,404);assert.equal(wrongAuth.error,noSave.error);assert(!wrongAuth.blob);
assert.equal((await call('save',{id,auth:'f'.repeat(64),blob})).status,409,'another code cannot overwrite a save');
time+=31000;const blob2='ygo1n.'+'B'.repeat(16)+'.'+'REVG';assert.equal((await call('save',{id,auth,blob:blob2})).status,200);assert.equal((await call('load',{id,auth})).blob,blob2);
assert.equal([...rows.keys()].filter(k=>k.startsWith('blob:')).length,1,'the previous upload is removed');
assert.equal((await call('save',{id:'1'.repeat(64),auth,blob:'not encrypted'})).status,400);
assert.equal((await call('delete',{id,auth:'f'.repeat(64)})).status,404);assert.equal((await call('delete',{id,auth})).status,200);
assert.equal((await call('load',{id,auth})).status,404);assert(![...rows.keys()].some(k=>k.startsWith('enc:')||k.startsWith('blob:')));
// Saves untouched for a year are swept; fresh ones stay.
const oldId='2'.repeat(64),newId='3'.repeat(64);time+=31000;await call('save',{id:oldId,auth,blob:blob2});time+=366*86400000;await call('save',{id:newId,auth,blob:blob2});
await registry.alarm();assert.equal((await call('load',{id:oldId,auth})).status,404);assert.equal((await call('load',{id:newId,auth})).status,200);
// A migrated device deletes its old unencrypted backup with the old token; nobody else can.
assert.equal((await call('forget',{code,token:'c'.repeat(64)})).status,404);assert.equal((await call('forget',{code,token})).status,200);
assert(![...rows.keys()].some(k=>k.startsWith('meta:'+code)||k.startsWith('data:'+code)));
// Once blocked, old clients' unencrypted uploads are refused.
const blocked=new BackupRegistry({storage},{LEGACY_BACKUPS:'block'});
const legacy=await blocked.fetch(new Request('https://test/backup/put',{method:'POST',headers:{'CF-Connecting-IP':'legacy'},body:JSON.stringify({code,token,backup})}));assert.equal(legacy.status,426);
console.log('PASS full UC credentials/large saves round-trip, admin-only access, ownership authorization, no credentials in listing, historical recovery, bounded retention, no-op dedupe, invalid filenames rejected, encrypted saves by derived id, one-year sweep, legacy forget and block');
