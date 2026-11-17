// Tag rooms are never full and are deleted once empty for 10 minutes (user, 2026-11-17).
import test from 'node:test';
import assert from 'node:assert/strict';
import {Registry,EMPTY_ROOM_MS} from './registry.mjs';

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
