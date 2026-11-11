// CPU rules for Tower of Babel (user request 2026-11-11), in real-core duels. Player 0 is played by the CPU policy;
// player 1 is scripted: it Sets Tower of Babel (a Continuous Trap) on turn 2, then on turn 4 flips it and activates
// Dian Keto the Cure Master.
// A. With 3 counters on the Tower, the CPU holds its Spells instead of taking 3000.
// B. With 2 counters, when the opponent activates a Spell, the CPU chains its Set Quick-Play Spell, so the opponent's
//    Spell becomes the 4th and they take the 3000.
// Each case also runs with the rules switched off (cpuReviewRules.babel=false) to show the difference.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const TOWER=id('Tower of Babel'),KETO=id('Dian Keto the Cure Master'),OOKAZI=id('Ookazi'),POISON=id('Reload'); // a Quick-Play Spell the CPU would not chain here for its own effect
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
const idle=(m,action,code,list)=>{const at=(m[list]||[]).findIndex(c=>c.code===code);return at<0?null:{type:R.SELECT_IDLECMD,action,index:at}};
const counters=e=>{const t=e.query(1,L.SZONE).find(c=>c&&c.code===TOWER&&(c.position&5));if(!t)return -1;const raw=t.counters||{};return Array.isArray(raw)?raw.reduce((n,x)=>n+x.count,0):Number(raw[1]??raw['1']??0)||0};
const towerHits=e=>({cpu:e.events.filter(x=>x.kind==='loss_damage'&&x.amount===3000).length,opponent:e.events.filter(x=>x.kind==='effect_damage'&&x.amount===3000).length});

// The scripted opponent: Tower of Babel first, then `ketos` Dian Ketos, on its first turn.
async function duel({deck,rules=true,ketos,turns,setQuick=0,seed=11}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);if(!rules)e.cpuReviewRules={babel:false};
 let s=e.start(deck,fill(TOWER,KETO,KETO),8000,20000,5,seed,[],[],''),played=0,most=-1,held=0;
 for(let i=0;i<6000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;let answer=null;
  if(m.player===1){
   if(m.type===M.SELECT_IDLECMD){
    const set=e.turn===2&&!e.query(1,L.SZONE).some(c=>c&&c.code===TOWER)?idle(m,I.SELECT_SPELL_SET,TOWER,'spell_sets'):null;
    const tower=e.turn===4&&counters(e)<0&&!played?idle(m,I.SELECT_ACTIVATE,TOWER,'activates'):null,keto=e.turn===4&&counters(e)>=0&&played<ketos?idle(m,I.SELECT_ACTIVATE,KETO,'activates'):null;
    if(keto)played++;answer=set||tower||keto||{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}}
   else if(m.type===M.SELECT_CHAIN&&!m.forced)answer={type:R.SELECT_CHAIN,index:null};
   else if(m.type===M.SELECT_BATTLECMD)answer={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null}}
  // The CPU's first turn in case B is scripted too: Set the Quick-Play Spells and pass.
  // ...and it keeps them Set until the opponent's Tower is face-up; from there the CPU policy decides.
  else if(setQuick&&counters(e)<0&&m.type===M.SELECT_CHAIN&&!m.forced)answer={type:R.SELECT_CHAIN,index:null};
  else if(setQuick&&m.type===M.SELECT_BATTLECMD)answer={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
  else if(setQuick&&m.type===M.SELECT_IDLECMD)answer=(e.query(0,L.SZONE).filter(Boolean).length<setQuick&&idle(m,I.SELECT_SPELL_SET,POISON,'spell_sets'))||{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null};
  else if(m.type===M.SELECT_IDLECMD&&e.turn>=5)held=Math.max(held,e.query(0,L.HAND).filter(c=>c&&c.code===OOKAZI).length);
  s=e.respond(answer||e.auto());most=Math.max(most,counters(e))}
 const out={mostCounters:most,ketosPlayed:played,cpuSpellsHeld:held,...towerHits(e),towerLeft:counters(e)>=0};e.destroy();return out;
}

// A. The opponent builds the Tower to 3 counters; the CPU's hand is all Ookazi.
// The opponent's deck is shuffled: take the first seed where it opens with the Tower and 3 Dian Ketos.
async function setUp(options,ready){for(let seed=1;seed<=40;seed++){const out=await duel({...options,seed});if(ready(out))return {seed,out}}throw Error('no seed gave the opponent its Tower and Dian Ketos')}
const {seed:holdSeed,out:hold}=await setUp({deck:fill(OOKAZI),ketos:3,turns:5},o=>o.mostCounters===3);console.log('A, rules on ',hold);
same(hold.mostCounters,3,'three Dian Ketos put 3 counters on the Tower');
same(hold.cpu,0,'the CPU does not take the Tower\'s 3000');
ok(hold.cpuSpellsHeld>0&&hold.towerLeft,'it keeps its Ookazi in hand and the Tower stays at 3');
const noHold=await duel({deck:fill(OOKAZI),ketos:3,turns:5,rules:false,seed:holdSeed});console.log('A, rules off',noHold);
same(noHold.cpu,1,'without the rules the CPU activates a 4th Spell and takes 3000');

// B. The CPU has Quick-Play Spells Set; the opponent plays 3 Dian Ketos onto a fresh Tower.
const {seed:trickSeed,out:trick}=await setUp({deck:fill(POISON),ketos:3,turns:4,setQuick:3},o=>o.ketosPlayed>=2);console.log('B, rules on ',trick);
same(trick.opponent,1,'the opponent\'s own Spell becomes the 4th and they take 3000');
same(trick.cpu,0,'the CPU takes nothing');
const noTrick=await duel({deck:fill(POISON),ketos:3,turns:4,setQuick:3,rules:false,seed:trickSeed});console.log('B, rules off',noTrick);
same(noTrick.opponent,0,'without the rules the CPU does not chain and nobody is hit');

// C. The CPU's own Tower: Set, then flipped face-up at the first chance.
{const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);let s=e.start(fill(TOWER,id('Battle Ox')),fill(id('Battle Ox')),8000,8000,5,5,[],[],''),up=false;
 for(let i=0;i<6000&&!s.finished&&e.turn<=5&&!up;i++){const m=e.pending;if(!m)break;s=e.respond(e.auto());up=e.query(0,L.SZONE).some(c=>c&&c.code===TOWER&&(c.position&5))}
 console.log('C, own Tower face-up by turn',e.turn,up);ok(up,'the CPU Sets its Tower of Babel and flips it face-up');e.destroy()}
console.log(`PASS Tower of Babel CPU rules (${checks} checks)`);
process.exit(0);
