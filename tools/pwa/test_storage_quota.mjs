// A full browser storage (Discord, yagura99, 2026-11-21): saving first frees the re-downloadable card-picture caches,
// mildest first, and retries quietly; the "could not be saved" window only shows when that is not enough.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const copy=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'pwa-storage-')),'pwa-storage.mjs');
fs.copyFileSync(path.join(here,'pwa-storage.js'),copy);
const {webStorage}=await import(pathToFileURL(copy).href);

// A fake IndexedDB whose writes fail with QuotaExceededError while the caches hold more than `room` entries.
let caches_={},room=0,stored=null;
const quota=()=>Object.assign(Error('full'),{name:'QuotaExceededError'});
globalThis.caches={keys:async()=>Object.keys(caches_),delete:async n=>n in caches_&&delete caches_[n]};
globalThis.indexedDB={open(){const req={};setTimeout(()=>{req.result={
 transaction(){const tx={objectStore:()=>({put(value){const r={};setTimeout(()=>{if(Object.keys(caches_).length>room){tx.error=quota();tx.onerror()}else{stored=value;r.result='ok';tx.oncomplete()}});return r}})};return tx},close(){}};req.onsuccess()});return req}};

// 1. Only the translated pictures need to go: the card art stays.
caches_={'ygo-card-text-it':1,'ygo-card-art-v1':1,'ygo-bundled-0.2.40':1};room=2;
assert.equal(await webStorage.store('{"a":"1"}'),true);
assert.deepEqual(Object.keys(caches_),['ygo-card-art-v1','ygo-bundled-0.2.40'],'only the translated pictures were cleared');
assert.equal(stored,'{"a":"1"}');

// 2. Still full after every picture cache is gone: the app files are kept and the error reaches the window.
caches_={'ygo-card-text-it':1,'ygo-card-art-v1':1,'ygo-artwork-bundles-v1':1,'ygo-bundled-0.2.40':1};room=0;stored=null;
await assert.rejects(webStorage.store('{"b":"1"}'),/not enough browser storage/);
assert.deepEqual(Object.keys(caches_),['ygo-bundled-0.2.40'],'the app files are never cleared');
assert.equal(stored,null);
console.log('PASS a full browser storage frees card-picture caches and retries before asking the player');
