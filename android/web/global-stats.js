// Anonymous aggregate counters only. No names, decks, save files or IP addresses are stored.
const endpoint='https://ygo-rogue-stats.hadow--un--esktop.workers.dev/v1/stats';
const key='ygo-global-stats-v1';let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
if(!saved?.id||!saved?.counts||!Array.isArray(saved.seen))saved=null;
saved??={id:crypto.randomUUID(),counts:{runs:0,duels:0,wins:0,losses:0,seconds:0},seen:[]};
const local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);let active=()=>false,busy=false,last=Date.now(),input=Date.now();
const syncInterval=600000;let nextSync=Number(saved.nextSync)||Date.now()+syncInterval,started=false;
const store=()=>{try{localStorage.setItem(key,JSON.stringify(saved))}catch{}};
export function recordStat(kind,id){if(local||!saved.counts.hasOwnProperty(kind)||!id)return;const token=kind+':'+id;if(saved.seen.includes(token))return;saved.seen.push(token);saved.counts[kind]++;if(kind==='duels')saved.played=true;store();void syncStats();}
export async function syncStats(){
 if(local||busy||Date.now()<nextSync)return;
 const body=JSON.stringify({id:saved.id,counts:saved.counts,played:!!saved.played});
 if(body===saved.synced)return;
 nextSync=Date.now()+syncInterval;saved.nextSync=nextSync;store();busy=true;
 try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Stats unavailable');saved.synced=body;store();}catch{}finally{busy=false}
}
export function personalPlaySeconds(){return Math.max(0,Number(saved.counts.seconds)||0)}
export async function fetchStats(){const r=await fetch(endpoint,{signal:AbortSignal.timeout(10000),cache:'no-store'});if(!r.ok)throw Error('Global stats are temporarily unavailable.');return r.json()}
export function startStats(isActive){active=isActive;if(started)return;started=true;saved.nextSync=nextSync;store();document.addEventListener('visibilitychange',()=>{last=Date.now();input=Date.now()});for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,()=>input=Date.now(),{passive:true});setInterval(()=>{const now=Date.now();if(!local&&!document.hidden&&active()&&now-input<120000){saved.counts.seconds+=Math.min(60,Math.floor((now-last)/1000));store();}last=now;void syncStats();},60000);void syncStats();}
export function observeTagStats(v){if(!local&&v.phase==='duel'&&!saved.played){saved.played=true;store();void syncStats();}if(v.seat!==0||v.phase==='lobby')return;const id=v.run?.started_at;if(!id)return;recordStat('runs','tag:'+id);if(v.phase==='duel'&&v.duel?.mode!=='pvp')recordStat('duels','tag:'+id+':'+((v.run.loop||0)+1)+':'+((v.run.round||0)+1));for(const row of v.run?.timeline||[]){const key='tag:'+id+':'+row.loop+':'+row.duel;recordStat('duels',key);recordStat(row.won?'wins':'losses',key);}}
