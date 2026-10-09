import {purchaseCoins} from './counter-audio.js';
import {assetURL} from './startup-assets.js';
import {balancedVolume} from './audio-balance.js';
let volume=()=>0,voice,rerollTimer;
export function setUISoundVolume(read){volume=read;}
export function playUISound(name){
 if(document.hidden||!volume())return;
 voice??=new Audio();voice.pause();voice.src=assetURL('assets/sfx/'+name+'.wav');
 balancedVolume(voice,volume(),name==='deck-select'?.5:name==='shop-select'?.8:1);voice.play().catch(()=>{});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopUISounds();});
export function stopUISounds(){clearTimeout(rerollTimer);voice?.pause();}
// The chime is 280 ms; defer only the spending sound, never the game action.
export function playRerollSound(){
 clearTimeout(rerollTimer);if(document.hidden||!volume())return;
 playUISound('inspect-open');
 rerollTimer=setTimeout(()=>{rerollTimer=null;if(!document.hidden&&volume())purchaseCoins();},280);
}
