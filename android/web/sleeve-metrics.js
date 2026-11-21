// Card sleeve feats (2026-11-12): what one duel did for the card-art sleeves in data/card-sleeves.json.
// Only the player's side (seat 0, the whole team in Tag) is observed. The duel reports one 'sleeve_metrics' event;
// sleeve_progress.py turns it into unlocks and lifetime counters. Cheap: plain counters, and the field is read only
// when a monster arrives on it or changes position.
import {M,L} from './engine.js';

const TYPE_MONSTER=0x1,TYPE_SPELL=0x2,TYPE_TRAP=0x4,TYPE_EQUIP=0x40000,TYPE_TOKEN=0x4000,TYPE_TOON=0x400000;
const RACE_DRAGON=0x2000,RACE_DIVINE=0x200000,ATTRIBUTE_LIGHT=0x10,ATTRIBUTE_DARK=0x20;
const REASON_DESTROY=0x1,REASON_RELEASE=0x2,REASON_SUMMON=0x10,REASON_BATTLE=0x20,REASON_DISCARD=0x4000;
// The core reports some card fields (race on the field) as BigInt; bit tests need plain numbers.
const bits=value=>Number(value||0);
const onField=location=>location===L.MZONE||location===L.SZONE;

export function sleeveMetrics(duel){
 return duel.sleeveMetrics??={draws:0,effectDamage:0,bestHit:0,banished:0,lightBanished:0,darkBanished:0,graveSpecials:0,dragonsByBattle:0,
  timeWizardWins:0,coinsTossed:0,diceRolled:0,coinStreak:0,bestCoinStreak:0,trapActivated:false,damageTaken:0,stolenFinish:false,tribute3:false,
  bestOneEffect:0,bestMirror:0,turnMonsters:0,bestTurnMonsters:0,turnSpells:0,bestTurnSpells:0,sameName:0,divine:0,toons:0,tokens:0,
  releases:0,link:null,
  // Cute sleeves (2026-11-15): weak summons, small finishers, LP gained and lifetime counts.
  summons:0,maxSummonAtk:0,weakFinish:false,ownBattleDestroyed:0,lpGained:0,spellActivated:false,
  flipSummons:0,directAttacks:0,bounced:0,spellsRecovered:0,faceDownDestroyed:0,
  // Deds' sleeves (2026-11-20): finishes by ATK or name, and lifetime counts of summons, costs and effects.
  bigFinish:false,lowFinish:false,dmgFinish:false,dmSummons:0,tributeSummons:0,toExtra:0,lpPaid:0,coinKills:0,flippedDown:0,
  oppDiscards:0,trapsActivated:0,equipActivated:false,handLooks:0,
  // Hidden coin feats (user, 2026-11-20; duel_rewards.SECRET): the card whose attack dealt the winning damage, how far
  // past 0 the final hit went, the lowest LP the player fell to, and a win from full LP within one turn.
  finisher:0,bestOverkill:0,lowestLp:null,oneTurnKill:false,oppTurnLp:null,oppPeakLp:0}
}

// Hidden coin feats: one cheap check per LP message, never per frame.
function observeFeatMessage(duel,s,m){
 if(!duel.lp)return;
 if(m.type===M.NEW_TURN){s.oppTurnLp=duel.lp[1];s.oppPeakLp=Math.max(s.oppPeakLp,duel.lp[1])}
 if(m.player===0&&((m.type===M.DAMAGE||m.type===M.PAY_LPCOST)&&m.amount>0||m.type===M.LPUPDATE)){const lp=Math.max(0,m.type===M.LPUPDATE?m.lp:duel.lp[0]-m.amount);s.lowestLp=Math.min(s.lowestLp??lp,lp)}
 if(m.type===M.DAMAGE&&m.player===1&&m.amount>0&&m.amount>=duel.lp[1]){
  s.bestOverkill=Math.max(s.bestOverkill,m.amount-duel.lp[1]);
  if(s.oppTurnLp!==null&&s.oppTurnLp>=s.oppPeakLp)s.oneTurnKill=true;
  const a=duel.inDamageStep&&duel.attackCard,attacker=a?.controller===0?duel.query(0,L.MZONE)[a.sequence]:null;
  if(attacker)s.finisher=Number(attacker.code)||0;
 }
}

function readField(duel,s){
 const mine=duel.query(0,L.MZONE).filter(c=>c&&(c.position&5));const names=new Map();
 for(const c of mine){const n=duel.name(c.code);names.set(n,(names.get(n)||0)+1)}
 s.sameName=Math.max(s.sameName,...names.values(),0);
 s.divine=Math.max(s.divine,new Set(mine.filter(c=>bits(duel.data[c.code]?.race||c.race)&RACE_DIVINE).map(c=>duel.name(c.code))).size);
 s.toons=Math.max(s.toons,mine.filter(c=>bits(duel.data[c.code]?.type)&TYPE_TOON).length);
 s.tokens=Math.max(s.tokens,duel.query(0,L.MZONE).filter(c=>c&&(bits(duel.data[c.code]?.type)&TYPE_TOKEN)).length);
}

// Called from MobileDuel.onMessage before the core's LP change is applied (duel.lp is the LP before the damage).
export function observeSleeveMessage(duel,m){
 const s=sleeveMetrics(duel);observeFeatMessage(duel,s,m);
 if(m.type===M.NEW_TURN){s.turnMonsters=0;s.turnSpells=0}
 if(m.type===M.NEW_PHASE)s.releases=0;
 if(m.type===M.DRAW&&m.player===0)s.draws+=m.drawn?.length||0;
 if(m.type===M.DAMAGE&&m.player===0)s.damageTaken+=m.amount||0;
 if(m.type===M.DAMAGE&&m.player===1&&m.amount>0){
  const battle=!!(duel.inDamageStep&&duel.attackCard);
  if(battle){s.bestHit=Math.max(s.bestHit,m.amount);
   const a=duel.attackCard,attacker=a?.controller===0?duel.query(0,L.MZONE)[a.sequence]:null;
   if(attacker&&attacker.owner===1&&m.amount>=duel.lp[1])s.stolenFinish=true}
  else s.effectDamage+=m.amount;
  if(battle&&m.amount>=duel.lp[1]){const a=duel.attackCard,attacker=a?.controller===0?duel.query(0,L.MZONE)[a.sequence]:null;if(attacker&&attacker.attack<=500)s.weakFinish=true;
   if(attacker){if(attacker.attack>=3000)s.bigFinish=true;if(attacker.attack<=1000)s.lowFinish=true;if(duel.name(attacker.code)==='Dark Magician Girl')s.dmgFinish=true}}
 }
 // Lifetime toss counts unlock Duke Devlin (Roll 10 dice and toss 10 coins, 2026-11-13).
 if(m.type===M.TOSS_DICE&&m.player===0)s.diceRolled+=m.results?.length||0;
 if(m.type===M.TOSS_COIN&&m.player===0)for(const heads of m.results||[]){
  s.coinsTossed++;
  s.coinStreak=heads?s.coinStreak+1:0;s.bestCoinStreak=Math.max(s.bestCoinStreak,s.coinStreak);
  if(heads&&duel.name(duel.effect?.code)==='Time Wizard')s.timeWizardWins++;
 }
 // A chain link of yours that tossed a coin: monsters it destroys count as coin-toss kills (Sasuke Samurai #4).
 if(m.type===M.TOSS_COIN&&s.link?.player===0)s.link.coin=true;
 if(m.type===M.PAY_LPCOST&&m.player===0)s.lpPaid+=m.amount||0;
 if(m.type===M.CONFIRM_CARDS&&m.player===0&&(m.cards||[]).some(c=>c.controller===1&&c.location===L.HAND))s.handLooks++;
 if(m.type===M.POS_CHANGE&&s.link?.player===0){const before=bits(m.prev_position??m.previous_position),now=bits(m.position??m.current_position);if((before&5)&&(now&8))s.flippedDown++}
 if(m.type===M.CHAINING){s.releases=0;const player=m.triggering_controller??m.player??m.controller;
  if(player===0&&(bits(duel.data[m.code]?.type)&TYPE_TRAP)){s.trapActivated=true;s.trapsActivated++}
  if(player===0&&(bits(duel.data[m.code]?.type)&TYPE_SPELL)&&(bits(duel.data[m.code]?.type)&TYPE_EQUIP))s.equipActivated=true;if(player===0&&(bits(duel.data[m.code]?.type)&TYPE_SPELL))s.spellActivated=true}
 if(m.type===M.CHAIN_SOLVING){const link=duel.activeChain?.find(c=>c.link===m.chain_size);s.link=link?{player:link.player,trap:!!(bits(duel.data[link.code]?.type)&TYPE_TRAP),cards:0,monsters:0}:null}
 if(m.type===M.CHAIN_SOLVED||m.type===M.CHAIN_END){if(s.link?.player===0){s.bestOneEffect=Math.max(s.bestOneEffect,s.link.cards);if(s.link.trap)s.bestMirror=Math.max(s.bestMirror,s.link.monsters)}s.link=null}
 if(m.type===M.SUMMONING&&m.controller===0){if(s.releases>=3)s.tribute3=true;if(s.releases>=1)s.tributeSummons++;s.releases=0}
 if([M.SUMMONING,M.SPSUMMONING,M.FLIPSUMMONING].includes(m.type)&&m.controller===0&&duel.name(m.code)==='Dark Magician')s.dmSummons++;
 // Original ATK from the card data, so relic or equip boosts never count; ? ATK counts as strong.
 if([M.SUMMONING,M.SPSUMMONING,M.FLIPSUMMONING].includes(m.type)&&m.controller===0){const atk=Number(duel.data[m.code]?.attack??0);s.summons++;s.maxSummonAtk=Math.max(s.maxSummonAtk,atk<0?99999:atk);if(m.type===M.FLIPSUMMONING)s.flipSummons++}
 if(m.type===M.RECOVER&&m.player===0)s.lpGained+=m.amount||0;
 if(m.type===M.ATTACK&&m.card?.controller===0&&!m.target)s.directAttacks++;
 if(m.type===M.SPSUMMONING)s.releases=0;
 if(m.type===M.MOVE&&m.from){
  const reason=bits(m.reason??(m.wire?.length>=29?new DataView(Uint8Array.from(m.wire).buffer).getUint32(25,true):0)),from=m.from,to=m.to||{},data=duel.data[Number(m.card)]||{};
  const monster=!!(bits(data.type)&TYPE_MONSTER);
  if(from.controller===0&&from.location===L.MZONE&&(reason&REASON_RELEASE)&&(reason&REASON_SUMMON))s.releases++;
  if(to.location===L.REMOVED&&from.location!==L.REMOVED){s.banished++;if(monster&&(bits(data.attribute)&ATTRIBUTE_LIGHT))s.lightBanished++;if(monster&&(bits(data.attribute)&ATTRIBUTE_DARK))s.darkBanished++}
  if(from.location===L.GRAVE&&to.location===L.MZONE&&to.controller===0)s.graveSpecials++;
  if(from.controller===1&&from.location===L.MZONE&&to.location===L.HAND)s.bounced++;
  if(from.controller===0&&from.location===L.MZONE&&to.location===L.EXTRA)s.toExtra++;
  if(from.controller===1&&from.location===L.HAND&&to.location===L.GRAVE&&(reason&REASON_DISCARD)&&s.link?.player===0)s.oppDiscards++;
  if(reason&REASON_DESTROY&&from.controller===1&&from.location===L.MZONE&&s.link?.player===0&&s.link.coin)s.coinKills++;
  if(from.location===L.GRAVE&&to.location===L.HAND&&to.controller===0&&(bits(data.type)&TYPE_SPELL))s.spellsRecovered++;
  if(reason&REASON_DESTROY&&from.location===L.MZONE){if(from.controller===0&&(reason&REASON_BATTLE))s.ownBattleDestroyed++;if(from.controller===1&&(bits(from.position)&10))s.faceDownDestroyed++}
  if(reason&REASON_DESTROY&&onField(from.location)){
   if(from.controller===1){if(s.link){s.link.cards++;if(from.location===L.MZONE)s.link.monsters++}
    if(from.location===L.MZONE){s.turnMonsters++;s.bestTurnMonsters=Math.max(s.bestTurnMonsters,s.turnMonsters)}
    if(from.location===L.MZONE&&(reason&REASON_BATTLE)&&(bits(data.race)&RACE_DRAGON))s.dragonsByBattle++}
   if(from.location===L.SZONE&&!(from.sequence===5)){s.turnSpells++;s.bestTurnSpells=Math.max(s.bestTurnSpells,s.turnSpells)}
  }
  if(to.controller===0&&to.location===L.MZONE)readField(duel,s);
 }
 if((m.type===M.POS_CHANGE&&m.controller===0)||([M.SUMMONED,M.SPSUMMONED,M.FLIPSUMMONED].includes(m.type)))readField(duel,s);
}

const count=(duel,location,player=0)=>duel.core?.duelQueryCount?duel.core.duelQueryCount(duel.h,player,location):duel.query(player,location).filter(Boolean).length;
// The end-of-duel half: what the player controls, holds and has left when the duel is decided.
export function sleeveMetricsEvent(duel){
 const s=sleeveMetrics(duel),faceUp=duel.query(0,L.MZONE).filter(c=>c&&(c.position&5)),field=faceUp.map(c=>duel.name(c.code));
 const {link,releases,coinStreak,turnMonsters,turnSpells,oppTurnLp,oppPeakLp,...rest}=s;
 // fieldRaces: every Type among your face-up monsters at the end (the "win while you control a Warrior" sleeves).
 const fieldRaces=faceUp.reduce((r,c)=>r|bits(duel.data[c.code]?.race||c.race),0);
 return {kind:'sleeve_metrics',...rest,field:[...new Set(field)],fieldRaces,hand:count(duel,L.HAND),deck:count(duel,L.DECK),grave:count(duel,L.GRAVE),
  oppHand:count(duel,L.HAND,1),monsters:count(duel,L.MZONE),oppMonsters:count(duel,L.MZONE,1),zeroAtk:faceUp.some(c=>Number(c.attack)===0),
  turn:duel.turn,winReason:duel.finished?Number(duel.finished.reason):null}
}
