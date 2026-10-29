// Curses and Relic Seal: the "On the field" forecast for a monster in hand must match the stats the core gives it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
// Each stat curse at three challenge levels (curse strength scales), plus Relic Seal over a stat relic, on Vorse
// Raider and a Normal Level 4 Dragon (2026-10-29: "the stats in hand still don't calculate things right").
const cases=JSON.parse(execFileSync(python,['-B','-c',`
import sys,json;sys.path.insert(0,'.')
import passives,campaign as g
out=[]
for curse,arts in [('frailty',[]),('hunger',[]),('brittle',[]),('mirror_stats',[]),('relic_seal',['dragon']),('relic_seal',['sword']),('',['dragon'])]:
 for level in (0,3,6):
  for name in ('Vorse Raider','Koumori Dragon'):
   run={'curses':[curse] if curse else [],'artifacts':arts,'challenge_level':level,'character':0}
   out.append(dict(key=f"{curse or 'no curse'}+{'/'.join(arts) or '-'} LVL {level}",card=g.BY_NAME[name]['id'],name=name,script=passives.script(run)))
print(json.dumps(out))`],{cwd:root,maxBuffer:1<<28}).toString());

// The game's own card list: the forecast reads Types and Attributes from it.
const meta=json('android/web/content.json');
const duel=await new MobileDuel([...meta.cards,...(meta.tokenCards||[])]).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
const POLY=24094653,mismatches=[];let checked=0;
for(const {key,card,name,script} of cases){
 // The opponent never summons; you Normal Summon a copy on each of your turns, so field-count relics get several states.
 let state=duel.start(Array(40).fill(card),Array(40).fill(POLY),8000,8000,5,3,[],[],script),pending=null;
 for(let i=0;i<500&&!state.finished&&duel.turn<=7;i++){
  const m=duel.pending;if(!m)break;let r=duel.auto();
  if(m.player===0&&m.type===M.SELECT_IDLECMD){
   if(pending){const live=duel.query(0,L.MZONE).find(c=>c&&c.sequence===pending.seq&&c.code===card);if(live){checked++;if(live.attack!==pending.atk||live.defense!==pending.def)mismatches.push(`${key} (${name}) turn ${pending.turn}: forecast ${pending.atk}/${pending.def}, field ${live.attack}/${live.defense}`)}pending=null}
   const index=m.summons.findIndex(c=>c.code===card);
   if(index>=0){
    const hand=duel.query(0,L.HAND),seq=hand.findIndex(c=>c?.code===card),c={...hand[seq],controller:0,location:L.HAND,sequence:seq};
    const smart=smartContext(duel,0,L),before=new Set(duel.query(0,L.MZONE).filter(Boolean).map(x=>x.sequence));
    pending={atk:smart.projectedAttack(c),def:smart.projectedDefense(c),turn:duel.turn,before};
    r={type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index};
   }
  }
  state=duel.respond(r);
  if(pending&&pending.seq===undefined){const fresh=duel.query(0,L.MZONE).find(x=>x&&x.code===card&&!pending.before.has(x.sequence));if(fresh)pending.seq=fresh.sequence}
 }
}
duel.destroy();
assert.ok(checked>=cases.length,`each case was checked (${checked} summons for ${cases.length} cases)`);
assert.deepEqual(mismatches,[],`hand forecasts disagree with the field:\n${mismatches.join('\n')}`);
console.log(`PASS hand forecast matches the field under curses and Relic Seal: ${cases.length} cases, ${checked} summons`);
