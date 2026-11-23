// CPU lines from the human-vs-CPU replay review of 2026-11-22 (11,330 replays after 2026-11-21 18:18 UTC, builds 0.2.39-0.2.41;
// each human turn was replayed with today's CPU in the human's seat and the lines compared), plus diagnosed flag fixes.
// Staged in the real core with Debug.AddCard like test_human_lines_nov18.mjs; seat 1 is the CPU, seat 0 passes every prompt.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L,B} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),all=[...meta.cards,...meta.tokenCards];
const id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
const e=await new MobileDuel(all).init([data,scripts]);let checks=0;
const POS={a:'POS_FACEUP_ATTACK',d:'POS_FACEUP_DEFENSE',s:'POS_FACEDOWN_DEFENSE',b:'POS_FACEDOWN',u:'POS_FACEUP'};
const add=(n,o,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${o},${o},${loc},${seq},${pos})\n`;
const item=x=>Array.isArray(x)?{n:x[0],pos:x[1]}:{n:x,pos:'a'};
const fill=Array(12).fill('Battle Ox');
function play({cpu={},opp={},lp=[8000,8000],turns=1}){
 let t=`Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,${lp[0]},0,0)\nDebug.SetPlayerInfo(1,${lp[1]},0,0)\n`;
 for(const [s,c] of [[0,opp],[1,cpu]]){
  (c.field||[]).forEach((x,i)=>{const {n,pos}=item(x);t+=add(n,s,'LOCATION_MZONE',POS[pos],i)});
  (c.back||[]).forEach((x,i)=>{const {n,pos}=item(x);t+=add(n,s,'LOCATION_SZONE',POS[pos==='a'?'b':pos],i)});
  (c.hand||[]).forEach(n=>t+=add(n,s,'LOCATION_HAND',POS.b));
  (c.grave||[]).forEach(n=>t+=add(n,s,'LOCATION_GRAVE',POS.u));
  [...fill,...(c.deck||[])].forEach(n=>t+=add(n,s,'LOCATION_DECK',POS.b));
 }
 e.start([],[],lp[0],lp[1],0,271828,[],[],t+'Debug.ReloadFieldEnd()\n',0);e.core.startDuel(e.h);e.advance();
 const steps=[];let seen=0,last=-1;
 for(let i=0;i<600&&e.pending&&!e.finished;i++){
  const m=e.pending;
  if(e.player===1&&e.turn!==last){last=e.turn;if(++seen>turns)break}
  if(e.player===0&&seen>=turns&&e.turn>1)break;
  if(m.player===0){
   const r=m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:m.to_bp?I.TO_BP:I.TO_EP,index:null}:m.type===M.SELECT_BATTLECMD?{type:R.SELECT_BATTLECMD,action:m.to_ep?B.TO_EP:B.TO_M2,index:null}:m.type===M.SELECT_CHAIN?{type:R.SELECT_CHAIN,index:m.forced?0:null}:e.choices(m).at(m.type===M.SELECT_EFFECTYN||m.type===M.SELECT_YESNO?-1:0)?.response??e.auto(m);
   e.respond(r);continue;
  }
  const r=e.auto(m);
  if(m.type===M.SELECT_BATTLECMD&&r.action===B.SELECT_BATTLE)steps.push(`attack ${e.name(m.attacks[r.index].code)}`);
  if(m.type===M.SELECT_IDLECMD){const l={[I.SELECT_SUMMON]:['summon',m.summons],[I.SELECT_SPECIAL_SUMMON]:['special',m.special_summons],[I.SELECT_MONSTER_SET]:['set',m.monster_sets],[I.SELECT_ACTIVATE]:['activate',m.activates],[I.SELECT_POS_CHANGE]:['flip',m.pos_changes]}[r.action];if(l)steps.push(`${l[0]} ${e.name(l[1][r.index].code)}`)}
  e.respond(r);
 }
 const names=(s,l)=>e.query(s,l).filter(Boolean).map(c=>e.name(c.code));
 assert.deepEqual(e.errors.filter(x=>x.trim()),[],'no script errors');
 return {steps,field:names(1,L.MZONE),hand:names(1,L.HAND),grave:names(1,L.GRAVE),theirs:names(0,L.MZONE),lp:[...e.lp],won:e.finished&&e.lp[0]<=0};
}
const ok=(v,why)=>{assert.ok(v,why);checks++};
const never=(r,w)=>{assert.ok(!r.steps.includes(w),`${w} must not happen: ${r.steps.join(' > ')}`);checks++};
const has=(r,w)=>{assert.ok(r.steps.includes(w),`${w} expected: ${r.steps.join(' > ')}`);checks++};
let r;

// 1. An equal-ATK trade still clears a face-up Attack Position blocker (behaviour flag 2026-11-22): Battle Ox trades
// with their Battle Ox and the second Battle Ox, summoned for it, hits for exactly 1700.
r=play({cpu:{field:['Battle Ox'],hand:['Battle Ox','Waboku']},opp:{field:['Battle Ox']},lp:[1700,8000]});
has(r,'summon Battle Ox');ok(r.won,'trade then 1700 direct: '+r.steps.join(' > ')+' '+r.lp);
// Control: an equal-DEF Defense Position blocker is not destroyed, so nothing is lethal and nothing trades into it.
r=play({cpu:{field:['Battle Ox'],hand:['Battle Ox','Waboku']},opp:{field:[['Giant Soldier of Stone','d']]},lp:[1700,8000]});ok(!r.won,'no lethal through a 2000 DEF wall: '+r.steps.join(' > '));

// 2. Susa Soldier deals half the battle damage, so it takes the Set blocker and the others hit at full strength
// (replay 154fab82cece@7: players sent Susa into the Set Hitodenchak; the CPU sent Ancient Dragon and fell 625 short).
r=play({cpu:{field:['Susa Soldier','Battle Ox','Gemini Elf']},opp:{field:[['Kuriboh','s']]},lp:[3600,8000]});
ok(r.won&&r.steps[0]==='attack Susa Soldier','Susa into the Set card, 1700 + 1900 direct: '+r.steps.join(' > ')+' '+r.lp);

// 3. Asura Priest attacks every monster once each, so it clears the field and the big monster hits directly
// (replay b01f5cc711c6@11: Asura Priest took three blockers and Zaborg hit for 3100; the CPU sent Zaborg into one).
r=play({cpu:{field:['Zaborg the Thunder Monarch','Asura Priest']},opp:{field:['Kuriboh','Kuriboh']},lp:[5000,8000]});
ok(r.won,'Asura takes both Kuriboh (2800), Zaborg hits for 2400: '+r.steps.join(' > ')+' '+r.lp);
// One blocker: Asura Priest may still attack directly once the other monster has cleared it (replay 40912c88a725@5).
r=play({cpu:{field:['Zaborg the Thunder Monarch','Asura Priest']},opp:{field:['Kuriboh']},lp:[3800,8000]});
ok(r.won,'one blocker: either attacker takes it and the other goes direct (3800): '+r.steps.join(' > ')+' '+r.lp);
// Asura Priest has not attacked and the Set blocker is gone: it can attack directly (replay 40912c88a725@5).
r=play({cpu:{field:['Silent Magician LV4','Asura Priest','Vorse Raider']},opp:{field:[['Kuriboh','s']]},lp:[2700,8000]});
ok(r.won,'Vorse Raider clears the Set card, Asura Priest and Silent Magician hit directly: '+r.steps.join(' > ')+' '+r.lp);

// 4. In Main Phase 1 a monster that can still attack is worth more as an attacker than a wall is as a Tribute (replays
// 61b347ae0575@11, 2e15f1620b23@15: players released Big Shield Gardna / a Set Royal Magical Library, the CPU released
// Skilled White Magician / White Magical Hat and lost that attack).
r=play({cpu:{field:['Vorse Raider',['Big Shield Gardna','d']],hand:['Summoned Skull']},opp:{},lp:[8000,8000]});
has(r,'summon Summoned Skull');ok(r.grave.includes('Big Shield Gardna')&&r.field.includes('Vorse Raider'),'Gardna is the Tribute, Vorse Raider attacks: '+r.field+' / '+r.grave);
ok(r.lp[0]===8000-2500-1900,'Skull and Vorse Raider both hit: '+r.lp);
// Control: Vorse Raider has no attack worth making into a bigger monster, so the wall stays and Vorse Raider is paid.
r=play({cpu:{field:['Vorse Raider',['Big Shield Gardna','d']],hand:['Summoned Skull']},opp:{field:[['Blue-Eyes White Dragon','d']]},lp:[8000,8000]});
ok(!r.grave.includes('Big Shield Gardna'),'no attack for Vorse Raider: Gardna is kept: '+r.steps.join(' > ')+' / '+r.grave);

// 5. Ritual materials: a spare monster from the hand before a field monster that can still attack (replay
// 000ea012b46d@5: the player paid Black Illusion Ritual with Great Angus from hand, the CPU with Sonic Bird on the field).
r=play({cpu:{field:['Sonic Bird'],hand:['Black Illusion Ritual','Relinquished','Great Angus']},opp:{field:['Kuriboh']},lp:[8000,8000]});
has(r,'activate Black Illusion Ritual');ok(r.grave.includes('Great Angus')&&r.field.includes('Sonic Bird'),'Great Angus pays, Sonic Bird stays: '+r.field+' / '+r.grave);

e.destroy();
console.log(`PASS human lines Nov 22: ${checks} checks`);
