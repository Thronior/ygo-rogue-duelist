import {rewardMarkup,mountRewardSlots} from './reward-slots.js';
// Reuse the card reward reel, timing, sounds and cleanup. Only prize images differ.
function presentation(run){
 const offer=run.reward_slots,source=offer.source||offer.choices;
 return {...run,last_reward_cards:offer.choices.map(d=>source.findIndex(s=>s.opponent===d.opponent&&s.sprite===d.sprite)),reward_slots:{...offer,source:source.map((_,i)=>i)}};
}
export function deckRewardMarkup(run,{esc}){
 return rewardMarkup(presentation(run),{esc}).replace('class="reward-screen','class="reward-screen engine-rewards');
}
export function mountDeckRewards(root,{getRun,reroll,volume,reduced=false}){
 let selected=getRun().reward_slots.choices.length===1?0:null;
 const controller=mountRewardSlots(root,{
  getRun:()=>presentation(getRun()),reroll,volume,reduced,portraitPrize:true,
  image:i=>'assets/'+(getRun().reward_slots.source||getRun().reward_slots.choices)[i].sprite,
  name:()=>'',ultra:()=>false,
  canConfirm:()=>selected!==null,
  onSelect:i=>{selected=i;mark();}
 });
 function mark(){root.querySelectorAll('.reward-slot').forEach((el,i)=>{
  el.classList.toggle('deck-selected',selected===i);
  const button=el.querySelector('.reward-card');button.setAttribute('aria-pressed',String(selected===i));
  if(button.dataset.rewardSelect!==undefined)button.setAttribute('aria-label','Select deck '+(i+1));
 });}
 mark();return {get selected(){return selected},destroy:()=>controller.destroy()};
}
