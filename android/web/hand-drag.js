// Drag to play (Septarium, Discord 2026-11-22; user's go-ahead). In your Main Phase, drag a card from your hand upwards onto
// your side of the field and let go: a card with one legal action plays it (Summon, Set or Activate), one with several opens
// the usual action buttons where it was dropped. The zone it was dropped on answers the "choose a zone" prompt that
// follows, in place of Auto-Placement or a tap (user, 2026-11-22), when that zone is offered.
// Like attack-drag.js: a drop never invents a response, it replays the taps. Nothing runs until a press on a hand card with
// a legal action moves upwards; while dragging, only a transform moves, and every rect is read once at the start.
import {DRAG_START_PX} from './attack-drag.js';
import {pageZoom} from './ui-zoom.js';

const inside=(r,x,y)=>!!r&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;

// The place response the dropped zone answers, or null. m: the pending prompt; drop: {location, sequence}; choices: the
// prompt's choices (engine.choices(m)).
export function dropPlace(m,drop,choices,{M}){
 if(!drop||!m||m.player!==0||m.type!==M.SELECT_PLACE||(m.count||1)!==1)return null;
 return choices.find(a=>{const p=a.response?.places?.[0];return p&&p.player===0&&p.location===drop.location&&p.sequence===drop.sequence})?.response||null;
}

// api: {M,L,root(), active(), pending(), actionsFor(seq,code) -> choices, play(choice,seq,code), showActions(el,seq,code,x,y),
// choices(m), onStart()}
export function installHandDrag(api){
 let press=null,drag=null,drop=null,suppressClick=0;
 const doc=document;
 function begin(p,e){
  const root=api.root(),zones=[...root.querySelectorAll('.zone[data-zone^="0,"]')].map(el=>{const [,location,sequence]=el.dataset.zone.split(',').map(Number);return {el,location,sequence,rect:el.getBoundingClientRect()}});
  if(!zones.length)return cancel();
  const field=zones.reduce((b,z)=>({left:Math.min(b.left,z.rect.left),top:Math.min(b.top,z.rect.top),right:Math.max(b.right,z.rect.right),bottom:Math.max(b.bottom,z.rect.bottom)}),{left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity});
  const img=p.el.querySelector('img'),r=(img||p.el).getBoundingClientRect(),card=doc.createElement('div');card.className='attack-drag-card hand-drag-card';card.setAttribute('aria-hidden','true');
  // Hit tests stay in window pixels (rects and the pointer); only style values are divided by the UI Scale zoom (ui-zoom.js).
  const z=pageZoom();Object.assign(card.style,{left:r.left/z+'px',top:r.top/z+'px',width:r.width/z+'px',height:r.height/z+'px'});
  if(img){const copy=doc.createElement('img');copy.src=img.currentSrc||img.src;copy.alt='';copy.draggable=false;card.append(copy)}
  doc.body.append(card);p.el.classList.add('hand-drag-source');root.querySelector('.duel')?.classList.add('hand-dragging');
  drag={...p,zones,field,card,z,over:null,onField:false,raf:0,x:e.clientX,y:e.clientY};
  api.onStart?.();move(e);
 }
 function paint(){if(!drag)return;drag.raf=0;drag.card.style.transform=`translate3d(${(drag.x-drag.sx)/drag.z}px,${(drag.y-drag.sy)/drag.z}px,0) scale(1.08)`}
 function move(e){
  drag.x=e.clientX;drag.y=e.clientY;
  const onField=inside(drag.field,drag.x,drag.y),over=onField?drag.zones.find(z=>inside(z.rect,drag.x,drag.y))||null:null;
  if(over!==drag.over){drag.over?.el.classList.remove('hand-drag-over');over?.el.classList.add('hand-drag-over');drag.over=over}
  if(onField!==drag.onField){drag.card.classList.toggle('on-target',onField);drag.onField=onField}
  if(!drag.raf)drag.raf=requestAnimationFrame(paint);
 }
 function cleanup(){
  if(drag){cancelAnimationFrame(drag.raf);drag.card.remove();drag.el.classList.remove('hand-drag-source');drag.over?.el.classList.remove('hand-drag-over');api.root().querySelector('.duel')?.classList.remove('hand-dragging')}
  drag=null;press=null;
 }
 function cancel(){cleanup()}
 function release(e){
  const d=drag;d.x=e.clientX;d.y=e.clientY;move(e);const onField=d.onField,over=d.over;cleanup();
  if(!onField||!api.active()||api.pending()!==d.prompt)return;
  const choices=api.actionsFor(d.seq,d.code);if(!choices.length)return;
  drop=over?{location:over.location,sequence:over.sequence,until:performance.now()+8000,prompt:d.prompt}:null;
  if(choices.length===1)api.play(choices[0],d.seq,d.code);
  else api.showActions(d.el,d.seq,d.code,d.x,d.y);
 }
 doc.addEventListener('pointerdown',e=>{
  if(drag||press||!e.isTrusted||e.button!==0||!e.isPrimary)return;
  const el=e.target.closest?.('.duel .hand [data-hand]');if(!el||!api.active())return;
  const seq=Number(el.dataset.hand),code=Number(el.dataset.code);
  if(!Number.isInteger(seq)||!code||!api.actionsFor(seq,code).length)return;
  press={id:e.pointerId,el,seq,code,sx:e.clientX,sy:e.clientY,prompt:api.pending()};
 },true);
 doc.addEventListener('pointermove',e=>{
  if(!press||e.pointerId!==press.id)return;
  if(drag)return move(e);
  const dx=e.clientX-press.sx,dy=e.clientY-press.sy;
  if(Math.hypot(dx,dy)<DRAG_START_PX)return;
  // Only an upward drag plays a card; a sideways one is left to the hand's own scrolling.
  if(-dy<Math.abs(dx)||!api.active()||api.pending()!==press.prompt||!press.el.isConnected){press=null;return}
  begin(press,e);
 },{passive:true});
 doc.addEventListener('pointerup',e=>{
  if(!press||e.pointerId!==press.id)return;
  if(!drag){press=null;return}
  suppressClick=performance.now()+400;release(e);
 },true);
 doc.addEventListener('pointercancel',e=>{if(press&&e.pointerId===press.id)cancel()},true);
 window.addEventListener('blur',()=>cancel());
 doc.addEventListener('click',e=>{if(performance.now()<suppressClick){suppressClick=0;e.preventDefault();e.stopImmediatePropagation()}},true);
 doc.addEventListener('dragstart',e=>{if(drag||e.target.closest?.('.duel .hand [data-hand]'))e.preventDefault()},true);
 return {
  // The response for a "choose a zone" prompt that the last drop answers, once; null otherwise.
  placeFor(m){
   if(!drop||!m)return null;
   // The Main Phase prompt the card was dropped in stays open while its action buttons are up; a new one ends the play.
   if(performance.now()>drop.until||(m.type===api.M.SELECT_IDLECMD&&m!==drop.prompt)){drop=null;return null}
   if(m.type!==api.M.SELECT_PLACE)return null;
   const response=dropPlace(m,drop,api.choices(m),{M:api.M});drop=null;return response;
  },
  cancel(){cancel();drop=null},
  get dragging(){return !!drag},
 };
}
