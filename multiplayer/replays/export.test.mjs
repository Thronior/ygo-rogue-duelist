import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';
import worker,{ReplayBucket,frame} from './worker.mjs';
// Durable Object storage stand-in: ordered KV rows (list honours limit/startAfter, get takes arrays) plus a real SQLite exec.
function storage(seed=[]){
 const rows=new Map(seed),db=new DatabaseSync(':memory:'),stats={listed:0,got:0};
 const sql={exec(q,...args){const st=db.prepare(q),out=/^\s*select/i.test(q)?st.all(...args):(st.run(...args),[]);return {toArray:()=>out,[Symbol.iterator]:()=>out[Symbol.iterator]()};}};
 return {rows,stats,db,sql,
  get:async k=>{if(Array.isArray(k)){stats.got+=k.length;return new Map(k.filter(x=>rows.has(x)).map(x=>[x,rows.get(x)]));}stats.got++;return rows.get(k);},
  put:async(k,v)=>{rows.set(k,v);},
  list:async({limit=Infinity,startAfter}={})=>{const keys=[...rows.keys()].sort().filter(k=>startAfter===undefined||k>startAfter).slice(0,limit);stats.listed+=keys.length;return new Map(keys.map(k=>[k,rows.get(k)]));}};
}
function parse(buf){const u=new Uint8Array(buf),out=[];let at=0;while(at<u.length){const n=new DataView(u.buffer,u.byteOffset+at).getUint32(0);const h=JSON.parse(new TextDecoder().decode(u.subarray(at+4,at+4+n)));at+=4+n;const body=h.end?null:u.slice(at,at+h.bytes);if(body)at+=h.bytes;out.push({h,body});}return out;}
const legacy=(received,fill)=>({bytes:new Uint8Array([fill,fill,fill]).buffer,meta:{build:'0.2.27',steps:5,ended:true},received});
const post=(id,body)=>new Request('https://bucket/'+id,{method:'POST',headers:{'X-Replay-Meta':JSON.stringify({build:'0.2.29',steps:9,ended:false})},body});

test('a bucket export pages through its rows and returns only replays received after the cutoff',async()=>{
 const seed=Array.from({length:250},(_,i)=>['k'+String(i).padStart(3,'0'),legacy(1000+i,i%250)]),s=storage(seed),b=new ReplayBucket({storage:s});
 const first=parse(await (await b.fetch(new Request('https://bucket/?export=1&after=1239'))).arrayBuffer());
 assert.deepEqual(first.map(f=>f.h.id),['k240','k241','k242','k243','k244','k245','k246','k247','k248','k249']);
 assert.equal(s.stats.listed,250,'every row is read once, in pages');
 assert.equal((await b.fetch(post('new1',new Uint8Array([7,7])))).status,200);
 const second=parse(await (await b.fetch(new Request('https://bucket/?export=1&after=1249'))).arrayBuffer());
 assert.deepEqual(second.map(f=>f.h.id),['new1']);assert.deepEqual([...second[0].body],[7,7]);
 assert.deepEqual({build:second[0].h.build,steps:second[0].h.steps,ended:second[0].h.ended,bytes:second[0].h.bytes},{build:'0.2.29',steps:9,ended:false,bytes:2});
 assert.equal(s.rows.size,251,'nothing besides the replays is stored');
 const listing=await (await b.fetch(new Request('https://bucket/'))).json();assert.equal(listing.replays.length,100);
});

test('duplicate uploads are ignored; R2-archived rows export through the object store',async()=>{
 const s=storage(),objects=new Map(),b=new ReplayBucket({storage:s},{REPLAY_FILES:{put:async(k,v)=>objects.set(k,v),get:async k=>objects.has(k)?{body:objects.get(k)}:null}});
 await b.fetch(post('abc',new Uint8Array([1,2,3])));assert.equal((await (await b.fetch(post('abc',new Uint8Array([1,2,3])))).json()).duplicate,true);
 assert.equal(s.rows.size,1);assert(!s.rows.get('abc').bytes);
 const out=parse(await (await b.fetch(new Request('https://bucket/?export=1&after=0'))).arrayBuffer());assert.deepEqual([...out[0].body],[1,2,3]);
 objects.clear();assert.equal((await b.fetch(new Request('https://bucket/?export=1&after=0'))).status,503,'a missing object fails the bucket instead of silently skipping');
});

function env(buckets){return {REPLAY_ADMIN_TOKEN:'t',REPLAYS:{idFromName:n=>n,get:n=>buckets(n)}};}
const auth={headers:{Authorization:'Bearer t'}};
test('one Worker request streams every bucket in order, then a trailer with count and failed buckets',async()=>{
 const calls=[],gz=(id,n)=>({id,b:new Uint8Array(n).fill(n)});
 const e=env(name=>({fetch:async req=>{calls.push(name);const u=new URL(req.url);assert.equal(u.searchParams.get('after'),'5000');
  if(name==='07')throw Error('down');if(name==='a1')return Response.json({error:'quota'},{status:503});
  const rows=name==='00'?[gz('x',3),gz('y',1)]:name==='ff'?[gz('z',2)]:[];
  const body=new Uint8Array(rows.reduce((a,r)=>[...a,...frame({id:r.id,received:6000},r.b)],[]));return new Response(body,{headers:{'X-Replay-Count':String(rows.length)}});}}));
 const res=await worker.fetch(new Request('https://w/v1/replays/export?after=5000',auth),e,{waitUntil(){}});
 assert.equal(res.headers.get('X-Replay-Format'),'ygr-frames-1');
 const out=parse(await res.arrayBuffer());
 assert.deepEqual(out.map(f=>f.h.id??'end'),['x','y','z','end']);
 assert.deepEqual(out.at(-1).h,{end:true,count:3,failed:['07','a1']});
 assert.equal(calls.length,256);assert.deepEqual(new Set(calls).size,256);
});

test('export needs the admin token and a sane after value; legacy routes still answer',async()=>{
 const e=env(()=>({fetch:async()=>Response.json({replays:[],cursor:null})}));
 assert.equal((await worker.fetch(new Request('https://w/v1/replays/export?after=1'),e)).status,401);
 assert.equal((await worker.fetch(new Request('https://w/v1/replays/export?after=-1',auth),e)).status,400);
 assert.equal((await worker.fetch(new Request('https://w/v1/replays/export?after=abc',auth),e)).status,400);
 assert.equal((await worker.fetch(new Request('https://w/v1/replays?bucket=0a',auth),e)).status,200);
});

test('a bucket body that breaks mid-stream leaves no trailer, so the client stops',async()=>{
 const e=env(name=>({fetch:async()=>{if(name!=='02')return new Response(new Uint8Array(0),{headers:{'X-Replay-Count':'0'}});
  return new Response(new ReadableStream({start(c){c.enqueue(frame({id:'q',received:1},new Uint8Array(4)).subarray(0,10));c.error(Error('cut'));}}));}}));
 const res=await worker.fetch(new Request('https://w/v1/replays/export?after=0',auth),e,{waitUntil(){}});
 const bytes=await res.arrayBuffer().catch(()=>null);
 assert(bytes===null||!new TextDecoder().decode(bytes).includes('"end":true'));
});

test('frame ids are real sha256 digests when built from replay bytes',()=>{const body=new Uint8Array([1,2,3]),id=createHash('sha256').update(body).digest('hex'),[f]=parse(frame({id,received:1},body));assert.equal(createHash('sha256').update(f.body).digest('hex'),f.h.id);});

test('an upload writes exactly one storage row and creates no SQL tables',async()=>{
 const s=storage();let writes=0;const put=s.put;s.put=async(k,v)=>{writes++;return put(k,v)};
 const b=new ReplayBucket({storage:s});await b.fetch(post('one',new Uint8Array([1])));
 assert.equal(writes,1);assert.deepEqual(s.db.prepare("select name from sqlite_master").all(),[]);
});

test('uploads sent as text/plain are accepted (no CORS preflight needed); preflight is cached a day',async()=>{
 const {gzipSync}=await import('node:zlib'),bytes=gzipSync(JSON.stringify({format:'ygo-replay',version:1,core:'ocgcore-wasm-0.1.2',build:'t',start:[[1],[1],8000,8000,5,1,[],[],'',5,null,null],responses:[],ended:false}));
 const seen=[],e={REPLAYS:{idFromName:n=>n,get:()=>({fetch:async r=>{seen.push(new URL(r.url).pathname.slice(1));return Response.json({ok:true,id:new URL(r.url).pathname.slice(1)})}})}};
 const single=await worker.fetch(new Request('https://w/v1/replays',{method:'POST',headers:{'Content-Type':'text/plain'},body:bytes}),e);assert.equal(single.status,200);
 const batch=await worker.fetch(new Request('https://w/v1/replays/batch',{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({replays:[Buffer.from(bytes).toString('base64')]})}),e);
 assert.equal(batch.status,200);assert.equal((await batch.json()).results[0].ok,true);assert.equal(seen.length,2);
 const pre=await worker.fetch(new Request('https://w/v1/replays/batch',{method:'OPTIONS'}),e);assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Max-Age'),'86400');
});
