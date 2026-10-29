import assert from 'node:assert/strict';
const rows=new Map();globalThis.localStorage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};globalThis.location={hostname:'127.0.0.1'};globalThis.window={addEventListener(){}};globalThis.document={hidden:false,addEventListener(){}};
const {createBackupClient,validateRecovery,restoreRecovery,newCloudCode,normalizeCloudCode,cloudKeys,sealSave,openSave}=await import('./web/device-backup.js');
// A fake Worker that keeps only what the real one keeps: id, a hash of the write password, the opaque blob.
const server=new Map(),seen=[];const hash=async t=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t))).toString('hex');
let time=100000,connected=true,fail=false,timers=new Map(),next=0;
async function worker(url,options){
 if(url==='multiplayer-config.json')return Response.json({signalingUrl:'https://approved.example'});
 const op=url.split('/').at(-1),body=JSON.parse(options.body);seen.push({op,body});if(fail)throw Error('network');
 if(op==='forget')return Response.json({forgotten:true});
 const row=server.get(body.id),owned=row&&row.authHash===await hash(body.auth);
 if(op==='save'){if(row&&!owned)return Response.json({},{status:409});server.set(body.id,{authHash:await hash(body.auth),blob:body.blob,at:time});return Response.json({updatedAt:time})}
 if(!owned)return Response.json({error:'No cloud save matches this code.'},{status:404});
 if(op==='load')return Response.json({savedAt:row.at,blob:row.blob});
 if(op==='delete'){server.delete(body.id);return Response.json({deleted:true})}
}
const options={storage:localStorage,enabled:true,online:()=>connected,visible:()=>true,platform:()=>'test',version:'test',now:()=>time,setTimer:(f,ms)=>{timers.set(++next,{f,ms});return next},clearTimer:id=>timers.delete(id),request:worker};
const client=createBackupClient(options);
const uploads=()=>seen.filter(x=>x.op==='save');

// Codes: 10 characters from a 31-letter alphabet without look-alikes, typed in any case or spacing.
const sample=newCloudCode();assert.match(sample,/^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
assert.equal(normalizeCloudCode(' k7qxm 4tb9r '),'K7QXM-4TB9R');assert.equal(normalizeCloudCode('K7QXM-4TB9'),null);assert.equal(normalizeCloudCode('K7QXM-4TB90'),null,'0 is not in the alphabet');
assert.equal(new Set(Array.from({length:200},()=>newCloudCode())).size,200);

// Off by default; turning it on creates the code at once.
const files={'profile.json':'{"wins":3,"unlocked":[0,1,2]}','collector.json':'{"duelists":[{"name":"Secret Collector Name","token":"private-uc-token"}]}'};client.queue(JSON.stringify(files));await client.flush();assert.equal(uploads().length,0);assert.equal(client.isEnabled(),false);
const code=client.setEnabled(true);assert.equal(normalizeCloudCode(code),code);assert.equal(client.status().code,code);
// A brand-new profile with nothing to lose is not uploaded; a run in progress is.
client.queue(JSON.stringify({'profile.json':'{"unlocked":[0,1]}'}));await client.flush();assert.equal(uploads().length,0);
client.queue(JSON.stringify({'profile.json':'{"unlocked":[0,1]}','run.json':'{"round":1}'}));client.setUploadGuard(()=>false);await client.flush();assert.equal(uploads().length,0);client.setUploadGuard(()=>true);await client.flush();assert.equal(uploads().length,1);

// What leaves the device is encrypted: no code, no save contents, no UC token.
time+=60000;client.queue(JSON.stringify(files));await client.flush();assert.equal(uploads().length,2);const sent=JSON.stringify(uploads()[1].body);
for(const secret of [code,code.replace('-',''),'private-uc-token','"wins"','Secret Collector Name'])assert(!sent.includes(secret),'leaked '+secret);
const {id,auth}=await cloudKeys(code);assert.equal(uploads()[1].body.id,id);assert.equal(uploads()[1].body.auth,auth);assert.notEqual(id,auth);
assert.match(uploads()[1].body.blob,/^ygo1g\./);assert.deepEqual((await openSave(code,uploads()[1].body.blob)).files,files);
await assert.rejects(()=>openSave(newCloudCode(),uploads()[1].body.blob),/does not open/);

// Retries, dedupe and timers.
time+=60000;await client.flush();assert.equal(uploads().length,2,'unchanged progress is not re-sent');connected=false;files['profile.json']='{"wins":4,"unlocked":[0,1,2]}';client.queue(JSON.stringify(files));await client.flush();assert.equal(uploads().length,2);connected=true;fail=true;await client.flush();assert.equal(uploads().length,3);assert(client.status().error);fail=false;time+=60000;await client.flush();assert.equal(uploads().length,4);assert.equal(client.status().code,code);assert.equal(client.status().error,'');

// Another device restores with only the code, then keeps saving to it.
for(const k of [...rows.keys()])rows.delete(k);const other=createBackupClient(options);
await assert.rejects(()=>other.fetchSave('ABCDE-FGHJK'),/No cloud save matches/);await assert.rejects(()=>other.fetchSave('nope'),/10-character/);
const found=await other.fetchSave(code.toLowerCase());assert.equal(found.code,code);assert.deepEqual(found.recovery.backup.files,files);assert.equal(found.summary.wins,4);
let disk='{"profile.json":"{}"}';await restoreRecovery(found.recovery,{storage:localStorage,loadSave:async()=>disk,storeSave:async text=>disk=text});assert.deepEqual(JSON.parse(disk),files);
other.adopt(found.code);assert(other.isEnabled());assert.equal(other.status().code,code);assert.equal(other.notice(),'');

// Players of the old unencrypted backups get a code, see it once, and their old backup is deleted.
for(const k of [...rows.keys()])rows.delete(k);localStorage.setItem('ygo-cloud-saves-enabled','true');localStorage.setItem('ygo-device-backup-v1',JSON.stringify({code:'SB-'+'A'.repeat(24),token:'b'.repeat(64)}));
const migrated=createBackupClient(options);time+=60000;migrated.queue(JSON.stringify(files));await migrated.flush();
assert(normalizeCloudCode(migrated.status().code));assert.equal(migrated.notice(),'migrated');const forget=seen.filter(x=>x.op==='forget').at(-1);assert.equal(forget.body.code,'SB-'+'A'.repeat(24));assert.equal(localStorage.getItem('ygo-device-backup-v1'),null);
migrated.clearNotice();assert.equal(migrated.notice(),'');

// Deleting the cloud save removes it from the server and turns cloud save off.
assert(await migrated.deleteCloud());assert.equal(migrated.isEnabled(),false);assert.equal(migrated.status().code,null);const gone=await cloudKeys(code);assert(server.has(gone.id),'other saves are untouched');
client.setEnabled(false);client.queue(JSON.stringify(files));const count=uploads().length;await client.flush();assert.equal(uploads().length,count);client.destroy();time+=60000;await client.flush();assert.equal(uploads().length,count);

// Restore stays atomic and rejects unsafe files.
const recovery={format:'ygo-device-recovery-v1',backup:{schema:1,files,extras:{'cpu-deck-suggestions-v1':'{"draft":1}'}}};assert.deepEqual(validateRecovery(recovery).files,files);await restoreRecovery(recovery,{storage:localStorage,loadSave:async()=>disk,storeSave:async text=>disk=text});assert.equal(localStorage.getItem('cpu-deck-suggestions-v1'),'{"draft":1}');
const before=disk;let once=true;await assert.rejects(()=>restoreRecovery({...recovery,backup:{...recovery.backup,files:{'profile.json':'{}'},extras:{}}},{storage:localStorage,loadSave:async()=>disk,storeSave:async text=>{if(once){once=false;throw Error('disk full')}disk=text}}));assert.equal(disk,before);assert.equal(localStorage.getItem('cpu-deck-suggestions-v1'),'{"draft":1}');
assert.throws(()=>validateRecovery({...recovery,backup:{...recovery.backup,files:{'profile.json':'{}','../bad.json':'{}'}}}));
console.log('PASS cloud save codes, on-device encryption (no code or contents leave the device), restore by code on another device, legacy migration and cleanup, delete, retries, dedupe, atomic restore');
