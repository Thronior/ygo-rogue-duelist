import test from 'node:test';
import assert from 'node:assert/strict';
import {DraftRegistry} from './collector.mjs';
import cards from './collector-cards.json' with {type:'json'};

const sorted=xs=>[...xs].sort((a,b)=>a-b);
test('draft match reshuffles both decks each duel, without siding or changing cards',async()=>{
 const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};
 storage.transaction=fn=>fn(storage);let ready;
 const registry=new DraftRegistry({storage,blockConcurrencyWhile:fn=>{ready=fn();}});await ready;
 const ids=cards.filter(c=>c.data.type===17).slice(0,40).map(c=>c.id);
 const original={main:ids,side:[],extra:[]};
 for(let seat=0;seat<2;seat++)registry.data.players['p'+seat]={id:'p'+seat,token:'token'+seat,name:'Test '+seat,character:seat,pool:ids,deck:structuredClone(original),wins:0,status:'alive',history:[],room:null};
 async function call(seat,action,body={},status=200){
  const response=await registry.fetch(new Request('https://test/draft/'+action,{method:'POST',body:JSON.stringify({id:'p'+seat,token:'token'+seat,...body})}));
  const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;
 }
 const host=await call(0,'host');await call(1,'join',{code:host.room.code});
 assert.equal(registry.data.rooms[host.room.code].phase,'waiting');
 await call(0,'open-ready');assert.equal(registry.data.rooms[host.room.code].phase,'waiting');await call(1,'open-ready');assert.equal(registry.data.rooms[host.room.code].phase,'drafting');
 await call(0,'ready');assert.equal(registry.data.rooms[host.room.code].phase,'drafting');
 await call(1,'ready');
 const room=registry.data.rooms[host.room.code];let previous=[original,original];
 for(let game=1;game<=3;game++){
  assert.equal(room.game,game);assert.equal(room.phase,'duel');
  for(let seat=0;seat<2;seat++){
   assert.deepEqual(sorted(room.decks[seat].main),sorted(ids));
   assert.notDeepEqual(room.decks[seat].main,previous[seat].main);
   assert.deepEqual(room.decks[seat].side,[]);
   assert.deepEqual(registry.data.players['p'+seat].deck,original);
  }
  previous=structuredClone(room.decks);
  assert.deepEqual((await call(0,'poll')).room.decks,previous);
  assert.deepEqual((await call(1,'register')).room.decks,previous);
  assert.deepEqual(room.startDecks,[original,original]);
  // Alternating winners exercises all three games of a best-of-three match.
  const winner=game===2?1:0;
  await call(0,'result',{number:0,winner});await call(1,'result',{number:0,winner});
  if(game<3){
   assert.equal(room.phase,'siding');
   assert.match((await call(0,'side',{deck:original},400)).error,/do not allow siding/);
   await call(0,'next');assert.deepEqual(room.decks,previous);
   await call(1,'next');
  }
 }
 assert.equal(room.phase,'complete');assert.deepEqual(room.score,[2,1]);
});
