// One long-lived WebSocket to a room hub. It reconnects by itself and finds dead links with "ping"/"pong", which the
// Worker answers without waking anything. Each connect is one Worker request, so retries back off to 30 s.
const PING_EVERY=20000,PONG_WAIT=6000,CONNECT_WAIT=12000,MAX_RETRY=30000;
export class HubSocket {
 constructor(url,protocols,{onOpen=()=>{},onClose=()=>{},onMessage=()=>{},onFailing=()=>{}}={}){
  Object.assign(this,{url,protocols,onOpen,onClose,onMessage,onFailing});this.failures=0;this.stopped=true;this.socket=null;this.rtt=null;
  this.wake=()=>{if(!this.stopped&&!globalThis.document?.hidden){if(this.retryTimer){clearTimeout(this.retryTimer);this.retryTimer=null;this.connect()}else if(this.isOpen)this.ping()}};
 }
 get isOpen(){return this.socket?.readyState===1&&this.opened}
 start(){if(!this.stopped)return;this.stopped=false;globalThis.addEventListener?.('online',this.wake);globalThis.document?.addEventListener('visibilitychange',this.wake);this.connect()}
 stop(){this.stopped=true;globalThis.removeEventListener?.('online',this.wake);globalThis.document?.removeEventListener('visibilitychange',this.wake);clearTimeout(this.retryTimer);this.retryTimer=null;this.drop()}
 // Forget the current socket at once: a dead link can take minutes to report its own close.
 drop(){clearTimeout(this.connectTimer);clearTimeout(this.pingTimer);clearTimeout(this.pongTimer);const socket=this.socket;this.socket=null;this.opened=false;if(socket){socket.onopen=socket.onclose=socket.onmessage=socket.onerror=null;try{socket.close()}catch{}}}
 connect(){
  if(this.stopped||this.socket)return;
  let socket;try{socket=this.socket=new WebSocket(this.url,this.protocols)}catch{this.lost();return}
  this.connectTimer=setTimeout(()=>this.lost(),CONNECT_WAIT);
  socket.onopen=()=>{clearTimeout(this.connectTimer);this.opened=true;this.schedulePing(1000)};
  socket.onmessage=e=>{
   if(e.data==='pong'){clearTimeout(this.pongTimer);this.pongTimer=null;this.rtt=Date.now()-this.pingAt;this.schedulePing();return}
   // A message proves the room accepted us; a refused connect closes before one arrives.
   if(!this.ready){this.ready=true;this.failures=0;this.onOpen()}
   this.onMessage(e.data);
  };
  socket.onclose=e=>{if(e.code===4001){this.stopped=true;this.drop();this.ready=false;this.onClose(e.code);return}this.lost()};
  socket.onerror=()=>{};
 }
 lost(){const wasReady=this.ready;this.drop();this.ready=false;if(wasReady)this.onClose(0);if(this.stopped)return;this.failures++;this.onFailing(this.failures);const wait=Math.min(MAX_RETRY,1000*2**Math.min(this.failures-1,5));this.retryTimer=setTimeout(()=>{this.retryTimer=null;this.connect()},wait*(.75+Math.random()/2))}
 schedulePing(wait=PING_EVERY){clearTimeout(this.pingTimer);this.pingTimer=setTimeout(()=>this.ping(),wait)}
 ping(){if(!this.isOpen||this.pongTimer)return;this.pingAt=Date.now();try{this.socket.send('ping')}catch{this.lost();return}this.pongTimer=setTimeout(()=>{this.pongTimer=null;this.lost()},PONG_WAIT)}
 send(text){if(!this.isOpen)return false;try{this.socket.send(text);return true}catch{this.lost();return false}}
}
