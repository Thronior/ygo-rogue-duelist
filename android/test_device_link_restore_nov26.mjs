// Restoring a save keeps this device's own device link, and backups never carry one (Sir Renity, 2026-11-26: two PCs that
// had both restored the same cloud save ended up on different links, or unlinked).
import assert from 'node:assert/strict';
const rows=new Map();globalThis.localStorage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};globalThis.location={hostname:'127.0.0.1'};globalThis.window={addEventListener(){}};globalThis.document={hidden:false,addEventListener(){}};
const {backupFiles,restoreRecovery}=await import('./web/device-backup.js');
const files={'profile.json':'{"wins":3}','device-sync.json':'{"group":"other-device","token":"t"}','run.bak':'{}'};
assert.deepEqual(Object.keys(backupFiles(files)),['profile.json'],'no link and no .bak in a backup');
let stored=JSON.stringify({'profile.json':'{}','device-sync.json':'{"group":"mine","token":"m"}'});
await restoreRecovery({format:'ygo-device-recovery-v1',keepExtras:true,backup:{schema:1,files,extras:{}}},{loadSave:()=>stored,storeSave:t=>{stored=t}});
const after=JSON.parse(stored);
assert.equal(after['profile.json'],'{"wins":3}');assert.equal(after['device-sync.json'],'{"group":"mine","token":"m"}','this device keeps its own link');
stored=JSON.stringify({'profile.json':'{}'});
await restoreRecovery({format:'ygo-device-recovery-v1',keepExtras:true,backup:{schema:1,files,extras:{}}},{loadSave:()=>stored,storeSave:t=>{stored=t}});
assert.equal(JSON.parse(stored)['device-sync.json'],undefined,'an unlinked device stays unlinked');
console.log('PASS device link restore: backups carry no link; a restore keeps this device\'s own link or none');
