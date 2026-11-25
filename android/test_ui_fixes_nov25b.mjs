// Nov 25 UI fixes: Ultimate Collector refusals show their sentence, not a Python traceback (collector.py / collector-ui.js),
// and a save file import no longer fails when the device's current save cannot be read (device-backup.js restoreRecovery;
// survey: Settings › Devices & App import failed with v0.2.44's "This backup is empty.").
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {campaignMessage} from './web/online-status.js';
const rows=new Map();globalThis.localStorage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};globalThis.location={hostname:'127.0.0.1'};globalThis.window={addEventListener(){}};globalThis.document={hidden:false,addEventListener(){}};
const {restoreRecovery,recoveryFromFile}=await import('./web/device-backup.js');

const collector=fs.readFileSync(new URL('../collector.py',import.meta.url),'utf8'),ui=fs.readFileSync(new URL('./web/collector-ui.js',import.meta.url),'utf8');
const between=collector.match(/BETWEEN_DUELS='([^']+)'/)[1];
assert.ok(ui.includes(`'${between}'`),'collector-ui.js shows the same sentence as collector.py');
const traceback=`Traceback (most recent call last):\n  File "/game/android/mobile_backend.py", line 64, in command\n  File "/game/collector.py", line 32, in dispatch\nValueError: ${between}\n`;
assert.equal(campaignMessage(new Error(traceback)),between,'the ValueError sentence, nothing else');
assert.equal(campaignMessage(new Error('Traceback (most recent call last):\n  File "x", line 1\nKeyError: 5')),'That action could not be completed. Please try again.');
assert.equal(campaignMessage(new Error('Room not found.')),null,'not a Python error: left to explainOnlineError');

const files={'profile.json':JSON.stringify({payload:{wins:3}}),'run.json':JSON.stringify({payload:{round:2}})};
let stored=null;
await restoreRecovery(recoveryFromFile(files),{loadSave:async()=>{throw Error('This backup is empty.')},storeSave:async text=>{stored=text}});
assert.deepEqual(JSON.parse(stored),files,'imported although the current save could not be read');
let rolledBack=0;
await assert.rejects(restoreRecovery(recoveryFromFile(files),{loadSave:()=>{throw Error('unreadable')},storeSave:async()=>{rolledBack++;throw Error('disk full')}}),/disk full/);
assert.equal(rolledBack,1,'no unreadable save is written back after a failed import');
console.log('PASS collector refusals as sentences; save file import works without a readable current save');
