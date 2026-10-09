import {webStorage,validateSave} from './pwa-storage.js';
let registration,status='Online play available. Download game files for offline play.';
const panel=document.createElement('dialog');panel.id='web-app-settings';
panel.innerHTML=`<h2>Download the app</h2><p><a class="web-android-download" href="https://github.com/Thronior/ygo-rogue-duelist/releases/latest/download/YGO-Rogue-Android.apk" target="_blank" rel="noopener noreferrer">Download for Android (APK)</a></p><p>On iPhone: open this page in Safari, tap Share, then Add to Home Screen and enable Open as Web App.</p><p id="web-status" role="status"></p><progress id="web-progress" hidden></progress><div class="web-actions"><button id="web-offline">Download / update offline game</button><button id="web-export">Export save backup</button><button id="web-import">Import save backup</button><button id="web-close">Close</button></div><input id="web-file" type="file" accept=".json,application/json" hidden><p>Keep a backup before clearing browser data or moving devices. Multiplayer needs an internet connection. Updates take effect after all game windows are closed.</p>`;
document.body.append(panel);
const report=text=>{status=text;panel.querySelector('#web-status').textContent=text;};
document.addEventListener('click',event=>{if(event.target.closest('#web-app-options,[data-web-install]')){report(status);panel.showModal();}});
panel.querySelector('#web-close').onclick=()=>panel.close();
async function offline(){
 if(!('serviceWorker' in navigator)||!isSecureContext)throw Error('Offline play needs HTTPS or localhost.');
 report('Downloading game files. Keep this window open…');
 registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
 await registration.update();
 if(document.documentElement.dataset.bundledArtwork==='true'){
  if(registration.waiting){report('Update ready. Close all game windows and reopen, then download offline files.');return;}
  navigator.serviceWorker.controller.postMessage({type:'DOWNLOAD_OFFLINE'});navigator.storage?.persist?.().catch(()=>{});return;
 }
 if(registration.waiting)report('Update downloaded. Close all game windows and reopen to apply it.');
 else if(registration.active&&!registration.installing)report('Offline game is ready.');
 registration.addEventListener('updatefound',()=>{
  const worker=registration.installing;worker?.addEventListener('statechange',()=>{
   if(worker.state==='installed')report(navigator.serviceWorker.controller?'Update downloaded. Close all game windows and reopen to apply it.':'Offline game is ready.');
   if(worker.state==='redundant')report('Download failed. Check connection and available storage, then retry.');
  });
 });
 navigator.storage?.persist?.().catch(()=>{});
}
panel.querySelector('#web-offline').onclick=()=>offline().catch(e=>report(e.message));
navigator.serviceWorker?.addEventListener('message',({data})=>{
 if(data?.type==='CACHE_PROGRESS'){const p=panel.querySelector('#web-progress');p.hidden=false;p.max=data.total;p.value=data.done;report(`Saving offline files: ${data.done} / ${data.total}`);}
 if(data?.type==='CACHE_READY'){document.documentElement.dataset.offlineReady='true';panel.querySelector('#web-progress').hidden=true;report('Download complete. Close all game windows and reopen to use the latest offline version.');}
 if(data?.type==='CACHE_ERROR')report('Offline download failed: '+data.message+'. Retry when connected and storage is available.');
});
panel.querySelector('#web-export').onclick=async()=>{try{
 const text=await webStorage.load();validateSave(text);const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='YGO-Rogue-save-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);report('Save backup exported.');
}catch(e){report(e.message);}};
panel.querySelector('#web-import').onclick=()=>panel.querySelector('#web-file').click();
panel.querySelector('#web-file').onchange=async event=>{try{
 const file=event.target.files[0];if(!file)return;if(file.size>20*1024*1024)throw Error('Backup is too large.');
 const text=validateSave(await file.text());
 if(!confirm('Replace all three run slots and progress with this backup? The game will reload.'))return;
 await webStorage.store(text);location.reload();
}catch(e){report(e.message);}finally{event.target.value='';}};
if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration('./').then(reg=>{
 registration=reg;if(reg?.active&&(document.documentElement.dataset.bundledArtwork!=='true'||document.documentElement.dataset.offlineReady==='true'))report('Offline game is ready.');if(reg?.waiting)report('An update is ready. Close all game windows and reopen to apply it.');
}).catch(()=>{});

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
 offer.querySelector('[data-download]').onclick=()=>{offer.close();report(status);panel.showModal();offline().catch(e=>report(e.message));};
 offer.showModal();
},{once:true});
