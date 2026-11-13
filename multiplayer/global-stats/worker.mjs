const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export const fields=['runs','duels','wins','losses','seconds','firstTimePlayers'];
// Results are "character:level:w|l" per finished run, or "r:relic:w|l" for each relic it ended with (2026-11-03).
const lifetime=7*86400000,RESULT=/^(?:\d{1,3}:(?:-1|[0-6])|r:[a-z0-9_]{1,40}):[wl]$/,MAX_RESULT_KEYS=2000;
const expiryKey=(at,id)=>'expiry:'+String(at).padStart(16,'0')+':'+id;
// Retry receipts (2026-11-11): rows written are the scarce daily allowance. Receipts are grouped by when they expire,
// ten minutes to a row, so a new batch writes one receipt row (was a receipt plus an expiry-index row, and two deletes
// later) and cleanup deletes one row per ten minutes. Older 'batch:' receipts are still honoured until they expire.
const SLOT=600000,slotOf=at=>Math.floor(at/SLOT),slotKey=slot=>'rcpt:'+String(slot).padStart(12,'0'),slotEnd=key=>(Number(key.slice(5))+1)*SLOT;
// Uploads gathered in memory and written together (2026-11-12): one write of the totals (and receipts) per window
// instead of per upload. An instance restarting inside a window loses that window's not-yet-written increments
// (an undercount, never a double count).
const FLUSH=30000,FLUSH_AT=200;
function totals(value){const t=value||{since:new Date().toISOString()};return {...t,...Object.fromEntries(fields.map(k=>[k,t[k]??(k==='firstTimePlayers'?t.devices||0:0)]))};}
export default {fetch(request,env){if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(!['/v1/stats','/v2/stats'].includes(new URL(request.url).pathname))return reply({error:'Not found'},404);return env.STATS.get(env.STATS.idFromName('global-v1')).fetch(request)}};
export class GlobalStats{
 constructor(ctx){this.ctx=ctx;this.tail=Promise.resolve();this.rates=new Map();this.pending=null;
  this.ready=ctx.blockConcurrencyWhile(()=>ctx.storage.transaction(async storage=>{
   if(await storage.get('migration:aggregate-v2'))return;
   const previous=await storage.get('total'),total=totals(previous);
   await storage.put({'migration:aggregate-v2':{capturedAt:new Date().toISOString(),previous:previous||null,baseline:total},total});
  }));
 }
 async fetch(request){
  const work=async()=>{
   await this.ready;
   if(request.method==='GET'){const t=totals(await this.ctx.storage.get('total')),r=await this.ctx.storage.get('results'),q=this.pending,counts={...(r?.counts||{})};
    // Totals include uploads still waiting in memory, so the numbers are live.
    if(q){for(const k of fields)t[k]+=q.counts[k];for(const [k,n] of Object.entries(q.results))counts[k]=(counts[k]||0)+n}
    return reply({...t,devices:t.firstTimePlayers,results:counts,resultsSince:r?.since||(q&&Object.keys(q.results).length?new Date(q.since).toISOString():null)});}
   if(request.method!=='POST')return reply({error:'Method not allowed'},405);
   // Retire cumulative device uploads: old clients must not double-count v2 increments.
   if(new URL(request.url).pathname!=='/v2/stats')return reply({error:'Update required'},426);
   const now=Date.now(),ip=request.headers.get('CF-Connecting-IP')||'local';
   for(const [k,v] of this.rates)if(v.until<=now)this.rates.delete(k);
   const rate=this.rates.get(ip)||{n:0,until:now+60000};if(++rate.n>30||(!this.rates.has(ip)&&this.rates.size>=10000))return reply({error:'Retry later'},429);this.rates.set(ip,rate);
   const reader=request.body?.getReader();if(!reader)return reply({error:'Missing body'},400);let size=0,raw='';const decoder=new TextDecoder();
   for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return reply({error:'Too large'},413)}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode();
   const data=JSON.parse(raw);
   if(!data||Object.keys(data).some(k=>!['batchId','expiresAt','counts','results'].includes(k))||! /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(data.batchId||''))throw Error('Invalid batch');
   if(!Number.isSafeInteger(data.expiresAt)||data.expiresAt<=now||data.expiresAt>now+lifetime+60000)throw Error('Expired batch');
   if(!data.counts||typeof data.counts!=='object'||Array.isArray(data.counts)||Object.keys(data.counts).some(k=>!fields.includes(k)))throw Error('Invalid counts');
   const counts=Object.fromEntries(fields.map(k=>[k,data.counts[k]??0]));
   if(fields.some(k=>!Number.isSafeInteger(counts[k])||counts[k]<0||counts[k]>1e9)||counts.firstTimePlayers>1)throw Error('Invalid counts');
   // Character Stats: finished runs as "character:challenge level:w|l" increments. No run or device identity.
   const results=data.results??{};
   if(!results||typeof results!=='object'||Array.isArray(results)||Object.keys(results).length>32||Object.entries(results).some(([k,n])=>!RESULT.test(k)||!Number.isSafeInteger(n)||n<1||n>1000))throw Error('Invalid results');
   if(!fields.some(k=>counts[k])&&!Object.keys(results).length)return reply({accepted:true});
   const key='batch:'+data.batchId,slot=slotKey(slotOf(data.expiresAt)),id=data.batchId.replace(/-/g,'');
   // A retry is recognised from memory, from a written receipt slot, or from an older per-batch receipt.
   if(this.pending?.ids.has(id))return reply({accepted:true});
   const receipts=await this.ctx.storage.get(slot)||[];
   if(receipts.includes(id)||await this.ctx.storage.get(key)!==undefined)return reply({accepted:true});
   const fresh=!this.pending,q=this.pending??={counts:Object.fromEntries(fields.map(k=>[k,0])),results:{},slots:new Map(),ids:new Set(),since:now};
   for(const k of fields){q.counts[k]+=counts[k];if(!Number.isSafeInteger(q.counts[k]))throw Error('Counter overflow');}
   for(const [k,n] of Object.entries(results))q.results[k]=(q.results[k]||0)+n;
   // A receipt is only the random batch id in its expiry slot, never a per-device identity or activity history.
   q.ids.add(id);if(!q.slots.has(slot))q.slots.set(slot,[]);q.slots.get(slot).push(id);
   if(q.ids.size>=FLUSH_AT)await this.flush();
   else if(fresh){const alarm=await this.ctx.storage.getAlarm();if(!alarm||alarm>now+FLUSH)await this.ctx.storage.setAlarm(now+FLUSH);}
   return reply({accepted:true});
  };
  const task=this.tail.then(work);this.tail=task.catch(()=>{});try{return await task}catch{return reply({error:'Invalid stats request'},400)}
 }
 // Writes the waiting uploads: totals, results and receipt slots, in one transaction.
 async flush(){
  const q=this.pending;if(!q)return;
  await this.ctx.storage.transaction(async storage=>{
   const total=totals(await storage.get('total'));
   for(const k of fields){total[k]+=q.counts[k];if(!Number.isSafeInteger(total[k]))throw Error('Counter overflow');}
   const rows={total};
   // Tracking starts with the first recorded result; that date is shown as "since".
   if(Object.keys(q.results).length){const tally=await storage.get('results')||{since:new Date(q.since).toISOString(),counts:{}};for(const [k,n] of Object.entries(q.results)){if(!(k in tally.counts)&&Object.keys(tally.counts).length>=MAX_RESULT_KEYS)continue;tally.counts[k]=(tally.counts[k]||0)+n;if(!Number.isSafeInteger(tally.counts[k]))throw Error('Counter overflow');}rows.results=tally;}
   for(const [slot,ids] of q.slots){const receipts=await storage.get(slot)||[];for(const id of ids)if(!receipts.includes(id))receipts.push(id);rows[slot]=receipts;}
   await storage.put(rows);
  });
  if(this.pending===q)this.pending=null;
 }
 async alarm(){
  await this.ready;
  const flushed=this.tail.then(()=>this.flush());this.tail=flushed.catch(()=>{});await flushed;
  // Ordered expiry index: never scan the live seven-day receipt population.
  // Each alarm handles at most 512 receipts, then yields before continuing.
  const storage=this.ctx.storage,now=Date.now(),end=expiryKey(now,'~');
  // Receipt slots that have fully expired: one row each.
  const slots=[...(await storage.list({prefix:'rcpt:',end:slotKey(slotOf(now)),limit:128})).keys()];if(slots.length)await storage.delete(slots);
  for(let page=0;page<4;page++){
   const rows=await storage.list({prefix:'expiry:',end,limit:128});
   if(!rows.size)break;
   const keys=[...rows].flatMap(([index,receipt])=>[index,receipt]);
   for(let i=0;i<keys.length;i+=128)await storage.delete(keys.slice(i,i+128));
   if(rows.size<128)break;
  }
  const next=await storage.list({prefix:'expiry:',limit:1}),nextSlot=await storage.list({prefix:'rcpt:',limit:1});
  const at=Math.min(next.size?Number([...next.keys()][0].split(':')[1]):Infinity,nextSlot.size?slotEnd([...nextSlot.keys()][0]):Infinity);
  const soon=this.pending?now+FLUSH:Infinity;
  if(Math.min(at,soon)<Infinity)await storage.setAlarm(Math.min(Math.max(now+60000,at),soon));
 }
}
