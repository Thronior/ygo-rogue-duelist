// Online failures that never reach the servers (Discord, 2026-11-23: Windows app, cloud save and Tag never connected
// although the Workers answer the launcher's origin). online-status.js tells "blocked on this device" (GitHub answers,
// the rooms server does not) from "servers unreachable" and "offline", and names msedgewebview2.exe in the Windows app.
import assert from 'node:assert/strict';
const url=new URL('./web/online-status.js',import.meta.url).href;
let fresh=0;
const load=()=>import(url+'?case='+(++fresh));
const setNavigator=value=>Object.defineProperty(globalThis,'navigator',{value,configurable:true,writable:true});
function network({status,github}){
 const calls=[];
 globalThis.fetch=async(target,options={})=>{
  const href=String(target);calls.push(href);
  if(href.endsWith('multiplayer-config.json'))return {ok:true,json:async()=>({signalingUrl:'https://rooms.example/'})};
  if(href==='https://rooms.example/status'){if(status==='down')throw new TypeError('Failed to fetch');return {ok:status==='ok',status:status==='ok'?200:503,json:async()=>({serverLimit:status==='limit'})}}
  if(href==='https://api.github.com/'){assert.equal(options.mode,'no-cors');assert.equal(options.method,'HEAD');if(!github)throw new TypeError('Failed to fetch');return {ok:false,status:0,type:'opaque'}}
  throw Error('unexpected '+href);
 };
 return calls;
}
setNavigator({onLine:true});
const failed=new TypeError('Failed to fetch');

// Windows app: the rooms server never answers, GitHub does.
{globalThis.ShadowDesktop={launcherBuild:2};network({status:'down',github:true});const m=await load();
 const text=await m.explainOnlineError(failed);
 assert.match(text,/msedgewebview2\.exe/);assert.match(text,/this PC can't reach/);assert.equal(text,m.blockedMessage(true));
 delete globalThis.ShadowDesktop}
// Browser or Android: same failure, no WebView2 hint.
{network({status:'down',github:true});const m=await load();
 const text=await m.explainOnlineError(failed);
 assert.equal(text,m.blockedMessage(false));assert.doesNotMatch(text,/msedgewebview2/)}
// Nothing answers: the old "can't reach the servers" text stays.
{network({status:'down',github:false});const m=await load();assert.equal(await m.explainOnlineError(failed),m.unreachableMessage())}
// The server answers: its own message stands; at its limit: the limit text. GitHub is never asked.
{const calls=network({status:'ok',github:true});const m=await load();
 assert.equal(await m.explainOnlineError(Error('Room not found or expired.')),'Room not found or expired.');
 network({status:'limit',github:true});assert.equal(await m.explainOnlineError(failed),m.limitMessage());
 assert.ok(!calls.includes('https://api.github.com/'))}
// Offline: no requests at all.
{setNavigator({onLine:false});const calls=network({status:'down',github:true});const m=await load();
 assert.equal(await m.explainOnlineError(failed),m.OFFLINE);assert.equal(calls.length,0);setNavigator({onLine:true})}
// The GitHub check runs at most once a minute.
{const calls=network({status:'down',github:true});const m=await load();
 await m.explainOnlineError(failed);await m.explainOnlineError(failed);
 assert.equal(calls.filter(c=>c==='https://api.github.com/').length,1)}
// Cloud save restore: the game's own messages stand without any request; only network failures are explained.
{const calls=network({status:'down',github:true});const m=await load();
 assert.equal(await m.explainNetworkError(Error('No cloud save matches this code. Check it and try again.')),'No cloud save matches this code. Check it and try again.');
 assert.equal(calls.length,0);
 assert.equal(await m.explainNetworkError(failed),m.blockedMessage(false));
 const timeout=new DOMException('The operation timed out.','TimeoutError');network({status:'down',github:false});
 assert.equal(await (await load()).explainNetworkError(timeout),m.unreachableMessage())}
console.log('online blocked checks passed');
