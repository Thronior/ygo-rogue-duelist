import {HubSocket} from './hub-socket.js';
// Reliable partner link. Frames start on the room hub, so play begins as soon as both players are there, and move to a
// direct WebRTC channel when one opens. Numbered, acknowledged frames survive any change of route or a dropped socket.
const DIRECT_PING=2000,DIRECT_SILENCE=5000,DIRECT_LIMIT=200000,ATTEMPT_WAIT=15000,TOUCH_EVERY=7200000;
const ACK_DIRECT=150,ACK_HUB=1200,RESEND_CHECK=2000,RESEND_AFTER=4000,PROBE_AFTER=4000,PARTNER_CHECK=15000,QUIET_PROBE=5000;
export class TagPeer {
 constructor(endpoint,{onState=()=>{},onMessage=()=>{},iceServers=null,relayOnly=false}={}){
  const url=new URL(endpoint);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Use HTTPS for the room service.');
  this.endpoint=url.href.replace(/\/$/,'');this.onState=onState;this.onMessage=onMessage;this.customIce=iceServers;this.relayOnly=relayOnly;this.closed=true;
  this.sid=crypto.randomUUID().slice(0,8);this.peerSid=null;this.linked=false;this.outSeq=0;this.inSeq=0;this.outbox=[];this.early=new Map();this.attempt=0;this.directFailures=0;
  this.retryDirect=()=>{this.directFailures=0;if(this.linked&&!this.directUp)this.planDirect(0)};
 }
 async request(action,body={}){
  const response=await fetch(`${this.endpoint}/v2/${action}`,{method:'POST',headers:{'Content-Type':'application/json',...(this.token?{Authorization:`Bearer ${this.token}`}:{})},body:JSON.stringify({code:this.code,...body}),signal:AbortSignal.timeout(10000)});
  const result=await response.json();if(!response.ok){const error=Error(result.error||'Room service unavailable.');error.status=response.status;throw error}return result;
 }
 async host(){return this.open(await this.request('create'))}
 async join(code){if(!/^[A-Z2-9]{5}$/.test(code.toUpperCase()))throw Error('Enter the five-character room code.');const room=code.toUpperCase();return this.open(await this.request('join',{code:room,resumeToken:localStorage.getItem(this.endpoint+':tag:'+room)||undefined}))}
 async open(session){
  this.closed=false;Object.assign(this,session);localStorage.setItem(this.endpoint+':tag:'+this.code,this.token);await globalThis.flushDesktopStorage?.();
  this.onState(session.resumed?'reconnecting':'waiting',this.code);this.connectHub();return {code:this.code,seat:this.seat};
 }
 connectHub(){
  this.hub?.stop();
  this.hub=new HubSocket(this.endpoint.replace(/^http/,'ws')+'/v3/hub',['shadowrun','room.'+this.code,'auth.'+this.token],{
   onOpen:()=>{},onClose:code=>this.hubClosed(code),onMessage:text=>this.hubMessage(text),onFailing:count=>this.hubFailing(count)
  });
  this.hub.start();clearInterval(this.ticker);this.ticker=setInterval(()=>this.tick(),RESEND_CHECK);this.touchedAt=Date.now();
  globalThis.addEventListener?.('online',this.retryDirect);
 }
 // A connect that keeps failing may mean the room is gone; only the room service can say so.
 async hubFailing(count){
  if(this.closed||count<4||count%4)return;this.onState('signaling-error','Reconnecting to the room');
  try{await this.request('join',{code:this.code,resumeToken:this.token})}catch(error){if([400,426].includes(error.status)){this.suspend();this.onState('error',error.message)}}
 }
 hubClosed(code){if(code===4001){this.suspend();this.onState('error','This room was opened somewhere else.');return}if(!this.directUp)this.linkDown()}
 hubMessage(text){
  let packet;try{packet=JSON.parse(text)}catch{return}
  if(packet.hub==='welcome'){if(packet.peer)this.announce();else if(!this.directUp)this.linkDown();return}
  if(packet.hub==='peer'){if(packet.online)this.announce();else if(!this.directUp)this.linkDown();return}
  if(packet.sig){this.signal(packet.sig);return}
  this.frame(packet);
 }
 announce(){this.hub?.send(JSON.stringify({l:this.sid,to:this.peerSid}))}
 linkDown(){if(!this.linked)return;this.linked=false;this.onState('disconnected')}
 frame(packet){
  this.heardAt=Date.now();
  if(packet.ping){this.rawDirect({pong:packet.ping});return}
  if(packet.pong){this.directRtt=Date.now()-packet.pong;return}
  if(packet.l){
   const fresh=packet.l!==this.peerSid,was=this.linked;
   if(fresh){this.peerSid=packet.l;this.outSeq=0;this.inSeq=0;this.outbox=[];this.early.clear();this.closeDirect()}
   if(packet.to!==this.sid||!was)this.announce();
   this.linked=true;this.resend();
   if(fresh||!was)this.onState('connected');
   this.planDirect(0);return;
  }
  if(packet.s!==this.peerSid||packet.t!==this.sid)return;
  if(!this.linked){this.linked=true;this.onState('connected')}
  if(packet.a)this.acknowledged(packet.a);
  if(!packet.q)return;
  if(packet.q>this.inSeq+1)this.early.set(packet.q,packet.d);
  else if(packet.q===this.inSeq+1){this.deliver(packet.q,packet.d);for(let next=this.inSeq+1;this.early.has(next);next=this.inSeq+1){const held=this.early.get(next);this.early.delete(next);this.deliver(next,held)}}
  this.scheduleAck();
 }
 deliver(seq,payload){this.inSeq=seq;this.onMessage(payload)}
 acknowledged(ack){this.ackedOut=Math.max(this.ackedOut||0,ack);while(this.outbox.length&&this.outbox[0].q<=ack)this.outbox.shift()}
 // Every data frame carries an ack, so a separate one goes out only when the line stays quiet.
 scheduleAck(){if(this.ackTimer)return;this.ackTimer=setTimeout(()=>{this.ackTimer=null;this.transmit(JSON.stringify({s:this.sid,t:this.peerSid,a:this.inSeq}))},this.directUp?ACK_DIRECT:ACK_HUB)}
 transmit(text){if(this.directUp&&text.length<DIRECT_LIMIT){try{this.channel.send(text);return true}catch{this.directLost()}}return !!this.hub?.send(text)}
 resend(){const now=Date.now();for(const item of this.outbox){item.at=now;this.transmit(this.encode(item))}}
 encode(item){return JSON.stringify({s:this.sid,t:this.peerSid,q:item.q,a:this.inSeq,d:item.d})}
 tick(){
  const now=Date.now(),oldest=this.outbox[0];
  if(this.channel?.readyState==='open'&&now-(this.directPingAt||0)>=DIRECT_PING){this.directPingAt=now;this.rawDirect({ping:now})}
  if(this.wasDirect&&!this.directUp){this.wasDirect=false;this.directLost()}
  // An unanswered frame is the fastest sign of a dead socket, well ahead of the next routine ping.
  if(oldest&&now-oldest.first>=PROBE_AFTER)this.hub?.ping();
  // A player who is only waiting has no frame to go unanswered, so silence when a move is due has to do the same job.
  if(!this.directUp&&this.expecting?.()&&now-Math.max(this.heardAt||0,this.probedAt||0)>=QUIET_PROBE){this.probedAt=now;this.hub?.ping()}
  if(oldest&&now-oldest.at>=Math.max(RESEND_AFTER,(this.rtt()||0)*3))this.resend();
  if(oldest&&now-(oldest.first||now)>=PARTNER_CHECK&&now-(this.checkAt||0)>=PARTNER_CHECK){this.checkAt=now;this.hub?.send('check')}
  // Rooms expire a day after the last contact, and a direct game may not touch the service for hours.
  if(now-this.touchedAt>=TOUCH_EVERY){this.touchedAt=now;this.request('poll',{after:0,generation:this.generation}).catch(()=>{})}
 }
 rawDirect(data){try{if(this.channel?.readyState==='open')this.channel.send(JSON.stringify(data))}catch{}}
 get directUp(){return this.channel?.readyState==='open'&&Date.now()-(this.directSeen||0)<DIRECT_SILENCE}
 attach(channel){
  this.channel=channel;const attempt=this.attempt;channel.binaryType='arraybuffer';
  channel.onopen=()=>{if(attempt!==this.attempt)return;clearTimeout(this.attemptTimer);this.directSeen=Date.now();this.directFailures=0;this.wasDirect=true;this.directPingAt=0;this.resend();this.onState('route','direct')};
  channel.onmessage=e=>{if(attempt!==this.attempt||typeof e.data!=='string')return;this.directSeen=Date.now();try{this.frame(JSON.parse(e.data))}catch(error){console.warn('Peer frame:',error.message)}};
  channel.onclose=()=>{if(attempt===this.attempt)this.directLost()};
 }
 // The hub is already carrying the room, so losing the direct route costs one resend, not a reconnect.
 directLost(){if(this.channel||this.pc){this.closeDirect();this.resend();this.onState('route','relay');if(!this.hub?.isOpen)this.linkDown();this.directFailures++;this.planDirect()}}
 closeDirect(){
  this.attempt++;clearTimeout(this.attemptTimer);this.wasDirect=false;this.directRtt=null;
  if(this.channel){this.channel.onopen=this.channel.onclose=this.channel.onmessage=null;try{this.channel.close()}catch{}this.channel=null}
  if(this.pc){this.pc.onicecandidate=this.pc.onconnectionstatechange=this.pc.ondatachannel=null;try{this.pc.close()}catch{}this.pc=null}
 }
 // Only the host offers. After three failures it tries once every 10 minutes: a route that fails early in a session
 // can open later, and only a rejoin used to bring it back (tag stalls, 2026-11-02). Each try is a few hub frames.
 planDirect(wait){
  if(this.relayOnly||this.seat!==0||this.closed||!this.linked||this.pc||this.directTimer)return;
  this.directTimer=setTimeout(()=>{this.directTimer=null;this.offer().catch(()=>this.directFailed())},wait??(this.directFailures>=3?600000:15000*2**this.directFailures));
 }
 directFailed(){this.closeDirect();this.directFailures++;this.planDirect()}
 makePC(){
  this.closeDirect();const pc=this.pc=new RTCPeerConnection({iceServers:this.customIce||this.iceServers||[]}),attempt=this.attempt;
  pc.onicecandidate=e=>{if(e.candidate&&attempt===this.attempt)this.hub?.send(JSON.stringify({sig:{type:'candidate',attempt:this.remoteAttempt??attempt,candidate:e.candidate.toJSON()}}))};
  pc.onconnectionstatechange=()=>{if(attempt===this.attempt&&pc.connectionState==='failed')this.seat===0?this.directLost():this.closeDirect()};
  pc.ondatachannel=e=>this.attach(e.channel);
  return pc;
 }
 async offer(){
  if(this.closed||!this.linked)return;
  const pc=this.makePC();this.remoteAttempt=undefined;this.attach(pc.createDataChannel('shadow-run-tag',{ordered:true}));this.candidates=[];
  await pc.setLocalDescription(await pc.createOffer());
  this.hub?.send(JSON.stringify({sig:{type:'offer',attempt:this.attempt,sdp:pc.localDescription.sdp}}));
  this.attemptTimer=setTimeout(()=>{if(this.pc===pc&&!this.directUp)this.directFailed()},ATTEMPT_WAIT);
 }
 async signal(message){
  try{
   if(message.type==='offer'){
    if(this.seat===0)return;const pc=this.makePC();this.remoteAttempt=message.attempt;this.candidates=[];
    await pc.setRemoteDescription({type:'offer',sdp:message.sdp});await pc.setLocalDescription(await pc.createAnswer());
    this.hub?.send(JSON.stringify({sig:{type:'answer',attempt:message.attempt,sdp:pc.localDescription.sdp}}));await this.flushCandidates();
   }else if(message.type==='answer'){
    if(this.seat!==0||message.attempt!==this.attempt||!this.pc)return;await this.pc.setRemoteDescription({type:'answer',sdp:message.sdp});await this.flushCandidates();
   }else if(message.type==='candidate'){
    if(message.attempt!==(this.remoteAttempt??this.attempt)&&this.seat===0)return;
    if(this.pc?.remoteDescription)await this.pc.addIceCandidate(message.candidate);else (this.candidates??=[]).push(message.candidate);
   }
  }catch(error){console.warn('Direct route:',error.message)}
 }
 async flushCandidates(){const waiting=this.candidates||[];this.candidates=[];for(const candidate of waiting)await this.pc?.addIceCandidate(candidate)}
 setPhase(){}
 // Queues while the partner is away: acknowledged delivery resumes when either route returns.
 send(payload){
  if(!this.peerSid)throw Error('Peer disconnected. The run is paused.');
  const now=Date.now(),item={q:this.outSeq+1,d:payload,at:now,first:now},text=this.encode(item);if(text.length>1048000)throw Error('Peer packet too large.');
  this.outSeq++;this.outbox.push(item);clearTimeout(this.ackTimer);this.ackTimer=null;this.transmit(text);
 }
 get route(){return this.directUp?'direct':this.hub?.isOpen?'relay':'connecting'}
 rtt(){return this.directUp?this.directRtt??null:this.hub?.rtt==null?null:this.hub.rtt*2}
 stats(){return {route:this.route,rtt:this.rtt(),linked:this.linked,backlog:this.outbox.length}}
 async reconnect(){if(this.closed){this.closed=false;this.connectHub();return}this.hub?.wake();}
 // A temporary disconnect keeps the seat token. Only Leave releases the room.
 suspend(){this.closed=true;this.linked=false;clearInterval(this.ticker);clearTimeout(this.ackTimer);this.ackTimer=null;clearTimeout(this.directTimer);this.directTimer=null;globalThis.removeEventListener?.('online',this.retryDirect);this.hub?.stop();this.hub=null;this.closeDirect()}
 async close(){this.suspend();if(this.token){await this.request('leave');localStorage.removeItem(this.endpoint+':tag:'+this.code);await globalThis.flushDesktopStorage?.();this.token=null}}
}
