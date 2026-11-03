// Reckless Spear, Trapbound Idol and No Pain No Gain in the real core (2026-11-02).
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L,B} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=artifacts=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts,challenge_level:0,character:0})],{cwd:root,encoding:'utf8'});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const mine=()=>e.pending?.type===M.SELECT_IDLECMD&&e.pending?.player===0;
const until=test=>{for(let i=0;i<400&&!test();i++)e.respond(e.auto())};
const OX=id('Battle Ox'),POT=id('Pot of Greed'),VORSE=id('Vorse Raider'),APOPHIS=id('Embodiment of Apophis'),VOID=Array(40).fill(id('Pot of Greed'));
const summonOx=()=>{until(mine);const m=e.pending;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:m.summons.findIndex(c=>c.code===OX)});until(mine)};
// Reckless Spear: -1000 ATK, and an attack can go past a monster.
{
 e.start(Array(40).fill(OX),Array(40).fill(id('Giant Soldier of Stone')),8000,8000,5,3,[],[],script(['cursed_reckless_spear']));until(mine);
 e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});until(()=>e.turn>=3&&mine());summonOx();
 same(e.query(0,L.MZONE).find(c=>c?.code===OX).attack,700,'1700 - 1000');
 assert(e.query(1,L.MZONE).some(Boolean),'the opponent has a blocker');checks++;
 e.respond({type:R.SELECT_IDLECMD,action:I.TO_BP,index:null});until(()=>e.pending?.type===M.SELECT_BATTLECMD&&e.pending?.player===0);
 const m=e.pending;same(m.attacks[0].can_direct,true,'direct attack is offered over a blocker');
 const lp=e.lp[1];e.respond({type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0});
 for(let i=0;i<40&&e.lp[1]===lp;i++){const p=e.pending;if(!p)break;if([M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(p.type)&&Number(p.description)===31)e.respond({type:R.SELECT_YESNO,yes:true});else e.respond(e.auto())}
 same(lp-e.lp[1],700,'the attack lands for its reduced ATK');
}
// Trapbound Idol: each Spell Card costs 300 LP, and one you cannot pay for cannot be activated.
const openPot=(relics,lp)=>{for(let seed=1;seed<40;seed++){e.start(Array.from({length:40},(_,i)=>i%2?POT:OX),VOID,lp,8000,5,seed,[],[],script(relics));until(mine);if(e.query(0,L.HAND).some(c=>c?.code===POT))return e.pending}assert.fail('no Pot in hand')};
{
 same(openPot(['cursed_trapbound_idol'],250).activates.some(c=>c.code===POT),false,'250 LP cannot pay for a Spell');
 const m=openPot(['cursed_trapbound_idol'],8000),k=m.activates.findIndex(c=>c.code===POT);assert(k>=0);e.events.length=0;
 e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});until(mine);
 same(e.lp[0],7700,'8000 - 300');
}
// Trapbound Idol: the Trap Monster survives a stronger attacker. Without it, the same duel loses it.
const trapDuel=relics=>{
 for(let seed=1;seed<40;seed++){
  e.start(Array(40).fill(APOPHIS),Array(40).fill(VORSE),8000,8000,5,seed,[],[],script(relics));
  while(e.turn<7&&e.pending&&!e.finished){
   if(!mine()){e.respond(e.auto());continue}
   const m=e.pending,set=m.spell_sets.findIndex(c=>c.code===APOPHIS),act=m.activates.findIndex(c=>c.code===APOPHIS);
   if(act>=0)e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:act});
   else if(set>=0&&!e.query(0,L.SZONE).some(c=>c?.code===APOPHIS&&(c.position&8)))e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SPELL_SET,index:set});
   else e.respond({type:R.SELECT_IDLECMD,action:m.to_ep?I.TO_EP:I.TO_BP,index:null});
  }
  const mons=e.query(0,L.MZONE).filter(c=>c?.code===APOPHIS).length,gy=e.query(0,L.GRAVE).filter(c=>c?.code===APOPHIS).length;
  if(mons+gy)return {mons,gy};
 }
 assert.fail('no Trap Monster reached the field');
};
{
 const base=trapDuel([]);assert(base.gy>0,'baseline: Vorse Raider destroys it');checks++;
 same(trapDuel(['cursed_trapbound_idol']).gy,0,'with the relic it is never destroyed by battle');
}
// No Pain No Gain counts each loss once: costs and damage, not recoveries.
{
 const m=openPot(['cursed_trapbound_idol','no_pain_no_gain'],8000),k=m.activates.findIndex(c=>c.code===POT);e.events.length=0;
 e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});until(mine);
 same(e.events.filter(x=>x.kind==='lp_lost').length,1,'one LP cost, one loss');
 e.start(Array(40).fill(OX),Array(40).fill(VORSE),8000,8000,5,3,[],[],script(['no_pain_no_gain']));until(mine);e.events.length=0;
 for(let i=0;i<400&&e.turn<3&&e.pending;i++)e.respond(mine()?{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}:e.auto());
 same(e.lp[0]<8000,true,'the opponent attacked');
 const hits=e.events.filter(x=>x.kind==='damage_taken').length;assert(hits>0);same(e.events.filter(x=>x.kind==='lp_lost').length,hits,'one battle hit, one loss');
}
assert.deepEqual(e.errors,[],'no script errors');console.log(`PASS relic reworks: ${checks} checks`);process.exit(0);
