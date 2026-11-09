import {phaseCheckpoint} from './state-update.js';
import {validEmote,showDuelEmote,clearDuelEmotes} from './duel-emotes.js';
import {storeReplay,saveRecording,captureBehaviour,uploadBehaviour,sendUnsentFlags} from './replays.js';
import {TagPeer} from './tag-peer.js';
import {TagDuel} from './tag-duel.js';
const encode=value=>JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?{__bigint:String(v)}:v));
export const decode=value=>{if(value&&typeof value==='object'){if(Object.keys(value).length===1&&'__bigint'in value)return BigInt(value.__bigint);for(const key of Object.keys(value))value[key]=decode(value[key])}return value};
// 5: shared opponent screen and shop lock-ins (2026-11-08).
const PROTOCOL=5,AI_PACE_LIMIT=2500,PAUSE_AFTER=5000,MAX_RESYNCS=3;
// The game's content (2.2 MB as JSON) never changes after loading, so each Tag session reuses its hash (2026-11-09).
const contentHashes=new WeakMap();
const contentHash=content=>{
 if(!content||typeof content!=='object')return crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(content))).then(hex);
 if(!contentHashes.has(content))contentHashes.set(content,crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(content))).then(hex));
 return contentHashes.get(content);
};
const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');

// Both clients run the duel from one shared response log. Only the seat the engine is waiting for can extend it, so
// a player's own answer applies at once and travels behind them. The host keeps the journal and answers for the CPU.
export class TagSession {
 constructor({endpoint,character,variant=0,profile,level=0,content,backend,onView=()=>{},onDuel=()=>{},onStatus=()=>{},onPacks=()=>{},onAbandoned=()=>{},duelFactory=null}){
  Object.assign(this,{character,variant,profile,level,content,backend,onView,onDuel,onStatus,onPacks,onAbandoned,duelFactory});
  this.packEvents=new Set();this.pending=new Map();this.queue=Promise.resolve();this.connected=false;this.active=false;this.aiTimer=null;this.log=[];this.presented=Promise.resolve();this.greeted=false;this.resyncs=0;
  this.contentHash=contentHash(content);
  this.peer=new TagPeer(endpoint,{onState:(s,detail)=>this.status(s,detail),onMessage:m=>this.enqueue(()=>this.receive(decode(m)))});
  // The CPU never stops to think, so a quiet link during its turn means something is wrong. A partner's turn can be
  // silent for minutes, and pinging through those would spend requests.
  this.peer.expecting=()=>{const e=this.engine;return !!e&&!e.pvp&&!e.finished&&e.player===1&&e.respondingSeat!==this.seat};
 }
 enqueue(job){const next=this.queue.then(job);this.queue=next.catch(error=>this.onStatus('error',error.message));return next}
 get outboxKey(){return this.peer.endpoint+':tag-outbox:'+this.code}
 // A player can keep answering their own prompts through a dropped connection.
 get duelReady(){return !!this.engine&&this.greeted}
 get duelKey(){return this.engine?this.duelSeed:null}
 stats(){return {...this.peer.stats(),connected:this.connected,reconnecting:!this.connected&&!this.partnerLeft}}
 saveOutbox(){
  if(this.seat!==1||!this.code)return;
  const packets=[...this.pending.values()].map(p=>p.packet);
  if(packets.length)localStorage.setItem(this.outboxKey,JSON.stringify(encode(packets)));
  else localStorage.removeItem(this.outboxKey);
 }
 open(room){
  this.seat=room.seat;this.code=room.code;
  if(this.seat===1){
   const packets=decode(JSON.parse(localStorage.getItem(this.outboxKey)||'[]'));
   for(const packet of packets)if(packet.kind==='request'&&typeof packet.request?.id==='string')this.pending.set(packet.request.id,{packet,resolve:()=>{},reject:()=>{}});
  }
  return room;
 }
 async host(){return this.open(await this.peer.host())}
 async join(code){return this.open(await this.peer.join(code))}
 send(payload){this.peer.send(encode(payload))}
 // Partner traffic waits in the link while they are away; before a first link there is nobody to tell.
 tell(payload){try{this.send(payload)}catch{}}
 status(state,detail){
  if(state==='connected'){
   clearTimeout(this.pauseTimer);this.pauseTimer=null;
   // Do not resume merely because a route opened. Both clients must complete the
   // version handshake before queued actions can change the saved run.
   this.enqueue(async()=>{this.seat=this.peer.seat;this.code=this.peer.code;this.send(await this.greeting())});
  }else{
   if(['disconnected','failed','closed','reconnecting','protocol-error'].includes(state)){
    this.connected=false;
    // Short drops are common on mobile links; the saved run is only paused for real absences.
    if(this.seat===0&&this.active&&!this.pauseTimer)this.pauseTimer=setTimeout(()=>{this.pauseTimer=null;if(!this.connected)this.enqueue(()=>this.backend('tag-pause',true))},PAUSE_AFTER);
   }
   this.onStatus(state,detail);
  }
 }
 async greeting(answer=false){return {kind:'hello',answer,character:this.character,variant:this.variant,profile:this.profile,version:PROTOCOL,contentHash:await this.contentHash,duel:{key:this.duelKey,applied:this.log.length}}}
 async receive(message){
  if(message.kind==='partner-left-ack'){if(message.id===this.exitNotice?.id)this.exitNotice.resolve();return}
  if(message.kind==='partner-left'){
   this.tell({kind:'partner-left-ack',id:message.id});
   this.partnerLeft=true;clearTimeout(this.aiTimer);this.connected=false;
   if(this.seat===0&&this.active)await this.backend('tag-pause',true);
   this.onAbandoned();return;
  }
  if(message.kind==='hello'){
   if(message.version!==PROTOCOL||message.contentHash!==await this.contentHash)throw Error('These tag versions or card collections are incompatible. Update both players to the same version.');
   // A socket can die without the hub or the partner noticing, so only the returning side says hello. The answer goes
   // first: this client's view must not overtake the handshake it is waiting for.
   if(message.answer&&this.connected)return;
   if(!message.answer)this.tell(await this.greeting(true));
   this.partnerLeft=false;this.connected=true;
   try{
   if(this.seat===0){
    // Lobby seats are replaceable. Never reuse the departed guest's loadout.
    if(this.active&&this.view?.phase==='lobby')await this.backend('tag-create',{code:this.code,characters:[this.character,message.character],variants:[this.variant,message.variant||0],profiles:[this.profile,message.profile],level:this.level,lobby:true});
    if(!this.active){
     const restored=this.peer.resumed?await this.backend('tag-restore',{code:this.code,optional:!this.peer.started}):null;
     if(!restored)await this.backend('tag-create',{code:this.code,characters:[this.character,message.character],variants:[this.variant,message.variant||0],profiles:[this.profile,message.profile],level:this.level,lobby:true});
     if(!this.peer.started){await this.peer.request('started');this.peer.started=true}
     this.active=true;
    }
    await this.backend('tag-pause',false);await this.broadcast();
    // After a host reload the journal can be behind the guest's copy of the log. The longer log wins.
    if(this.engine&&message.duel?.key===this.duelKey&&message.duel.applied>this.log.length)this.tell({kind:'duel-need',key:this.duelKey,from:this.log.length});
    else{this.greeted=true;this.schedule()}
   }
   this.onStatus('connected',this.code);
   for(const waiting of this.pending.values())this.send(waiting.packet);
   return;
   }catch(error){this.connected=false;clearTimeout(this.aiTimer);throw error}
  }
  if(message.kind==='step'){await this.remoteStep(message);return}
  if(message.kind==='duel-need'){if(message.key===this.duelKey)this.tell({kind:'duel-log',key:this.duelKey,from:message.from,entries:this.log.slice(message.from)});return}
  if(message.kind==='duel-log'){
   if(message.key===this.duelKey)for(const [offset,entry] of message.entries.entries())await this.remoteStep({i:message.from+offset,entry});
   this.greeted=true;this.schedule();return;
  }
  if(message.kind==='duel-resync'){if(this.seat===0&&this.view?.phase==='duel')await this.broadcast(true);return}
  if(!this.connected)throw Error('Waiting for the reconnection handshake.');
  if(message.kind==='emote'){if(this.view?.phase==='duel'&&validEmote(message.emoji)&&Date.now()-(this.lastRemoteEmote||0)>=1200){this.lastRemoteEmote=Date.now();showDuelEmote(message.emoji,false,{ally:this.view?.duel?.mode!=='pvp'});}return;}
  if(message.kind==='shop-packs'&&this.seat===1){this.showPackEvent(message);return}
  if(message.kind==='replay'&&this.seat===1){if(message.record?.format==='ygo-replay'&&message.record.ended)await storeReplay(message.record);return}
  if(message.kind==='view'&&this.seat===1){await this.guestView(message);return}
  if(message.kind==='request'&&this.seat===0){
   try{const result=await this.perform(1,message.request);this.tell({kind:'receipt',id:message.request.id,result})}
   catch(error){if(this.connected){this.tell({kind:'receipt',id:message.request.id,error:error.message});await this.broadcast()}}
   return;
  }
  if(message.kind==='receipt'&&this.seat===1){
   const waiting=this.pending.get(message.id);
   if(waiting){this.pending.delete(message.id);this.saveOutbox();message.error?waiting.reject(Error(message.error)):waiting.resolve(message.result)}
   return;
  }
  throw Error('Unexpected tag message.');
 }
 async guestView(message){
  this.active=true;const leaving=message.view.phase!=='duel';
  // Let the last blows of a finished duel play before the screen changes.
  if(leaving&&this.engine)await Promise.race([this.presented,new Promise(resolve=>setTimeout(resolve,15000))]);
  this.view=message.view;if(leaving)clearDuelEmotes();this.peer.setPhase(this.view.phase);
  if(leaving){this.engine?.destroy();this.engine=null;this.log=[]}
  this.onView(this.view);
  if(!leaving&&message.duel){
   if(this.engine&&(message.rebuild||this.duelSeed!==message.duel.seed)){this.engine.destroy();this.engine=null}
   if(!this.engine)await this.startEngine(message.duel);
   else for(let i=this.log.length;i<(message.duel.responses||[]).length;i++)await this.remoteStep({i,entry:message.duel.responses[i]});
   this.greeted=true;
   // Answers the host has not seen yet were lost with the old link, or are still in it. Sending again is harmless.
   for(let i=(message.duel.responses||[]).length;i<this.log.length;i++)this.tell({kind:'step',i,entry:this.log[i]});
  }
 }
 async broadcast(rebuild=false){
  this.view=await this.backend('tag-view',0);if(this.view.phase!=='duel')clearDuelEmotes();this.peer.setPhase(this.view.phase);this.onView(this.view);
  // The guest replays this journal too, so a damaged one must be repaired before it is sent.
  if(this.view.phase==='duel'&&!this.engine&&await this.startEngine(this.view.duel))this.view=await this.backend('tag-view',0);
  if(this.connected){
   const packet={kind:'view',view:await this.backend('tag-view',1)};
   if(this.view.phase==='duel'){packet.duel=this.view.duel;if(rebuild)packet.rebuild=true}
   this.tell(packet);
  }
 }
 request(action,value){
  if(action==='emote'){if(!this.connected||this.view?.phase!=='duel'||!validEmote(value))return Promise.reject(Error('Emotes are available during a connected duel.'));if(Date.now()-(this.lastEmote||0)<1500)return Promise.resolve();this.lastEmote=Date.now();this.tell({kind:'emote',emoji:value});showDuelEmote(value,true,{ally:this.view?.duel?.mode!=='pvp'});return Promise.resolve();}
  if(action==='duel-response')return this.enqueue(()=>this.localStep(value));
  return this.sendRequest(action,value);
 }
 sendRequest(action,value){
  if(!this.connected||!this.view)return Promise.reject(Error('Run paused. Reconnect using the same room code.'));
  const request={id:crypto.randomUUID(),revision:this.view.revision,action,value};
  if(this.seat===0)return this.enqueue(()=>this.perform(0,request));
  return new Promise((resolve,reject)=>{
   const packet={kind:'request',request};this.pending.set(request.id,{packet,resolve,reject});
   try{this.saveOutbox()}catch(error){this.pending.delete(request.id);reject(error);return}
   Promise.resolve(globalThis.flushDesktopStorage?.()).then(()=>{try{this.send(packet)}catch{this.connected=false;this.onStatus('disconnected',this.code)}}).catch(error=>{this.pending.delete(request.id);reject(error)});
  });
 }
 // The engine refuses an illegal answer on the spot, and a repeated tap finds the prompt already answered.
 async localStep({number,response}){
  const e=this.engine;if(!e||!this.greeted||e.finished)return {ok:true,stale:true};
  if(number!==e.responseNumber||e.respondingSeat!==this.seat)return {ok:true,stale:true};
  const entry={seat:this.seat,number,response:encode(response)},before={turn:e.turn,phase:e.phase};
  e.respondFor(this.seat,number,decode(structuredClone(entry.response)));
  await this.commit(entry,before);return {ok:true};
 }
 async remoteStep({i,entry,h}){
  const e=this.engine;
  if(!e||i<this.log.length)return;
  if(i>this.log.length){this.requestRebuild();return}
  const before={turn:e.turn,phase:e.phase},response=decode(structuredClone(entry.response));
  try{if(entry.seat===null)e.respond(response);else e.respondFor(entry.seat,entry.number,response)}
  catch(error){console.warn('Duel step refused:',error.message);await this.requestRebuild();return}
  await this.commit(entry,before,true);
  if(h!==undefined&&h!==e.checksum()&&!e.finished){console.warn('Duel state split at step',i);await this.requestRebuild()}
 }
 // Whoever drifted rebuilds from the host's log. The host's engine stays the reference for the result.
 async requestRebuild(){if(this.resyncs>=MAX_RESYNCS)return;this.resyncs++;if(this.seat===1)this.tell({kind:'duel-resync'});else await this.broadcast(true)}
 // The engine has already moved, so nothing here may stop the duel. Decoded messages hold BigInts, which only the
 // engine accepts: the log and the JSON journal keep the encoded form.
 async commit(step,before,remote=false){
  const e=this.engine,entry=encode(step);this.log.push(entry);
  if(this.seat===0)try{await this.backend('tag-journal',{...entry,checkpoint:phaseCheckpoint(before,e)})}catch(error){console.warn('Duel journal:',error.message);this.onStatus('error',error.message)}
  if(!remote)this.tell({kind:'step',i:this.log.length-1,entry,h:e.checksum()});
  this.present();
  if(this.seat===0){if(e.finished)this.finishWhenShown();else this.schedule()}
 }
 present(){
  const e=this.engine,cues=e.visuals.splice(0);
  this.presented=Promise.resolve(this.onDuel(e.snapshotFor(this.seat),e.cuesFor?.(this.seat,cues)??cues)).catch(error=>this.onStatus('error',error.message));
  return this.presented;
 }
 finishWhenShown(){
  if(this.finishing)return;this.finishing=true;
  this.presented.then(()=>this.enqueue(async()=>{
   try{const e=this.engine;if(!e?.finished)return;
    const result=e.finished;await saveRecording(e);if(e.replayRecord)this.tell({kind:'replay',record:e.replayRecord});
    await this.backend('tag-finish',{winner:result.player,reason:result.reason,lp:e.lp[0],events:e.summary()});
    e.destroy();this.engine=null;this.log=[];await this.broadcast();
   }finally{this.finishing=false}
  }));
 }
 async perform(seat,request){
  if(!this.active)throw Error('No tag run is active.');
  const receipt=await this.backend('tag-receipt',{seat,id:request.id});
  if(receipt!==null&&receipt!==undefined)return receipt.result;
  if(!this.connected)throw Error('Waiting for your teammate to reconnect.');
  if(request.action==='flag-retry')return sendUnsentFlags();
  if(request.action==='flag-capture'){
   if(!this.engine||this.view.phase!=='duel')throw Error('No active duel.');
   this.behaviourCaptures??=new Map();
   const token=crypto.randomUUID(),capture=captureBehaviour(this.engine.replayRecord,{mode:this.engine.pvp?'pvp':'tag',seat,turn:this.engine.turn,phase:this.engine.phase});
   // Keep the latest two captures per seat, never send hidden replay data to guests.
   const previous=[...this.behaviourCaptures].filter(([,c])=>c.context.seat===seat);
   for(const [id] of previous.slice(0,-1))this.behaviourCaptures.delete(id);
   this.behaviourCaptures.set(token,capture);return {token};
  }
  if(request.action==='flag-submit'){
   const capture=this.behaviourCaptures?.get(request.value?.token);
   if(!capture||capture.context.seat!==seat)throw Error('That report expired. Open Flag behaviour again.');
   if(capture.result)return capture.result;
   capture.result=await uploadBehaviour(capture,request.value.description);return capture.result;
  }
  if(request.action==='surrender'){
   if(!this.engine||this.view.phase!=='duel')throw Error('No active duel.');
   if(this.engine.replayRecord){this.engine.replayRecord.ended=true;await saveRecording(this.engine);this.tell({kind:'replay',record:this.engine.replayRecord})}
   await this.backend('tag-finish',{winner:this.engine.pvp?1-seat:1,lp:this.engine.lp[0],events:this.engine.summary(),reason:0});this.engine.destroy();this.engine=null;this.log=[];await this.broadcast();return {ok:true};
  }
  // A guest outbox saved by an older page. Duel answers now travel in the log.
  if(request.action==='duel-response')return {ok:true,stale:true};
  const result=await this.backend('tag-command',{seat,request});await this.broadcast();
  // A shared purchase runs when the second player presses Buy, so it opens both players' packs.
  const event=result.result;
  if(event?.kind==='buy')for(const buyer of [0,1]){
   const packs=(event.results?.[buyer]||[]).filter(x=>x.kind==='pack');
   if(packs.length){const shown={kind:'shop-packs',id:event.id+':'+buyer,buyer,packs};this.tell(shown);this.showPackEvent(shown)}
  }
  return result.result;
 }
 showPackEvent(event){
  if(!event.id||this.packEvents.has(event.id)||!Array.isArray(event.packs)||!event.packs.length)return;
  this.packEvents.add(event.id);this.onPacks(event);
 }
 async startEngine(config){
  this.engine=this.duelFactory?await this.duelFactory():await new TagDuel([...this.content.cards,...this.content.tokenCards]).init();
  this.engine.startTag(config);this.duelSeed=config.seed;this.log=[];this.resyncs=0;let trimmed=false;
  for(const [index,entry] of (config.responses||[]).entries()){
   try{
    const response=decode(structuredClone(entry.response));
    if(entry.seat===null){if(this.engine.pending?.player!==1)throw Error('CPU answer without a CPU prompt.');this.engine.respond(response)}else this.engine.respondFor(entry.seat,entry.number,response);
   }catch(error){
    // A journal with a missing step cannot be replayed past it. The host resumes from that point, and a guest
    // still holding the full log restores the rest through the handshake.
    if(this.seat!==0)throw error;
    console.warn('Duel journal stops at step',index,error.message);await this.backend('tag-journal-trim',{count:index});trimmed=true;break;
   }
   this.log.push(entry);
  }
  this.engine.visuals=[];this.present();
  if(this.seat===0){if(this.engine.finished)this.finishWhenShown();else this.schedule()}
  return trimmed;
 }
 // The CPU keeps pace with the host's animations, but never waits long on them: an open card or a hidden page on
 // one device must not freeze the other player.
 schedule(){
  clearTimeout(this.aiTimer);if(this.seat!==0||!this.greeted||!this.engine||this.engine.pvp||this.engine.pending?.player!==1)return;
  const owner=this.engine,paced=Promise.race([this.presented,new Promise(resolve=>setTimeout(resolve,AI_PACE_LIMIT))]);
  const ticket=this.aiTicket=(this.aiTicket||0)+1;
  this.aiTimer=setTimeout(()=>paced.then(()=>{if(ticket===this.aiTicket)return this.enqueue(async()=>{
   if(ticket!==this.aiTicket||this.engine!==owner||owner.pending?.player!==1)return;
   const before={turn:owner.turn,phase:owner.phase},response=owner.auto();owner.respond(response);await this.commit({seat:null,response:encode(response)},before);
  })}),this.engine.inDamageStep?40:120);
 }
 async reconnect(){this.partnerLeft=false;await this.peer.reconnect()}
 async exit(){
  if(this.connected&&!this.partnerLeft){
   const id=crypto.randomUUID();let timer;
   try{await new Promise(resolve=>{this.exitNotice={id,resolve};timer=setTimeout(resolve,1500);try{this.send({kind:'partner-left',id})}catch{resolve()}})}finally{clearTimeout(timer);this.exitNotice=null}
  }
  await this.pause();
  // Once a campaign starts, Exit is a resumable pause. Before that, release the seat.
  if(this.view?.phase==='lobby'||(!this.view&&!this.peer.started)){
   await this.peer.close();
   if(this.code)localStorage.removeItem(this.outboxKey);
   for(const waiting of this.pending.values())waiting.reject(Error('Left the room.'));
   this.pending.clear();await globalThis.flushDesktopStorage?.();
  }
  this.engine?.destroy();
 }
 async pause(){clearTimeout(this.pauseTimer);this.pauseTimer=null;this.connected=false;clearTimeout(this.aiTimer);this.peer.suspend();if(this.seat===0&&this.active)await this.enqueue(()=>this.backend('tag-pause',true))}
}
