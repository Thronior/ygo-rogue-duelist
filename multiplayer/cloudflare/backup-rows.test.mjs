// Rows written per cloud save (2026-11-11): the free plan allows 100,000 rows written a day across the account.
// A save is one value overwritten in place plus its meta row (2 rows). Older multipart saves move over once; saves
// too big for one value still use parts. Load, delete and the yearly sweep handle both layouts.
import assert from 'node:assert/strict';
import {BackupRegistry,ONE_VALUE,blobKeys} from './backup.mjs';
let time=1900000000000;Date.now=()=>time;
const rows=new Map(),writes={put:0,delete:0,alarm:0};let alarm=null;
const storage={
 async get(k){return structuredClone(rows.get(k))},
 async put(k,v){assert(Buffer.byteLength(JSON.stringify(v))+Buffer.byteLength(k)<8e6,'SQLite key+value limit');writes.put++;rows.set(k,structuredClone(v))},
 async delete(k){writes.delete++;rows.delete(k)},
 async list({prefix,limit=100,startAfter=''}){return new Map([...rows].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort().slice(0,limit))},
 async transaction(fn){return fn(this)},
 async getAlarm(){return alarm},async setAlarm(t){writes.alarm++;alarm=t}};
const registry=new BackupRegistry({storage},{});let ip=0;
const call=async(op,v)=>{const r=await registry.fetch(new Request('https://t/backup/'+op,{method:'POST',headers:{'CF-Connecting-IP':'ip'+ip++},body:JSON.stringify(v)}));return {status:r.status,...await r.json()}};
const counted=async fn=>{writes.put=writes.delete=writes.alarm=0;await fn();return writes.put+writes.delete+writes.alarm};
const blob=(n,c='A')=>'ygo1g.'+'B'.repeat(16)+'.'+c.repeat(n);
const auth='e'.repeat(64),id='d'.repeat(64);

// First save: the value, the meta row and the daily sweep alarm (once per registry, not per save).
assert.equal(await counted(()=>call('save',{id,auth,blob:blob(150000)})),3);
assert.deepEqual([...rows.keys()].filter(k=>k.includes(id)).sort(),['enc:'+id,'one:'+id]);
// Later saves the same day: 1 row, the save itself (2026-11-12). A 150 kB save used to cost 2 x 7 parts + 1 = 15.
time+=31000;assert.equal(await counted(()=>call('save',{id,auth,blob:blob(150000,'C')})),1);
time+=31000;assert.equal(await counted(()=>call('save',{id,auth,blob:blob(40000,'D')})),1);
{const r=await call('load',{id,auth});assert.equal(r.blob,blob(40000,'D'));assert.equal(r.savedAt,time,'exact save time without a meta write')}
// Within 20 seconds of the last save the request is still refused, even though the meta row was not rewritten.
time+=5000;assert.equal((await call('save',{id,auth,blob:blob(10,'Q')})).status,429);
// The first save of a new day also refreshes the meta row (the retention sweep reads its day): 2 rows.
time+=86400000;assert.equal(await counted(()=>call('save',{id,auth,blob:blob(40000,'E')})),2);
time+=31000;assert.equal(await counted(()=>call('save',{id,auth,blob:blob(40000,'F')})),1);

// A save stored in the old layout (24,000-character parts) moves over on its next save: its parts are deleted once.
const oldId='7'.repeat(64),{authHash}=rows.get('enc:'+id),legacy=blob(100000,'L');
const legacyMeta={authHash,createdAt:time,updatedAt:time-60000,rev:'r-old',parts:Math.ceil(legacy.length/24000)};
rows.set('enc:'+oldId,legacyMeta);for(let i=0;i<legacyMeta.parts;i++)rows.set('blob:'+oldId+':r-old:'+i,legacy.slice(i*24000,(i+1)*24000));
assert.equal((await call('load',{id:oldId,auth})).blob,legacy,'old layout still loads');
assert.equal(await counted(()=>call('save',{id:oldId,auth,blob:blob(100000,'M')})),2+legacyMeta.parts);
assert(![...rows.keys()].some(k=>k.startsWith('blob:'+oldId)),'no orphaned parts');
time+=31000;assert.equal(await counted(()=>call('save',{id:oldId,auth,blob:blob(100000,'N')})),1,'then 1 row like any same-day save');

// A save too big for one value is split into parts as large as one value allows, and moving between layouts leaves
// nothing behind in either direction.
const huge=blob(ONE_VALUE+500000,'H');time+=31000;await call('save',{id,auth,blob:huge});
const hugeMeta=rows.get('enc:'+id);assert(!hugeMeta.one);assert.equal(hugeMeta.parts,2);assert(!rows.has('one:'+id));
assert.deepEqual(blobKeys(id,hugeMeta).every(k=>rows.has(k)),true);assert.equal((await call('load',{id,auth})).blob,huge);
time+=31000;await call('save',{id,auth,blob:blob(5000,'S')});assert(![...rows.keys()].some(k=>k.startsWith('blob:'+id)));assert.equal((await call('load',{id,auth})).blob,blob(5000,'S'));

// Delete removes the value and the meta row in either layout.
assert.equal((await call('delete',{id:oldId,auth})).status,200);assert(![...rows.keys()].some(k=>k.includes(oldId)));
const partsId='8'.repeat(64);time+=31000;await call('save',{id:partsId,auth,blob:huge});assert.equal((await call('delete',{id:partsId,auth})).status,200);assert(![...rows.keys()].some(k=>k.includes(partsId)));

// Yearly sweep: removes stale saves in both layouts, and does not rewrite an unchanged cursor.
const legacyStale='9'.repeat(64);rows.set('enc:'+legacyStale,{...legacyMeta,updatedAt:time-400*86400000});for(let i=0;i<legacyMeta.parts;i++)rows.set('blob:'+legacyStale+':r-old:'+i,'x');
time+=366*86400000;const fresh='5'.repeat(64);await call('save',{id:fresh,auth,blob:blob(10,'F')});
await registry.alarm();
assert(![...rows.keys()].some(k=>k.includes(id)||k.includes(legacyStale)),'stale single and multipart saves are swept');
assert.equal((await call('load',{id:fresh,auth})).status,200);
assert.equal(await counted(()=>registry.alarm()),1,'a sweep with nothing to delete writes only its alarm');
console.log('PASS cloud save writes 1 row per save on the same day, 2 on the first save of a day (was 2 x parts + 1), old multipart saves move over once, huge saves use large parts, load/delete/sweep both layouts, no orphans, sweep cursor not rewritten');
