// A monster in hand shows "On the field" stats: the forecast must match the stats the core gives it once summoned,
// for type, attribute, generic and cursed stat relics (Discord, 2026-10-28).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
// Vorse Raider: Level 4 DARK Beast-Warrior Effect Monster, 1900/1200.
const VORSE=14898066;
const runs={
 none:[],dark:['dark'],fang:['fang'],blade:['blade'],sword:['sword'],menagerie:['menagerie'],solo:['solo'],
 cracked:['cursed_cracked_sword'],commoners:['cursed_commoners_chain'],silence:['cursed_iron_silence'],
 brittle:['cursed_brittle_armor'],nocturnal:['cursed_nocturnal_guard'],tyrant:['cursed_solitary_tyrant'],
 stacked:['dark','fang','cursed_cracked_sword','sword'],
};
const scripts=JSON.parse(execFileSync(python,['-B','-c',`
import sys,json;sys.path.insert(0,'.')
import passives
runs=json.loads(sys.stdin.read())
print(json.dumps({k:passives.script({'curses':[],'artifacts':v}) for k,v in runs.items()}))`],{cwd:root,input:JSON.stringify(runs)}).toString());

const duel=await new MobileDuel(json('data/cards.json')).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
const deck=Array(40).fill(VORSE);
for(const key of Object.keys(runs)){
 let state=duel.start(deck,deck,8000,8000,5,3,[],[],scripts[key]),forecast=null;
 for(let guard=0;guard<60&&!state.finished;guard++){
  const m=duel.pending;
  if(m.type===M.SELECT_IDLECMD&&m.player===0&&!forecast){
   const hand=duel.query(0,L.HAND),seq=hand.findIndex(c=>c?.code===VORSE),c={...hand[seq],controller:0,location:L.HAND,sequence:seq};
   const smart=smartContext(duel,0,L);
   forecast={atk:smart.projectedAttack(c),defense:smart.projectedDefense(c)};
   state=duel.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:m.summons.findIndex(x=>x.code===VORSE)});continue;
  }
  if(forecast&&m.type===M.SELECT_IDLECMD&&m.player===0)break;
  state=duel.respond(duel.auto());
 }
 const live=duel.query(0,L.MZONE).find(c=>c?.code===VORSE);
 assert.ok(forecast&&live,`${key}: Vorse Raider was summoned`);
 assert.deepEqual(forecast,{atk:live.attack,defense:live.defense},`${key}: hand forecast matches the summoned stats`);
}
duel.destroy();
console.log(`PASS hand "On the field" stats match the core for ${Object.keys(runs).length} relic setups`);
