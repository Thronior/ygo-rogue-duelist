// Plain-language reasons when online play fails (user, 2026-11-13). Cloudflare's free plan stops the online servers
// once a daily allowance is used up; players only saw "Failed to fetch". A failure that names the limit says so with
// the 00:00 UTC reset (no countdown: it was not accurate, user 2026-11-15); any other failure asks the rooms server's /status (one small request, only after
// a failure) to tell "servers at their limit" from "you are offline" from "servers not answering".
// Blocked for this device (Discord, 2026-11-23: Windows app, cloud save and Tag never connected; the Workers answered
// the launcher's origin fine): on Workers Paid a server at its limit or in trouble still answers /status with JSON, so a
// /status that never arrives while GitHub does means a firewall, antivirus web filter, VPN or DNS filter on the
// player's side blocks the workers.dev servers. The Windows app connects through msedgewebview2.exe, not the game's exe.
import {nextUtcMidnight} from './quota-pause.js';
const LIMIT=/today's usage limit|exceeded allowed|daily (?:limit|allowance)|allowance|quota/i;
let base=null;
async function endpoint(){if(base)return base;const config=await fetch('./multiplayer-config.json').then(r=>r.json());return base=String(config.signalingUrl||'').replace(/\/$/,'')}
export function resetIn(now=Date.now()){const ms=Math.max(0,nextUtcMidnight(now)-now);return [Math.floor(ms/3600000),Math.max(1,Math.ceil(ms%3600000/60000))]}
export function limitMessage(){return "The online servers have reached today's free usage limit, so online play, cloud saves and global stats are paused. They come back after the daily reset at 00:00 UTC. Your progress on this device is safe."}
export const OFFLINE="You're offline. Online play needs an internet connection.";
export function unreachableMessage(){return "Can't reach the online servers right now. If they have reached today's usage limit, they come back after the daily reset at 00:00 UTC. Your progress on this device is safe."}
export function blockedMessage(desktop=!!globalThis.ShadowDesktop){return desktop
 ?"Your internet works, but this PC can't reach the game's online servers. A firewall, antivirus web protection, VPN or DNS filter is probably blocking them. The Windows app connects through Microsoft Edge WebView2 (msedgewebview2.exe), so allow that program too, not only the game. Your progress on this device is safe."
 :"Your internet works, but this device can't reach the game's online servers. A firewall, antivirus web protection, VPN or DNS filter is probably blocking them. Your progress on this device is safe."}
// One small request, at most once a minute, and only after the rooms server did not answer at all.
let probe=null;
export async function internetWorks({request=fetch,now=Date.now()}={}){
 if(probe&&now-probe.at<60000)return probe.ok;
 const ok=await request('https://api.github.com/',{method:'HEAD',mode:'no-cors',cache:'no-store',signal:AbortSignal.timeout(6000)}).then(()=>true,()=>false);
 probe={at:now,ok};return ok;
}
// The text to show for an online failure; returns the original message when the servers are fine.
export async function explainOnlineError(error){
 const text=String(error?.message||error||'');
 if(error?.serverLimit||LIMIT.test(text))return limitMessage();
 if(globalThis.navigator?.onLine===false)return OFFLINE;
 // Any other failure asks /status: a working server means the original message stands (a room not found, etc.).
 try{
  const r=await fetch((await endpoint())+'/status',{cache:'no-store',signal:AbortSignal.timeout(6000)});
  if(r.ok)return text;
  const body=await r.json().catch(()=>({}));return body.serverLimit?limitMessage():unreachableMessage();
 }catch{
  if(globalThis.navigator?.onLine===false)return OFFLINE;
  return await internetWorks()?blockedMessage():unreachableMessage();
 }
}
// Cloud save restore and other plain fetches: only a failure that never reached a server (fetch's TypeError or a
// timeout) is explained; the game's own messages ("No cloud save matches this code") stand as they are.
export async function explainNetworkError(error){
 return error?.name==='TypeError'||error?.name==='TimeoutError'||error?.name==='AbortError'?await explainOnlineError(error):String(error?.message||error||'');
}
