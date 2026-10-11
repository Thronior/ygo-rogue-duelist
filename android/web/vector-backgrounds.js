// All procedural artwork is exported offline under tools/background-export.
// This runtime only owns a static backdrop and one native video player.
import {backgroundSpec,preloadBackground,setActiveBackground} from './background-assets.js';
let root=null,stage=null,host=null,scene=null,observer=null,video=null,spec=null,simpleMode=false,loadGeneration=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// Check only when a window/scene changes, never on every animation frame.
function coveredByOpaqueWindow(){
 if(!stage)return false;
 const bounds=stage.getBoundingClientRect(),dialogs=[...document.querySelectorAll('dialog[open]')];
 const own=host?.closest('dialog');
 const opaque=color=>{const values=color.match(/[\d.]+/g)||[];return color!=='transparent'&&(values.length===3||Number(values[3])>=.99)};
 for(const dialog of dialogs.slice(own?dialogs.indexOf(own)+1:0)){
  if(dialog===host||dialog.contains(host))continue;
  const style=getComputedStyle(dialog);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)<.99)continue;
  if(dialog.matches(':modal')){const backdrop=getComputedStyle(dialog,'::backdrop');if(Number(backdrop.opacity)>=.99&&opaque(backdrop.backgroundColor))return true;}
  const rect=dialog.getBoundingClientRect();
  if(opaque(style.backgroundColor)&&rect.left<=Math.max(0,bounds.left)+1&&rect.top<=Math.max(0,bounds.top)+1&&rect.right>=Math.min(innerWidth,bounds.right)-1&&rect.bottom>=Math.min(innerHeight,bounds.bottom)-1)return true;
 }
 return false;
}
function paused(){return document.hidden||reduced.matches||!!document.querySelector('dialog[open] .inspect,.inspection-modal[open]')||coveredByOpaqueWindow()}
function syncPause(){if(!video)return;if(paused())video.pause();else if(video.hasAttribute('src')&&video.paused)video.play().catch(()=>{})}
function clearBackground(){
 loadGeneration++;observer?.disconnect();observer=null;
 if(video){video.pause();video.removeAttribute('src');video.load();video=null;}
 setActiveBackground(null);root?.remove();host?.classList.remove('game-vector-host');root=stage=host=scene=spec=null;
}
function resizeVideo(){
 if(!stage||simpleMode)return;const bounds=stage.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
 const next=backgroundSpec(scene,bounds.height>bounds.width);if(!next||next.key===spec?.key)return;
 const previousTime=video?.currentTime||0,hadSource=!!video?.hasAttribute('src');spec=next;setActiveBackground(next.key);const generation=++loadGeneration;
 if(!video){
  video=document.createElement('video');video.className='background-video'+(scene==='duel'?' duel-video duel-spiral':scene==='tunnel'?' duel-video duel-tunnel':'');
  video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';
  video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');
  video.addEventListener('ended',()=>{if(video&&spec?.loopStart){video.currentTime=spec.loopStart;if(!paused())video.play().catch(()=>{})}});
  stage.append(video);
 }
 const player=video;player.loop=!next.loopStart;if(next.poster)player.poster=next.poster;else player.removeAttribute('poster');
 preloadBackground(next).then(url=>{
  if(generation!==loadGeneration||video!==player||!player.isConnected)return;
  player.addEventListener('loadedmetadata',()=>{
   if(generation!==loadGeneration)return;
   if(hadSource&&Number.isFinite(player.duration))player.currentTime=Math.min(Math.max(next.loopStart,previousTime),Math.max(next.loopStart,player.duration-.05));
   syncPause();
  },{once:true});
  player.src=url;syncPause();
 }).catch(()=>{/* The static poster/gradient keeps the screen usable offline. */});
}
export function setVectorBackground(target,kind,simple=false){
 if(kind===scene&&simple===simpleMode&&root&&target){
  if(target!==host||!root.isConnected){host?.classList.remove('game-vector-host');host=target;host.classList.add('game-vector-host');host.prepend(root);}
  return;
 }
 clearBackground();simpleMode=simple;if(!target||!kind)return;
 host=target;scene=kind;host.classList.add('game-vector-host');root=document.createElement('div');root.className='game-vector-background'+(simple?' simple':'');root.setAttribute('aria-hidden','true');
 stage=document.createElement('div');stage.className='bg-stage ready';stage.dataset.scene=kind;root.append(stage);host.prepend(root);
 if(!simple){resizeVideo();observer=new ResizeObserver(resizeVideo);observer.observe(stage);}
}
export function installVectorBackgrounds(app,modal,settings=()=>({})){
 if(!document.querySelector('link[data-vector-backgrounds]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./vector-backgrounds.css?v=all-videos-10',import.meta.url).href;link.dataset.vectorBackgrounds='';document.head.append(link);}
 let frame=0;
 function refresh(){frame=0;
  const preferences=settings(),simple=!!(preferences.simpleBackgrounds||preferences.performanceMode);document.documentElement.classList.toggle('performance-mode',!!preferences.performanceMode);document.documentElement.classList.toggle('simple-backgrounds',simple);
  const reward=[...document.querySelectorAll('dialog[open]')].find(d=>d.matches('.pack-theatre')||d.querySelector('.reward-screen,.reward-tally'));
  const page=app.firstElementChild;let target=reward||page,kind=null;
  if(reward)kind='gold';
  else if(page){
   const runOutcome=page.querySelector('[data-run-outcome]')?.dataset.runOutcome;
   const collectorResult=!page.matches('.draft-pvp')&&page.querySelector('.collector-result');
   if(runOutcome)kind='vortex-'+runOutcome;
   else if(collectorResult){target=collectorResult;kind=collectorResult.classList.contains('triumph')?'vortex-victory':'vortex-defeat';}
   else if(page.matches('.duel'))kind=settings().duelBackground==='tunnel'?'tunnel':'duel';
   else if(page.matches('.title'))kind='hex';
   else if(page.matches('.boss')||page.querySelector('.boss-banner'))kind='embers';
   else if(page.matches('.character-select-page')||page.querySelector('.char-layout'))kind='crystals';
   else if(page.matches('.tutorial-page')||page.querySelector('.collection-nav'))kind='jade';
   else if(page.matches('.collector-page'))kind='rings';
   else if(simple)kind=page.matches('.shop')?'shop':'plain';
  }
  setVectorBackground(target,kind,simple);syncPause();watch();
 }
 function queue(){if(!frame)frame=requestAnimationFrame(refresh)}
 const changes=new MutationObserver(records=>{if(records.some(r=>r.target===app||r.target===document.body||r.target===modal||r.target instanceof HTMLDialogElement))queue()});
 // Only these containers can change the active scene or pause state. Avoid
 // observing every card, animation class and counter update in the document.
 const watch=()=>{changes.disconnect();for(const target of new Set([document.body,app,modal,...document.querySelectorAll('dialog')])){if(target)changes.observe(target,{childList:true,attributes:true,attributeFilter:['open','class','style']});}};watch();
 window.addEventListener('resize',queue);document.addEventListener('duel-background-change',queue);document.addEventListener('visibilitychange',syncPause);reduced.addEventListener('change',syncPause);
 const suspend=()=>{cancelAnimationFrame(frame);frame=0;changes.disconnect();clearBackground()};
 const resume=()=>{watch();queue()};window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',resume);queue();
 return ()=>{suspend();window.removeEventListener('resize',queue);document.removeEventListener('duel-background-change',queue);document.removeEventListener('visibilitychange',syncPause);reduced.removeEventListener('change',syncPause);window.removeEventListener('pagehide',suspend);window.removeEventListener('pageshow',resume)};
}
