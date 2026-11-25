// Player reports of 2026-11-25 that an earlier review could not reproduce.
// MonkehestMan (Discord 00:41Z): Ms. Judge negated a whole chain of Premature Burial plus a chained Trap Monster. In the
//   engine it negates only the link resolving first and its once-per-turn use is spent, also when its coins miss; the
//   checks below guard that. (No replay of that duel was uploaded in the 2026-11-25 export.)
// TRUANT (Discord 09:23Z, a Draft match): the Ordeal of a Traveler call was not in the duel log. PvP snapshots sent an
//   empty log; each seat now gets the log, seat 1 with "You" and "Opponent" swapped (tag-duel.js seatLogs).
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,I,B,L,R} from './web/duel.js';
import {TagDuel,seatLogs} from './web/tag-duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const all=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
const add=(n,p,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${p},${p},LOCATION_${loc},${seq},POS_${pos})\n`;
const field=body=>{let s='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+body;for(const p of [0,1])for(let i=0;i<10;i++)s+=add('Kuriboh',p,'DECK','FACEDOWN');return s+'Debug.ReloadFieldEnd()\n'};
// Every coin lands on heads, so Ms. Judge's two-heads negation always succeeds when it is applied.
const heads='\nlocal toss=Duel.TossCoin Duel.TossCoin=function(p,n) local r={toss(p,n)} for i=1,#r do r[i]=1 end return table.unpack(r) end\n';

// Ms. Judge: Premature Burial (chain link 1) with Embodiment of Apophis chained (link 2).
{
 const e=await new MobileDuel(all).init([data,scripts]);
 for(const coins of [heads,'']){
  e.start([],[],8000,8000,0,7,[],[],field(add('Ms. Judge',1,'MZONE','FACEUP_ATTACK',2)+add('Summoned Skull',0,'GRAVE','FACEUP')+add('Premature Burial',0,'HAND','FACEDOWN')+add('Embodiment of Apophis',0,'SZONE','FACEDOWN',1))+coins,0);
  e.core.startDuel(e.h);e.advance();
  const seen=e.onMessage.bind(e),trace=[];e.onMessage=m=>{if([M.CHAINING,M.TOSS_COIN,M.CHAIN_DISABLED,M.CHAIN_NEGATED].includes(m.type))trace.push([m.type,m.chain_size,m.code&&e.name(m.code)]);return seen(m)};
  let used=false,chained=false;
  try{for(let i=0;i<60&&e.pending&&e.turn<2;i++){const m=e.pending;
   if(m.player===0&&m.type===M.SELECT_IDLECMD&&!used){const k=m.activates.findIndex(c=>e.name(c.code)==='Premature Burial');if(k>=0){used=true;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});continue}}
   if(m.player===0&&m.type===M.SELECT_IDLECMD){e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
   if(m.player===0&&m.type===M.SELECT_CHAIN&&!chained){const k=m.selects.findIndex(c=>e.name(c.code)==='Embodiment of Apophis');if(k>=0){chained=true;e.respond({type:R.SELECT_CHAIN,index:k});continue}}
   e.respond(e.auto(m))}}finally{e.onMessage=seen}
  const links=trace.filter(x=>x[0]===M.CHAINING).map(x=>x[2]),negated=trace.filter(x=>x[0]===M.CHAIN_DISABLED||x[0]===M.CHAIN_NEGATED).map(x=>x[1]);
  const monsters=e.query(0,L.MZONE).filter(Boolean).map(c=>e.name(c.code));
  ok(used&&chained&&links.join()==='Premature Burial,Embodiment of Apophis','Premature Burial, then Embodiment of Apophis chained ('+links+')');
  ok(trace.filter(x=>x[0]===M.TOSS_COIN).length===1,'Ms. Judge tosses for one link only');
  if(coins){
   ok(negated.join()==='2','with two heads only chain link 2 is negated (negated: '+negated+')');
   ok(monsters.includes('Summoned Skull')&&!monsters.includes('Embodiment of Apophis'),'Premature Burial still revives Summoned Skull ('+monsters+')');
  }else ok(monsters.includes('Summoned Skull'),'a missed toss spends the use: Premature Burial resolves ('+monsters+')');
 }
 e.destroy();
}

// Ordeal of a Traveler: the attacker's call is in the duel log (solo), and in PvP for both seats.
const ordeal=(e,start)=>{
 start();
 let called=null;
 for(let i=0;i<200&&e.pending&&e.turn<4&&!e.finished;i++){const m=e.pending;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){e.respond(e.turn===3&&m.to_bp?{type:R.SELECT_IDLECMD,action:I.TO_BP,index:null}:{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  if(m.player===0&&m.type===M.SELECT_BATTLECMD){e.respond(m.attacks.length&&called===null?{type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0}:{type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null});continue}
  if(m.player===0&&m.type===M.SELECT_OPTION&&e.name(e.effect?.code)==='Ordeal of a Traveler'){called=1;e.respond({type:R.SELECT_OPTION,index:1});continue}
  if(m.player===0&&m.type===M.SELECT_CHAIN){e.respond({type:R.SELECT_CHAIN,index:null});continue}
  if(m.player===1&&m.type===M.SELECT_CHAIN){const k=m.selects.findIndex(c=>e.name(c.code)==='Ordeal of a Traveler');if(k>=0){e.respond({type:R.SELECT_CHAIN,index:k});continue}if(!m.forced){e.respond({type:R.SELECT_CHAIN,index:null});continue}}
  if(m.player===1&&m.type===M.SELECT_EFFECTYN&&e.name(m.code)==='Ordeal of a Traveler'){e.respond({type:R.SELECT_EFFECTYN,yes:true});continue}
  if(m.player===1&&m.type===M.SELECT_IDLECMD){e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  e.respond(e.auto(m))}
 return called;
};
const board=field(add('Summoned Skull',0,'MZONE','FACEUP_ATTACK',2)+add('Ordeal of a Traveler',1,'SZONE','FACEUP',1)+add('Blue-Eyes White Dragon',1,'HAND','FACEDOWN')+add('Blue-Eyes White Dragon',1,'HAND','FACEDOWN'));
{
 const e=await new MobileDuel(all).init([data,scripts]);
 const called=ordeal(e,()=>{e.start([],[],8000,8000,0,3,[],[],board,0);e.core.startDuel(e.h);e.advance()});
 ok(called===1,'solo: the player is asked to call a card type for Ordeal of a Traveler');
 ok(e.logs.includes('You guessed Spell')&&e.logs.includes('Ordeal revealed Blue-Eyes White Dragon'),'solo: the call and the revealed card are in the log');
 e.destroy();
}
{
 const e=await new TagDuel(all).init([data,scripts]);const deck={main:Array(40).fill(id('Kuriboh'))};
 const called=ordeal(e,()=>{e.startTag({mode:'pvp',teams:[[deck],[deck]],lp:8000,enemyLP:8000,draw:0,enemyDraw:0,seed:3,passives:board,rules:2});e.core.startDuel(e.h);e.advance()});
 ok(called===1,'PvP: seat 0 calls a card type for seat 1\'s Ordeal of a Traveler');
 const mine=e.snapshotFor(0).tag.ui.logs,theirs=e.snapshotFor(1).tag.ui.logs;
 ok(mine.includes('You guessed Spell')&&mine.includes('Ordeal revealed Blue-Eyes White Dragon'),'PvP seat 0 log has the call ('+mine.slice(0,6).join(' | ')+')');
 ok(theirs.includes('Opponent guessed Spell')&&theirs.includes('Ordeal revealed Blue-Eyes White Dragon'),'PvP seat 1 log has the call from its side ('+theirs.slice(0,6).join(' | ')+')');
 ok(mine.includes('Turn 3 · Your turn')&&theirs.includes('Turn 3 · Opponent’s turn'),'turn lines follow each seat');
 e.destroy();
}
// The side swap, line by line, and only once per line.
assert.deepEqual(seatLogs(['Turn 2 · Your turn','Turn 3 · Opponent’s turn','You take 500 LP.','Opponent pays 800 LP.','You recover 300 LP.','Opponent Special Summons Summoned Skull.','You Tribute Summon Blue-Eyes White Dragon.','You · Hand shuffled','Opponent · Ms. Judge — chose Heads','Opponent guessed Trap','Ordeal revealed Kuriboh','Kuriboh activates.'],1),
 ['Turn 2 · Opponent’s turn','Turn 3 · Your turn','Opponent takes 500 LP.','You pay 800 LP.','Opponent recovers 300 LP.','You Special Summon Summoned Skull.','Opponent Tribute Summons Blue-Eyes White Dragon.','Opponent · Hand shuffled','You · Ms. Judge — chose Heads','You guessed Trap','Ordeal revealed Kuriboh','Kuriboh activates.']);checks++;
assert.deepEqual(seatLogs(['You take 500 LP.'],0),['You take 500 LP.']);checks++;
console.log(`PASS repro Nov 25b (${checks} checks): Ms. Judge negates one chain link, Ordeal call in the solo and PvP duel logs`);
