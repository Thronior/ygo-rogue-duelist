export const EMOTES=['❤️','😜','🍆'];
export const validEmote=emoji=>EMOTES.includes(emoji);
let picker=null,pickerTimer=null;
const bubbles=new Map();
export function showDuelEmote(emoji,own=true){
 if(!validEmote(emoji)||document.hidden||!document.querySelector('.field-wrap'))return;
 const previous=bubbles.get(true);if(previous){clearTimeout(previous.timer);previous.el.remove();}
 const el=document.createElement('div');el.className='duel-emote '+(own?'local':'remote');el.textContent=emoji;el.setAttribute('role','status');el.setAttribute('aria-label',(own?'You: ':'Other player: ')+emoji);const box=document.querySelector('.phases')?.getBoundingClientRect()||document.querySelector('.field-wrap').getBoundingClientRect();el.style.left=(box.left+box.width/2)+'px';el.style.top=(box.top+box.height/2)+'px';document.body.append(el);playEmoteSound(emoji);
 const timer=setTimeout(()=>{el.remove();bubbles.delete(true)},1400);bubbles.set(true,{el,timer});
}
export function closeEmotePicker(){clearTimeout(pickerTimer);picker?.remove();picker=null;}
export function openEmotePicker(send){
 if(picker){closeEmotePicker();return;}
 unlockEmoteSound();picker=document.createElement('div');picker.className='duel-emote-picker';picker.setAttribute('role','group');picker.setAttribute('aria-label','Choose an emote');
 for(const emoji of EMOTES){const b=document.createElement('button');b.textContent=emoji;b.setAttribute('aria-label','Send '+emoji);b.onclick=()=>{closeEmotePicker();send(emoji)};picker.append(b);}
 const cancel=document.createElement('button');cancel.textContent='×';cancel.setAttribute('aria-label','Close emotes');cancel.onclick=closeEmotePicker;picker.append(cancel);document.body.append(picker);pickerTimer=setTimeout(closeEmotePicker,8000);
}
export function clearDuelEmotes(){closeEmotePicker();for(const voice of voices){try{voice.stop()}catch{}}voices.clear();for(const {el,timer} of bubbles.values()){clearTimeout(timer);el.remove()}bubbles.clear();}
globalThis.document?.addEventListener('visibilitychange',()=>{if(document.hidden)clearDuelEmotes()});

let soundVolume=()=>0,audioContext=null;
const voices=new Set();
export function setEmoteVolumeReader(reader){soundVolume=reader;}
function unlockEmoteSound(){try{if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});}catch{}}
function playEmoteSound(emoji){
 const volume=Math.max(0,Math.min(1,Number(soundVolume())||0));if(!volume||document.hidden)return;
 unlockEmoteSound();if(!audioContext||audioContext.state!=='running')return;
 for(const voice of voices){try{voice.stop()}catch{}}voices.clear();
 const notes=emoji==='❤️'?[[523,659,0],[659,784,.12],[784,880,.24]]:emoji==='😜'?[[780,1100,0],[1100,600,.13]]:[[220,440,0],[440,160,.12]];
 for(const [from,to,delay] of notes){const osc=audioContext.createOscillator(),gain=audioContext.createGain(),start=audioContext.currentTime+delay;osc.type='sine';osc.frequency.setValueAtTime(from,start);osc.frequency.exponentialRampToValueAtTime(to,start+.16);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045*volume,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+.19);osc.connect(gain);gain.connect(audioContext.destination);voices.add(osc);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect()};osc.start(start);osc.stop(start+.2);}
}
