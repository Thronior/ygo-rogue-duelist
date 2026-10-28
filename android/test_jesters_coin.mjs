// Jester's Coin: at the start of your Standby Phase you call a coin toss; your monsters gain 300 ATK/DEF on a right
// call and lose 300 on a wrong one, until your next Standby Phase.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {cursedParts} from './web/experience-ui.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const VORSE=14898066;
const script=execFileSync(python,['-B','-c',`
import sys;sys.path.insert(0,'.')
import passives
print(passives.script({'curses':[],'artifacts':['cursed_jesters_coin']}))`],{cwd:root}).toString();
const content=json('android/web/content.json');
const duel=await new MobileDuel(json('data/cards.json')).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
// The opponent plays weak Kuriboh, so the summoned Vorse Raider survives to later Standby Phases.
const deck=Array(40).fill(VORSE),KURIBOH=40640057;
let state=duel.start(deck,Array(40).fill(KURIBOH),8000,8000,5,3,[],[],script),summoned=false,calls=0;
const seen=[];
for(let guard=0;guard<400&&!state.finished&&calls<4;guard++){
 const m=duel.pending;let response=duel.auto();
 if(m.player===0&&m.type===M.SELECT_IDLECMD){
  if(!summoned&&m.summons.length){response={type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0};summoned=true}
 }
 // The core asks for the call as a Heads/Tails option at the start of the Standby Phase.
 if(m.player===0&&m.type===M.SELECT_OPTION&&duel.phase===2){
  calls++;
  const before=duel.query(0,L.MZONE).filter(Boolean).map(c=>[c.attack,c.defense]);
  state=duel.respond(response);
  const coin=duel.logs.find(x=>/coin|heads|tails/i.test(x));
  const after=duel.query(0,L.MZONE).filter(Boolean).map(c=>[c.attack,c.defense]);
  seen.push({before,after,log:coin});
  continue;
 }
 state=duel.respond(response);
}
duel.destroy();
assert.ok(calls>=2,`the coin is called at each of your Standby Phases (got ${calls})`);
for(const {after} of seen.filter(x=>x.after.length))for(const [atk,def] of after)assert.ok([[2200,1500],[1600,900]].some(([a,d])=>a===atk&&d===def),`a Vorse Raider is 1900/1200 ±300 after the call (got ${atk}/${def})`);
assert.ok(seen.some(x=>x.after.length),'a monster was on the field for at least one call');
const [good,bad]=cursedParts('cursed_jesters_coin',content.artifacts.cursed_jesters_coin?.[2]||'');
assert.match(good,/call it right/);assert.match(bad,/call it wrong/);
console.log(`PASS Jester's Coin: ${calls} Standby Phase calls, ATK/DEF ${seen.filter(x=>x.after.length).map(x=>x.after[0].join('/')).join(', ')}`);
