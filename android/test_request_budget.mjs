import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
// Cloudflare request budget: idle tag rooms back off, Draft/Collector polls follow the turn,
// and requests without credentials avoid CORS preflights.
const listeners=new Map(),doc={hidden:false,addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:(t,f)=>{if(listeners.get(t)===f)listeners.delete(t)}};
globalThis.document=doc;
const stored=new Map();globalThis.localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v)),removeItem:k=>stored.delete(k)};
class FakePC{constructor(){this.localDescription=null;this.remoteDescription=null}createDataChannel(){return {readyState:'connecting',close(){}}}async createOffer(){return {type:'offer',sdp:'o'}}async createAnswer(){return {type:'answer',sdp:'a'}}async setLocalDescription(d){this.localDescription=d}async setRemoteDescription(d){this.remoteDescription=d}async addIceCandidate(){}close(){}}
globalThis.RTCPeerConnection=FakePC;
const {TagPeer}=await import('./web/tag-peer.js');

function peer(seat,reply){
 const p=new TagPeer('http://localhost:8787'),calls=[];
 p.request=async(action,body)=>{calls.push(action);if(action!=='poll')return {ok:true};const r=reply();if(r instanceof Error)throw r;return structuredClone(r)};
 p.calls=calls;p.step=async()=>{await p.poll(p.epoch);clearTimeout(p.timer);p.timer=null};
 // open() starts the first poll without awaiting it; let it finish, then drive polls by hand.
 return {p,open:async()=>{await p.open({code:'ABCDE',token:'t',seat,generation:0,relayAvailable:true});await new Promise(r=>setImmediate(r));clearTimeout(p.timer);p.timer=null}};
}
const idle=(p,ms)=>{p.progressAt=Date.now()-ms};

// A host left alone keeps fast signalling for a minute, then slows down, most while hidden.
let reply={joined:false,messages:[],generation:0};
const {p:host,open:openHost}=peer(0,()=>reply);
await openHost();
assert.equal(listeners.get('visibilitychange'),host.wake,'open() watches page visibility');
assert.equal(host.pollDelay(),1000);
idle(host,61000);assert.equal(host.pollDelay(),3000);doc.hidden=true;assert.equal(host.pollDelay(),5000);
idle(host,601000);assert.equal(host.pollDelay(),30000);doc.hidden=false;assert.equal(host.pollDelay(),15000);
await host.step();assert.equal(host.pollDelay(),15000,'an unchanged empty room is not progress');
// Returning to the page polls a slow wait at once.
let woke=0;const realPoll=host.poll;host.poll=async()=>{woke++};host.timer=setTimeout(()=>assert.fail('slow timer survived wake'),30000);
doc.hidden=false;listeners.get('visibilitychange')();await new Promise(r=>setTimeout(r,5));assert.equal(woke,1);host.poll=realPoll;
// A partner joining is progress: the host offers immediately and returns to 1 s polling.
reply={joined:true,messages:[],generation:0};await host.step();
assert.equal(host.pollDelay(),1000);assert(host.calls.includes('signal'),'host sends its offer');assert(host.fallbackTimer,'host times the relay fallback from its offer');clearTimeout(host.fallbackTimer);
host.suspend();assert(!listeners.has('visibilitychange'),'suspend() stops watching visibility');

// The guest arms the relay fallback only after the host's offer arrives.
reply={joined:true,messages:[],generation:0};
const {p:guest,open:openGuest}=peer(1,()=>reply);
await openGuest();
assert(!guest.fallbackTimer,'a host that has not offered yet is not a failed P2P route');
reply={joined:true,messages:[{sequence:1,message:{type:'offer',sdp:'o'}}],generation:0};
idle(guest,120000);await guest.step();assert.equal(guest.cursor,1);assert.equal(guest.pollDelay(),1000,'signalling progress restores 1 s polls');
await guest.step();assert(guest.fallbackTimer,'fallback armed once the offer is processed');clearTimeout(guest.fallbackTimer);guest.suspend();
const {p:relayGuest,open:openRelayGuest}=peer(1,()=>({joined:true,messages:[],generation:0}));relayGuest.relayOnly=true;
await openRelayGuest();assert(relayGuest.fallbackTimer,'relay-only guests still fall back immediately');clearTimeout(relayGuest.fallbackTimer);relayGuest.suspend();

// Failed polls ("Room not found or expired.") back off exponentially instead of retrying every second.
reply=Error('Room not found or expired.');
const {p:lost,open:openLost}=peer(1,()=>reply);await openLost();
const delays=[lost.pollDelay()];for(let i=0;i<5;i++){await lost.step();delays.push(lost.pollDelay())}
assert.deepEqual(delays,[2000,4000,8000,16000,30000,30000]);
reply={joined:true,messages:[],generation:0};await lost.step();assert.equal(lost.failures,0);lost.suspend();

// Online play moved to /v2; a 426 (this version may no longer play online) ends the loop instead of retrying.
const realFetch=globalThis.fetch;let asked;globalThis.fetch=async url=>{asked=url;return {ok:false,status:426,json:async()=>({error:'Update the game.'})}};
const direct=new TagPeer('http://localhost:8787');direct.code='ABCDE';
await assert.rejects(direct.request('poll',{after:0}),e=>e.status===426&&e.message==='Update the game.');assert.equal(asked,'http://localhost:8787/v2/poll');globalThis.fetch=realFetch;
assert.match(fs.readFileSync('android/web/tag-peer.js','utf8'),/'\/v2\/relay'/);
const update=Object.assign(Error('Online play needs the latest version of the game.'),{status:426}),states=[];
const {p:outdated,open:openOutdated}=peer(0,()=>update);outdated.onState=(...s)=>states.push(s);await openOutdated();
assert(outdated.closed&&!outdated.timer,'426 suspends polling');assert.deepEqual(states.at(-1),['error',update.message]);assert(!listeners.has('visibilitychange'));

// An open channel keeps the existing heartbeat cadence.
const {p:linked}=peer(0,()=>reply);linked.channel={readyState:'open'};
assert.equal(linked.pollDelay(),60000);linked.inDuel=true;assert.equal(linked.pollDelay(),15000);linked.failures=2;assert.equal(linked.pollDelay(),15000);

// Budget: a forgotten lobby used to poll every second.
const count=(hidden,ms)=>{doc.hidden=hidden;const p=new TagPeer('http://localhost:8787');let n=0;for(let t=0;t<ms;t+=p.pollDelay()){idle(p,t);n++}return n};
const visibleHalfHour=count(false,1800000),hiddenDay=count(true,86400000);doc.hidden=false;
assert(visibleHalfHour<=320,`30 visible minutes: ${visibleHalfHour} polls (was 1,800)`);
assert(hiddenDay<=3100,`24 hidden hours: ${hiddenDay} polls (was 86,400)`);

// Draft/Collector: fast only while the other seat is expected to act; always far inside the 15 s presence window.
const collectorSource=fs.readFileSync('android/web/collector-ui.js','utf8').replace(/^import .*\r?\n/gm,'').replace('export class CollectorUI','class CollectorUI');
// collector-ui.js imports replayVersion, so the import-stripped harness must provide it.
const replayVersion=fs.readFileSync('android/web/replay-version.js','utf8').match(/"(.+?)"/)[1];
let sent;const env={replayVersion,structuredClone,AbortSignal,JSON,setTimeout,clearTimeout,fetch:async(url,init)=>{sent={url,init};return {ok:true,json:async()=>({ok:true})}}};
vm.createContext(env);vm.runInContext(collectorSource+'\nglobalThis.C=CollectorUI',env);
const ui=Object.create(env.C.prototype);ui.seat=1;
for(const [room,delay] of [[{phase:'duel',actor:0},1500],[{phase:'duel',actor:null},1500],[{phase:'duel',actor:1},3000],[{phase:'waiting'},3000],[{phase:'drafting'},3000],[{phase:'siding'},3000],[null,3000]]){ui.room=room;assert.equal(ui.pollDelay(),delay,JSON.stringify(room))}
ui.endpoint='https://rooms.example';ui.duelist={id:'d',token:'k'};await ui.api('poll');
assert.equal(sent.url,'https://rooms.example/v2/collector/poll');assert.equal(sent.init.headers['Content-Type'],'text/plain');assert.deepEqual(JSON.parse(sent.init.body),{id:'d',token:'k',version:replayVersion},'Collector requests carry the client version so the Worker can 426 old builds');

// A 426 stops Draft/Collector polling and is shown once.
let polls=0,shown=0;const stopped=Object.create(env.C.prototype);
Object.assign(stopped,{alive:true,seat:0,room:{phase:'duel',actor:1},queue:Promise.resolve(),session:{},dialog:(title,body)=>{shown++;assert.match(body,/latest version/)},render(){},pollDelay:()=>0,
 api:async()=>{polls++;throw Object.assign(Error('Online play needs the latest version of the game.'),{status:426})}});
stopped.schedule();await new Promise(r=>setTimeout(r,60));assert.equal(polls,1);assert.equal(shown,1);assert(stopped.updateRequired);
// Draft and statistics uploads carry no credentials either, so they must stay CORS simple requests.
const draft=fs.readFileSync('android/web/draft-ui.js','utf8');
assert.match(draft,/fetch\(`\$\{this\.endpoint\}\/v2\/draft\/\$\{op\}`,\{method:'POST',headers:\{'Content-Type':'text\/plain'\}/);
let statsPost,statsNow=1e12;const statsStore=new Map();const statsEnv=vm.createContext({crypto,location:{hostname:'game.example'},localStorage:{getItem:k=>statsStore.get(k)??null,setItem:(k,v)=>statsStore.set(k,v)},Date:{now:()=>statsNow},document:{hidden:false,addEventListener(){}},setInterval(){},AbortSignal,AbortController,setTimeout,clearTimeout,fetch:async(url,init)=>{statsPost=init;return {ok:true}}});
vm.runInContext(fs.readFileSync('android/web/global-stats.js','utf8').replaceAll('export ',''),statsEnv);
vm.runInContext('recordStat("runs","r1")',statsEnv);statsNow+=600001;await vm.runInContext('syncStats()',statsEnv);
assert.equal(statsPost?.headers['Content-Type'],'text/plain');assert.equal(JSON.parse(statsPost.body).counts.runs,1);

// The rooms Worker lets browsers cache its preflight (tag requests carry an Authorization header).
const worker=(await import('../multiplayer/cloudflare/worker.mjs')).default;
const preflight=await worker.fetch(new Request('https://rooms.example/v2/poll',{method:'OPTIONS'}),{});
assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Max-Age'),'86400');assert.match(preflight.headers.get('Access-Control-Allow-Headers'),/Authorization/);

console.log(`PASS request budget: forgotten tag lobby ${visibleHalfHour}/30 min visible, ${hiddenDay}/day hidden; Draft polls follow the turn; simple CORS requests; /v2 paths and 426 stop; cached preflight`);
