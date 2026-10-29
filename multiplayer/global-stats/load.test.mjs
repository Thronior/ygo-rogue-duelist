import assert from 'node:assert/strict';import {GlobalStats} from './worker.mjs';
let now=1800000000000;const realNow=Date.now;Date.now=()=>now;
const data=new Map([['total',{since:'original',devices:123,runs:10,duels:20,wins:15,losses:5,seconds:1000}]]);let rowWrites=0,deleted=0,listed=0,alarm=null;
const storage={get:async k=>structuredClone(data.get(k)),put:async rows=>{rowWrites+=Object.keys(rows).length;for(const [k,v]of Object.entries(rows))data.set(k,structuredClone(v))},getAlarm:async()=>alarm,setAlarm:async n=>alarm=n,list:async({prefix='',limit=1000,startAfter,end})=>{const rows=[...data].filter(([k])=>k.startsWith(prefix)&&(!startAfter||k>startAfter)&&(!end||k<end)).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit);listed+=rows.length;return new Map(rows)},delete:async keys=>{assert(keys.length<=128,'Cloudflare delete key limit');for(const k of keys){deleted+=data.delete(k)?1:0}}};storage.transaction=fn=>fn(storage);
let worker=new GlobalStats({storage,blockConcurrencyWhile:fn=>fn()});
const post=(body,ip='test')=>worker.fetch(new Request('https://example/v2/stats',{method:'POST',headers:{'CF-Connecting-IP':ip},body:JSON.stringify(body)}));
const get=async()=>await(await worker.fetch(new Request('https://example/v2/stats'))).json();
try{
 await worker.ready;const baselineWrites=rowWrites;const batches=[];
 // 1,000 active clients, twelve ten-minute intervals; every request retried once.
 for(let interval=0;interval<12;interval++){
  now+=600000;
  const group=Array.from({length:1000},(_,i)=>({batchId:crypto.randomUUID(),expiresAt:now+7*86400000,counts:{seconds:600,duels:1,wins:i%2,losses:1-i%2,firstTimePlayers:interval===0?1:0}}));batches.push(...group);
  const responses=await Promise.all(group.map((b,i)=>post(b,'client'+i)));assert(responses.every(r=>r.status===200));
  const after=rowWrites;const retries=await Promise.all(group.map((b,i)=>post(b,'client'+i)));assert(retries.every(r=>r.status===200));assert.equal(rowWrites,after,'duplicates do not write');
 }
 let total=await get();assert.equal(total.seconds,7201000);assert.equal(total.duels,12020);assert.equal(total.wins,6015);assert.equal(total.losses,6005);assert.equal(total.firstTimePlayers,1123);assert.equal(total.since,'original');assert.equal(rowWrites-baselineWrites,36000,'three stored keys per new batch');
 const unchanged=rowWrites;for(let i=0;i<20;i++)await get();await post({batchId:crypto.randomUUID(),expiresAt:now+86400000,counts:{}},'empty');assert.equal(rowWrites,unchanged);
 worker=new GlobalStats({storage,blockConcurrencyWhile:fn=>fn()});await worker.ready;assert.equal(rowWrites,unchanged);assert.equal((await post(batches[0],'restart')).status,200);assert.equal(rowWrites,unchanged);
 // No live-receipt scan; an early/spurious alarm reads only the next expiry.
 listed=0;await worker.alarm();assert.equal(listed,1);assert.equal(deleted,0);
 now=batches[0].expiresAt;listed=0;await worker.alarm();assert.equal(deleted,1024);assert(listed<=513,'cleanup reads at most 512 expired rows plus next expiry');assert(alarm>=now+60000);
 await worker.alarm();assert.equal(deleted,2000,'all first-interval receipts removed, future receipts retained');
 assert.equal((await post(batches[0],'expired')).status,400);assert.deepEqual(await get(),total);
 for(let i=0;i<30;i++)assert.equal((await post({batchId:crypto.randomUUID(),expiresAt:now+86400000,counts:{}},'rate')).status,200);
 assert.equal((await post({batchId:crypto.randomUUID(),expiresAt:now+86400000,counts:{}},'rate')).status,429);
 console.log('PASS 1,000 simulated clients / 2 hours: 12,000 contributions + 12,000 retries; exact totals, 36,000 key writes, zero duplicate writes; cleanup capped at 512 receipts per alarm, no live-table scans; restart, expiry, empty uploads and rate limit');
}finally{Date.now=realNow}
