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
