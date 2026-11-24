import {assetURL,originalAssetPath} from './startup-assets.js';
import {audioGains} from './audio-gains.js';
// Master Volume (Settings › Sound, user 2026-11-14) scales everything after the compressor, so every slider below it
// keeps its own balance. Without Web Audio it scales the element volume instead.
let context,master,out,masterLevel=1,silent=false;
export function setMasterVolume(percent){const n=Number(percent);masterLevel=Number.isFinite(n)?Math.max(0,Math.min(1,n/100)):1;if(out)out.gain.value=masterLevel;}
// Muted means really silent (Discord, web app, 2026-11-14: other apps' music stopped although every slider was 0).
// On phones a page that starts audio, even at volume 0, takes over the phone's audio and pauses music or videos
// from other apps. So with Master Volume at 0, or every sound slider at 0, the audio engine is suspended and no
// sound element starts. Where the browser allows it (Safari 16.4+), game sound is "ambient": it mixes with other
// apps' audio and follows the silent switch instead of interrupting.
try{if(globalThis.navigator?.audioSession)navigator.audioSession.type='ambient'}catch{}
export function setAudioSilent(on){silent=!!on;if(silent)context?.suspend().catch(()=>{});else resume();}
const quiet=new WeakSet();
// Sound elements set to 0 (by their slider or Master Volume) never start; videos are muted and unaffected.
if(globalThis.HTMLMediaElement){const elementPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(silent&&!(this instanceof HTMLVideoElement)||quiet.has(this)){this.pause();return Promise.resolve()}return elementPlay.call(this)}}
export function masterOutputLevel(){return out?out.gain.value:masterLevel}
export function audioEngineState(){return context?.state||'none'}
const voices=new WeakMap();
function graph(){
 if(context)return context;
 const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!AudioContext)return null;
 context=new AudioContext();
 master=context.createDynamicsCompressor();
 master.threshold.value=-8;master.knee.value=6;master.ratio.value=8;
 master.attack.value=.003;master.release.value=.18;
 out=context.createGain();out.gain.value=masterLevel;
 master.connect(out);out.connect(context.destination);
 return context;
}
function resume(){if(!silent&&!document.hidden&&context&&context.state!=='running'&&context.state!=='closed')context.resume().catch(()=>{});}
document.addEventListener('visibilitychange',()=>{if(document.hidden)context?.suspend().catch(()=>{});else resume();});
for(const name of ['pointerdown','keydown','touchend'])document.addEventListener(name,resume,{passive:true});
export function resumeBalancedAudio(){resume()}
export function balancedVolume(audio,slider,emphasis=1){
 const original=originalAssetPath(audio.src||audio.currentSrc);
 const path=new URL(original,location.href).pathname;
 const key=Object.keys(audioGains).find(key=>path.endsWith('/'+key));
 const relative=originalPathsKey(path),ready=assetURL(relative);if(ready!==relative&&audio.src!==ready){audio.src=ready;audio.load();}
 const volume=Math.max(0,Math.min(1,Number(slider)||0))*emphasis*(audioGains[key]??1);
 if(volume*masterLevel<=0){quiet.add(audio);if(!audio.paused)audio.pause();return}
 quiet.delete(audio);
 try{
  const ctx=graph();if(!ctx)throw Error('Web Audio unavailable');
  let voice=voices.get(audio);
  if(!voice){
   const source=ctx.createMediaElementSource(audio),gain=ctx.createGain();voice={source,gain,connected:false};voices.set(audio,voice);
   const connect=()=>{if(!voice.connected){source.connect(gain);gain.connect(master);voice.connected=true;}resume();};
   // Disconnect a moment after it stops, not at once: WebKitGTK (the Linux app) fires "ended" when GStreamer has handed
   // over the last data, while a few hundred ms are still buffered on the Web Audio side, so every sound lost its end
   // ("the sounds kind of cut off early", 2026-11-24). A finished element only outputs silence meanwhile; one that
   // starts again stays connected.
   const disconnect=()=>setTimeout(()=>{if((audio.paused||audio.ended)&&voice.connected){source.disconnect();gain.disconnect();voice.connected=false;}},600);
   audio.addEventListener('play',connect);audio.addEventListener('pause',disconnect);audio.addEventListener('ended',disconnect);audio.addEventListener('error',disconnect);if(!audio.paused&&!audio.ended)connect();
  }
  audio.volume=1;voice.gain.gain.value=volume;resume();
 }catch{audio.volume=Math.min(1,volume*masterLevel);}
}

// Decoded effects avoid interrupted HTMLAudio play requests during rapid reel ticks.
const effectBuffers=new Map();
function originalPathsKey(path){const base=new URL('./',location.href).pathname;return path.startsWith(base)?path.slice(base.length):path.replace(/^\//,'');}
// A file this browser cannot decode stays failed: the Linux app's WebKitGTK decodes through GStreamer, and without its
// "good" plugins (WAV, MP3) every sound fails the same way. Retrying would download and decode it again on every play.
// Network failures are not remembered, so they retry.
const undecodable=new Set();
function loadEffect(path,ctx){
 if(!effectBuffers.has(path)){
  const pending=fetch(assetURL(path)).then(r=>{if(!r.ok)throw Error('Audio '+r.status);return r.arrayBuffer()})
   .then(b=>ctx.decodeAudioData(b).catch(e=>{undecodable.add(path);throw e}))
   .catch(e=>{if(!undecodable.has(path))effectBuffers.delete(path);throw e});
  pending.catch(()=>{});effectBuffers.set(path,pending);
 }
 return effectBuffers.get(path);
}
// Boot step 6 (2026-11-24): a sound that cannot load never stops the game from starting (a Linux player's WebKitGTK
// could not decode any, and the start failed with "Decoding failed"); the game runs without those sounds.
// Returns how many could not be decoded and how many could not be downloaded.
export async function preloadSoundEffects(paths){
 const ctx=graph(),result={undecodable:0,failed:0,first:''};if(!ctx)return result;let next=0;
 await Promise.all(Array.from({length:2},async()=>{while(next<paths.length){const path=paths[next++];
  try{await loadEffect(path,ctx)}catch(error){if(undecodable.has(path))result.undecodable++;else result.failed++;result.first||=String(error?.message||error);}}}));
 return result;
}
export function bufferedEffects(paths,volume){
 const ctx=graph(),active=new Map(),versions=new Map();let disposed=false;
 const load=path=>loadEffect(path,ctx);
 if(ctx)for(const path of new Set(Object.values(paths)))load(path).catch(()=>{});
 const stop=key=>{
  versions.set(key,(versions.get(key)||0)+1);
  const voice=active.get(key);if(!voice)return;
  active.delete(key);
  // A 25 ms release avoids the click of cutting a waveform mid-cycle.
  voice.source.onended=()=>{voice.source.disconnect();voice.gain.disconnect()};
  try{const t=ctx.currentTime,level=voice.gain.gain;level.cancelScheduledValues(t);level.setValueAtTime(level.value,t);level.linearRampToValueAtTime(0,t+.025);voice.source.stop(t+.03)}
  catch{voice.source.onended=null;try{voice.source.stop()}catch{}voice.source.disconnect();voice.gain.disconnect()}
 };
 return {
  unlock(){resume()},
  playing(key){return active.has(key)},
  // offset skips a silent lead-in; duration (wall seconds) fades the tail out instead of cutting it.
  play(key,emphasis=1,rate=1,loop=false,{offset=0,duration=0,fade=.08}={}){
   if(disposed||!ctx||silent||!masterLevel||document.hidden||!volume())return;
   stop(key);resume();const version=versions.get(key),path=paths[key];
   load(path).then(buffer=>{
    if(disposed||document.hidden||versions.get(key)!==version)return;
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=loop;source.playbackRate.value=rate;
    const level=Math.max(0,Math.min(1,Number(volume())||0))*emphasis*(audioGains[path]??1);gain.gain.value=level;
    source.connect(gain);gain.connect(master);active.set(key,{source,gain});
    source.onended=()=>{source.disconnect();gain.disconnect();if(active.get(key)?.source===source)active.delete(key)};
    source.start(0,Math.min(Math.max(0,offset),Math.max(0,buffer.duration-.02)));
    if(duration>0&&!loop){const t=ctx.currentTime;gain.gain.setValueAtTime(level,Math.max(t,t+duration-fade));gain.gain.linearRampToValueAtTime(0,t+duration);source.stop(t+duration+.02)}
   }).catch(()=>{});
  },
  stop,
  stopAll(){for(const key of Object.keys(paths))stop(key)},
  destroy(){disposed=true;this.stopAll()}
 };
}
