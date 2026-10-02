import {audioGains} from './audio-gains.js';
let context,master;
const voices=new WeakMap();
function graph(){
 if(context)return context;
 const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!AudioContext)return null;
 context=new AudioContext();
 master=context.createDynamicsCompressor();
 master.threshold.value=-8;master.knee.value=6;master.ratio.value=8;
 master.attack.value=.003;master.release.value=.18;
 master.connect(context.destination);
 return context;
}
function resume(){if(!document.hidden&&context&&context.state!=='running'&&context.state!=='closed')context.resume().catch(()=>{});}
document.addEventListener('visibilitychange',()=>{if(document.hidden)context?.suspend().catch(()=>{});else resume();});
for(const name of ['pointerdown','keydown','touchend'])document.addEventListener(name,resume,{passive:true});
export function resumeBalancedAudio(){resume()}
export function balancedVolume(audio,slider,emphasis=1){
 const path=new URL(audio.src||audio.currentSrc,location.href).pathname;
 const key=Object.keys(audioGains).find(key=>path.endsWith('/'+key));
 const volume=Math.max(0,Math.min(1,Number(slider)||0))*emphasis*(audioGains[key]??1);
 try{
  const ctx=graph();if(!ctx)throw Error('Web Audio unavailable');
  let voice=voices.get(audio);
  if(!voice){
   const source=ctx.createMediaElementSource(audio),gain=ctx.createGain();voice={source,gain,connected:false};voices.set(audio,voice);
   const connect=()=>{if(!voice.connected){source.connect(gain);gain.connect(master);voice.connected=true;}resume();};
   const disconnect=()=>{if((audio.paused||audio.ended)&&voice.connected){source.disconnect();gain.disconnect();voice.connected=false;}};
   audio.addEventListener('play',connect);audio.addEventListener('pause',disconnect);audio.addEventListener('ended',disconnect);audio.addEventListener('error',disconnect);if(!audio.paused&&!audio.ended)connect();
  }
  audio.volume=1;voice.gain.gain.value=volume;resume();
 }catch{audio.volume=Math.min(1,volume);}
}
