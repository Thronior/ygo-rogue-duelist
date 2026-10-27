// Menu screen entrances and button press depth, shared by solo and online screens.
// Opacity and translate only, input is never blocked, and the duel board keeps its own presentation.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// One fade on the screen root plus translate-only settles: fading children separately promotes
// their scrolling content to new layers, which tripled the first-frame cost of a page in profiling.
const settles=[[':scope>header',-8],[':scope>.game-logo',-8],[':scope>.carousel',12]];
function enter(root,progress){
 const quiet=reduced.matches||document.documentElement.classList.contains('performance-mode');
 const list=[root.animate([{opacity:.6},{opacity:1}],{duration:quiet?140:200,easing:'ease-out'})];
 if(!quiet)for(const [selector,y] of settles){const el=root.querySelector(selector);if(el)list.push(el.animate([{translate:`0 ${y}px`},{translate:'0 0'}],{duration:220,easing:'cubic-bezier(.2,.7,.3,1)'}));}
 if(progress)for(const animation of list)animation.currentTime=progress;
 return list;
}
export function mountMenuFeel(app,screenKey){
 let root=null,key=null,running=[];
 new MutationObserver(()=>{
  const next=app.firstElementChild;if(!next||next===root)return;root=next;
  const nextKey=screenKey(next);
  // A re-render during an entrance continues it from its real progress; any other re-render
  // of the same screen stays still.
  const live=nextKey===key?running.filter(a=>a.pending||a.playState==='running'):[];
  const progress=live.length?Math.max(...live.map(a=>a.currentTime||0)):0;
  running.forEach(a=>a.cancel());running=[];
  if(nextKey===key&&!live.length)return;
  key=nextKey;
  if(document.hidden||next.matches('.duel,.loading'))return;
  running=enter(next,progress);
 }).observe(app,{childList:true});
 // A press sinks about 5 px whatever the size: icons clearly, large tiles barely. Measured once per button.
 addEventListener('pointerdown',e=>{
  const button=e.target.closest?.('button');
  if(!button||button.disabled||button.style.getPropertyValue('--press')||button.closest('.duel'))return;
  const r=button.getBoundingClientRect();
  button.style.setProperty('--press',Math.min(.99,Math.max(.95,1-5/Math.max(r.width,r.height,1))).toFixed(3));
 },{capture:true,passive:true});
 // iOS Safari applies :active only when a touch listener exists.
 addEventListener('touchstart',()=>{},{passive:true});
}
