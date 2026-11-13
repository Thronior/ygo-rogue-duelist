import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
import {RequestMeter,local,resetLocal,overCap} from './meter.mjs';

// A real RequestMeter behind a stub namespace, with in-memory storage and a manual alarm.
function meterEnv(capValue){
 const data=new Map();let alarm=null;const storage={get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v);storage.puts++},getAlarm:async()=>alarm,setAlarm:async t=>{alarm=t},puts:0};
 const ctx={storage,blockConcurrencyWhile:fn=>fn()};const meter=new RequestMeter(ctx);let calls=0;
 const reached=[];const ns=name=>({idFromName:id=>id,get:()=>({fetch:async request=>{reached.push(name);return new Response('{}')}})});
 const env={DAILY_REQUEST_CAP:String(capValue),METER:{idFromName:id=>id,get:()=>({fetch:async r=>{calls++;return meter.fetch(r)}})},ROOMS:ns('ROOMS'),DRAFT:ns('DRAFT'),COLLECTOR:ns('COLLECTOR'),BACKUP:ns('BACKUP'),PROGRESS:ns('PROGRESS')};
 return {env,meter,storage,reached,calls:()=>calls,fireAlarm:async()=>{alarm=null;await meter.alarm()}};
}
const post=path=>new Request('https://rooms.test'+path,{method:'POST',body:'{}'});
const settle=()=>local.sending||Promise.resolve();

test('requests stop at the daily ceiling with the limit message, then the meter adds few writes',async()=>{
 resetLocal();const m=meterEnv(1000);
 let refused=0;
 for(let i=0;i<1300;i++){const r=await worker.fetch(post('/v2/poll'),m.env);await settle();if(r.status===503){refused++;const body=await r.json();assert.equal(body.serverLimit,true);assert.match(body.error,/usage limit/);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*')}}
 assert.equal(m.reached.length,1000,'exactly the ceiling reached a Durable Object');assert.equal(refused,300);
 assert.ok(m.calls()<=5,'about one meter call per 250 requests, got '+m.calls());
 // /status reports the limit so the client shows the reset countdown; preflights and /health still answer.
 const status=await worker.fetch(new Request('https://rooms.test/status'),m.env);assert.equal(status.status,503);assert.equal((await status.json()).serverLimit,true);
 assert.equal((await worker.fetch(new Request('https://rooms.test/v2/poll',{method:'OPTIONS'}),m.env)).status,204);
 assert.equal((await worker.fetch(new Request('https://rooms.test/health'),m.env)).status,200);
 // The total is written only by the alarm: one row per 5 minutes at most.
 assert.equal(m.storage.puts,0);await m.fireAlarm();assert.equal(m.storage.puts,1);
});

test('a new UTC day starts again from zero',async()=>{
 resetLocal();const m=meterEnv(300);const day1=Date.parse('2026-11-13T23:59:00Z'),day2=Date.parse('2026-11-14T00:01:00Z');m.meter.now=()=>day1;
 for(let i=0;i<600;i++){overCap(m.env,null,day1);await settle()}
 assert.equal(overCap(m.env,null,day1),true);
 m.meter.now=()=>day2;assert.equal(overCap(m.env,null,day2),false,'the next day is open again');
 for(let i=0;i<299;i++){overCap(m.env,null,day2);await settle()}
 assert.equal(overCap(m.env,null,day2),false,'the meter restarted from zero, not from yesterday');
});

test('a failed meter report is retried, and no meter or cap means no limit',async()=>{
 resetLocal();let fail=true,seen=0;
 const env={DAILY_REQUEST_CAP:'1000000',METER:{idFromName:x=>x,get:()=>({fetch:async r=>{if(fail)throw Error('down');seen+=(await r.json()).n;return new Response(JSON.stringify({day:new Date().toISOString().slice(0,10),total:seen}))}})}};
 for(let i=0;i<250;i++)overCap(env,null);await settle();fail=false;
 for(let i=0;i<250;i++)overCap(env,null);await settle();
 assert.equal(seen+local.count,500,'the failed batch was kept and sent again');
 resetLocal();assert.equal(overCap({METER:env.METER},null),false);assert.equal(overCap({DAILY_REQUEST_CAP:'5'},null),false);
});
