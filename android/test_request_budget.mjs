import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
// Cloudflare request budget: idle tag rooms back off, Draft/Collector polls follow the turn,
// and requests without credentials avoid CORS preflights.
const listeners=new Map(),doc={hidden:false,addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:(t,f)=>{if(listeners.get(t)===f)listeners.delete(t)}};
globalThis.document=doc;
const stored=new Map();globalThis.localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v)),removeItem:k=>stored.delete(k)};
globalThis.RTCPeerConnection=class{};
const {TagPeer}=await import('./web/tag-peer.js');
// Tag rooms never poll: every wait is one idle socket, which costs nothing until a frame arrives.
const source=fs.readFileSync('android/web/tag-peer.js','utf8');
assert.doesNotMatch(source,/pollDelay|setTimeout\(\(\)=>this\.poll/,'no signalling poll loop');assert.match(source,/'\/v3\/hub'/);
// Rooms are only touched rarely to keep their one-day expiry away during long games.
assert.match(source,/TOUCH_EVERY=7200000/);
// A 426 from the room service is reported once and ends retries.
const realFetch=globalThis.fetch;let asked;globalThis.fetch=async url=>{asked=url;return {ok:false,status:426,json:async()=>({error:'Update the game.'})}};
const direct=new TagPeer('http://localhost:8787');direct.code='ABCDE';
await assert.rejects(direct.request('poll',{after:0}),e=>e.status===426&&e.message==='Update the game.');assert.equal(asked,'http://localhost:8787/v2/poll');
const states=[];const outdated=new TagPeer('http://localhost:8787',{onState:(...s)=>states.push(s)});outdated.closed=false;outdated.code='ABCDE';await outdated.hubFailing(4);assert(outdated.closed);assert.deepEqual(states.at(-1),['error','Update the game.']);globalThis.fetch=realFetch;

// Draft/Collector: with the hub open a poll is only a slow safety net; without it, far slower than the old 1.5 s.
const collectorSource=fs.readFileSync('android/web/collector-ui.js','utf8').replace(/^import .*\r?\n/gm,'').replace('export class CollectorUI','class CollectorUI');
// collector-ui.js imports replayVersion, so the import-stripped harness must provide it.
const replayVersion=fs.readFileSync('android/web/replay-version.js','utf8').match(/"(.+?)"/)[1];
// collector-ui.js also imports explainOnlineError (online-status.js, 2026-11-13); the harness explains errors as they are.
let sent;const env={replayVersion,explainOnlineError:async e=>e?.message||String(e),structuredClone,AbortSignal,JSON,setTimeout,clearTimeout,fetch:async(url,init)=>{sent={url,init};return {ok:true,json:async()=>({ok:true})}}};
vm.createContext(env);vm.runInContext(collectorSource+'\nglobalThis.C=CollectorUI',env);
const ui=Object.create(env.C.prototype);ui.seat=1;
ui.hub={isOpen:true};assert.equal(ui.pollDelay(),120000);ui.hub=null;assert.equal(ui.pollDelay(),30000);
ui.endpoint='https://rooms.example';ui.duelist={id:'d',token:'k'};await ui.api('poll');
assert.equal(sent.url,'https://rooms.example/v2/collector/poll');assert.equal(sent.init.headers['Content-Type'],'text/plain');assert.deepEqual(JSON.parse(sent.init.body),{id:'d',token:'k',version:replayVersion,net:3},'Collector requests carry the client version so the Worker can 426 old builds');

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
vm.runInContext('recordStat("runs","r1")',statsEnv);statsNow+=1800001;await vm.runInContext('syncStats()',statsEnv);  // uploads every 30 min (2026-11-14)
assert.equal(statsPost?.headers['Content-Type'],'text/plain');assert.equal(JSON.parse(statsPost.body).counts.runs,1);

// The rooms Worker lets browsers cache its preflight (tag requests carry an Authorization header).
const worker=(await import('../multiplayer/cloudflare/worker.mjs')).default;
const preflight=await worker.fetch(new Request('https://rooms.example/v2/poll',{method:'OPTIONS'}),{});
assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Max-Age'),'86400');assert.match(preflight.headers.get('Access-Control-Allow-Headers'),/Authorization/);

console.log('PASS request budget: tag rooms never poll; Draft/Collector safety polls only; simple CORS requests; 426 stops retries; cached preflight');
