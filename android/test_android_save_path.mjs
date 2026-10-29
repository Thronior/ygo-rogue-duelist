// The Android save path (mobile.js persist): progress goes to ShadowNative.store, a failed write is an error and
// is retried next time, and an unchanged save is not rewritten. Replaces the save coverage of the retired iOS test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
const start=source.indexOf('async function persist(');
const persist=source.slice(start,source.indexOf('\n',start));
function sandbox({native}={}){
 const files={'run.json':'{"gold":40}','profile.json':'{"wins":3}','profile.bak':'{"wins":2}','notes.txt':'not a save'};
 const ctx={JSON,Error,stored:[],queued:[],local:new Map(),files,
  py:{FS:{readdir:()=>Object.keys(files),readFile:name=>files[name.split('/').at(-1)]}},
  deviceBackup:{queue:data=>ctx.queued.push(data)},
  localStorage:{setItem:(k,v)=>ctx.local.set(k,v)}};
 ctx.window=native?{ShadowNative:native}:{};if(native)ctx.ShadowNative=native;
 vm.createContext(ctx);vm.runInContext(`let lastPersistedData='';${persist}`,ctx);return ctx;
}
// Android: the save files (and only those) are written natively, once per change.
{
 let writes=[];const ctx=sandbox({native:{store:data=>{writes.push(data);return true}}});
 await ctx.persist();assert.equal(writes.length,1);
 assert.deepEqual(Object.keys(JSON.parse(writes[0])).sort(),['profile.bak','profile.json','run.json'],'only .json and .bak save files');
 await ctx.persist();assert.equal(writes.length,1,'an unchanged save is not rewritten');
 await ctx.persist(true);assert.equal(writes.length,1);assert.equal(ctx.queued.length,1,'a cloud checkpoint still queues the unchanged save');
 ctx.files['run.json']='{"gold":55}';await ctx.persist(true);assert.equal(writes.length,2);assert.equal(JSON.parse(writes[1])['run.json'],'{"gold":55}');assert.equal(ctx.queued.length,2);
 assert.equal(ctx.local.size,0,'Android never falls back to browser storage');
}
// A failed native write is an error, and the next persist tries again rather than assuming it was saved.
{
 let ok=false,writes=0;const ctx=sandbox({native:{store:()=>{writes++;return ok}}});
 await assert.rejects(()=>ctx.persist(),/Could not save game to device storage/);
 ok=true;await ctx.persist();assert.equal(writes,2,'retried after the failure');
}
// An asynchronous store is awaited, and its rejection propagates.
{
 let done=false;const ctx=sandbox({native:{store:()=>new Promise(r=>setTimeout(()=>{done=true;r(true)},15))}});
 await ctx.persist();assert.equal(done,true,'persist waits for the native write');
 const failing=sandbox({native:{store:()=>Promise.reject(Error('disk full'))}});
 await assert.rejects(()=>failing.persist(),/disk full/);
}
// The web build saves to browser storage instead.
{
 const ctx=sandbox();await ctx.persist();
 assert.deepEqual(Object.keys(JSON.parse(ctx.local.get('shadow-run-mobile'))).sort(),['profile.bak','profile.json','run.json']);
}
console.log('PASS Android saves: native write of save files only, failures throw and retry, unchanged saves skipped, awaited async writes, web fallback');
