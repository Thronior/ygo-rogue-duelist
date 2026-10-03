import {MobileDuel,M,L} from './duel.js';
export function flipPerspective(value){
 if(Array.isArray(value))return value.map(flipPerspective);
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='wire').map(([key,v])=>[key,['player','controller','owner','triggering_controller','reason_player'].includes(key)&&(v===0||v===1)?1-v:flipPerspective(v)]));
}
// Uses EDOPro's real extra-duelist slots, never merges partners' decks.
export class TagDuel extends MobileDuel {
 startTag({teams,lp,enemyLP,draw=5,enemyDraw=5,seed,passives='',names,mode='tag',rules=null}){
  this.pvp=mode==='pvp';
  if(!Array.isArray(teams)||teams.length!==2||teams.some(t=>t.length!==(this.pvp?1:2)||t.some(d=>!d.main?.length)))throw Error('Tag duels need four decks.');
  this.activeSeats=[0,0];this.tagNames=names||[['Host','Partner'],['Opponent 1','Opponent 2']];this.responseNumber=0;
  return this.start(teams[0][0].main,teams[1][0].main,lp,enemyLP,draw,seed,teams[0][0].extra||[],teams[1][0].extra||[],passives,enemyDraw,this.pvp?null:teams,rules);
 }
 onMessage(message){
  if(message.type===M.TAG_SWAP){
   this.activeSeats[message.player]=1-this.activeSeats[message.player];
   // The field is shared, but plans using the outgoing hand must not survive a swap.
   this.effect=null;this.materialSubject=null;this.selectionHint=null;this.attacker=null;
   this.visuals.push({kind:'tag',player:message.player,text:this.tagNames[message.player][this.activeSeats[message.player]]});
  }
  super.onMessage(message);
 }
 snapshot(){return {...super.snapshot(),tag:{activeSeats:[...this.activeSeats],names:this.tagNames,responseNumber:this.responseNumber}}}
 get respondingSeat(){return this.pvp?(this.pending?.player??null):this.pending?.player===0?this.activeSeats[0]:null}
 respondFor(seat,number,response){
  if(this.respondingSeat!==seat)throw Error('Wait for your teammate.');
  if(number!==this.responseNumber)throw Error('That choice is stale. Refresh the duel state.');
  if(this.pvp&&response?.nativeBytes)throw Error('Use the multiplayer duel controls.');
  if(this.pvp&&seat===1)response=flipPerspective(response);
  if(response?.nativeBytes){
   const bytes=response.nativeBytes;
   if(!Array.isArray(bytes)||!bytes.length||bytes.length>512||bytes.some(n=>!Number.isInteger(n)||n<0||n>255))throw Error('Invalid desktop response.');
   if([M.SELECT_IDLECMD,M.SELECT_BATTLECMD].includes(this.pending.type)){
    if(bytes.length!==4)throw Error('Invalid command length.');
    const n=new DataView(Uint8Array.from(bytes).buffer).getUint32(0,true);response={...response,action:n&65535,index:n>>>16};
   }
  }
  const result=this.respond(response);this.responseNumber++;result.tag.responseNumber=this.responseNumber;return result;
 }
 snapshotFor(seat){
  if(this.pvp)return this.pvpSnapshot(seat);
  const state=this.snapshot();state.tag.rewardEvents=this.summary().filter(e=>['summon','activate','set','attack','damage','damage_taken','effect_damage','draw','recover','exact_lethal','duel_metrics','battle_destroy','destroy','banish','tribute_summons'].includes(e.kind));state.tag.localSeat=seat;state.tag.canRespond=this.respondingSeat===seat;
  state.tag.ui={chainDepth:this.chainDepth,activeChain:(this.activeChain||[]).map(c=>({code:c.code,link:c.link})),inDamageStep:!!this.inDamageStep,selectionHint:this.selectionHint,materialSubject:this.materialSubject,logs:this.logs,revealedHands:[{...(this.revealedHands?.[0]||{})},{}]};
  state.players[0].extraCards=this.query(0,L.EXTRA);
  if(!state.tag.canRespond)state.pending=null;
  // Never transmit an AI hand, deck order, or hidden enemy card to the remote player.
  const enemy=state.players[1];enemy.hand=enemy.hand.map((c,sequence)=>c&&this.handRevealed(0,{...c,controller:1,location:L.HAND,sequence})?c:{code:0});
  for(const zone of ['monsters','spells'])enemy[zone]=enemy[zone].map(c=>c&&!(c.position&5)?{controller:1,location:zone==='monsters'?L.MZONE:L.SZONE,sequence:c.sequence,position:c.position,code:0}:c);
  enemy.banished=enemy.banished.map(c=>c&&!(c.position&5)?{code:0,position:c.position}:c);
  state.native=this.nativeState(seat);
  return state;
 }
 pvpSnapshot(seat){
  if(seat!==0&&seat!==1)throw Error('Invalid player seat.');
  let state=structuredClone(this.snapshot());const opponent=1-seat;
  state.players[seat].extraCards=this.query(seat,L.EXTRA);
  const enemy=state.players[opponent];
  enemy.hand=enemy.hand.map((c,sequence)=>c&&this.handRevealed(seat,{...c,controller:opponent,location:L.HAND,sequence})?c:{code:0});
  for(const zone of ['monsters','spells'])enemy[zone]=enemy[zone].map(c=>c&&!(c.position&5)?{controller:opponent,location:zone==='monsters'?L.MZONE:L.SZONE,sequence:c.sequence,position:c.position,code:0}:c);
  enemy.banished=enemy.banished.map(c=>c&&!(c.position&5)?{code:0,position:c.position}:c);
  if(this.respondingSeat!==seat)state.pending=null;
  const reveals={};for(const [key,code] of Object.entries(this.revealedHands?.[seat]||{})){const [side,seq]=key.split(':');reveals[(Number(side)^seat)+':'+seq]=code}
  state.tag.ui={chainDepth:this.chainDepth,activeChain:(this.activeChain||[]).map(c=>({code:c.code,link:c.link})),inDamageStep:!!this.inDamageStep,selectionHint:this.selectionHint,materialSubject:this.materialSubject,logs:[],revealedHands:[reveals,{}]};
  if(seat===1){state=flipPerspective(state);state.players.reverse();state.lp.reverse();state.tag.names.reverse();}
  if(state.pending)delete state.pending.wire;
  state.tag.waitingForOpponent=!!this.pending&&this.respondingSeat===opponent&&!this.finished;state.tag.pvp=true;state.tag.localSeat=seat;state.tag.canRespond=this.respondingSeat===seat;state.tag.activeSeats=[0,0];
  return state;
 }
 cuesFor(seat,cues){
  if(!this.pvp)return cues;
  // Movement animations must not expose either human's private card identities.
  const safe=cues.filter(c=>c.kind!=='reveal'||c.public===true||c.audience===seat).map(c=>c.kind==='move'?{...c,code:0}:c);
  return seat===1?flipPerspective(safe):safe;
 }
 nativeState(seat){
  const field=this.core.duelQueryField(this.h).wire,locations=[];
  for(let player=0;player<2;player++)for(const location of [L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.REMOVED,L.EXTRA]){
   const query=this.core.duelQueryLocation(this.h,{controller:player,location,flags:0x1fcfd3}),raw=Uint8Array.from(query.wire),view=new DataView(raw.buffer);let at=4;const blocks=[];
   for(const card of query){const start=at;if(view.getUint16(at,true)===0)at+=2;else while(at<raw.length){const size=view.getUint16(at,true),flag=view.getUint32(at+2,true);at+=size+2;if(flag===0x80000000)break}
    const hidden=player===1&&card&&!card.isPublic&&(location===L.HAND||location===L.EXTRA||!(card.position&5));
    if(hidden){const b=new Uint8Array(26),v=new DataView(b.buffer);v.setUint16(0,8,true);v.setUint32(2,1,true);v.setUint16(10,8,true);v.setUint32(12,2,true);v.setUint32(16,card.position||8,true);v.setUint16(20,4,true);v.setUint32(22,0x80000000,true);blocks.push(b)}else blocks.push(raw.slice(start,at));
   }
   const size=blocks.reduce((n,b)=>n+b.length,0),out=new Uint8Array(size+4);new DataView(out.buffer).setUint32(0,size,true);let cursor=4;for(const b of blocks){out.set(b,cursor);cursor+=b.length}locations.push({player,location,bytes:Array.from(out)});
  }
  return {field,locations,prompt:this.respondingSeat===seat?this.pending.wire:null};
 }
}
