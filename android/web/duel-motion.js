// Duel motion effects. Helpers own their overlay nodes and remove them when finished.
// Only transform and opacity animate, so the Android WebView stays on the compositor.
// Callers decide what blocks the duel: helpers never wait on game state.
// Compatibility mode (on by default in Firefox) keeps its v0.1.93 rule: added effects never
// move board elements, which sit in the field's 3D perspective, and use no filters. What
// remains are body-level overlays that fade and scale, as the original removal effect did.
const compatMode=()=>document.documentElement.classList.contains('compatibility-mode');
const boardStill=reduced=>reduced||compatMode();
export const motionPreferences=()=>{const compat=compatMode();return {reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,lite:compat||document.documentElement.classList.contains('performance-mode'),compat}};
// animation-speed.js slows every animation; wallMs keeps an effect inside a fixed duel window.
export const wallMs=ms=>ms/(globalThis.presentationScale||1);
const ATTRIBUTE_COLORS={1:'#d9b36c',2:'#62bcff',4:'#ff7a45',8:'#7fe08d',16:'#ffe28a',32:'#b884ff',64:'#ffd65b'};
export const attributeColor=attribute=>ATTRIBUTE_COLORS[Number(attribute)]||'#ffeeb9';
// Card-frame colours: Spell green, Trap rose, Monster effect amber.
export const activationColor=type=>Number(type)&2?'#3fd6a0':Number(type)&4?'#ef6aa8':'#ffb54d';

function overlay(rect,className,html=''){
 const el=document.createElement('div');el.className='duel-fx '+className;el.setAttribute('aria-hidden','true');
 Object.assign(el.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
 if(html)el.innerHTML=html;document.body.append(el);return el;
}
// Animate a temporary node, then remove it.
function transient(el,frames,options){const a=el.animate(frames,options);a.finished.catch(()=>{}).finally(()=>el.remove());return a}
const settled=animations=>Promise.all(animations.filter(Boolean).map(a=>a.finished.catch(()=>{}))).then(()=>{});
const visible=el=>{if(!el?.isConnected)return null;const r=el.getBoundingClientRect();return r.width&&r.height?r:null};
// Hand rows are wide containers; their cards give the landing size.
function cardBox(el){
 const r=el.getBoundingClientRect(),card=el.matches('.hand,.enemy-hand')?el.querySelector('button,img,.card-back')?.getBoundingClientRect():null;
 const box=card?.width?card:r,height=Math.min(box.height,box.width/.685);
 return height>20&&height<260?{width:height*.685,height}:{width:44,height:64};
}
const point=(r)=>({x:r.left+r.width/2,y:r.top+r.height/2});

// A card flight between two board anchors, on a shallow arc from the source card's size
// to the target's. hold delays departure within the same duration (destroyed cards
// shatter first). turn/endScale keep a card sideways from the start when it lands in
// Defense Position (zones show those at 90° and 0.85). simple: a straight, untilted
// flight (reduced motion, compatibility mode). The caller removes the returned node.
export function cardFlight(from,to,{src,duration,hold=0,turn=0,endScale=1,reduced=false,simple=false}){
 const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),start=cardBox(from),end=cardBox(to),p=point(a),q=point(b);
 const el=document.createElement('img');el.className='moving-card';el.src=src;el.alt='';
 Object.assign(el.style,{left:p.x-start.width/2+'px',top:p.y-start.height/2+'px',width:start.width+'px',height:start.height+'px'});
 document.body.append(el);
 const dx=q.x-p.x,dy=q.y-p.y,distance=Math.hypot(dx,dy),scale=end.height/start.height*endScale;
 const frames=[];
 if(reduced||simple||distance<8)frames.push({transform:`translate(0,0) rotate(${turn}deg)`,opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${turn}deg) scale(${scale})`,opacity:1});
 else{
  // Quadratic arc lifted toward the top of the screen; a slight tilt follows the travel.
  const lift=Math.min(38,distance*.16),tilt=Math.max(-7,Math.min(7,dx/40));
  for(let i=0;i<=6;i++){
   const t=i/6,x=dx*t,y=dy*t-4*lift*t*(1-t),s=1+(scale-1)*t+.08*Math.sin(Math.PI*t);
   frames.push({transform:`translate(${x}px,${y}px) rotate(${turn+tilt*Math.sin(Math.PI*t)}deg) scale(${s})`,opacity:1,offset:hold+(1-hold)*t});
  }
  frames.at(-1).opacity=.92;
  if(hold>0)frames.unshift({transform:`translate(0,0) rotate(${turn}deg) scale(.86)`,opacity:0,offset:0},{transform:`translate(0,0) rotate(${turn}deg) scale(.86)`,opacity:0,offset:hold*.75});
 }
 const animation=el.animate(frames,{duration,easing:reduced||simple?'linear':'cubic-bezier(.33,.72,.32,1)',fill:'forwards'});
 return {el,animation};
}

// A short settle where a card lands on a pile or zone.
export function landingPulse(target,{reduced=false,color='#fff1ae'}={}){
 const r=visible(target);if(!r||reduced)return null;
 const el=overlay(r,'land-ring');el.style.setProperty('--fx-color',color);
 return transient(el,[{opacity:.85,transform:'scale(.9)'},{opacity:0,transform:'scale(1.14)'}],{duration:260,easing:'ease-out'});
}

const SHARDS=[[[0,0],[56,0]],[[56,0],[100,0],[100,34]],[[100,34],[100,100],[70,100]],[[70,100],[30,100]],[[30,100],[0,100],[0,62]],[[0,62],[0,0]]];
// Hides a zone's own image while an effect stands in for it. The caller cancels the
// returned animation when the cue ends, before the zone is redrawn.
const hideImage=img=>img?img.animate([{opacity:1},{opacity:0}],{duration:60,fill:'forwards'}):null;

// Destroyed: the card splits into shards that burst from an impact point and fade.
// Returns {animations, hide}; hide is the zone image's fade (see hideImage).
export function shatterCard(zone,{reduced=false,lite=false}={}){
 const r=visible(zone),img=zone?.querySelector(':scope>img');if(!r)return {animations:[],hide:null};
 const animations=[],src=img?.currentSrc||img?.src;
 const flash=overlay(r,'shatter-flash');
 animations.push(transient(flash,[{opacity:0,transform:'scale(.75)'},{opacity:1,transform:'scale(1.05)',offset:.18},{opacity:0,transform:'scale(1.35)'}],{duration:300,easing:'ease-out'}));
 if(!src||boardStill(reduced))return {animations,hide:null};
 const box=overlay(r,'shatter'),card=document.createElement('div');card.className='shatter-card'+(zone.classList.contains('defense')?' defense':'');box.append(card);
 const impact=[48,42];
 for(const [i,points] of SHARDS.entries()){
  const shard=document.createElement('i'),poly=[...points,impact];
  shard.style.clipPath=`polygon(${poly.map(([x,y])=>x+'% '+y+'%').join(',')})`;shard.style.backgroundImage=`url("${src}")`;card.append(shard);
  const cx=poly.reduce((s,p)=>s+p[0],0)/poly.length-impact[0],cy=poly.reduce((s,p)=>s+p[1],0)/poly.length-impact[1],length=Math.hypot(cx,cy)||1;
  const push=r.width*(lite?.45:.62),dx=cx/length*push,dy=cy/length*push+r.height*.12,spin=(i%2?1:-1)*(14+i*5);
  animations.push(shard.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:`translate(${dx*.35}px,${dy*.2}px) rotate(${spin*.3}deg)`,opacity:1,offset:.25},{transform:`translate(${dx}px,${dy}px) rotate(${spin}deg)`,opacity:0}],{duration:440,easing:'cubic-bezier(.2,.65,.35,1)',fill:'forwards'}));
 }
 settled(animations).then(()=>box.remove());
 return {animations,hide:hideImage(img)};
}

// Tributed: the card lifts away in light, leaving a few rising motes.
export function tributeRise(zone,{reduced=false,lite=false}={}){
 const r=visible(zone),img=zone?.querySelector(':scope>img');if(!r)return {animations:[],hide:null};
 const src=img?.currentSrc||img?.src,el=overlay(r,'tribute-rise',lite?'':'<i></i><i></i><i></i><i></i>');
 if(src){const ghost=document.createElement('img');ghost.src=src;ghost.alt='';if(zone.classList.contains('defense'))ghost.className='defense';el.prepend(ghost)}
 const animation=transient(el,reduced?[{opacity:1},{opacity:0}]:[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:.95,transform:'translateY(-6px) scale(1.04)',offset:.3},{opacity:0,transform:'translateY(-22px) scale(1.1)'}],{duration:420,easing:'ease-out'});
 return {animations:[animation],hide:src?hideImage(img):null};
}

// Summon impacts. method: normal | special | flip | set | position. The zone keeps its own
// image; rings and pillars are overlays so a re-render never cuts them short.
export function summonImpact(zone,{method='normal',color='#ffeeb9',reduced=false,lite=false,animateCard=true}={}){
 const r=visible(zone),img=zone?.querySelector(':scope>img');if(!r)return [];
 const animations=[];
 const ring=overlay(r,'summon-ring'+(method==='set'?' set':''));ring.style.setProperty('--fx-color',color);
 animations.push(transient(ring,reduced?[{opacity:.8},{opacity:0}]:[{opacity:.95,transform:'scale(.72)'},{opacity:0,transform:`scale(${method==='set'?1.18:1.55})`}],{duration:method==='set'?300:460,easing:'cubic-bezier(.15,.7,.3,1)'}));
 if(method==='special'&&!lite){
  const pillar=overlay(r,'summon-pillar');pillar.style.setProperty('--fx-color',color);
  animations.push(transient(pillar,reduced?[{opacity:.7},{opacity:0}]:[{opacity:0,transform:'scaleY(.15)'},{opacity:.9,transform:'scaleY(1)',offset:.35},{opacity:0,transform:'scaleY(1.05)'}],{duration:560,easing:'ease-out'}));
 }
 if(method==='normal'&&!lite&&!reduced){
  const dust=overlay(r,'summon-dust','<i></i><i></i><i></i><i></i><i></i><i></i>');
  animations.push(transient(dust,[{opacity:0},{opacity:1,offset:.25},{opacity:0}],{duration:520,easing:'ease-out'}));
 }
 if(img&&animateCard&&!boardStill(reduced)){
  const frames={normal:[{scale:'1.24',opacity:.35},{scale:'.96',opacity:1,offset:.55},{scale:'1',opacity:1}],special:[{scale:'.55',opacity:0},{scale:'1.07',opacity:1,offset:.6},{scale:'1',opacity:1}],flip:[{rotate:'y 90deg'},{rotate:'y 0deg'}],set:[{translate:'0 -7px',scale:'1.12',opacity:.4},{translate:'0 0',scale:'1',opacity:1}]}[method];
  if(frames)animations.push(img.animate(frames,{duration:method==='special'?340:method==='set'?200:240,easing:'cubic-bezier(.3,.6,.25,1)'}));
 }
 return animations;
}

// Face-down to face-up: turn the card edge-on, swap the art, turn back.
export function flipCard(img,src,{reduced=false}={}){
 if(!img)return Promise.resolve();
 // Records where a running flip ends, so a later flip back is not skipped mid-turn.
 img.dataset.flipTo=src;
 if(boardStill(reduced)||!img.isConnected){img.src=src;return Promise.resolve()}
 const first=img.animate([{rotate:'y 0deg'},{rotate:'y 90deg'}],{duration:110,easing:'ease-in'});
 return first.finished.then(()=>{img.src=src;return img.animate([{rotate:'y -90deg'},{rotate:'y 0deg'}],{duration:130,easing:'ease-out'}).finished}).catch(()=>{img.src=src});
}

// Attack: the attacker winds up, lunges part-way to the target and recoils; the target
// takes the hit at the lunge's peak. duration matches the attack cue's own highlight.
export function attackStrike(source,target,{duration,reduced=false,lite=false}){
 const a=visible(source),b=visible(target);if(!a||!b||reduced)return [];
 const p=point(a),q=point(b),dx=q.x-p.x,dy=q.y-p.y,distance=Math.hypot(dx,dy)||1,reach=Math.min(.42,Math.max(.18,70/distance));
 const img=source.querySelector(':scope>img')||source,animations=[],still=compatMode();
 if(!still)animations.push(img.animate([{translate:'0 0',scale:'1'},{translate:`${-dx/distance*6}px ${-dy/distance*6}px`,scale:'1.03',offset:.24},{translate:`${dx*reach}px ${dy*reach}px`,scale:'1.1',offset:.56},{translate:`${dx*reach*.85}px ${dy*reach*.85}px`,scale:'1.08',offset:.66},{translate:'0 0',scale:'1'}],{duration,easing:'cubic-bezier(.45,0,.25,1)'}));
 const delay=duration*.54;
 const burst=overlay(b,'impact-burst',lite?'':'<i></i><i></i><i></i><i></i><i></i>');
 animations.push(transient(burst,[{opacity:0,transform:'scale(.5)'},{opacity:1,transform:'scale(1)',offset:.2},{opacity:0,transform:'scale(1.3)'}],{duration:320,delay,easing:'ease-out',fill:'backwards'}));
 if(!still)animations.push(target.animate([{translate:'0 0'},{translate:'-4px 2px',offset:.25},{translate:'4px -2px',offset:.5},{translate:'-2px 1px',offset:.75},{translate:'0 0'}],{duration:200,delay,easing:'ease-out'}));
 return animations;
}

// Whole-board shake for heavy hits.
export function shake(el,{strength=3,duration=240}={}){
 if(!el)return null;const s=strength;
 return el.animate([{transform:'translate3d(0,0,0)'},{transform:`translate3d(${-s}px,${s/3}px,0)`},{transform:`translate3d(${s}px,${-s*2/3}px,0)`},{transform:`translate3d(${-s*2/3}px,${s/3}px,0)`},{transform:'translate3d(0,0,0)'}],{duration,easing:'ease-out'});
}

// LP change: a flash over the life bar and a glow at that player's edge of the field.
export function lifeImpact(life,field,{player,heal=false,heavy=false,reduced=false,lite=false}){
 const animations=[],r=visible(life);
 if(r){const flash=overlay(r,'life-flash'+(heal?' heal':''));animations.push(transient(flash,heal?[{opacity:0,transform:'translateX(-60%)'},{opacity:.85,offset:.4},{opacity:0,transform:'translateX(60%)'}]:[{opacity:.9},{opacity:0}],{duration:heal?520:380,easing:'ease-out'}))}
 const f=visible(field);
 if(f&&!lite){
  const edge=overlay(f,'life-edge '+(player===1?'enemy':'own')+(heal?' heal':''));
  animations.push(transient(edge,[{opacity:0},{opacity:heavy?1:.75,offset:.22},{opacity:0}],{duration:heavy?620:460,easing:'ease-out'}));
 }
 return animations;
}

// Chain links stay on their card until they resolve or the chain ends. A lone activation
// keeps its number hidden (quiet); revealChainLinks shows them once something chains.
const popBadge=(badge,reduced)=>boardStill(reduced)?null:badge.animate([{opacity:0,transform:'scale(1.9)'},{opacity:1,transform:'scale(.92)',offset:.6},{opacity:1,transform:'scale(1)'}],{duration:260,easing:'ease-out'});
export function showChainLink(anchor,link,{color,quiet=false,reduced=false,lite=false}){
 const animations=[],r=visible(anchor);if(!r)return animations;
 anchor.querySelectorAll(`:scope>.chain-link-badge[data-link="${link}"]`).forEach(el=>el.remove());
 const badge=document.createElement('span');badge.className='chain-link-badge'+(quiet?' quiet':'');badge.dataset.link=String(link);badge.textContent=String(link);badge.style.setProperty('--fx-color',color);anchor.append(badge);
 if(!quiet)animations.push(popBadge(badge,reduced));
 const flare=overlay(r,'activation-flare',lite?'':'<i></i>');flare.style.setProperty('--fx-color',color);
 animations.push(transient(flare,reduced?[{opacity:.9},{opacity:0}]:[{opacity:0,transform:'scale(.92)'},{opacity:1,transform:'scale(1.02)',offset:.25},{opacity:0,transform:'scale(1.22)'}],{duration:480,easing:'ease-out'}));
 return animations;
}
export function revealChainLinks(root,{reduced=false}={}){
 for(const badge of root.querySelectorAll('.chain-link-badge.quiet')){badge.classList.remove('quiet');popBadge(badge,reduced)}
}
export function resolveChainLink(root,link,{negated=false,reduced=false}={}){
 for(const badge of root.querySelectorAll(`.chain-link-badge[data-link="${link}"]`)){
  badge.classList.add(negated?'negated':'resolving');
  transient(badge,boardStill(reduced)?[{opacity:1},{opacity:0}]:negated?[{opacity:1,transform:'scale(1) rotate(0deg)'},{opacity:1,transform:'scale(1.15) rotate(-12deg)',offset:.3},{opacity:0,transform:'scale(.6) rotate(20deg)'}]:[{opacity:1,transform:'scale(1)'},{opacity:1,transform:'scale(1.35)',offset:.35},{opacity:0,transform:'scale(1.7)'}],{duration:340,easing:'ease-out',fill:'forwards'});
 }
}
export function clearChainLinks(root){root.querySelectorAll('.chain-link-badge:not(.resolving):not(.negated)').forEach(el=>el.remove())}

// A red cross struck through a negated card.
export function negationSlash(anchor,{reduced=false}={}){
 const r=visible(anchor);if(!r)return null;
 const el=overlay(r,'negation-slash','<i></i><i></i>');
 return transient(el,reduced?[{opacity:1},{opacity:0}]:[{opacity:0,transform:'scale(1.3)'},{opacity:1,transform:'scale(1)',offset:.25},{opacity:1,offset:.7},{opacity:0,transform:'scale(.96)'}],{duration:520,easing:'ease-out'});
}

// Target selection: brackets close in on the chosen card.
export function targetLock(anchor,{reduced=false}={}){
 const r=visible(anchor);if(!r)return null;
 const el=overlay(r,'target-lock','<i></i><i></i><i></i><i></i>');
 return transient(el,reduced?[{opacity:1},{opacity:0}]:[{opacity:0,transform:'scale(1.45) rotate(-8deg)'},{opacity:1,transform:'scale(1) rotate(0deg)',offset:.45},{opacity:1,offset:.75},{opacity:0,transform:'scale(.94)'}],{duration:460,easing:'cubic-bezier(.2,.7,.3,1)'});
}

// Equip and similar links: a brief beam between two cards.
export function linkBeam(from,to,{color='#ffe08a',reduced=false}={}){
 const a=visible(from),b=visible(to);if(!a||!b)return null;
 const p=point(a),q=point(b),dx=q.x-p.x,dy=q.y-p.y;
 // rotate and scale are separate properties, so the beam grows along its own axis.
 const el=overlay({left:p.x,top:p.y-2,width:Math.hypot(dx,dy),height:4},'link-beam');el.style.rotate=Math.atan2(dy,dx)+'rad';el.style.setProperty('--fx-color',color);
 return transient(el,reduced?[{opacity:1},{opacity:0}]:[{opacity:0,scale:'0 1'},{opacity:1,scale:'1 1',offset:.45},{opacity:0,scale:'1 1'}],{duration:480,easing:'ease-out'});
}

// A deck or hand being shuffled.
export function shufflePile(pile,{reduced=false}={}){
 if(!pile?.isConnected||boardStill(reduced))return null;
 return pile.animate([{rotate:'0deg'},{rotate:'-5deg',offset:.2},{rotate:'4deg',offset:.45},{rotate:'-3deg',offset:.7},{rotate:'0deg'}],{duration:340,easing:'ease-in-out'});
}

// Phase changes light up their button on the phase strip.
export function phaseGlint(button,{reduced=false}={}){
 const r=visible(button);if(!r)return null;
 const el=overlay(r,'phase-glint');
 return transient(el,reduced?[{opacity:1},{opacity:0}]:[{opacity:0,transform:'scaleX(.6)'},{opacity:1,transform:'scaleX(1.06)',offset:.3},{opacity:0,transform:'scaleX(1.12)'}],{duration:420,easing:'ease-out'});
}

// Turn and phase banners fade in and out on their own time instead of vanishing when the
// cue's window closes. A new banner retires the previous one unless that one outranks it
// (a turn banner is not replaced by the phases that follow it); then it is skipped.
const banners=new WeakMap();
export function showBanner(field,el,{visibleMs=900,priority=1,reduced=false}={}){
 const current=banners.get(field);if(current&&current.priority>priority)return null;
 current?.retire();
 el.classList.add('managed-cue');field.append(el);
 const duration=wallMs(visibleMs),enter=Math.min(.22,160/visibleMs),exit=1-Math.min(.25,200/visibleMs);
 const animation=el.animate(boardStill(reduced)?[{opacity:0},{opacity:1,offset:enter},{opacity:1,offset:exit},{opacity:0}]:[{opacity:0,transform:'translateX(-26px) scaleY(.7)'},{opacity:1,transform:'translateX(0) scaleY(1)',offset:enter},{opacity:1,transform:'translateX(0) scaleY(1)',offset:exit},{opacity:0,transform:'translateX(22px) scaleY(.9)'}],{duration,easing:'ease-out',fill:'forwards'});
 const sweep=el.querySelector('.cue-sweep');if(sweep&&!boardStill(reduced))sweep.animate([{transform:'translateX(-120%)',opacity:0},{transform:'translateX(-120%)',opacity:1,offset:enter},{transform:'translateX(120%)',opacity:0}],{duration:duration*.75,easing:'ease-in-out',fill:'forwards'});
 const entry={priority,retire(){if(banners.get(field)===entry)banners.delete(field);const opacity=Number(getComputedStyle(el).opacity);animation.cancel();el.animate([{opacity:Number.isFinite(opacity)?opacity:1},{opacity:0}],{duration:90,fill:'forwards'}).finished.catch(()=>{}).finally(()=>el.remove())}};
 banners.set(field,entry);
 animation.finished.catch(()=>{}).finally(()=>{if(banners.get(field)===entry)banners.delete(field);if(animation.playState==='finished')el.remove()});
 return animation;
}

// Fade an element out over the last part of a wall-clock window, so it never pops.
export function fadeOutWithin(el,windowMs,exitMs=110){
 if(!el||windowMs<=exitMs+20)return null;
 return el.animate([{opacity:1},{opacity:0}],{duration:wallMs(exitMs),delay:wallMs(windowMs-exitMs-20),fill:'forwards',easing:'ease-in'});
}
