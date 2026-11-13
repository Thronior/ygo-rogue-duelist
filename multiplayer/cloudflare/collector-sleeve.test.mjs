import test from 'node:test';
import assert from 'node:assert/strict';
import {DraftRegistry,sleeveOf} from './collector.mjs';
import cards from './collector-cards.json' with {type:'json'};
// Card sleeves (2026-11-12): each player's chosen sleeve rides their collector record and shows in the room's players.
test('card sleeves: kept on the record, shown to the opponent, cleared by Standard, ignored when malformed',async()=>{
 const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};storage.transaction=fn=>fn(storage);let ready;const registry=new DraftRegistry({storage,blockConcurrencyWhile:fn=>ready=fn()});await ready;
 const deck={main:cards.filter(c=>c.data.type===17).slice(0,40).map(c=>c.id),side:[],extra:[]};
 for(let i=0;i<2;i++)registry.data.players['p'+i]={id:'p'+i,token:'t'+i,name:'Player',character:i,pool:deck.main,deck:structuredClone(deck),wins:0,status:'alive',history:[],room:null};
 const call=async(i,op,body={})=>{const r=await registry.fetch(new Request('https://test/draft/'+op,{method:'POST',body:JSON.stringify({id:'p'+i,token:'t'+i,...body})}));const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;};
 const kuriboh={key:'kuriboh',proof:{sleeves_earned:['kuriboh','extra'],character_levels:{3:6}}};
 const hosted=await call(0,'host',{sleeve:kuriboh});
 // An older client sends no sleeve: nothing is stored for it.
 const joined=await call(1,'join',{code:hosted.room.code});
 assert.deepEqual(registry.data.players.p0.sleeve,{key:'kuriboh',proof:{sleeves_earned:['kuriboh']}});
 assert.equal('sleeve' in registry.data.players.p1,false);
 assert.deepEqual(joined.room.players[0].sleeve,{key:'kuriboh',proof:{sleeves_earned:['kuriboh']}});
 assert.equal('sleeve' in joined.room.players[1],false);
 await call(1,'poll',{sleeve:{key:1,proof:{character_levels:{1:6}}}});
 assert.deepEqual((await call(0,'poll')).room.players[1].sleeve,{key:1,proof:{character_levels:{1:6}}});
 // Standard (null) clears it; a malformed or unproven one stores nothing.
 await call(0,'poll',{sleeve:null});assert.equal('sleeve' in registry.data.players.p0,false);
 for(const bad of [{key:'../x',proof:{sleeves_earned:['../x']}},{key:'jinzo',proof:{}},{key:4,proof:{character_levels:{4:5}}},'kuriboh',{key:1e9}])assert.equal(sleeveOf(bad),null);
});
