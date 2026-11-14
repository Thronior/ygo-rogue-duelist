// Daily request ceiling (user, 2026-11-13: "set a 1 million requests per day limit" before moving to Workers Paid,
// which has no spending cap). Each Worker isolate counts its own requests in memory and reports them in batches to one
// RequestMeter object, so the meter adds about one object request per FLUSH requests (or per FLUSH_MS) and a handful of row writes per day.
// Once the day's total reaches DAILY_REQUEST_CAP, the Worker refuses online calls until 00:00 UTC, the same way the free
// plan does, and players see the "servers at today's limit" message (android/web/online-status.js).
// Not counted: WebSocket messages inside an open Tag/match/relay connection (Cloudflare bills those at 1/20 of a request)
// and the separate global-stats Worker.
// Reports every 1000 requests or 30 minutes per isolate (was 250 / 60 s, which cost ~16k object requests a day on the free
// plan, 2026-11-14); a ceiling of 1M can overshoot by at most one batch per isolate.
const FLUSH=1000,FLUSH_MS=1800000,SAVE_MS=300000;
const today=(now=Date.now())=>new Date(now).toISOString().slice(0,10);
export const cap=env=>{const n=Number(env?.DAILY_REQUEST_CAP);return Number.isFinite(n)&&n>0?n:0};

// Per-isolate state; exported for tests.
export const local={day:'',count:0,sentAt:0,over:'',sending:null};
export function resetLocal(){Object.assign(local,{day:'',count:0,sentAt:0,over:'',sending:null})}

// True when today's ceiling is already reached. Counts the request otherwise and reports a batch when due.
export function overCap(env,ctx,now=Date.now()){
 const limit=cap(env);if(!limit||!env.METER)return false;
 const day=today(now);
 if(local.over===day)return true;
 if(local.day!==day){local.day=day;local.count=0;local.sentAt=now}
 local.count++;
 if(!local.sending&&(local.count>=FLUSH||now-local.sentAt>=FLUSH_MS)){
  const n=local.count;local.count=0;local.sentAt=now;
  local.sending=env.METER.get(env.METER.idFromName('meter-v1')).fetch(new Request('https://meter/add',{method:'POST',body:JSON.stringify({day,n})}))
   .then(r=>r.json()).then(data=>{if(data.day===day&&data.total>=limit)local.over=day})
   .catch(()=>{local.count+=n})
   .finally(()=>{local.sending=null});
  ctx?.waitUntil?.(local.sending);
 }
 return false;
}

export class RequestMeter {
 constructor(ctx){
  this.ctx=ctx;this.now=()=>Date.now();this.day='';this.total=0;this.dirty=false;
  ctx.blockConcurrencyWhile(async()=>{const saved=await ctx.storage.get('meter');if(saved){this.day=saved.day;this.total=saved.total}});
 }
 async fetch(request){
  let body={};try{body=await request.json()}catch{}
  const day=today(this.now()),n=Math.max(0,Math.min(1e6,Number(body.n)||0));
  if(this.day!==day){this.day=day;this.total=0;this.dirty=true}
  if(body.day===day)this.total+=n,this.dirty=true;
  // Kept in memory and written at most every 5 minutes: a restart loses at most that window (undercount, never double).
  if(this.dirty&&!await this.ctx.storage.getAlarm())await this.ctx.storage.setAlarm(Date.now()+SAVE_MS);
  return new Response(JSON.stringify({day:this.day,total:this.total}),{headers:{'Content-Type':'application/json'}});
 }
 async alarm(){if(this.dirty){await this.ctx.storage.put('meter',{day:this.day,total:this.total});this.dirty=false}}
}
