import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeContext} from '../../android/net_test_harness.mjs';
const {MatchHub,TagHub,TURN_TIME,DISCONNECT_ALLOWANCE,DROP_GRACE,HANDOFF_GRACE,STALE_SOCKET}=await import('./hub.mjs');

const summary=(extra={})=>({kind:'draft',code:'ROOM1',phase:'duel',game:1,players:2,actor:0,...extra});
function setup(){
 const reports=[],ctx=new FakeContext();
 const env={DRAFT:{idFromName:n=>n,get:()=>({fetch:async(_,init)=>{reports.push(JSON.parse(init.body));return {ok:true}}})}};
 const hub=new MatchHub(ctx,env);
 const join=async seat=>{
  const socket=await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat),'X-Hub-Summary':JSON.stringify(summary())}}));
  const server=socket.webSocket.server,inbox=[];socket.webSocket.fake={fromServer:text=>inbox.push(JSON.parse(text)),closedByServer(){}};
  return {server,inbox,say:data=>hub.webSocketMessage(server,JSON.stringify(data)),last:t=>inbox.findLast(m=>m.t===t)};
 };
 return {hub,ctx,reports,join};
}
const response=(n,nextActor,turn=1)=>({t:'r',game:1,n,response:{type:1},nextActor,turn,h:7});

test('hub orders responses, echoes both seats and refuses out-of-turn input',async()=>{
 const {hub,join}=setup(),a=await join(0),b=await join(1);
 await a.say(response(0,1));assert.equal(a.last('ev').n,0);assert.equal(b.last('ev').seat,0);assert.equal(b.last('ev').h,7);assert.equal(hub.meta.actor,1);
 await a.say(response(1,0));assert.equal(a.last('reject').count,1,'seat 0 no longer holds the turn');
 await b.say(response(1,0));assert.equal(hub.meta.count,2);
});

test('a resent response is answered from the log and never applied twice',async()=>{
 const {hub,join}=setup(),a=await join(0);await join(1);
 await a.say(response(0,1));const before=a.inbox.length;await a.say(response(0,1));
 assert.equal(hub.meta.count,1);assert.equal(a.inbox.length,before+1);assert.equal(a.inbox.at(-1).n,0);
});

test('a reconnecting client receives exactly the events it missed',async()=>{
 const {join}=setup(),a=await join(0),b=await join(1);
 await a.say(response(0,1));await b.say(response(1,0));await a.say(response(2,1));
 await b.say({t:'hello',game:1,after:1});const sync=b.last('sync');assert.equal(sync.from,1);assert.equal(sync.count,3);assert.deepEqual(sync.events.map(e=>e.seat),[1,0]);
});

test('the turn clock pays for neither transit nor a partner being away',async()=>{
 const {hub,join}=setup();await join(0);await join(1);
 const m=hub.meta,start=m.clockAt;
 hub.settle(start-1);assert.equal(m.turnLeft[0],TURN_TIME,'grace after a hand-off is free');
 hub.settle(start+1000);assert.equal(m.turnLeft[0],TURN_TIME-1000);
 m.offlineAt[1]=start+1000;hub.settle(start+6000);assert.equal(m.turnLeft[0],TURN_TIME-1000,'clock stops while a seat is away');
});

test('a short drop costs nothing and allowance is charged only past the grace',async()=>{
 const {hub,join}=setup();await join(0);const b=await join(1),m=hub.meta;
 await hub.webSocketClose(b.server,1006,'');b.server.readyState=3;
 const since=m.offlineAt[1];assert.notEqual(since,null);
 hub.settle(since+DROP_GRACE-1);assert.equal(m.disconnectLeft[1],DISCONNECT_ALLOWANCE);
 hub.settle(since+DROP_GRACE+5000);assert.equal(m.disconnectLeft[1],DISCONNECT_ALLOWANCE-5000);
 hub.settle(since+DROP_GRACE+5000);assert.equal(m.disconnectLeft[1],DISCONNECT_ALLOWANCE-5000,'time is never charged twice');
 const back=await join(1);assert.equal(m.offlineAt[1],null);assert(hub.online(1));assert(back.last('presence').online[1]);
});

test('expired allowance and turn timer report one forfeit',async()=>{
 const {hub,join,reports}=setup();await join(0);await join(1);
 hub.meta.turnLeft[0]=-1;await hub.alarm();assert.deepEqual([reports[0].type,reports[0].seat,reports[0].reason],['forfeit',0,'Turn timer expired']);
 await hub.alarm();assert.equal(reports.length,1,'reported once');
});

test('both seats out of allowance is reported as both',async()=>{
 const {hub,join,reports}=setup();await join(0);await join(1);hub.meta.disconnectLeft=[-1,-1];await hub.alarm();assert.equal(reports[0].type,'both');
});

test('matching result votes finish the game; a split asks both clients to rebuild',async()=>{
 const {hub,join,reports}=setup(),a=await join(0),b=await join(1);
 await a.say({t:'result',game:1,n:0,winner:0});await b.say({t:'result',game:1,n:0,winner:1});assert.equal(a.last('desync').t,'desync');assert.equal(reports.length,0);
 await a.say({t:'result',game:1,n:0,winner:1});await b.say({t:'result',game:1,n:0,winner:1});assert.equal(reports[0].type,'game');assert.equal(reports[0].winner,1);
});

test('alarms stay rare: routine play does not rewrite the alarm',async()=>{
 const {hub,join,ctx}=setup(),a=await join(0),b=await join(1);let sets=0;const set=ctx.storage.setAlarm.bind(ctx.storage);ctx.storage.setAlarm=at=>{sets++;return set(at)};
 for(let n=0;n<40;n++)await (n%2?b:a).say(response(n,n%2?0:1));
 assert(sets<=1,`${sets} alarm writes in 40 responses`);assert.equal(hub.meta.count,40);
});

test('a new game clears the old log and keeps the match allowance',async()=>{
 const {hub,join,ctx}=setup(),a=await join(0);await join(1);await a.say(response(0,1));hub.meta.disconnectLeft[0]=1000;
 await hub.apply(summary({game:2,actor:1}));assert.equal(hub.meta.count,0);assert.equal(hub.meta.actor,1);assert.equal(hub.meta.disconnectLeft[0],1000);assert(![...ctx.storage.data.keys()].some(k=>k.startsWith('e:1:')));
});

// Rows written (2026-11-11): responses live in the meta row and in 32-event chunk rows.
const wake=(ctx,reports=[])=>new MatchHub(ctx,{DRAFT:{idFromName:n=>n,get:()=>({fetch:async(_,init)=>{reports.push(JSON.parse(init.body));return {ok:true}}})}});
const attach=(hub,seat)=>hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat),'X-Hub-Summary':JSON.stringify(summary())}})).then(s=>{const inbox=[];s.webSocket.fake={fromServer:t=>inbox.push(JSON.parse(t)),closedByServer(){}};return {server:s.webSocket.server,inbox,say:d=>hub.webSocketMessage(s.webSocket.server,JSON.stringify(d)),last:t=>inbox.findLast(m=>m.t===t)}});
async function play(seats,count,from=0){let actor=from%2;for(let n=from;n<from+count;n++){await seats[actor].say(response(n,1-actor));actor=1-actor}}

test('after hibernation a hub resyncs, retransmits and continues across chunk boundaries',async()=>{
 const {ctx,join}=setup(),a=await join(0),b=await join(1);await play([a,b],70);
 assert(ctx.storage.data.has('c:1:000000')&&ctx.storage.data.has('c:1:000032'),'two closed chunks');assert(![...ctx.storage.data.keys()].some(k=>k.startsWith('e:')));
 // Hibernation: a new instance from the same storage, the sockets survive.
 const hub=wake(ctx),c=await attach(hub,0),d=await attach(hub,1);
 assert.equal(hub.meta.count,70);assert.equal(hub.meta.open.length,6);
 await d.say({t:'hello',game:1,after:20});const sync=d.last('sync');assert.equal(sync.count,70);assert.equal(sync.events.length,50);
 assert.deepEqual(sync.events.map(e=>e.seat),Array.from({length:50},(_,i)=>(20+i)%2));
 await c.say({t:'hello',game:1,after:0});assert.equal(c.last('sync').events.length,70,'a fresh client gets the whole duel');
 // Old responses are answered from a closed chunk and from the open one, and never applied twice.
 await c.say(response(4,1));assert.equal(c.inbox.at(-1).n,4);await c.say(response(66,1));assert.equal(c.inbox.at(-1).n,66);assert.equal(hub.meta.count,70);
 await play([c,d],3,70);assert.equal(hub.meta.count,73);
 const again=wake(ctx),e=await attach(again,1);await e.say({t:'hello',game:1,after:68});assert.deepEqual(e.last('sync').events.map(x=>x.seat),[0,1,0,1,0]);
});

test('a room stored before chunking keeps its log, then continues in chunks',async()=>{
 const ctx=new FakeContext(),now=Date.now();
 const meta={kind:'draft',code:'ROOM1',phase:'duel',game:1,players:2,actor:1,turn:1,turnLeft:[TURN_TIME,TURN_TIME],clockAt:now,count:3,votes:{},clockVotes:{},disconnectLeft:[DISCONNECT_ALLOWANCE,DISCONNECT_ALLOWANCE],offlineAt:[null,null],chargedAt:[null,null],alarmAt:null};
 await ctx.storage.put({meta,'e:1:000000':{seat:0,response:{type:1}},'e:1:000001':{seat:1,response:{type:1}},'e:1:000002':{seat:0,response:{type:1}}});
 const hub=wake(ctx),a=await attach(hub,0),b=await attach(hub,1);
 await b.say({t:'hello',game:1,after:1});assert.deepEqual(b.last('sync').events.map(e=>e.seat),[1,0]);
 await a.say(response(2,1));assert.equal(a.inbox.at(-1).n,2,'legacy event retransmitted');
 await b.say(response(3,0));await a.say({t:'hello',game:1,after:0});assert.deepEqual(a.last('sync').events.map(e=>e.seat),[0,1,0,1]);
 await hub.apply(summary({game:2,actor:0}));assert(![...ctx.storage.data.keys()].some(k=>k.startsWith('e:1:')||k.startsWith('c:1:')));assert.equal(hub.meta.open.length,0);
});

test('the pending alarm is read back on wake, so arming never rewrites the meta row',async()=>{
 const {ctx,hub,join}=setup(),a=await join(0),b=await join(1);await a.say(response(0,1));
 const pending=ctx.storage.alarm;assert.notEqual(pending,null);
 const again=wake(ctx);await new Promise(r=>setTimeout(r,0));assert.equal(again.meta.alarmAt,pending);
 let puts=0;const put=ctx.storage.put.bind(ctx.storage);ctx.storage.put=(k,v)=>{puts++;return put(k,v)};
 const c=await attach(again,0);await attach(again,1);assert.equal(puts,0,'reconnecting seats that never went offline write nothing');
 await hub.webSocketClose(b.server,1006,'');void c;
});

test('a new game deletes the old game chunks',async()=>{
 const {hub,join,ctx}=setup(),a=await join(0),b=await join(1);await play([a,b],40);
 await hub.apply(summary({game:2,actor:1}));assert(![...ctx.storage.data.keys()].some(k=>/^[ce]:1:/.test(k)));assert.equal(hub.meta.openFrom,0);
});

test('a completed room wipes hub storage',async()=>{
 const {hub,join,ctx}=setup(),a=await join(0);await a.say(response(0,0));await hub.apply(summary({phase:'complete'}));assert.equal(hub.meta,null);assert.equal(ctx.storage.data.size,0);
});

test('a silent socket is dropped when the waiting player checks',async()=>{
 const {hub,join}=setup(),a=await join(0),b=await join(1);b.server.attachment.at=Date.now()-STALE_SOCKET-1;
 await a.say({t:'check'});assert.notEqual(hub.meta.offlineAt[1],null);assert.equal(a.last('presence').online[1],false);
});

test('tag hub forwards frames, reports presence and keeps a lone socket open',async()=>{
 const ctx=new FakeContext(),hub=new TagHub(ctx,{}),join=async seat=>{const s=await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat)}})),inbox=[];s.webSocket.fake={fromServer:t=>inbox.push(t),closedByServer(){}};return {server:s.webSocket.server,inbox}};
 const a=await join(0);a.inbox.length=0;const b=await join(1);assert.deepEqual(JSON.parse(a.inbox[0]),{hub:'peer',online:true});
 hub.webSocketMessage(a.server,'{"x":1}');assert.equal(b.inbox.at(-1),'{"x":1}');
 hub.webSocketClose(b.server,1006,'');b.server.readyState=3;assert.deepEqual(JSON.parse(a.inbox.at(-1)),{hub:'peer',online:false});
 hub.webSocketMessage(a.server,'{"x":2}');assert.equal(a.server.readyState,1,'sending to an absent partner keeps the socket');
});
test('hub reports cannot be reached from outside and hubs refuse plain requests',async()=>{
 const worker=(await import('./worker.mjs')).default,refused=[];const stub={get:()=>({fetch:()=>{refused.push('reached');return new Response('{}')}}),idFromName:n=>n};
 const env={LEGACY_MULTIPLAYER:'allow',DRAFT:stub,COLLECTOR:stub,ROOMS:stub};
 for(const url of ['/v2/draft/hub-report','/draft/hub-report','/v2/collector/hub-report'])assert.equal((await worker.fetch(new Request('https://x'+url,{method:'POST',headers:{'X-Hub-Report':'1'},body:'{}'}),env)).status,404,url);
 assert.equal((await worker.fetch(new Request('https://x/v3/draft/hub'),env)).status,404);assert.deepEqual(refused,[]);
});
assert.ok(HANDOFF_GRACE>0);
