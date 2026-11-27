// The CPU uses direct attacks (云洛, Discord 2026-11-26). Real-core duels, CPU on seat 1:
// - The Legendary Fisherman under Umi cannot be attacked, but it does not stop direct attacks: Vorse Raider attacks directly.
// - Jinzo #7 attacks directly over a stronger monster when that wins, from the field or Summoned from the hand.
// - Double Spell copying Scapegoat Summons the 4 Sheep Tokens (TheLarvi, Discord 2026-11-26).
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),read=n=>JSON.parse(fs.readFileSync(root+'android/web/'+n+'.json','utf8').replace(/^﻿/,''));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),id=n=>{const c=meta.cards.find(c=>c.name===n);if(!c)throw Error(n);return c.id};
const board=(...c)=>`\nlocal e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${c.join(' ')} end) Duel.RegisterEffect(e,0)`;
const field=(p,n,pos='POS_FACEUP_ATTACK')=>`Duel.MoveToField(Duel.CreateToken(${p},${id(n)}),${p},${p},LOCATION_MZONE,${pos},true)`;
const hand=(p,n)=>`Duel.SendtoHand(Duel.CreateToken(${p},${id(n)}),nil,REASON_RULE)`;
const grave=(p,n)=>`Duel.SendtoGrave(Duel.CreateToken(${p},${id(n)}),REASON_RULE)`;
const spell=(p,n,loc='LOCATION_SZONE')=>`Duel.MoveToField(Duel.CreateToken(${p},${id(n)}),${p},${p},${loc},POS_FACEUP,true)`;
const duel=await new MobileDuel([...meta.cards,...(meta.tokenCards||[])]).init([data,scripts]);
function cpuTurn(lp,setup){
 duel.start(Array(40).fill(id('Kuriboh')),Array(40).fill(id('Kuriboh')),lp,8000,5,7,[],[],board(...setup));let cpu=false;
 for(let n=0;n<600&&duel.pending&&!duel.finished;n++){const m=duel.pending;
  if(m.player===1&&duel.turn>=2)cpu=true;if(cpu&&m.player===0&&m.type===M.SELECT_IDLECMD)break;
  if(m.player===0){if(m.type===M.SELECT_IDLECMD){duel.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}if(m.type===M.SELECT_CHAIN){duel.respond({type:R.SELECT_CHAIN,index:-1});continue}}
  duel.respond(duel.auto());}
 return duel.lp[0];
}
assert(cpuTurn(8000,[field(0,'The Legendary Fisherman'),spell(0,'Umi','LOCATION_FZONE'),field(1,'Vorse Raider')])<=8000-1900,'Vorse Raider attacks directly past an unattackable Fisherman');
assert.equal(cpuTurn(400,[field(0,'Blue-Eyes White Dragon'),field(1,'Jinzo #7')]),0,'Jinzo #7 attacks directly for the win');
assert.equal(cpuTurn(400,[field(0,'Blue-Eyes White Dragon'),hand(1,'Jinzo #7')]),0,'Jinzo #7 is Summoned and attacks directly for the win');
// Double Spell -> Scapegoat, player 0.
duel.start(Array(40).fill(id('Vorse Raider')),Array(40).fill(id('Vorse Raider')),8000,8000,5,7,[],[],board(hand(0,'Double Spell'),hand(0,'Pot of Greed'),grave(1,'Scapegoat')));
const DS=id('Double Spell');let used=false;
for(let n=0;n<300&&duel.pending&&!duel.finished;n++){const m=duel.pending;
 if(m.type===M.SELECT_IDLECMD&&m.player===0){if(used)break;const i=m.activates.findIndex(c=>c.code===DS);assert(i>=0,'Double Spell can be activated');used=true;duel.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:i});continue}
 if(m.type===M.SELECT_IDLECMD){duel.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
 duel.respond(duel.auto());}
assert.equal(duel.query(0,L.MZONE).filter(Boolean).length,4,'Double Spell copying Scapegoat Summons 4 Sheep Tokens');
assert.equal((duel.errors||[]).length,0);
console.log('PASS direct attacks nov26: past an unattackable Fisherman, Jinzo #7 from field and hand for the win; Double Spell copies Scapegoat');
