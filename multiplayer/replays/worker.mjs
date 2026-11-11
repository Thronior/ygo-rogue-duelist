const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'86400','Cache-Control':'no-store'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
// Storage outages must return CORS-readable errors; reports stay in the client outbox.
export async function storageRequest(bucket,request){
 try{return await bucket.fetch(request)}catch(error){
  const quota=/Exceeded allowed rows (written|read)/i.test(String(error?.message||error));
  return reply({error:quota?'Report service reached its daily storage allowance. Your report is saved on this device; retry after 00:00 UTC.':'Report storage is temporarily unavailable. Your report is saved on this device; please retry later.'},503);
 }
}
export async function validate(bytes){
 if(bytes.byteLength>=20000||bytes.byteLength<20)throw Error('Replay must be below 20 kB.');
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();let length=0,chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2000000)throw Error('Replay expands beyond the limit.');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
 const text=await new Blob(chunks).text(),r=JSON.parse(text);
 if(r.format!=='ygo-replay'||r.version!==1||r.core!=='ocgcore-wasm-0.1.2'||!Array.isArray(r.start)||![11,12].includes(r.start.length)||!Array.isArray(r.responses)||r.responses.length>25000||typeof r.start[8]!=='string'||r.start[8].length>200000||typeof r.ended!=='boolean')throw Error('Invalid replay.');
 if(r.start.length===12&&r.start[11]!==null&&r.start[11]!==2)throw Error('Invalid duel rules.');
 for(const deck of [r.start[0],r.start[1],r.start[6],r.start[7]])if(!Array.isArray(deck)||deck.length>200||deck.some(x=>!Number.isInteger(x)||x<1||x>0x7fffffff))throw Error('Invalid deck.');
 return {build:String(r.build).slice(0,32),steps:r.responses.length,ended:r.ended};
}
async function readLimited(req,limit){const reader=req.body?.getReader();if(!reader)throw Error('Missing upload body.');let size=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('Upload body is too large.')}chunks.push(value)}return new Uint8Array(await new Blob(chunks).arrayBuffer());}
async function storeValidated(bytes,env){const meta=await validate(bytes),id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');const bucket=env.REPLAYS.get(env.REPLAYS.idFromName(id.slice(0,2)));const response=await storageRequest(bucket,new Request('https://bucket/'+id,{method:'POST',headers:{'X-Replay-Meta':JSON.stringify(meta)},body:bytes}));return {status:response.status,...await response.json()};}
export async function uploadBatch(req,env){
 let body;try{body=JSON.parse(new TextDecoder().decode(await readLimited(req,280000)));}catch{return reply({error:'Invalid or oversized replay bundle.'},400)}
 if(!Array.isArray(body?.replays)||!body.replays.length||body.replays.length>10)return reply({error:'Bundles must contain 1 to 10 replays.'},400);
 const results=new Array(body.replays.length);let next=0;
 await Promise.all(Array.from({length:2},async()=>{for(;;){const index=next++;if(index>=results.length)return;try{const encoded=body.replays[index];if(typeof encoded!=='string'||encoded.length>26668||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Error('Invalid replay encoding.');const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));results[index]=await storeValidated(bytes,env);}catch(error){results[index]={ok:false,status:400,error:['Replay must be below 20 kB.','Replay expands beyond the limit.','Invalid replay.','Invalid duel rules.','Invalid deck.','Invalid replay encoding.'].includes(error.message)?error.message:'Invalid compressed replay.'};}}}));
 return reply({results});
}
// One admin request returns every replay received after `after` (ms). Each bucket answers once with
// ready-made frames that are piped through untouched, so the Worker spends almost no CPU.
// Frame: 4-byte big-endian header length, UTF-8 JSON header, then header.bytes raw replay bytes.
// The last frame is {end:true,count,failed} with no body; a missing trailer means the stream broke.
export const EXPORT_BUCKETS=256,EXPORT_WINDOW=8;
export function frame(header,body){const h=new TextEncoder().encode(JSON.stringify(body?{...header,bytes:body.byteLength}:header)),out=new Uint8Array(4+h.length+(body?.byteLength||0));new DataView(out.buffer).setUint32(0,h.length);out.set(h,4);if(body)out.set(new Uint8Array(body),4+h.length);return out;}
export function exportReplays(env,after,ctx){
 const {readable,writable}=new TransformStream(),failed=[];let count=0;
 const call=n=>{const b=n.toString(16).padStart(2,'0');return Promise.resolve().then(()=>env.REPLAYS.get(env.REPLAYS.idFromName(b)).fetch(new Request('https://bucket/?export=1&after='+after))).catch(()=>null).then(r=>({b,r}));};
 const pending=[];for(let n=0;n<Math.min(EXPORT_WINDOW,EXPORT_BUCKETS);n++)pending.push(call(n));
 const pump=(async()=>{
  for(let n=0;n<EXPORT_BUCKETS;n++){
   const {b,r}=await pending[n];if(pending.length<EXPORT_BUCKETS)pending.push(call(pending.length));
   if(!r?.ok||!r.body){failed.push(b);await r?.body?.cancel().catch(()=>{});continue;}
   // A body that breaks part-way aborts the whole stream: the client then sees no trailer and stops.
   try{await r.body.pipeTo(writable,{preventClose:true});}catch{return;}
   count+=Number(r.headers.get('X-Replay-Count'))||0;
  }
  const writer=writable.getWriter();await writer.write(frame({end:true,count,failed}));await writer.close();
 })().catch(()=>{});
 ctx?.waitUntil?.(pump);
 return new Response(readable,{headers:{...cors,'Content-Type':'application/octet-stream','X-Replay-Format':'ygr-frames-1'}});
}
export default {async fetch(req,env,ctx){
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const url=new URL(req.url);if(url.pathname==='/health')return reply({ok:true});
 if(req.method==='POST'&&url.pathname==='/v1/replays/batch')return uploadBatch(req,env);
 if(req.method==='POST'&&url.pathname==='/v1/replays'){
  if(Number(req.headers.get('content-length'))>=20000)return reply({error:'Replay too large'},413);
  try{const reader=req.body.getReader();let size=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>=20000){await reader.cancel();return reply({error:'Replay too large'},413)}chunks.push(value)}const bytes=await new Blob(chunks).arrayBuffer(),meta=await validate(bytes),id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');const bucket=env.REPLAYS.get(env.REPLAYS.idFromName(id.slice(0,2)));return storageRequest(bucket,new Request('https://bucket/'+id,{method:'POST',headers:{'X-Replay-Meta':JSON.stringify(meta)},body:bytes}));}catch(error){return reply({error:['Replay must be below 20 kB.','Replay expands beyond the limit.','Invalid replay.','Invalid duel rules.','Invalid deck.'].includes(error.message)?error.message:'Invalid compressed replay'},400)}
 }
 // Replay downloads and listings are private to the game's maintainer.
 if(req.method==='GET'&&url.pathname.startsWith('/v1/replays')){
  if(!env.REPLAY_ADMIN_TOKEN||req.headers.get('Authorization')!=='Bearer '+env.REPLAY_ADMIN_TOKEN)return reply({error:'Unauthorized'},401);
  if(url.pathname==='/v1/replays/export'){const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)return reply({error:'Invalid after'},400);return exportReplays(env,after,ctx);}
  const id=url.pathname.split('/')[3],bucket=id?.slice(0,2)||url.searchParams.get('bucket');if(!/^[a-f0-9]{2}$/.test(bucket||'')||(id&&!/^[a-f0-9]{64}$/.test(id)))return reply({error:'Invalid identifier'},400);
  return storageRequest(env.REPLAYS.get(env.REPLAYS.idFromName(bucket)),new Request('https://bucket/'+(id||'')+'?cursor='+encodeURIComponent(url.searchParams.get('cursor')||'')));
 }
 return reply({error:'Not found'},404);
}};
export class ReplayBucket {
 constructor(ctx,env={}){this.ctx=ctx;this.objects=env.REPLAY_FILES;this.tail=Promise.resolve()}
 // No time index on purpose: an index would add a storage write to every upload (the tighter daily allowance).
 // A bucket holds a few hundred replays, so scanning it costs only rows read, the cheapest allowance.
 async exportSince(after){
  const storage=this.ctx.storage,parts=[];let size=0,cursor=null;
  for(;;){const rows=await storage.list({limit:100,...(cursor?{startAfter:cursor}:{})});
   for(const [id,row] of rows){if(!((Number(row?.received)||0)>after))continue;
    let bytes=row.bytes;if(!bytes&&row.object){const o=await this.objects?.get(row.object);bytes=o?await new Response(o.body).arrayBuffer():null;}
    if(!bytes)throw Error('Replay file temporarily unavailable');
    const f=frame({id,received:row.received,build:row.meta?.build,steps:row.meta?.steps,ended:row.meta?.ended},bytes);parts.push(f);size+=f.length;}
   if(rows.size<100)break;cursor=[...rows.keys()].at(-1);}
  const out=new Uint8Array(size);let at=0;for(const f of parts){out.set(f,at);at+=f.length;}
  return new Response(out,{headers:{'Content-Type':'application/octet-stream','X-Replay-Count':String(parts.length)}});
 }
 fetch(req){const job=this.tail.then(()=>this.handle(req));this.tail=job.catch(()=>{});return job;}
 async archive(id,row){
  if(!this.objects||!row.bytes)return row;
  await this.objects.put(id,row.bytes,{httpMetadata:{contentType:"application/octet-stream"}});
  const next={meta:row.meta,received:row.received,size:row.bytes.byteLength,object:id};
  await this.ctx.storage.put(id,next);return next;
 }
 async handle(req){const u=new URL(req.url),id=u.pathname.slice(1),storage=this.ctx.storage;
  if(req.method==='GET'&&!id&&u.searchParams.get('export')){try{return await this.exportSince(Number(u.searchParams.get('after'))||0);}catch(error){return reply({error:String(error?.message||error)},503);}}
  if(req.method==='POST'){
   const existing=await storage.get(id);if(existing)return reply({ok:true,id,duplicate:true});
   const bytes=await req.arrayBuffer(),meta=JSON.parse(req.headers.get('X-Replay-Meta'));const row={bytes,meta,received:Date.now()};if(this.objects)await this.archive(id,row);else await storage.put(id,row);return reply({ok:true,id});
  }
  if(id){let row=await storage.get(id);if(!row)return reply({error:'Not found'},404);
   // Legacy payloads remain readable; migrate only after a successful object upload.
   if(row.bytes&&this.objects)row=await this.archive(id,row);
   const bytes=row.bytes||(await this.objects?.get(row.object))?.body;
   if(!bytes)return reply({error:'Replay file temporarily unavailable'},503);
   return new Response(bytes,{headers:{...cors,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${id}.ygr"`}});
  }
  const cursor=new URL(req.url).searchParams.get('cursor'),rows=await storage.list({limit:100,...(cursor?{startAfter:cursor}:{})});return reply({replays:Array.from(rows,([id,r])=>({id,...r.meta,received:r.received,bytes:r.size??r.bytes.byteLength})),cursor:rows.size===100?[...rows.keys()].at(-1):null});
 }
}
