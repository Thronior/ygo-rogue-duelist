import {bufferedEffects} from './audio-balance.js';
// Reuse a bounded voice pool across reward screens; never accumulate audio nodes.
const paths={reel:'assets/sfx/reward-reel.wav',spin:'sound/diceroll.wav',tick:'sound/draw.wav',land:'sound/coin-pickup.wav',ultra:'assets/sfx/pack-rare.mp3',shine:'assets/sfx/rare-shimmer.wav',dingA:'assets/sfx/reward-ding.wav',dingB:'assets/sfx/reward-ding.wav',passA:'assets/sfx/reward-ding.wav',passB:'assets/sfx/reward-ding.wav'};
export function rewardAudio(volume){let lastSpin=-Infinity,lastRare=-Infinity,dingIndex=0,passIndex=0,lastDraw=-Infinity,disposed=false;
 const voices=bufferedEffects(paths,volume);
 const play=(key,gain,rate=1)=>{if(!disposed)voices.play(key,gain,rate,key==='reel')};
 const stop=()=>voices.stopAll();
 const hidden=()=>{if(document.hidden)stop()};document.addEventListener('visibilitychange',hidden);
 return {newRoll(){if(disposed)return;voices.unlock();stop();lastSpin=-Infinity;lastRare=-Infinity;dingIndex=0;passIndex=0;lastDraw=-Infinity},spin(){if(!voices.playing('reel'))play('reel',.3,1.5);const now=performance.now();if(now-lastSpin>250){lastSpin=now;play('spin',.3)}},tick(progress=0){play(passIndex++%2?'passB':'passA',.12,1.5-.4*progress);if(performance.now()-lastDraw>85){lastDraw=performance.now();play('tick',.16,1.12-.24*progress)}},land(){const rare=performance.now()-lastRare<700;play(dingIndex++%2?'dingB':'dingA',rare?.28:.48,[1,1.125,1.25,1.5][(dingIndex-1)%4]);if(!rare)play('land',.23)},ultra(){const now=performance.now();if(now-lastRare<650)return;lastRare=now;voices.stop('land');play('ultra',.5);play('shine',.38)},stopSpin(){voices.stop('spin');voices.stop('reel')},destroy(){disposed=true;voices.destroy();document.removeEventListener('visibilitychange',hidden)}};
}
