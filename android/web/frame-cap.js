// Frame rate cap (user, 2026-11-09): never more than 120 frames a second, and lower when the player picks a lower
// cap in Settings (Display, FPS Cap). A page cannot set the display's refresh rate, and the browser draws CSS animations
// on every refresh, so when the display runs faster than the cap the game runs its own clock:
// - every running animation (CSS animations, transitions and element.animate) is paused and moved forward by the
//   real time that passed, only on the cap's ticks, and finished when it reaches its end, so `.finished` and the
//   end events still arrive;
// - requestAnimationFrame callbacks (the menu carousel, counters, effects) run on the same ticks.
// Endless stepped loops (ambient-clock.js) stay with the browser: it moves them on its own drawing thread, about 17
// redraws a second, where moving them from here would cost main-thread style and paint on every step. Instead the
// clock puts a tick on every 60 ms beat of the ambient clock, so their redraws fall on ticks.
// When nothing is moving, the clock's own loop stops, so an idle screen costs what it did without a cap.
// A CSS animation paused by a stylesheet rule (animation-play-state) is held while the rule applies.
// On a display at or below the cap nothing is driven and nothing costs anything. The Android app also asks the
// system for a display mode at or below the cap (ShadowNative.setFrameRateCap), which caps the display itself.
// Scrolling, hover and playing videos are drawn by the browser and are not capped here.
(()=>{
 const MAX=120,MIN=30;
 const nativeRAF=window.requestAnimationFrame.bind(window),nativeCancel=window.cancelAnimationFrame.bind(window);
 const proto=Animation.prototype,nativePause=proto.pause,nativePlay=proto.play,nativeFinish=proto.finish;
 const playStateGetter=Object.getOwnPropertyDescriptor(proto,'playState').get;
 let cap=MAX,refresh=0,active=false,measuring=false,loop=0,lastTick=0,beatStart=-1e9,perBeat=1,nextIndex=0,carry=0;
 // Animations this clock moves: animation -> {held}, held when the game itself paused it.
 const driven=new Map();
 // Game requestAnimationFrame callbacks waiting for the next tick: id -> callback.
 let queue=new Map(),nextId=1e9;

 // New animations to look at on the next frame: from element.animate and play(), and a whole-page look when a CSS
 // animation or transition starts. Animations seen not running (finished ones that keep their end state, ones the
 // game paused) are skipped until the next full look, once a second, so a screen full of finished effects costs nothing.
 const pending=new Set();let sweepSoon=true,ignored=new WeakSet(),lastFullSweep=0;
 // A stepped animation (steps() on every keyframe) shows a new picture only at its step boundaries: the iteration
 // progress values where one could change, mirrored for alternating directions. null when it moves continuously.
 function stepBoundaries(a){
  try{
   const frames=a.effect.getKeyframes(),out=new Set([0,1]);if(frames.length<2)return null;
   for(let i=0;i<frames.length-1;i++){
    const m=/^steps\((\d+)/.exec(frames[i].easing||'');if(!m)return null;
    const from=frames[i].computedOffset,to=frames[i+1].computedOffset,n=+m[1];
    for(let k=0;k<=n;k++)out.add(from+(to-from)*k/n);
   }
   if(/alternate/.test(a.effect.getComputedTiming().direction))for(const b of [...out])out.add(1-b);
   return [...out].sort((x,y)=>x-y);
  }catch{return null}
 }
 let now=0;
 function take(a){
  if(driven.has(a)||ignored.has(a))return;
  if(playStateGetter.call(a)!=='running'||a.timeline!==document.timeline){ignored.add(a);return}
  const timing=a.effect?.getComputedTiming?.();if(!timing){ignored.add(a);return}
  const steps=stepBoundaries(a);
  if(steps&&timing.iterations===Infinity){ignored.add(a);return}
  nativePause.call(a);
  driven.set(a,{at:now,held:false,css:typeof CSSAnimation!=='undefined'&&a instanceof CSSAnimation,end:timing.endTime,delay:timing.delay,duration:Number(timing.duration)||0,steps});
 }
 function adopt(time){
  for(const a of pending)take(a);pending.clear();
  if(time-lastFullSweep>1000){ignored=new WeakSet();sweepSoon=true;lastFullSweep=time}
  if(sweepSoon){sweepSoon=false;for(const a of document.getAnimations())take(a)}
 }
 const ensureLoop=()=>{if(active&&!loop)loop=nativeRAF(frame)};
 const soon=()=>{if(active){sweepSoon=true;ensureLoop()}};
 document.addEventListener('animationstart',soon,true);document.addEventListener('transitionrun',soon,true);
 // A class or style change can start CSS animations. Looking on the next frame, before it is drawn, pauses them
 // before they are ever drawn on their own (document.getAnimations() works out the new styles first).
 const changes=new MutationObserver(soon);
 const animate=Element.prototype.animate;
 Element.prototype.animate=function(...args){const a=animate.apply(this,args);if(active){pending.add(a);ensureLoop()}return a};
 // Whether a stylesheet pauses this CSS animation (animation-play-state).
 function cssPaused(a){
  const target=a.effect?.target;if(!target)return false;
  const style=getComputedStyle(target,a.effect.pseudoElement||null),names=style.animationName.split(','),states=style.animationPlayState.split(',');
  const i=names.findIndex(n=>n.trim()===a.animationName);
  return (states[i<0?0:i%states.length]||'').trim()==='paused';
 }
 // Whether a stepped animation shows a different step at local time `to` than at `from`.
 function stepChanges(entry,from,to){
  const {delay,duration,steps}=entry;if(!(duration>0))return true;
  const p=t=>Math.max(0,t-delay)/duration,a=p(from),b=p(to);if(a===b)return false;
  const lo=Math.min(a,b),hi=Math.max(a,b);if(Math.floor(lo)!==Math.floor(hi))return true;
  const fa=lo-Math.floor(lo),fb=hi-Math.floor(lo);
  for(const x of steps)if(x>fa&&x<=fb)return true;
  return false;
 }
 // Each animation moves by the real time since it was last moved, or since it was taken over (until then it ran
 // on its own). Three passes keep the styles from being worked out more than once: find what has to change, read
 // the stylesheet pauses of those, then move them. A stepped animation is only moved when its picture changes,
 // like the browser itself does, so idle screens stay as cheap as before.
 const due=[];
 function advance(time){
  due.length=0;
  for(const [a,entry] of driven){
   const state=playStateGetter.call(a);
   if(state==='idle'||state==='finished'||!a.effect){driven.delete(a);continue}
   // reverse() and similar calls set a paused animation running again: pause it, the clock moves it.
   if(state==='running')nativePause.call(a);
   if(entry.held){entry.at=time;continue}
   const rate=a.playbackRate,from=a.currentTime||0,to=from+(time-entry.at)*rate;
   if(rate>0&&to>=entry.end||rate<0&&to<=0){due.push(a,entry,to,true);continue}
   if(entry.steps&&!stepChanges(entry,from,to))continue;
   due.push(a,entry,to,false);
  }
  for(let i=0;i<due.length;i+=4)due[i+1].cssHeld=due[i+1].css&&cssPaused(due[i]);
  for(let i=0;i<due.length;i+=4){
   const a=due[i],entry=due[i+1];
   if(entry.cssHeld){entry.at=time;continue}
   entry.at=time;
   if(due[i+3]){driven.delete(a);nativeFinish.call(a)}else a.currentTime=due[i+2];
  }
  due.length=0;
 }
 function release(){for(const [a,entry] of driven){driven.delete(a);if(!entry.held&&playStateGetter.call(a)==='paused')nativePlay.call(a)}}
 function flushQueue(time){const due=queue;queue=new Map();for(const callback of due.values()){try{callback(time)}catch(error){setTimeout(()=>{throw error})}}}
 // Frame gaps seen by the clock's own loop while it runs, to notice a slower display.
 let gaps=[],lastFrame=0;
 function frame(time){
  loop=0;if(!active)return;
  if(lastFrame){gaps.push(time-lastFrame);if(gaps.length>=60){refresh=rateOf(gaps);gaps=[];update();if(!active){lastFrame=0;return}}}lastFrame=time;
  now=time;
  // Ticks are laid out per beat of the ambient clock (60 ms on screen): the first tick of each beat falls on it, the
  // rest share the beat evenly, and the number per beat averages the cap (1.8 at 30: 2, 2, 2, 2, 1). The ambient
  // loops' redraws then fall on ticks. After an idle stretch the first frame ticks at once.
  const beat=50*(Number(globalThis.presentationScale)||1),start=Math.floor(time/beat)*beat;
  if(start!==beatStart){
   const fresh=start-beatStart>beat*1.5;beatStart=start;if(fresh)carry=0;
   carry+=cap*beat/1000;perBeat=Math.max(1,Math.floor(carry));carry-=perBeat;nextIndex=0;
  }
  let due=time-lastTick>beat*1.5;
  while(nextIndex<perBeat&&time>=beatStart+nextIndex*beat/perBeat-1){nextIndex++;due=true}
  // On a tick the game's frame callbacks run first; if they changed the page, it is looked over at once, so
  // animations and transitions they start are taken over before they are ever drawn on their own.
  if(due){lastTick=time;flushQueue(time);if(changes.takeRecords().length)sweepSoon=true;adopt(time);advance(time)}else adopt(time);
  if(driven.size||queue.size||pending.size||sweepSoon)loop=nativeRAF(frame);else lastFrame=0;
 }
 function update(){
  const want=refresh>cap*1.05;
  if(want===active)return;
  active=want;
  if(active){beatStart=-1e9;lastFrame=0;gaps=[];sweepSoon=true;changes.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});ensureLoop()}
  else{changes.disconnect();if(loop)nativeCancel(loop);loop=0;release();const due=queue;queue=new Map();for(const callback of due.values())nativeRAF(callback)}
 }
 // The display's refresh rate from frame gaps: the shortest quarter, since a busy page only makes gaps longer.
 const rateOf=list=>{const sorted=[...list].sort((a,b)=>a-b),gap=sorted[sorted.length>>2];return gap>0?1000/gap:refresh};
 // Measured from 30 native frames at startup, every few seconds while the clock's loop is not running (a window can
 // move to a faster display without any event) and when the window resizes or comes back from the background.
 function measure(){
  if(measuring||document.hidden||loop)return;measuring=true;
  const times=[];
  const step=t=>{times.push(t);if(times.length<31){nativeRAF(step);return}
   measuring=false;refresh=rateOf(times.slice(1).map((t,i)=>t-times[i]));update()};
  nativeRAF(step);
 }
 setInterval(measure,5000);
 let measureTimer=0;const remeasure=()=>{clearTimeout(measureTimer);measureTimer=setTimeout(measure,400)};
 addEventListener('resize',remeasure,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)remeasure()});
 matchMedia('(resolution: 1dppx)').addEventListener?.('change',remeasure);

 window.requestAnimationFrame=function(callback){if(!active)return nativeRAF(callback);const id=++nextId;queue.set(id,callback);ensureLoop();return id};
 window.cancelAnimationFrame=function(id){if(queue.delete(id))return;nativeCancel(id)};
 // The game pausing or playing an animation this clock moves only changes whether the clock moves it.
 proto.pause=function(){const entry=driven.get(this);if(entry){entry.held=true;return}return nativePause.call(this)};
 proto.play=function(){
  const entry=driven.get(this);
  if(entry){entry.held=false;return}
  ignored.delete(this);if(active){pending.add(this);ensureLoop()}
  return nativePlay.call(this);
 };
 proto.finish=function(){driven.delete(this);return nativeFinish.call(this)};
 Object.defineProperty(proto,'playState',{configurable:true,enumerable:true,get(){const entry=driven.get(this);if(entry&&playStateGetter.call(this)==='paused')return entry.held?'paused':'running';return playStateGetter.call(this)}});

 globalThis.frameCap={
  MIN,MAX,
  // A cap from Settings, 30 to 120 frames a second.
  set(value){
   cap=Math.max(MIN,Math.min(MAX,Math.round(Number(value))||MAX));
   try{window.ShadowNative?.setFrameRateCap?.(cap)}catch{}
   update();remeasure();
  },
  get state(){return {cap,refresh:Math.round(refresh),active,driven:driven.size,queued:queue.size,loop:!!loop}},
  // For tests: what the clock is moving.
  debug(){return [...driven].map(([a,e])=>({name:a.animationName||a.transitionProperty||a.id||'animate',held:e.held,cssHeld:!!e.cssHeld,time:Math.round(a.currentTime||0),end:e.end,target:a.effect?.target?.className?.baseVal??a.effect?.target?.className}))},
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',measure,{once:true});else measure();
})();
