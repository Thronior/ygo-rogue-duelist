// DNA Rewrite makes every monster the chosen Type, in hand too, so the "On the field" forecast of a monster in hand
// counts Type relics for the new Type (Discord, Nori, 2026-11-23: Dragon Crest showed only on printed Dragons).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
// Vorse Raider: Level 4 DARK Beast-Warrior, 1900/1200.
const VORSE=14898066;
const script=execFileSync(python,['-B','-c',`
import sys;sys.path.insert(0,'.')
import passives
print(passives.script({'curses':[],'artifacts':['dragon','dna_rewrite'],'monster_type':'Dragon'},telemetry=False))`],{cwd:root}).toString();

const duel=await new MobileDuel(json('data/cards.json')).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
const deck=Array(40).fill(VORSE);
let state=duel.start(deck,deck,8000,8000,5,3,[],[],script),forecast=null;
for(let guard=0;guard<60&&!state.finished;guard++){
 const m=duel.pending;
 if(m.type===M.SELECT_IDLECMD&&m.player===0&&!forecast){
  const hand=duel.query(0,L.HAND),seq=hand.findIndex(c=>c?.code===VORSE),c={...hand[seq],controller:0,location:L.HAND,sequence:seq};
  forecast=smartContext(duel,0,L).projectedAttack(c);
  state=duel.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:m.summons.findIndex(x=>x.code===VORSE)});continue;
 }
 if(forecast!==null&&m.type===M.SELECT_IDLECMD&&m.player===0)break;
 state=duel.respond(duel.auto());
}
const live=duel.query(0,L.MZONE).find(c=>c?.code===VORSE);
assert.ok(live,'Vorse Raider was summoned');
assert.ok(live.attack>1900,'the core gives the rewritten Dragon the Dragon relic bonus');
assert.equal(forecast,live.attack,'the hand forecast matches');
duel.destroy();
console.log('PASS DNA Rewrite: a monster in hand is forecast with relics for its new Type');
