const KEY='ygo-preload-visuals';
export function preloadVisualPreference(){try{return localStorage.getItem(KEY)}catch{return null}}
export function setPreloadVisualPreference(value){try{localStorage.setItem(KEY,value?'all':'sounds')}catch{}}
// The game's files are already on this device: in the Android APK or a completed offline web cache.
export async function assetsAreLocal(){
 if(window.ShadowNative)return true;
 if(document.documentElement.dataset.offlineReady==='true')return true;
 if(document.documentElement.dataset.bundledArtwork==='true')return false;
 const reg=await navigator.serviceWorker?.getRegistration('./').catch(()=>null);
 // Standalone workers activate only after completing their offline cache.
 return !!reg?.active;
}
export async function chooseStartupPreload(root){
 if(await assetsAreLocal())return true;
 const preference=preloadVisualPreference();if(preference)return preference==='all';
 const choice=document.createElement('section');choice.className='startup-choice';
 choice.innerHTML='<h2>Preload game?</h2><p>Card artwork is ready. Sound effects will always load before you play.</p><p>Preload music, other artwork and backgrounds now for smoother transitions, or load them as needed to start sooner.</p><div class="actions"><button data-all>Preload game</button><button data-sounds>Start sooner</button></div><small>You can change this in Settings.</small>';
 root.append(choice);
 return new Promise(resolve=>{const finish=value=>{setPreloadVisualPreference(value);choice.remove();resolve(value)};choice.querySelector('[data-all]').onclick=()=>finish(true);choice.querySelector('[data-sounds]').onclick=()=>finish(false)});
}
