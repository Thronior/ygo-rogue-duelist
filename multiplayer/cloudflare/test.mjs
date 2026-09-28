import {test} from 'node:test';import assert from 'node:assert/strict';import {Registry} from './registry.mjs';
test('room lifecycle, reserved seats, signals, persistence and expiry',async()=>{
 let now=100000,saved;const r=new Registry({clock:()=>now,save:async data=>saved=structuredClone(data),ice:async()=>[{urls:'stun:example.invalid'}]});
 const h=await r.request('create',{}),g=await r.request('join',{code:h.code});assert.match(h.code,/^[A-HJ-NP-Z2-9]{5}$/);assert.equal(g.seat,1);
 await assert.rejects(r.request('join',{code:h.code}),/two players/);
 await assert.rejects(r.request('poll',{code:h.code,after:0},'bad'),/Invalid room/);
 await r.request('signal',{code:h.code,generation:0,message:{type:'offer',sdp:'private'}},h.token);
 const p=await r.request('poll',{code:h.code,generation:0,after:0},g.token);assert.equal(p.messages[0].message.sdp,'private');
 assert.equal((await r.request('poll',{code:h.code,generation:0,after:1},g.token)).messages.length,0);
 await assert.rejects(r.request('started',{code:h.code},g.token),/host/);await r.request('started',{code:h.code},h.token);
 const resumed=await r.request('join',{code:h.code,resumeToken:g.token});assert(resumed.resumed);assert.equal(resumed.generation,1);
 await assert.rejects(r.request('signal',{code:h.code,generation:0,message:{type:'answer'}},h.token),/replaced/);
 assert(!JSON.stringify(saved).includes('private'));assert.deepEqual(saved[h.code].queues,[[],[]]);
 const restored=new Registry({saved,clock:()=>now});const host=await restored.request('join',{code:h.code,resumeToken:h.token});assert.equal(host.seat,0);assert.equal(host.generation,2);assert(host.started);
 now+=86400001;await assert.rejects(restored.request('join',{code:h.code}),/expired/);
});
test('rate limit and unsupported game messages',async()=>{
 const r=new Registry();const h=await r.request('create',{});
 await assert.rejects(r.request('signal',{code:h.code,generation:0,message:{type:'game-state'}},h.token),/Only connection/);
 for(let n=1;n<12;n++)await r.request('create',{});
 await assert.rejects(r.request('create',{}),/Too many/);
});

test('relay fallback authenticates seats, coordinates both peers and survives resume',async()=>{
 let saved;const r=new Registry({save:async x=>saved=structuredClone(x)});const h=await r.request('create',{}),g=await r.request('join',{code:h.code});
 await assert.rejects(r.request('fallback',{code:h.code},'not-a-seat'),/Invalid room/);
 await r.request('fallback',{code:h.code},g.token);
 const a=await r.request('poll',{code:h.code,after:0,generation:0},h.token);assert.equal(a.relay,true);assert.equal(a.generation,1);
 await r.request('fallback',{code:h.code},h.token);assert.equal((await r.request('poll',{code:h.code,after:0},h.token)).generation,1);
 const restored=new Registry({saved});const resumed=await restored.request('join',{code:h.code,resumeToken:g.token});assert.equal(resumed.seat,1);assert.equal(restored.rooms.get(h.code).relay,true);
});

test('idle service restart preserves a live generation and pending signals',async()=>{
 let saved;const r=new Registry({save:async value=>saved=structuredClone(value)});
 const h=await r.request('create',{}),g=await r.request('join',{code:h.code});
 await r.request('signal',{code:h.code,generation:0,message:{type:'offer',sdp:'pending-offer'}},h.token);
 const restored=new Registry({saved});
 const poll=await restored.request('poll',{code:h.code,generation:0,after:0},g.token);
 assert.equal(poll.generation,0);assert.equal(poll.messages[0].message.sdp,'pending-offer');
});

import {GameRelay} from './worker.mjs';
test('close without a status code notifies teammate, replaced sockets do not',()=>{
 const closed=[];const ws={deserializeAttachment:()=>({seat:'1'}),close:code=>{assert.equal(code,1000)}},peer={deserializeAttachment:()=>({seat:'0'}),close:code=>closed.push(code)};
 const relay=new GameRelay({getWebSockets:()=>[ws,peer]});relay.webSocketClose(ws,1005,'');assert.deepEqual(closed,[4002]);
 closed.length=0;ws.deserializeAttachment=()=>({seat:'1',replaced:true});relay.webSocketClose(ws,4001,'');assert.deepEqual(closed,[]);
});
