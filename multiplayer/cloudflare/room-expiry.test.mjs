// Tag rooms are never full and are deleted once empty for 10 minutes (user, 2026-11-17).
import test from 'node:test';
import assert from 'node:assert/strict';
import {Registry,EMPTY_ROOM_MS} from './registry.mjs';
import {FakeContext} from '../../android/net_test_harness.mjs';
import {TagHub,EMPTY_FOR,PRESENCE_SILENCE} from './hub.mjs';

test('more than 256 rooms can be created',async()=>{
 let now=0;const r=new Registry({clock:()=>now});
 for(let i=0;i<300;i++){now+=1;await r.request('create',{},'','ip'+i);}
 assert.equal(r.rooms.size,300);
});

test('a room empty for 10 minutes is deleted; a room still in play stays',async()=>{
 let now=1000;const online=new Set();const asked=[];
 const r=new Registry({clock:()=>now,presence:async code=>{asked.push(code);return online.has(code)}});
 const empty=(await r.request('create',{},'','a')).code,busy=(await r.request('create',{},'','b')).code;
 online.add(busy);
 now+=EMPTY_ROOM_MS-1000;await r.request('create',{},'','c');
 assert(r.rooms.has(empty)&&r.rooms.has(busy),'not yet 10 minutes');
 now+=61000;await r.request('create',{},'','d');
 assert(!r.rooms.has(empty),'the empty room is gone');assert(r.rooms.has(busy),'the occupied room stays');
 assert.deepEqual(asked.sort(),[busy,empty].sort());
 // The occupied room was marked fresh, so it is asked again only 10 minutes later.
 asked.length=0;now+=61000;await r.request('create',{},'','e');assert.deepEqual(asked,[]);
 online.delete(busy);now+=EMPTY_ROOM_MS;await r.request('create',{},'','f');assert(!r.rooms.has(busy),'deleted once its players leave');
});

test('joining an abandoned room says it is gone; a hub that cannot answer keeps the room',async()=>{
 let now=0;const r=new Registry({clock:()=>now,presence:async code=>{if(code===keep)throw Error('hub down');return false}});
 const gone=(await r.request('create',{},'','a')).code,keep=(await r.request('create',{},'','b')).code;
 now+=EMPTY_ROOM_MS+60000;
 await assert.rejects(r.request('join',{code:gone},'','c'),/Room not found/);
 assert(r.rooms.has(keep));
});

// Discord 2026-11-18: a room expired while both players were in it (one away, one editing a deck). The hub now answers
// "empty" only after nobody has been connected for EMPTY_FOR; a single empty moment, or a player coming back, keeps it.
test('the hub calls a room empty only after 10 minutes with nobody connected',async()=>{
 const realNow=Date.now;let now=1_000_000;Date.now=()=>now;
 try{
  const ctx=new FakeContext(),hub=new TagHub(ctx,{});
  const ask=async()=>(await (await hub.fetch(new Request('https://hub/presence',{method:'POST'}))).json()).occupied;
  const join=async seat=>{const s=await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat)}}));s.webSocket.fake={fromServer(){},closedByServer(){}};return s.webSocket.server};
  const a=await join(0);
  assert.equal(await ask(),true,'a connected player');
  hub.webSocketClose(a,1006,'');a.readyState=3;
  assert.equal(await ask(),true,'the first empty answer only starts the count');
  now+=EMPTY_FOR-1000;assert.equal(await ask(),true,'not 10 minutes yet');
  const b=await join(1);now+=2000;assert.equal(await ask(),true,'someone came back');
  hub.webSocketClose(b,1006,'');b.readyState=3;
  assert.equal(await ask(),true,'the count starts again');
  now+=EMPTY_FOR;assert.equal(await ask(),false,'empty for 10 minutes');
 }finally{Date.now=realNow}
});
// Discord 2026-11-18 (Teq): one player away, the other in the deck editor with the game in a background tab, which pings
// about once a minute. A connected player counts as present on any screen; only a closed socket, or one silent for
// PRESENCE_SILENCE, counts as gone.
test('a quiet but connected player keeps the room',async()=>{
 const realNow=Date.now;let now=5_000_000;Date.now=()=>now;
 try{
  const ctx=new FakeContext(),hub=new TagHub(ctx,{});
  const ask=async()=>(await (await hub.fetch(new Request('https://hub/presence',{method:'POST'}))).json()).occupied;
  const join=async seat=>{const s=await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat)}}));s.webSocket.fake={fromServer(){},closedByServer(){}};return s.webSocket.server};
  const editing=await join(0),away=await join(1);
  hub.webSocketClose(away,1006,'');away.readyState=3;
  // The background tab last pinged 4 minutes ago: still connected, the room stays, and its socket is left open.
  editing.pongAt=now;now+=240000;
  assert.equal(await ask(),true);assert.equal(editing.readyState,1,'not closed for being quiet');
  now+=EMPTY_FOR;editing.pongAt=now-60000;assert.equal(await ask(),true,'still there 14 minutes later');
  // A socket silent for PRESENCE_SILENCE is gone; then the room needs EMPTY_FOR more with nobody before it is empty.
  now+=PRESENCE_SILENCE;assert.equal(await ask(),true,'the count starts');
  now+=EMPTY_FOR;assert.equal(await ask(),false);
 }finally{Date.now=realNow}
});