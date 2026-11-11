// Rows written by Draft/Collector match hubs (Durable Object free tier: 100,000 rows written per day, shared by every
// Worker). Counts what Cloudflare bills: every key put, every key deleted (deletes count), every setAlarm, and every
// row removed by deleteAll. Run directly with a path to compare another hub.mjs: node hub-writes.test.mjs <hub.mjs>
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {FakeContext} from '../../android/net_test_harness.mjs';
const target=process.argv[2]&&process.argv[2].endsWith('.mjs')?pathToFileURL(process.argv[2]).href:'./hub.mjs';
const {MatchHub}=await import(target);

export function counting(ctx){
 const s=ctx.storage,tally={puts:0,deletes:0,alarms:0,keys:{}};const note=k=>{const kind=k.split(':')[0];tally.keys[kind]=(tally.keys[kind]||0)+1};
 const put=s.put.bind(s),del=s.delete.bind(s),all=s.deleteAll.bind(s),alarm=s.setAlarm.bind(s);
 s.put=(k,v)=>{for(const key of typeof k==='object'?Object.keys(k):[k]){tally.puts++;note(key)}return put(k,v)};
 s.delete=keys=>{for(const key of [].concat(keys))if(s.data.has(key))tally.deletes++;return del(keys)};
 s.deleteAll=()=>{tally.deletes+=s.data.size;return all()};
 s.setAlarm=at=>{tally.alarms++;return alarm(at)};
 tally.rows=()=>tally.puts+tally.deletes+tally.alarms;tally.reset=()=>{tally.puts=tally.deletes=tally.alarms=0;tally.keys={}};
 return tally;
}
const summary=(extra={})=>({kind:'draft',code:'ROOM1',phase:'duel',game:1,players:2,actor:0,...extra});
function setup(ctx=new FakeContext()){
 const reports=[],env={DRAFT:{idFromName:n=>n,get:()=>({fetch:async(_,init)=>{reports.push(JSON.parse(init.body));return {ok:true}}})}};
 const hub=new MatchHub(ctx,env);
 const join=async(seat,game=1)=>{
  const socket=await hub.fetch(new Request('https://hub/',{headers:{'X-Seat':String(seat),'X-Hub-Summary':JSON.stringify(summary({game}))}}));
  const server=socket.webSocket.server,inbox=[];socket.webSocket.fake={fromServer:text=>inbox.push(JSON.parse(text)),closedByServer(){}};
  return {server,inbox,say:data=>hub.webSocketMessage(server,JSON.stringify(data)),last:t=>inbox.findLast(m=>m.t===t)};
 };
 return {hub,ctx,reports,join};
}
// One game of 60 responses: the turn passes every 6 responses, like a real duel's chains and phases.
export async function playGame(hub,seats,game,responses=60){
 let actor=0,turn=1;
 for(let n=0;n<responses;n++){
  const pass=n%6===5,next=pass?1-actor:actor;
  await seats[actor].say({t:'r',game,n,response:{type:1,n},nextActor:next,turn,h:n});
  if(pass){actor=next;turn++}
 }
 return {actor,turn};
}

test('rows written per response, per turn and per game',async()=>{
 const ctx=new FakeContext(),tally=counting(ctx),{hub,join}=setup(ctx);
 const a=await join(0),b=await join(1);const connect=tally.rows();tally.reset();
 await playGame(hub,[a,b],1);const play=tally.rows(),detail={...tally.keys,alarms:tally.alarms};tally.reset();
 await a.say({t:'result',game:1,n:60,winner:0});await b.say({t:'result',game:1,n:60,winner:0});const result=tally.rows();tally.reset();
 await hub.apply(summary({game:2,actor:1}));const nextGame=tally.rows();tally.reset();
 await hub.webSocketClose(b.server,1006,'');b.server.readyState=3;const drop=tally.rows();tally.reset();
 await join(1,2);const rejoin=tally.rows();tally.reset();
 await hub.apply(summary({game:2,phase:'complete'}));const complete=tally.rows();
 const report={connect,play,perResponse:+(play/60).toFixed(2),detail,result,nextGame,drop,rejoin,complete,total:connect+play+result+nextGame+drop+rejoin+complete};
 console.log(JSON.stringify(report));
 if(target==='./hub.mjs'){
  assert(report.perResponse<=1.1,`about one row per response, got ${report.perResponse}`);
  assert(report.nextGame<=8,`a new game deletes few rows, got ${report.nextGame}`);
  assert(report.complete<=8,`completion deletes few rows, got ${report.complete}`);
 }
});
