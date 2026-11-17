// Cloudflare's free plan resets its daily allowances at 00:00 UTC. When a service says it is out (429, 503 or a
// "daily" / "Exceeded allowed rows" error), background traffic to it pauses until just after that reset instead of
// retrying all day. Player-initiated actions may still try. One small localStorage map holds every pause.
const KEY='ygo-quota-pause-v1';
const readPauses=storage=>{try{const v=JSON.parse(storage.getItem(KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}};
export function nextUtcMidnight(now=Date.now()){const d=new Date(now);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1)}
// detail: the Worker's JSON reply. A 503 that says serverLimit:false is a passing outage (a deploy, a busy moment), not
// the day's limit (Discord 2026-11-16: the notice stayed up all evening while the servers were fine).
export function quotaExhausted(status,message='',detail=null){if(status===503&&typeof detail?.serverLimit==='boolean')return detail.serverLimit;return status===429||status===503||/daily|allowance|exceeded allowed/i.test(String(message||''))}
// A pause lasts 30 to 60 minutes (random, so paused devices do not all return in the same second), or until just after
// the 00:00 UTC reset if that is sooner. On Workers Paid the servers can come back before midnight, so a device tries
// again within the hour instead of staying paused all day (2026-11-16). Each failed try pauses again.
const RECHECK=1800000;
export function pauseForQuota(service,{storage=globalThis.localStorage,now=Date.now(),random=Math.random}={}){
 const until=Math.min(nextUtcMidnight(now)+Math.floor(random()*RECHECK),now+RECHECK+Math.floor(random()*RECHECK));
 try{const all=readPauses(storage);all[service]=until;storage.setItem(KEY,JSON.stringify(all))}catch{}
 return until;
}
export function quotaPausedUntil(service,{storage=globalThis.localStorage,now=Date.now()}={}){
 // A pause saved by older versions (until the next midnight) more than an hour away is dropped: it gets one try now.
 try{const until=Number(readPauses(storage)[service])||0;return until>now&&until-now<=2*RECHECK?until:0}catch{return 0}
}
export function clearQuotaPause(service,{storage=globalThis.localStorage}={}){
 try{const all=readPauses(storage);if(service in all){delete all[service];storage.setItem(KEY,JSON.stringify(all))}}catch{}
}
