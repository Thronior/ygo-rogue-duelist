// CPU lines that human players use and the CPU missed (replay review 2026-11-10). Staged in the real core with
// Debug.AddCard like test_cpu_combos.mjs; seat 1 is the CPU, seat 0 passes every prompt.
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
  if(c.fieldSpell)t+=add(c.fieldSpell,s,'LOCATION_SZONE',POS.u,5);
  (c.hand||[]).forEach(n=>t+=add(n,s,'LOCATION_HAND',POS.b));
  (c.grave||[]).forEach(n=>t+=add(n,s,'LOCATION_GRAVE',POS.u));
  (c.extra||[]).forEach(n=>t+=add(n,s,'LOCATION_EXTRA',POS.b));
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
 return {steps,field:names(1,L.MZONE),hand:names(1,L.HAND),grave:names(1,L.GRAVE),back:names(1,L.SZONE),theirs:names(0,L.MZONE),lp:[...e.lp],won:e.finished&&e.lp[0]<=0};
}
const ok=(v,why)=>{assert.ok(v,why);checks++};
const never=(r,w)=>{assert.ok(!r.steps.includes(w),`${w} must not happen: ${r.steps.join(' > ')}`);checks++};
const inOrder=(r,...want)=>{let at=-1;for(const w of want){const i=r.steps.indexOf(w,at+1);assert.ok(i>at,`${w} in order: ${r.steps.join(' > ')}`);at=i}checks++};

// Change of Heart takes a lone Set blocker so the attacks are lethal (replay 31be28695032: Beta + a summon
// into a Set monster at 3100 LP; the CPU Set Old Vindictive Magician instead).
let r=play({cpu:{hand:['Change of Heart','Gemini Elf'],field:['Beta The Magnet Warrior']},opp:{field:[['Mystical Elf','s']]},lp:[3100,8000]});
inOrder(r,'activate Change of Heart');ok(r.won,'stealing the Set blocker wins: '+r.steps.join(' > '));
// Control: without lethal or a big hit, Change of Heart is kept for a face-up target.
r=play({cpu:{hand:['Change of Heart'],field:['Battle Ox']},opp:{field:[['Mystical Elf','s'],'Vorse Raider']},lp:[8000,8000]});never(r,'activate Change of Heart');
// Negative: Set back-row could stop the lethal attack, and the hit alone is small.
r=play({cpu:{hand:['Change of Heart'],field:['Battle Ox']},opp:{field:[['Mystical Elf','s']],back:[['Mirror Force','b']]},lp:[8000,1700]});never(r,'activate Change of Heart');

// Ritual searchers: summon the searcher, the Ritual Spell brings the monster out beside it (replay 56e4138ff228:
// Sonic Bird for Black Illusion Ritual, Relinquished took Ancient Elf; the CPU Normal Summoned Blazing Inpachi).
const BIR='Black Illusion Ritual',RQ='Relinquished';
r=play({cpu:{hand:['Sonic Bird',RQ,'Blazing Inpachi','Kuriboh'],deck:[BIR]},opp:{field:['Ancient Elf']}});
inOrder(r,'summon Sonic Bird',`activate ${BIR}`);ok(r.field.includes(RQ)&&r.field.includes('Sonic Bird'),'Relinquished beside Sonic Bird: '+r.field);
// Senju fetches the monster for a Ritual Spell already in hand (replay 146a5d2f8e59).
r=play({cpu:{hand:['Senju of the Thousand Hands',BIR,'Blazing Inpachi','Kuriboh'],deck:[RQ]},opp:{field:['Ancient Elf']}});
inOrder(r,'summon Senju of the Thousand Hands',`activate ${BIR}`);ok(r.field.includes(RQ),'Senju line ends on Relinquished');
// Manju can fetch either half (replay a4dfa6070dd1).
r=play({cpu:{hand:['Manju of the Ten Thousand Hands',RQ,'Blazing Inpachi','Kuriboh'],deck:[BIR]},opp:{field:['Ancient Elf']}});
inOrder(r,'summon Manju of the Ten Thousand Hands',`activate ${BIR}`);
// Negative: no partner anywhere, so the bigger body is summoned.
r=play({cpu:{hand:['Sonic Bird','Blazing Inpachi','Kuriboh']},opp:{field:['Ancient Elf']}});never(r,'summon Sonic Bird');
// Negative: no Tribute for the Ritual (Relinquished is the only other monster), so no line.
r=play({cpu:{hand:['Senju of the Thousand Hands',BIR,'Blazing Inpachi'],deck:[RQ]},opp:{field:['Ancient Elf']}});ok(!r.field.includes(RQ)||r.grave.some(n=>n==='Senju of the Thousand Hands'||n==='Blazing Inpachi'),'any ritual paid with a real body');

// The Ritual is already playable from the hand: no searcher for a second copy (deck-sim review, replay 9a60a51773a0).
r=play({cpu:{hand:['Sonic Bird',BIR,RQ,'Blazing Inpachi','Kuriboh'],deck:[BIR]},opp:{field:['Ancient Elf']}});never(r,'summon Sonic Bird');ok(r.field.includes(RQ),'the Ritual still happens: '+r.steps.join(' > '));

// Cannon Soldier from the hand feeds the field when that burn is lethal (replay f522ef880cec).
const WALL=['Big Shield Gardna','d'];
r=play({cpu:{hand:['Cannon Soldier','Summoned Skull'],field:['Battle Ox','Battle Ox','Battle Ox']},opp:{field:[WALL,WALL,WALL]},lp:[1850,8000]});
inOrder(r,'summon Cannon Soldier');ok(r.won,'the burn wins: '+r.steps.join(' > '));
r=play({cpu:{hand:['Cannon Soldier','Summoned Skull'],field:['Battle Ox','Battle Ox','Battle Ox']},opp:{field:[WALL,WALL,WALL]},lp:[2500,8000]});ok(!r.won&&r.field.filter(n=>n==='Battle Ox').length===3,'no burn short of lethal: '+r.field);

// Clear the Set back-row before a lethal attack.
r=play({cpu:{hand:["Harpie's Feather Duster"],field:['Summoned Skull','Battle Ox']},opp:{back:[['Mirror Force','b']]},lp:[3000,8000]});
inOrder(r,"activate Harpie's Feather Duster",'attack Summoned Skull');ok(r.won,'Duster first, then lethal');
// Control: not lethal, one Set card: Duster is kept.
r=play({cpu:{hand:["Harpie's Feather Duster"],field:['Summoned Skull','Battle Ox']},opp:{back:[['Mirror Force','b']]},lp:[8000,8000]});never(r,"activate Harpie's Feather Duster");

// Zorc's die is worth rolling when one destroyed monster opens lethal.
const ZORC='Dark Master - Zorc';
r=play({cpu:{field:[ZORC,'Battle Ox']},opp:{field:[['Kuriboh','d']]},lp:[4000,8000]});inOrder(r,`activate ${ZORC}`);
r=play({cpu:{field:[ZORC,'Battle Ox']},opp:{field:[['Kuriboh','d']]},lp:[8000,8000]});never(r,`activate ${ZORC}`);

// Already lethal: Zorc does not risk the roll (6107f566ac04: it rolled a 6 and lost a won turn).
r=play({cpu:{field:[ZORC,'Battle Ox']},opp:{field:[['Kuriboh','d']]},lp:[2500,8000]});never(r,`activate ${ZORC}`);ok(r.won,'the plain attacks win');
e.destroy();
console.log(`PASS human lines: ${checks} checks`);
