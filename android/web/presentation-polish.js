import {counterTick,stopCounterAudio} from './counter-audio.js';
// Finite, shared animation scheduler; detached nodes never retain a frame loop.
const jobs=new Map(), duels=new WeakMap();
let frame=0,shopKey,shopValue;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick(now){
 frame=0;
 for(const [el,j] of jobs){
  if(!el.isConnected){jobs.delete(el);continue}
  const t=Math.min(1,(now-j.start)/j.duration),v=j.from+(j.to-j.from)*(1-(1-t)**3);
  if(j.sound&&Math.round(v)!==Math.round(j.state.value))counterTick(j.sound);
  j.state.value=v;j.paint(v);
  if(t===1)jobs.delete(el);
 }
 if(jobs.size)frame=requestAnimationFrame(tick);else stopCounterAudio();
}
function count(el,state,target,paint,duration=440,sound){
 if(!el)return;
 let previous;for(const [node,j] of jobs)if(j.state===state){previous=j;jobs.delete(node)}
 const from=state.value;
 if(reduced()||from===target){state.value=target;paint(target);return}
 const now=performance.now();if(previous?.to===target)duration=Math.max(1,previous.start+previous.duration-now);
 paint(from);jobs.set(el,{state,from,to:target,paint,start:now,duration,sound});
 if(!frame)frame=requestAnimationFrame(tick);
}
export function polishShop(root,key,gold){
 if(key!==shopKey){shopKey=key;shopValue={value:gold}}
 count(root.querySelector('.shop-balance strong'),shopValue,gold,v=>{const el=root.querySelector('.shop-balance strong');if(el)el.textContent=Math.round(v).toLocaleString()},560,'coins');
}
export function polishDuel(root,owner,s,lookup){
 let d=duels.get(owner);
 if(!d){d={lp:s.lp.map(value=>({value,target:value,max:Math.max(1,value)})),stats:new Map()};duels.set(owner,d)}
 root.querySelectorAll('.life').forEach((el,i)=>{
  const state=d.lp[i],target=s.lp[i],changed=state.target!==target,healed=target>state.value;
  state.max=Math.max(state.max,target);state.target=target;
  count(el,state,target,v=>{el.querySelector('strong').textContent=Math.round(v);el.style.setProperty('--life-fill',Math.max(0,v/state.max))},620,healed?'lp-heal':'lp-damage');
  if(changed&&!reduced()){
   const portrait=root.querySelector(i?'.field-character:not(.own)':'.field-character.own');
   portrait?.animate([{filter:healed?'drop-shadow(0 0 15px #70ffab) brightness(1.5)':'drop-shadow(0 0 15px #ff455e) brightness(1.5)'},{filter:'none'}],{duration:480});
  }
 });
 const live=new Set();
 root.querySelectorAll('.zone[data-code] .power [data-stat]').forEach(el=>{
  const zone=el.closest('.zone'),code=Number(zone.dataset.code),stat=el.dataset.stat,key=zone.dataset.zone+':'+code+':'+stat,target=Number(el.dataset.value);
  const base=Number(lookup(code)?.[stat==='attack'?'atk':'defense']),knownBase=Number.isFinite(base)&&base>=0;
  el.classList.toggle('stat-up',knownBase&&target>base);
  el.classList.toggle('stat-down',knownBase&&target<base);
  live.add(key);let state=d.stats.get(key);
  if(!state){state={value:knownBase?base:target};d.stats.set(key,state)}
  count(el,state,target,v=>el.textContent=Math.round(v),440,target>state.value?'stat-boost':'stat-nerf');
 });
 for(const key of d.stats.keys())if(!live.has(key))d.stats.delete(key);
}
export function duelFinish(winner){
 return new Promise(resolve=>{
  const el=document.createElement('button');el.className='duel-finish '+(winner===0?'won':'lost');
  el.setAttribute('aria-label','Dismiss duel result');el.innerHTML='<strong>'+(winner===0?'VICTORY':winner===1?'DEFEAT':'DRAW')+'</strong><small>Tap to continue</small>';
  let timer;const close=()=>{clearTimeout(timer);el.remove();resolve()};
  el.addEventListener('click',close,{once:true});document.body.append(el);el.focus({preventScroll:true});timer=setTimeout(close,1450);
 });
}

// Finish counters when backgrounded instead of retaining detached views in a suspended RAF.
document.addEventListener('visibilitychange',()=>{if(document.hidden){
 if(frame)cancelAnimationFrame(frame);frame=0;
 for(const [el,j] of jobs){j.state.value=j.to;if(el.isConnected)j.paint(j.to)}
 jobs.clear();stopCounterAudio();
}});
