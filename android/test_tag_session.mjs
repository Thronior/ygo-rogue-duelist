import assert from 'node:assert/strict';
import {TagSession} from './web/tag-session.js';
const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
const content={cards:[],tokenCards:[]};let saved={phase:'draft',paused:true,revision:4,receipts:{},duel:null};let creates=0,restores=0,commands=0;
const backend=async(action,value)=>{
 if(action==='tag-create'){creates++;return}
 if(action==='tag-restore'){assert.equal(value.code,'ABCDE');restores++;return structuredClone(saved)}
 if(action==='tag-pause'){saved.paused=value;return}
 if(action==='tag-view')return structuredClone({...saved,seat:value});
 if(action==='tag-receipt')return saved.receipts[value.seat+':'+value.id]??null;
 if(action==='tag-command'){assert(!saved.paused);commands++;const result={result:['owned-card']};saved.receipts[value.seat+':'+value.request.id]=result;saved.revision++;return result}
 if(action==='tag-journal'){saved.duel.responses.push(value);if(value.id)saved.receipts[value.seat+':'+value.id]={result:{ok:true}};return}
 throw Error(action);
};
const options={endpoint:'http://localhost:8765',character:0,profile:{},content,backend};
const host=new TagSession(options),sent=[];host.code='ABCDE';host.seat=0;host.peer.resumed=true;host.peer.started=true;host.peer.send=m=>sent.push(m);
await host.receive({kind:'hello',version:3,contentHash:await host.contentHash,character:1,profile:{}});
assert.equal(restores,1);assert.equal(creates,0);assert.equal(saved.paused,false);assert(host.connected);
// An RTC disconnect stops new commands before the queued save finishes.
host.status('disconnected');await assert.rejects(host.perform(0,{id:'new',action:'auto'}),/reconnect/);await host.queue;assert(saved.paused);
await host.receive({kind:'hello',version:3,contentHash:await host.contentHash});assert.equal(restores,1);assert(!saved.paused);
const guest=new TagSession(options);guest.open({code:'ABCDE',seat:1});guest.connected=true;guest.view={revision:4};let dropped;
guest.peer.send=p=>{dropped=p};const purchase=guest.request('buy',[0]);assert.equal(guest.pending.size,1);assert(values.has(guest.outboxKey));
await new Promise(r=>setTimeout(r,0));const first=await host.perform(1,dropped.request);assert.equal(commands,1);
// Lose the receipt, reload the guest, then resend the saved request ID.
const resumed=new TagSession(options);resumed.open({code:'ABCDE',seat:1});resumed.peer.send=p=>{dropped=p};assert.equal(resumed.pending.size,1);
await resumed.receive({kind:'hello',version:3,contentHash:await resumed.contentHash});
assert.deepEqual(await host.perform(1,dropped.request),first);assert.equal(commands,1);
await resumed.receive({kind:'receipt',id:dropped.request.id,result:first});assert.equal(resumed.pending.size,0);assert(!values.has(resumed.outboxKey));
await guest.receive({kind:'receipt',id:dropped.request.id,result:first});assert.deepEqual(await purchase,['owned-card']);
// A lost final duel response receipt survives the transition to the shop.
saved.phase='shop';saved.receipts['1:winning-response']={result:{ok:true}};host.engine=null;host.view={phase:'shop'};
assert.deepEqual(await host.perform(1,{id:'winning-response',action:'duel-response'}),{ok:true});
const incompatible=new TagSession(options);await assert.rejects(incompatible.receive({kind:'hello',version:3,contentHash:'different'}),/incompatible/);assert(!incompatible.connected);
// A host can reconnect while still waiting for the first teammate: no run exists yet.
const waiting=new TagSession({...options,backend:async(action,value)=>action==='tag-restore'?null:backend(action,value)});
waiting.code='ABCDE';waiting.seat=0;waiting.peer.resumed=true;waiting.peer.send=()=>{};let marked=false;waiting.peer.request=async action=>{assert.equal(action,'started');marked=true};
await waiting.receive({kind:'hello',version:3,contentHash:await waiting.contentHash,character:1,profile:{}});assert.equal(creates,1);assert(marked);
console.log('PASS session recovery: host restores once, handshake gates resume, disconnect pauses actions, durable guest outbox, purchase and winning-response retries, version mismatch rejection');
