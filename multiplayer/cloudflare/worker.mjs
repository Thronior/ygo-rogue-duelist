export {CollectorRegistry} from './collector.mjs';
import {Registry} from './registry.mjs';
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(path.startsWith('/collector/')&&request.method==='POST')return env.COLLECTOR.get(env.COLLECTOR.idFromName('collectors-v1')).fetch(request);
 if(path==='/health')return reply(200,{service:'shadow-run-rooms',protocol:1,relayConfigured:true,relayTransport:'websocket'});
 if(path==='/v1/relay'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket')return env.ROOMS.get(env.ROOMS.idFromName('rooms-v1')).fetch(request);
 if(request.method!=='POST'||!/^\/v1\/(create|join|started|poll|signal|leave|fallback)$/.test(path))return reply(404,{error:'Unknown room operation.'});
 return env.ROOMS.get(env.ROOMS.idFromName('rooms-v1')).fetch(request);
}};
export class RoomRegistry {
 constructor(ctx,env){
  this.ctx=ctx;this.env=env;this.tail=Promise.resolve();
  ctx.blockConcurrencyWhile(async()=>{this.registry=new Registry({saved:await ctx.storage.get('rooms')||{},save:data=>ctx.storage.put('rooms',data),ice:()=>this.ice()})});
 }
 async ice(){
  if(!this.env.TURN_KEY_ID||!this.env.TURN_KEY_API_TOKEN){return [{urls:'stun:stun.cloudflare.com:3478'}]}
  const response=await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/'+encodeURIComponent(this.env.TURN_KEY_ID)+'/credentials/generate-ice-servers',{method:'POST',headers:{Authorization:'Bearer '+this.env.TURN_KEY_API_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({ttl:86400}),signal:AbortSignal.timeout(7000)});
  if(!response.ok)throw Error('Relay service is temporarily unavailable. Try again.');const data=await response.json();if(!Array.isArray(data.iceServers))throw Error('Relay configuration is unavailable.');return data.iceServers;
 }
 async fetch(request){
  try{
   if(new URL(request.url).pathname==='/v1/relay'){
    const parts=(request.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(x=>x.trim());
    const code=parts.find(x=>x.startsWith('room.'))?.slice(5),token=parts.find(x=>x.startsWith('auth.'))?.slice(5),generation=Number(parts.find(x=>x.startsWith('gen.'))?.slice(4));
    const room=this.registry.rooms.get(code),seat=room?.tokens.indexOf(token);
    if(!token||!room||seat<0||!room.relay||generation!==room.generation||Date.now()-room.touched>=86400000)return reply(403,{error:'Invalid relay session.'});
    return this.env.RELAY.get(this.env.RELAY.idFromName(code+':'+generation)).fetch(new Request(request,{headers:{...Object.fromEntries(request.headers),'X-Relay-Seat':String(seat)}}));
   }
   if(Number(request.headers.get('Content-Length'))>65536)throw Error('Request too large.');
   const reader=request.body?.getReader();if(!reader)throw Error('Empty request.');let size=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw Error('Request too large.')}chunks.push(value)}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}const body=JSON.parse(new TextDecoder().decode(bytes));if(!body||Array.isArray(body)||typeof body!=='object')throw Error('Invalid request.');
   const action=new URL(request.url).pathname.split('/').at(-1),auth=(request.headers.get('Authorization')||'').replace(/^Bearer /,''),address=request.headers.get('CF-Connecting-IP')||'local';
   const job=this.tail.then(()=>this.registry.request(action,body,auth,address));this.tail=job.catch(()=>{});const result=await job;if(action==='create'||action==='join'){result.relayAvailable=true;result.relay=!!this.registry.rooms.get(result.code)?.relay}return reply(200,result);
  }catch(error){return reply(400,{error:error instanceof SyntaxError?'Invalid request.':error.message})}
 }
}

// Only authenticated room peers reach this object. Game traffic is transient.
export class GameRelay {
 constructor(ctx){this.ctx=ctx}
 async fetch(request){
  const seat=request.headers.get('X-Relay-Seat');if(!['0','1'].includes(seat))return reply(403,{error:'Invalid seat.'});
  for(const old of this.ctx.getWebSockets('seat'+seat)){old.serializeAttachment({...old.deserializeAttachment(),replaced:true});old.close(4001,'Replaced connection')}
  const [client,server]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(server,['seat'+seat]);server.serializeAttachment({seat});
  const peers=this.ctx.getWebSockets().filter(p=>!p.deserializeAttachment()?.replaced&&p.readyState===1);if(peers.length===2)for(const peer of peers)peer.send(JSON.stringify({relay:'ready'}));
  return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'shadowrun'}});
 }
 webSocketMessage(ws,message){
  if(ws.deserializeAttachment()?.replaced)return;
  if(typeof message!=='string'||message.length>1048576){ws.close(1009,'Packet too large');return}
  const {seat}=ws.deserializeAttachment();const peers=this.ctx.getWebSockets('seat'+(1-Number(seat))).filter(p=>!p.deserializeAttachment()?.replaced&&p.readyState===1);
  if(!peers.length){ws.close(4002,'Peer disconnected');return}
  for(const peer of peers)try{peer.send(message)}catch{ws.close(4002,'Peer disconnected')}
 }
 webSocketClose(ws,code,reason){if(ws.deserializeAttachment()?.replaced)return;try{ws.close(1000,'Connection closed')}catch{}for(const peer of this.ctx.getWebSockets())if(peer!==ws&&!peer.deserializeAttachment()?.replaced)try{peer.close(4002,'Peer disconnected')}catch{}}
 webSocketError(ws){ws.close(1011,'Relay connection error')}
}
