// Bug report 2026-11-23: Tag rooms said "Room already has two players" to a player 2 who had lost their seat token.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Registry,SEAT_GRACE,SEAT_TAKEN,SEAT_IN_RUN} from './registry.mjs';

const setup=(online=false)=>{let now=1000;const state={online};const r=new Registry({clock:()=>now,seatOnline:async()=>state.online});return {r,state,tick:ms=>{now+=ms}}};

test('a join retried after a lost answer gets the same seat back',async()=>{
 const {r}=setup(true);const host=await r.request('create',{},'','h');
 const first=await r.request('join',{code:host.code,joinId:'abc'},'','g');
 const again=await r.request('join',{code:host.code,joinId:'abc'},'','g');
 assert.equal(again.token,first.token);assert.equal(again.seat,1);assert.equal(again.resumed,false);
 await assert.rejects(r.request('join',{code:host.code,joinId:'other'},'','x'),{message:SEAT_TAKEN});
});

test('a lobby seat whose player left the hub goes to the next joiner after the grace',async()=>{
 const {r,state,tick}=setup(false);const host=await r.request('create',{},'','h');
 const lost=await r.request('join',{code:host.code},'','g');
 await assert.rejects(r.request('join',{code:host.code},'','g'),{message:SEAT_TAKEN},'still within the grace');
 tick(SEAT_GRACE);state.online=true;
 await assert.rejects(r.request('join',{code:host.code},'','g'),{message:SEAT_TAKEN},'player 2 is connected');
 state.online=false;const generation=r.rooms.get(host.code).generation;
 const taken=await r.request('join',{code:host.code},'','g');
 assert.equal(taken.seat,1);assert.notEqual(taken.token,lost.token);assert.equal(r.rooms.get(host.code).generation,generation+1);
 await assert.rejects(r.request('join',{code:host.code,resumeToken:lost.token},'','g'),/cannot resume/);
});

test('a started run keeps player 2 seat and says why',async()=>{
 const {r,tick}=setup(false);const host=await r.request('create',{},'','h');
 const guest=await r.request('join',{code:host.code},'','g');await r.request('started',{code:host.code},host.token,'h');
 tick(SEAT_GRACE*10);
 await assert.rejects(r.request('join',{code:host.code},'','x'),{message:SEAT_IN_RUN});
 assert.equal((await r.request('join',{code:host.code,resumeToken:guest.token},'','g')).seat,1);
});

test('a hub that cannot answer keeps the seat',async()=>{
 let now=0;const r=new Registry({clock:()=>now,seatOnline:async()=>{throw Error('hub down')}});
 const host=await r.request('create',{},'','h');await r.request('join',{code:host.code},'','g');now+=SEAT_GRACE*2;
 await assert.rejects(r.request('join',{code:host.code},'','x'),{message:SEAT_TAKEN});
});

test('join ids and join times survive a restart',async()=>{
 let saved={};const r=new Registry({save:async d=>{saved=d},seatOnline:async()=>true});
 const host=await r.request('create',{},'','h');const first=await r.request('join',{code:host.code,joinId:'keep'},'','g');
 const back=new Registry({saved,seatOnline:async()=>true});
 assert.equal((await back.request('join',{code:host.code,joinId:'keep'},'','g')).token,first.token);
});

test('the hub says a seat is held while its socket is open, even when quiet',async()=>{
 const {FakeContext}=await import('../../android/net_test_harness.mjs');const {TagHub,PRESENCE_SILENCE}=await import('./hub.mjs');
 const realNow=Date.now;let now=2_000_000;Date.now=()=>now;
 try{
  const hub=new TagHub(new FakeContext(),{});
  const held=async seat=>(await (await hub.fetch(new Request('https://hub/seat',{method:'POST',body:JSON.stringify({seat})}))).json()).online;
  const join=async seat=>{const s=await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat)}}));s.webSocket.fake={fromServer(){},closedByServer(){}};return s.webSocket.server};
  assert.equal(await held(1),false,'nobody joined');
  const guest=await join(1);guest.pongAt=now;now+=240000;assert.equal(await held(1),true,'a quiet background tab');
  hub.webSocketClose(guest,1006,'');guest.readyState=3;assert.equal(await held(1),false,'closed');
  const half=await join(1);half.pongAt=now;now+=PRESENCE_SILENCE;assert.equal(await held(1),false,'silent for PRESENCE_SILENCE');
 }finally{Date.now=realNow}
});
