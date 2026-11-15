// Players import their own browser save export in the app (2026-11-14); admin recovery files still work.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
const rows=new Map();globalThis.localStorage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};globalThis.location={hostname:'127.0.0.1'};globalThis.window={addEventListener(){}};globalThis.document={hidden:false,addEventListener(){}};
const {recoveryFromFile,validateRecovery,restoreRecovery}=await import('./web/device-backup.js');
const exported={'profile.json':JSON.stringify({payload:{runs:4,wins:2,unlocked:[0,1,5]}}),'run.json':'{"stage":"shop"}','profile.bak':'{}'};
// The browser export restores its files and keeps this device's own stats.
rows.set('ygo-global-stats-v1','{"counts":{"duels":9}}');let disk='{"profile.json":"{}"}';
const wrapped=recoveryFromFile(exported);assert.deepEqual(validateRecovery(wrapped).files,exported);
await restoreRecovery(wrapped,{storage:localStorage,loadSave:async()=>disk,storeSave:async t=>{disk=t}});
assert.deepEqual(JSON.parse(disk),exported);assert.equal(rows.get('ygo-global-stats-v1'),'{"counts":{"duels":9}}');
// Admin recovery files pass through and still set extras.
const admin={format:'ygo-device-recovery-v1',backup:{schema:1,files:exported,extras:{}}};assert.equal(recoveryFromFile(admin),admin);
await restoreRecovery(admin,{storage:localStorage,loadSave:async()=>disk,storeSave:async t=>{disk=t}});assert.equal(rows.get('ygo-global-stats-v1'),undefined);
// Anything else gets a plain message.
for(const bad of [null,[],{},{'run.json':'{}'}])assert.throws(()=>recoveryFromFile(bad),/Choose a save file exported from the game/);
assert.throws(()=>validateRecovery(recoveryFromFile({'profile.json':'{}','../x.json':'{}'})),/Invalid save file/);
// The admin converter writes a file the app accepts.
const dir=mkdtempSync(join(tmpdir(),'save-import-'));writeFileSync(join(dir,'YGO-Rogue-save-backup.json'),JSON.stringify(exported));
execFileSync('../python/python.exe',['../tools/web_save_to_recovery.py',join(dir,'YGO-Rogue-save-backup.json')]);
const converted=JSON.parse(readFileSync(join(dir,'YGO-Rogue-save-backup-recovery.json'),'utf8'));assert.deepEqual(validateRecovery(converted).files,exported);
console.log('PASS save file import: browser exports restore in the app and keep device stats, admin files unchanged, converter output accepted');
