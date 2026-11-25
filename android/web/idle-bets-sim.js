// Duel Bets (incremental minigame): plays one whole CPU vs CPU duel in the real core ahead of time and
// returns a compact timeline that a board replays slowly. Nothing here touches the DOM, so the same code
// runs in the browser worker (idle-bets-worker.js) and in Node tests.
//
// Timeline: {v, seed, seats:[{id,tier}], winner (0|1, 2 = draw), reason, turns, frames}
// Each frame is [events, board?]. board (only when it changed) is two player rows:
//   [lp, hand, deck, grave, m0..m4, s0..s5, graveTop, extra, banished]
//   monster = 0 | [code, atk, def, pos]  spell = 0 | [code (0 while set), faceUp]  (s5 = field zone)
// Events: ['t',p] turn · ['s',p,code,seq] summon · ['f',p,code,seq] fusion summon · ['a',p,seq,targetSeq]
//   attack (targetSeq -1 = direct) · ['l',p,amount] LP change · ['x',p,code] destroyed · ['c',p,code,kind]
//   activation (kind 1 monster, 2 spell, 4 trap)
import {shuffleCPUDeck as shuffle} from './cpu-deck-model.js';
export const TIMELINE_VERSION=2;
const NEUTRAL_PASSIVES='-- SHADOW_RUN_RNG 2\nif Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end';
const MZONE=4,SZONE=8,GRAVE=0x10;

const monster=c=>c?[c.code,c.attack|0,c.defense|0,c.position|0]:0;
const spell=c=>c?[(c.position&5)?c.code:0,(c.position&5)?1:0]:0;
const count=x=>Array.isArray(x)?x.filter(Boolean).length:(x|0);
export function boardRow(p,s){const pl=s.players[p],grave=Array.isArray(pl.grave)?pl.grave.filter(Boolean):[];return [s.lp[p],count(pl.hand),count(pl.deck),grave.length,...[0,1,2,3,4].map(i=>monster(pl.monsters[i])),...[0,1,2,3,4,5].map(i=>spell(pl.spells[i])),grave.at(-1)?.code||0,count(pl.extra),count(pl.banished)]}

function cardKind(engine,code){const t=Number(engine.data?.[Number(code)]?.type)||0;return t&4?4:t&2?2:1}
function events(engine,visuals){const out=[];
 for(const v of visuals){
  if(v.kind==='turn')out.push(['t',v.player]);
  else if(v.kind==='summon'&&v.card)out.push(['s',v.card.controller,Number(v.code),v.card.sequence]);
  else if(v.kind==='fusion-summon'&&v.card)out.push(['f',v.card.controller,Number(v.code),v.card.sequence]);
  else if(v.kind==='attack'&&v.card)out.push(['a',v.card.controller,v.card.sequence,v.target?v.target.sequence:-1]);
  else if(v.kind==='lp'&&v.amount)out.push(['l',v.player,v.amount]);
  else if(v.kind==='chain'&&v.stage==='activate'&&v.card)out.push(['c',v.card.controller,Number(v.code),cardKind(engine,v.code)]);
  else if(v.kind==='move'&&(v.reason&1)&&v.from?.location===MZONE&&v.to?.location===GRAVE)out.push(['x',v.from.controller,Number(v.code)||0]);
 }
 return out}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// decks: [{main,extra}, {main,extra}] · seats: [{id,tier},{id,tier}] (kept for the board's labels).
// No turn limit: duels run until someone wins (deck-out ends the longest ones). maxDecisions only stops a
// duel the core would loop forever (none seen), which then counts as a draw.
export function recordDuel(engine,decks,seats,seed,{maxDecisions=100000}={}){
 seed>>>=0;
 let state=engine.start(shuffle(decks[0].main,seed,0),shuffle(decks[1].main,seed,1),8000,8000,5,seed,decks[0].extra||[],decks[1].extra||[],NEUTRAL_PASSIVES);
 const frames=[];let last=null,decisions=0;
 const capture=()=>{
  const ev=events(engine,engine.visuals.splice(0));
  const board=[boardRow(0,state),boardRow(1,state)];
  const changed=!last||!same(board,last);
  if(ev.length||changed){frames.push(changed?[ev,board]:[ev]);last=board}
 };
 try{
  capture();
  while(!state.finished&&decisions<maxDecisions){state=engine.respond(engine.auto());decisions++;capture()}
  const fin=state.finished,winner=fin&&(fin.player===0||fin.player===1)?fin.player:2;
  return {v:TIMELINE_VERSION,seed,seats,winner,reason:fin?Number(fin.reason)||0:3,turns:state.turn,frames};
 }finally{try{engine.destroy()}catch{}}
}

// Win reasons worth a jackpot. 16/20/31/33 are the Exodia family, 21 Destiny Board.
export const EXODIA_REASONS=[16,20,31,33],DESTINY_REASONS=[21];
export const winKind=t=>EXODIA_REASONS.includes(t.reason)?'exodia':DESTINY_REASONS.includes(t.reason)?'destiny':t.reason===2?'deckout':t.reason>=16?'special':'lp';
