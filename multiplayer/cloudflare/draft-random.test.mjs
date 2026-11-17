// Random Pack and second loadouts in Draft Duels (2026-11-16): the Worker deals seeds, never randomized card data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DraftRegistry} from './collector.mjs';
import {draftOffer,RANDOM_PACK,DRAFT_PACKS} from './draft-pool.mjs';
import {randomBlock} from '../../android/web/collector-rules.js';
import catalog from './draft-catalog.json' with {type:'json'};
import cards from './collector-cards.json' with {type:'json'};
const byId=new Map(cards.map(c=>[c.id,c]));
function deckOf(pool,n){const counts=new Map(),main=[];for(const id of pool){const c=byId.get(id);if(!c||c.data.type&64)continue;const k=counts.get(c.name)||0;if(k<3&&main.length<n){counts.set(c.name,k+1);main.push(id);}}return main;}
async function registry(){const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{}};storage.transaction=fn=>fn(storage);let ready;const r=new DraftRegistry({storage,blockConcurrencyWhile:fn=>{ready=fn();}});await ready;return r;}
function caller(reg){return async(i,op,body={},status=200)=>{const res=await reg.fetch(new Request('https://test/v2/draft/'+op,{method:'POST',body:JSON.stringify({id:'p'+i,token:'token-'+i+'-'.repeat(40),net:3,draft:4,version:'0.2.36',...body})}));const data=await res.json();assert.equal(res.status,status,op+' '+JSON.stringify(data).slice(0,300));return data;};}
const block=(seat,k)=>Array.from({length:9},(_,i)=>randomBlock(seat,k)+i);

test('Random Pack joins the pack rotation only when asked',()=>{
 let seen=0;for(let i=0;i<400;i++){const o=draftOffer(Math.random,{randomPack:true});assert.equal(new Set(o.packs).size,3);if(o.packs.includes(RANDOM_PACK))seen++;}
 assert(seen>0);for(let i=0;i<200;i++)assert(!draftOffer().packs.includes(RANDOM_PACK));assert(!DRAFT_PACKS.includes(RANDOM_PACK));
});

test('second loadout: alternate signatures and packs; ignored for draft:3 clients',async()=>{
 const reg=await registry(),call=caller(reg),yugi=catalog.characters.find(c=>c.id===0);
 await call(0,'register',{duelist:{id:'p0',name:'A',character:0,variant:1}});
 const p0=reg.data.players.p0;assert.equal(p0.variant,1);assert.deepEqual(p0.pool.slice(0,yugi.alternate.signatures.length),yugi.alternate.signatures);assert.deepEqual(p0.packIds,yugi.alternate.starting_packs);
 await call(1,'register',{duelist:{id:'p1',name:'B',character:0,variant:1},draft:3});
 const p1=reg.data.players.p1;assert(!p1.variant);assert.deepEqual(p1.pool.slice(0,yugi.signatures.length),yugi.signatures);
});

test('Randomizer loadout and a Random Pack pick: seeds, seat blocks and deck checks',async()=>{
 const reg=await registry(),call=caller(reg);
 await call(0,'register',{duelist:{id:'p0',name:'Hat',character:37,variant:1}});
 await call(1,'register',{duelist:{id:'p1',name:'Plain',character:2}});
 const p0=reg.data.players.p0,p1=reg.data.players.p1;
 assert.equal(p0.pool.length,0);assert.equal(p0.randomBoosters.length,4);assert(p0.randomBoosters.every(Number.isInteger));assert.deepEqual(p0.packIds,Array(4).fill(RANDOM_PACK));
 const host=await call(0,'host');assert(host.room.randomPack);
 assert.match((await call(1,'join',{code:host.room.code,draft:3},400)).error,/Random Packs/);
 const joined=await call(1,'join',{code:host.room.code});assert.deepEqual(joined.room.players[0].random,p0.randomBoosters,'both clients see the seeds');
 await call(0,'open-ready');await call(1,'open-ready');const room=reg.data.rooms[host.room.code];assert.equal(room.phase,'drafting');
 const mine=[...block(0,0),...block(0,1),...block(0,2)].slice(0,20);
 assert.match((await call(0,'deck',{deck:{main:[...mine.slice(0,19),randomBlock(0,4)],side:[],extra:[]}},400)).error,/randomized/,'a fifth booster block is not owned');
 assert.match((await call(0,'deck',{deck:{main:[...mine.slice(0,19),randomBlock(1,0)],side:[],extra:[]}},400)).error,/randomized/,'the other seat\'s block');
 assert.match((await call(0,'deck',{deck:{main:[...mine.slice(0,19),mine[0]],side:[],extra:[]}},400)).error,/randomized/,'one copy each');
 await call(0,'deck',{deck:{main:mine,side:[],extra:[block(0,3)[0]]}});await call(0,'ready');
 await call(1,'deck',{deck:{main:deckOf(p1.pool,20),side:[],extra:[]}});await call(1,'ready');assert.equal(room.phase,'duel');
 for(let i=0;i<2;i++)await call(i,'result',{number:room.events.length,winner:0});
 assert.equal(room.phase,'picking');
 room.offer.packs=[RANDOM_PACK,DRAFT_PACKS[0],DRAFT_PACKS[1]];const before=p1.pool.length;
 await call(1,'pick',{relic:0,pack:0});await call(0,'pick',{relic:1,pack:1});
 assert.equal(room.phase,'drafting');assert.equal(p1.randomBoosters.length,2);assert.equal(p1.pool.length,before,'no card data on the Worker');
 assert.deepEqual(p1.packs,[[],[]]);assert.deepEqual(p1.packIds,[RANDOM_PACK,RANDOM_PACK]);
 const deck=[...deckOf(p1.pool,21),...block(1,0).slice(0,9)];
 await call(1,'deck',{deck:{main:deck,side:[],extra:[]}});
 assert.match((await call(1,'deck',{deck:{main:[...deck,randomBlock(1,2)],side:[],extra:[]}},400)).error,/randomized/);
});

test('Copycat standard and both Dueling Engine loadouts are refused (2026-11-17)',async()=>{
 const reg=await registry(),call=caller(reg);
 for(const [character,variant] of [[37,0],[38,0],[38,1]])assert.match((await call(0,'register',{duelist:{id:'p0',name:'X',character,variant}},400)).error,/not available in Draft Duels/,`${character}/${variant}`);
 assert.match((await call(0,'register',{duelist:{id:'p0',name:'X',character:37,variant:1},draft:3},400)).error,/not available/,'draft:3 clients cannot play the Randomizer, so Copycat is refused');
 await call(0,'register',{duelist:{id:'p0',name:'Hat',character:37,variant:1}});
});
