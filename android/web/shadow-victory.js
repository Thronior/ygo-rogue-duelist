import {rewardAudio} from './reward-slot-audio.js';
let current=null;
export function clearShadowVictory(){current?.();current=null;}
export function showShadowVictory(volume=()=>.7){
 clearShadowVictory();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,audio=rewardAudio(volume),el=document.createElement('div');
 el.className='reward-ultra-screen shadow-conquered'+(reduced?' reduced':'');el.setAttribute('role','status');el.setAttribute('popover','manual');
 el.innerHTML='<i class="ultra-beam beam-one"></i><i class="ultra-beam beam-two"></i><i class="ultra-beam beam-three"></i><i class="ultra-beam beam-four"></i><i class="ultra-screen-glow"></i><i class="ultra-confetti-sheet"></i><div class="shadow-victory-banner">You have conquered the shadow realm</div><div class="shadow-victory-seal" aria-hidden="true">★<span>LEVEL 5 COMPLETE</span>★</div>';
 document.body.append(el);try{el.showPopover?.()}catch{}audio.ultra();const done=()=>{clearTimeout(timer);el.remove();audio.destroy();if(current===done)current=null;};const timer=setTimeout(done,reduced?3500:7000);current=done;
}
