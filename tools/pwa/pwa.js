import {webStorage,validateSave,storageError} from './pwa-storage.js';
let registration,status='Online play available. Download game files for offline play.',restarting=false,storageFull=false,observer;
const bundled=()=>document.documentElement.dataset.bundledArtwork==='true';
const panel=document.createElement('dialog');panel.id='web-app-settings';
panel.innerHTML=`<h2>Download the app</h2><p><a class="web-android-download" href="https://github.com/Thronior/ygo-rogue-duelist/releases/latest/download/YGO-Rogue-Android.apk" target="_blank" rel="noopener noreferrer">Download for Android (APK)</a></p><p>On iPhone: open this page in Safari, tap Share, then Add to Home Screen and enable Open as Web App.</p><p id="web-status" role="status"></p><progress id="web-progress" hidden></progress><div class="web-actions"><button id="web-restart" hidden>Restart to update</button><button id="web-offline">Download / update offline game</button><button id="web-export">Export save backup</button><button id="web-import">Import save backup</button><button id="web-close">Close</button></div><input id="web-file" type="file" accept=".json,application/json" hidden><p>Keep a backup before clearing browser data or moving devices. Multiplayer needs an internet connection. Updates download in the background and apply when you restart the game.</p>`;
document.body.append(panel);
const report=text=>{status=text;panel.querySelector('#web-status').textContent=text;};
document.addEventListener('click',event=>{
 if(event.target.closest('#web-app-options,[data-web-install]')){report(status);panel.showModal();}
 if(event.target.closest('[data-web-update]'))restart();
});
panel.querySelector('#web-close').onclick=()=>panel.close();
panel.querySelector('#web-restart').onclick=()=>restart();
// Older workers never answer; callers fall back after the timeout.
function ask(worker,type,timeout=2000){
 return new Promise(resolve=>{
  if(!worker)return resolve(null);
  const channel=new MessageChannel(),timer=setTimeout(()=>resolve(null),timeout);
  channel.port1.onmessage=({data})=>{clearTimeout(timer);resolve(data);};
  worker.postMessage({type},[channel.port2]);
 });
}
// The main menu shows a restart button while an update waits; it is never offered inside a duel.
function placeUpdateButton(){
 if(!registration?.waiting){observer?.disconnect();observer=null;return;}
 const menu=document.querySelector('.web-install-menu');
 if(menu&&!menu.parentElement.querySelector('.web-update-ready'))menu.insertAdjacentHTML('afterend','<button class="web-update-ready" data-web-update>Update ready · Restart</button>');
}
function updateReady(){
 report(storageFull?'Update downloaded without offline files (not enough browser storage). Restart the game to apply it.':'Update downloaded. Restart the game to apply it.');
 panel.querySelector('#web-restart').hidden=false;
 if(!observer){observer=new MutationObserver(placeUpdateButton);observer.observe(document.body,{childList:true,subtree:true});}
 placeUpdateButton();
}
function restart(){
 const waiting=registration?.waiting;if(!waiting)return;
 if(document.querySelector('.duel')){report('Finish the duel first, then restart from the main menu.');return;}
 restarting=true;report('Restarting…');waiting.postMessage({type:'SKIP_WAITING'});
 // A worker that cannot switch on request still applies after every game window closes.
 setTimeout(()=>{if(restarting&&registration?.waiting===waiting){restarting=false;report('Close all game windows and reopen to apply the update.');}},5000);
}
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(restarting)location.reload();});
const watched=new WeakSet();
function watch(worker){
 if(!worker||watched.has(worker))return;watched.add(worker);
 const changed=()=>{
  if(worker.state==='installed'){if(registration?.active)updateReady();else report('Offline game is ready.');worker.removeEventListener('statechange',changed);}
  if(worker.state==='redundant'){if(!storageFull)report('Offline download interrupted. Check your connection and available storage, then retry. Downloaded files will be reused.');worker.removeEventListener('statechange',changed);}
 };
 worker.addEventListener('statechange',changed);changed();
}
function use(reg){
 if(!reg||registration===reg)return reg;
 registration=reg;reg.addEventListener('updatefound',()=>watch(reg.installing));return reg;
}
async function describe(){
 if(registration?.waiting)return updateReady();
 if(registration?.installing)return watch(registration.installing);
 if(!registration?.active)return;
 if(bundled()){if(document.documentElement.dataset.offlineReady==='true')report('Offline game is ready.');return;}
 const info=await ask(registration.active,'OFFLINE_STATUS');
 if(!info||info.complete)report('Offline game is ready.');
 else report(info.quota?'Not enough browser storage for offline files. The game runs online and your saves are kept. Free some space, then download again.':'Some offline files are missing. Download again to finish.');
}
async function offline(){
 if(!('serviceWorker' in navigator)||!isSecureContext)throw Error('Offline play needs HTTPS or localhost.');
 report('Downloading game files. Keep this window open…');storageFull=false;
 // Leave headroom for saves. Estimates cannot guarantee the physical free space.
 let estimate;try{estimate=await navigator.storage?.estimate?.();}catch{}
 const available=estimate&&Number.isFinite(estimate.quota)&&Number.isFinite(estimate.usage)?estimate.quota-estimate.usage:null;
 if(available!==null&&available<64*1024*1024)throw Error('Not enough browser storage for offline files and saves. Free some device space first. Export your save before clearing any site data.');
 let bytes=0;try{const r=await fetch('./offline-size.json');if(r.ok)bytes=Number((await r.json()).bytes)||0;}catch{}
 if(available!==null&&bytes&&available<bytes*1.2+64*1024*1024&&!confirm('There may not be enough space for the full offline download and your saves. Already cached files may be reused. Continue downloading?'))return;
 use(await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}));
 if(registration.active&&!registration.installing&&!registration.waiting)await registration.update().catch(()=>{});
 if(bundled()){
  if(registration.waiting){updateReady();return;}
  if(!navigator.serviceWorker.controller)throw Error('Offline worker is still starting. Please retry in a moment.');
  navigator.serviceWorker.controller.postMessage({type:'DOWNLOAD_OFFLINE'});navigator.storage?.persist?.().catch(()=>{});return;
 }
 if(registration.installing)watch(registration.installing);
 else if(registration.waiting)updateReady();
 else if(registration.active){
  const info=await ask(registration.active,'OFFLINE_STATUS');
  if(!info||info.complete)report('Offline game is ready.');
  else{report('Downloading missing offline files…');registration.active.postMessage({type:'DOWNLOAD_OFFLINE'});}
 }
 navigator.storage?.persist?.().catch(()=>{});
}
panel.querySelector('#web-offline').onclick=()=>offline().catch(e=>report(storageError(e)));
navigator.serviceWorker?.addEventListener('message',({data})=>{
 if(data?.type==='CACHE_PROGRESS'){const p=panel.querySelector('#web-progress');p.hidden=false;p.max=data.total;p.value=data.done;report(`Saving offline files: ${data.done} / ${data.total}`);}
 if(data?.type==='CACHE_READY'){
  panel.querySelector('#web-progress').hidden=true;
  if(data.complete===false){report('Most offline files are saved, but the game was updated meanwhile. Reload, then download again to finish.');return;}
  document.documentElement.dataset.offlineReady='true';report(registration?.active&&(registration.waiting||registration.installing)?'Update downloaded. Restart the game to apply it.':'Offline game is ready.');
 }
 if(data?.type==='CACHE_ERROR'){
  panel.querySelector('#web-progress').hidden=true;storageFull=!!data.storage;
  report(data.storage?'Not enough browser storage for offline files. They were removed so your progress can still be saved; the game keeps working online. Free some space, then download again.':'Offline download failed: '+(data.message||'Browser storage is full or unavailable')+'. Retry when connected and storage is available.');
 }
 if(data?.type==='UPDATE_BLOCKED'){
  restarting=false;report('The game is open in another tab or window. Close the others, then restart again.');
  for(const button of document.querySelectorAll('.web-update-ready'))button.textContent='Close other game tabs, then tap again';
 }
});
panel.querySelector('#web-export').onclick=async()=>{try{
 const text=await webStorage.load();validateSave(text);const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='YGO-Rogue-save-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);report('Save backup exported.');
}catch(e){report(storageError(e));}};
panel.querySelector('#web-import').onclick=()=>panel.querySelector('#web-file').click();
panel.querySelector('#web-file').onchange=async event=>{try{
 const file=event.target.files[0];if(!file)return;if(file.size>20*1024*1024)throw Error('Backup is too large.');
 const text=validateSave(await file.text());
 if(!confirm('Replace all three run slots and progress with this backup? The game will reload.'))return;
 await webStorage.store(text);location.reload();
}catch(e){report(storageError(e));}finally{event.target.value='';}};
if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration('./').then(reg=>{use(reg);return describe();}).catch(()=>{});

// Offer offline storage once, only after a genuinely fresh save has booted.
// Existing players retain the manual download option in Settings.
document.addEventListener('game-startup-ready',({detail})=>{
 if(!detail?.newDevice||!('serviceWorker' in navigator)||!isSecureContext)return;
 const key='ygo-offline-offer-seen';
 try{if(localStorage.getItem(key))return;localStorage.setItem(key,'1');}catch{/* The initialized save also prevents repeat offers. */}
 const offer=document.createElement('dialog');offer.id='web-offline-offer';
 offer.innerHTML='<h2>Download game data?</h2><p>Would you like to download data for a smoother experience and offline play?</p><p>Save game files on this device for faster future loading and fewer interruptions. Online modes still need an internet connection.</p><p>You can also download later from Settings.</p><div class="web-actions"><button data-download>Download</button><button data-later>Not now</button></div>';
 document.body.append(offer);
 offer.addEventListener('close',()=>offer.remove(),{once:true});
 offer.querySelector('[data-later]').onclick=()=>offer.close();
 offer.querySelector('[data-download]').onclick=()=>{offer.close();report(status);panel.showModal();offline().catch(e=>report(storageError(e)));};
 offer.showModal();
},{once:true});
