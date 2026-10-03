import assert from 'node:assert/strict';
import {DeviceSync} from '../android/web/device-sync.js';
import {ProgressRegistry,mergeProgress} from '../multiplayer/cloudflare/progress.mjs';
const rows=new Map(),storage={async get(k){return structuredClone(rows.get(k))},async put(k,v){rows.set(k,structuredClone(v))},async delete(k){rows.delete(k)},async setAlarm(){},async transaction(fn){return fn(this)}};
const registry=new ProgressRegistry({storage});
globalThis.fetch=async(url,opts)=>url==='multiplayer-config.json'?{json:async()=>({signalingUrl:'https://test'})}:registry.fetch(new Request(url,opts));
function device(progress){const saved={link:{},progress};let merges=0;return {saved,get merges(){return merges},client:new DeviceSync(async(action,value)=>{if(action==='device-sync-read')return structuredClone(saved);if(action==='device-sync-link')saved.link=value;if(action==='device-sync-unlink')saved.link={};if(action==='device-sync-merge'){merges++;saved.progress=mergeProgress(saved.progress,value)}})}}
const a=device(mergeProgress({}, {characters:[0,1,2],levels:{0:2},flags:['gallery_unlocked']})),b=device(mergeProgress({}, {characters:[0,1,3],levels:{1:4},flags:['cpu_viewer_unlocked']}));
const pair=await a.client.run('create');await b.client.run('join',pair.code.toLowerCase());await a.client.run('sync');assert.deepEqual(a.saved.progress,b.saved.progress);
b.saved.progress.levels[0]=5;b.saved.progress.flags.push('relicless_unlocked');await b.client.run('sync');await a.client.run('sync');assert.equal(a.saved.progress.levels[0],5);assert(a.saved.progress.flags.includes('relicless_unlocked'));
const count=a.merges;await a.client.run('sync');assert.equal(a.merges,count);
await assert.rejects(()=>b.client.run('join',pair.code),/Disconnect/);
await b.client.run('unlink');assert.equal(b.client.linked,false);assert.equal(b.saved.progress.levels[0],5);
console.log('PASS two-device pairing, automatic bidirectional unlock sync, unchanged-sync skips writes, disconnect preserves progress');
