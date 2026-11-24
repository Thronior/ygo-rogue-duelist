// Local lifetime counters are never uploaded. Network statistics contain increments only.
// The address comes from multiplayer-config.json, through the generated official-build.js (SELF-HOSTING.md).
import {servers} from './servers.js';
const endpoint=servers.stats+'/v2/stats';
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
// Request savings (user, 2026-11-14): a batch goes out at most every 30 minutes (was 10), and one holding only play time
// waits until it is an hour old unless a duel or run result joins it. Nothing is dropped: counts wait in localStorage.
const syncInterval=1800000,secondsOnlyWait=3600000,batchLifetime=7*86400000;
let active=()=>false,busy=false,last=Date.now(),input=Date.now(),nextSync=Date.now()+syncInterval,started=false;
const store=()=>{try{localStorage.setItem(key,JSON.stringify(saved))}catch{}};
const storeQueue=()=>{try{localStorage.setItem(queueKey,JSON.stringify(queue));return true}catch{return false}};
export function setStatsEnabled(value){localStorage.setItem(CONSENT,value?'true':'false');if(!value){controller?.abort();void withQueue(()=>{queue={pending:empty(),batch:null};storeQueue();});}}

export function recordStat(kind,id){if(local||!['runs','duels','wins','losses'].includes(kind)||!id)return;void withQueue(()=>{refreshPersonal();const token=kind+':'+id;if(saved.seen.includes(token))return;saved.seen.push(token);if(saved.seen.length>1000)saved.seen.splice(0,saved.seen.length-1000);saved.counts[kind]=(saved.counts[kind]||0)+1;store();if(statsEnabled()){queue.pending[kind]=(queue.pending[kind]||0)+1;storeQueue();}});void syncStats();}
// Character Stats: each finished run once, by character and challenge level. A run is won when its first loop is
// cleared, and dying in a later loop keeps it a win; it is lost only when it ends inside the first loop.
export function runResult(run){
 // Easy runs (easy_mode.py) stay out of the per-duelist and relic win rates.
 if(!run||run.secret_challenge||run.easy||run.history_mode==='tag')return null;
 const character=Number(run.character),level=Number(run.challenge_level??0),looped=Number(run.loop)>0;
 if(!Number.isInteger(character)||character<0||character>999||!Number.isInteger(level)||level<-1||level>6)return null;
 if(run.stage==='complete'||run.stage==='gameover'&&looped)return `${character}:${level}:w`;
 return run.stage==='gameover'?`${character}:${level}:l`:null;
}
// Global relic stats: the same finished run once more per relic it ended with, as "r:relic:w|l" (2026-11-03).
export function relicResults(run){const result=runResult(run);if(!result)return [];const outcome=result.slice(-1);return [...new Set(run.artifacts||[])].filter(id=>/^[a-z0-9_]{1,40}$/.test(id)).map(id=>`r:${id}:${outcome}`)}
export function recordRunResult(run){
 const result=runResult(run),id=run?.started_at||run?.history_id;if(local||!result||!id)return;
 void withQueue(()=>{refreshPersonal();const token='result:'+id;if(saved.seen.includes(token))return;saved.seen.push(token);if(saved.seen.length>1000)saved.seen.splice(0,saved.seen.length-1000);store();if(statsEnabled()){const results=queue.pending.results||={};for(const k of [result,...relicResults(run)])results[k]=(results[k]||0)+1;storeQueue();}});void syncStats();
}
// CPU Stats (user, 2026-11-24): each finished solo duel against a CPU once, as "opponent:tier:character:w|l" (w = the
// player won). The campaign sets duel.cpu_tier only for duels that count (campaign_expansion.py: not Tag, easy runs,
// the shopkeeper's secret, Fallen Collectors or the loop challenge). Nothing else is sent: no player, run or device ID.
// It rides in the next stats batch with the duel counters, so it costs no request of its own.
export function cpuResult(duel,character,won){
 const opponent=Number(duel?.opponent),tier=duel?.cpu_tier,c=Number(character);
 if(!Number.isInteger(opponent)||opponent<0||opponent>999||![0,1,2,3,4].includes(tier)||!Number.isInteger(c)||c<0||c>999||c===opponent)return null;
 return `${opponent}:${tier}:${c}:${won?'w':'l'}`;
}
export function recordCpuResult(duel,character,won){
 const result=cpuResult(duel,character,won);if(local||!result||!duel?.id)return;
 void withQueue(()=>{refreshPersonal();const token='cpu:'+duel.id;if(saved.seen.includes(token))return;saved.seen.push(token);if(saved.seen.length>1000)saved.seen.splice(0,saved.seen.length-1000);store();if(statsEnabled()){const cpu=queue.pending.cpu||={};cpu[result]=(cpu[result]||0)+1;storeQueue();}});
}
export function syncStats(){return withQueue(syncBatch)}
async function syncBatch(){
 if(local||!statsEnabled()||busy||Date.now()<Math.max(nextSync,queue.nextSyncAt||0))return;
 if(queue.batch&&queue.batch.expiresAt<=Date.now()){queue.batch=null;storeQueue();}
 if(!queue.batch){
  // Run results ride along with the counters, at most 32 per batch (the Worker's limit); any rest waits.
  const results=Object.entries(queue.pending.results||{}),sent=Object.fromEntries(results.slice(0,32)),rest=Object.fromEntries(results.slice(32));
  // CPU results likewise, at most 16 per batch.
  const cpu=Object.entries(queue.pending.cpu||{}),cpuSent=Object.fromEntries(cpu.slice(0,16)),cpuRest=Object.fromEntries(cpu.slice(16));
  if(!fields.some(k=>queue.pending[k]>0)&&!results.length&&!cpu.length)return;
  if(!results.length&&!cpu.length&&!fields.some(k=>k!=='seconds'&&queue.pending[k]>0)){
   if(!queue.secondsSince){queue.secondsSince=Date.now();storeQueue();return;}
   if(Date.now()-queue.secondsSince<secondsOnlyWait)return;
  }
  delete queue.secondsSince;
  queue.batch={batchId:crypto.randomUUID(),expiresAt:Date.now()+batchLifetime,counts:Object.fromEntries(fields.map(k=>[k,queue.pending[k]||0])),...(results.length?{results:sent}:{}),...(cpu.length?{cpu:cpuSent}:{})};queue.pending={...empty(),...(results.length>32?{results:rest}:{}),...(cpu.length>16?{cpu:cpuRest}:{})};
 }
 // Persist the exact retry payload before sending; never regenerate a lost acknowledgement.
 nextSync=Date.now()+syncInterval;queue.nextSyncAt=nextSync;
 if(!storeQueue())return;
 const batch=queue.batch;busy=true;
 controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),8000);
 // text/plain keeps the upload a CORS simple request, so it costs no OPTIONS preflight.
 try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(batch),signal:controller.signal});if(!r.ok)throw Error('Stats unavailable');if(queue.batch===batch){queue.batch=null;storeQueue();}}catch{}finally{clearTimeout(timer);controller=null;busy=false}
}
// CPU Stats tab: per-opponent records by tier, one opponent's record per player character, or (Character Stats) one
// player character's record per opponent. Read on demand only.
export async function fetchCpuStats(opponent=null,character=null){const r=await fetch(servers.stats+'/v2/cpu-stats'+(opponent!==null?'?opponent='+encodeURIComponent(opponent):character!==null?'?character='+encodeURIComponent(character):''),{signal:AbortSignal.timeout(10000),cache:'no-store'});if(!r.ok)throw Error('CPU stats are temporarily unavailable.');return r.json()}
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
