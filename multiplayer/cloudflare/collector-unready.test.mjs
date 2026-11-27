import test from 'node:test';
import assert from 'node:assert/strict';
import {CollectorRegistry} from './collector.mjs';
import cards from './collector-cards.json' with {type:'json'};

// CITYDRIVER, 2026-11-26: after Ready, changes to the sided deck were never sent. Unready opens it again, and the deck
// sent with the next Ready is the one the next duel uses.
test('Collector siding: Unready, change the deck, Ready again',async()=>{
 const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};
 storage.transaction=fn=>fn(storage);let ready;
 const registry=new CollectorRegistry({storage,blockConcurrencyWhile:fn=>{ready=fn();}});await ready;
 const ids=cards.filter(c=>c.data.type===17).slice(0,42).map(c=>c.id);
 const original={main:ids.slice(0,40),side:ids.slice(40),extra:[]};
 for(let i=0;i<2;i++)registry.data.players['p'+i]={id:'p'+i,token:'token'+i,name:'Test '+i,character:i,pool:ids,deck:structuredClone(original),wins:0,status:'alive',history:[],room:null};
 async function call(seat,action,body={}){
  const response=await registry.fetch(new Request('https://test/collector/'+action,{method:'POST',body:JSON.stringify({id:'p'+seat,token:'token'+seat,...body})}));
  return {status:response.status,data:await response.json()};
 }
 const host=(await call(0,'host')).data;await call(1,'join',{code:host.room.code});
 const room=registry.data.rooms[host.room.code];
 await call(0,'result',{number:0,winner:0});await call(1,'result',{number:0,winner:0});
 assert.equal(room.phase,'siding');
 await call(0,'side',{deck:structuredClone(original)});
 assert.equal(room.ready[0],true);
 assert.equal((await call(0,'unready')).status,200);
 assert.equal(room.ready[0],false,'Unready takes the seat out of Ready');
 const changed=structuredClone(original);[changed.main[0],changed.side[0]]=[changed.side[0],changed.main[0]];
 await call(0,'side',{deck:changed});await call(1,'side',{deck:structuredClone(original)});
 await call(1,'first',{first:0});
 assert.equal(room.phase,'duel');
 assert.deepEqual([...room.decks[0].main].sort((a,b)=>a-b),[...changed.main].sort((a,b)=>a-b),'the changed deck is used');
 assert.notEqual((await call(0,'unready')).status,200,'no Unready during a duel');
});
