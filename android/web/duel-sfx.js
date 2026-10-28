import {bufferedEffects} from './audio-balance.js';
// Duel sounds reuse the buffers decoded during startup and may overlap one another.
// Offsets skip each file's silent lead-in so a sound lands with its animation; caps
// fade long tails out instead of cutting them (a 200 ms cut left Destroy nearly silent).
const sfxAssets=new Set(['card-reveal','negation','rare-shimmer','shop-select']);
const names=['activate','addcounter','attack','coinflip','damage','destroyed','diceroll','draw','equip','flip','gainlp','nextturn','phase','playerenter','removecounter','set','shuffle','specialsummon','summon',...sfxAssets];
export const duelSoundPath=name=>(sfxAssets.has(name)?'assets/sfx/':'sound/')+name+'.wav';
// Seconds. Measured lead-ins: damage 0.2, destroyed 0.16, draw 0.32, flip 0.26, addcounter 0.24.
export const duelSoundProfiles={
 activate:{duration:1.6},
 addcounter:{offset:.22,duration:.8},
 attack:{offset:.08,duration:1.1},
 damage:{offset:.2,duration:.85,jitter:.04},
 destroyed:{offset:.15,duration:.75,jitter:.05},
 draw:{offset:.3,duration:.5,jitter:.06},
 equip:{offset:.06,duration:1.1},
 flip:{offset:.26,duration:.5,jitter:.05},
 gainlp:{offset:.06,duration:1.2},
 phase:{jitter:.03},
 removecounter:{duration:.8},
 'rare-shimmer':{duration:.9},
 set:{jitter:.05},
 shuffle:{offset:.1,duration:.9},
 specialsummon:{offset:.06},
 summon:{offset:.1,duration:1.6},
};
// Same loudness scale as the former single-element player: 0.3 is full emphasis.
export const duelSoundEmphasis=gain=>Math.max(.5,Math.min(1,gain/.3));

// What each cue says aloud: [name, gain, {duration, delay, rate}] entries.
export function cueSounds(cue,removal=null){
 if(!cue)return [];
 if(cue.kind==='turn')return [['nextturn',.25]];
 if(cue.kind==='phase')return [['phase',.25]];
 if(cue.kind==='draw')return [['draw',.25]];
 if(cue.kind==='set')return [['set',.25]];
 if(cue.kind==='attack')return [['attack',.4]];
 if(cue.kind==='summon')return [[cue.method==='special'?'specialsummon':cue.method==='flip'?'flip':'summon',.25]];
 if(cue.kind==='flip-reveal'||cue.kind==='flip-hide')return [['flip',.22]];
 if(cue.kind==='reveal')return [['card-reveal',.22]];
 if(cue.kind==='move'){
  if(removal==='destroy')return [['destroyed',.25]];
  if(removal==='tribute')return [['specialsummon',.2,{duration:.45}]];
  return [['flip',.25,cue.to?.location===32?{rate:.88}:{}]];
 }
 if(cue.kind==='lp'){
  if(cue.amount>0)return [['gainlp',.25]];
  // Direct hits keep the sword strike under the impact.
  return cue.directDamage?[['attack',.18,{duration:.5}],['damage',.25]]:[['damage',cue.cost?.15:.22]];
 }
 if(cue.kind==='chain')return cue.stage==='activate'?[['activate',.25]]:cue.stage==='negated'?[['negation',.3]]:[];
 if(cue.kind==='fusion-summon')return [['activate',.25],['specialsummon',.3,{delay:1540}]];
 if(cue.kind==='signature-summon')return [['rare-shimmer',.2]];
 if(cue.kind==='lethal-hit')return [['damage',.3,{rate:.92}]];
 if(cue.kind==='effect-action'){
  if(cue.negated)return [['negation',.3]];
  if(cue.statChange||cue.choice)return [];
  if(/counter/.test(cue.text||''))return [[cue.increase===false?'removecounter':'addcounter',.22]];
  if(cue.text==='Equipped')return [['equip',.22]];
  if(/shuffled|exchanged|reversed/i.test(cue.text||''))return [['shuffle',.25]];
  if(cue.text==='Cards switched')return [['flip',.22]];
  if(/selected/i.test(cue.text||''))return [[cue.random?'card-reveal':'shop-select',.2]];
 }
 return [];
}

// volume() reads the Sound slider (0..1). fallback(name,gain,durationMs) plays one
// sound without Web Audio, where overlap is unavailable.
export function createDuelSounds(volume,fallback=()=>{}){
 const paths=Object.fromEntries(names.map(name=>[name,duelSoundPath(name)]));
 const webAudio=!!(globalThis.AudioContext||globalThis.webkitAudioContext),timers=new Set();
 // Created on first use, after startup has decoded the same files into the shared cache.
 let voices=null;
 function play(name,gain=.3,{duration,delay=0,rate=1}={}){
  if(document.hidden||!volume())return;
  if(delay>0){const timer=setTimeout(()=>{timers.delete(timer);play(name,gain,{duration,rate})},delay);timers.add(timer);return}
  const profile=duelSoundProfiles[name]||{},length=duration??profile.duration??0;
  if(!webAudio||!paths[name])return fallback(name,gain,length*1000);
  voices??=bufferedEffects(paths,volume);
  const jitter=profile.jitter?1+(Math.random()*2-1)*profile.jitter:1;
  voices.play(name,duelSoundEmphasis(gain),rate*jitter,false,{offset:profile.offset||0,duration:length});
 }
 const stopAll=()=>{for(const timer of timers)clearTimeout(timer);timers.clear();voices?.stopAll()};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll()});
 return {play,stopAll,cue(cue,removal){for(const [name,gain,options] of cueSounds(cue,removal))play(name,gain,options)}};
}
