// Ultimate Collector feedback (CITYDRIVER, user 2026-11-24): plays add turn time, a timeout loses only that duel, and
// players can ask for a pause the opponent must accept. Draft rooms keep the old clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeContext} from '../../android/net_test_harness.mjs';
import {CollectorRegistry} from './collector.mjs';
import cards from './collector-cards.json' with {type:'json'};
const {MatchHub,TURN_TIME,PLAY_BONUS,MAX_TURN_BONUS,PAUSES,PAUSE_TIME,PAUSE_ASK,PAUSE_ASKS,PAUSE_RETRY,DISCONNECT_ALLOWANCE,DROP_GRACE,isPlay}=await import('./hub.mjs');

const summary=(kind='collector')=>({kind,code:'ROOM1',phase:'duel',game:1,players:2,actor:0});
function setup(kind='collector'){
 const reports=[],ctx=new FakeContext(),binding={idFromName:n=>n,get:()=>({fetch:async(_,init)=>{reports.push(JSON.parse(init.body));return {ok:true}}})};
 const hub=new MatchHub(ctx,{DRAFT:binding,COLLECTOR:binding});
 const join=async seat=>{
  const socket=await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat),'X-Hub-Summary':JSON.stringify(summary(kind))}}));
  const server=socket.webSocket.server,inbox=[];socket.webSocket.fake={fromServer:text=>inbox.push(JSON.parse(text)),closedByServer(){}};
  return {server,inbox,say:data=>hub.webSocketMessage(server,JSON.stringify(data)),last:t=>inbox.findLast(m=>m.t===t)};
 };
 return {hub,ctx,reports,join};
}
const SUMMON={type:1,action:0,index:0},PASS={type:8,index:null},TO_BP={type:1,action:6,index:null};
const move=(n,response,nextActor=0,turn=1)=>({t:'r',game:1,n,response,nextActor,turn,h:1});

test('plays are Summons, Sets and activations; passes and phase changes are not',()=>{
 for(const r of [{type:1,action:0},{type:1,action:1},{type:1,action:3},{type:1,action:4},{type:1,action:5},{type:0,action:0,index:2},{type:8,index:0},{type:8,index:3}])assert.equal(isPlay(r),true,JSON.stringify(r));
 for(const r of [null,{},{type:1,action:2},{type:1,action:6},{type:1,action:7},{type:0,action:1},{type:0,action:3},PASS,{type:8,index:-1},{type:5,index:[1]},{type:3,value:1}])assert.equal(isPlay(r),false,JSON.stringify(r));
});

test('each play gives the player 15 seconds back, never above 3:00 and at most 3:00 a turn',async()=>{
 const {hub,join}=setup(),a=await join(0);await join(1);const m=hub.meta;
 m.turnLeft[0]=60000;await a.say(move(0,SUMMON));
 assert(m.turnLeft[0]>=60000+PLAY_BONUS-1000&&m.turnLeft[0]<=60000+PLAY_BONUS,`${m.turnLeft[0]}`);
 assert.equal(a.last('ev').turnLeft[0],m.turnLeft[0],'the echo carries the new clock, so older clients show it too');
 m.turnLeft[0]=TURN_TIME-5000;await a.say(move(1,SUMMON));assert(m.turnLeft[0]<=TURN_TIME,'never above the full turn');
 const before=m.turnLeft[0];await a.say(move(2,TO_BP));assert(m.turnLeft[0]<=before,'a phase change earns nothing');
 m.turnLeft[0]=1000;m.bonusLeft[0]=MAX_TURN_BONUS;let n=3;for(let i=0;i<20;i++){m.turnLeft[0]=Math.min(m.turnLeft[0],10000);await a.say(move(n++,SUMMON))}
 assert.equal(m.bonusLeft[0],0,'the turn bonus runs out');const flat=m.turnLeft[0];await a.say(move(n++,SUMMON));assert(m.turnLeft[0]<=flat);
 await a.say(move(n++,TO_BP,1,2));assert.deepEqual(m.bonusLeft,[MAX_TURN_BONUS,MAX_TURN_BONUS],'a new turn refills the bonus');
});

test('a chain activation helps the player who made it; Draft rooms get no bonus',async()=>{
 const {hub,join}=setup(),a=await join(0),b=await join(1);const m=hub.meta;
 await a.say(move(0,PASS,1));m.turnLeft[1]=30000;await b.say(move(1,{type:8,index:0},0));assert(m.turnLeft[1]>30000);
 const d=setup('draft'),x=await d.join(0);await d.join(1);d.hub.meta.turnLeft[0]=60000;await x.say(move(0,SUMMON));assert(d.hub.meta.turnLeft[0]<=60000);
});

test('a Collector timeout is reported as losing that duel; Draft still forfeits',async()=>{
 const {hub,join,reports}=setup();await join(0);await join(1);
 hub.meta.turnLeft[1]=-1;await hub.alarm();assert.deepEqual([reports[0].type,reports[0].seat,reports[0].game],['timeout',1,1]);
 const d=setup('draft');await d.join(0);await d.join(1);d.hub.meta.turnLeft[0]=-1;await d.hub.alarm();assert.equal(d.reports[0].type,'forfeit');
});

test('a pause needs the opponent, freezes the clock and the allowance, and resumes by itself',async()=>{
 const {hub,join}=setup(),a=await join(0),b=await join(1);const m=hub.meta;
 assert.equal(a.last('presence')?.pause?.left?.[0]??PAUSES,PAUSES);
 await a.say({t:'pause',game:1,ask:true});assert.equal(m.pause.ask.seat,0);assert.equal(b.last('presence').pause.ask.seat,0,'the opponent is asked');
 await a.say({t:'pause',game:1,answer:true});assert.equal(m.pause.until,null,'the asker cannot accept their own request');
 await b.say({t:'pause',game:1,answer:true});
 const p=m.pause;assert.equal(p.by,0);assert.equal(p.left[0],PAUSES-1);assert(p.until-Date.now()>PAUSE_TIME-1000);assert(m.clockAt>=p.until);
 const left=m.turnLeft[0];hub.settle(p.until-1);assert.equal(m.turnLeft[0],left,'the turn clock is frozen');
 // An away player is not charged for the pause, only for time after it.
 m.offlineAt[1]=p.from;m.chargedAt[1]=null;hub.settle(p.until-1);assert.equal(m.disconnectLeft[1],DISCONNECT_ALLOWANCE);
 hub.settle(p.until+5000);assert.equal(m.disconnectLeft[1],DISCONNECT_ALLOWANCE-5000);
 hub.settle(p.until+1000);assert.equal(m.turnLeft[0],left,'the clock waits while a seat is away');
 m.offlineAt[1]=null;m.chargedAt[1]=null;hub.settle(p.until+6000);assert.equal(m.turnLeft[0],left-1000,'it runs again after the pause');
});

test('a declined ask waits a minute; asks and pauses are capped per match',async()=>{
 const {hub,join}=setup(),a=await join(0),b=await join(1);const m=hub.meta;
 await a.say({t:'pause',game:1,ask:true});await b.say({t:'pause',game:1,answer:false});
 assert.equal(m.pause.ask,null);assert(m.pause.retryAt[0]>Date.now()+PAUSE_RETRY-1000);
 await a.say({t:'pause',game:1,ask:true});assert.equal(m.pause.ask,null,'too soon after a decline');
 m.pause.retryAt[0]=0;m.pause.asks[0]=0;await a.say({t:'pause',game:1,ask:true});assert.equal(m.pause.ask,null,'out of asks');
 assert.equal(PAUSE_ASKS>PAUSES,true);
 m.pause.asks[1]=PAUSE_ASKS;m.pause.left[1]=0;await b.say({t:'pause',game:1,ask:true});assert.equal(m.pause.ask,null,'out of pauses');
 // An unanswered ask lapses.
 m.pause.left[1]=1;await b.say({t:'pause',game:1,ask:true});m.pause.ask.until=Date.now()-1;await a.say({t:'pause',game:1,answer:true});assert.equal(m.pause.until,null);
 assert(PAUSE_ASK<=60000);
});

test('the asker resumes early or by making a play; the opponent cannot end it',async()=>{
 const {hub,join}=setup(),a=await join(0),b=await join(1);const m=hub.meta;
 await a.say({t:'pause',game:1,ask:true});await b.say({t:'pause',game:1,answer:true});
 await b.say({t:'pause',game:1,resume:true});assert(m.pause.until>Date.now(),'only the asker resumes');
 await a.say({t:'pause',game:1,resume:true});assert(m.pause.until<=Date.now());assert(m.clockAt-Date.now()<=2000);
 await b.say({t:'pause',game:1,ask:true});await a.say({t:'pause',game:1,answer:true});assert.equal(m.pause.by,1);
 await a.say(move(0,SUMMON));assert(m.pause.until>Date.now(),'the other player playing keeps the pause');assert(m.clockAt>=m.pause.until);
 await a.say(move(1,PASS,1));await b.say(move(2,{type:8,index:0},0));assert(m.pause.until<=Date.now(),'the asker playing ends it');
});

test('a new duel ends any pause and keeps the pauses left; Draft rooms cannot pause',async()=>{
 const {hub,join}=setup(),a=await join(0),b=await join(1);
 await a.say({t:'pause',game:1,ask:true});await b.say({t:'pause',game:1,answer:true});
 await hub.apply({...summary(),phase:'siding'});await hub.apply({...summary(),game:2});
 assert.equal(hub.meta.pause.until,null);assert.equal(hub.meta.pause.left[0],PAUSES-1);
 const d=setup('draft'),x=await d.join(0);await d.join(1);await x.say({t:'pause',game:1,ask:true});assert.equal(d.hub.meta.pause,undefined);
 assert.equal('pause' in x.last('presence'),false);
});

test('the registry turns a timeout into one lost duel, and a second one ends the match',async()=>{
 const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};
 storage.transaction=fn=>fn(storage);let ready;
 const registry=new CollectorRegistry({storage,blockConcurrencyWhile:fn=>{ready=fn();}});await ready;
 const ids=cards.filter(c=>c.data.type===17).slice(0,40).map(c=>c.id);
 for(let i=0;i<2;i++)registry.data.players['p'+i]={id:'p'+i,token:'token'+i,name:'Test '+i,character:i,pool:ids,deck:{main:ids,side:[],extra:[]},wins:0,status:'alive',history:[],room:null};
 const call=async(seat,op,body={})=>{const r=await registry.fetch(new Request('https://test/collector/'+op,{method:'POST',body:JSON.stringify({id:'p'+seat,token:'token'+seat,version:'0.2.44',net:3,...body})}));const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;};
 const report=v=>registry.fetch(new Request('https://internal/hub-report',{method:'POST',headers:{'X-Hub-Report':'1'},body:JSON.stringify({code,...v})}));
 const host=await call(0,'host'),code=host.room.code;await call(1,'join',{code});const room=registry.data.rooms[code];
 assert.equal(room.phase,'duel');assert.equal(room.hub,true);
 await report({type:'timeout',seat:0,game:1,turns:4});
 assert.equal(room.phase,'siding','the match goes on');assert.deepEqual(room.score,[0,1]);assert.equal(room.games[0].reason,'Turn timer expired');assert.equal(room.games[0].turns,4);
 assert.equal(registry.data.players.p0.status,'alive');
 await report({type:'timeout',seat:0,game:1,turns:5});assert.deepEqual(room.score,[0,1],'a stale report changes nothing');
 room.phase='duel';room.game=2;await report({type:'timeout',seat:0,game:2,turns:3});
 assert.equal(room.phase,'complete');assert.equal(room.winner,1);assert.equal(registry.data.players.p0.status,'eliminated');
});
