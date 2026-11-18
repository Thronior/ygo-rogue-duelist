// Jin Trio and its fusion Ultimate Gate Combination (the user's design, 2026-11-18), in real-core duels.
// Jin Trio: Sanga of the Thunder, Kazejin and Suijin get one effect per trio card you control:
//  1: the monster they attack has 0 ATK in the Damage Step; 2: a Quick Effect in the opponent's turn negates a monster
//  effect or Spell and returns that card to the hand; 3: Special Summon Gate Guardian from the Deck.
// Ultimate Gate Combination: all three always (Gate Guardian too), and the trio starts in the hand.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const runScript=artifacts=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),0))',JSON.stringify({curses:[],artifacts,cursed_artifacts:[],challenge_level:0}));
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
for(const name of ['Jin Trio','Ultimate Gate Combination'])ok(Object.values(meta.artifacts).some(a=>a[0]===name),name+' is in content.json');

const SANGA=id('Sanga of the Thunder'),KAZEJIN=id('Kazejin'),SUIJIN=id('Suijin'),GATE=id('Gate Guardian');
const BEWD=id('Blue-Eyes White Dragon'),HORSE=id('Mystic Horseman'),POT=id('Pot of Greed'),OX=id('Battle Ox');
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
const cards=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code));
const count=(e,p,loc,code)=>cards(e,p,loc,code).length;
// Player 0's listed Deck cards go face-up to the field at the start; `later` puts player 1's cards on their field at
// the start of turn 3 (the first turn player 0 can attack).
const field=(mine,later=[])=>`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() for _,code in ipairs({${mine.join(',')}}) do local c=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK,0,nil,code) if c then Duel.MoveToField(c,0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end end end) Duel.RegisterEffect(e,0) end
do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_MAIN1)
e:SetCondition(function() return Duel.GetTurnCount()==3 end)
e:SetOperation(function(e) e:Reset() for _,code in ipairs({${later.join(',')}}) do local c=Duel.GetFirstMatchingCard(Card.IsCode,1,LOCATION_DECK,0,nil,code) if c then Duel.MoveToField(c,1,1,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end end end) Duel.RegisterEffect(e,0) end`;
async function duel({script,deck,enemy,turns,drive,onMessage}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 if(onMessage)e.onMessage=onMessage;
 let s=e.start(deck,enemy,8000,8000,5,7,[],[],script);
 for(let i=0;i<6000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;const answer=drive(e,m);s=e.respond(answer||e.auto())}
 same(e.errors||[],[],'no script errors');
 return e;
}

// 1: Kazejin alone attacks Blue-Eyes White Dragon (3000). With the relic Blue-Eyes has 0 ATK, so the opponent takes 2400.
async function attack(artifacts,attacker=KAZEJIN){
 let attacked=false;
 const e=await duel({script:field([attacker],[BEWD])+'\n'+runScript(artifacts),deck:[attacker,...fill(OX).slice(1)],enemy:[BEWD,...fill(HORSE).slice(1)],turns:3,drive(e,m){
  if(m.player!==0)return null;
  if(e.turn<3&&m.type===M.SELECT_IDLECMD)return {type:R.SELECT_IDLECMD,action:I.TO_EP,index:null};
  if(m.type===M.SELECT_IDLECMD)return {type:R.SELECT_IDLECMD,action:m.to_bp&&!attacked?I.TO_BP:I.TO_EP,index:null};
  if(m.type===M.SELECT_BATTLECMD){const a=(m.attacks||[]).findIndex(c=>c.code===attacker);if(!attacked&&a>=0){attacked=true;return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:a}}return {type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null}}
  if(m.type===M.SELECT_CARD&&(m.selects||[]).some(c=>c.code===BEWD))return {type:R.SELECT_CARD,indicies:[m.selects.findIndex(c=>c.code===BEWD)]};
  return null}});
 const out={attacked,opponentLP:e.lp?.[1]??e.state?.lp?.[1],kazejin:count(e,0,L.MZONE,attacker),bewd:count(e,1,L.MZONE,BEWD)};e.destroy();return out;
}
const hit=await attack(['jin_trio']);console.log('Jin Trio 1',hit);
ok(hit.attacked,'Kazejin attacked Blue-Eyes');
same([hit.opponentLP,hit.kazejin,hit.bewd],[5600,1,0],'the attacked monster has 0 ATK: Blue-Eyes is destroyed and the opponent takes 2400');
const plain=await attack([]);console.log('no relic',plain);
same([plain.kazejin,plain.bewd],[0,1],'without the relic Kazejin loses to Blue-Eyes');
const guardian=await attack(['ultimate_gate_combination'],GATE);console.log('Ultimate Gate Combination, Gate Guardian attacks',guardian);
same([guardian.opponentLP,guardian.bewd],[8000-3750,0],'the fusion: Gate Guardian also makes the attacked monster 0 ATK');

// 2: with two of the trio, each negates one Spell (Pot of Greed) in the opponent's turn and returns it to the hand.
async function negate(artifacts,mine){
 let used=0,returned=0;
 const e=await duel({onMessage(m){if(m.type===M.MOVE&&m.card===POT&&m.from?.location===L.SZONE&&m.to?.location===L.HAND)returned++},script:field(mine)+'\n'+runScript(artifacts),deck:[...mine,...fill(OX).slice(mine.length)],enemy:fill(POT),turns:2,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_CHAIN){const k=(m.selects||[]).findIndex(c=>mine.includes(c.code));if(k>=0){used++;return {type:R.SELECT_CHAIN,index:k}}return {type:R.SELECT_CHAIN,index:null}}
  if(m.type===M.SELECT_IDLECMD)return {type:R.SELECT_IDLECMD,action:I.TO_EP,index:null};
  if([M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(m.type))return {type:m.type===M.SELECT_YESNO?R.SELECT_YESNO:R.SELECT_EFFECTYN,yes:true};
  return null}});
 const out={used,returned};e.destroy();return out;
}
const two=await negate(['jin_trio'],[KAZEJIN,SUIJIN]);console.log('Jin Trio 2',two);
same(two.used,2,'two trio cards: one negation each in the opponent turn');
const one=await negate(['jin_trio'],[KAZEJIN]);console.log('Jin Trio, one card',one);
same(one.used,0,'one trio card: no negation');
const none=await negate([],[KAZEJIN,SUIJIN]);console.log('no relic',none);
same(two.returned,2,'each negated Pot of Greed goes back to the hand');
same(none.returned,0,'without the relic no Pot of Greed returns to the hand');

// 3: with all three, Special Summon Gate Guardian from the Deck once per turn. The fusion does it with Kazejin alone.
async function gate(artifacts,mine){
 let offered=false;
 // The test's own placement runs first: the fusion's opening would otherwise take Kazejin from the Deck to the hand.
 const e=await duel({script:field(mine)+'\n'+runScript(artifacts),deck:[...mine,...fill(GATE).slice(mine.length)],enemy:fill(HORSE),turns:1,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){const k=(m.activates||[]).findIndex(c=>mine.includes(c.code));if(k>=0&&!offered){offered=true;return {type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}}return {type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}}
  return null}});
 const out={offered,gate:count(e,0,L.MZONE,GATE)};e.destroy();return out;
}
const three=await gate(['jin_trio'],[SANGA,KAZEJIN,SUIJIN]);console.log('Jin Trio 3',three);
same([three.offered,three.gate],[true,1],'three trio cards: Gate Guardian is Special Summoned from the Deck');
const twoOnly=await gate(['jin_trio'],[KAZEJIN,SUIJIN]);console.log('Jin Trio, two cards',twoOnly);
same([twoOnly.offered,twoOnly.gate],[false,0],'two trio cards: no Gate Guardian summon');
const fusedGate=await gate(['ultimate_gate_combination'],[KAZEJIN]);console.log('Ultimate Gate Combination',fusedGate);
same([fusedGate.offered,fusedGate.gate],[true,1],'the fusion: Kazejin alone summons Gate Guardian');
const fusedNegate=await negate(['ultimate_gate_combination'],[KAZEJIN]);console.log('Ultimate Gate Combination negate',fusedNegate);
same(fusedNegate.used,1,'the fusion: Kazejin alone negates once');

// The fusion's opening: Sanga, Kazejin and Suijin are in the hand at the start of the Duel.
async function opening(artifacts){
 let hand=null;
 const e=await duel({script:runScript(artifacts),deck:[SANGA,KAZEJIN,SUIJIN,...fill(OX).slice(3)],enemy:fill(HORSE),turns:1,drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&!hand)hand=[SANGA,KAZEJIN,SUIJIN].map(c=>count(e,0,L.HAND,c));
  if(m.player===0&&m.type===M.SELECT_IDLECMD)return {type:R.SELECT_IDLECMD,action:I.TO_EP,index:null};
  return null}});
 e.destroy();return hand;
}
same(await opening(['ultimate_gate_combination']),[1,1,1],'the fusion adds Sanga, Kazejin and Suijin to the starting hand');
console.log('PASS Jin Trio and Ultimate Gate Combination,',checks,'checks');
process.exit(0);
