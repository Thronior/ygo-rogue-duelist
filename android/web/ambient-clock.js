// One clock for the endless ambient loops (battery, 2026-11-07).
// Any running animation makes the browser redraw the screen on every display refresh (60-120 times a second on
// phones). The loops a player sits and looks at (duel motes, selection rim, shop ultra glow, title drift, LP
// heartbeat, deck warning, pack opening) therefore step on a grid with steps() in mobile.css, so nothing is drawn
// between ticks. A tick is 50 ms of animation time; animation-speed.js slows every element's CSS animation by
// presentationScale (1.2), so on screen a tick lasts 60 ms. Loops on pseudo-elements, which that slowdown does not
// reach, step every 60 ms in their own CSS. Fast movers use half-ticks.
// Loops that start at different moments would still tick on grids of their own; as each stepped endless animation
// starts, this moves its start back by under one tick onto the page's shared on-screen ticks, so every loop changes
// on the same ticks: about 17 redraws a second in all, however many are running. Moving the start back (never
// forward) keeps a loop that has just begun from dropping out of its active phase.
// android/test_idle_animations.mjs checks the CSS side; tools/measure_idle_load.cjs measures the result.
export const TICK=50;
// One tick on screen, in ms of the document timeline.
export const screenTick=()=>TICK*(Number(globalThis.presentationScale)||1);
const stepped=animation=>{
 try{
  const effect=animation.effect;
  return effect?.getComputedTiming?.().iterations===Infinity&&/^step/.test(effect.getKeyframes?.()[0]?.easing||'');
 }catch{return false}
};
// Put one running animation on the shared ticks.
export function snapToClock(animation){
 if(animation?.playState!=='running'||animation.startTime==null)return;
 const tick=screenTick(),snapped=Math.floor(animation.startTime/tick)*tick;
 if(snapped!==animation.startTime)animation.startTime=snapped;
}
// Listen once per document: every stepped endless CSS animation is snapped when it starts (or restarts). This runs
// after animation-speed.js's own animationstart listener, which sets the playback rate first.
export function installAmbientClock(doc=document){
 const onStart=e=>{
  const el=e.target;if(!el?.getAnimations)return;
  const pseudo=e.pseudoElement||'';
  for(const animation of el.getAnimations({subtree:!!pseudo})){
   if(animation.animationName!==e.animationName||animation.effect?.target!==el||(animation.effect.pseudoElement||'')!==pseudo)continue;
   if(stepped(animation))snapToClock(animation);
  }
 };
 doc.addEventListener('animationstart',onStart,true);
 return ()=>doc.removeEventListener('animationstart',onStart,true);
}
