// CPU Stats (2026-11-24): anonymous per-opponent wins/losses by tier and player character. Run: node cpu.test.mjs
import assert from 'node:assert/strict';import worker,{GlobalStats} from './worker.mjs';
const data=new Map([['total',{since:'2026-09-01',devices:5,runs:1,duels:2,wins:1,losses:1,seconds:60}],['migration:aggregate-v2',{baseline:'kept'}]]);let rowWrites=0,alarm=null;
const storage={get:async k=>structuredClone(data.get(k)),put:async rows=>{rowWrites+=Object.keys(rows).length;for(const [k,v]of Object.entries(rows))data.set(k,structuredClone(v))},getAlarm:async()=>alarm,setAlarm:async n=>alarm=n,list:async({prefix,limit,end})=>new Map([...data].filter(([k])=>k.startsWith(prefix)&&(!end||k<end)).sort().slice(0,limit)),delete:async keys=>keys.forEach(k=>data.delete(k))};storage.transaction=fn=>fn(storage);
const stats=new GlobalStats({storage,blockConcurrencyWhile:fn=>fn()},{},null),id=()=>crypto.randomUUID(),expiry=Date.now()+86400000;
const post=body=>stats.fetch(new Request('https://example/v2/stats',{method:'POST',body:JSON.stringify(body)}));
const cpu=async(q='')=>{const r=await stats.fetch(new Request('https://example/v2/cpu-stats'+q));return {status:r.status,body:await r.json()}};
await stats.ready;assert.deepEqual(data.get('migration:aggregate-v2'),{baseline:'kept'},'the preserved migration baseline is never re-added');
// Empty: renders "no data yet".
assert.deepEqual((await cpu()).body,{since:null,tiers:{}});
// One finished duel = one key; a batch may carry several, and the same duel retried is counted once.
const first={batchId:id(),expiresAt:expiry,counts:{duels:1,wins:1},cpu:{'12:1:3:w':1}};
assert.equal((await post(first)).status,200);assert.equal((await post(first)).status,200);
assert.equal((await post({batchId:id(),expiresAt:expiry,counts:{},cpu:{'12:1:3:l':2,'12:1:5:w':1,'40:4:3:l':1,'7:0:3:w':1}})).status,200,'a CPU-only batch is accepted');
let view=(await cpu()).body;assert.deepEqual(view.tiers,{0:{7:[1,0]},1:{12:[2,2]},4:{40:[0,1]}},'pending uploads are live');assert(Date.parse(view.since)>0);
assert.deepEqual((await cpu('?opponent=12')).body.tiers,{1:{3:[1,2],5:[1,0]}});assert.equal((await cpu('?opponent=12')).body.opponent,12);
assert.deepEqual((await cpu('?opponent=99')).body.tiers,{});
// Character Stats: one player character's record against each CPU.
assert.deepEqual((await cpu('?character=3')).body.tiers,{0:{7:[1,0]},1:{12:[1,2]},4:{40:[0,1]}});assert.equal((await cpu('?character=3')).body.character,3);
assert.deepEqual((await cpu('?character=5')).body.tiers,{1:{12:[1,0]}});
for(const q of ['?character=x','?character=1000','?opponent=12&character=3'])assert.equal((await cpu(q)).status,400,q);
// Signed build parameters on the URL don't disturb the query.
assert.deepEqual((await cpu('?opponent=12&b=0.2.44%2Babc&s=sig')).body.tiers,{1:{3:[1,2],5:[1,0]}});
// The flush writes the touched tier rows only, together with the totals and receipt slot.
const before=rowWrites;await stats.alarm();assert(data.has('cpu:t1')&&data.has('cpu:t4')&&data.has('cpu:t0')&&!data.has('cpu:t2')&&!data.has('cpu:t3'));
assert.deepEqual(data.get('cpu:t1').counts,{'12:3:w':1,'12:3:l':2,'12:5:w':1});assert(rowWrites-before<=5,'totals + 3 tier rows + 1 receipt slot ('+(rowWrites-before)+')');
assert.deepEqual((await cpu()).body.tiers,{0:{7:[1,0]},1:{12:[2,2]},4:{40:[0,1]}},'stored rows read back the same');
assert.equal((await post(first)).status,200);await stats.alarm();assert.equal(data.get('cpu:t1').counts['12:3:w'],1,'retry after the flush is still counted once');
assert.equal((await post({batchId:id(),expiresAt:expiry,counts:{},cpu:{'12:1:3:w':4}})).status,200);assert.deepEqual((await cpu('?opponent=12')).body.tiers[1][3],[5,2],'stored + pending add up');
// The general totals and Character Stats are unaffected.
{const r=await stats.fetch(new Request('https://example/v2/stats'));const t=await r.json();assert.equal(t.duels,3);assert.deepEqual(t.results,{})}
// Validation: shape, tier range, ids, counts and the 16-key limit; nothing identifying is accepted.
for(const bad of [{'12:5:3:w':1},{'12:1:3:x':1},{'1234:1:3:w':1},{'a:1:3:w':1},{'12:1:3:w':0},{'12:1:3:w':1.5},{'12:1:3:w':1001},{'12:1:3:w':'1'},[1],'x',Object.fromEntries(Array.from({length:17},(_,i)=>[i+':1:3:w',1])),{'12:1:3:w':1,player:'abc'}])
 assert.equal((await post({batchId:id(),expiresAt:expiry,counts:{},cpu:bad})).status,400,JSON.stringify(bad).slice(0,50));
assert.equal((await post({batchId:id(),expiresAt:expiry,counts:{},cpu:{'1:1:1:w':1},player:'x'})).status,400,'no extra batch fields');
assert.equal((await cpu('?opponent=x')).status,400);
assert.equal((await stats.fetch(new Request('https://example/v2/cpu-stats',{method:'POST',body:'{}'}))).status,405);
// The front door routes the new path through the same build check, rate limit and daily cap.
{const env={STATS:{idFromName:n=>{assert.equal(n,'global-v1');return n},get:()=>({fetch:()=>new Response('{"ok":1}')})}};
 assert.equal((await worker.fetch(new Request('https://example/v2/cpu-stats'),env,{waitUntil(){}})).status,200);
 assert.equal((await worker.fetch(new Request('https://example/v2/cpu-other'),env,{waitUntil(){}})).status,404);}
// The replay seed (cpu-seed.mjs) is added once, with its marker in the same write, on top of whatever is stored.
{const rows=new Map([['migration:aggregate-v2',{baseline:'kept'}],['total',{since:'x',runs:1}],['cpu:t1',{since:'2026-11-25T00:00:00.000Z',counts:{'12:3:w':1}}]]);let puts=0;
 const st={get:async k=>structuredClone(rows.get(k)),put:async r=>{puts++;for(const [k,v] of Object.entries(r))rows.set(k,structuredClone(v))},getAlarm:async()=>null,setAlarm:async()=>{},list:async()=>new Map(),delete:async()=>{}};st.transaction=fn=>fn(st);
 const seed={from:'2026-11-21T18:00:00.000Z',to:'2026-11-24T18:00:00.000Z',cpu:{t1:{'12:3:w':5,'12:3:l':2,'bad key':9},t4:{'62:1:l':3}}};
 const a=new GlobalStats({storage:st,blockConcurrencyWhile:fn=>fn()},{},seed);await a.ready;
 assert.deepEqual(rows.get('cpu:t1').counts,{'12:3:w':6,'12:3:l':2});assert.equal(rows.get('cpu:t1').since,seed.from,'Since moves back to the seed start');assert.deepEqual(rows.get('cpu:t4').counts,{'62:1:l':3});
 assert.equal(rows.get('migration:cpu-seed-v1').duels,10);assert.equal(puts,1,'seed and marker in one write');assert.deepEqual(rows.get('migration:aggregate-v2'),{baseline:'kept'});assert.deepEqual(rows.get('total'),{since:'x',runs:1},'totals untouched');
 const b=new GlobalStats({storage:st,blockConcurrencyWhile:fn=>fn()},{},seed);await b.ready;assert.equal(rows.get('cpu:t1').counts['12:3:w'],6,'never added twice');assert.equal(puts,1);
 const r=await b.fetch(new Request('https://example/v2/cpu-stats?opponent=62'));assert.deepEqual((await r.json()).tiers,{4:{1:[0,3]}});}
console.log('PASS CPU stats: per-tier opponent records, per-character view, live pending, retries once, touched tier rows only, validation, routing; replay seed added once; baseline untouched');
