// Jester's Coin: at the start of your Standby Phase a coin is tossed (no call); your monsters gain 300 ATK/DEF on
// heads and lose 300 on tails, until your next Standby Phase.
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
let state=duel.start(deck,Array(40).fill(KURIBOH),8000,8000,5,3,[],[],script,0),summoned=false,options=0,turn=-1;
const seen=[];
for(let guard=0;guard<600&&!state.finished&&seen.length<4;guard++){
 const m=duel.pending;let response=duel.auto();
 if(m.player===0&&m.type===M.SELECT_OPTION&&duel.phase===2)options++;
 if(m.player===0&&m.type===M.SELECT_IDLECMD){
  if(!summoned&&m.summons.length){response={type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0};summoned=true}
  // Once per turn, in your Main Phase 1, after that Standby Phase's toss.
  if(duel.turn!==turn&&duel.phase===4&&duel.player===0&&duel.jesterCall){turn=duel.turn;seen.push({call:duel.jesterCall,stats:duel.query(0,L.MZONE).filter(Boolean).map(c=>[c.attack,c.defense])})}
 }
 state=duel.respond(response);
}
duel.destroy();
assert.equal(options,0,'no Heads/Tails call: the coin is just tossed');
assert.ok(seen.length>=2,`the coin is tossed at each of your Standby Phases (got ${seen.length})`);
for(const {call,stats} of seen)for(const [atk,def] of stats)assert.deepEqual([atk,def],call>0?[2200,1500]:[1600,900],'heads +300, tails -300, matching the forecast');
assert.ok(seen.some(x=>x.stats.length),'a monster was on the field for at least one toss');
const [good,bad]=cursedParts('cursed_jesters_coin',content.artifacts.cursed_jesters_coin?.[2]||'',content.artifactInfo.cursed_jesters_coin?.parts);
assert.match(good+bad,/Heads/);assert.match(good+bad,/Tails/);
console.log(`PASS Jester's Coin: ${seen.length} Standby Phase tosses without a call, ${seen.map(x=>x.call>0?'heads':'tails').join(', ')}`);
