const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export const fields=['runs','duels','wins','losses','seconds'];
export function mergeCounts(old={},incoming={}){const next={};for(const k of fields){const n=incoming[k]??0;if(!Number.isSafeInteger(n)||n<0||n>1e9)throw Error('Invalid counter');next[k]=Math.max(old[k]||0,n);}if(next.wins+next.losses>next.duels)throw Error('Invalid duel totals');return next;}
export default {fetch(request,env){if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(new URL(request.url).pathname!=='/v1/stats')return reply({error:'Not found'},404);return env.STATS.get(env.STATS.idFromName('global-v1')).fetch(request)}};
export class GlobalStats{
 constructor(ctx){this.ctx=ctx;this.tail=Promise.resolve()}
 async fetch(request){
  const work=async()=>{let total=await this.ctx.storage.get('total')||{since:new Date().toISOString(),devices:0,...Object.fromEntries(fields.map(k=>[k,0]))};
   if(request.method==='GET')return reply(total);
   if(request.method!=='POST')return reply({error:'Method not allowed'},405);
   const raw=await request.text();if(raw.length>2048)return reply({error:'Too large'},413);
   const data=JSON.parse(raw);if(!/^[a-f0-9-]{36}$/.test(data.id||''))throw Error('Invalid anonymous ID');
   const key='client:'+data.id,old=await this.ctx.storage.get(key),next=mergeCounts(old,data.counts);
   next.played=!!old?.played||data.played===true||next.duels>0;if(next.played&&!old?.played)total.devices++;
   for(const k of fields)total[k]+=next[k]-(old?.[k]||0);
   if(!old||fields.some(k=>next[k]!==old[k])||next.played!==old.played)await this.ctx.storage.put({[key]:next,total});return reply(total);
  };
  const task=this.tail.then(work);this.tail=task.catch(()=>{});try{return await task}catch{return reply({error:'Invalid stats request'},400)}
 }
}
