import {purchaseCoins} from './counter-audio.js';
import {assetURL} from './startup-assets.js';
import {balancedVolume} from './audio-balance.js';
let volume=()=>0,voiceVolume=()=>0,voice,rerollTimer;
export function setUISoundVolume(read,readVoice=read){volume=read;voiceVolume=readVoice;}
// spoken lines follow the Voice Lines slider; everything else here follows Menu Sounds.
export function playUISound(name,{spoken=false}={}){
 const level=spoken?voiceVolume():volume();
 if(document.hidden||!level)return;
 voice??=new Audio();voice.pause();voice.src=assetURL('assets/sfx/'+(/\.(?:wav|mp3)$/i.test(name)?name:name+'.wav'));
 balancedVolume(voice,level,name==='deck-select'?.5:name==='shop-select'?.8:1);voice.play().catch(()=>{});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopUISounds();});
export function stopUISounds(){clearTimeout(rerollTimer);voice?.pause();}
// The chime is 280 ms; defer only the spending sound, never the game action.
export function playRerollSound(){
 clearTimeout(rerollTimer);if(document.hidden||!volume())return;
 playUISound('inspect-open');
 rerollTimer=setTimeout(()=>{rerollTimer=null;if(!document.hidden&&volume())purchaseCoins();},280);
}
