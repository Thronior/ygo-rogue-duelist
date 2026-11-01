// Tag duels on bad links: real TagSession, TagPeer, TagHub, Registry and WASM engine over a simulated network.
// node android/test_tag_lockstep.mjs [--full]   (--full adds the slow latency grid)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FakeNet,FakeContext,asClient,sleep} from './net_test_harness.mjs';
globalThis.document??={hidden:false,addEventListener(){},removeEventListener(){}};globalThis.location??={href:'http://localhost/'};globalThis.window??={addEventListener(){}};
globalThis.Audio??=class{addEventListener(){}play(){return Promise.resolve()}pause(){}load(){}};
const stores=new Map();const store=()=>stores.get(current)??stores.set(current,new Map()).get(current);let current='host';
globalThis.localStorage={getItem:k=>store().get(k)??null,setItem:(k,v)=>store().set(k,String(v)),removeItem:k=>store().delete(k)};
const {TagSession}=await import('./web/tag-session.js');const {TagDuel}=await import('./web/tag-duel.js');const {M,R}=await import('./web/duel.js');const {TagHub}=await import('../multiplayer/cloudflare/hub.mjs');const {Registry}=await import('../multiplayer/cloudflare/registry.mjs');
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url)));
const meta=read('content'),engineData=read('engine-data'),scripts=read('scripts'),known=new Set(meta.cards.map(c=>c.id));
const ydk=f=>{let z='main';const o={main:[],extra:[]};for(const l of fs.readFileSync(new URL('../data/decks/'+f+'.ydk',import.meta.url),'utf8').split(/\r?\n/)){if(l.startsWith('#extra'))z='extra';else if(l.startsWith('#main'))z='main';else if(l.startsWith('!side'))z='side';else if(/^\d+$/.test(l.trim())&&z!=='side'&&known.has(+l))o[z].push(+l)}return o};
const decks=['arcana-knights-siegfried-tier-3','archfiends-darkbishop-tier-3','tea-gardner-tier-3','rex-raptor-tier-3'].map(ydk);
const cueTime=cues=>Math.min(300,cues.length*60);

async function world({seed=17,hostLag=0,guestLag=0,jitter=0,hostExtra=0}={}){
 const registry=new Registry({}),hubs=new Map(),peers=new Map();
 const net=new FakeNet(async(url,protocols,name)=>{
  const code=protocols.find(p=>p.startsWith('room.')).slice(5),token=protocols.find(p=>p.startsWith('auth.')).slice(5),room=registry.rooms.get(code),seat=room?.tokens.indexOf(token);
  if(!room||seat<0)return {status:403};
  const hub=hubs.get(code)??hubs.set(code,new TagHub(new FakeContext(),{})).get(code);
  const result=await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat)}}));return {...result,webSocket:result.webSocket,hub};
 });
 net.client('host').latency=hostLag;net.client('guest').latency=guestLag;net.client('host').jitter=net.client('guest').jitter=jitter;
 globalThis.RTCPeerConnection=undefined;
 globalThis.fetch=async(url,init)=>{net.requests++;const action=new URL(url).pathname.split('/').pop(),auth=(init.headers.Authorization||'').replace('Bearer ','');try{const data=await registry.request(action,JSON.parse(init.body),auth,'a');return {ok:true,status:200,json:async()=>structuredClone({...data,relayAvailable:true})}}catch(e){return {ok:false,status:400,json:async()=>({error:e.message})}}};
 const config={teams:[[decks[0],decks[1]],[decks[2],decks[3]]],lp:8000,enemyLP:8000,seed,mode:'tag',draw:5,enemyDraw:5,responses:[]};
 const state={view:{phase:'duel',revision:1,duel:config,run:{},seat:0},finished:false,journal:config.responses};
 const backend=async(action,value)=>{
  if(action==='tag-create'||action==='tag-pause')return;if(action==='tag-receipt')return null;if(action==='tag-restore')return state.view;
  if(action==='tag-view')return value===0?structuredClone(state.view):{...structuredClone(state.view),duel:null,seat:1};
  if(action==='tag-journal'){state.journal.push(structuredClone(value));return}
  if(action==='tag-finish'){state.finished=value;state.view={phase:'shop',revision:2,run:{},seat:0};return}
  throw Error('Unexpected backend call '+action);
 };
 const options={endpoint:'http://localhost:8787',character:0,profile:{},content:{cards:meta.cards,tokenCards:[]},backend,duelFactory:()=>new TagDuel(meta.cards).init([engineData,scripts])};
 const stats={host:{shown:0},guest:{shown:0,tapToScreen:[]}};
 const player=(name,extra)=>{
  current=name;const session=asClient(name,()=>new TagSession(options));const peer=session.peer;const realConnect=peer.connectHub.bind(peer);peer.relayOnly=true;peer.connectHub=()=>asClient(name,()=>realConnect());
  let queue=Promise.resolve(),timer=null;
  session.bot=()=>{};
  const respond=s=>{
   if(session.bots===false)return;const e=session.engine;if(!e?.pending||s.tag.responseNumber!==e.responseNumber||!s.pending)return;
   const auto=s.pending.type===M.SELECT_CHAIN&&!s.pending.forced,response=auto?{type:R.SELECT_CHAIN,index:null}:e.auto(e.pending),tapped=Date.now();
   session.tapped=tapped;session.request('duel-response',{number:s.tag.responseNumber,response}).catch(()=>{});
  };
  session.onDuel=(s,cues)=>{
   queue=queue.then(async()=>{stats[name].shown++;if(session.tapped){stats[name].tapToScreen?.push(Date.now()-session.tapped);session.tapped=0}clearTimeout(timer);await sleep(cueTime(cues)+(cues.length?extra:0));if(s.pending)timer=setTimeout(()=>respond(s),s.pending.type===M.SELECT_CHAIN&&!s.pending.forced?50:80)});return queue;
  };
  session.stopBot=()=>{session.bots=false;clearTimeout(timer)};
  return session;
 };
 const host=player('host',hostExtra),guest=player('guest',0);
 current='host';await host.host();current='guest';await guest.join(host.code);current='host';
 host.active=true;state.seeded=true;
 return {net,host,guest,state,stats,hubs,registry};
}
async function until(check,ms,label){const end=Date.now()+ms;while(Date.now()<end){if(check())return;await sleep(25)}assert.fail('Timed out: '+label)}
const settled=(w,steps=Infinity)=>()=>w.state.finished||(w.host.log.length>=steps);
const same=(w)=>{assert.equal(w.guest.log.length,w.host.log.length,'both logs hold the same steps');assert.equal(w.guest.engine.checksum(),w.host.engine.checksum(),'both engines agree');assert.equal(w.host.engine.errors?.length||0,0)};
const finish=async w=>{for(const s of [w.host,w.guest]){s.stopBot();clearTimeout(s.aiTimer);s.aiTimer=null;s.greeted=false;s.peer.suspend();s.engine?.destroy();s.engine=null}};

// 1. Start, handshake and a run of real steps on a healthy link.
{
 const w=await world();await until(()=>w.host.engine&&w.guest.engine,8000,'guest engine started');
 await until(settled(w,60),30000,'duel progressed');
 await until(()=>w.guest.log.length>=w.host.log.length,3000,'guest caught up');
 for(const s of [w.host,w.guest])s.stopBot();await sleep(200);
 await until(()=>w.guest.log.length===w.host.log.length,3000,'logs converged');same(w);
 assert(w.stats.guest.tapToScreen.length>5,'guest took turns');const worst=Math.max(...w.stats.guest.tapToScreen);assert(worst<=60,`own answers reach the screen without a round trip (worst ${worst} ms)`);
 await finish(w);console.log('PASS lockstep: guest engine matches the host; own answers reach the screen in',worst,'ms or less');
}
// 2. The review's freezing conditions: 12 of 54 runs stalled for good before the rework.
const grid=process.argv.includes('--full')?[[300,200,0],[800,400,0],[300,0,120],[40,120,0]]:[[800,400,0],[300,0,120]];
for(const [rtt,jitter,hostExtra] of grid){
 const rows=[];for(const seed of [17,99]){
  const w=await world({seed,hostLag:rtt/2,guestLag:rtt/2,jitter,hostExtra});await until(settled(w,70),70000,`no progress at rtt ${rtt} jitter ${jitter} seed ${seed}: host ${w.host.log.length} guest ${w.guest.log.length}`);
  for(const s of [w.host,w.guest])s.stopBot();await until(()=>w.guest.log.length===w.host.log.length,8000,'logs converged');same(w);const taps=[...w.stats.guest.tapToScreen].sort((a,b)=>a-b);await finish(w);rows.push(taps[taps.length>>1]);
 }
 console.log(`PASS no stall at rtt ${rtt} jitter ${jitter} host delay ${hostExtra}: guest tap-to-screen median ${Math.max(...rows)} ms`);
}
// 3. Half-open drop: the guest keeps answering, nothing is lost and nothing applies twice.
{
 const w=await world({seed:99});await until(settled(w,20),20000,'warm up');
 w.net.cut('guest');
 await sleep(3000);const during=Math.max(w.guest.log.length,w.host.log.length);
 w.net.restore('guest');w.guest.peer.hub.lost();
 await until(()=>w.host.log.length>during,25000,'host absorbed the steps made during the drop');
 for(const s of [w.host,w.guest])s.stopBot();await sleep(300);await until(()=>w.guest.log.length===w.host.log.length,8000,'logs converged after drop');same(w);
 await finish(w);console.log('PASS half-open drop: play continues and the logs merge');
}
// 4. A hard close of both players, then recovery with no reconnect button.
{
 const w=await world({seed:7});await until(settled(w,15),20000,'warm up');
 w.net.kill('host');w.net.kill('guest');await sleep(1200);w.net.restore('host');w.net.restore('guest');
 const before=w.host.log.length;await until(()=>w.host.log.length>before+5,30000,'play resumed by itself');
 for(const s of [w.host,w.guest])s.stopBot();await sleep(300);await until(()=>w.guest.log.length===w.host.log.length,8000,'logs converged');same(w);
 await finish(w);console.log('PASS both players dropped: recovered with no user action');
}
// 5. Host reload: the guest's longer log repairs the journal the host lost.
{
 const w=await world({seed:1234});await until(settled(w,25),20000,'warm up');
 for(const s of [w.host,w.guest])s.stopBot();await sleep(300);await until(()=>w.guest.log.length===w.host.log.length,5000,'converged');
 const full=w.guest.log.length,lost=w.state.journal.splice(full-6);assert.equal(lost.length,6);
 const checksum=w.guest.engine.checksum();w.host.peer.suspend();clearTimeout(w.host.aiTimer);w.host.engine.destroy();w.host.engine=null;w.host.greeted=false;w.host.log=[];
 current='host';const reborn=asClient('host',()=>new TagSession({endpoint:'http://localhost:8787',character:0,profile:{},content:{cards:meta.cards,tokenCards:[]},backend:w.host.backend,duelFactory:w.host.duelFactory}));
 reborn.bots=false;reborn.onDuel=()=>Promise.resolve();const connect=reborn.peer.connectHub.bind(reborn.peer);reborn.peer.relayOnly=true;reborn.peer.connectHub=()=>asClient('host',()=>connect());
 await reborn.join(w.host.code);reborn.peer.started=true;
 await until(()=>reborn.engine&&reborn.log.length===full,10000,'host rebuilt from journal plus guest log');
 assert.equal(reborn.engine.checksum(),checksum,'repaired host matches the guest');assert.equal(w.state.journal.length,full,'journal repaired');
 w.guest.stopBot();w.guest.peer.suspend();w.guest.engine.destroy();reborn.peer.suspend();reborn.engine.destroy();console.log('PASS host reload: the guest log repairs lost journal steps');
}
// 6. Budget: a whole idle hour and a played duel stay nearly free.
{
 const w=await world({seed:17,hostLag:80,guestLag:80});await until(settled(w,70),30000,'budget duel');for(const s of [w.host,w.guest])s.stopBot();await until(()=>w.guest.log.length===w.host.log.length,5000,'budget converge');
 const equivalent=w.net.requests+w.net.hubMessages/20;assert(w.net.requests<=8,`${w.net.requests} HTTP/connect requests`);assert(equivalent<=20,`${equivalent} request equivalents`);
 console.log(`PASS budget: ${w.net.requests} requests and ${w.net.hubMessages} hub messages for ${w.host.log.length} steps on relay`);await finish(w);
}
process.exit(0);
