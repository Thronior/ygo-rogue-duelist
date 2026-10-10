import test from 'node:test';
import assert from 'node:assert/strict';
import {CollectorRegistry} from './collector.mjs';
import {RoomRegistry} from './worker.mjs';
function harness(seed=[]){
 const data=new Map(seed),writes=[];let alarm=null,ready;
 const storage={get:async k=>structuredClone(data.get(k)),list:async({prefix})=>new Map([...data].filter(([k])=>k.startsWith(prefix))),put:async(k,v)=>{writes.push(k);data.set(k,structuredClone(v));},delete:async k=>data.delete(k),setAlarm:async at=>{writes.push('alarm');alarm=at;},getAlarm:async()=>alarm};storage.transaction=fn=>fn(storage);
 const ctx={storage,blockConcurrencyWhile:fn=>{ready=fn();}};
 return {ctx,data,writes,ready:()=>ready};
}
test('timer-only updates write one small record; restart restores exact clocks and one pending alarm',async()=>{
 const h=harness();let r=new CollectorRegistry(h.ctx);await h.ready();
 r.data.rooms.TEST={code:'TEST',phase:'duel',players:['a','b'],seen:[100,100],charged:[0,0],disconnectLeft:[300000,300000],turnLeft:[180000,180000],clockAt:100,events:[],actor:0};
 await r.persist();h.writes.length=0;
 r.data.rooms.TEST.seen[0]=200;r.data.rooms.TEST.turnLeft[0]-=100;r.data.rooms.TEST.clockAt=200;
 await r.persist();assert.deepEqual(h.writes,['collector:timing:TEST']);
 const expected=structuredClone(r.data.rooms.TEST);r=new CollectorRegistry(h.ctx);await h.ready();assert.deepEqual(r.data.rooms.TEST,expected);
 h.writes.length=0;await r.persist();assert.deepEqual(h.writes,[]);
 r.data.rooms.TEST.events.push({seat:0,response:{choice:1}});await r.persist();assert(h.writes.includes('collector:rooms:TEST:0'));
});
test('legacy Tag migration and incremental saves preserve other rooms and deletions across restart',async()=>{
 const now=Date.now(),room=n=>({tokens:[n,null],generation:0,touched:now,started:false,relay:false,queues:[[],[]],seq:0});
 const h=harness([['rooms',{AAAAA:room('a'),BBBBB:room('b')}]]);let r=new RoomRegistry(h.ctx,{});await h.ready();assert(!h.data.has('rooms'));
 h.writes.length=0;await r.registry.request('started',{code:'AAAAA'},'a');assert.deepEqual(h.writes,['room:AAAAA']);
 await r.registry.request('leave',{code:'AAAAA'},'a');assert(!h.data.has('room:AAAAA'));
 r=new RoomRegistry(h.ctx,{});await h.ready();assert(!r.registry.rooms.has('AAAAA'));assert(r.registry.rooms.has('BBBBB'));
});
