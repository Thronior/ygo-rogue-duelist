import {storeReplay,saveRecording,captureBehaviour,uploadBehaviour,sendUnsentFlags} from './replays.js';
import {TagPeer} from './tag-peer.js';
import {TagDuel} from './tag-duel.js';
const encode=value=>JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?{__bigint:String(v)}:v));
export const decode=value=>{if(value&&typeof value==='object'){if(Object.keys(value).length===1&&'__bigint'in value)return BigInt(value.__bigint);for(const key of Object.keys(value))value[key]=decode(value[key])}return value};

export class TagSession {
 constructor({endpoint,character,profile,level=0,content,backend,onView=()=>{},onDuel=()=>{},onStatus=()=>{},onPacks=()=>{},onAbandoned=()=>{},duelFactory=null}){
  Object.assign(this,{character,profile,level,content,backend,onView,onDuel,onStatus,onPacks,onAbandoned,duelFactory});
  this.packEvents=new Set();this.pending=new Map();this.queue=Promise.resolve();this.connected=false;this.active=false;this.aiTimer=null;this.recoveryTimer=null;this.recoveryAttempts=0;this.recoveryStopped=false;this.recoveryRunning=false;
  this.contentHash=crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(content))).then(bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join(''));
  this.peer=new TagPeer(endpoint,{onState:(s,detail)=>this.status(s,detail),onMessage:m=>this.enqueue(()=>this.receive(decode(m)))});
 }
 enqueue(job){const next=this.queue.then(job);this.queue=next.catch(error=>this.onStatus('error',error.message));return next}
 get outboxKey(){return this.peer.endpoint+':tag-outbox:'+this.code}
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
 status(state,detail){
  if(state==='connected'){
   // Do not resume merely because RTC connected. Both clients must complete the
   // version handshake before queued actions or AI can change the saved run.
   this.enqueue(async()=>{this.seat=this.peer.seat;this.code=this.peer.code;this.send({kind:'hello',character:this.character,profile:this.profile,version:3,contentHash:await this.contentHash})});
  }else{
   if(['disconnected','failed','closed','reconnecting','protocol-error'].includes(state)){
    this.connected=false;clearTimeout(this.aiTimer);this.scheduleRecovery();
    if(this.seat===0&&this.active)this.enqueue(()=>this.backend('tag-pause',true));
   }
   this.onStatus(state,detail);
  }
 }
 async receive(message){
  if(message.kind==='partner-left-ack'){if(message.id===this.exitNotice?.id)this.exitNotice.resolve();return}
  if(message.kind==='partner-left'){
   this.send({kind:'partner-left-ack',id:message.id});
   this.partnerLeft=true;this.recoveryStopped=true;clearTimeout(this.recoveryTimer);this.recoveryTimer=null;clearTimeout(this.aiTimer);this.connected=false;
   if(this.seat===0&&this.active)await this.backend('tag-pause',true);
   this.onAbandoned();return;
  }
  if(message.kind==='hello'){
   if(message.version!==3||message.contentHash!==await this.contentHash)throw Error('These tag versions or card collections are incompatible. Update both players to the same version.');
   this.partnerLeft=false;this.recoveryStopped=false;this.connected=true;clearTimeout(this.recoveryTimer);this.recoveryTimer=null;this.recoveryAttempts=0;
   try{
   if(this.seat===0){
    // Lobby seats are replaceable. Never reuse the departed guest's loadout.
    if(this.active&&this.view?.phase==='lobby')await this.backend('tag-create',{code:this.code,characters:[this.character,message.character],profiles:[this.profile,message.profile],level:this.level,lobby:true});
    if(!this.active){
     const restored=this.peer.resumed?await this.backend('tag-restore',{code:this.code,optional:!this.peer.started}):null;
     if(!restored)await this.backend('tag-create',{code:this.code,characters:[this.character,message.character],profiles:[this.profile,message.profile],level:this.level,lobby:true});
     if(!this.peer.started){await this.peer.request('started');this.peer.started=true}
     this.active=true;
    }
    await this.backend('tag-pause',false);await this.broadcast();await this.pushDuel();this.schedule();
   }
   this.onStatus('connected',this.code);
   for(const waiting of this.pending.values())this.send(waiting.packet);
   return;
   }catch(error){this.connected=false;clearTimeout(this.aiTimer);throw error}
  }
  if(!this.connected)throw Error('Waiting for the reconnection handshake.');
  if(message.kind==='shop-packs'&&this.seat===1){this.showPackEvent(message);return}
  if(message.kind==='replay'&&this.seat===1){if(message.record?.format==='ygo-replay'&&message.record.ended)await storeReplay(message.record);return}
  if(message.kind==='view'&&this.seat===1){this.active=true;this.view=message.view;this.peer.setPhase(this.view.phase);this.onView(this.view);return}
  if(message.kind==='duel'&&this.seat===1){await this.onDuel(message.snapshot,message.cues||[]);return}
  if(message.kind==='request'&&this.seat===0){
   try{const result=await this.perform(1,message.request);this.send({kind:'receipt',id:message.request.id,result})}
   catch(error){if(this.connected){this.send({kind:'receipt',id:message.request.id,error:error.message});await this.broadcast()}}
   return;
  }
  if(message.kind==='receipt'&&this.seat===1){
   const waiting=this.pending.get(message.id);
   if(waiting){this.pending.delete(message.id);this.saveOutbox();message.error?waiting.reject(Error(message.error)):waiting.resolve(message.result)}
   return;
  }
  throw Error('Unexpected tag message.');
 }
 async broadcast(){
  this.view=await this.backend('tag-view',0);this.peer.setPhase(this.view.phase);this.onView(this.view);
  if(this.connected)this.send({kind:'view',view:await this.backend('tag-view',1)});
  if(this.view.phase==='duel'&&!this.engine)await this.startEngine(this.view.duel);
 }
 request(action,value){
  if(action==='duel-response'){
   if(this.responseInFlight)return this.responseInFlight;
   const pending=this.sendRequest(action,value);this.responseInFlight=pending;
   pending.finally(()=>{if(this.responseInFlight===pending)this.responseInFlight=null}).catch(()=>{});return pending;
  }
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
   if(this.engine.replayRecord){this.engine.replayRecord.ended=true;await saveRecording(this.engine);if(this.connected)this.send({kind:'replay',record:this.engine.replayRecord})}
   await this.backend('tag-finish',{winner:this.engine.pvp?1-seat:1,lp:this.engine.lp[0],events:this.engine.summary(),reason:0});this.engine.destroy();this.engine=null;await this.broadcast();return {ok:true};
  }
  if(request.action==='duel-response'){
   if(!this.engine||this.view.phase!=='duel'){await this.broadcast();return {ok:true,stale:true};}
   const {number,response}=request.value;
   if(number!==this.engine.responseNumber||seat!==this.engine.respondingSeat){await this.broadcast();await this.pushDuel();return {ok:true,stale:true};}
   this.engine.respondFor(seat,number,response);
   await this.backend('tag-journal',{id:request.id,seat,number,response:encode(response)});
   await this.pushDuel();this.schedule();return {ok:true};
  }
  const result=await this.backend('tag-command',{seat,request});await this.broadcast();
  if(request.action==='buy'){
   const packs=(Array.isArray(result.result)?result.result:[]).filter(x=>x.kind==='pack');
   if(packs.length){const event={kind:'shop-packs',id:seat+':'+request.id,buyer:seat,packs};if(this.connected)this.send(event);this.showPackEvent(event)}
  }
  return result.result;
 }
 showPackEvent(event){
  if(!event.id||this.packEvents.has(event.id)||!Array.isArray(event.packs)||!event.packs.length)return;
  this.packEvents.add(event.id);this.onPacks(event);
 }
 async startEngine(config){
  this.engine=this.duelFactory?await this.duelFactory():await new TagDuel([...this.content.cards,...this.content.tokenCards]).init();
  this.engine.startTag(config);
  for(const entry of config.responses||[]){const response=decode(entry.response);if(entry.seat===null)this.engine.respond(response);else this.engine.respondFor(entry.seat,entry.number,response)}
  this.engine.visuals=[];await this.pushDuel();this.schedule();
 }
 async pushDuel(){
  if(!this.engine)return;
  const cues=this.engine.visuals.splice(0);const presentation=this.onDuel(this.engine.snapshotFor(0),this.engine.cuesFor?.(0,cues)??cues);
  if(this.connected)this.send({kind:'duel',snapshot:this.engine.snapshotFor(1),cues:this.engine.cuesFor?.(1,cues)??cues});
  await presentation;
  if(!this.engine)return;
  if(this.engine.finished){
   const result=this.engine.finished;await saveRecording(this.engine);if(this.connected&&this.engine.replayRecord)this.send({kind:'replay',record:this.engine.replayRecord});await this.backend('tag-finish',{winner:result.player,reason:result.reason,lp:this.engine.lp[0],events:this.engine.summary()});
   this.engine.destroy();this.engine=null;await this.broadcast();
  }
 }
 schedule(){
  clearTimeout(this.aiTimer);if(!this.connected||!this.engine||this.engine.pvp||this.engine.pending?.player!==1)return;
  this.aiTimer=setTimeout(()=>this.enqueue(async()=>{
   if(!this.connected||!this.engine||this.engine.pvp||this.engine.pending?.player!==1)return;
   const response=this.engine.auto();this.engine.respond(response);await this.backend('tag-journal',{seat:null,response:encode(response)});await this.pushDuel();this.schedule();
  }),this.engine.inDamageStep?40:120);
 }
 scheduleRecovery(delay){
  // The guest coordinates new generations. The host follows via signaling;
  // having both seats rejoin independently continually tears down the link.
  if(this.recoveryStopped||this.connected||this.recoveryTimer||this.recoveryRunning||(this.seat??this.peer.seat)!==1)return;
  const wait=delay??Math.min(60000,2000*2**Math.min(this.recoveryAttempts,5));
  this.recoveryTimer=setTimeout(async()=>{
   this.recoveryTimer=null;if(this.recoveryStopped||this.connected)return;
   this.recoveryRunning=true;this.recoveryAttempts++;
   try{await this.peer.reconnect()}catch(error){this.onStatus('reconnecting','Retrying the connection in the background.')}finally{
    this.recoveryRunning=false;if(!this.connected&&!this.recoveryStopped)this.scheduleRecovery(Math.max(30000,Math.min(60000,2000*2**Math.min(this.recoveryAttempts,5))));
   }
  },wait);
 }
 async reconnect(){this.recoveryStopped=false;clearTimeout(this.recoveryTimer);this.recoveryTimer=null;this.connected=false;clearTimeout(this.aiTimer);try{return await this.peer.reconnect()}finally{this.scheduleRecovery(30000)}}
 async exit(){
  this.recoveryStopped=true;
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
 async pause(){this.recoveryStopped=true;clearTimeout(this.recoveryTimer);this.recoveryTimer=null;this.connected=false;clearTimeout(this.aiTimer);this.peer.suspend();if(this.seat===0&&this.active)await this.enqueue(()=>this.backend('tag-pause',true))}
}
