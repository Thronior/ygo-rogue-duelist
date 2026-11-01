// In-process Cloudflare stand-in for online tests: real hub and registry classes behind a controllable network.
// A client's link can have latency, jitter, a silent cut (half-open sockets) or a hard close. Counts every "Worker
// request" and every inbound hub message so tests can hold the request budget.
const RealResponse=globalThis.Response;
globalThis.Response=new Proxy(RealResponse,{construct(target,args){return args[1]?.status===101?{status:101,webSocket:args[1].webSocket,ok:false}:new target(...args)}});
globalThis.WebSocketRequestResponsePair??=class{constructor(request,response){this.request=request;this.response=response}};
globalThis.WebSocketPair=function(){const server=new ServerSocket(),held=[];let target=null;const client={server,held,get fake(){return target},set fake(value){target=value;for(const text of held.splice(0))value.fromServer(text)}};server.client=client;return {0:client,1:server}};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class ServerSocket{
 readyState=1;attachment=null;tags=[];
 serializeAttachment(value){this.attachment=value}
 deserializeAttachment(){return this.attachment}
 send(text){if(this.client.fake)this.client.fake.fromServer(text);else this.client.held.push(text)}
 close(code,reason){if(this.readyState!==1)return;this.readyState=3;this.client.fake?.closedByServer(code,reason)}
}
export class FakeStorage{
 data=new Map();writes=0;alarm=null;
 async get(key){return structuredClone(this.data.get(key))}
 async put(key,value){if(typeof key==='object'){for(const [k,v] of Object.entries(key)){this.data.set(k,structuredClone(v));this.writes++}}else{this.data.set(key,structuredClone(value));this.writes++}}
 async delete(keys){for(const key of [].concat(keys))this.data.delete(key)}
 async deleteAll(){this.data.clear()}
 async deleteAlarm(){this.alarm=null}
 async getAlarm(){return this.alarm}
 async setAlarm(at){this.alarm=at;this.writes++}
 async list({prefix='',limit=Infinity,start=''}={}){return new Map([...this.data].filter(([k])=>k.startsWith(prefix)&&k>=start).sort(([a],[b])=>a<b?-1:1).slice(0,limit))}
 async transaction(job){await job({put:(k,v)=>this.put(k,v),delete:k=>this.delete(k)})}
}
export class FakeContext{
 sockets=[];storage=new FakeStorage();
 blockConcurrencyWhile(job){return job()}
 setWebSocketAutoResponse(){}
 acceptWebSocket(ws,tags){ws.tags=tags;ws.acceptedAt=Date.now();this.sockets.push(ws)}
 getWebSockets(tag){return this.sockets.filter(ws=>ws.readyState===1&&(!tag||ws.tags.includes(tag)))}
 getWebSocketAutoResponseTimestamp(ws){return ws.pongAt?new Date(ws.pongAt):null}
 waitUntil(){}
}
export class FakeNet{
 clients=new Map();requests=0;hubMessages=0;
 // handler(url,protocols) returns the object that accepts the upgrade plus the Request-like headers it should see.
 constructor(upgrade){this.upgrade=upgrade;const net=this;globalThis.WebSocket=class extends ClientSocket{constructor(url,protocols){super(net,url,protocols)}}}
 client(name){let c=this.clients.get(name);if(!c)this.clients.set(name,c={latency:0,jitter:0,up:true,sockets:new Set()});return c}
 delay(c){return c.latency/2+Math.random()*c.jitter}
 // Packets vanish with no close event: the half-open case phones hit when they change network.
 cut(name){this.client(name).up=false}
 restore(name){this.client(name).up=true}
 // The transport reports its failure, as when airplane mode is toggled.
 kill(name){const c=this.client(name);c.up=false;for(const socket of [...c.sockets])socket.fail()}
}
let naming=null;export const asClient=(name,job)=>{const previous=naming;naming=name;try{return job()}finally{naming=previous}};
class ClientSocket{
 readyState=0;onopen=null;onclose=null;onmessage=null;onerror=null;tail=0;
 constructor(net,url,protocols){
  this.net=net;this.name=naming??[].concat(protocols).find(p=>/^(name|id)\./.test(p))?.split('.')[1]??'client';this.c=net.client(this.name);this.c.sockets.add(this);net.requests++;
  const wait=this.c.latency;setTimeout(async()=>{
   if(!this.c.up){this.fail();return}
   const result=await net.upgrade(url,[].concat(protocols),this.name);if(result?.status!==101){this.fail();return}
   this.server=result.webSocket.server;this.hub=result.hub;result.webSocket.fake=this;this.readyState=1;this.onopen?.({});for(const text of this.early||[])this.onmessage?.({data:text});this.early=null;
  },wait);
 }
 // One-way packets keep their order on a socket, like TCP, however much jitter a packet gets.
 later(job){const at=Math.max(this.tail,Date.now()+this.net.delay(this.c));this.tail=at;setTimeout(()=>{if(this.c.up)job()},at-Date.now())}
 fromServer(text){this.later(()=>{if(this.readyState!==1){(this.early??=[]).push(text);return}this.onmessage?.({data:text})})}
 closedByServer(code,reason){this.later(()=>this.finish(code,reason))}
 send(text){
  if(this.readyState!==1)throw Error('Socket is not open.');
  if(text==='ping'){this.later(()=>{this.server.pongAt=Date.now();this.later(()=>this.onmessage?.({data:'pong'}))});return}
  this.net.hubMessages++;this.later(()=>{if(this.server.readyState===1)this.hub.webSocketMessage(this.server,text)});
 }
 close(){if(this.readyState>=2)return;this.readyState=3;this.c.sockets.delete(this);if(this.server?.readyState===1){this.server.readyState=3;if(this.c.up)this.hub.webSocketClose(this.server,1000,'')}}
 fail(){if(this.readyState===3)return;this.readyState=3;this.c.sockets.delete(this);if(this.server?.readyState===1){this.server.readyState=3;this.hub.webSocketClose(this.server,1006,'')}this.onclose?.({code:1006})}
 finish(code,reason){if(this.readyState===3)return;this.readyState=3;this.c.sockets.delete(this);this.onclose?.({code,reason})}
}
export {sleep};
