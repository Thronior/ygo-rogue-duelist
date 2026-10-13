// Local lifetime counters are never uploaded. Network statistics contain increments only.
const endpoint='https://ygo-rogue-stats.hadow--un--esktop.workers.dev/v2/stats';
const CONSENT='ygo-usage-stats-enabled',key='ygo-global-stats-v1',queueKey='ygo-stats-batches-v2';
const fields=['runs','duels','wins','losses','seconds','firstTimePlayers'];
const empty=()=>Object.fromEntries(fields.map(k=>[k,0]));
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
export const statsEnabled=()=>localStorage.getItem(CONSENT)!=='false';
let controller=null,saved=read(key);
if(!saved?.counts||!Array.isArray(saved.seen))saved={counts:empty(),seen:[]};
// Preserve personal counters and event deduplication, but discard the old network identity.
saved={counts:saved.counts,seen:saved.seen,playUntil:saved.playUntil||0};
const refreshPersonal=()=>{const latest=read(key);if(latest?.counts&&Array.isArray(latest.seen))saved={counts:latest.counts,seen:latest.seen,playUntil:latest.playUntil||0};};
let queue=read(queueKey)||{pending:empty(),batch:null},queueTail=Promise.resolve();
function withQueue(task){const run=()=>{queue=read(queueKey)||{pending:empty(),batch:null};return task();};const work=queueTail.then(()=>globalThis.navigator?.locks?navigator.locks.request('ygo-stats-batches-v2',run):run());queueTail=work.catch(()=>{});return work;}
const local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const syncInterval=600000,batchLifetime=7*86400000;
let active=()=>false,busy=false,last=Date.now(),input=Date.now(),nextSync=Date.now()+syncInterval,started=false;
const store=()=>{try{localStorage.setItem(key,JSON.stringify(saved))}catch{}};
const storeQueue=()=>{try{localStorage.setItem(queueKey,JSON.stringify(queue));return true}catch{return false}};
export function setStatsEnabled(value){localStorage.setItem(CONSENT,value?'true':'false');if(!value){controller?.abort();void withQueue(()=>{queue={pending:empty(),batch:null};storeQueue();});}}

export function recordStat(kind,id){if(local||!['runs','duels','wins','losses'].includes(kind)||!id)return;void withQueue(()=>{refreshPersonal();const token=kind+':'+id;if(saved.seen.includes(token))return;saved.seen.push(token);saved.counts[kind]=(saved.counts[kind]||0)+1;store();if(statsEnabled()){queue.pending[kind]=(queue.pending[kind]||0)+1;storeQueue();}});void syncStats();}
export function syncStats(){return withQueue(syncBatch)}
async function syncBatch(){
 if(local||!statsEnabled()||busy||Date.now()<Math.max(nextSync,queue.nextSyncAt||0))return;
 if(queue.batch&&queue.batch.expiresAt<=Date.now()){queue.batch=null;storeQueue();}
 if(!queue.batch){if(!fields.some(k=>queue.pending[k]>0))return;queue.batch={batchId:crypto.randomUUID(),expiresAt:Date.now()+batchLifetime,counts:queue.pending};queue.pending=empty();}
 // Persist the exact retry payload before sending; never regenerate a lost acknowledgement.
 nextSync=Date.now()+syncInterval;queue.nextSyncAt=nextSync;
 if(!storeQueue())return;
 const batch=queue.batch;busy=true;
 controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),8000);
 try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(batch),signal:controller.signal});if(!r.ok)throw Error('Stats unavailable');if(queue.batch===batch){queue.batch=null;storeQueue();}}catch{}finally{clearTimeout(timer);controller=null;busy=false}
}
export function personalPlaySeconds(){refreshPersonal();return Math.max(0,Number(saved.counts.seconds)||0)}
export async function fetchStats(){const r=await fetch(endpoint,{signal:AbortSignal.timeout(10000),cache:'no-store'});if(!r.ok)throw Error('Global stats are temporarily unavailable.');return r.json()}
export function startStats(isActive){
 active=isActive;if(started)return;started=true;store();
 document.addEventListener('game-startup-ready',event=>{if(event.detail?.newDevice&&!local)void withQueue(()=>{if(localStorage.getItem('ygo-first-launch-counted-v2'))return;localStorage.setItem('ygo-first-launch-counted-v2','true');if(statsEnabled()){queue.pending.firstTimePlayers=1;storeQueue();}});},{once:true});
 document.addEventListener('visibilitychange',()=>{last=Date.now();input=Date.now()});
 for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,()=>input=Date.now(),{passive:true});
 setInterval(()=>{const now=Date.now(),previous=last;last=now;if(!local&&!document.hidden&&active()&&now-input<120000){void withQueue(()=>{refreshPersonal();const seconds=Math.max(0,Math.min(60,Math.floor((now-Math.max(previous,saved.playUntil||0))/1000)));if(!seconds)return;saved.counts.seconds=(saved.counts.seconds||0)+seconds;saved.playUntil=now;store();if(statsEnabled()){queue.pending.seconds=(queue.pending.seconds||0)+seconds;storeQueue();}});}void syncStats();},60000);
 void syncStats();
}
export function observeTagStats(v){if(v.seat!==0||v.phase==='lobby')return;const id=v.run?.started_at;if(!id)return;recordStat('runs','tag:'+id);if(v.phase==='duel'&&v.duel?.mode!=='pvp')recordStat('duels','tag:'+id+':'+((v.run.loop||0)+1)+':'+((v.run.round||0)+1));for(const row of v.run?.timeline||[]){const key='tag:'+id+':'+row.loop+':'+row.duel;recordStat('duels',key);recordStat(row.won?'wins':'losses',key);}}
