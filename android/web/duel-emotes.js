import {bufferedEffects} from './audio-balance.js';
export const EMOTES=['❤️','😜','🍆'];
export const validEmote=emoji=>EMOTES.includes(emoji);
let picker=null,pickerTimer=null;
const bubbles=new Map();
function portrait(own){return document.querySelector(own?'.field-character.own':'.field-character:not(.own)')}
const clamp=(value,min,max)=>Math.max(min,Math.min(Math.max(min,max),value));
export function positionDuelEmotes(){
 for(const {el,own,ally} of bubbles.values()){
  const anchor=portrait(own||ally);if(!anchor){el.hidden=true;continue}el.hidden=false;
  const r=anchor.getBoundingClientRect(),size=el.offsetWidth||80,friendly=own||ally;
  el.style.left=clamp(friendly?r.right+size/2+8:r.left-size/2-8,size/2+4,innerWidth-size/2-4)+'px';
  el.style.top=clamp(r.top+r.height/2,size/2+4,innerHeight-size/2-4)+'px';
 }
 if(picker){const anchor=portrait(true);if(!anchor){closeEmotePicker();return}const r=anchor.getBoundingClientRect(),box=picker.getBoundingClientRect();picker.style.left=clamp(r.left,4,innerWidth-box.width-4)+'px';picker.style.top=clamp(r.top-box.height-6,4,innerHeight-box.height-4)+'px';}
}
export function showDuelEmote(emoji,own=true,{ally=false}={}){
 if(!validEmote(emoji)||document.hidden||!document.querySelector('.field-wrap'))return;
 const key=ally?'friendly':own,previous=bubbles.get(key);if(previous){clearTimeout(previous.timer);previous.el.remove();}
 const el=document.createElement('div');el.className='duel-emote '+(own?'local':'remote');el.textContent=emoji;el.setAttribute('role','status');el.setAttribute('aria-label',(own?'You: ':ally?'Teammate: ':'Opponent: ')+emoji);document.body.append(el);playEmoteSound(emoji);
 const timer=setTimeout(()=>{el.remove();if(bubbles.get(key)?.el===el)bubbles.delete(key)},1400);bubbles.set(key,{el,timer,own,ally});positionDuelEmotes();
}
export function closeEmotePicker(){clearTimeout(pickerTimer);picker?.remove();picker=null;}
export function openEmotePicker(send){
 if(picker){closeEmotePicker();return;}
 unlockEmoteSound();picker=document.createElement('div');picker.className='duel-emote-picker';picker.setAttribute('role','group');picker.setAttribute('aria-label','Choose an emote');
 for(const emoji of EMOTES){const b=document.createElement('button');b.textContent=emoji;b.setAttribute('aria-label','Send '+emoji);b.onclick=()=>{closeEmotePicker();send(emoji)};picker.append(b);}
 const cancel=document.createElement('button');cancel.textContent='×';cancel.setAttribute('aria-label','Close emotes');cancel.onclick=closeEmotePicker;picker.append(cancel);document.body.append(picker);pickerTimer=setTimeout(closeEmotePicker,8000);positionDuelEmotes();
}
export function clearDuelEmotes(){closeEmotePicker();emoteAudio?.stopAll();for(const {el,timer} of bubbles.values()){clearTimeout(timer);el.remove()}bubbles.clear();}
globalThis.document?.addEventListener('visibilitychange',()=>{if(document.hidden)clearDuelEmotes()});

let soundVolume=()=>0,emoteAudio=null;
const emotePaths={'❤️':'assets/sfx/emote-heart.mp3','😜':'assets/sfx/emote-tongue.mp3','🍆':'assets/sfx/emote-eggplant.mp3'};
export function setEmoteVolumeReader(reader){soundVolume=reader;}
function unlockEmoteSound(){if(!emoteAudio)emoteAudio=bufferedEffects(emotePaths,()=>soundVolume());emoteAudio.unlock();}
function playEmoteSound(emoji){
 if(!soundVolume()||document.hidden)return;
 unlockEmoteSound();emoteAudio.stopAll();
 // AudioBufferSource playback rate naturally changes both speed and pitch.
 emoteAudio.play(emoji,2.5,emoji==='❤️'?1.5:1);
}

window.addEventListener('resize',positionDuelEmotes);
