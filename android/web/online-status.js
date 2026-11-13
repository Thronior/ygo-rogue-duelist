// Plain-language reasons when online play fails (user, 2026-11-13). Cloudflare's free plan stops the online servers
// once a daily allowance is used up; players only saw "Failed to fetch". A failure that names the limit says so with
// the time to the 00:00 UTC reset; any other failure asks the rooms server's /status (one small request, only after
// a failure) to tell "servers at their limit" from "you are offline" from "servers not answering".
import {nextUtcMidnight} from './quota-pause.js';
const LIMIT=/today's usage limit|exceeded allowed|daily (?:limit|allowance)|allowance|quota/i;
let base=null;
async function endpoint(){if(base)return base;const config=await fetch('./multiplayer-config.json').then(r=>r.json());return base=String(config.signalingUrl||'').replace(/\/$/,'')}
export function resetIn(now=Date.now()){const ms=Math.max(0,nextUtcMidnight(now)-now);return [Math.floor(ms/3600000),Math.max(1,Math.ceil(ms%3600000/60000))]}
export function limitMessage(now=Date.now()){const [h,m]=resetIn(now);return `The online servers have reached today's free usage limit, so online play, cloud saves and global stats are paused. They come back after the daily reset at 00:00 UTC, in about ${h} h ${m} min. Your progress on this device is safe.`}
export const OFFLINE="You're offline. Online play needs an internet connection.";
export function unreachableMessage(now=Date.now()){const [h,m]=resetIn(now);return `Can't reach the online servers right now. If they have reached today's usage limit, they come back after the daily reset at 00:00 UTC, in about ${h} h ${m} min. Your progress on this device is safe.`}
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
 }catch{return globalThis.navigator?.onLine===false?OFFLINE:unreachableMessage()}
}
