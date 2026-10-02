import test from 'node:test';
import assert from 'node:assert/strict';
import {CollectorRegistry,shuffleCollectorDeck} from './collector.mjs';
import cards from './collector-cards.json' with {type:'json'};

const sorted=xs=>[...xs].sort((a,b)=>a-b);
test('Collector shuffle preserves copies, side/Fusion cards and the saved deck',()=>{
 const deck={main:[1,1,2,3,4,5],side:[6],extra:[7]};
 const shuffled=shuffleCollectorDeck(deck,()=>0);
 assert.deepEqual(sorted(shuffled.main),sorted(deck.main));
 assert.notDeepEqual(shuffled.main,deck.main);
 assert.deepEqual(shuffled.side,deck.side);assert.deepEqual(shuffled.extra,deck.extra);
 assert.deepEqual(deck.main,[1,1,2,3,4,5]);
 let words=[0xffffffff,0];
 assert.deepEqual(shuffleCollectorDeck({main:[1,2,3]},()=>words.shift()??0).main,[2,3,1]);
});

test('both decks shuffle for games 1, 2 and 3; polls/reconnects retain that order',async()=>{
 const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};
 storage.transaction=fn=>fn(storage);let ready;
 const registry=new CollectorRegistry({storage,blockConcurrencyWhile:fn=>{ready=fn();}});await ready;
 const ids=cards.filter(c=>c.data.type===17).slice(0,42).map(c=>c.id);
 const original={main:ids.slice(0,40),side:ids.slice(40),extra:[]};
 for(let i=0;i<2;i++)registry.data.players['p'+i]={id:'p'+i,token:'token'+i,name:'Test '+i,character:i,pool:ids,deck:structuredClone(original),wins:0,status:'alive',history:[],room:null};
 async function call(seat,action,body={}){
  const response=await registry.fetch(new Request('https://test/collector/'+action,{method:'POST',body:JSON.stringify({id:'p'+seat,token:'token'+seat,...body})}));
  const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;
 }
 const host=await call(0,'host');let joined=await call(1,'join',{code:host.room.code});
 const room=registry.data.rooms[host.room.code];
 const check=async(game,submitted)=>{
  assert.equal(room.game,game);assert.equal(room.phase,'duel');
  for(let seat=0;seat<2;seat++){
   assert.deepEqual(sorted(room.decks[seat].main),sorted(submitted[seat].main));
   assert.notDeepEqual(room.decks[seat].main,submitted[seat].main);
   assert.deepEqual(room.decks[seat].side,submitted[seat].side);
  }
  const order=structuredClone(room.decks);
  assert.deepEqual((await call(0,'poll')).room.decks,order);
  assert.deepEqual((await call(1,'register')).room.decks,order);
  assert.deepEqual(room.startDecks,[original,original]);
  assert.deepEqual(registry.data.players.p0.deck,original);
 };
 await check(1,[original,original]);
 for(const winner of [0,1]){
  await call(0,'result',{number:0,winner});await call(1,'result',{number:0,winner});
  assert.equal(room.phase,'siding');const submitted=structuredClone(room.decks);
  for(let seat=0;seat<2;seat++){
   [submitted[seat].main[0],submitted[seat].side[0]]=[submitted[seat].side[0],submitted[seat].main[0]];
   await call(seat,'side',{deck:submitted[seat]});
  }
  await call(1-winner,'first',{first:1-winner});await check(winner===0?2:3,submitted);
 }
});
