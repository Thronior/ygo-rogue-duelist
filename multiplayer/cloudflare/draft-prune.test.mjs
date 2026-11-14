// Draft cleanup (2026-11-13): finished rooms and their players are deleted from storage within a daily row budget, so a
// wake no longer reads every Draft ever played. Active rooms, fresh players and Ultimate Collector data stay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DraftRegistry,CollectorRegistry} from './collector.mjs';
const H=3600000;
async function make(Kind,seed){
 const values=new Map(seed||[]),storage={list:async({prefix}={})=>new Map([...values].filter(([k])=>!prefix||k.startsWith(prefix))),get:async k=>values.get(k),put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{},getAlarm:async()=>null};
 storage.transaction=fn=>fn(storage);let ready;const r=new Kind({storage,blockConcurrencyWhile:fn=>{ready=fn();return ready}},{});await ready;return {r,values};
}
const room=(code,phase,last,players)=>({code,players,phase,score:[0,0],seen:[last,last],events:[]});
const player=(id,roomCode,created)=>({id,token:'t',name:'P',character:0,pool:[],deck:{main:[],side:[],extra:[]},wins:0,status:'alive',history:[],room:roomCode,...(created?{created}:{})});
test('old finished Draft rooms and their players are deleted; active ones stay',async()=>{
 const now=Date.now(),{r,values}=await make(DraftRegistry);
 Object.assign(r.data.rooms,{OLD:room('OLD','complete',now-3*H,['a','b']),NEW:room('NEW','complete',now-1.5*H,['c','d']),LIVE:room('LIVE','duel',now-30*H,['e','f']),STUCK:room('STUCK','drafting',now-49*H,['g','h'])});
 for(const [id,code] of [['a','OLD'],['b','OLD'],['c','NEW'],['d','NEW'],['e','LIVE'],['f','LIVE'],['g','STUCK'],['h','STUCK']])r.data.players[id]=player(id,code);
 r.data.players.fresh=player('fresh',null,now-H);r.data.players.idle=player('idle',null,now-25*H);
 r.data.players.lobby=player('lobby',null);r.data.players.played=Object.assign(player('played',null),{history:[{won:true}]});
 r.prune=()=>{};await r.persist();delete r.prune;
 assert.ok(values.has('collector:rooms:OLD:meta'),'stored first');
 await r.persist();
 const rooms=Object.keys(r.data.rooms).sort(),players=Object.keys(r.data.players).sort();
 assert.deepEqual(rooms,['LIVE','NEW']);assert.deepEqual(players,['c','d','e','f','fresh','lobby'],'older players without a date stay until they have played');
 for(const gone of ['collector:rooms:OLD:meta','collector:rooms:STUCK:meta','collector:players:a:meta','collector:players:idle:meta','collector:players:g:meta'])assert.ok(!values.has(gone),gone);
 assert.ok(values.has('collector:rooms:NEW:meta')&&values.has('collector:players:fresh:meta'));
 // A fresh registry (a wake) reads only what is left.
 const reload=await make(DraftRegistry,values);assert.deepEqual(Object.keys(reload.r.data.rooms).sort(),['LIVE','NEW']);
});
test('deletions stop at the daily budget and continue later; Ultimate Collector is never pruned',async()=>{
 const now=Date.now(),{r,values}=await make(DraftRegistry);
 for(let i=0;i<30;i++){r.data.rooms['R'+i]=room('R'+i,'complete',now-10*H,['x'+i]);r.data.players['x'+i]=player('x'+i,'R'+i)}
 r.prune=()=>{};await r.persist();delete r.prune;
 r.pruneBudget={day:new Date().toISOString().slice(0,10),rows:20000-10};await r.persist();
 const left=[...values.keys()].filter(k=>k.endsWith(':meta')).length;
 assert.ok(left<60&&left>=50,left);assert.ok(r.pruneBudget.rows<=20000);
 assert.deepEqual(values.get('draftprune:budget'),r.pruneBudget);
 r.pruneBudget={day:'2000-01-01',rows:0};await r.persist();
 assert.equal([...values.keys()].filter(k=>k.startsWith('collector:')).length,0,'a new day clears the rest');
 const c=await make(CollectorRegistry);c.r.data.players.old=player('old',null,now-100*H);c.r.data.rooms.X=room('X','complete',now-100*H,['old']);
 await c.r.persist();await c.r.persist();assert.ok(c.r.data.players.old&&c.values.has('collector:players:old:meta'));
});
