// Per-room WebSocket hubs. One socket per player replaces signalling polls and Draft/Collector polls: a connect is
// one Worker request, idle sockets hibernate, and the runtime answers "ping" without waking the object.
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
// A socket that stopped pinging this long ago is treated as gone. Hidden pages ping about once a minute.
export const STALE_SOCKET=75000;
class Hub {
 constructor(ctx,env){this.ctx=ctx;this.env=env;ctx.setWebSocketAutoResponse?.(new WebSocketRequestResponsePair('ping','pong'))}
 sockets(seat){return this.ctx.getWebSockets('seat'+seat).filter(ws=>ws.readyState===1&&!ws.deserializeAttachment()?.replaced)}
 online(seat){return this.sockets(seat).length>0}
 replace(seat){for(const old of this.sockets(seat)){old.serializeAttachment({...old.deserializeAttachment(),replaced:true});old.close(4001,'Replaced connection')}}
 accept(seat){
  const [client,server]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(server,['seat'+seat]);server.serializeAttachment({seat,at:Date.now()});
  return {server,response:new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'shadowrun'}})};
 }
 // Half-open sockets never fire a close event, so the waiting player asks.
 stale(seat,now=Date.now()){
  const silent=[];for(const ws of this.sockets(seat)){const last=this.ctx.getWebSocketAutoResponseTimestamp?.(ws)?.getTime()||ws.deserializeAttachment()?.at||now;if(now-last>=STALE_SOCKET)silent.push(ws)}
  for(const ws of silent){ws.serializeAttachment({...ws.deserializeAttachment(),replaced:true});try{ws.close(4003,'Connection went silent')}catch{}}
  return silent.length>0;
 }
 webSocketError(ws){try{ws.close(1011,'Hub connection error')}catch{}}
}

// Tag rooms: forwards frames between seats, including WebRTC signalling. Traffic is never stored: the sender keeps
// unacknowledged frames and resends them when the partner returns.
export class TagHub extends Hub {
 async fetch(request){
  const seat=Number(request.headers.get('X-Seat'));if(seat!==0&&seat!==1)return reply(403,{error:'Invalid seat.'});
  this.replace(seat);const {server,response}=this.accept(seat);
  server.send(JSON.stringify({hub:'welcome',seat,peer:this.online(1-seat)}));
  this.tell(1-seat,{hub:'peer',online:true});return response;
 }
 tell(seat,data){for(const ws of this.sockets(seat))try{ws.send(JSON.stringify(data))}catch{}}
 webSocketMessage(ws,message){
  const attachment=ws.deserializeAttachment();if(attachment?.replaced)return;
  if(typeof message!=='string'||message.length>1048576){ws.close(1009,'Packet too large');return}
  const other=1-attachment.seat;
  if(message==='check'){if(this.stale(other))this.tell(attachment.seat,{hub:'peer',online:false});return}
  for(const peer of this.sockets(other))try{peer.send(message)}catch{}
 }
 webSocketClose(ws){const attachment=ws.deserializeAttachment();try{ws.close(1000,'Connection closed')}catch{}if(!attachment?.replaced)this.tell(1-attachment.seat,{hub:'peer',online:false})}
}

// Draft and Collector rooms. Orders each duel's responses, runs the turn clock and disconnect allowance from socket
// presence, and reports results to the registry, which still owns players, decks and match state. The clock starts
// only after a grace period, so slow links do not pay for transit, and a short drop costs nothing.
export const TURN_TIME=180000,DISCONNECT_ALLOWANCE=300000,HANDOFF_GRACE=2000,DROP_GRACE=20000;
const eventKey=(game,n)=>`e:${game}:${String(n).padStart(6,'0')}`;
export class MatchHub extends Hub {
 constructor(ctx,env){super(ctx,env);ctx.blockConcurrencyWhile(async()=>{this.meta=await ctx.storage.get('meta')||null})}
 async fetch(request){
  const summary=request.headers.get('X-Hub-Summary');
  if(request.headers.get('X-Hub-Sync')){await this.apply(await request.json());return reply(200,{ok:true})}
  const seat=Number(request.headers.get('X-Seat'));if(seat!==0&&seat!==1||!summary)return reply(403,{error:'Invalid seat.'});
  await this.apply(JSON.parse(summary));
  this.replace(seat);const {response}=this.accept(seat);
  if(this.meta){const m=this.meta;this.settle();m.offlineAt[seat]=null;m.chargedAt[seat]=null;await this.save();await this.arm();this.presence()}
  return response;
 }
 // Idempotent, because it arrives both from the registry and with every connection.
 async apply(s){
  const now=Date.now();
  if(s.phase==='complete'){this.broadcast({t:'room',phase:s.phase,game:s.game});await this.ctx.storage.deleteAlarm();await this.ctx.storage.deleteAll();this.meta=null;return}
  const m=this.meta??={kind:s.kind,code:s.code,phase:s.phase,game:0,players:s.players,actor:null,turn:1,turnLeft:[TURN_TIME,TURN_TIME],clockAt:now,count:0,votes:{},clockVotes:{},disconnectLeft:[DISCONNECT_ALLOWANCE,DISCONNECT_ALLOWANCE],offlineAt:[null,null],chargedAt:[null,null],alarmAt:null};
  const changed=m.phase!==s.phase||m.game!==s.game||m.players!==s.players;
  if(!changed){
   // Ready flags, the chooser and scores live in the registry; a nudge is all the clients need.
   if(s.nudge&&s.nudge!==this.nudge){this.nudge=s.nudge;this.broadcast({t:'room',phase:s.phase,game:s.game})}
   return;
  }
  this.settle(now);m.players=s.players;m.phase=s.phase;
  if(s.phase==='duel'&&s.game!==m.game){
   await this.clearEvents(m.game);m.game=s.game;m.count=0;m.actor=s.actor;m.turn=1;m.turnLeft=[TURN_TIME,TURN_TIME];m.clockAt=now+HANDOFF_GRACE;m.votes={};m.clockVotes={};m.reported=false;
  }else m.game=s.game;
  // A player who never reached the hub is offline, or nothing would ever charge them.
  for(let seat=0;seat<m.players;seat++)if(!this.online(seat)&&m.offlineAt[seat]===null)m.offlineAt[seat]=now;
  await this.save();await this.arm();this.broadcast({t:'room',phase:s.phase,game:s.game});
 }
 async clearEvents(game){for(;;){const keys=[...(await this.ctx.storage.list({prefix:`e:${game}:`,limit:128})).keys()];if(!keys.length)return;await this.ctx.storage.delete(keys)}}
 save(extra={}){return this.ctx.storage.put({meta:this.meta,...extra})}
 broadcast(data){const text=JSON.stringify(data);for(const seat of [0,1])for(const ws of this.sockets(seat))try{ws.send(text)}catch{}}
 clock(){const m=this.meta;return {actor:m.actor,turn:m.turn,turnLeft:m.turnLeft,clockAt:m.clockAt,now:Date.now()}}
 presenceData(){const m=this.meta;return {online:[this.online(0),this.online(1)],offlineAt:m.offlineAt,chargedAt:m.chargedAt,disconnectLeft:m.disconnectLeft,grace:DROP_GRACE,...this.clock()}}
 presence(){this.broadcast({t:'presence',...this.presenceData()})}
 // Charge everything owed up to now, then advance the marks so the same time is never charged twice.
 settle(now=Date.now()){
  const m=this.meta;if(!m||m.players<2)return;
  for(let seat=0;seat<2;seat++){const since=m.offlineAt[seat];if(since===null)continue;const from=Math.max(since+DROP_GRACE,m.chargedAt[seat]??0);if(now>from){m.disconnectLeft[seat]-=now-from;m.chargedAt[seat]=now}}
  const waiting=m.offlineAt.some(t=>t!==null);
  if(m.phase==='duel'&&m.actor!==null&&!waiting&&now>m.clockAt)m.turnLeft[m.actor]-=now-m.clockAt;
  m.clockAt=Math.max(m.clockAt,now);
 }
 async enforce(){
  const m=this.meta;if(!m||m.players<2||m.reported)return;
  const out=m.disconnectLeft.map(t=>t<=0);let report=null;
  if(out[0]&&out[1])report={type:'both'};
  else if(out[0]||out[1])report={type:'forfeit',seat:out[0]?0:1,reason:'Disconnect allowance exhausted'};
  else if(m.phase==='duel'&&m.turnLeft.some(t=>t<=0))report={type:'forfeit',seat:m.turnLeft[0]<=0?0:1,reason:'Turn timer expired'};
  if(report)await this.report(report);
 }
 async report(data){
  const m=this.meta;m.reported=true;await this.save();const kind=m.kind,name=kind==='draft'?'draft-v1':'collectors-v1',binding=kind==='draft'?this.env.DRAFT:this.env.COLLECTOR;
  try{const response=await binding.get(binding.idFromName(name)).fetch('https://internal/hub-report',{method:'POST',headers:{'X-Hub-Report':'1'},body:JSON.stringify({...data,code:m.code,game:m.game,turns:m.turn})});if(!response.ok)throw Error('Report refused.')}
  catch{if(this.meta){this.meta.reported=false;await this.save();await this.ctx.storage.setAlarm(Date.now()+5000);this.meta.alarmAt=Date.now()+5000}}
 }
 // Alarms write to storage, so one is set only when it would fire earlier than the one already waiting. A deadline
 // that moved later is re-armed when the older alarm fires.
 deadline(now=Date.now()){
  const m=this.meta;if(!m||m.players<2||m.reported)return null;const times=[];
  for(let seat=0;seat<2;seat++)if(m.offlineAt[seat]!==null)times.push(Math.max(now,m.offlineAt[seat]+DROP_GRACE)+Math.max(0,m.disconnectLeft[seat]));
  if(m.phase==='duel'&&m.actor!==null&&m.offlineAt.every(t=>t===null))times.push(m.clockAt+Math.max(0,m.turnLeft[m.actor]));
  return times.length?Math.min(...times)+50:null;
 }
 async arm(){const m=this.meta,at=this.deadline();if(at===null||m.alarmAt!==null&&m.alarmAt<=at)return;m.alarmAt=at;await this.ctx.storage.setAlarm(at);await this.save()}
 async alarm(){
  if(!this.meta)return;const m=this.meta;m.alarmAt=null;let gone=false;
  for(const seat of [0,1])if(this.stale(seat)){gone=true;await this.drop(seat)}
  this.settle();await this.enforce();if(!this.meta)return;await this.save();await this.arm();if(gone)this.presence();
 }
 async drop(seat){const m=this.meta;if(!m||m.offlineAt[seat]!==null)return;this.settle();m.offlineAt[seat]=Date.now();await this.save();await this.arm();this.presence()}
 async webSocketClose(ws){const attachment=ws.deserializeAttachment();try{ws.close(1000,'Connection closed')}catch{}if(attachment?.replaced||!this.meta||this.online(attachment.seat))return;await this.drop(attachment.seat)}
 async webSocketMessage(ws,message){
  const attachment=ws.deserializeAttachment();if(attachment?.replaced)return;const seat=attachment.seat;
  if(typeof message!=='string'||message.length>65536){ws.close(1009,'Packet too large');return}
  let v;try{v=JSON.parse(message)}catch{return}
  const m=this.meta;if(!m)return ws.send(JSON.stringify({t:'room',phase:'complete'}));
  if(v.t==='hello')return this.hello(ws,v);
  if(v.t==='check'){if(this.stale(1-seat))await this.drop(1-seat);else ws.send(JSON.stringify({t:'presence',...this.presenceData()}));return}
  if(v.t==='emote'){if(m.phase!=='duel'||v.game!==m.game||!['❤️','😜','🍆'].includes(v.emoji))return;const at=Date.now();this.lastEmote??=[0,0];if(at-this.lastEmote[seat]<1500)return;this.lastEmote[seat]=at;this.broadcast({t:'emote',seat,emoji:v.emoji});return}
  if(v.game!==m.game||m.phase!=='duel')return ws.send(JSON.stringify({t:'room',phase:m.phase,game:m.game}));
  if(v.t==='r')return this.response(ws,seat,v);
  if(v.t==='clock'){if(v.number!==m.count||!Number.isInteger(v.turn)||v.turn<1||![0,1,null].includes(v.actor))return;this.settle();m.clockVotes[seat]={number:v.number,turn:v.turn,actor:v.actor};const a=m.clockVotes[0],b=m.clockVotes[1];if(a&&b&&a.number===b.number&&a.turn===b.turn&&a.actor===b.actor){if(m.turn!==a.turn){m.turn=a.turn;m.turnLeft=[TURN_TIME,TURN_TIME]}m.actor=a.actor;m.clockAt=Date.now()+HANDOFF_GRACE;await this.save();await this.arm();this.broadcast({t:'presence',...this.presenceData()})}else await this.save();return}
  if(v.t==='result'){if(![0,1,2].includes(v.winner)||v.n!==m.count)return;m.votes[seat]=v.winner;if(Object.keys(m.votes).length<2){await this.save();return}const agreed=m.votes[0]===m.votes[1];if(!agreed){m.votes={};await this.save();this.broadcast({t:'desync'});return}await this.report({type:'game',winner:v.winner});return}
 }
 async hello(ws,v){
  const m=this.meta,after=Number.isInteger(v.after)&&v.after>=0&&v.game===m.game?v.after:0,events=[];
  if(m.phase==='duel'&&after<m.count)for(const [key,value] of await this.ctx.storage.list({prefix:`e:${m.game}:`,start:eventKey(m.game,after)}))events.push(value);
  ws.send(JSON.stringify({t:'sync',phase:m.phase,game:m.game,from:after,count:m.count,events,...this.presenceData()}));
 }
 async response(ws,seat,v){
  const m=this.meta;
  if(Number.isInteger(v.n)&&v.n<m.count){const event=await this.ctx.storage.get(eventKey(m.game,v.n));if(event?.seat===seat)ws.send(JSON.stringify({t:'ev',game:m.game,n:v.n,...event,...this.clock()}));return}
  if(v.n!==m.count||m.actor!==seat||![0,1,null].includes(v.nextActor)||!Number.isInteger(v.turn)||v.turn<m.turn||v.turn>m.turn+1||!v.response||JSON.stringify(v.response).length>16384)return ws.send(JSON.stringify({t:'reject',game:m.game,n:v.n,count:m.count}));
  const now=Date.now();this.settle(now);
  if(v.turn!==m.turn){m.turn=v.turn;m.turnLeft=[TURN_TIME,TURN_TIME]}
  m.clockAt=now+(v.nextActor!==m.actor?HANDOFF_GRACE:0);m.actor=v.nextActor;m.clockVotes={};
  const event={seat,response:v.response,...(typeof v.h==='number'?{h:v.h}:{})};const n=m.count++;
  await this.save({[eventKey(m.game,n)]:event});await this.arm();
  this.broadcast({t:'ev',game:m.game,n,...event,...this.clock()});
 }
}
