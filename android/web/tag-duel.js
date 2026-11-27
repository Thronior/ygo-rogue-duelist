import {MobileDuel,M,L,P} from './duel.js';
export function flipPerspective(value){
 if(Array.isArray(value))return value.map(flipPerspective);
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='wire').map(([key,v])=>[key,['player','controller','owner','triggering_controller','reason_player'].includes(key)&&(v===0||v===1)?1-v:flipPerspective(v)]));
}
// The duel log is written from engine seat 0's side. PvP (Draft, Ultimate Collector, the Tag final 1v1) sent no log at all,
// so an Ordeal of a Traveler call never showed there (TRUANT, Discord 2026-11-25). Its lines name only public things
// (activations, face-up summons, declarations and calls, LP; the core hides face-down codes), so both humans get it, and
// seat 1 reads it with "You" and "Opponent" swapped. Only the first matching form is swapped, so no line flips back.
const LOG_SIDES=[[/^(Turn \d+ · )Your turn$/,'$1Opponent’s turn'],[/^(Turn \d+ · )Opponent’s turn$/,'$1Your turn'],[/^You take /,'Opponent takes '],[/^Opponent takes /,'You take '],[/^You pay /,'Opponent pays '],[/^Opponent pays /,'You pay '],[/^You recover /,'Opponent recovers '],[/^Opponent recovers /,'You recover '],[/^You (\w+) Summon /,'Opponent $1 Summons '],[/^Opponent (\w+) Summons /,'You $1 Summon '],[/^You · /,'Opponent · '],[/^Opponent · /,'You · '],[/^You guessed /,'Opponent guessed '],[/^Opponent guessed /,'You guessed ']];
export function seatLogs(logs,seat){return (logs||[]).map(line=>{if(seat!==1)return line;const side=LOG_SIDES.find(([pattern])=>pattern.test(line));return side?line.replace(side[0],side[1]):line})}
// Uses EDOPro's real extra-duelist slots, never merges partners' decks.
// mode 'team' (2v2 Draft rooms, 2026-11-26): four humans, two per engine team. A duelist is a slot, team x 2 + partner,
// and each slot answers its own prompts. Everything else follows PvP: hidden cards stay hidden per team, and team 1 sees
// the duel from its own side.
export class TagDuel extends MobileDuel {
 startTag({teams,lp,enemyLP,draw=5,enemyDraw=5,seed,passives='',names,mode='tag',rules=null}){
  this.presentationKey=seed;this.team=mode==='team';this.pvp=mode==='pvp'||this.team;
  if(!Array.isArray(teams)||teams.length!==2||teams.some(t=>t.length!==(this.pvp&&!this.team?1:2)||t.some(d=>!d.main?.length)))throw Error('Tag duels need four decks.');
  this.activeSeats=[0,0];this.tagNames=names||[['Host','Partner'],['Opponent 1','Opponent 2']];this.responseNumber=0;
  return this.start(teams[0][0].main,teams[1][0].main,lp,enemyLP,draw,seed,teams[0][0].extra||[],teams[1][0].extra||[],passives,enemyDraw,this.pvp&&!this.team?null:teams,rules);
 }
 onMessage(message){
  // Which partner put each of the team's field cards there, so a face-down card shows its owner's sleeve (sleeves.js).
  // A card keeps its seat while it moves between field zones; anything else arriving came from the active partner.
  if(message.type===M.MOVE&&!this.pvp){
   const onField=c=>c&&c.controller===0&&(c.location===L.MZONE||c.location===L.SZONE),key=c=>c.location+':'+c.sequence,seats=this.fieldSeats??={};
   const carried=onField(message.from)?seats[key(message.from)]:undefined;if(onField(message.from))delete seats[key(message.from)];
   if(onField(message.to))seats[key(message.to)]=carried??this.activeSeats[0];
  }
  if(message.type===M.TAG_SWAP){
   this.activeSeats[message.player]=1-this.activeSeats[message.player];
   // The field is shared, but plans using the outgoing hand must not survive a swap.
   this.effect=null;this.materialSubject=null;this.selectionHint=null;this.attacker=null;
   this.visuals.push({kind:'tag',player:message.player,text:this.tagNames[message.player][this.activeSeats[message.player]]});
  }
  super.onMessage(message);
 }
 snapshot(){return {...super.snapshot(),tag:{presentationDuel:this.presentationKey,activeSeats:[...this.activeSeats],fieldSeats:{...this.fieldSeats},names:this.tagNames,responseNumber:this.responseNumber}}}
 get respondingSeat(){if(this.team){const p=this.pending?.player;return p===0||p===1?p*2+this.activeSeats[p]:null}return this.pvp?(this.pending?.player??null):this.pending?.player===0?this.activeSeats[0]:null}
 respondFor(seat,number,response){
  if(this.respondingSeat!==seat)throw Error('Wait for your teammate.');
  if(number!==this.responseNumber)throw Error('That choice is stale. Refresh the duel state.');
  if(this.pvp&&(this.team?seat>>1:seat)===1)response=flipPerspective(response);
  const result=this.respond(response);this.responseNumber++;result.tag.responseNumber=this.responseNumber;return result;
 }
 // The team's relic and curse numbers, so the screen's stand-in engine can forecast a hand monster's field stats as
 // solo does (Mugen101, Discord 2026-11-08). Built on this device, never sent; a copy, because the inspection briefly
 // swaps activeCurses. PvP has one side's numbers only, so it sends none (aiModifiers:null) and shows no forecast.
 statModifiers(){const {relicFeedback,...stats}=this.aiModifiers||{};return {...stats}}
 snapshotFor(seat){
  if(this.team)return this.teamSnapshot(seat);
  if(this.pvp)return this.pvpSnapshot(seat);
  const state=this.snapshot();state.tag.rewardEvents=this.summary().filter(e=>['summon','activate','set','attack','damage','damage_taken','effect_damage','draw','recover','exact_lethal','overkill','duel_metrics','battle_destroy','destroy','banish','tribute_summons','ancient_treasure','lp_lost','sleeve_metrics'].includes(e.kind));state.tag.localSeat=seat;state.tag.canRespond=this.respondingSeat===seat;state.tag.waitingForPartner=!!this.pending&&this.respondingSeat===1-seat&&!this.finished;
  state.tag.ui={chainDepth:this.chainDepth,activeChain:(this.activeChain||[]).map(c=>({code:c.code,link:c.link})),inDamageStep:!!this.inDamageStep,selectionHint:this.selectionHint,materialSubject:this.materialSubject,logs:this.logs,revealedHands:[{...(this.revealedHands?.[0]||{})},{}],aiModifiers:this.statModifiers()};
  state.players[0].extraCards=this.query(0,L.EXTRA);
  // The cards left in the Deck for the Deck's Inspect list, sorted by id so the Deck order is never sent.
  state.players[0].deckCards=this.query(0,L.DECK).filter(Boolean).map(c=>c.code).sort((x,y)=>x-y);
  if(!state.tag.canRespond)state.pending=null;
  // Never transmit an AI hand, deck order, or hidden enemy card to the remote player.
  const enemy=state.players[1];enemy.hand=enemy.hand.map((c,sequence)=>c&&this.handRevealed(0,{...c,controller:1,location:L.HAND,sequence})?c:{code:0});
  for(const zone of ['monsters','spells'])enemy[zone]=enemy[zone].map(c=>c&&!(c.position&5)?{controller:1,location:zone==='monsters'?L.MZONE:L.SZONE,sequence:c.sequence,position:c.position,code:this.knownFieldCard(0,{...c,controller:1,location:zone==='monsters'?L.MZONE:L.SZONE}),rememberedCode:this.knownFieldCard(0,{...c,controller:1,location:zone==='monsters'?L.MZONE:L.SZONE})}:c);
  enemy.banished=enemy.banished.map(c=>c&&!(c.position&5)?{code:0,position:c.position}:c);
  return state;
 }
 // canRespond: whether this side holds the prompt (2v2 passes it; PvP works it out).
 pvpSnapshot(seat,canRespond=this.respondingSeat===seat){
  if(seat!==0&&seat!==1)throw Error('Invalid player seat.');
  let state=structuredClone(this.snapshot());const opponent=1-seat;
  state.players[seat].extraCards=this.query(seat,L.EXTRA);
  state.players[seat].deckCards=this.query(seat,L.DECK).filter(Boolean).map(c=>c.code).sort((x,y)=>x-y);
  const enemy=state.players[opponent];
  enemy.hand=enemy.hand.map((c,sequence)=>c&&this.handRevealed(seat,{...c,controller:opponent,location:L.HAND,sequence})?c:{code:0});
  for(const zone of ['monsters','spells'])enemy[zone]=enemy[zone].map(c=>c&&!(c.position&5)?{controller:opponent,location:zone==='monsters'?L.MZONE:L.SZONE,sequence:c.sequence,position:c.position,code:this.knownFieldCard(seat,{...c,controller:opponent,location:zone==='monsters'?L.MZONE:L.SZONE}),rememberedCode:this.knownFieldCard(seat,{...c,controller:opponent,location:zone==='monsters'?L.MZONE:L.SZONE})}:c);
  enemy.banished=enemy.banished.map(c=>c&&!(c.position&5)?{code:0,position:c.position}:c);
  if(!canRespond)state.pending=null;
  const reveals={};for(const [key,code] of Object.entries(this.revealedHands?.[seat]||{})){const [side,seq]=key.split(':');reveals[(Number(side)^seat)+':'+seq]=code}
  state.tag.ui={chainDepth:this.chainDepth,activeChain:(this.activeChain||[]).map(c=>({code:c.code,link:c.link})),inDamageStep:!!this.inDamageStep,selectionHint:this.selectionHint,materialSubject:this.materialSubject,logs:seatLogs(this.logs,seat),revealedHands:[reveals,{}],aiModifiers:null};
  if(seat===1){state=flipPerspective(state);state.players.reverse();state.lp.reverse();state.tag.names.reverse();}
  if(state.pending)delete state.pending.wire;
  state.tag.waitingForOpponent=!!this.pending&&this.respondingSeat===opponent&&!this.finished;state.tag.pvp=true;state.tag.localSeat=seat;state.tag.canRespond=this.respondingSeat===seat;state.tag.activeSeats=[0,0];
  return state;
 }
 // A 2v2 duelist's view: the PvP view of their team, with the partners' names and who is acting.
 teamSnapshot(slot){
  if(!Number.isInteger(slot)||slot<0||slot>3)throw Error('Invalid player seat.');
  const team=slot>>1,acting=this.respondingSeat,state=this.pvpSnapshot(team,acting===slot);
  state.tag.team=true;state.tag.localSeat=slot&1;state.tag.canRespond=acting===slot;
  state.tag.waitingForPartner=!!this.pending&&acting!==null&&acting!==slot&&acting>>1===team&&!this.finished;
  state.tag.waitingForOpponent=!!this.pending&&acting!==null&&acting>>1!==team&&!this.finished;
  state.tag.activeSeats=team===1?[this.activeSeats[1],this.activeSeats[0]]:[...this.activeSeats];
  return state;
 }
 cuesFor(seat,cues){
  if(this.team)seat=seat>>1;
  if(!this.pvp)return cues;
  // Movement animations must not expose either human's private card identities.
  const safe=cues.filter(c=>c.kind!=='reveal'||c.public===true||c.audience===seat).map(c=>c.kind==='move'?{...c,code:0}:c);
  return seat===1?flipPerspective(safe):safe;
 }
 // Room tool changes (room-admin.js), applied between two answers at the same log step on both devices. Only direct
 // state edits are safe while a prompt waits: Duel.SetLP from a Lua chunk, and a new card in the hand. Neither starts
 // engine processing, so the waiting prompt stays valid; a new hand card can be used from the next prompt on.
 // `side` is the engine player. The core keeps its last messages until the next process call, so only the tail is new.
 adminApply(op){
  const side=op.side,seen=this.core.duelGetMessage(this.h).length;
  if(side!==0&&side!==1)throw Error('Invalid side.');
  if(op.kind==='hand'){
   if(!this.data[op.code])throw Error('Unknown card.');
   this.core.duelNewCard(this.h,{code:op.code,team:side,duelist:0,controller:side,location:L.HAND,sequence:0,position:P.FACEDOWN_DEFENSE});
  }else{
   const amount=Math.max(0,Math.floor(Number(op.amount)||0));
   const lp=op.kind==='damage'?`math.max(0,Duel.GetLP(${side})-${amount})`:op.kind==='heal'?`Duel.GetLP(${side})+${amount}`:op.kind==='set-lp'?String(amount):null;
   if(lp===null)throw Error('Unknown duel change.');
   this.core.loadScript(this.h,'shadow-room-admin.lua',`Duel.SetLP(${side},${lp})`);
  }
  for(const m of this.core.duelGetMessage(this.h).slice(seen)){this.onMessage?.(m);if(m.type===M.LPUPDATE)this.lp[m.player]=m.lp}
  if(this.replayRecord)(this.replayRecord.admin??=[]).push({at:this.replayRecord.responses.length,op:{...op}});
 }
 // Cheap fingerprint of the shared state. Both clients compute it after every step, so a split is caught at once.
 checksum(){
  let hash=2166136261;const mix=n=>{hash=Math.imul(hash^(n>>>0),16777619)>>>0};
  for(const n of [this.lp[0],this.lp[1],this.turn||0,this.phase||0,this.pending?.type??255,this.finished?1:0])mix(n);
  for(let player=0;player<2;player++)for(const location of [L.DECK,L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.REMOVED,L.EXTRA])mix(this.core.duelQueryCount(this.h,player,location));
  return hash;
 }
}
