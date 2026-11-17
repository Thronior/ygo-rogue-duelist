// Room tool (tools/room-admin) on the clients: real TagSession/TagPeer/TagHub/WASM engines for Tag, and two Draft clients
// (CollectorUI) replaying one hub event list. Duel changes must land at the same step on both devices, survive a rebuild
// from the journal, and leave the duel playable. node android/test_room_admin.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FakeNet,FakeContext,asClient,sleep} from './net_test_harness.mjs';
const shown=[];
const element=()=>({className:'',textContent:'',style:{},hidden:false,classList:{add(){},remove(){}},setAttribute(){},remove(){},append(){},addEventListener(){},getBoundingClientRect:()=>({left:0,right:0,top:0,bottom:0,width:0,height:0})});
globalThis.document={hidden:false,addEventListener(){},removeEventListener(){},querySelector:s=>s==='.field-wrap'?element():null,querySelectorAll:()=>[],getElementById:()=>null,createElement:element,body:{append:el=>shown.push(el)}};
globalThis.location??={href:'http://localhost/'};globalThis.window??={addEventListener(){}};globalThis.innerWidth=800;globalThis.innerHeight=600;
globalThis.Audio??=class{addEventListener(){}play(){return Promise.resolve()}pause(){}load(){}};
const stores=new Map();const store=()=>stores.get(current)??stores.set(current,new Map()).get(current);let current='host';
globalThis.localStorage={getItem:k=>store().get(k)??null,setItem:(k,v)=>store().set(k,String(v)),removeItem:k=>store().delete(k)};
const {TagSession}=await import('./web/tag-session.js');const {TagDuel,flipPerspective}=await import('./web/tag-duel.js');const {M,R,L}=await import('./web/duel.js');
const {TagHub}=await import('../multiplayer/cloudflare/hub.mjs');const {Registry}=await import('../multiplayer/cloudflare/registry.mjs');
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url)));
const meta=read('content'),engineData=read('engine-data'),scripts=read('scripts'),known=new Set(meta.cards.map(c=>c.id));
const ydk=f=>{let z='main';const o={main:[],extra:[]};for(const l of fs.readFileSync(new URL('../data/decks/'+f+'.ydk',import.meta.url),'utf8').split(/\r?\n/)){if(l.startsWith('#extra'))z='extra';else if(l.startsWith('#main'))z='main';else if(l.startsWith('!side'))z='side';else if(/^\d+$/.test(l.trim())&&z!=='side'&&known.has(+l))o[z].push(+l)}return o};
const decks=['arcana-knights-siegfried-tier-3','archfiends-darkbishop-tier-3','tea-gardner-tier-3','rex-raptor-tier-3'].map(ydk);
const BLUE_EYES=89631139;
async function until(check,ms,label){const end=Date.now()+ms;while(Date.now()<end){if(check())return;await sleep(25)}assert.fail('Timed out: '+label)}

async function tagWorld(seed=17){
 const registry=new Registry({}),hubs=new Map();
 const net=new FakeNet(async(url,protocols)=>{
  const code=protocols.find(p=>p.startsWith('room.')).slice(5),token=protocols.find(p=>p.startsWith('auth.')).slice(5),room=registry.rooms.get(code),seat=room?.tokens.indexOf(token);
  if(!room||seat<0)return {status:403};
  const hub=hubs.get(code)??hubs.set(code,new TagHub(new FakeContext(),{})).get(code);
  const result=await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat)}}));return {...result,webSocket:result.webSocket,hub};
 });
 globalThis.RTCPeerConnection=undefined;
 globalThis.fetch=async(url,init)=>{const action=new URL(url).pathname.split('/').pop(),auth=(init.headers.Authorization||'').replace('Bearer ','');try{const data=await registry.request(action,JSON.parse(init.body),auth,'a');return {ok:true,status:200,json:async()=>structuredClone({...data,relayAvailable:true})}}catch(e){return {ok:false,status:400,json:async()=>({error:e.message})}}};
 const config={teams:[[decks[0],decks[1]],[decks[2],decks[3]]],lp:8000,enemyLP:8000,seed,mode:'tag',draw:5,enemyDraw:5,responses:[]};
 const state={view:{phase:'duel',revision:1,duel:config,run:{gold:40,lp:8000},characters:[0,2],opponents:[5,6],seat:0},journal:config.responses,admin:[]};
 const backend=async(action,value)=>{
  JSON.stringify(value);
  if(action==='tag-create'||action==='tag-pause')return;if(action==='tag-journal-trim'){state.journal.length=value.count;return}if(action==='tag-receipt')return null;if(action==='tag-restore')return state.view;
  if(action==='tag-view')return value===0?structuredClone(state.view):{...structuredClone(state.view),duel:null,seat:1};
  if(action==='tag-journal'){state.journal.push(structuredClone(value));return}
  if(action==='tag-admin'){state.admin.push(value);if(value.kind==='coins')state.view.run.gold+=value.amount;state.view.revision++;return {coins:state.view.run.gold}}
  if(action==='tag-finish'){state.finished=value;return}
  throw Error('Unexpected backend call '+action);
 };
 const options={endpoint:'http://localhost:8787',character:0,profile:{},content:{cards:meta.cards,tokenCards:[],characters:meta.characters},backend,duelFactory:()=>new TagDuel(meta.cards).init([engineData,scripts])};
 const player=name=>{
  current=name;const session=asClient(name,()=>new TagSession(options)),peer=session.peer,realConnect=peer.connectHub.bind(peer);peer.relayOnly=true;peer.connectHub=()=>asClient(name,()=>realConnect());
  let queue=Promise.resolve(),timer=null;
  const respond=s=>{if(session.bots===false)return;const e=session.engine;if(!e?.pending||s.tag.responseNumber!==e.responseNumber||!s.pending)return;const auto=s.pending.type===M.SELECT_CHAIN&&!s.pending.forced,response=auto?{type:R.SELECT_CHAIN,index:null}:e.auto(e.pending);session.request('duel-response',{number:s.tag.responseNumber,response}).catch(()=>{})};
  session.onDuel=(s,cues)=>{queue=queue.then(async()=>{clearTimeout(timer);await sleep(Math.min(100,cues.length*20));if(s.pending)timer=setTimeout(()=>respond(s),40)});return queue};
  session.stopBot=()=>{session.bots=false;clearTimeout(timer)};session.startBot=()=>{session.bots=true;session.present()};
  return session;
 };
 const host=player('host'),guest=player('guest');
 current='host';await host.host();current='guest';await guest.join(host.code);current='host';host.active=true;
 return {net,host,guest,state,hub:()=>hubs.get(host.code),config};
}
const converge=async w=>{for(const s of [w.host,w.guest])s.stopBot();await sleep(300);await until(()=>w.guest.log.length===w.host.log.length,8000,'logs converged');assert.equal(w.guest.engine.checksum(),w.host.engine.checksum(),'both engines agree')};
const admin=async(w,action)=>{const response=await w.hub().admin({id:'a'+Math.random().toString(36).slice(2,8),...action});assert.equal(response.status,200,JSON.stringify(await response.clone().json()));return response.json()};
const report=async w=>w.hub().ctx.storage.get('admin-report');

// 1. Tag: damage, heal, set LP and a new hand card land at the same step on both devices.
{
 const w=await tagWorld();await until(()=>w.host.engine&&w.guest.engine&&w.host.log.length>=12,20000,'duel progressed');await converge(w);
 const h=w.host.engine,g=w.guest.engine,lp=[...h.lp],hand=h.query(0,L.HAND).length,steps=w.host.log.length;
 await admin(w,{kind:'damage',side:1,amount:1234});await admin(w,{kind:'heal',side:0,amount:500});await admin(w,{kind:'hand',side:0,code:BLUE_EYES});
 await until(()=>w.guest.log.length===steps+3,5000,'guest applied the three changes');
 for(const e of [h,g]){assert.deepEqual(e.lp,[lp[0]+500,Math.max(0,lp[1]-1234)]);assert.equal(e.query(0,L.HAND).length,hand+1);assert.equal(e.query(0,L.HAND).at(-1).code,BLUE_EYES)}
 assert.equal(g.checksum(),h.checksum());assert.equal(w.host.engine.responseNumber,w.guest.engine.responseNumber);
 assert.deepEqual(w.state.journal.slice(-3).map(x=>x.admin?.kind),['damage','heal','hand'],'the host journals each change');
 assert.deepEqual(w.host.engine.replayRecord.admin.map(x=>x.op.kind),['damage','heal','hand']);
 let r=await report(w);assert.equal(r.result.ok,true);assert.equal(r.result.kind,'hand');assert.deepEqual(r.state.duel.lp,h.lp);
 await admin(w,{kind:'set-lp',side:1,amount:4321});await until(()=>w.guest.log.length===steps+4,5000,'set-lp');assert.equal(g.lp[1],4321);assert.equal(h.lp[1],4321);
 // Play goes on from the changed state without a split, and the new card can be used.
 for(const s of [w.host,w.guest])s.startBot();
 await until(()=>w.state.finished||w.host.log.length>=steps+60,40000,'duel continued after the changes');await converge(w);
 // The host rebuilds from its journal (as after a reload) and matches the guest exactly.
 const target=w.guest.engine.checksum(),journal=structuredClone(w.state.journal);w.host.engine.destroy();w.host.engine=null;
 await w.host.startEngine({...w.config,responses:journal});assert.equal(w.host.engine.checksum(),target,'journal replay reproduces the duel');assert.equal(w.host.log.length,journal.length);
 // Text and emotes show on both devices; run changes go to the host's campaign only.
 shown.length=0;await admin(w,{kind:'text',text:'Greetings from the void',seconds:2});await until(()=>shown.length>=2,3000,'text on both screens');
 assert.deepEqual(shown.filter(el=>el.className==='admin-banner').map(el=>el.textContent),['Greetings from the void','Greetings from the void']);
 shown.length=0;await admin(w,{kind:'emote',emoji:'😜'});await until(()=>shown.length>=2,3000,'emote');assert(shown.every(el=>el.textContent==='😜'));
 await admin(w,{kind:'coins',amount:50});await until(()=>w.state.admin.length===1,3000,'coins');assert.equal(w.state.admin[0].kind,'coins');
 r=await report(w);assert.equal(r.result.kind,'coins');assert.equal(r.result.ok,true);assert.equal(r.state.coins,90);
 // Info returns the run state; a duel change outside a duel is refused and reported, never applied.
 w.state.view={...w.state.view,phase:'shop'};await w.host.broadcast();await admin(w,{kind:'damage',side:0,amount:100});await sleep(200);
 r=await report(w);assert.equal(r.result.ok,false);assert.match(r.result.error,/No duel/);
 for(const s of [w.host,w.guest]){s.stopBot();clearTimeout(s.aiTimer);s.peer.suspend();s.engine?.destroy();s.engine=null}
 console.log('PASS Tag: room tool duel changes apply at one step on both devices, replay from the journal, and play continues');
}

// 2. Draft: two clients replay the same hub event list with room tool events in it.
{
 const files=new Map([['engine-data.json',engineData],['scripts.json',scripts]]);
 globalThis.fetch=async url=>{const name=String(url).split('/').pop();if(!files.has(name))throw Error('fetch '+url);return {ok:true,json:async()=>files.get(name)}};
 const {CollectorUI}=await import('./web/collector-ui.js');
 const room={code:'DRAFT',game:1,hub:true,phase:'duel',first:1,seed:4242,decks:[decks[0],decks[2]],players:[{character:0},{character:2}]};
 const client=seat=>{const ui=Object.create(CollectorUI.prototype);Object.assign(ui,{alive:true,seat,isDraft:true,content:{cards:meta.cards,tokenCards:[],characters:meta.characters},onDuel:async()=>{},duelLog:{code:'DRAFT',game:1,events:[],confirmed:0,outbox:new Map()},queue:Promise.resolve(),session:{}});ui.room={...room,events:ui.duelLog.events};return ui};
 const ui=[client(0),client(1)];
 for(const u of ui)await u.updateDuel(u.room);
 const push=async event=>{for(const u of ui){if(u.duelLog.events.length===u.applied)u.duelLog.events.push(structuredClone(event));u.duelLog.confirmed=u.duelLog.events.length;await u.updateDuel(u.room)}};
 const step=async()=>{
  const g=ui[0].game,engineSeat=g.respondingSeat;if(engineSeat===null)return false;
  const seat=engineSeat^room.first,u=ui[seat],e=u.game,raw=e.pending.type===M.SELECT_CHAIN&&!e.pending.forced?{type:R.SELECT_CHAIN,index:null}:e.auto(e.pending),response=engineSeat===1?flipPerspective(raw):raw;
  await u.request('duel-response',{number:u.applied,response});
  const other=ui[1-seat];other.duelLog.events.push(structuredClone(u.duelLog.events.at(-1)));other.duelLog.confirmed=u.duelLog.confirmed=other.duelLog.events.length;await other.updateDuel(other.room);
  return true;
 };
 for(let i=0;i<15&&!ui[0].game.finished;i++)await step();
 const hand=ui[0].game.query(0^room.first,L.HAND).length,lp=[...ui[0].game.lp];
 // Room seats 0 and 1 map to engine players seat^first on both clients.
 await push({seat:-1,admin:{kind:'damage',side:0,amount:900}});await push({seat:-1,admin:{kind:'hand',side:0,code:BLUE_EYES}});
 for(const u of ui){assert.equal(u.game.lp[0^room.first],Math.max(0,lp[0^room.first]-900));assert.equal(u.game.query(0^room.first,L.HAND).length,hand+1);assert.equal(u.applied,u.duelLog.events.length);assert.equal(u.game.responseNumber,u.applied,'answer numbers keep counting the log')}
 assert.equal(ui[0].game.checksum(),ui[1].game.checksum());
 let played=0;for(let i=0;i<80&&!ui[0].game.finished;i++)if(await step())played++;
 assert(played>10,'the duel continues after the changes');assert.equal(ui[0].game.checksum(),ui[1].game.checksum(),'no split after the changes');
 for(const u of ui){clearTimeout(u.moveTimer);clearTimeout(u.probe);u.game?.destroy()}
 console.log('PASS Draft: room tool events apply on both clients at the same step and play continues');
}
process.exit(0);
