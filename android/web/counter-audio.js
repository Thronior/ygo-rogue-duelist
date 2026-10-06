import {balancedVolume} from './audio-balance.js';
// Three reusable, short voices across all counters. No audio loops or timers.
const voices=Array.from({length:3},()=>new Audio());
const purchaseVoice=new Audio('assets/sfx/purchase.mp3');
export function purchaseCoins(){const gain=volume();if(!gain||document.hidden)return;purchaseVoice.pause();purchaseVoice.currentTime=0;balancedVolume(purchaseVoice,gain,.65);purchaseVoice.play().catch(()=>{})}
export function stopPurchaseCoins(){purchaseVoice.pause()}
const last=new Map();let volume=()=>0,index=0;
export function configureCounterAudio(readVolume){volume=readVolume}
export function stopCounterAudio(){for(const a of voices)a.pause();last.clear()}
export function counterTick(kind){
 const gain=volume();if(!gain||document.hidden)return;
 const now=performance.now();if(now-(last.get(kind)??-Infinity)<78)return;
 last.set(kind,now);const a=voices[index++%voices.length];a.pause();
 const src='assets/sfx/count-'+kind+'.wav';if(!a.src.endsWith('/'+src))a.src=src;
 a.currentTime=0;balancedVolume(a,gain,.24);a.play().catch(()=>{});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCounterAudio();stopPurchaseCoins()}});
