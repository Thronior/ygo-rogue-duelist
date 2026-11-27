// 2v2 Draft rooms (user, 2026-11-26): four players, two teams, team score, picks alternate between the teams, and a
// player out of disconnect time loses the match for the team. Two-seat rooms keep their own tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeContext} from '../../android/net_test_harness.mjs';
import {DraftRegistry} from './collector.mjs';
import {MatchHub,DISCONNECT_ALLOWANCE,DROP_GRACE} from './hub.mjs';
import {teamOf,teamSeats,duelOrder,teamsFromSlots,moveSlot,randomBlock,randomBooster,isRandomId} from '../../android/web/collector-rules.js';
import cards from './collector-cards.json' with {type:'json'};
const byId=new Map(cards.map(c=>[c.id,c]));
function deckOf(pool,n){const counts=new Map(),main=[];for(const id of pool){const c=byId.get(id);if(c.data.type&64)continue;const k=counts.get(c.name)||0;if(k<3&&main.length<n){counts.set(c.name,k+1);main.push(id);}}assert.equal(main.length,n);return {main,side:[],extra:[]};}
async function registry(){const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};storage.transaction=fn=>fn(storage);let ready;const r=new DraftRegistry({storage,blockConcurrencyWhile:fn=>{ready=fn();}});await ready;return r;}
function caller(reg,draft=5){return async(i,op,body={},status=200)=>{const res=await reg.fetch(new Request('https://test/v2/draft/'+op,{method:'POST',body:JSON.stringify({id:'p'+i,token:'token-'+i+'-'.repeat(40),net:3,draft,version:'0.2.47',...body})}));const data=await res.json();assert.equal(res.status,status,op+' '+JSON.stringify(data).slice(0,300));return data;};}
const report=async(reg,room,data)=>{const res=await reg.fetch(new Request('https://internal/hub-report',{method:'POST',headers:{'X-Hub-Report':'1'},body:JSON.stringify({code:room.code,game:room.game,turns:5,...data})}));assert.equal(res.status,200);};
async function lobby(reg,call){
 for(let i=0;i<4;i++)await call(i,'register',{duelist:{id:'p'+i,name:'Player '+i,character:[0,2,3,4][i]}});
 const host=await call(0,'host',{size:4});for(let i=1;i<4;i++)await call(i,'join',{code:host.room.code});
 // Seats 0 and 2 against 1 and 3: the host drags seat 2 from slot 3 to slot 2.
 await call(0,'move',{from:2,to:1});const room=reg.data.rooms[host.room.code];assert.deepEqual(room.teams,[0,1,0,1]);
 return room;
}
const draftRound=async(call,reg,room)=>{for(let i=0;i<4;i++){await call(i,'deck',{deck:deckOf(reg.data.players['p'+i].pool,room.minDeck)});await call(i,'ready');}};
const pickAll=async(call,room)=>{for(const [k,seat] of room.pickOrder.entries())await call(seat,'pick',{relic:k,pack:k});};

test('team helpers: seats keep their places, teams follow room.teams, partners alternate leading off',()=>{
 const room={size:4,teams:[0,1,0,1],first:1,game:1};
 assert.deepEqual([0,1,2,3].map(s=>teamOf(room,s)),[0,1,0,1]);assert.deepEqual(teamSeats(room,1),[1,3]);
 assert.deepEqual(duelOrder(room),[[1,3],[0,2]]);assert.deepEqual(duelOrder({...room,game:2}),[[3,1],[2,0]]);
 assert.deepEqual(teamOf({},1),1,'a two-seat room has team = seat');
 // Slots 1-2 are Team A and 3-4 Team B; a move swaps two slots, an open slot included.
 assert.deepEqual(teamsFromSlots([0,1,2,3]),[0,0,1,1]);assert.deepEqual(teamsFromSlots([3,0,null,1]),[0,1,0,0]);
 assert.deepEqual(moveSlot([0,1,null,null],1,3),[0,null,null,1]);assert.deepEqual(moveSlot([0,1,2,3],3,0),[3,1,2,0]);
});

test('Random Pack ids: seats 0 and 1 keep their blocks, seats 2 and 3 fit below 201,000,000',()=>{
 assert.equal(randomBlock(0,0),199000000);assert.equal(randomBlock(1,2),200002000);
 assert.equal(randomBlock(2,0),199500000);assert.equal(randomBlock(3,499),200999000);
 for(const seat of [0,1,2,3])for(const k of [0,1,499]){const id=randomBlock(seat,k)+8;assert(isRandomId(id));assert.equal(randomBooster(id,seat),k);for(const other of [0,1,2,3])if(other!==seat)assert.equal(randomBooster(id,other),-1,`seat ${other} cannot use seat ${seat}'s cards`);}
});

test('a 2v2 room takes four players into slots, refuses older clients and a fifth player, and the host moves players between teams',async()=>{
 const reg=await registry(),call=caller(reg);
 for(let i=0;i<6;i++)await call(i,'register',{duelist:{id:'p'+i,name:'Player '+i,character:i%5}},200);
 const host=await call(0,'host',{size:4}),code=host.room.code,room=reg.data.rooms[code];
 assert.equal(room.size,4);assert.deepEqual(room.slots,[0,null,null,null]);
 assert.match((await caller(reg,4)(1,'join',{code},400)).error,/2v2 room/);
 for(let i=1;i<4;i++){const r=await call(i,'join',{code});assert.equal(r.seat,i);}
 assert.deepEqual(room.slots,[0,1,2,3],'joiners fill the slots in order');assert.deepEqual(room.teams,[0,0,1,1]);
 assert.match((await call(4,'join',{code},400)).error,/four players/);
 assert.match((await call(1,'move',{from:1,to:2},400)).error,/Only the host/);
 await call(2,'open-ready');assert.equal(room.ready[2],true);
 await call(0,'move',{from:3,to:1});assert.deepEqual(room.slots,[0,3,2,1]);assert.deepEqual(room.teams,[0,1,1,0]);assert.deepEqual(room.ready,[false,false,false,false],'changing teams asks everyone again');
 assert.match((await call(0,'move',{from:1,to:1},400)).error,/another slot/);assert.match((await call(0,'move',{from:0,to:4},400)).error,/another slot/);
 await call(1,'open-ready');await call(0,'move',{from:2,to:3});assert.deepEqual(room.slots,[0,3,1,2]);assert.equal(room.ready[1],true,'a move inside a team changes no team');
 for(let i=0;i<4;i++)await call(i,'open-ready');
 assert.equal(room.phase,'drafting');assert.equal(room.relics.length,4);
 assert.match((await call(0,'move',{from:1,to:2},400)).error,/before the draft/);
 // A client that cannot play 2v2 still hosts an ordinary room when it asks for size 4.
 const old=await caller(reg,4)(5,'host',{size:4});assert.equal(reg.data.rooms[old.room.code].size,undefined);
});

test('2v2 loop: team score, alternating picks from five, and every winner counts the match',async()=>{
 const reg=await registry(),call=caller(reg),room=await lobby(reg,call);
 for(let i=0;i<4;i++)await call(i,'open-ready');
 await draftRound(call,reg,room);assert.equal(room.phase,'duel');assert.equal(room.game,1);
 assert.equal(room.actor,duelOrder(room)[0][0],'the first duelist of the starting team acts first');
 assert.equal(room.turnLeft.length,4);
 await report(reg,room,{type:'game',winner:1});
 assert.deepEqual(room.score,[0,1]);assert.equal(room.phase,'picking');
 assert.equal(room.offer.relics.length,5);assert.equal(room.offer.packs.length,5);
 assert.deepEqual(room.pickOrder,[0,1,2,3],'losing team first, the teams alternate');
 assert.match((await call(1,'pick',{relic:0,pack:0},400)).error,/your turn/);
 await call(0,'pick',{relic:0,pack:0});
 assert.match((await call(1,'pick',{relic:0,pack:1},400)).error,/still available/);
 assert.match((await call(1,'pick',{relic:1,pack:0},400)).error,/still available/);
 await call(1,'pick',{relic:1,pack:1});await call(2,'pick',{relic:2,pack:2});
 assert.match((await call(3,'pick',{relic:5,pack:3},400)).error,/still available/);
 const offer=structuredClone(room.offer);await call(3,'pick',{relic:4,pack:4});
 assert.equal(room.phase,'drafting');assert.deepEqual(room.relics,[[offer.relics[0]],[offer.relics[1]],[offer.relics[2]],[offer.relics[4]]]);
 for(let i=0;i<4;i++)assert.equal(reg.data.players['p'+i].packs.length,3);
 await draftRound(call,reg,room);assert.equal(room.game,2);assert.equal(room.first,0,'the losing team goes first');
 // Round 2, team 1 lost: its partners swap who leads the picks.
 await report(reg,room,{type:'game',winner:0});assert.deepEqual(room.pickOrder,[3,2,1,0]);
 await pickAll(call,room);await draftRound(call,reg,room);
 await report(reg,room,{type:'game',winner:0});await pickAll(call,room);await draftRound(call,reg,room);
 await report(reg,room,{type:'game',winner:0});
 assert.equal(room.phase,'decided');assert.equal(room.winner,0);assert.deepEqual(room.score,[3,1]);
 assert.deepEqual([0,1,2,3].map(i=>reg.data.players['p'+i].wins),[1,0,1,0]);
 assert.deepEqual([0,1,2,3].map(i=>reg.data.players['p'+i].history.at(-1).won),[true,false,true,false]);
 assert.equal(room.continueVotes.length,4);
 for(const i of [0,1,2])await call(i,'continue',{value:true});assert.equal(room.phase,'decided');
 await call(3,'continue',{value:true});assert.equal(room.phase,'picking');assert.equal(room.target,6);
});

test('2v2: a surrender loses the duel for the team; leaving or running out of time loses the match for the team',async()=>{
 const reg=await registry(),call=caller(reg),room=await lobby(reg,call);
 for(let i=0;i<4;i++)await call(i,'open-ready');await draftRound(call,reg,room);
 await call(3,'surrender',{game:1});assert.deepEqual(room.score,[1,0]);
 await pickAll(call,room);await draftRound(call,reg,room);
 await report(reg,room,{type:'forfeit',seat:2,reason:'Disconnect allowance exhausted'});
 assert.equal(room.phase,'complete');assert.equal(room.winner,1,'seat 2 out of time: team 0 loses');
 assert.deepEqual([0,1,2,3].map(i=>reg.data.players['p'+i].wins),[0,1,0,1]);
 const reg2=await registry(),call2=caller(reg2),room2=await lobby(reg2,call2);
 for(let i=0;i<4;i++)await call2(i,'open-ready');await draftRound(call2,reg2,room2);
 await report(reg2,room2,{type:'game',winner:0});await pickAll(call2,room2);
 await call2(1,'leave');assert.equal(room2.phase,'complete');assert.equal(room2.winner,0);
});

// MatchHub with four seats.
const summary=(extra={})=>({kind:'draft',code:'ROOM4',phase:'duel',game:1,players:4,size:4,actor:0,...extra});
function hubSetup(){
 const reports=[],ctx=new FakeContext(),env={DRAFT:{idFromName:n=>n,get:()=>({fetch:async(_,init)=>{reports.push(JSON.parse(init.body));return {ok:true}}})}},hub=new MatchHub(ctx,env);
 const join=async seat=>{const socket=await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat),'X-Hub-Summary':JSON.stringify(summary())}}));const server=socket.webSocket.server,inbox=[];socket.webSocket.fake={fromServer:text=>inbox.push(JSON.parse(text)),closedByServer(){}};return {server,inbox,say:data=>hub.webSocketMessage(server,JSON.stringify(data)),last:t=>inbox.findLast(m=>m.t===t)};};
 return {hub,ctx,reports,join};
}
const response=(n,nextActor,turn=1)=>({t:'r',game:1,n,response:{type:1},nextActor,turn,h:7});

test('4-seat hub: answers pass between all four seats and everyone receives them',async()=>{
 const {hub,join}=hubSetup(),seats=[];for(let s=0;s<4;s++)seats.push(await join(s));
 assert.equal(hub.meta.size,4);assert.equal(hub.meta.turnLeft.length,4);assert.deepEqual(seats[0].last('presence')?.online??[true,true,true,true],[true,true,true,true]);
 await seats[0].say(response(0,1));await seats[1].say(response(1,2));await seats[2].say(response(2,3));
 assert.equal(seats[1].last('reject')?.count,undefined);
 await seats[1].say(response(3,0));assert.equal(seats[1].last('reject').count,3,'seat 1 does not hold the turn');
 await seats[3].say(response(3,0));assert.equal(hub.meta.count,4);
 for(const s of seats)assert.equal(s.last('ev').n,3);
});

test('4-seat hub: a result needs every online seat to agree; a split vote is a desync',async()=>{
 const {reports,join}=hubSetup(),seats=[];for(let s=0;s<4;s++)seats.push(await join(s));
 for(const s of [0,1,2])await seats[s].say({t:'result',game:1,n:0,winner:1});assert.equal(reports.length,0,'waits for the fourth seat');
 await seats[3].say({t:'result',game:1,n:0,winner:0});assert.equal(seats[0].last('desync').t,'desync');assert.equal(reports.length,0);
 for(const s of seats)await s.say({t:'result',game:1,n:0,winner:1});assert.deepEqual(reports.map(r=>[r.type,r.winner]),[['game',1]]);
});

test('4-seat hub: one player out of disconnect time is reported as that seat forfeiting',async()=>{
 const {hub,ctx,reports,join}=hubSetup(),seats=[];for(let s=0;s<4;s++)seats.push(await join(s));
 const t0=Date.now();ctx.now=()=>t0;seats[2].server.readyState=3;await hub.webSocketClose(seats[2].server,1000,'gone');
 assert.notEqual(hub.meta.offlineAt[2],null);
 const later=hub.meta.offlineAt[2]+DROP_GRACE+DISCONNECT_ALLOWANCE+1000;const realNow=Date.now;Date.now=()=>later;
 try{await hub.alarm();}finally{Date.now=realNow;}
 assert.deepEqual(reports.map(r=>[r.type,r.seat]),[['forfeit',2]]);
});
