const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Cache-Control':'no-store'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
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
export default {async fetch(req,env){
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const url=new URL(req.url);if(url.pathname==='/health')return reply({ok:true});
 if(req.method==='POST'&&url.pathname==='/v1/replays'){
  if(Number(req.headers.get('content-length'))>=20000)return reply({error:'Replay too large'},413);
  try{const reader=req.body.getReader();let size=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>=20000){await reader.cancel();return reply({error:'Replay too large'},413)}chunks.push(value)}const bytes=await new Blob(chunks).arrayBuffer(),meta=await validate(bytes),id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');const bucket=env.REPLAYS.get(env.REPLAYS.idFromName(id.slice(0,2)));return bucket.fetch(new Request('https://bucket/'+id,{method:'POST',headers:{'X-Replay-Meta':JSON.stringify(meta)},body:bytes}));}catch{return reply({error:'Invalid compressed replay'},400)}
 }
 // Replay downloads and listings are private to the game's maintainer.
 if(req.method==='GET'&&url.pathname.startsWith('/v1/replays')){
  if(!env.REPLAY_ADMIN_TOKEN||req.headers.get('Authorization')!=='Bearer '+env.REPLAY_ADMIN_TOKEN)return reply({error:'Unauthorized'},401);
  const id=url.pathname.split('/')[3],bucket=id?.slice(0,2)||url.searchParams.get('bucket');if(!/^[a-f0-9]{2}$/.test(bucket||'')||(id&&!/^[a-f0-9]{64}$/.test(id)))return reply({error:'Invalid identifier'},400);
  return env.REPLAYS.get(env.REPLAYS.idFromName(bucket)).fetch(new Request('https://bucket/'+(id||'')+'?cursor='+encodeURIComponent(url.searchParams.get('cursor')||'')));
 }
 return reply({error:'Not found'},404);
}};
export class ReplayBucket {
 constructor(ctx){this.ctx=ctx}
 async fetch(req){const id=new URL(req.url).pathname.slice(1),storage=this.ctx.storage;
  if(req.method==='POST'){
   if(await storage.get(id))return reply({ok:true,id,duplicate:true});
   const bytes=await req.arrayBuffer(),meta=JSON.parse(req.headers.get('X-Replay-Meta'));await storage.put(id,{bytes,meta,received:Date.now()});return reply({ok:true,id});
  }
  if(id){const row=await storage.get(id);return row?new Response(row.bytes,{headers:{...cors,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${id}.ygr"`}}):reply({error:'Not found'},404)}
  const cursor=new URL(req.url).searchParams.get('cursor'),rows=await storage.list({limit:100,...(cursor?{startAfter:cursor}:{})});return reply({replays:Array.from(rows,([id,r])=>({id,...r.meta,received:r.received,bytes:r.bytes.byteLength})),cursor:rows.size===100?[...rows.keys()].at(-1):null});
 }
}
