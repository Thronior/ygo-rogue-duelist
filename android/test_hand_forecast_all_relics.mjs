// Every relic that changes ATK/DEF: the "On the field" forecast for a monster in hand must match the stats the
// core gives it when it is summoned (Discord report, 2026-10-28: "the stats in hand are lying to me").
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
// Each stat relic with a Normal-Summonable monster it applies to (Python picks them from the card pool).
const cases=JSON.parse(execFileSync(python,['-B','-c',`
import sys,json;sys.path.insert(0,'.')
import passives,campaign as g
from content import ART_INFO
base=passives.script({'curses':[],'artifacts':[]})
pool=[c for c in g.CARDS if c['data']['type']&1 and not c['data']['type']&0x40c0 and 1<=c['level']<=4]
# Prefer monsters without their own stat effect or a way to turn face-down, so only the relic changes the numbers.
plain=lambda c:c['data']['type']&0x10 or not any(w in c['desc'] for w in ('ATK','DEF','face-down'))
def find(test):return next((c['id'] for c in sorted(pool,key=lambda c:(not plain(c),c['id'])) if test(c)),None)
races={'Aqua/Fish/Sea Serpent':'Aqua','Dinosaur/Reptile':'Dinosaur','Insect/Plant':'Insect','Pyro/Thunder':'Thunder'}
sets={'0x1a':0x1a,'0x2e':0x2e,'0x4':0x4,'0x64':0x64,'0xf':0xf}
out=[]
for key,v in ART_INFO.items():
 s=passives.script({'curses':[],'artifacts':[key]})
 if not any(code in s.replace(base,'') for code in ('EFFECT_UPDATE_ATTACK','EFFECT_UPDATE_DEFENSE')):continue
 f,kind=v.get('filter',''),v['effect']
 if f in sets:test=lambda c,f=f:any((x&0xfff)==sets[f] for x in c['data'].get('setcodes',[]))
 elif kind=='terrorking_atk':test=lambda c:c['name']=='Terrorking Archfiend'
 elif f=='LV':test=lambda c:any((x&0xfff)==0x41 for x in c['data'].get('setcodes',[]))
 elif f=='normal' or kind in ('normal','approved_commoners_chain'):test=lambda c:c['data']['type']&0x10
 elif kind=='overcharge':test=lambda c:c['race']=='Thunder'
 elif kind in ('small','approved_ashen_nursery'):test=lambda c:c['level']<=3
 elif f and f.upper()==f:test=lambda c,f=f:c['attribute']==f
 elif f:test=lambda c,f=races.get(f,f):c['race']==f or (f in ('Warrior','Beast') and c['race']=='Beast-Warrior')
 else:test=lambda c:c['name']=='Vorse Raider'
 card=find(test)
 # Also at challenge level 6, the hardest, where other rules and curse strengths change.
 if card:out+=[dict(key=key,card=card,name=g.BY_ID[card]['name'],script=s),dict(key=key+' LVL 6',card=card,name=g.BY_ID[card]['name'],script=passives.script({'curses':[],'artifacts':[key],'challenge_level':6,'character':0}))]
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
assert.ok(checked>=cases.length,`each relic was checked at least once (${checked} summons for ${cases.length} relics)`);
assert.deepEqual(mismatches,[],`hand forecasts disagree with the field:\n${mismatches.join('\n')}`);
console.log(`PASS hand "On the field" forecast matches the field for ${cases.length/2} stat relics at LVL 0 and LVL 6 (${checked} summons)`);
