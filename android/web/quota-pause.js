// Cloudflare's free plan resets its daily allowances at 00:00 UTC. When a service says it is out (429, 503 or a
// "daily" / "Exceeded allowed rows" error), background traffic to it pauses until just after that reset instead of
// retrying all day. Player-initiated actions may still try. One small localStorage map holds every pause.
const KEY='ygo-quota-pause-v1';
const readPauses=storage=>{try{const v=JSON.parse(storage.getItem(KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}};
export function nextUtcMidnight(now=Date.now()){const d=new Date(now);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1)}
export function quotaExhausted(status,message=''){return status===429||status===503||/daily|allowance|exceeded allowed/i.test(String(message||''))}
// Spread the restart over 30 minutes so every paused device does not return in the same second.
export function pauseForQuota(service,{storage=globalThis.localStorage,now=Date.now(),random=Math.random}={}){
 const until=nextUtcMidnight(now)+Math.floor(random()*1800000);
 try{const all=readPauses(storage);all[service]=until;storage.setItem(KEY,JSON.stringify(all))}catch{}
 return until;
}
export function quotaPausedUntil(service,{storage=globalThis.localStorage,now=Date.now()}={}){
 try{const until=Number(readPauses(storage)[service])||0;return until>now?until:0}catch{return 0}
}
export function clearQuotaPause(service,{storage=globalThis.localStorage}={}){
 try{const all=readPauses(storage);if(service in all){delete all[service];storage.setItem(KEY,JSON.stringify(all))}}catch{}
}
