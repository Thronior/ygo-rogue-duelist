// All duel engines share one parsed copy of the duel files and one rules core (engine.js).
// Two duels running side by side on the shared core must play exactly as they do alone.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {MobileDuel} from './web/duel.js';
import {loadDuelResources,loadEngineData} from './web/engine.js';
import {shuffleCPUDeck} from './web/cpu-deck-model.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const text=path=>fs.readFileSync(root+path,'utf8');
const content=JSON.parse(text('android/web/content.json')),cards=[...content.cards,...content.tokenCards];

// The duel files are fetched and parsed once, however many engines start.
const fetched=[];
globalThis.fetch=async url=>{fetched.push(String(url));const body=text('android/web/'+url);return {ok:true,json:async()=>JSON.parse(body)}};
const [first,second]=await Promise.all([loadDuelResources(),loadDuelResources()]);
assert.equal(first[0],second[0]);assert.equal(first[1],second[1]);
assert.equal(await loadEngineData(),first[0]);
assert.deepEqual(fetched.sort(),['engine-data.json','scripts.json'],'each duel file is fetched once');

const decks=Object.values(content.cpuDecks).flat().filter(d=>d?.main?.length);
const setup=(a,b,seed)=>[...[a,b].map((deck,seat)=>shuffleCPUDeck(deck.main,seed,seat)),8000,8000,5,seed,a.extra||[],b.extra||[],'-- SHADOW_RUN_RNG 2'];
const record=duel=>JSON.stringify({winner:duel.finished?.player??null,turn:duel.turn,lp:duel.lp,log:duel.replayRecord.responses},(_,v)=>typeof v==='bigint'?String(v):v);
async function alone(args){const duel=await new MobileDuel(cards).init();let state=duel.start(...args);for(let n=0;n<4000&&!state.finished;n++)state=duel.respond(duel.auto());const result=record(duel);duel.destroy();return result}

let pairs=0;
for(let i=0;i<6;i++){
 const a=setup(decks[(i*5)%decks.length],decks[(i*11+2)%decks.length],900+i),b=setup(decks[(i*3+1)%decks.length],decks[(i*7+4)%decks.length],1900+i);
 const expected=[await alone(a),await alone(b)];
 const engines=[await new MobileDuel(cards).init(),await new MobileDuel(cards).init()];
 assert.equal(engines[0].core,engines[1].core,'engines share one rules core');
 const states=[engines[0].start(...a),engines[1].start(...b)];
 for(let n=0;n<8000&&!(states[0].finished&&states[1].finished);n++){const k=n%2;if(!states[k].finished)states[k]=engines[k].respond(engines[k].auto())}
 assert.deepEqual(engines.map(record),expected,`pair ${i}: interleaved duels match their solo runs`);
 engines.forEach(e=>e.destroy());pairs++;
}
console.log(`PASS shared engine: duel files fetched once; ${pairs} pairs of interleaved duels on one core match their solo runs`);
