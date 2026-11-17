// Room tool route (admin.mjs): auth, unknown rooms, and every action reaching the right place in Tag and Draft rooms.
import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeContext} from '../../android/net_test_harness.mjs';
import worker,{RoomRegistry} from './worker.mjs';
import {TagHub,MatchHub} from './hub.mjs';
import {DraftRegistry} from './collector.mjs';
import {DRAFT_RELICS} from './draft-pool.mjs';
import cards from './collector-cards.json' with {type:'json'};

const TOKEN='t'.repeat(48);
const call=(e,body,token=TOKEN)=>worker.fetch(new Request('https://rooms.test/v3/admin',{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:JSON.stringify(body)}),e,{waitUntil(){}});
const stub=object=>({idFromName:n=>n,get:()=>object});
const counting=()=>{const reached=[];return {reached,ns:name=>stub({fetch:async request=>{reached.push(name+' '+new URL(request.url).pathname);return new Response(JSON.stringify({error:'none'}),{status:404})}})}};
const listen=response=>{const inbox=[];response.webSocket.fake={fromServer:t=>inbox.push(JSON.parse(t)),closedByServer(){}};return {server:response.webSocket.server,inbox}};

test('the admin route needs the ADMIN_TOKEN secret, and checks input before any room is reached',async()=>{
 const {reached,ns}=counting(),base={ROOMS:ns('ROOMS'),DRAFT:ns('DRAFT')},action={kind:'info'};
 assert.equal((await call(base,{code:'ABCDE',action})).status,401,'no secret configured: closed to everyone');
 const e={...base,ADMIN_TOKEN:TOKEN};
 assert.equal((await call(e,{code:'ABCDE',action},null)).status,401);
 assert.equal((await call(e,{code:'ABCDE',action},'x'.repeat(48))).status,401);
 assert.equal((await call({...base,ADMIN_TOKEN:'short'},{code:'ABCDE',action},'short')).status,401,'a weak secret never opens the route');
 assert.equal((await call(e,{code:'AB',action})).status,400);
 assert.equal((await call(e,{code:'ABCDE',action:{kind:'explode'}})).status,400);
 assert.equal((await call(e,{code:'ABCDE',action:{kind:'damage',side:0,amount:0}})).status,400);
 assert.equal((await call(e,{code:'ABCDE',action:{kind:'text',text:'x'.repeat(141)}})).status,400);
 assert.deepEqual(reached,[]);
 const missing=await call(e,{code:'abcde',action});assert.equal(missing.status,404);
 assert.deepEqual(reached,['ROOMS /v3/admin','DRAFT /v3/admin'],'auto mode tries Tag, then Draft');
 reached.length=0;await call(e,{code:'ABCDE',mode:'draft',action});assert.deepEqual(reached,['DRAFT /v3/admin']);
 // Player routes cannot reach the admin paths: the hub's /admin and the registries' /v3/admin are built only here.
 assert.equal((await worker.fetch(new Request('https://rooms.test/v3/admin',{method:'GET'}),e)).status,404);
});

async function tagWorld(){
 const ctx=new FakeContext(),hub=new TagHub(new FakeContext(),{}),env={ADMIN_TOKEN:TOKEN,TAG_HUB:stub(hub)};
 const rooms=new RoomRegistry(ctx,env);await new Promise(r=>setTimeout(r));
 env.ROOMS=stub(rooms);env.DRAFT=stub({fetch:async()=>new Response(JSON.stringify({error:'No Draft room with that code.'}),{status:404})});
 const room=await rooms.registry.request('create',{},'','a');await rooms.registry.request('join',{code:room.code},'','b');
 const join=async seat=>listen(await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat)}})));
 return {env,hub,code:room.code,join};
}

test('Tag: unknown rooms are 404, actions reach both seats, info asks the host and returns its report',async()=>{
 const {env,hub,code,join}=await tagWorld();
 assert.equal((await call(env,{code:'ZZZZZ',mode:'tag',action:{kind:'info'}})).status,404);
 const nobody=await call(env,{code,mode:'tag',action:{kind:'damage',side:1,amount:500}});
 assert.equal(nobody.status,409,'nothing is sent while neither player is connected');
 const host=await join(0),guest=await join(1);host.inbox.length=guest.inbox.length=0;
 for(const action of [{kind:'damage',side:1,amount:500},{kind:'heal',side:0,amount:300},{kind:'set-lp',side:1,amount:100},{kind:'hand',side:0,code:89631139},{kind:'emote',emoji:'😜'},{kind:'text',text:'Hello stream',seconds:3},{kind:'coins',amount:50},{kind:'run-lp',amount:-1000},{kind:'relic-add',key:'eye'},{kind:'curse-add',key:'mercy'},{kind:'pool',side:1,code:89631139,count:2}]){
  const response=await call(env,{code,action});const data=await response.json();
  assert.equal(response.status,200,action.kind);assert.equal(data.mode,'tag');assert.deepEqual(data.online,[true,true]);
  for(const seat of [host,guest]){const got=seat.inbox.at(-1);assert.equal(got.hub,'admin');assert.equal(got.action.kind,action.kind);assert.equal(got.action.id,data.id)}
 }
 assert.equal(host.inbox.find(m=>m.action.kind==='text').action.text,'Hello stream');
 const before=guest.inbox.length;await call(env,{code,action:{kind:'info'}});
 assert.equal(host.inbox.at(-1).action.kind,'info');assert.equal(guest.inbox.length,before,'info goes to the host only');
 // The host's report is stored for the tool and never forwarded to the guest.
 hub.webSocketMessage(host.server,JSON.stringify({adminReport:{result:{id:'x',ok:true},state:{coins:90}}}));await new Promise(r=>setTimeout(r));
 assert.equal(guest.inbox.length,before);
 const info=await (await call(env,{code,action:{kind:'info'}})).json();assert.equal(info.report.state.coins,90);assert.equal(info.report.result.id,'x');
 // A guest cannot write the report.
 hub.webSocketMessage(guest.server,JSON.stringify({adminReport:{state:{coins:1}}}));await new Promise(r=>setTimeout(r));
 assert.equal((await (await call(env,{code,action:{kind:'info'}})).json()).report.state.coins,90);
});

const byId=new Map(cards.map(c=>[c.id,c]));
function deckOf(pool,n){const counts=new Map(),main=[];for(const id of pool){const c=byId.get(id);if(c.data.type&64)continue;const k=counts.get(c.name)||0;if(k<3&&main.length<n){counts.set(c.name,k+1);main.push(id);}}return {main,side:[],extra:[]};}
async function draftWorld(){
 const values=new Map(),storage={list:async()=>values,put:async(k,v)=>values.set(k,v),delete:async k=>values.delete(k),setAlarm:async()=>{},getAlarm:async()=>null,get:async()=>null};storage.transaction=fn=>fn(storage);
 let ready,reg;const match=new MatchHub(new FakeContext(),{DRAFT:stub({fetch:async()=>({ok:true})})});
 reg=new DraftRegistry({storage,blockConcurrencyWhile:fn=>{ready=fn();},waitUntil(){}},{MATCH_HUB:stub(match)});await ready;
 const player=async(i,op,body={})=>{const res=await reg.fetch(new Request('https://test/v2/draft/'+op,{method:'POST',body:JSON.stringify({id:'p'+i,token:'token-'+i+'-'.repeat(40),net:3,draft:4,version:'0.2.37',...body})}));const data=await res.json();assert.equal(res.status,200,op+' '+JSON.stringify(data).slice(0,200));return data};
 for(let i=0;i<2;i++)await player(i,'register',{duelist:{id:'p'+i,name:'Player '+i,character:i===0?0:2}});
 const code=(await player(0,'host')).room.code;await player(1,'join',{code});await player(0,'open-ready');await player(1,'open-ready');
 const env={ADMIN_TOKEN:TOKEN,ROOMS:stub({fetch:async()=>new Response(JSON.stringify({error:'No Tag room with that code.'}),{status:404})}),DRAFT:stub(reg)};
 const join=async seat=>listen(await match.fetch(new Request('https://hub/v3/draft/hub',{headers:{'X-Seat':String(seat),'X-Hub-Summary':JSON.stringify(reg.hubSummary(reg.data.rooms[code]))}})));
 const toDuel=async()=>{for(let i=0;i<2;i++){await player(i,'deck',{deck:deckOf(reg.data.players['p'+i].pool,20)});await player(i,'ready');}await new Promise(r=>setTimeout(r));};
 return {env,reg,match,code,join,toDuel,room:()=>reg.data.rooms[code]};
}

test('Draft: info, pool cards and relics change the registry; duel changes join the hub event list',async()=>{
 const {env,reg,match,code,join,toDuel,room}=await draftWorld();
 const info=await (await call(env,{code,action:{kind:'info'}})).json();
 assert.equal(info.mode,'draft');assert.deepEqual(info.players.map(p=>p.name),['Player 0','Player 1']);
 const card=cards.find(c=>c.name==='Blue-Eyes White Dragon').id,size=reg.data.players.p1.pool.length;
 assert.equal((await call(env,{code,action:{kind:'pool',side:1,code:card,count:3}})).status,200);
 assert.equal(reg.data.players.p1.pool.length,size+3);assert.deepEqual(reg.data.players.p1.pool.slice(-3),[card,card,card]);
 assert.equal((await call(env,{code,action:{kind:'pool',side:1,code:191000001}})).status,400,'only Draft cards');
 assert.equal((await call(env,{code,action:{kind:'relic-add',side:0,key:'not_a_relic'}})).status,400);
 assert.equal((await call(env,{code,action:{kind:'relic-add',side:0,key:DRAFT_RELICS[0]}})).status,200);assert.deepEqual(room().relics[0],[DRAFT_RELICS[0]]);
 assert.equal((await call(env,{code,action:{kind:'relic-remove',side:0,key:DRAFT_RELICS[0]}})).status,200);assert.deepEqual(room().relics[0],[]);
 assert.equal((await call(env,{code,action:{kind:'coins',amount:5}})).status,400,'Draft has no coins');
 assert.equal((await call(env,{code,action:{kind:'damage',side:0,amount:100}})).status,409,'no duel yet');
 await toDuel();assert.equal(room().phase,'duel');
 room().version='0.2.36';assert.equal((await call(env,{code,action:{kind:'damage',side:0,amount:1}})).status,409,'older clients never get duel events');room().version='0.2.37';
 const a=await join(0),b=await join(1);
 for(const action of [{kind:'damage',side:0,amount:700},{kind:'hand',side:1,code:card}]){
  const response=await call(env,{code,action});assert.equal(response.status,200,action.kind);
  for(const seat of [a,b]){const ev=seat.inbox.findLast(m=>m.t==='ev');assert.equal(ev.seat,-1);assert.equal(ev.admin.kind,action.kind);}
 }
 assert.equal(match.meta.count,2);assert.equal(match.meta.actor,room().actor,'the turn holder does not change');
 await call(env,{code,action:{kind:'text',text:'Hi',seconds:2}});await call(env,{code,action:{kind:'emote',emoji:'❤️',side:0}});
 for(const seat of [a,b])assert.deepEqual(seat.inbox.filter(m=>m.t==='admin').map(m=>m.action.kind),['text','emote']);
 // A reconnecting client gets the admin events back from the stored log.
 match.webSocketMessage(b.server,JSON.stringify({t:'hello',game:room().game,after:0}));await new Promise(r=>setTimeout(r));
 assert.deepEqual(b.inbox.findLast(m=>m.t==='sync').events.map(e=>e.admin?.kind),['damage','hand']);
 assert.equal((await call(env,{code:'ZZZZZ',mode:'draft',action:{kind:'info'}})).status,404);
});
