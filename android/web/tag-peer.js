// Ordered P2P transport with an authenticated WebSocket relay fallback.
export class TagPeer {
 constructor(endpoint,{onState=()=>{},onMessage=()=>{},iceServers=null,relayOnly=false}={}){
  const url=new URL(endpoint);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Use HTTPS for the room service.');
  this.endpoint=url.href.replace(/\/$/,'');this.onState=onState;this.onMessage=onMessage;this.customIce=iceServers;this.relayOnly=relayOnly;this.cursor=0;this.sequence=0;this.received=0;this.closed=false;this.candidates=[];this.epoch=0;this.inDuel=false;
 }
 async request(action,body={}){
  const response=await fetch(`${this.endpoint}/v1/${action}`,{method:'POST',headers:{'Content-Type':'application/json',...(this.token?{Authorization:`Bearer ${this.token}`}:{})},body:JSON.stringify({code:this.code,...body}),signal:AbortSignal.timeout(10000)});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Room service unavailable.');return result;
 }
 async host(){return this.open(await this.request('create'))}
 async join(code){if(!/^[A-Z2-9]{5}$/.test(code.toUpperCase()))throw Error('Enter the five-character room code.');const room=code.toUpperCase();return this.open(await this.request('join',{code:room,resumeToken:localStorage.getItem(this.endpoint+':tag:'+room)||undefined}))}
 async open(session){
  clearTimeout(this.timer);this.closed=false;Object.assign(this,session);localStorage.setItem(this.endpoint+':tag:'+this.code,this.token);await globalThis.flushDesktopStorage?.();this.resetConnection();
  this.onState(session.resumed?'reconnecting':'waiting',this.code);this.poll(this.epoch);return {code:this.code,seat:this.seat};
 }
 resetConnection(){
  this.epoch++;
  clearTimeout(this.fallbackTimer);clearTimeout(this.disconnectTimer);
  if(this.socket){this.socket.onclose=null;this.socket.onmessage=null;this.socket.close();this.socket=null}
  if(this.channel){this.channel.onclose=null;this.channel.onmessage=null;this.channel.onopen=null}
  if(this.pc){this.pc.onconnectionstatechange=null;this.pc.onicecandidate=null;this.pc.ondatachannel=null;this.pc.close()}
  this.sequence=0;this.received=0;this.cursor=0;this.candidates=[];this.offered=false;this.channel=null;
  if(this.relay){this.openRelay();return}
  this.pc=new RTCPeerConnection({iceServers:this.customIce||this.iceServers,iceTransportPolicy:this.relayOnly?'relay':'all'});
  const pc=this.pc,epoch=this.epoch,generation=this.generation;
  this.pc.onicecandidate=e=>{if(e.candidate&&epoch===this.epoch)this.request('signal',{generation,message:{type:'candidate',candidate:e.candidate.toJSON()}}).catch(error=>{if(epoch===this.epoch)this.onState('signaling-error',error.message)})};
  // Only an open data channel is ready for game messages. The RTC connection
  // itself can report connected before SCTP opens, and must not send two hellos.
  this.pc.onconnectionstatechange=()=>{
   if(epoch!==this.epoch)return;
   clearTimeout(this.disconnectTimer);
   if(pc.connectionState==='disconnected'){
    // ICE can briefly disconnect during Wi-Fi/mobile handover. Let it recover.
    this.disconnectTimer=setTimeout(()=>{if(epoch===this.epoch&&pc.connectionState==='disconnected')this.onState('disconnected')},this.inDuel?4000:15000);
   }else if(pc.connectionState!=='connected')this.onState(pc.connectionState);
  };
  this.pc.ondatachannel=e=>this.attach(e.channel);
  if(this.seat===0)this.attach(this.pc.createDataChannel('shadow-run-tag',{ordered:true}));
 }
 attach(channel){
  this.channel=channel;const epoch=this.epoch;channel.binaryType='arraybuffer';channel.onopen=()=>this.onState('connected');channel.onclose=()=>{if(this.closed||epoch!==this.epoch)return;this.onState('disconnected');if(this.timer){clearTimeout(this.timer);this.timer=setTimeout(()=>this.poll(epoch),1000)}};
  channel.onmessage=e=>{try{if(typeof e.data!=='string'||e.data.length>1048576)throw Error('Invalid peer packet.');const packet=JSON.parse(e.data);if(packet.protocol!==1||!Number.isSafeInteger(packet.sequence)||packet.sequence!==this.received+1)throw Error('Peer sequence mismatch.');this.received=packet.sequence;this.onMessage(packet.payload)}catch(error){this.onState('protocol-error',error.message);this.pc?.close();this.socket?.close()}};
 }
 openRelay(){
  const epoch=this.epoch,url=this.endpoint.replace(/^http/,'ws')+'/v1/relay';
  const socket=this.socket=new WebSocket(url,['shadowrun','room.'+this.code,'auth.'+this.token,'gen.'+this.generation]);
  const channel={readyState:'connecting',get bufferedAmount(){return socket.bufferedAmount},send:data=>socket.send(data),close:()=>socket.close()};this.attach(channel);
  socket.onmessage=e=>{if(epoch!==this.epoch)return;try{const packet=JSON.parse(e.data);if(packet.relay==='ready'){if(channel.readyState!=='open'){channel.readyState='open';channel.onopen()}return}channel.onmessage(e)}catch(error){this.onState('protocol-error',error.message);socket.close()}};
  socket.onclose=()=>{channel.readyState='closed';if(epoch===this.epoch&&!this.closed)channel.onclose()};
  socket.onerror=()=>{if(epoch===this.epoch&&!this.closed)this.onState('signaling-error','Relay connection interrupted. Reconnect to continue.')};
 }
 async poll(epoch=this.epoch){
  if(this.closed||epoch!==this.epoch)return;
  this.timer=null;
  try{
   const {joined,messages,generation,relay}=await this.request('poll',{after:this.cursor,generation:this.generation});
   if(this.closed||epoch!==this.epoch)return;
   if(generation!==this.generation){this.generation=generation;this.relay=!!relay;this.resetConnection();this.onState('reconnecting');return this.poll(this.epoch)}
   if(joined&&this.relayAvailable&&!this.relay&&!this.fallbackTimer){this.fallbackTimer=setTimeout(()=>{if(epoch===this.epoch&&this.channel?.readyState!=='open')this.request('fallback').catch(error=>this.onState('signaling-error',error.message))},this.relayOnly?0:8000)}
   if(!this.relay&&this.seat===0&&joined&&!this.offered){this.offered=true;await this.pc.setLocalDescription(await this.pc.createOffer());await this.request('signal',{generation:this.generation,message:{type:'offer',sdp:this.pc.localDescription.sdp}})}
   for(const envelope of messages){if(this.closed||epoch!==this.epoch)return;const message=envelope.message;
    if(this.relay)continue;
    if(message.type==='offer'||message.type==='answer'){
     if(message.type==='offer'&&this.seat===0||message.type==='answer'&&this.seat===1)throw Error('Unexpected signaling role.');
     await this.pc.setRemoteDescription({type:message.type,sdp:message.sdp});
     for(const candidate of this.candidates)await this.pc.addIceCandidate(candidate);this.candidates=[];
     if(message.type==='offer'){await this.pc.setLocalDescription(await this.pc.createAnswer());await this.request('signal',{generation:this.generation,message:{type:'answer',sdp:this.pc.localDescription.sdp}})}
    }else if(message.type==='candidate'){if(this.pc.remoteDescription)await this.pc.addIceCandidate(message.candidate);else this.candidates.push(message.candidate)}
    this.cursor=envelope.sequence;
   }
  }catch(error){if(epoch===this.epoch&&!this.closed)this.onState('signaling-error',error.message)}
  if(!this.closed&&epoch===this.epoch)this.timer=setTimeout(()=>this.poll(epoch),this.pollDelay());
 }
 pollDelay(){return this.channel?.readyState==='open'?(this.inDuel?15000:60000):1000}
 setPhase(phase){
  const next=phase==='duel';if(next===this.inDuel)return;this.inDuel=next;
  // Let any in-flight poll finish; only reschedule an outstanding timer.
  if(this.timer){clearTimeout(this.timer);this.timer=setTimeout(()=>this.poll(this.epoch),this.pollDelay())}
 }
 send(payload){
  if(this.channel?.readyState!=='open')throw Error('Peer disconnected. The run is paused.');
  if(this.channel.bufferedAmount>2097152)throw Error('Peer is catching up. Please wait.');
  const packet=JSON.stringify({protocol:1,sequence:this.sequence+1,payload});if(packet.length>1048576)throw Error('Peer packet too large.');this.channel.send(packet);this.sequence++;
 }
 async route(){if(this.relay)return this.channel?.readyState==='open'?'relay':'connecting';const stats=await this.pc.getStats();let pair;for(const entry of stats.values())if(entry.type==='transport'&&entry.selectedCandidatePairId)pair=stats.get(entry.selectedCandidatePairId);return pair?[stats.get(pair.localCandidateId)?.candidateType,stats.get(pair.remoteCandidateId)?.candidateType].includes('relay')?'relay':'direct':'connecting'}
 async reconnect(){
  if(this.reconnecting)return this.reconnecting;
  this.suspend();this.onState('reconnecting',this.code);
  this.reconnecting=this.request('join',{code:this.code,resumeToken:this.token}).then(session=>this.open(session));
  try{return await this.reconnecting}finally{this.reconnecting=null}
 }
 // A temporary disconnect keeps the seat token. Only Leave releases the room.
 suspend(){this.closed=true;this.epoch++;clearTimeout(this.timer);clearTimeout(this.fallbackTimer);clearTimeout(this.disconnectTimer);this.pc?.close();this.socket?.close()}
 async close(){this.suspend();if(this.token){await this.request('leave');localStorage.removeItem(this.endpoint+':tag:'+this.code);await globalThis.flushDesktopStorage?.();this.token=null}}
}
