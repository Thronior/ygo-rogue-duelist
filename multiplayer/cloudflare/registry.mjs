const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const random=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),v=>alphabet[v%32]).join('');
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
export class Registry {
 constructor({saved={},clock=()=>Date.now(),save=async()=>{},ice=async()=>[]}={}){
  this.clock=clock;this.saveState=save;this.ice=ice;this.rooms=new Map();this.attempts=new Map();this.lastSave=0;
  for(const [code,r]of Object.entries(saved))if(clock()-r.touched<86400000)this.rooms.set(code,{...r,generation:r.generation,queues:r.queues||[[],[]],seq:r.seq||0});
 }
 async save(){const data={};for(const [code,r]of this.rooms)data[code]={tokens:r.tokens,generation:r.generation,touched:r.touched,started:r.started,relay:!!r.relay,queues:r.queues,seq:r.seq};await this.saveState(data);this.lastSave=this.clock()}
 async request(action,b,auth='',address='unknown'){
  const now=this.clock();for(const [code,r]of this.rooms)if(now-r.touched>=86400000)this.rooms.delete(code);
  if(['create','join'].includes(action)){
   for(const [key,list]of this.attempts)if(now-list.at(-1)>60000)this.attempts.delete(key);
   if(this.attempts.size>4096&&!this.attempts.has(address))throw Error('Room service is busy. Try again shortly.');
   const list=(this.attempts.get(address)||[]).filter(t=>now-t<60000);if(list.length>=12)throw Error('Too many attempts. Wait one minute.');list.push(now);this.attempts.set(address,list);
  }
  if(action==='create'){
   if(this.rooms.size>=256)throw Error('Rooms are full. Try again later.');
   const iceServers=await this.ice();let code;do{code=random(5)}while(this.rooms.has(code));const secret=token();
   this.rooms.set(code,{tokens:[secret,null],generation:0,queues:[[],[]],seq:0,touched:now,started:false});await this.save();
   return {code,token:secret,seat:0,protocol:1,generation:0,started:false,iceServers};
  }
  const code=String(b.code||'').toUpperCase(),r=this.rooms.get(code);if(!r)throw Error('Room not found or expired.');
  if(action==='join'){
   let seat,secret,resumed=false;
   if(b.resumeToken){seat=r.tokens.indexOf(b.resumeToken);if(seat<0)throw Error('This device cannot resume that seat.');secret=b.resumeToken;resumed=true}
   else{if(r.tokens[1])throw Error('Room already has two players.');seat=1;secret=token()}
   const iceServers=await this.ice();
   if(resumed){r.queues=[[],[]];r.generation++}else r.tokens[1]=secret;
   r.touched=now;await this.save();return {code,token:secret,seat,protocol:1,generation:r.generation,started:r.started,relay:!!r.relay,resumed,iceServers};
  }
  const seat=r.tokens.indexOf(auth);if(!auth||seat<0)throw Error('Invalid room session.');r.touched=now;
  if(action==='started'){if(seat!==0)throw Error('Only the host can start.');r.started=true;await this.save();return {ok:true}}
  if(action==='fallback'){
   if(!r.relay){r.relay=true;r.generation++;r.queues=[[],[]];await this.save()}return {ok:true};
  }
  if(action==='poll'){
   if(!Number.isSafeInteger(b.after)||b.after<0)throw Error('Invalid message cursor.');
   if(b.generation===r.generation)r.queues[seat]=r.queues[seat].filter(m=>m.sequence>b.after);
   if(now-this.lastSave>=60000)await this.save();
   return {messages:r.queues[seat],joined:!!r.tokens[1],generation:r.generation,relay:!!r.relay};
  }
  if(action==='signal'){
   if(b.generation!==r.generation)throw Error('Connection was replaced. Reconnect this peer.');
   if(!b.message||!['offer','answer','candidate'].includes(b.message.type))throw Error('Only connection signals are accepted.');
   if(JSON.stringify(b.message).length>48000)throw Error('Signal too large.');const queue=r.queues[1-seat];if(queue.length>=256)throw Error('Peer is not receiving signals.');
   queue.push({sequence:++r.seq,message:b.message});await this.save();return {ok:true};
  }
  if(action==='leave'){if(seat===0)this.rooms.delete(code);else{r.tokens[1]=null;r.queues=[[],[]];r.generation++}await this.save();return {ok:true}}
  throw Error('Unknown room operation.');
 }
}
