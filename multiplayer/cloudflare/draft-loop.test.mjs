import test from 'node:test';
import assert from 'node:assert/strict';
import {DraftRegistry} from './collector.mjs';
import {draftPool,draftOffer,minDeckFor,buildable,DRAFT_PACKS,DRAFT_RELICS} from './draft-pool.mjs';
import catalog from './draft-catalog.json' with {type:'json'};
import cards from './collector-cards.json' with {type:'json'};
const byId=new Map(cards.map(c=>[c.id,c]));
// A legal Main Deck of n cards from the pool: three copies per name at most, no Fusion Monsters.
function deckOf(pool,n){const counts=new Map(),main=[];for(const id of pool){const c=byId.get(id);if(c.data.type&64)continue;const k=counts.get(c.name)||0;if(k<3&&main.length<n){counts.set(c.name,k+1);main.push(id);}}assert.equal(main.length,n);return {main,side:[],extra:[]};}
async function registry(){const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};storage.transaction=fn=>fn(storage);let ready;const r=new DraftRegistry({storage,blockConcurrencyWhile:fn=>{ready=fn();}});await ready;return r;}
function caller(reg){return async(i,op,body={},status=200)=>{const res=await reg.fetch(new Request('https://test/v2/draft/'+op,{method:'POST',body:JSON.stringify({id:'p'+i,token:'token-'+i+'-'.repeat(40),net:3,draft:2,version:'0.2.31',...body})}));const data=await res.json();assert.equal(res.status,status,op+' '+JSON.stringify(data).slice(0,300));return data;};}
async function start(reg,call){
 for(let i=0;i<2;i++)await call(i,'register',{duelist:{id:'p'+i,name:'Player '+i,character:i===0?0:2}});
 const host=await call(0,'host');await call(1,'join',{code:host.room.code});await call(0,'open-ready');await call(1,'open-ready');
 return reg.data.rooms[host.room.code];
}
const play=async(call,room,winner)=>{await call(0,'result',{number:room.events.length,winner});await call(1,'result',{number:room.events.length,winner});};
const draftRound=async(call,reg,room,size)=>{for(let i=0;i<2;i++){await call(i,'deck',{deck:deckOf(reg.data.players['p'+i].pool,size)});await call(i,'ready');}};

test('draft loop opening: four starting boosters once, buildable to 20 for every duelist',()=>{
 for(const c of catalog.characters){const result=draftPool(c.id,undefined,true);assert.equal(result.packs.length,c.starting_packs?.length||4,c.name);assert.deepEqual(result.pool.slice(0,c.signatures.length),c.signatures);assert(buildable(result.pool)>=20,c.name);}
 assert.deepEqual([0,1,2,3,9].map(minDeckFor),[20,30,40,40,40]);
});

test('Draft Screen offers three different relics and three different duelist packs',()=>{
 assert(DRAFT_RELICS.length>100&&DRAFT_PACKS.length>=30);assert(DRAFT_PACKS.every(id=>id.startsWith('DRAFT-')));
 for(let i=0;i<50;i++){const o=draftOffer();assert.equal(new Set(o.relics).size,3);assert.equal(new Set(o.packs).size,3);assert(o.relics.every(k=>DRAFT_RELICS.includes(k)));assert(o.packs.every(id=>DRAFT_PACKS.includes(id)));}
});

test('loop: loser drafts first, picks are exclusive, boosters join the pool, minimum grows 20 → 30 → 40',async()=>{
 const reg=await registry(),call=caller(reg),room=await start(reg,call);
 assert(room.loop);assert.equal(room.phase,'drafting');assert.equal(room.minDeck,20);assert.equal(reg.data.players.p0.packs.length,4);
 assert.match((await call(0,'deck',{deck:deckOf(reg.data.players.p0.pool,19)},400)).error,/20–60/);
 await draftRound(call,reg,room,20);assert.equal(room.phase,'duel');assert.equal(room.game,1);
 await play(call,room,0);
 assert.equal(room.phase,'picking');assert.equal(room.round,1);assert.deepEqual(room.pickOrder,[1,0]);assert.equal(room.nextFirst,1);
 assert.match((await call(0,'pick',{relic:0,pack:0},400)).error,/Wait for your opponent/);
 const before=reg.data.players.p1.pool.length,offer=structuredClone(room.offer);
 await call(1,'pick',{relic:0,pack:2});
 assert.match((await call(0,'pick',{relic:0,pack:1},400)).error,/still available/);
 assert.match((await call(0,'pick',{relic:1,pack:2},400)).error,/still available/);
 await call(0,'pick',{relic:2,pack:0});
 assert.equal(room.phase,'drafting');assert.equal(room.minDeck,30);assert.deepEqual(room.relics,[[offer.relics[2]],[offer.relics[0]]]);
 const p1=reg.data.players.p1;assert.equal(p1.pool.length,before+18);assert.deepEqual(p1.packIds,[offer.packs[2],offer.packs[2]]);assert.deepEqual(p1.pool.slice(-18),p1.packs.flat());
 assert.match((await call(1,'deck',{deck:deckOf(p1.pool,29)},400)).error,/30–60/);
 await draftRound(call,reg,room,30);assert.equal(room.phase,'duel');assert.equal(room.game,2);assert.equal(room.first,1,'the loser of duel 1 goes first');assert.equal(room.events.length,0);
 // A draw: whoever picked second last time picks first.
 await play(call,room,2);assert.deepEqual(room.pickOrder,[0,1]);assert.deepEqual(room.score,[1,0]);
 await call(0,'pick',{relic:0,pack:0});await call(1,'pick',{relic:1,pack:1});assert.equal(room.minDeck,40);assert.equal(room.relics[0].length,2);
 await draftRound(call,reg,room,40);assert.equal(room.game,3);
 await play(call,room,1);await call(0,'pick',{relic:0,pack:0});await call(1,'pick',{relic:1,pack:1});assert.equal(room.minDeck,40,'40 is the final minimum');
});

test('loop: first to 3 wins the match; both continuing raises the goal by 3, ending keeps the result',async()=>{
 const reg=await registry(),call=caller(reg),room=await start(reg,call);
 await draftRound(call,reg,room,20);
 const duel=async winner=>{await play(call,room,winner);if(room.phase==='picking'){const [a,b]=room.pickOrder;await call(a,'pick',{relic:0,pack:0});await call(b,'pick',{relic:1,pack:1});await draftRound(call,reg,room,room.minDeck);}};
 await duel(0);await duel(1);await duel(0);assert.equal(room.phase,'duel');await duel(0);
 assert.equal(room.phase,'decided');assert.equal(room.winner,0);assert.deepEqual(room.score,[3,1]);assert.equal(reg.data.players.p0.wins,1);assert.equal(reg.data.players.p0.history.at(-1).won,true);
 await call(0,'continue',{value:true});assert.equal(room.phase,'decided');
 await call(1,'continue',{value:true});assert.equal(room.phase,'picking');assert.equal(room.target,6);assert.equal(room.winner,null);assert.deepEqual(room.pickOrder,[1,0],'the loser of the last duel picks first');
 const [a,b]=room.pickOrder;await call(a,'pick',{relic:0,pack:0});await call(b,'pick',{relic:1,pack:1});await draftRound(call,reg,room,40);
 await duel(1);await duel(1);await duel(1);await duel(1);await duel(1);
 assert.equal(room.phase,'decided');assert.equal(room.winner,1);assert.deepEqual(room.score,[3,6]);assert.equal(reg.data.players.p1.wins,1);
 await call(0,'continue',{value:false});assert.equal(room.phase,'complete');assert.equal(room.winner,1,'ending keeps the decided winner');
 await call(0,'host');
});

test('loop: leaving after the first duel gives the opponent the match; before it, it cancels',async()=>{
 const reg=await registry(),call=caller(reg),room=await start(reg,call);
 await draftRound(call,reg,room,20);await play(call,room,1);assert.equal(room.phase,'picking');
 await call(1,'leave');assert.equal(room.phase,'complete');assert.equal(room.winner,0);assert.equal(reg.data.players.p0.wins,1);
 const second=await registry(),c2=caller(second),r2=await start(second,c2);await c2(0,'leave');assert(r2.cancelled);
});

test('older clients keep best of three with eight boosters',async()=>{
 const reg=await registry(),call=async(i,op,body={})=>{const res=await reg.fetch(new Request('https://test/v2/draft/'+op,{method:'POST',body:JSON.stringify({id:'p'+i,token:'token-'+i+'-'.repeat(40),net:3,version:'0.2.30',...body})}));return res.json();};
 for(let i=0;i<2;i++)await call(i,'register',{duelist:{id:'p'+i,name:'Old '+i,character:1}});
 assert.equal(reg.data.players.p0.packs.length,8);assert(!reg.data.players.p0.loop);
 const host=await call(0,'host');assert(!host.room.loop);
 const loopReg=await registry(),lc=caller(loopReg);await lc(0,'register',{duelist:{id:'p0',name:'New',character:1}});
});
