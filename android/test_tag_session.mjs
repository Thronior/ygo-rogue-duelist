import assert from 'node:assert/strict';
// audio-balance.js registers page listeners on import; stub the browser globals (document, location, window, Audio) first.
globalThis.document??={hidden:false,addEventListener(){}};globalThis.location??={href:'http://localhost/'};
globalThis.window??={addEventListener(){}};
globalThis.Audio??=class{constructor(src){this.src=src;this.preload='';this.paused=true;this.ended=false}addEventListener(){}play(){return Promise.resolve()}pause(){}load(){}};
const {TagSession,decode}=await import('./web/tag-session.js');
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
const hello=async session=>({kind:'hello',version:4,contentHash:await session.contentHash,character:1,profile:{},duel:{key:null,applied:0}});
const host=new TagSession(options),sent=[];host.code='ABCDE';host.seat=0;host.peer.resumed=true;host.peer.started=true;host.peer.peerSid='x';host.peer.send=m=>sent.push(m);
await host.receive(await hello(host));
assert.equal(restores,1);assert.equal(creates,0);assert.equal(saved.paused,false);assert(host.connected);
// Commands stop at once on a drop, while the saved run only pauses for a real absence.
host.status('disconnected');await assert.rejects(host.perform(0,{id:'new',action:'auto'}),/reconnect/);await new Promise(r=>setTimeout(r,20));assert.equal(saved.paused,false,'short drops do not rewrite the save');
host.status('connected');await host.queue;assert.equal(host.pauseTimer,null,'a quick return cancels the pause');
await host.receive(await hello(host));assert.equal(restores,1);assert(!saved.paused);
const guest=new TagSession(options);guest.open({code:'ABCDE',seat:1});guest.connected=true;guest.view={revision:4};let dropped;
guest.peer.send=p=>{dropped=p};const purchase=guest.request('buy',[0]);assert.equal(guest.pending.size,1);assert(values.has(guest.outboxKey));
await new Promise(r=>setTimeout(r,0));const first=await host.perform(1,dropped.request);assert.equal(commands,1);
// Lose the receipt, reload the guest, then resend the saved request ID.
const resumed=new TagSession(options);resumed.open({code:'ABCDE',seat:1});resumed.peer.send=p=>{dropped=p};assert.equal(resumed.pending.size,1);
await resumed.receive(await hello(resumed));
assert.deepEqual(await host.perform(1,dropped.request),first);assert.equal(commands,1);
await resumed.receive({kind:'receipt',id:dropped.request.id,result:first});assert.equal(resumed.pending.size,0);assert(!values.has(resumed.outboxKey));
await guest.receive({kind:'receipt',id:dropped.request.id,result:first});assert.deepEqual(await purchase,['owned-card']);
// A duel answer saved in an outbox by an older page is acknowledged, never replayed.
saved.phase='shop';host.engine=null;host.view={phase:'shop'};
assert.deepEqual(await host.perform(1,{id:'old-response',action:'duel-response'}),{ok:true,stale:true});
const incompatible=new TagSession(options);await assert.rejects(incompatible.receive({...await hello(incompatible),contentHash:'different'}),/incompatible/);assert(!incompatible.connected);
const older=new TagSession(options);await assert.rejects(older.receive({...await hello(older),version:3}),/incompatible/);
// A host can reconnect while still waiting for the first teammate: no run exists yet.
const waiting=new TagSession({...options,backend:async(action,value)=>action==='tag-restore'?null:backend(action,value)});
waiting.code='ABCDE';waiting.seat=0;waiting.peer.resumed=true;waiting.peer.peerSid='x';waiting.peer.send=()=>{};let marked=false;waiting.peer.request=async action=>{assert.equal(action,'started');marked=true};
await waiting.receive(await hello(waiting));assert.equal(creates,1);assert(marked);
// Tribe-Infecting Virus: a guest's declared monster type is a BigInt, and the real backend is plain JSON. The host must
// journal the step, show it and let the CPU continue. Losing this froze a live run with "Waiting for teammate".
{
 const journal=[],views=[],engine={responseNumber:0,respondingSeat:1,turn:3,phase:4,pending:{player:1},visuals:[],applied:[],finished:null,
  respondFor(seat,number,response){this.applied.push(response);this.responseNumber++},respond(response){this.applied.push(response)},auto:()=>({type:1,index:null}),snapshotFor:()=>({}),checksum:()=>1,destroy(){}};
 const strict=async(action,value)=>{const text=JSON.stringify({action,value});if(action==='tag-journal'){const {checkpoint,...entry}=JSON.parse(text).value;journal.push(entry)}};
 const virus=new TagSession({...options,backend:strict,onDuel:()=>{views.push('shown');return Promise.resolve()}});
 Object.assign(virus,{seat:0,code:'ABCDE',engine,greeted:true,active:true});virus.peer.peerSid='x';virus.peer.send=()=>{};
 const wire={kind:'step',i:0,entry:{seat:1,number:0,response:{type:9,races:[{__bigint:'8'}]}},h:1};
 await virus.receive(decode(JSON.parse(JSON.stringify(wire))));
 assert.equal(engine.applied[0].races[0],8n,'the engine gets a real BigInt');assert.deepEqual(journal[0],{seat:1,number:0,response:{type:9,races:[{__bigint:'8'}]}},'the journal keeps a JSON copy');
 assert.deepEqual(views,['shown'],'the step reaches the screen');assert.notEqual(virus.aiTimer,null,'the CPU keeps playing');clearTimeout(virus.aiTimer);virus.aiTicket=-1;
 // A failed journal write must never strand the duel again: the step still shows and the CPU still moves.
 const flaky=new TagSession({...options,backend:async()=>{throw Error('Disk full')},onDuel:()=>{views.push('flaky');return Promise.resolve()}});
 const broken={...engine,responseNumber:0,applied:[],respondFor:engine.respondFor,respond:engine.respond,visuals:[],snapshotFor:engine.snapshotFor,checksum:engine.checksum};
 Object.assign(flaky,{seat:0,code:'ABCDE',engine:broken,greeted:true,active:true});flaky.peer.peerSid='x';flaky.peer.send=()=>{};
 await flaky.receive(decode(JSON.parse(JSON.stringify(wire))));assert(views.includes('flaky'));assert.notEqual(flaky.aiTimer,null);clearTimeout(flaky.aiTimer);flaky.aiTicket=-1;
 // Saves already damaged by this bug have a hole: a CPU answer recorded while a guest prompt was open. Replay stops at
 // the hole and trims it, so the run comes back at that prompt instead of refusing to reconnect.
 const trimmed=[],replay={responseNumber:0,respondingSeat:1,pending:{player:0},visuals:[],finished:null,startTag(){},respondFor(seat,number){this.responseNumber++;if(this.responseNumber===1)this.pending={player:0}},respond(){},snapshotFor:()=>({}),checksum:()=>1,destroy(){}};
 const damaged=new TagSession({...options,duelFactory:async()=>replay,backend:async(action,value)=>{if(action==='tag-journal-trim')trimmed.push(value.count)},onDuel:()=>Promise.resolve()});
 damaged.seat=0;await damaged.startEngine({seed:5,responses:[{seat:1,number:0,response:{type:1}},{seat:null,response:{type:2}},{seat:1,number:1,response:{type:3}}]});
 assert.deepEqual(trimmed,[1],'the journal is cut at the hole');assert.equal(damaged.log.length,1);clearTimeout(damaged.aiTimer);
}
console.log('PASS session recovery: host restores once, handshake gates resume, drops stop commands without pausing the save, durable guest outbox, purchase retries, version mismatch rejection');
process.exit(0);
