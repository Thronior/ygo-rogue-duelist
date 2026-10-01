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
let room=service.data.rooms[code];room.seen=[Date.now()-14000,Date.now()];service.tick(room);assert.deepEqual(room.disconnectLeft,[300000,300000]);
await request(users[0],'poll');room.seen[0]=Date.now()-25000;service.tick(room);assert.ok(room.disconnectLeft[0]<=275000);const left=room.disconnectLeft[0];await request(users[0],'poll');assert.ok(room.disconnectLeft[0]<=left&&room.disconnectLeft[0]>left-100);room.seen[0]=Date.now()-25000;service.tick(room);assert.ok(room.disconnectLeft[0]<=left-25000);await request(users[0],'poll');
room.actor=0;room.clockAt=Date.now()-10000;room.seen=[Date.now(),Date.now()];const before=room.turnLeft[0];service.tick(room);assert.ok(room.turnLeft[0]<=before-10000);
room.seen[1]=Date.now()-30000;room.clockAt=Date.now()-1000;const paused=room.turnLeft[0];service.tick(room);assert.equal(room.turnLeft[0],paused);await request(users[1],'poll');
for(let game=1;game<=2;game++){
 await request(users[0],'result',{number:0,winner:0});b=await request(users[1],'result',{number:0,winner:0});
 if(game===1){assert.equal(b.room.phase,'siding');assert.equal(b.room.chooser,1);await request(users[0],'side',{deck});await request(users[1],'side',{deck});b=await request(users[1],'first',{first:1});assert.equal(b.room.phase,'duel');assert.equal(b.room.first,1);assert.equal(b.room.turnLeft[0],180000);}
}
assert.equal(b.record.status,'eliminated');assert.equal(b.record.pool.length,0);a=await request(users[0],'prizes',{indices:[0,1,2,3,4]});assert.equal(a.record.wins,1);assert.equal(a.record.pool.length,45);a=await request(users[0],'prizes',{indices:[0,1,2,3,4]});assert.equal(a.record.pool.length,45);
const leaders=await request({},'leaderboard');assert.equal(leaders.leaderboard.length,1);assert.equal(leaders.leaderboard[0].name,'a');
const restored=new CollectorRegistry(ctx);await init;assert.equal(restored.data.players.a.wins,1);assert.equal(restored.data.players.b.status,'eliminated');
const fake={phase:'duel',players:['a','b'],seen:[Date.now(),Date.now()],actor:0,clockAt:Date.now()-200000,turnLeft:[1,180000],disconnectLeft:[300000,300000],charged:[0,0],score:[0,0],startDecks:[deck,deck],code:'timeout'};service.tick(fake);assert.equal(fake.phase,'complete');assert.equal(fake.reason,'Turn timer expired');
console.log('Collector rules, match, prizes, cumulative disconnect, turn clocks and durable restore passed.');
