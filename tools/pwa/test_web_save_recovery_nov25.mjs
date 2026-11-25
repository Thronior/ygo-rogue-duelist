// v0.2.44 web builds saved to localStorage but loaded from IndexedDB, so progress "reverted" after a reload and a
// fresh device's '{}' made Restore from code fail with "This backup is empty." (Discord, 2026-11-25). The fixed load
// keeps whichever copy was played last, parks the other under its own key and clears localStorage.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {pathToFileURL,fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const copy=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'pwa-recovery-')),'pwa-storage.mjs');
fs.copyFileSync(path.join(here,'pwa-storage.js'),copy);
const {webStorage,saveTime}=await import(pathToFileURL(copy).href);

let db={},local={};
globalThis.localStorage={getItem:k=>k in local?local[k]:null,setItem:(k,v)=>{local[k]=String(v)},removeItem:k=>{delete local[k]}};
globalThis.indexedDB={open(){const req={};setTimeout(()=>{req.result={
 transaction(){const tx={objectStore:()=>({
  get(key){const r={};setTimeout(()=>{r.result=db[key];tx.oncomplete()});return r},
  put(value,key){const r={};setTimeout(()=>{db[key]=value;r.result=key;tx.oncomplete()});return r}})};return tx},close(){}};req.onsuccess()});return req}};

const envelope=payload=>JSON.stringify({schema:1,sha256:'x',payload});
const save=(lastPlayed,wins)=>JSON.stringify({'profile.json':envelope({wins}),'run.json':envelope({round:wins,last_played_at:lastPlayed})});
const older=save(1795500000.5,4),newer=save(1795600000.25,5);
assert.equal(saveTime(newer),1795600000.25);assert.equal(saveTime('{}'),0);

// 1. The reported case: the database holds the copy from before the update, localStorage the newer one.
db={'shadow-run-mobile':older};local={'shadow-run-mobile':newer};
assert.equal(await webStorage.load(),newer,'the newer localStorage progress is loaded');
assert.equal(db['shadow-run-mobile'],newer,'and written back to the database');
assert.equal(db['shadow-run-mobile-replaced-0.2.44'],older,'the older copy is kept');
assert.equal(local['shadow-run-mobile'],undefined,'localStorage is cleared so this runs once');
assert.equal(await webStorage.load(),newer,'a second load reads the database');

// 2. An ancient pre-database localStorage copy never replaces newer database progress.
db={'shadow-run-mobile':newer};local={'shadow-run-mobile':older};
assert.equal(await webStorage.load(),newer);
assert.equal(db['shadow-run-mobile-replaced-0.2.44'],older);assert.equal(local['shadow-run-mobile'],undefined);

// 3. A fresh device: v0.2.44 left '{}' in localStorage. Loading (and so Restore from code) no longer throws.
db={};local={'shadow-run-mobile':'{}'};
assert.equal(await webStorage.load(),'{}');
// 4. Only localStorage has progress (first start on a fixed build): it moves into the database.
db={};local={'shadow-run-mobile':newer};
assert.equal(await webStorage.load(),newer);assert.equal(db['shadow-run-mobile'],newer);assert.equal(local['shadow-run-mobile'],undefined);

// 5. The web build routes every save and load through webStorage.
const root=path.resolve(here,'..','..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'pwa-mobile-'));
const source=fs.readFileSync(path.join(root,'android','web','mobile.js'),'utf8');
const patched=execFileSync(process.env.PYTHON||'python',['-c',`
import sys,pathlib
text=pathlib.Path(sys.argv[1]).read_text(encoding='utf8')
src=pathlib.Path(sys.argv[2]).read_text(encoding='utf8')
start=src.index(' # Every save and load must go through webStorage');end=src.index("assert \\"'shadow-run-mobile'\\" not in text")
end=src.index('\\n',end)
exec(src[start:end].replace('\\n ','\\n').strip())
sys.stdout.buffer.write(text.encode('utf8'))
`,path.join(root,'android','web','mobile.js'),path.join(root,'tools','build_pwa.py')],{encoding:'utf8',maxBuffer:64*1024*1024});
assert.ok(source.includes("localStorage.setItem('shadow-run-mobile'"));
assert.ok(!patched.includes("'shadow-run-mobile'"),'no save access left outside webStorage');
assert.match(patched,/async function persist[^]*?else await webStorage\.saveGame\(data\);lastPersistedData=data/,'persist() saves through webStorage');
fs.rmSync(out,{recursive:true,force:true});
console.log('PASS web saves go through IndexedDB again and v0.2.44 localStorage progress is recovered');
