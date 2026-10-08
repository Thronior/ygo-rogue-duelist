import {duelBackgroundURL} from './background-assets.js';
// Bounded markup cache: reuse scenery without retaining live DOM or animations.
const artworkCache=new Map();
const polygon=(x,y,r,n=6,offset=0)=>Array.from({length:n},(_,i)=>{const a=(i/n*Math.PI*2)+offset;return `${(x+Math.cos(a)*r).toFixed(1)},${(y+Math.sin(a)*r).toFixed(1)}`}).join(' ');

function draw(stage){
 if(stage.dataset.scene==='duel'){
  if(!stage.querySelector('.duel-tunnel')){
   const video=document.createElement('video');video.className='duel-tunnel';
   video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.autoplay=!paused;video.preload='auto';
   video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-hidden','true');
   video.style.cssText='position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;object-fit:cover;display:block;pointer-events:none';
   video.src=duelBackgroundURL();stage.append(video);
   video.addEventListener('loadeddata',()=>{if(video.isConnected)syncPause()},{once:true});
  }
  syncPause();return;
 }
 const bounds=stage.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
 const W=500*bounds.width/bounds.height,compact=W<500;
 const key=Math.round(W);if(stage.dataset.size===String(key))return;stage.dataset.size=String(key);
 const scene=stage.dataset.scene,cacheKey=scene+':'+key;
 if(artworkCache.has(cacheKey)){stage.innerHTML=artworkCache.get(cacheKey);return;}
 let art='';
 if(scene==='hex'){
  const radius=40,spacing=Math.sqrt(3)*radius;
  for(let col=-1;col<W/(radius*1.5)+1;col++)for(let row=-1;row<500/spacing+1;row++){const x=col*radius*1.5,y=row*spacing+(Math.abs(col)%2)*spacing/2,pts=polygon(x,y,radius),enter=Math.max(0,(col+row)*.07),shade=11+Math.random()*5;art+=`<g class="hex-cell" style="--enter:${enter}s"><polygon class="hex-shade" style="--shade-a:hsl(200 45% ${shade}%);--shade-b:hsl(195 45% ${shade+12}%);--duration:16s;animation-delay:${2+row*.65+col*.25}s" points="${pts}" fill="hsl(200 45% ${shade}%)" fill-opacity="1" stroke="#a4d9e7" stroke-opacity=".16" stroke-width="1"/></g>`;}
 }
 if(scene==='rings'){
  for(const [x,y,r,rev]of [[W*.12,compact?135:255,compact?130:210,false],[W*.88,compact?375:180,compact?115:170,true]]){let marks='';for(let i=0;i<12;i++){const a=i*Math.PI/6;marks+=`<path d="M${x+Math.cos(a)*(r-18)} ${y+Math.sin(a)*(r-18)}L${x+Math.cos(a)*(r-7)} ${y+Math.sin(a)*(r-7)}"/>`;}
   art+=`<g class="turn ${rev?'reverse':''}" fill="none" stroke="currentColor" stroke-opacity=".38"><circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${x}" cy="${y}" r="${r-30}" stroke-dasharray="2 11"/><polygon points="${polygon(x,y,r-42,6)}"/><polygon points="${polygon(x,y,r-42,3,Math.PI/2)}"/>${marks}</g>`;}
  art+='<path class="wave" d="M-100 450 Q100 90 250 360 T900 220" stroke="currentColor" stroke-width="32" stroke-opacity=".06" fill="none"/><path class="wave" style="--delay:-7s" d="M-100 70 Q200 480 400 160 T900 320" stroke="currentColor" stroke-width="18" stroke-opacity=".08" fill="none"/>';
  art+=`<defs><radialGradient id="realm-light"><stop stop-color="#e3b4ff" stop-opacity=".3"/><stop offset="1" stop-color="#ad48ff" stop-opacity="0"/></radialGradient></defs><circle class="pulse" cx="${W*.2}" cy="170" r="180" fill="url(#realm-light)"/><circle class="pulse" style="--delay:-3s" cx="${W*.85}" cy="380" r="180" fill="url(#realm-light)"/>`;
  for(let i=0;i<32;i++)art+=`<circle class="spark" style="--delay:-${i*.29}s;animation-duration:${6+i%6}s" cx="${(i*137)%W}" cy="${400+i%7*20}" r="${.8+i%3*.7}" fill="${i%3?'#d8a7ff':'#fff1bd'}"/>`;
 }
 if(scene==='crystals'){
  art=`<g class="rays" fill="currentColor" fill-opacity=".08"><path d="M${W*.1} 550L15 0H70Z"/><path d="M${W*.9} 550L${W-90} 0H${W-20}Z"/></g>`;
  for(let i=0;i<12;i++){const band=Math.min(140,W*.18),x=i%2?W-20-(i*19)%band:20+(i*23)%band,y=(i*89)%480,r=(compact?6:8)+i%4*3;art+=`<g class="float" style="--delay:-${i*.9}s"><path d="M${x} ${y-r*2}l${r} ${r*2}-${r} ${r*2}-${r}-${r*2}Z" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-opacity=".6"/><path d="M${x-r} ${y}h${r*2}M${x} ${y-r*2}v${r*4}" stroke="currentColor" stroke-opacity=".2"/></g>`;}
 }
 if(scene==='gold'){
  art='<g class="rays" fill="currentColor" fill-opacity=".17">';for(let i=0;i<9;i++)art+=`<path d="M${W/2} 520L${W/2-850+i*200} -100H${W/2-795+i*200}Z"/>`;art+='</g>';
  for(let i=0;i<16;i++){const x=(i*137)%W,y=(i*83)%490,r=i%3+2;art+=`<g class="float" style="--delay:-${i*.6}s"><path class="pulse" style="--delay:-${i*.6}s" d="M${x-r*2} ${y}q${r*2} 0 ${r*2}-${r*2}q0 ${r*2} ${r*2} ${r*2}q-${r*2} 0-${r*2} ${r*2}q0-${r*2}-${r*2}-${r*2}" fill="currentColor"/></g>`;}
 }
 if(scene==='jade'){
  art+='<defs><radialGradient id="collection-mote"><stop stop-color="#bcffe7" stop-opacity=".6"/><stop offset=".4" stop-color="#87e5cc" stop-opacity=".24"/><stop offset="1" stop-color="#87e5cc" stop-opacity="0"/></radialGradient></defs>';
  for(let i=0;i<9;i++)art+=`<circle class="collection-mote" style="--duration:${18+Math.random()*10}s;--delay:-${i*3.7}s;animation-timing-function:linear" cx="${(i*139+40)%W}" cy="${(i*113+60)%500}" r="${12+Math.random()*18}" fill="url(#collection-mote)"/>`;
  for(let side=0;side<3;side++){let lines='';for(let i=0;i<8;i++)lines+=`<path d="M-80 ${310+i*20}C${W*.13} ${60+i*20},${W*.22} ${440+i*12},${W*.49} ${370+i*12}S${W*.85} ${90+i*18},${W+80} ${170+i*16}"/>`;const color=()=>`hsl(${140+Math.random()*150} 65% 70%)`;art+=`<g transform="${side?`rotate(${side*90} ${W/2} 250)`:''}"><g class="wave" style="--delay:-${side*3}s" fill="none" stroke-width="${side?.8:1.2}"><g class="wave-colors" style="--wave-a:${color()};--wave-b:${color()};--wave-c:${color()};--duration:${22+Math.random()*16}s">${lines}</g></g></g>`;}
 }
 if(scene==='embers'){
  art+='<defs><linearGradient id="fire-fill" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#f9a42b" stop-opacity=".7"/><stop offset=".38" stop-color="#e35313" stop-opacity=".65"/><stop offset="1" stop-color="#9d2610" stop-opacity=".12"/></linearGradient><linearGradient id="fire-core" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#ffe487" stop-opacity=".75"/><stop offset="1" stop-color="#ff9d28" stop-opacity=".1"/></linearGradient></defs>';
  for(let i=0;i<Math.ceil(W/60)+2;i++){const x=i*60-20,h=95+Math.random()*105;art+=`<g transform="translate(${x} 520) scale(${.6+Math.random()*.5} ${h/180})"><g class="flame" style="--duration:${1.4+Math.random()*1.8}s;--delay:-${i*.37}s"><path d="M-30 0C-54-30-18-48-25-90C-10-78-13-59-3-54C22-91-25-123 13-180C-1-141 39-130 27-100C61-121 45-145 43-150C77-108 24-74 36-47C45-65 53-61 55-78C67-38 39-16 31 0Z" fill="url(#fire-fill)"/><path d="M-12 0C-32-25-4-40-8-72C7-63 1-46 12-39C25-58 11-71 24-94C22-62 41-44 27-22L17 0Z" fill="url(#fire-core)"/></g></g>`;}
  for(let i=0;i<18;i++)art+=`<path class="spark" style="--delay:-${i*.53}s;animation-duration:${4+i%4}s" d="M${(i*179)%W} ${410+(i*61)%120}l3 -9" stroke="${i%3?'currentColor':'#ffdc9a'}" stroke-width="${i%3+1}"/>`;
 }
 if(scene==='vortex-victory'||scene==='vortex-defeat'){
  // Shared geometry and motion; only the palette changes with the outcome.
  const radius=Math.hypot(W/2,250)*1.2;
  art+=`<g transform="translate(${W/2} 250)"><g class="outcome-orbit">`;
  for(let i=0;i<26;i++)art+=`<g transform="rotate(${i*137.5})"><g class="outcome-card ${i%3===0?'accent':''}" style="--reach:${radius}px;--delay:-${i*28/26}s"><rect x="-16" y="-23" width="32" height="46" rx="2"/><rect x="-12" y="-19" width="24" height="38" rx="1"/></g></g>`;
  art+='</g></g>';
 }
 stage.innerHTML=`<svg class="art" viewBox="0 0 ${W} 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${art}</svg><div class="veil"></div>`;
 if(scene==='crystals'){
  const dots=[[5],[1,9],[1,5,9],[1,3,7,9],[1,3,5,7,9],[1,3,4,6,7,9]];
  stage.insertAdjacentHTML('beforeend',`<div class="dice-space" aria-label="Rotating crystal die"><div class="dice">${dots.map(face=>`<div class="dice-face">${face.map(n=>`<span class="pip" style="grid-area:${Math.ceil(n/3)}/${(n-1)%3+1}"></span>`).join('')}</div>`).join('')}</div></div>`);
 }
 if(scene==='embers')stage.querySelector('.veil').insertAdjacentHTML('beforebegin',`<svg class="lightning-layer" viewBox="0 0 ${W} 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g class="lightning" fill="none" stroke-linejoin="round"><path stroke="#ff421f" stroke-width="14" opacity=".13"/><path stroke="#ff9a53" stroke-width="5" opacity=".45"/><path stroke="#ffe4ab" stroke-width="1.6"/></g></svg>`);
 if(artworkCache.size>=14)artworkCache.delete(artworkCache.keys().next().value);
 artworkCache.set(cacheKey,stage.innerHTML);
}

function strike(){
 if(!root?.isConnected||paused)return;
 const stage=root.querySelector('[data-scene=embers]');if(!stage)return;
 const bolt=stage.querySelector('.lightning');if(!bolt)return;
 const W=stage.querySelector('svg').viewBox.baseVal.width;let x=W*(.12+Math.random()*.76),y=-10,d=`M${x} ${y}`;
 for(let i=0;i<13;i++){
  const px=x,py=y;x=Math.max(8,Math.min(W-8,x+(Math.random()-.5)*W*.24));y+=32+Math.random()*18;d+=`L${x} ${y}`;
  if(i>1&&i<10&&Math.random()<.65){let bx=px,by=py;d+=`M${bx} ${by}`;const direction=Math.random()<.5?-1:1;for(let k=0;k<4;k++){bx+=direction*(10+Math.random()*25);by+=8+Math.random()*18;d+=`L${bx} ${by}`;}d+=`M${x} ${y}`;}
 }
 lightningAnimation?.cancel();for(const path of bolt.children)path.setAttribute('d',d);
 lightningAnimation=bolt.animate([{opacity:0},{opacity:1,offset:.06},{opacity:.3,offset:.18},{opacity:.85,offset:.3},{opacity:0}],{duration:430,fill:'forwards'});
}

let root=null,stage=null,host=null,scene=null,observer=null,lightningAnimation=null,strikeTimer=null,paused=false,drawFrame=0,drawTimer=0,sceneStarted=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function clearBackground(){
 const video=root?.querySelector('video.duel-tunnel');
 if(video){video.pause();video.removeAttribute('src');video.load();}

 cancelAnimationFrame(drawFrame);clearTimeout(drawTimer);drawFrame=drawTimer=0;
 clearInterval(strikeTimer);strikeTimer=null;lightningAnimation?.cancel();lightningAnimation=null;
 observer?.disconnect();observer=null;root?.remove();host?.classList.remove('game-vector-host');
 root=null;stage=null;host=null;scene=null;
}
export function setVectorBackground(target,kind){
 if(kind===scene&&root&&target){
  if(target!==host||!root.isConnected){
   host?.classList.remove('game-vector-host');host=target;host.classList.add('game-vector-host');host.prepend(root);
   // Duel rendering replaces the board DOM. Keep ready artwork and its phase.
   const elapsed=performance.now()-sceneStarted;
   for(const animation of root.getAnimations({subtree:true}))animation.currentTime=elapsed;
  }
  return;
 }
 clearBackground();if(!target||!kind)return;
 host=target;scene=kind;sceneStarted=performance.now();host.classList.add('game-vector-host');
 root=document.createElement('div');root.className='game-vector-background';root.setAttribute('aria-hidden','true');
 stage=document.createElement('div');stage.className='bg-stage';stage.dataset.scene=kind;root.append(stage);host.prepend(root);
 // Let the menu and its solid base colour paint before constructing decorative SVG.
 const current=stage;
 drawFrame=requestAnimationFrame(()=>{drawFrame=0;drawTimer=setTimeout(()=>{
  drawTimer=0;if(stage!==current||!current.isConnected)return;
  draw(current);current.classList.add('ready');
  observer=new ResizeObserver(()=>{if(stage===current)draw(current)});observer.observe(current);
 },0)});
 syncPause();
}
function syncPause(){
 paused=document.hidden||reduced.matches||!!document.querySelector('dialog[open] .inspect,.inspection-modal[open]');root?.classList.toggle('paused',paused);
 const tunnel=root?.querySelector('.duel-tunnel');
 if(tunnel){if(paused)tunnel.pause();else if(tunnel.paused)tunnel.play().catch(()=>{});}
 if(paused){lightningAnimation?.pause();clearInterval(strikeTimer);strikeTimer=null;}
 else {lightningAnimation?.play();if(scene==='embers'&&!strikeTimer)strikeTimer=setInterval(strike,1000);}
}
export function installVectorBackgrounds(app,modal){
 if(!document.querySelector('link[data-vector-backgrounds]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./vector-backgrounds.css?v=duel-video-7',import.meta.url).href;link.dataset.vectorBackgrounds='';document.head.append(link);}
 let frame=0;
 function refresh(){frame=0;
  const reward=[...document.querySelectorAll('dialog[open]')].find(d=>d.matches('.pack-theatre')||d.querySelector('.reward-screen,.reward-tally'));
  const page=app.firstElementChild;let target=reward||page,kind=null;
  if(reward)kind='gold';
  else if(page){
   const runOutcome=page.querySelector('[data-run-outcome]')?.dataset.runOutcome;
   const collectorResult=!page.matches('.draft-pvp')&&page.querySelector('.collector-result');
   if(runOutcome)kind='vortex-'+runOutcome;
   else if(collectorResult){target=collectorResult;kind=collectorResult.classList.contains('triumph')?'vortex-victory':'vortex-defeat';}
   else if(page.matches('.duel'))kind='duel';
   else if(page.matches('.title'))kind='hex';
   else if(page.matches('.boss')||page.querySelector('.boss-banner'))kind='embers';
   else if(page.matches('.character-select-page')||page.querySelector('.char-layout'))kind='crystals';
   else if(page.querySelector('.collection-nav'))kind='jade';
   else if(page.matches('.collector-page'))kind='rings';
  }
  setVectorBackground(target,kind);syncPause();
 }
 function queue(){if(!frame)frame=requestAnimationFrame(refresh)}
 const changes=new MutationObserver(records=>{if(records.some(r=>r.target===app||r.target===document.body||r.target===modal||r.target instanceof HTMLDialogElement))queue()});
 changes.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','class']});
 document.addEventListener('visibilitychange',syncPause);reduced.addEventListener('change',syncPause);
 const suspend=()=>{cancelAnimationFrame(frame);frame=0;changes.disconnect();clearBackground();};
 const resume=()=>{changes.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','class']});queue()};
 window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',resume);queue();
 return ()=>{suspend();document.removeEventListener('visibilitychange',syncPause);reduced.removeEventListener('change',syncPause);window.removeEventListener('pagehide',suspend);window.removeEventListener('pageshow',resume)};
}
