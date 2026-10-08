import {balancedVolume,bufferedEffects} from './audio-balance.js';
// One preloaded voice per sound; counter ticks never switch sources or reload decoders.
const voices=new Map(['coins','lp-heal','lp-damage','stat-boost','stat-nerf'].map(kind=>{const a=new Audio('assets/sfx/count-'+kind+'.wav');a.preload='auto';return [kind,a]}));
const purchaseVoice=new Audio('assets/sfx/purchase.mp3');purchaseVoice.preload='auto';
let purchaseEffects=null;
export function purchaseCoins(){const gain=volume();if(!gain||document.hidden)return;if(purchaseEffects){purchaseEffects.play('purchase',.85);return}purchaseVoice.pause();purchaseVoice.currentTime=0;balancedVolume(purchaseVoice,gain,.65);purchaseVoice.play().catch(()=>{})}
export function stopPurchaseCoins(){purchaseEffects?.stopAll();purchaseVoice.pause()}
const last=new Map();let volume=()=>0;
export function configureCounterAudio(readVolume){volume=readVolume;if(!purchaseEffects&&(globalThis.AudioContext||globalThis.webkitAudioContext))purchaseEffects=bufferedEffects({purchase:'assets/sfx/purchase.mp3'},()=>volume())}
export function stopCounterAudio(){for(const a of voices.values())a.pause();last.clear()}
export function counterTick(kind){
 const gain=volume();if(!gain||document.hidden)return;
 const now=performance.now();if(now-(last.get(kind)??-Infinity)<78)return;
 last.set(kind,now);const a=voices.get(kind);if(!a)return;a.pause();
 a.currentTime=0;balancedVolume(a,gain,.24);a.play().catch(()=>{});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCounterAudio();stopPurchaseCoins()}});
