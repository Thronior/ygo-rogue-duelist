// Fusion Time in the real core: an Extra Deck Fusion Summon from field materials goes through (2026-11-03).
// The relic called c:SelectFusionMaterial, which doesn't exist, so tapping Special Summon did nothing.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts:['fusion_time'],challenge_level:0,character:0})],{cwd:root,encoding:'utf8'});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const LORD=id('Lord of D.'),RAG=id('Divine Dragon Ragnarok'),KING=id('King Dragun');
e.start(Array.from({length:40},(_,i)=>i%2?LORD:RAG),Array(40).fill(id('Mountain')),8000,8000,5,3,[KING],[],script);
let offered=false,summoned=false;
for(let i=0;i<900&&e.turn<=7&&e.pending&&!e.finished&&!summoned;i++){
 const m=e.pending;
 if(m.type===M.SELECT_IDLECMD&&m.player===0){
  const k=m.special_summons.findIndex(c=>c.code===KING);
  if(k>=0){offered=true;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SPECIAL_SUMMON,index:k});continue}
  if(offered){summoned=true;break}
  const s=m.summons.findIndex(c=>c.code===LORD||c.code===RAG);
  e.respond(s>=0?{type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:s}:{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});
 }else e.respond(e.auto());
}
const names=e.query(0,L.MZONE).filter(Boolean).map(c=>c.code);
assert(offered,'King Dragun is offered once both materials are on the field');
assert.deepEqual(e.errors,[],'no script errors');
assert(names.includes(KING)&&!names.includes(LORD),'King Dragun is on the field and Lord of D. went to the Graveyard');
assert(e.query(0,L.GRAVE).filter(Boolean).some(c=>c.code===LORD),'materials are sent to the Graveyard');
console.log('PASS Fusion Time: King Dragun Fusion Summons from field materials with no script errors');
process.exit(0);
