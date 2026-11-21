// Reversed Might (curse) and Sword and Shield (relic) each register their own EFFECT_SWAP_BASE_AD, and the core swaps
// once per effect, so both together cancel out. The "On the field" forecast must match the field in every mix
// (VellianCrowler, Discord 2026-11-21: Versago under Mystic Plasma Zone showed 1700 ATK but was summoned with 1900).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
import {deckStats} from './web/feedback-ui.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const meta=json('android/web/content.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const VERSAGO=id('Versago the Destroyer'),ZONE=id('Mystic Plasma Zone'),POLY=24094653;
const mixes=[[[],[]],[['mirror_stats'],[]],[[],['sword_and_shield']],[['mirror_stats'],['sword_and_shield']],
 [['mirror_stats','mirror_stats'],['sword_and_shield']],[[],['sword_and_shield','sword_and_shield']]];
const cases=JSON.parse(execFileSync(python,['-B','-c',`
import sys,json;sys.path.insert(0,'.')
import passives
out=[]
for curses,arts in json.loads(sys.argv[1]):
 for level in (0,3,6):
  for zone in (False,True):
   run={'curses':curses,'artifacts':arts+['horn'],'challenge_level':level,'character':0}
   out.append(dict(key=f"{'+'.join(curses) or 'no curse'} / {'+'.join(arts) or 'no swap relic'} LVL {level}{' + Mystic Plasma Zone' if zone else ''}",zone=zone,script=passives.script(run)))
print(json.dumps(out))`,JSON.stringify(mixes)],{cwd:root,maxBuffer:1<<28}).toString());

const duel=await new MobileDuel([...meta.cards,...(meta.tokenCards||[])]).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
const mismatches=[],seen={};let checked=0;
for(const {key,zone,script} of cases){
 const deck=zone?Array.from({length:40},(_,n)=>n%2?VERSAGO:ZONE):Array(40).fill(VERSAGO);
 let state=duel.start(deck,Array(40).fill(POLY),8000,8000,5,3,[],[],script),pending=null;
 for(let i=0;i<800&&!state.finished&&duel.turn<=7;i++){
  const m=duel.pending;if(!m)break;let r=duel.auto();
  if(m.player===0&&m.type===M.SELECT_IDLECMD){
   if(pending){const live=duel.query(0,L.MZONE).find(c=>c&&c.sequence===pending.seq&&c.code===VERSAGO);if(live){checked++;seen[key]=`${live.attack}/${live.defense}`;if(live.attack!==pending.atk||live.defense!==pending.def)mismatches.push(`${key} turn ${pending.turn}: forecast ${pending.atk}/${pending.def}, field ${live.attack}/${live.defense}`)}pending=null}
   const zoneUp=duel.query(0,L.SZONE).some(c=>c&&c.code===ZONE&&c.position&5),activate=m.activates.findIndex(c=>c.code===ZONE&&c.location===L.HAND);
   const index=m.summons.findIndex(c=>c.code===VERSAGO);
   if(zone&&!zoneUp&&activate>=0)r={type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:activate};
   else if(index>=0&&(!zone||zoneUp)){
    const hand=duel.query(0,L.HAND),seq=hand.findIndex(c=>c?.code===VERSAGO),c={...hand[seq],controller:0,location:L.HAND,sequence:seq};
    const smart=smartContext(duel,0,L),before=new Set(duel.query(0,L.MZONE).filter(Boolean).map(x=>x.sequence));
    pending={atk:smart.projectedAttack(c,{equips:false}),def:smart.projectedDefense(c,{equips:false}),turn:duel.turn,before};
    r={type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index};
   }
  }
  state=duel.respond(r);
  if(pending&&pending.seq===undefined){const fresh=duel.query(0,L.MZONE).find(x=>x&&x.code===VERSAGO&&!pending.before.has(x.sequence));if(fresh)pending.seq=fresh.sequence}
 }
}
duel.destroy();
for(const {key} of cases)assert.ok(seen[key],`${key}: Versago was summoned and checked`);
assert.deepEqual(mismatches,[],`forecasts disagree with the field:\n${mismatches.join('\n')}`);
// The reported case: Fiend +300 (Horn), both swaps, Mystic Plasma Zone, Level 6 -> 1100+500+300 ATK, 900-400 DEF.
assert.equal(seen['mirror_stats / sword_and_shield LVL 6 + Mystic Plasma Zone'],'1900/500','Versago with both swaps keeps its printed stats');
assert.equal(seen['mirror_stats / no swap relic LVL 6 + Mystic Plasma Zone'],'1700/700','the curse alone swaps');
assert.equal(seen['no curse / sword_and_shield LVL 6 + Mystic Plasma Zone'],'1700/700','the relic alone swaps');

// Deck editor (out of the duel): Level 6 keeps the curse, so the same parity applies there; Relic Seal drops the relic's swap.
const card=meta.cards.find(c=>c.id===VERSAGO),info=meta.artifactInfo,stats=(curses,artifacts)=>deckStats(card,{challenge_level:6,curses,persistent_curses:curses,artifacts,character:0},0,info);
assert.deepEqual(stats([],['sword_and_shield']),[900,1100],'deck editor: relic alone swaps');
assert.deepEqual(stats(['mirror_stats'],[]),[900,1100],'deck editor: curse alone swaps');
assert.deepEqual(stats(['mirror_stats'],['sword_and_shield']),[1100,900],'deck editor: curse and relic cancel');
assert.deepEqual(stats(['mirror_stats','relic_seal'],['sword_and_shield']),[900,1100],'deck editor: Relic Seal leaves only the curse');
console.log(`PASS swap forecast matches the field: ${cases.length} cases, ${checked} summons`);
