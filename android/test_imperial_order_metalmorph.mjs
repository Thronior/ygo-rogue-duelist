// Imperial Order with Axe of Despair and Metalmorph on one monster (Discord, Twist, 2026-11-21): Imperial Order
// negates Spells only, so Axe's +1000 goes and Metalmorph's +300 (a Trap) stays.
import assert from 'node:assert/strict';import fs from 'node:fs';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const cards=json('data/cards.json'),engine=[json('android/web/engine-data.json'),json('android/web/scripts.json')];
const CELTIC=91152256,AXE=40619825,METAL=68540058,ORDER=61740673,MOUNTAIN=50913601;
const results={};
for(const passives of [''].concat(process.argv.slice(2))){
 // A 12-card deck: by turn 3 every card is drawn; pick a seed whose opening hand already holds all three.
 let duel,state;
 for(let seed=1;;seed++){
  duel=await new MobileDuel(cards).init(engine);
  state=duel.start([CELTIC,AXE,METAL,ORDER,...Array(8).fill(CELTIC)],Array(40).fill(MOUNTAIN),8000,8000,10,seed,[],[],passives,5);
  const hand=duel.query(0,L.HAND).filter(Boolean).map(c=>c.code);
  if([AXE,METAL,ORDER].every(c=>hand.includes(c))&&duel.pending?.player===0)break;
  duel.destroy();assert.ok(seed<200,'no seed deals the three cards');
 }
 const atk=()=>duel.query(0,L.MZONE).find(Boolean)?.attack;
 const log=[];let step=0;
 const idx=(list,code)=>list.findIndex(c=>c.code===code);
 for(let g=0;g<3000&&!state.finished&&duel.turn<=4;g++){
  const m=duel.pending;let r=null;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){
   const mine=duel.query(0,L.MZONE).find(Boolean);
   if(!mine&&m.summons.length)r={type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:idx(m.summons,CELTIC)};
   else if(step===0&&idx(m.activates,AXE)>=0){r={type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:idx(m.activates,AXE)};step=1}
   else if(step===1&&idx(m.spell_sets,METAL)>=0)r={type:R.SELECT_IDLECMD,action:I.SELECT_SPELL_SET,index:idx(m.spell_sets,METAL)};
   else if(step===1&&idx(m.spell_sets,ORDER)>=0)r={type:R.SELECT_IDLECMD,action:I.SELECT_SPELL_SET,index:idx(m.spell_sets,ORDER)};
   else if(step===1&&idx(m.activates,METAL)>=0){log.push(['axe',atk()]);r={type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:idx(m.activates,METAL)};step=2}
   else if(step===2&&idx(m.activates,ORDER)>=0){log.push(['axe+metalmorph',atk()]);r={type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:idx(m.activates,ORDER)};step=3}
   else if(step===3){log.push(['imperial order',atk()]);break}
   else r={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null};
  }else if(m.player===0&&m.type===M.SELECT_CHAIN)r={type:R.SELECT_CHAIN,index:-1};
  state=duel.respond(r||duel.auto());
 }
 duel.destroy();results[passives||'plain']=log;
 assert.deepEqual(log,[['axe',2400],['axe+metalmorph',2700],['imperial order',1700]],'Imperial Order negates Axe only: '+JSON.stringify(log));
}
console.log('PASS Imperial Order keeps Metalmorph (a Trap) and negates Axe of Despair',JSON.stringify(results));
