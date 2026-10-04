import assert from 'node:assert/strict';
import {CollectorRegistry} from '../multiplayer/cloudflare/collector.mjs';
import {validateDeck,deckCards,rankFor} from '../android/web/collector-rules.js';
import cards from '../multiplayer/cloudflare/collector-cards.json' with {type:'json'};
let init;const saved=new Map();const ctx={storage:{get:async k=>saved.get(k),put:async(k,v)=>saved.set(k,structuredClone(v)),setAlarm:async()=>{},list:async()=>saved,delete:async k=>saved.delete(k),transaction:async fn=>fn(ctx.storage)},blockConcurrencyWhile:fn=>{init=fn()}};
const service=new CollectorRegistry(ctx);await init;
const originals=cards.filter(c=>c.type==='Normal Monster').slice(0,20).map(c=>c.id);
const deck={main:originals.flatMap(id=>[id,id]),side:[],extra:[]};
assert.deepEqual(validateDeck(deck,deck.main,cards),[]);const sideCards=cards.filter(c=>c.type==='Normal Monster'&&!originals.includes(c.id)).slice(0,20).map(c=>c.id);const fusionCards=cards.filter(c=>c.data.type&64).slice(0,20).map(c=>c.id);const large={...deck,side:sideCards,extra:fusionCards};assert.ok(validateDeck(large,deckCards(large),cards).some(x=>x.startsWith('Side Deck')));assert.ok(validateDeck(large,deckCards(large),cards).some(x=>x.startsWith('Fusion Deck')));assert.equal(rankFor(50),'God');
const limited=cards.find(c=>c.name==='Pot of Greed').id;assert.ok(validateDeck({...deck,side:[limited,limited]},[...deck.main,limited,limited],cards).some(x=>x.includes('copy limit')));
const users=['a','b'].map(id=>({id,token:id.repeat(64),duelist:{id,name:id,character:0,pool:deck.main}}));
async function request(user,op,body={}){const response=await service.fetch(new Request('https://test/collector/'+op,{method:'POST',body:JSON.stringify({...user,...body})}));const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;}
for(const u of users){await request(u,'register');await request(u,'deck',{deck});}
let a=await request(users[0],'host'),b=await request(users[1],'join',{code:a.room.code});const code=a.room.code;
let room=service.data.rooms[code];
const before=structuredClone(service.data.players.a.pool);
a=await request(users[0],'surrender',{game:1});
assert.equal(a.room.phase,'siding');assert.deepEqual(a.room.score,[0,1]);assert.equal(a.record.status,'alive');assert.deepEqual(a.record.pool,before);assert.equal(a.room.chooser,0);assert.equal(a.room.games[0].reason,'Surrender');assert.equal(a.room.prizes,undefined);
await request(users[0],'surrender',{game:1});assert.deepEqual(room.score,[0,1]);assert.equal(room.games.length,1);
async function next(first){await request(users[0],'side',{deck});await request(users[1],'side',{deck});await request(users[room.chooser],'first',{first});assert.equal(room.phase,'duel');}
await next(1);
const stale=await service.fetch(new Request('https://test/collector/surrender',{method:'POST',body:JSON.stringify({...users[0],game:1})}));assert.equal(stale.status,400);assert.equal(room.phase,'duel');assert.deepEqual(room.score,[0,1]);
b=await request(users[1],'surrender',{game:2});assert.equal(b.record.status,'alive');assert.deepEqual(room.score,[1,1]);assert.equal(room.chooser,1);
await next(0);
a=await request(users[0],'surrender',{game:3});assert.equal(room.phase,'complete');assert.deepEqual(room.score,[1,2]);assert.equal(room.games.length,3);assert.equal(a.record.status,'eliminated');assert.equal(service.data.players.b.wins,1);assert.equal(a.record.pool.length,0);
const restored=new CollectorRegistry(ctx);await init;assert.deepEqual(restored.data.rooms[code].score,[1,2]);assert.equal(restored.data.players.b.wins,1);
console.log('PASS surrender concedes one duel; both seats; siding and next duel; duplicate/stale protection; elimination only at two losses; durable restore.');
