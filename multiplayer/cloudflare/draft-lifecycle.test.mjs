import test from 'node:test';
import assert from 'node:assert/strict';
import {DraftRegistry} from './collector.mjs';
import cards from './collector-cards.json' with {type:'json'};
test('draft cancellation clears both seats; disconnected drafting stays editable but cannot start a duel',async()=>{
 const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};storage.transaction=fn=>fn(storage);let ready;const registry=new DraftRegistry({storage,blockConcurrencyWhile:fn=>ready=fn()});await ready;
 const deck={main:cards.filter(c=>c.data.type===17).slice(0,40).map(c=>c.id),side:[],extra:[]};
 for(let i=0;i<2;i++)registry.data.players['p'+i]={id:'p'+i,token:'t'+i,name:'Player',character:i,pool:deck.main,deck:structuredClone(deck),wins:0,status:'alive',history:[],room:null};
 const call=async(i,op,body={},status=200)=>{const r=await registry.fetch(new Request('https://test/draft/'+op,{method:'POST',body:JSON.stringify({id:'p'+i,token:'t'+i,...body})}));const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;};
 const first=await call(0,'host');await call(0,'open-ready',{},400);await call(0,'deck',{deck},400);await call(0,'leave');assert.equal((await call(0,'poll')).record.room,null);
 await call(1,'join',{code:first.room.code},400);
 const second=await call(0,'host');await call(1,'join',{code:second.room.code});await call(0,'open-ready');await call(1,'open-ready');const room=registry.data.rooms[second.room.code];assert.equal(room.phase,'drafting');
 room.seen[1]=Date.now()-20000;await call(0,'deck',{deck});await call(0,'ready',{},400);assert.equal(room.phase,'drafting');await call(1,'poll');await call(0,'ready');assert.equal(room.phase,'drafting');
 await call(1,'leave');for(let i=0;i<2;i++){const r=await call(i,'poll');assert.equal(r.record.room,null);assert.equal(r.room,null);}await call(0,'host');
});
