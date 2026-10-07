import {counterTick,stopCounterAudio} from './counter-audio.js';
// Finite, shared animation scheduler; detached nodes never retain a frame loop.
const jobs=new Map(), duels=new WeakMap();
let frame=0,shopKey,shopValue;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick(now){
 frame=0;
 for(const [el,j] of jobs){
  if(!el.isConnected){jobs.delete(el);continue}
  if(now-(j.lastPaint||0)<32&&now<j.start+j.duration)continue;
  j.lastPaint=now;
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
 paint(from);jobs.set(el,previous?.to===target?{...previous,paint}:{state,from,to:target,paint,start:now,duration,sound});
 if(!frame)frame=requestAnimationFrame(tick);
}
export function polishShop(root,key,gold){
 if(key!==shopKey){shopKey=key;shopValue={value:gold}}
 count(root.querySelector('.shop-balance strong'),shopValue,gold,v=>{const el=root.querySelector('.shop-balance strong');if(el)el.textContent=Math.round(v).toLocaleString()},560,'coins');
}
export function polishDuel(root,owner,s,lookup){
 let d=duels.get(owner);const fresh=!d||d.duel!==owner.presentationDuel;
 if(!d||d.duel!==owner.presentationDuel){if(d)for(const [el,j] of jobs)if(d.lp.includes(j.state)||[...d.stats.values()].includes(j.state))jobs.delete(el);d={duel:owner.presentationDuel,lp:s.lp.map(value=>({value,target:value,max:Math.max(1,value)})),stats:new Map()};duels.set(owner,d)}
 root.querySelectorAll('.life').forEach((el,i)=>{
  const state=d.lp[i],target=s.lp[i],changed=state.target!==target,healed=target>state.value;
  state.max=Math.max(state.max,target);state.target=target;
  const number=el.querySelector('strong');
  let meter=el.querySelector('.life-meter');if(!meter){meter=document.createElement('span');meter.className='life-meter';meter.setAttribute('aria-hidden','true');el.prepend(meter);el.classList.add('has-life-meter')}
  const from=Math.max(0,state.value/state.max),to=Math.max(0,target/state.max);
  count(el,state,target,v=>{const text=String(Math.round(v));if(number.textContent!==text)number.textContent=text},620,healed?'lp-heal':'lp-damage');
  // Keep the bar on the compositor: no inherited CSS variable updates per frame.
  if(fresh||changed||!meter.dataset.target){
   meter.getAnimations().forEach(a=>a.cancel());meter.style.transform=`scaleX(${to})`;meter.dataset.target=String(target);
   const job=jobs.get(el),remaining=job?Math.max(0,job.start+job.duration-performance.now()):0;
   if(!reduced()&&from!==to&&remaining)meter.animate([{transform:`scaleX(${from})`},{transform:`scaleX(${to})`}],{duration:remaining,easing:'cubic-bezier(.22,.61,.36,1)'});
  }
  if(changed&&!reduced()){
   const portrait=root.querySelector(i?'.field-character:not(.own)':'.field-character.own');
   portrait?.animate([{opacity:.65},{opacity:1}],{duration:480});
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
  count(el,state,target,v=>el.textContent=Math.round(v),130,target>state.value?'stat-boost':'stat-nerf');
 });
 for(const key of d.stats.keys())if(!live.has(key))d.stats.delete(key);
}
export async function duelFinish(winner,reason=0,settled=Promise.resolve()){await settled;}

// Finish counters when backgrounded instead of retaining detached views in a suspended RAF.
document.addEventListener('visibilitychange',()=>{if(document.hidden){
 if(frame)cancelAnimationFrame(frame);frame=0;
 for(const [el,j] of jobs){j.state.value=j.to;if(el.isConnected)j.paint(j.to)}
 jobs.clear();stopCounterAudio();
}});
