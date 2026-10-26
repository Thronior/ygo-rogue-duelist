// The EDOPro adapter must answer exactly as the AI does inside the bundled engine when it is
// given only what a native host sends: raw core messages and raw zone queries.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R} from './web/duel.js';
import {shuffleCPUDeck} from './web/cpu-deck-model.js';
import {EdoproAI,QUERY_LOCATIONS,QUERY_FLAGS} from './web/edopro-adapter.js';
import {encodeNativeResponse} from './web/vendor/package/dist/index.js';

const root=new URL('../',import.meta.url);
const json=path=>JSON.parse(fs.readFileSync(new URL(path,root),'utf8').replace(/^\uFEFF/,''));
const ydk=path=>{const deck={main:[],extra:[]};let section=null;for(const line of fs.readFileSync(new URL(path,root),'utf8').split(/\r?\n/).map(x=>x.trim())){if(line==='#main'||line==='#extra')section=line.slice(1);else if(line.startsWith('!'))section=null;else if(section&&/^\d+$/.test(line))deck[section].push(Number(line));}return deck};

const cards=json('data/cards.json'),engineData=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const reference=await new MobileDuel(cards).init([engineData,scripts]);
const duels=[
 ['data/decks/bonz-tier-1.ydk','data/decks/espa-roba-tier-1.ydk',11,1],
 ['data/decks/espa-roba-tier-1.ydk','data/decks/bonz-tier-1.ydk',12,0],
 ['data/decks/lumis-and-umbra-tier-1.ydk','data/decks/archfiends-darkbishop-tier-3.ydk',13,1],
 ['data/decks/archfiends-darkbishop-tier-3.ydk','data/decks/lumis-and-umbra-tier-1.ydk',14,0],
];
let total=0,passes=0,transcript=null;
for(const [fileA,fileB,seed,seat] of duels){
 const decks=[ydk(fileA),ydk(fileB)].map((deck,p)=>({main:shuffleCPUDeck(deck.main,seed,p),extra:deck.extra}));
 const setup={seat,deck:decks[seat],lp:[8000,8000],seed},ai=new EdoproAI({cards,engineData,...setup});
 // The first duel is replayed through the stdin/stdout bridge afterwards.
 const record=transcript?null:transcript={setup,requests:[]};
 const ask=(messages,zones)=>{const response=ai.decide(messages,zones);record?.requests.push({decide:{messages,zones},response});return response};
 const zones=()=>{const out={};for(const p of [0,1])for(const location of QUERY_LOCATIONS)out[p+','+location]=reference.core.duelQueryLocation(reference.h,{controller:p,location,flags:QUERY_FLAGS}).wire;return out};
 let batch=[],decisions=0;
 const forward=reference.onMessage.bind(reference);
 reference.onMessage=m=>{
  forward(m);batch.push(m.wire);
  // The bundled engine passes these itself; a native host asks the adapter.
  if(m.type===M.SELECT_CHAIN&&m.player===seat&&!m.forced&&!m.selects.length){
   assert.deepEqual(ask(batch,zones()),encodeNativeResponse({type:R.SELECT_CHAIN,index:null}));batch=[];passes++;
  }
 };
 let state=reference.start(decks[0].main,decks[1].main,8000,8000,5,seed,decks[0].extra,decks[1].extra);
 while(!state.finished){
  const prompt=reference.pending,response=reference.auto();
  if(prompt.player===seat){
   const answer=ask(batch,zones());batch=[];decisions++;
   assert.deepEqual(answer,encodeNativeResponse(response),`${fileA} vs ${fileB}, seed ${seed}, turn ${reference.turn}: adapter chose differently`);
  }
  state=reference.respond(response);
 }
 ai.observe(batch,zones());
 assert.deepEqual(ai.duel.finished,reference.finished,'adapter saw the same result');
 assert.equal(ai.duel.turn,reference.turn);assert.deepEqual(ai.duel.lp,reference.lp);
 assert.ok(decisions>10,'duel reached real decisions');
 total+=decisions;reference.onMessage=forward;reference.destroy();
}
// Same duel through tools/edopro_ai_bridge.mjs, as a native host would run it.
const bridge=spawn(process.execPath,[fileURLToPath(new URL('tools/edopro_ai_bridge.mjs',root))],{stdio:['pipe','pipe','inherit']});
const lines=readline.createInterface({input:bridge.stdout})[Symbol.asyncIterator]();
const call=async request=>{bridge.stdin.write(JSON.stringify(request)+'\n');return JSON.parse((await lines.next()).value)};
assert.deepEqual(await call({start:transcript.setup}),{ok:true});
for(const {decide,response} of transcript.requests)assert.deepEqual(await call({decide}),{response});
assert.match((await call({decide:{messages:[],zones:{}}})).error,/ending with a prompt for player/);
bridge.stdin.end();
console.log(`PASS EDOPro bridge replayed ${transcript.requests.length} requests from the first duel`);
console.log(`PASS EDOPro adapter matched the bundled AI on ${total} decisions and ${passes} automatic chain passes across ${duels.length} duels`);
