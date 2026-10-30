// Webapp entry point. Before booting, a quick online check compares this copy with the live deployment.
// An offline-download worker keeps serving the old copy on a normal refresh, so a newer version is
// applied first (only changed files download) and the page reloads into it. Offline players skip the check.
import {replayVersion} from './replay-version.js';
const ATTEMPT='ygo-update-attempt';
const say=(status,detail='')=>{const s=document.querySelector('#loading-status'),d=document.querySelector('#loading-count');if(s)s.textContent=status;if(d)d.textContent=detail;};
const session={get(){try{return sessionStorage.getItem(ATTEMPT)}catch{return null}},set(v){try{sessionStorage.setItem(ATTEMPT,v)}catch{/* Without storage the reload guard only lasts this page. */}}};
async function liveVersion(){
 if(navigator.onLine===false)return null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
 try{const r=await fetch('live-version.json?t='+Date.now(),{cache:'no-store',signal:controller.signal});return r.ok?String((await r.json()).version||'')||null:null;}
 catch{return null;}finally{clearTimeout(timer);}
}
const settled=worker=>new Promise(resolve=>{if(!worker||worker.state!=='installing')return resolve();const done=()=>{if(worker.state!=='installing'){worker.removeEventListener('statechange',done);resolve();}};worker.addEventListener('statechange',done);});
const reload=latest=>{session.set(latest);location.reload();return true;};
// Resolves true once the page is reloading into the new version.
async function applyUpdate(latest){
 const registration=await navigator.serviceWorker?.getRegistration('./').catch(()=>null);
 if(!registration)return reload(latest);
 say('Updating to v'+latest+'…','Downloading changed game files…');
 const progress=({data})=>{if(data?.type==='CACHE_PROGRESS')say('Updating to v'+latest+'…',`Checking game files: ${data.done} / ${data.total}`);};
 navigator.serviceWorker.addEventListener('message',progress);
 try{
  await registration.update().catch(()=>{});
  await settled(registration.installing);
  const waiting=registration.waiting;if(!waiting)return false;
  const switched=new Promise(resolve=>{
   const timer=setTimeout(()=>resolve(false),6000);
   navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve(true);},{once:true});
   navigator.serviceWorker.addEventListener('message',({data})=>{if(data?.type==='UPDATE_BLOCKED'){clearTimeout(timer);resolve(false);}});
  });
  waiting.postMessage({type:'SKIP_WAITING'});
  return await switched?reload(latest):false;
 }finally{navigator.serviceWorker.removeEventListener('message',progress);}
}
try{
 const latest=window.ShadowNative?null:await liveVersion();
 // One reload per version and tab, so a deployment still propagating never causes a reload loop.
 // A blocked update (another game tab open) retries on the next refresh.
 if(latest&&latest!==replayVersion&&session.get()!==latest&&await applyUpdate(latest))await new Promise(()=>{});
}catch{/* Booting the current copy always beats blocking the game. */}
say('Preparing the offline campaign…','Checking game files…');
await Promise.all([import('./mobile.js'),import('./pwa.js')]);
