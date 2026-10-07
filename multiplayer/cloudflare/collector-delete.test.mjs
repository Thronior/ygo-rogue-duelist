import test from 'node:test';import assert from 'node:assert/strict';import {CollectorRegistry} from './collector.mjs';
test('Collector deletion requires ownership, rejects active rooms, and cannot be resurrected by registration',async()=>{
 const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};storage.transaction=fn=>fn(storage);let ready;const registry=new CollectorRegistry({storage,blockConcurrencyWhile:fn=>{ready=fn()}});await ready;
 const p={id:'test',token:'owner',name:'Delete test',character:0,pool:[1],deck:{main:[],side:[],extra:[]},wins:0,status:'alive',history:[],room:null};registry.data.players.test=p;
 const call=(op,token='owner')=>registry.fetch(new Request('https://test/collector/'+op,{method:'POST',body:JSON.stringify({id:'test',token})}));
 assert.equal((await call('delete','wrong')).status,400);assert.equal(p.status,'alive');
 p.room='ABCDE';registry.data.rooms.ABCDE={code:'ABCDE',phase:'waiting',players:['test'],seen:[Date.now()],events:[],score:[0,0]};assert.equal((await call('delete')).status,400);assert.equal(p.status,'alive');
 p.room=null;assert.equal((await call('delete')).status,200);assert.equal(p.status,'deleted');assert.deepEqual(p.pool,[]);
 const response=await call('register');assert.equal((await response.json()).record.status,'deleted');assert.equal((await call('delete')).status,200);
});
