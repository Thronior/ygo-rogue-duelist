// Gozaburo's Exodia Necross deck (user, 2026-11-23): an Exodia Necross deck wants the five pieces in the Graveyard,
// so they are its first discards and costs, Exodia Necross and Contract with Exodia are kept, Painful Choice and Foolish
// Burial send pieces, Contract with Exodia is Set before Card Destruction discards the rest, and four pieces in hand go
// back to the classic win. Both seats, each with a negative or control case. Harnesses from
// test_world_championship_deck_nov22.mjs (real core with Debug.AddCard, and the smartContext stub).
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
  if(m.type===M.SELECT_IDLECMD){const l={[I.SELECT_SUMMON]:['summon',m.summons],[I.SELECT_SPECIAL_SUMMON]:['special',m.special_summons],[I.SELECT_MONSTER_SET]:['set',m.monster_sets],[I.SELECT_SPELL_SET]:['sset',m.spell_sets],[I.SELECT_ACTIVATE]:['activate',m.activates],[I.SELECT_POS_CHANGE]:['flip',m.pos_changes]}[r.action];if(l)steps.push(`${l[0]} ${e.name(l[1][r.index].code)}`);}
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
 const z={};for(const side of [0,1]){const deck=zones[side].deck||Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
  z[side]={[L.MZONE]:zone(L.MZONE,zones[side].mzone),[L.SZONE]:zone(L.SZONE,zones[side].szone),[L.HAND]:zones[side].hand||[],[L.DECK]:deck,[L.GRAVE]:zones[side].grave||[],[L.EXTRA]:zones[side].extra||[]}}
 s.query=(side,loc)=>z[side]?.[loc]||[];s.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length};
 return s;
}
let r;
const PIECES=['Exodia the Forbidden One','Right Leg of the Forbidden One','Right Arm of the Forbidden One','Left Leg of the Forbidden One','Left Arm of the Forbidden One'];
const pieces=l=>l.filter(n=>PIECES.includes(n)).length;
for(const seat of [1,0]){
 const o=1-seat,tag=` (seat ${seat})`;
 // 1. Painful Choice picks the five pieces: the opponent hands one back, four go to the Graveyard (never played before).
 r=play(seat,{cpu:{hand:['Painful Choice','Exodia Necross'],deck:PIECES}});
 has(r,'activate Painful Choice');ok(pieces(r.grave)===4&&pieces(r.hand)+pieces(r.field)===1,'four pieces sent, one returned (kept or Set as a blocker)'+tag+': '+r.grave+' / '+r.hand+' / '+r.field);
 // Negative: one piece left in the Deck is a Foolish Burial job. Control: no Necross or Contract, no Necross plan.
 r=play(seat,{cpu:{hand:['Painful Choice','Exodia Necross'],deck:PIECES.slice(0,1),grave:PIECES.slice(1)}});never(r,'activate Painful Choice');
 r=play(seat,{cpu:{hand:['Painful Choice'],deck:PIECES}});ok(pieces(r.grave)===0,'no Necross plan: pieces stay out of the Graveyard'+tag+': '+r.grave);
 // 2. Foolish Burial sends the last piece; Contract with Exodia then brings out Exodia Necross.
 r=play(seat,{cpu:{hand:['Foolish Burial','Contract with Exodia','Exodia Necross'],deck:PIECES.slice(0,1),grave:PIECES.slice(1)}});
 has(r,'activate Foolish Burial');has(r,'activate Contract with Exodia');ok(r.field.includes('Exodia Necross'),'Necross summoned'+tag+': '+show(r));
 // Negative: every piece already in the Graveyard, nothing for Foolish Burial to send.
 r=play(seat,{cpu:{hand:['Foolish Burial'],grave:PIECES,deck:['Exodia Necross']}});never(r,'activate Foolish Burial');
 // 3. Discard costs pay with pieces; Necross and Contract are kept. Control: a classic Exodia hand keeps its pieces.
 r=play(seat,{cpu:{hand:['Graceful Charity','Left Arm of the Forbidden One','Right Arm of the Forbidden One','Exodia Necross','Contract with Exodia']}});
 has(r,'activate Graceful Charity');ok(r.grave.includes('Left Arm of the Forbidden One')&&r.grave.includes('Right Arm of the Forbidden One'),'both arms discarded'+tag+': '+r.grave);
 ok(r.hand.includes('Exodia Necross')&&r.hand.includes('Contract with Exodia'),'Necross and Contract kept'+tag+': '+r.hand);
 r=play(seat,{cpu:{hand:['Graceful Charity','Left Arm of the Forbidden One','Right Arm of the Forbidden One']}});
 ok(pieces(r.grave)===0,'classic Exodia: no piece discarded'+tag+': '+r.grave);
 // 4. Card Destruction: Contract with Exodia is Set first, then the pieces are discarded (user, 2026-11-23).
 r=play(seat,{cpu:{hand:['Card Destruction','Contract with Exodia','Left Arm of the Forbidden One','Right Arm of the Forbidden One'],deck:['Exodia Necross']}});
 ok(r.steps.indexOf('activate Card Destruction')>r.steps.indexOf('sset Contract with Exodia')&&r.steps.includes('sset Contract with Exodia'),'Contract Set, then Card Destruction'+tag+': '+r.steps.join(' > '));
 ok(!r.grave.includes('Contract with Exodia')&&r.back.includes('Contract with Exodia')&&pieces(r.grave)===2,'Contract kept, arms in the Graveyard'+tag+': '+r.grave+' / '+r.back);
 // Negative: Exodia Necross cannot be Set, so Card Destruction waits. Control: pieces only, straight away.
 r=play(seat,{cpu:{hand:['Card Destruction','Exodia Necross','Left Arm of the Forbidden One'],deck:['Contract with Exodia']}});never(r,'activate Card Destruction');
 r=play(seat,{cpu:{hand:['Card Destruction','Left Arm of the Forbidden One','Right Arm of the Forbidden One'],deck:['Exodia Necross']}});has(r,'activate Card Destruction');never(r,'sset Contract with Exodia');

 // 5. Nothing else to Set: a piece is Set as a blocker, and reaches the Graveyard when it is destroyed (four pieces and
 // Necross sat in a hand on an empty field). Control: a classic Exodia hand never Sets a piece.
 r=play(seat,{cpu:{hand:['Left Arm of the Forbidden One','Exodia Necross']},opp:{field:['Battle Ox']}});
 has(r,'set Left Arm of the Forbidden One');
 r=play(seat,{cpu:{hand:['Left Arm of the Forbidden One','Right Arm of the Forbidden One']},opp:{field:['Battle Ox']}});
 never(r,'set Left Arm of the Forbidden One');never(r,'set Right Arm of the Forbidden One');

 // 6. Scores.
 {
  const p=seat,h=(n,i)=>card(n,L.HAND,p,i,10);
  const necross=smartContext(stub(p,{hand:[h('Exodia Necross',0),h('Left Leg of the Forbidden One',1),h('Mystical Space Typhoon',2)]},{}),p,L);
  ok(necross.necrossPlan&&necross.handLoss(h('Left Leg of the Forbidden One',1))<necross.handLoss(h('Mystical Space Typhoon',2))-10000,'a piece is the first discard'+tag);
  ok(necross.handLoss(h('Exodia Necross',0))>necross.handLoss(h('Mystical Space Typhoon',2))+10000,'Necross is the last'+tag);
  // Only a deck with Exodia Necross in it (user, 2026-11-23): Contract with Exodia alone keeps the classic rules, and a
  // Necross on the field still counts.
  const contractOnly=smartContext(stub(p,{hand:[h('Contract with Exodia',0),h('Left Leg of the Forbidden One',1)]},{}),p,L);
  ok(!contractOnly.necrossPlan&&contractOnly.handLoss(h('Left Leg of the Forbidden One',1))>=100000,'Contract alone: classic Exodia'+tag);
  const onField=smartContext(stub(p,{mzone:[card('Exodia Necross',L.MZONE,p,0,1)],hand:[h('Left Leg of the Forbidden One',1)]},{}),p,L);
  ok(onField.necrossPlan,'Necross on the field: still a Necross deck'+tag);
  // Four pieces in hand: one draw from the classic win, so they are kept again.
  const four=smartContext(stub(p,{hand:[h('Exodia Necross',0),...PIECES.slice(0,4).map((n,i)=>h(n,i+1))]},{}),p,L);
  ok(!four.necrossPlan&&four.handLoss(h(PIECES[0],1))>=100000,'four pieces: classic win'+tag);
  // A searcher brings Exodia Necross first, then a piece; with Necross in hand, the piece.
  const witch={effect:{code:id('Witch of the Black Forest'),player:p},selectionHint:506};
  const deckCard=(n,i)=>card(n,L.DECK,p,i,10);
  const none=smartContext(stub(p,{hand:[h('Contract with Exodia',0)],deck:[deckCard('Exodia Necross',0),deckCard('Left Arm of the Forbidden One',1)]},{},witch),p,L),held=smartContext(stub(p,{hand:[h('Exodia Necross',0)]},{},witch),p,L);
  ok(none.targetScore('Witch of the Black Forest',deckCard('Exodia Necross',0),{})>none.targetScore('Witch of the Black Forest',deckCard('Left Arm of the Forbidden One',1),{}),'Witch fetches Necross first'+tag);
  ok(held.targetScore('Witch of the Black Forest',deckCard('Left Arm of the Forbidden One',1),{})>held.targetScore('Witch of the Black Forest',deckCard('Exodia Necross',0),{}),'with Necross in hand, a piece'+tag);
  // Magician of Faith takes back Painful Choice with two pieces left in the Deck, over Graceful Charity; with none left,
  // the old choice stands (no Necross bonus).
  const mof={effect:{code:id('Magician of Faith'),player:p}},gy=(n,i)=>card(n,L.GRAVE,p,i,5);
  const deckWith=list=>list.map((n,i)=>deckCard(n,i));
  const live=smartContext(stub(p,{hand:[h('Exodia Necross',0)],deck:deckWith(['Left Arm of the Forbidden One','Right Arm of the Forbidden One','Battle Ox'])},{},mof),p,L);
  const done=smartContext(stub(p,{hand:[h('Exodia Necross',0)],deck:deckWith(['Battle Ox','Battle Ox','Battle Ox'])},{},mof),p,L);
  ok(live.targetScore('Magician of Faith',gy('Painful Choice',0),{})>live.targetScore('Magician of Faith',gy('Graceful Charity',1),{}),'Magician of Faith takes back Painful Choice'+tag);
  ok(!(done.targetScore('Magician of Faith',gy('Painful Choice',0),{})>=2000000),'control: no pieces left, no Painful Choice bonus'+tag);
  // Their Painful Choice: hand them the Exodia piece, which keeps it out of their Graveyard.
  // Only against a Necross deck: a classic Exodia deck would keep the piece for its win.
  const theirs=(n,i)=>card(n,L.DECK,o,i,10),pc={effect:{code:id('Painful Choice'),player:o}};
  const giver=smartContext(stub(p,{},{hand:[card('Exodia Necross',L.HAND,o,0,10)]},pc),p,L),classic=smartContext(stub(p,{},{},pc),p,L);
  ok(giver.targetScore('Painful Choice',theirs('Left Arm of the Forbidden One',0),{})>giver.targetScore('Painful Choice',theirs('Exodia Necross',1),{}),'their piece goes to their hand'+tag);
  ok(!(classic.targetScore('Painful Choice',theirs('Left Arm of the Forbidden One',0),{})>=1000000),'control: a classic Exodia deck is not handed its piece'+tag);
 }
}
e.destroy();
console.log(`PASS Gozaburo Exodia Necross deck Nov 23: ${checks} checks`);
