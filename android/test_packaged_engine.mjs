// Packaged builds carry only the card scripts and engine data a duel can reach (tools/package_assets.py).
// Duels must play out exactly as they do with the complete source files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel} from './web/duel.js';
import {shuffleCPUDeck} from './web/cpu-deck-model.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^\uFEFF/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const pruned=JSON.parse(execFileSync(python,['-B','-c',`
import sys,json;sys.path.insert(0,'tools')
from package_assets import pruned_engine_files
scripts,data,keep=pruned_engine_files('android/web')
print(json.dumps({'scripts':scripts,'data':data}))`],{cwd:root,maxBuffer:256*1024*1024}).toString());

const content=json('android/web/content.json'),cards=[...content.cards,...content.tokenCards];
const full=[json('android/web/engine-data.json'),json('android/web/scripts.json')];
const small=[pruned.data,pruned.scripts];

// Nothing the game can put into a duel lost its engine data or its script.
for(const card of cards){
 assert.ok(pruned.data[card.id],`${card.name} (${card.id}) keeps its engine data`);
 if(full[1][`c${card.id}.lua`])assert.ok(pruned.scripts[`c${card.id}.lua`],`${card.name} (${card.id}) keeps its script`);
}
for(const name of Object.keys(full[1]))if(!/^c\d+\.lua$/.test(name))assert.ok(pruned.scripts[name],`utility script ${name} is kept`);

// The same CPU duels, decision for decision, with both resource sets.
const decks=Object.values(content.cpuDecks).flat().filter(d=>d?.main?.length);
function play(resources,a,b,seed){
 return new MobileDuel(cards).init(resources).then(duel=>{
  const main=[a,b].map((deck,seat)=>shuffleCPUDeck(deck.main,seed,seat));
  let state=duel.start(main[0],main[1],8000,8000,5,seed,a.extra||[],b.extra||[],'-- SHADOW_RUN_RNG 2\nif Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end');
  const responses=[];
  for(let n=0;n<4000&&!state.finished;n++){const r=duel.auto();responses.push(JSON.stringify(r,(_,v)=>typeof v==='bigint'?String(v):v));state=duel.respond(r)}
  const result={winner:state.finished?.player??null,turn:state.turn,lp:[...state.lp],errors:duel.errors.length,responses};
  duel.destroy();return result;
 });
}
let decisions=0;const games=16;
for(let i=0;i<games;i++){
 const a=decks[(i*7)%decks.length],b=decks[(i*13+3)%decks.length],seed=7000+i;
 const expected=await play(full,a,b,seed),actual=await play(small,a,b,seed);
 assert.deepEqual(actual,expected,`duel ${i} plays out identically`);
 decisions+=expected.responses.length;
}
console.log(`PASS packaged engine: ${Object.keys(pruned.scripts).length}/${Object.keys(full[1]).length} scripts, ${Object.keys(pruned.data).length}/${Object.keys(full[0]).length} cards; ${games} CPU duels and ${decisions} decisions identical`);
