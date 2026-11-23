// World Championship deck CPU review (2026-11-22, endless.CHAMPION / data/decks/world-champion-2004.ydk): Mirage of
// Nightmare with its Mystical Space Typhoon escape, Pot of Greed kept from discards, Magical Scientist's Fusions as
// attackers and as free gifts for Creature Swap or Tributes, and a revive to pay Jinzo's Tribute. Every check runs for
// both seats, with a negative or control case. Combos are staged in the real core with Debug.AddCard (like
// test_human_lines_nov22.mjs); scores use the smartContext stub of test_all_decks_review_nov19.mjs.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L,B} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),all=[...meta.cards,...meta.tokenCards];
const id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
const e=await new MobileDuel(all).init([data,scripts]);let checks=0;
const POS={a:'POS_FACEUP_ATTACK',d:'POS_FACEUP_DEFENSE',s:'POS_FACEDOWN_DEFENSE',b:'POS_FACEDOWN',u:'POS_FACEUP'};
const add=(n,o,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${o},${o},${loc},${seq},${pos})\n`;
const item=x=>Array.isArray(x)?{n:x[0],pos:x[1]}:{n:x,pos:'a'};
const fill=Array(12).fill('Battle Ox');
// The CPU plays `seat`; the other seat passes every prompt. Turn 1 (no Battle Phase) is passed by both, so the CPU's
// first turn is turn 2 in seat 1 and turn 3 in seat 0. `turns` counts the CPU's turns.
// lp is [opponent, CPU].
function play(seat,{cpu={},opp={},lp=[8000,8000],turns=1}){
 const life=seat===1?lp:[lp[1],lp[0]];
 let t=`Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,${life[0]},0,0)\nDebug.SetPlayerInfo(1,${life[1]},0,0)\n`;
 for(const [s,c] of [[1-seat,opp],[seat,cpu]]){
  (c.field||[]).forEach((x,i)=>{const {n,pos}=item(x);t+=add(n,s,'LOCATION_MZONE',POS[pos],i)});
  (c.back||[]).forEach((x,i)=>{const {n,pos}=item(x);t+=add(n,s,'LOCATION_SZONE',POS[pos==='a'?'b':pos],i)});
  (c.hand||[]).forEach(n=>t+=add(n,s,'LOCATION_HAND',POS.b));
  (c.grave||[]).forEach(n=>t+=add(n,s,'LOCATION_GRAVE',POS.u));
  (c.extra||[]).forEach(n=>t+=add(n,s,'LOCATION_EXTRA',POS.b));
  [...fill,...(c.deck||[])].forEach(n=>t+=add(n,s,'LOCATION_DECK',POS.b));
 }
 e.start([],[],life[0],life[1],0,271828,[],[],t+'Debug.ReloadFieldEnd()\n',0);e.core.startDuel(e.h);e.advance();
 const steps=[],picks=[];let seen=0,last=-1,turnEnd=null;
 for(let i=0;i<900&&e.pending&&!e.finished;i++){
  const m=e.pending;
  if(e.player===seat&&e.turn>1&&e.turn!==last){last=e.turn;if(++seen>turns)break}
  // The other side's field at the start of the turn after the CPU's first one (Scientist Fusions are gone by then).
  if(e.player!==seat&&seen>=1&&!turnEnd)turnEnd=e.query(1-seat,L.MZONE).filter(Boolean).map(c=>e.name(c.code));
  if(e.player!==seat&&seen>=turns&&e.turn>1&&m.player!==seat)break;
  if(m.player!==seat||e.turn===1){
   const r=m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:m.to_bp?I.TO_BP:I.TO_EP,index:null}:m.type===M.SELECT_BATTLECMD?{type:R.SELECT_BATTLECMD,action:m.to_ep?B.TO_EP:B.TO_M2,index:null}:m.type===M.SELECT_CHAIN?{type:R.SELECT_CHAIN,index:m.forced?0:null}:(c=>c?.response??c)(e.choices(m).at(m.type===M.SELECT_CHAIN?-1:0))??e.auto(m);
   e.respond(r);continue;
  }
  const r=e.auto(m);
  if(m.type===M.SELECT_BATTLECMD&&r.action===B.SELECT_BATTLE)steps.push(`attack ${e.name(m.attacks[r.index].code)}`);
  if(m.type===M.SELECT_CHAIN&&r&&r.index!==null&&r.index!==undefined&&m.selects?.[r.index])steps.push(`chain ${e.name(m.selects[r.index].code)}`);
  if(m.type===M.SELECT_IDLECMD){const l={[I.SELECT_SUMMON]:['summon',m.summons],[I.SELECT_SPECIAL_SUMMON]:['special',m.special_summons],[I.SELECT_MONSTER_SET]:['set',m.monster_sets],[I.SELECT_ACTIVATE]:['activate',m.activates],[I.SELECT_POS_CHANGE]:['flip',m.pos_changes]}[r.action];if(l)steps.push(`${l[0]} ${e.name(l[1][r.index].code)}`);}
  if(m.type===M.SELECT_CARD&&Array.isArray(r?.indicies))picks.push(...r.indicies.map(k=>e.name(m.selects[k]?.code)));
  e.respond(r);
 }
 const names=(s,l)=>e.query(s,l).filter(Boolean).map(c=>e.name(c.code));
 assert.deepEqual(e.errors.filter(x=>x.trim()),[],'no script errors');
 return {steps,picks,field:names(seat,L.MZONE),back:names(seat,L.SZONE),hand:names(seat,L.HAND),grave:names(seat,L.GRAVE),extra:names(seat,L.EXTRA),
  theirs:names(1-seat,L.MZONE),theirGrave:names(1-seat,L.GRAVE),theirExtra:names(1-seat,L.EXTRA),turnEnd:turnEnd||[],lp:seat===1?[...e.lp]:[e.lp[1],e.lp[0]]};
}
const ok=(v,why)=>{assert.ok(v,why);checks++};
const never=(r,w)=>ok(!r.steps.includes(w),`${w} must not happen: ${r.steps.join(' > ')}`);
const has=(r,w)=>ok(r.steps.includes(w),`${w} expected: ${r.steps.join(' > ')}`);
const show=r=>`${r.steps.join(' > ')} | field ${r.field} | theirs ${r.theirs} | grave ${r.grave}`;

// Stub duel for single scores (test_all_decks_review_nov19.mjs).
const card=(name,location,controller,sequence,position=1)=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,race:data[id(name)]?.race,level:data[id(name)]?.level,owner:controller,position,controller,location,sequence});
function stub(p,mine,theirs,state={}){
 const s=new MobileDuel(all),zones={[p]:mine,[1-p]:theirs};
 Object.assign(s,{data,lp:[8000,8000],turn:6,player:p,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const zone=(loc,list)=>{const out=Array(loc===L.SZONE?6:5).fill(null);for(const c of list||[])out[c.sequence]=c;return out};
 const z={};for(const side of [0,1]){const deck=Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
  z[side]={[L.MZONE]:zone(L.MZONE,zones[side].mzone),[L.SZONE]:zone(L.SZONE,zones[side].szone),[L.HAND]:zones[side].hand||[],[L.DECK]:deck,[L.GRAVE]:zones[side].grave||[],[L.EXTRA]:zones[side].extra||[]}}
 s.query=(side,loc)=>z[side]?.[loc]||[];s.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length};
 return s;
}
let r;
const EXTRA=['Punished Eagle','Roaring Ocean Snake','Flame Ghost'];
for(const seat of [1,0]){
 const o=1-seat,tag=` (seat ${seat})`;
 // 1. Mirage of Nightmare: activated with MST beside it and a near-empty hand; the draw comes in their Standby Phase and
 // MST destroys Mirage in answer to the discard in ours (it was never activated: 834 offers in 100 duels).
 r=play(seat,{cpu:{hand:['Mirage of Nightmare','Mystical Space Typhoon']},turns:2});
 has(r,'activate Mirage of Nightmare');has(r,'chain Mystical Space Typhoon');
 ok(r.grave.includes('Mirage of Nightmare')&&r.grave.includes('Mystical Space Typhoon')&&r.hand.length>=3,'drew to 4, then MST took Mirage before the discard'+tag+': '+show(r)+' | hand '+r.hand);
 // Negative: no MST to escape the discard. Control: a full hand would draw nothing.
 r=play(seat,{cpu:{hand:['Mirage of Nightmare','Dark Hole']}});never(r,'activate Mirage of Nightmare');
 // (Tribute monsters it cannot summon: Traps would be Set first and leave the hand small, which is a real Mirage hand.)
 r=play(seat,{cpu:{hand:['Mirage of Nightmare','Mystical Space Typhoon','Jinzo','Summoned Skull','Dark Magician']}});never(r,'activate Mirage of Nightmare');

 // 2. Magical Scientist's Level 5-6 Fusions run over the monster our attackers cannot beat (only TER was ever chosen).
 r=play(seat,{cpu:{field:['Magical Scientist'],extra:EXTRA},opp:{field:['Vorse Raider']}});
 has(r,'activate Magical Scientist');ok(r.theirGrave.includes('Vorse Raider'),'a 2100 Fusion destroys Vorse Raider'+tag+': '+show(r));
 ok(r.extra.length===EXTRA.length,'the Fusion is back in the Extra Deck after the End Phase'+tag+': '+r.extra);
 // Negative: 1000 LP is too much below 4000 LP, and a floater (Mystic Tomato) replaces itself.
 r=play(seat,{cpu:{field:['Magical Scientist'],extra:EXTRA},opp:{field:['Vorse Raider']},lp:[8000,3500]});never(r,'activate Magical Scientist');
 r=play(seat,{cpu:{field:['Magical Scientist'],extra:EXTRA},opp:{field:['Mystic Tomato']}});never(r,'activate Magical Scientist');
 // Control: Thousand-Eyes Restrict still comes first when it can take the monster.
 r=play(seat,{cpu:{field:['Magical Scientist'],extra:['Thousand-Eyes Restrict',...EXTRA]},opp:{field:['Vorse Raider']}});
 has(r,'activate Magical Scientist');ok(r.picks.includes('Thousand-Eyes Restrict'),'TER absorbs Vorse Raider'+tag+': '+r.picks);

 // 3. Scientist into Creature Swap: the weakest Fusion is handed over and goes back to our Extra Deck at the End Phase,
 // so their Summoned Skull (out of the Fusions' reach) stays ours.
 r=play(seat,{cpu:{field:['Magical Scientist'],hand:['Creature Swap'],extra:EXTRA},opp:{field:['Summoned Skull']}});
 has(r,'activate Magical Scientist');has(r,'activate Creature Swap');
 ok(r.field.includes('Summoned Skull')&&r.field.includes('Magical Scientist'),'Summoned Skull taken, Scientist kept'+tag+': '+show(r));
 // It is theirs no more by their turn: back in our Extra Deck, or in our Graveyard when our own attack destroyed it.
 ok(!r.turnEnd.some(n=>EXTRA.includes(n))&&r.extra.length+r.grave.filter(n=>EXTRA.includes(n)).length===EXTRA.length,'the handed-over Fusion is gone'+tag+': '+r.turnEnd+' / '+r.extra+' / '+r.grave);
 // Negative: a Set monster beside it could be what they hand over. Control: no Creature Swap, nothing to pay 1000 LP for.
 r=play(seat,{cpu:{field:['Magical Scientist'],hand:['Creature Swap'],extra:EXTRA},opp:{field:['Summoned Skull',['Kuriboh','s']]}});never(r,'activate Magical Scientist');
 r=play(seat,{cpu:{field:['Magical Scientist'],extra:EXTRA},opp:{field:['Summoned Skull']}});never(r,'activate Magical Scientist');

 // 4. Revive a body to pay Jinzo's Tribute when nothing in the Graveyard beats their monster alone: Monster Reborn on
 // Tribe-Infecting Virus, then Jinzo over Skilled Dark Magician (the field stayed empty, deck trace 2026-11-22).
 r=play(seat,{cpu:{hand:['Monster Reborn','Jinzo'],grave:['Tribe-Infecting Virus']},opp:{field:['Skilled Dark Magician']}});
 has(r,'activate Monster Reborn');has(r,'summon Jinzo');ok(r.theirGrave.includes('Skilled Dark Magician'),'Jinzo destroys it'+tag+': '+show(r));
 // Negative: Summoned Skull in the Graveyard beats it alone: revive it and keep it. Control: no Jinzo, no revive.
 r=play(seat,{cpu:{hand:['Monster Reborn','Jinzo'],grave:['Summoned Skull']},opp:{field:['Skilled Dark Magician']}});
 has(r,'activate Monster Reborn');never(r,'summon Jinzo');ok(r.field.includes('Summoned Skull'),'Summoned Skull kept'+tag+': '+show(r));
 r=play(seat,{cpu:{hand:['Monster Reborn'],grave:['Tribe-Infecting Virus']},opp:{field:['Skilled Dark Magician']}});never(r,'activate Monster Reborn');

 // 5. Scores. Pot of Greed is not discard fodder while Spells can be played (Graceful Charity threw away a fresh copy).
 {
  const p=seat,hand=[card('Pot of Greed',L.HAND,p,0,10),card('Mirage of Nightmare',L.HAND,p,1,10),card('Torrential Tribute',L.HAND,p,2,10)];
  const s=smartContext(stub(p,{hand},{}),p,L);
  ok(s.handLoss(hand[0])>s.handLoss(hand[1])+2000&&s.handLoss(hand[0])>s.handLoss(hand[2])+2000,'Pot of Greed is discarded last'+tag);
  const canceller=smartContext(stub(p,{hand},{mzone:[card('Spell Canceller',L.MZONE,o,0,1)]}),p,L);
  ok(canceller.handLoss(hand[0])===canceller.handLoss(hand[1]),'control: under Spell Canceller it is one more Spell'+tag);
 }
 // A Scientist Fusion is the first Tribute and the first gift for Creature Swap; unmarked, the stronger monster is kept.
 {
  const p=seat,vorse=card('Vorse Raider',L.MZONE,p,0,1),eagle=card('Punished Eagle',L.MZONE,p,1,1),scientist=card('Magical Scientist',L.MZONE,p,2,1);
  const mark=on=>({returnsAtEnd:c=>on&&c.sequence===1&&c.controller===p&&c.location===L.MZONE});
  const marked=smartContext(stub(p,{mzone:[vorse,eagle,scientist]},{mzone:[card('Summoned Skull',L.MZONE,o,0,1)]},{...mark(true),materialSubject:id('Jinzo')}),p,L);
  const plain=smartContext(stub(p,{mzone:[vorse,eagle,scientist]},{mzone:[card('Summoned Skull',L.MZONE,o,0,1)]},{...mark(false),materialSubject:id('Jinzo')}),p,L);
  ok(marked.tributeAdj(eagle)>marked.tributeAdj(vorse),'the returning Fusion pays the Tribute'+tag);
  ok(!(plain.tributeAdj(eagle)>plain.tributeAdj(vorse)),'control: an ordinary Punished Eagle gets no preference'+tag);
  const swap={effect:{code:id('Creature Swap'),player:p}};
  const ms=smartContext(stub(p,{mzone:[eagle,scientist]},{mzone:[card('Summoned Skull',L.MZONE,o,0,1)]},{...mark(true),...swap}),p,L);
  const ps=smartContext(stub(p,{mzone:[eagle,scientist]},{mzone:[card('Summoned Skull',L.MZONE,o,0,1)]},{...mark(false),...swap}),p,L);
  ok(ms.targetScore('Creature Swap',eagle,{})>ms.targetScore('Creature Swap',scientist,{}),'Creature Swap hands over the returning Fusion'+tag);
  ok(ps.targetScore('Creature Swap',scientist,{})>ps.targetScore('Creature Swap',eagle,{}),'control: otherwise the 300 ATK Scientist goes'+tag);
 }
}
e.destroy();
console.log(`PASS World Championship deck Nov 22: ${checks} checks`);
