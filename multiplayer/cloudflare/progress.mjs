const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const flags=['gallery_unlocked','relicless_unlocked','cpu_viewer_unlocked'];
export function cleanProgress(p={}){
 const ids=a=>[...new Set((Array.isArray(a)?a:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=38))].sort((a,b)=>a-b);
 return {characters:ids(p.characters),achievements:[...new Set((Array.isArray(p.achievements)?p.achievements:[]).filter(x=>/^character:(?:[0-9]|[12][0-9]|3[0-8])$/.test(x)))].sort(),levels:Object.fromEntries(Object.entries(p.levels||{}).filter(([k,v])=>/^(?:[0-9]|[12][0-9]|3[0-8])$/.test(k)&&Number.isInteger(v)&&v>=0&&v<=5)),flags:flags.filter(k=>Array.isArray(p.flags)&&p.flags.includes(k))};
}
export function mergeProgress(a,b){a=cleanProgress(a);b=cleanProgress(b);return cleanProgress({characters:[...a.characters,...b.characters],achievements:[...a.achievements,...b.achievements],flags:[...a.flags,...b.flags],levels:Object.fromEntries([...new Set([...Object.keys(a.levels),...Object.keys(b.levels)])].map(k=>[k,Math.max(a.levels[k]??-1,b.levels[k]??-1)]))})}
export class ProgressRegistry{
 constructor(ctx){this.ctx=ctx;this.tail=Promise.resolve();this.limits=new Map()}
 fetch(request){const job=this.tail.then(()=>this.handle(request));this.tail=job.catch(()=>{});return job}
 async handle(request){try{
  const ip=request.headers.get('CF-Connecting-IP')||'local',now=Date.now();
  for(const [k,v] of this.limits)if(v.until<now)this.limits.delete(k);
  const rate=this.limits.get(ip)||{until:now+60000,count:0};if(++rate.count>30)throw Error('Too many requests. Try again in a minute.');if(this.limits.size>=10000&&!this.limits.has(ip))throw Error('Please try again later.');this.limits.set(ip,rate);
  const reader=request.body?.getReader();if(!reader)throw Error('Empty request');let raw='',size=0;const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();throw Error('Request too large')}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode();const v=JSON.parse(raw);
  const op=new URL(request.url).pathname.split('/').at(-1);if(!['create','join','sync'].includes(op))throw Error('Unknown sync operation');
  const auth=async()=>{if(typeof v.group!=='string'||!/^[a-f0-9-]{36}$/.test(v.group))throw Error('Device is not linked');const g=await this.ctx.storage.get('group:'+v.group);if(!g||g.token!==v.token)throw Error('Invalid device link');return g};
  if(op==='join'){
   if(typeof v.code!=='string'||! /^[A-Z2-9]{8}$/.test(v.code))throw Error('Enter the eight-character code');
   const key='code:'+v.code,pair=await this.ctx.storage.get(key);if(!pair||pair.expires<=now)throw Error('Code expired or already used. Generate a new code.');
   const g=await this.ctx.storage.get('group:'+pair.group);if(!g)throw Error('Link unavailable');g.progress=mergeProgress(g.progress,v.progress);
   await this.ctx.storage.transaction(async tx=>{await tx.put('group:'+pair.group,g);await tx.delete(key)});
   return reply({group:pair.group,token:g.token,progress:g.progress});
  }
  let group=v.group,g;
  if(op==='create'&&!group){group=crypto.randomUUID();g={token:crypto.randomUUID()+crypto.randomUUID(),progress:cleanProgress(v.progress)}}else g=await auth();
  g.progress=mergeProgress(g.progress,v.progress);await this.ctx.storage.put('group:'+group,g);
  if(op==='sync')return reply({progress:g.progress});
  if(g.code)await this.ctx.storage.delete('code:'+g.code);
  let code;do{code=Array.from(crypto.getRandomValues(new Uint8Array(8)),x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%32]).join('')}while(await this.ctx.storage.get('code:'+code));
  const expires=now+600000;g.code=code;await this.ctx.storage.put('group:'+group,g);await this.ctx.storage.put('code:'+code,{group,expires});await this.ctx.storage.setAlarm(now+600000);
  return reply({group,token:g.token,progress:g.progress,code,expires});
 }catch(e){return reply({error:e instanceof SyntaxError?'Invalid request':e.message},400)}}
 async alarm(){const now=Date.now(),codes=await this.ctx.storage.list({prefix:'code:'});for(const [k,v] of codes)if(v.expires<=now)await this.ctx.storage.delete(k);else await this.ctx.storage.setAlarm(v.expires)}
}
