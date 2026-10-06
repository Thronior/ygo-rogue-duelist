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

// Decoded effects avoid interrupted HTMLAudio play requests during rapid reel ticks.
const effectBuffers=new Map();
export function bufferedEffects(paths,volume){
 const ctx=graph(),active=new Map(),versions=new Map();let disposed=false;
 const load=path=>{
  if(!effectBuffers.has(path))effectBuffers.set(path,fetch(path).then(r=>{if(!r.ok)throw Error('Audio '+r.status);return r.arrayBuffer()}).then(b=>ctx.decodeAudioData(b)).catch(e=>{effectBuffers.delete(path);throw e}));
  return effectBuffers.get(path);
 };
 if(ctx)for(const path of new Set(Object.values(paths)))load(path).catch(()=>{});
 const stop=key=>{
  versions.set(key,(versions.get(key)||0)+1);
  const voice=active.get(key);if(!voice)return;
  active.delete(key);voice.source.onended=null;voice.source.stop();voice.source.disconnect();voice.gain.disconnect();
 };
 return {
  unlock(){resume()},
  playing(key){return active.has(key)},
  play(key,emphasis=1,rate=1,loop=false){
   if(disposed||!ctx||document.hidden||!volume())return;
   stop(key);resume();const version=versions.get(key),path=paths[key];
   load(path).then(buffer=>{
    if(disposed||document.hidden||versions.get(key)!==version)return;
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=loop;source.playbackRate.value=rate;
    gain.gain.value=Math.max(0,Math.min(1,Number(volume())||0))*emphasis*(audioGains[path]??1);
    source.connect(gain);gain.connect(master);active.set(key,{source,gain});
    source.onended=()=>{source.disconnect();gain.disconnect();if(active.get(key)?.source===source)active.delete(key)};source.start();
   }).catch(()=>{});
  },
  stop,
  stopAll(){for(const key of Object.keys(paths))stop(key)},
  destroy(){disposed=true;this.stopAll()}
 };
}
