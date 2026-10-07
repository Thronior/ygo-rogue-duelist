const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const CODE=/^SB-[A-F0-9]{24}$/,TOKEN=/^[a-f0-9]{64}$/;
export const EXTRA_KEYS=['ygo-global-stats-v1','cpu-deck-suggestions-v1'];
export function validateBackup(data){
 if(!data||data.schema!==1||!data.files||Array.isArray(data.files)||typeof data.files!=='object')throw Error('Invalid backup');
 const names=Object.keys(data.files);if(!names.length||names.length>100||!names.includes('profile.json'))throw Error('Missing progress');
 for(const [name,text] of Object.entries(data.files)){if(!/^[\w-]+\.(json|bak)$/.test(name)||typeof text!=='string')throw Error('Invalid save file');const value=JSON.parse(text);if(!value||typeof value!=='object')throw Error('Invalid save contents')}
 if(!data.extras||typeof data.extras!=='object'||Array.isArray(data.extras))throw Error('Invalid extras');
 for(const [key,text] of Object.entries(data.extras)){if(!EXTRA_KEYS.includes(key)||typeof text!=='string')throw Error('Invalid extra');JSON.parse(text)}
 return {schema:1,files:data.files,extras:data.extras,version:String(data.version||'').slice(0,32),platform:String(data.platform||'').slice(0,80)};
}
export function backupSummary(data){
 const unpack=text=>{const value=JSON.parse(text||'{}');return value.payload||value};
 let collectors=[];try{collectors=unpack(data.files['collector.json']).duelists||[]}catch{}
 const profile=unpack(data.files['profile.json']);
 return {version:data.version,platform:data.platform,collectors:collectors.slice(0,100).map(d=>({name:String(d.name||'').slice(0,40),character:Number.isInteger(d.character)?d.character:null,status:String(d.status||'').slice(0,20)})),files:Object.keys(data.files).length,wins:Number(profile.wins)||0,runs:Number(profile.runs)||0};
}
export class BackupRegistry{
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.tail=Promise.resolve();this.rates=new Map()}
 fetch(request){const job=this.tail.then(()=>this.handle(request));this.tail=job.catch(()=>{});return job}
 async handle(request){try{
  const op=new URL(request.url).pathname.split('/').at(-1),admin=['list','export'].includes(op);
  if(admin&&(!this.env.BACKUP_ADMIN_TOKEN||request.headers.get('Authorization')!=='Bearer '+this.env.BACKUP_ADMIN_TOKEN))return reply({error:'Unauthorized'},401);
  if(!['put','list','export'].includes(op))return reply({error:'Unknown operation'},404);
  const now=Date.now(),ip=request.headers.get('CF-Connecting-IP')||'local';for(const [k,v] of this.rates)if(v.until<now)this.rates.delete(k);
  const rate=this.rates.get(ip)||{n:0,until:now+60000};if(++rate.n>40||this.rates.size>10000)return reply({error:'Retry later'},429);this.rates.set(ip,rate);
  const reader=request.body?.getReader();if(!reader)throw Error('Missing body');let raw='',bytes=0;const decoder=new TextDecoder();while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>16*1024*1024){await reader.cancel();return reply({error:'Backup too large'},413)}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode();const v=JSON.parse(raw),storage=this.ctx.storage;
  if(op==='list'){const options={prefix:'meta:',limit:100};if(typeof v.cursor==='string'&&/^meta:SB-[A-F0-9]{24}$/.test(v.cursor))options.startAfter=v.cursor;const rows=await storage.list(options);return reply({backups:[...rows.values()].map(({token,...m})=>m),cursor:rows.size===100?[...rows.keys()].at(-1):null})}
  if(!CODE.test(v.code))throw Error('Invalid recovery code');const key='meta:'+v.code,old=await storage.get(key);
  if(op==='export'){
   if(!old)return reply({error:'Backup not found'},404);const revision=v.revision||old.latest;const snapshot=old.snapshots.find(s=>s.id===revision);if(!snapshot)return reply({error:'Snapshot not found'},404);
   const chunks=[];for(let i=0;i<snapshot.parts;i++){const part=await storage.get('data:'+v.code+':'+revision+':'+i);if(typeof part!=='string')throw Error('Incomplete backup');chunks.push(part)}
   return reply({format:'ygo-device-recovery-v1',code:v.code,savedAt:snapshot.at,backup:JSON.parse(chunks.join(''))});
  }
  if(!TOKEN.test(v.token)||old&&old.token!==v.token)return reply({error:'Unauthorized'},401);
  if(old&&now-old.updatedAt<20000)return reply({error:'Retry later'},429);
  const data=validateBackup(v.backup),text=JSON.stringify(data),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
  if(old?.digest===digest)return reply({code:v.code,updatedAt:old.updatedAt,unchanged:true});
  const revision=crypto.randomUUID(),parts=Math.ceil(text.length/24000),snapshot={id:revision,at:now,parts},history=old?.snapshots||[];
  // Original + latest three + one per day for 30 days.
  const keep=new Set(history.slice(0,2).map(s=>s.id));if(history.length)keep.add(history.at(-1).id);const days=new Set();for(const s of history){const day=Math.floor(s.at/86400000);if(now-s.at<30*86400000&&!days.has(day)){keep.add(s.id);days.add(day)}}
  const kept=history.filter(s=>keep.has(s.id)),dropped=history.filter(s=>!keep.has(s.id));
  const meta={code:v.code,token:v.token,createdAt:old?.createdAt||now,updatedAt:now,latest:revision,digest,summary:backupSummary(data),snapshots:[snapshot,...kept]};
  await storage.transaction(async tx=>{for(let i=0;i<parts;i++)await tx.put('data:'+v.code+':'+revision+':'+i,text.slice(i*24000,(i+1)*24000));await tx.put(key,meta);for(const s of dropped)for(let i=0;i<s.parts;i++)await tx.delete('data:'+v.code+':'+s.id+':'+i)});
  return reply({code:v.code,updatedAt:now});
 }catch(e){return reply({error:e instanceof SyntaxError?'Invalid backup JSON':e.message},400)}}
}
