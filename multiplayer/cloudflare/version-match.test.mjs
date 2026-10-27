import test from 'node:test';
import assert from 'node:assert/strict';
import {DraftRegistry} from './collector.mjs';
import cards from './collector-cards.json' with {type:'json'};
test('rooms only pair players on the same game version; clients that send none still pair with each other',async()=>{
 const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};storage.transaction=fn=>fn(storage);let ready;const registry=new DraftRegistry({storage,blockConcurrencyWhile:fn=>ready=fn()});await ready;
 const deck={main:cards.filter(c=>c.data.type===17).slice(0,40).map(c=>c.id),side:[],extra:[]};
 for(let i=0;i<4;i++)registry.data.players['p'+i]={id:'p'+i,token:'t'+i,name:'Player',character:i,pool:deck.main,deck:structuredClone(deck),wins:0,status:'alive',history:[],room:null};
 const call=async(i,op,body={},status=200)=>{const r=await registry.fetch(new Request('https://test/draft/'+op,{method:'POST',body:JSON.stringify({id:'p'+i,token:'t'+i,...body})}));const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;};
 let room=await call(0,'host',{version:'0.2.4'});
 assert.match((await call(1,'join',{code:room.room.code},400)).error,/version 0\.2\.4/);
 assert.match((await call(1,'join',{code:room.room.code,version:'0.2.5'},400)).error,/same version/);
 await call(1,'join',{code:room.room.code,version:'0.2.4'});
 room=await call(2,'host');
 assert.match((await call(3,'join',{code:room.room.code,version:'0.2.4'},400)).error,/older version/);
 await call(2,'leave');room=await call(2,'host',{version:'<b>'});
 assert.equal(registry.data.rooms[room.room.code].version,null,'Only version-shaped strings are stored');
});
