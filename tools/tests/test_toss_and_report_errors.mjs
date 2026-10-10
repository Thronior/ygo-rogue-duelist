import assert from 'node:assert/strict';
import {play3DToss,toss3DMarkup} from '../../android/web/toss-3d.js';
import {storageRequest} from '../../multiplayer/replays/worker.mjs';
for(const message of ['Exceeded allowed rows written in Durable Objects free tier.','storage failed']){
 const r=await storageRequest({fetch:async()=>{throw Error(message)}},new Request('https://bucket/'));
 assert.equal(r.status,503);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*');assert.match((await r.json()).error,/saved on this device/);
}
globalThis.matchMedia=()=>({matches:false});globalThis.getComputedStyle=()=>({transform:'matrix(1,0,0,1,0,0)'});
for(const kind of ['coin','dice']){
 let finish,labels=[{textContent:''}],revealed=false;
 const row={querySelectorAll:s=>s==='.toss3d-object'?[object]:labels,classList:{add(){},remove(c){if(c==='settling')revealed=true}},setAttribute(){}};
 const object={animate(frames,options){return {cancel(){},finished:options.iterations===Infinity?new Promise(()=>{}):new Promise(r=>finish=r)}}};
 const overlay={isConnected:true,querySelectorAll:()=>[object],querySelector:()=>row,remove(){this.isConnected=false}};
 globalThis.document={getElementById:()=>true,createElement:()=>overlay};
 assert.ok(toss3DMarkup(kind,[1],{rolling:true}).includes('class="toss3d-label"></b>'));
 let waits=0;const task=play3DToss({append(){}},kind,[1],{wait:async()=>{waits++}});
 await Promise.resolve();await Promise.resolve();
 assert.equal(revealed,false);assert.equal(labels[0].textContent,'');assert.equal(waits,1);
 finish();await task;
 assert.equal(revealed,true);assert.equal(labels[0].textContent,kind==='coin'?'HEADS':'1');assert.equal(overlay.isConnected,false);
}
console.log('PASS coin/dice results remain empty until landing animation finishes; cleanup; CORS-readable storage errors.');
