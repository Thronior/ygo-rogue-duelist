// Drag to play (Septarium, Discord 2026-11-22; user's go-ahead). In your Main Phase, drag a card from your hand onto your
// side of the field and let go. Reworked with the user, 2026-11-23:
// - Any hand card can be picked up and dragged around at any time in a duel, just to fidget (user: "it is just for
//   fidgeting and making it feel more responsive"); only hand cards, never field cards. A card with nothing to do flies
//   back to its place when let go.
// - Dragged along the hand, the other cards slide apart to open a gap, and letting go there moves the card to that place
//   (user: "allow players to reorganize their hand cards"). The order is only how the hand is shown: the engine's hand
//   and every tap keep their own sequence. It lasts the duel, new cards join on the right, and it is a CSS `order` on
//   each hand card, applied after every duel render.
// - A playable card lights up only the zones it could go to; over one, the card shrinks to the zone's size and is pulled
//   a little towards it, a preview of where it lands. The card leans with the drag's speed.
// - A Trap is Set. A card with one way onto the field (or one legal action at all) plays it without asking; one with
//   several opens the usual action buttons above the zone it was dropped on.
// - The card stays on that zone (which keeps glowing) while the buttons are up. It goes back to the hand only when the
//   buttons close without a choice (a tap elsewhere, another card, Cancel), or when the play is cancelled later.
// - The zone it was dropped on answers the "choose a zone" prompt that follows; a drop between zones takes the nearest
//   offered one, so a drop never asks for a zone.
// - The card is summoned on that zone: the duel skips its usual flight from the hand (landing(), called by the move cue).
// Fades never stick: duel-dom.js reuses hand elements across renders (the next card moves into the slot), so after every
// duel render one pass takes the fade off any hand card that is not the one being dragged or waiting on its zone; and
// resetHandDrag() (every screen change away from the duel) drops all drag state, the hand order, copies and classes.
// Like attack-drag.js: a drop never invents a response, it replays the taps. While dragging, only transforms move (and
// CSS transitions slide the hand), and every rect is read once at the start.
import {DRAG_START_PX} from './attack-drag.js';
import {pageZoom} from './ui-zoom.js';

const inside=(r,x,y)=>!!r&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
const centre=r=>({x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const TYPE_MONSTER=1,TYPE_SPELL=2,TYPE_TRAP=4,TYPE_FIELD=0x80000,TYPE_PENDULUM=0x1000000;
const SOURCE='hand-drag-source',DEST='hand-drag-dest';
let instance=null;
// Drops every drag, waiting card, the hand order and leftover classes. Safe before the drag is installed.
export function resetHandDrag(){instance?.reset()}

// The hand actions that put the card itself on the field: Summons, Sets, and a Spell's activation.
export function fieldChoices(choices,type,{I}){
 return choices.filter(a=>{const x=a.response?.action;return x===I.SELECT_SUMMON||x===I.SELECT_SPECIAL_SUMMON||x===I.SELECT_MONSTER_SET||x===I.SELECT_SPELL_SET||(x===I.SELECT_ACTIVATE&&!!(type&TYPE_SPELL))});
}

// The action a drop plays without asking, or null when the player chooses from the action buttons.
export function dropChoice(choices,type,{I}){
 const field=fieldChoices(choices,type,{I});
 if(type&TYPE_TRAP){const set=field.find(a=>a.response.action===I.SELECT_SPELL_SET);if(set)return set}
 if(field.length===1)return field[0];
 if(!field.length&&choices.length===1)return choices[0];
 return null;
}

// The zones a card could go to, for the highlight. zones: [{location,sequence,empty}]; info: {type,level}.
// A Level 5+ monster may tribute, so occupied Monster Zones count for it too.
export function legalZones(zones,{type=0,level=0}={},{L}){
 return zones.filter(z=>{
  if(z.location===L.MZONE)return z.sequence<5&&!!(type&TYPE_MONSTER)&&(z.empty||level>=5);
  if(z.location!==L.SZONE||!z.empty)return false;
  if(type&TYPE_FIELD)return z.sequence===5;
  if(type&(TYPE_SPELL|TYPE_TRAP))return z.sequence<5;
  return !!(type&TYPE_PENDULUM)&&(z.sequence===0||z.sequence===4);
 });
}

// The place response the drop answers, or null. m: the pending prompt; drop: {location, sequence, x, y}; choices: the
// prompt's choices (engine.choices(m)); rectOf(place) gives a zone's window rect for the nearest-zone fallback.
export function dropPlace(m,drop,choices,{M,rectOf}){
 if(!drop||!m||m.player!==0||m.type!==M.SELECT_PLACE||(m.count||1)!==1)return null;
 const mine=choices.map(a=>({response:a.response,p:a.response?.places?.[0]})).filter(a=>a.p&&a.p.player===0);
 const exact=mine.find(a=>a.p.location===drop.location&&a.p.sequence===drop.sequence);
 if(exact)return exact.response;
 if(!rectOf||!Number.isFinite(drop.x))return null;
 let best=null,bestDistance=Infinity;
 for(const a of mine){const r=rectOf(a.p);if(!r)continue;const c=centre(r),d=Math.hypot(c.x-drop.x,c.y-drop.y);if(d<bestDistance){best=a;bestDistance=d}}
 return best?.response||null;
}

// Hand order. codes: the hand's card codes in engine order; preferred: the codes in the order the player arranged them.
// Returns engine indices in display order: preferred cards first (each code takes the leftmost unused copy), then the
// rest (new draws) in engine order.
export function handOrder(codes,preferred){
 const left=codes.map((code,index)=>({code:String(code),index})),out=[];
 for(const code of preferred||[]){const i=left.findIndex(c=>c.code===String(code));if(i>=0)out.push(left.splice(i,1)[0].index)}
 return [...out,...left.map(c=>c.index)];
}
// Where a card from slot `from` would go among `slots` (the hand cards' centre x, left to right) when let go at x.
export function insertIndex(slots,from,x){let j=0;slots.forEach((s,k)=>{if(k!==from&&s<x)j++});return j}
// The slot card k moves to while the card from `from` is shown at `to`.
export function shiftedSlot(k,from,to){
 if(k===from)return to;
 if(from<to&&k>from&&k<=to)return k-1;
 if(to<from&&k>=to&&k<from)return k+1;
 return k;
}

// api: {M,L,I,root(), owner() (the duel the hand order belongs to), idle() (a duel is on screen with no window over it),
// active() (the player may act now), pending(), actionsFor(seq,code) -> choices, cardInfo(code) -> {type,level},
// play(choice,seq,code), showActions(el,seq,code,x,y) -> the action pop, choices(m), onStart()}
export function installHandDrag(api){
 let press=null,drag=null,drop=null,held=null,suppressClick=0,sweepFrame=0,settleTimer=0,order=null;
 const doc=document;
 const zoneEl=(location,sequence)=>api.root().querySelector(`.zone[data-zone="0,${location},${sequence}"]`);
 const handEl=()=>api.root().querySelector('.duel .hand');
 const handCards=hand=>hand?[...hand.querySelectorAll(':scope>[data-hand]')]:[];
 const playable=p=>api.active()&&api.pending()===p.prompt&&p.el.isConnected&&api.actionsFor(p.seq,p.code).length>0;

 // Shows the hand in the player's order (CSS order on each card; DOM and engine order stay). Every duel render, and
 // after a reorder. A hand never rearranged keeps the plain DOM order and no inline style.
 function applyOrder(){
  const hand=handEl(),cards=handCards(hand);
  if(order&&order.owner!==api.owner())order=null;
  if(!order){
   if(hand?.classList.contains('hand-ordered')){hand.classList.remove('hand-ordered');for(const el of cards){el.style.order='';el.classList.remove('hand-first')}}
   return;
  }
  const shown=handOrder(cards.map(el=>el.dataset.code),order.codes).map(i=>cards[i]);
  shown.forEach((el,k)=>{const o=String(k);if(el.style.order!==o)el.style.order=o;el.classList.toggle('hand-first',k===0)});
  hand?.classList.add('hand-ordered');order.codes=shown.map(el=>el.dataset.code);
 }

 // The hand row at the start of a drag, left to right as shown: elements, their codes and slot centres.
 function readRow(el){
  const hand=handEl();if(!hand||!hand.contains(el))return null;
  const cards=handCards(hand).map(c=>({el:c,code:c.dataset.code,rect:c.getBoundingClientRect()})).sort((a,b)=>a.rect.left-b.rect.left);
  const from=cards.findIndex(c=>c.el===el);if(from<0)return null;
  const hr=hand.getBoundingClientRect();
  return {hand,cards,from,to:from,slots:cards.map(c=>centre(c.rect).x),box:{left:hr.left-8,right:hr.right+8,top:hr.top-24,bottom:Infinity}};
 }
 const rowValid=row=>!!row&&row.cards.every(c=>c.el.isConnected&&c.el.dataset.code===c.code)&&handCards(row.hand).length===row.cards.length;
 // Slides the hand so the dragged card's ghost sits at slot `to` and the others close up around it.
 function shiftRow(row,to,z){
  row.to=to;
  row.cards.forEach((c,k)=>{const dx=(row.slots[shiftedSlot(k,row.from,to)]-row.slots[k])/z;c.el.style.transform=k===row.from||dx?`translateX(${dx}px)`:''});
 }
 function unshiftRow(row,animate){
  if(!row)return;clearTimeout(settleTimer);
  if(!animate)row.hand.classList.remove('hand-reordering');
  for(const c of row.cards)c.el.style.transform='';
  if(animate)settleTimer=setTimeout(()=>row.hand.classList.remove('hand-reordering'),220);
 }

 function begin(p,e){
  finishHeld(true);
  const root=api.root(),zones=[...root.querySelectorAll('.zone[data-zone^="0,"]')].map(el=>{const [,location,sequence]=el.dataset.zone.split(',').map(Number);return {el,location,sequence,empty:el.classList.contains('empty'),rect:el.getBoundingClientRect()}});
  const live=zones.length>0&&playable(p);
  const field=zones.reduce((b,z)=>({left:Math.min(b.left,z.rect.left),top:Math.min(b.top,z.rect.top),right:Math.max(b.right,z.rect.right),bottom:Math.max(b.bottom,z.rect.bottom)}),{left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity});
  const legal=live?legalZones(zones,api.cardInfo(p.code),api):[];for(const z of legal)z.el.classList.add('hand-drag-legal');
  const img=p.el.querySelector('img'),r=(img||p.el).getBoundingClientRect(),card=doc.createElement('div');card.className='attack-drag-card hand-drag-card';card.setAttribute('aria-hidden','true');
  // Hit tests stay in window pixels (rects and the pointer); only style values are divided by the UI Scale zoom (ui-zoom.js).
  const z=pageZoom();Object.assign(card.style,{left:r.left/z+'px',top:r.top/z+'px',width:r.width/z+'px',height:r.height/z+'px'});
  if(img){const copy=doc.createElement('img');copy.src=img.currentSrc||img.src;copy.alt='';copy.draggable=false;card.append(copy)}
  doc.body.append(card);p.el.classList.add(SOURCE);
  const row=readRow(p.el);if(row){clearTimeout(settleTimer);row.hand.classList.add('hand-reordering');shiftRow(row,row.from,z)}
  drag={...p,live,legal,field,card,row,rect:r,z,over:null,onField:false,inHand:false,raf:0,x:e.clientX,y:e.clientY,t:e.timeStamp,tilt:0,lean:0,px:0,py:0};
  if(live)api.onStart?.();
  // The lift eases in from the next frame (a CSS transition on the picture).
  requestAnimationFrame(()=>{if(drag?.card===card)card.classList.add('lifted')});
  move(e);
 }
 // Per frame: the card follows the finger (pulled towards a zone it hovers), leaning with the drag's speed.
 function paint(){
  if(!drag)return;drag.raf=0;const d=drag;
  let x=d.x,y=d.y;
  if(d.over){const c=centre(d.over.rect);x+=(c.x-x)*.35;y+=(c.y-y)*.35}
  d.tilt+=(d.lean-d.tilt)*.3;d.lean*=.8;
  d.card.style.transform=`translate3d(${(x-d.sx)/d.z}px,${(y-d.sy)/d.z}px,0) rotate(${d.tilt.toFixed(2)}deg)`;
  if(Math.abs(d.tilt)>.15||Math.abs(d.lean)>.15)d.raf=requestAnimationFrame(paint);
 }
 function move(e){
  const d=drag,dt=Math.max(8,(e.timeStamp||0)-d.t);
  if(!reduced())d.lean=clamp((e.clientX-d.x)/dt*7,-9,9);
  d.x=e.clientX;d.y=e.clientY;d.t=e.timeStamp||0;
  // A card with nothing to do only follows the finger on the field: no zone or ring suggests it could be played.
  const onField=inside(d.field,d.x,d.y);
  const over=d.live&&onField?d.legal.find(z=>inside(z.rect,d.x,d.y))||null:null;
  if(over!==d.over){
   d.over?.el.classList.remove('hand-drag-over');over?.el.classList.add('hand-drag-over');d.over=over;
   if(over){const s=Math.min(over.rect.width/d.rect.width,over.rect.height/d.rect.height,1);d.card.style.setProperty('--zone-scale',s.toFixed(3));d.lean=0}
   d.card.classList.toggle('over-zone',!!over);
  }
  const ready=d.live&&onField;if(ready!==d.onField){d.card.classList.toggle('on-target',ready);d.onField=ready}
  d.card.classList.toggle('no-play',!d.live&&onField);
  // Along the hand: open a gap where the card would go; anywhere else the hand closes back up.
  const row=d.row&&!d.row.stale?d.row:null,inHand=!!row&&!onField&&inside(row.box,d.x,d.y);
  if(row){const to=inHand?insertIndex(row.slots,row.from,d.x):row.from;if(to!==row.to)shiftRow(row,to,d.z)}
  d.inHand=inHand;
  if(!d.raf)d.raf=requestAnimationFrame(paint);
 }
 // Ends the drag itself; the card copy is handed to the caller (held or flown back), never left behind.
 function cleanup(){
  if(drag){cancelAnimationFrame(drag.raf);for(const z of drag.legal)z.el.classList.remove('hand-drag-legal');drag.over?.el.classList.remove('hand-drag-over');clearZones()}
  drag=null;press=null;
 }
 // Zones are reused across renders too, so the highlight classes are also swept by name.
 function clearZones(){for(const el of api.root().querySelectorAll('.hand-drag-legal,.hand-drag-over'))el.classList.remove('hand-drag-legal','hand-drag-over')}
 // The copy glides to (dx, dy) from where it was picked up (0, 0: its own slot) and settles to its hand size; then the
 // hand card shows again. Transforms only; a timer finishes it too, as a hidden page pauses animations.
 function flyBack(card,source,dx=0,dy=0,z=1){
  let timer=0;const done=()=>{clearTimeout(timer);card.remove();source?.classList.remove(SOURCE)};
  card.classList.remove('lifted','over-zone','on-target','no-play','waiting');
  if(!card.isConnected||reduced())return done();
  const a=card.animate([{transform:card.style.transform||'none'},{transform:`translate3d(${dx/z}px,${dy/z}px,0)`}],{duration:200,easing:'cubic-bezier(.2,.8,.3,1)'});
  a.finished.catch(()=>{}).finally(done);timer=setTimeout(done,420);
 }
 function cancel(){const d=drag;cleanup();if(d){unshiftRow(d.row,false);d.card.remove();d.el.classList.remove(SOURCE)}}
 // Puts the copy on the zone it was dropped on (the picture already has the zone's size), upright.
 function settle(d,over){
  if(!over)return;
  const c=centre(over.rect),base=centre(d.rect);
  const to=`translate3d(${(c.x-base.x)/d.z}px,${(c.y-base.y)/d.z}px,0)`,from=d.card.style.transform||'none';
  d.card.style.transform=to;
  if(!reduced())d.card.animate([{transform:from},{transform:to}],{duration:140,easing:'cubic-bezier(.2,.8,.3,1)'});
 }
 // held: the dropped card while its play is open. chosen once an action is picked; its copy then waits for landing().
 // A held card that landed keeps its hand fade until the next render redraws the hand (the sweep then takes it off).
 function finishHeld(back){
  const h=held;if(!h)return;held=null;h.watch?.disconnect();clearTimeout(h.timer);h.zone?.el?.classList.remove(DEST);
  if(back)flyBack(h.card,h.el,0,0,h.z);else h.card.remove();
 }
 function hold(d,over){
  held={card:d.card,el:d.el,seq:d.seq,code:d.code,prompt:d.prompt,z:d.z,zone:over?{location:over.location,sequence:over.sequence,el:over.el}:null,chosen:false,pop:null,watch:null,timer:0};
  over?.el.classList.add(DEST);d.card.classList.remove('on-target');
  settle(d,over);
 }
 // The drop's zone answer and the waiting copy wait as long as the buttons are up; the clock starts with the choice, and
 // each further question on the way (tributes, a target) restarts it. It is only a safety net for a play that never comes.
 function keepAlive(){if(!held)return;clearTimeout(held.timer);held.timer=setTimeout(()=>finishHeld(true),15000);if(drop)drop.until=performance.now()+15000}
 function choose(){if(!held)return;held.chosen=true;keepAlive()}
 // Letting go along the hand moves the card there: the gap it opened becomes its place, with no jump (the shifted
 // positions are the new layout) and the copy lands in it.
 function reorder(d){
  const row=d.row,to=row.to,list=row.cards.map(c=>c.el);list.splice(to,0,list.splice(row.from,1)[0]);
  order={owner:api.owner(),codes:list.map(el=>el.dataset.code)};
  unshiftRow(row,false);applyOrder();
  const r=(d.el.querySelector('img')||d.el).getBoundingClientRect();
  flyBack(d.card,d.el,r.left-d.rect.left,r.top-d.rect.top,d.z);
 }
 function release(e){
  const d=drag;move(e);const onField=d.onField,over=d.over,row=d.row;cleanup();
  if(d.inHand&&row&&!row.stale&&rowValid(row)){if(row.to!==row.from)return reorder(d);unshiftRow(row,true);return flyBack(d.card,d.el,0,0,d.z)}
  unshiftRow(row,true);
  const choices=d.live&&onField&&playable(d)?api.actionsFor(d.seq,d.code):[];
  if(!choices.length)return flyBack(d.card,d.el,0,0,d.z);
  drop={location:over?.location,sequence:over?.sequence,x:d.x,y:d.y,until:Infinity,prompt:d.prompt};
  hold(d,over);
  const choice=dropChoice(choices,api.cardInfo(d.code).type||0,api);
  if(choice){choose();api.play(choice,d.seq,d.code);return}
  // The buttons sit above the zone (or the drop point); the card waits under them.
  const anchor=over?{x:centre(over.rect).x,y:over.rect.top}:{x:d.x,y:d.y-d.rect.height/2};
  const pop=api.showActions(d.el,d.seq,d.code,anchor.x,anchor.y);
  if(!pop?.isConnected){drop=null;return finishHeld(true)}
  held.pop=pop;
  pop.addEventListener('click',ev=>{if(ev.target.closest?.('button[data-act]'))choose()},true);
  // The pop is a direct child of <body>; watching only that list, and only while it is up, costs nothing otherwise.
  held.watch=new MutationObserver(()=>{if(!held||held.pop?.isConnected)return;held.watch.disconnect();held.watch=null;if(!held.chosen){drop=null;finishHeld(true)}});
  held.watch.observe(doc.body,{childList:true});
 }
 // After a duel render (before it is painted): the hand order is put back on the reused elements; a hand element that
 // now shows another card (or whose card is no longer dragged or waiting) loses its fade; a drag whose hand changed under
 // it stops sliding the hand.
 function sweep(){
  sweepFrame=0;
  if(drag?.row&&!drag.row.stale&&!rowValid(drag.row)){unshiftRow(drag.row,false);drag.row.stale=true}
  applyOrder();
  for(const el of doc.querySelectorAll('.'+SOURCE)){
   const own=drag?.el===el?drag:held?.el===el?held:null;
   if(!own||el.dataset.code!==String(own.code))el.classList.remove(SOURCE);
  }
 }
 doc.addEventListener('pointerdown',e=>{
  if(drag||press||!e.isTrusted||e.button!==0||!e.isPrimary)return;
  const el=e.target.closest?.('.duel .hand [data-hand]');if(!el||!api.idle())return;
  const seq=Number(el.dataset.hand),code=Number(el.dataset.code);
  if(!Number.isInteger(seq))return;
  press={id:e.pointerId,el,seq,code,sx:e.clientX,sy:e.clientY,prompt:api.pending()};
 },true);
 doc.addEventListener('pointermove',e=>{
  if(!press||e.pointerId!==press.id)return;
  if(drag)return move(e);
  if(Math.hypot(e.clientX-press.sx,e.clientY-press.sy)<DRAG_START_PX)return;
  // The hand never scrolls (its cards shrink to fit), so a drag may start in any direction.
  if(!api.idle()||!press.el.isConnected){press=null;return}
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
 instance={
  // The response for a "choose a zone" prompt that the last drop answers, once; null otherwise.
  placeFor(m){
   if(!drop||!m)return null;
   // The Main Phase prompt the card was dropped in stays open while its action buttons are up; a new one ends the play.
   if(performance.now()>drop.until||(m.type===api.M.SELECT_IDLECMD&&m!==drop.prompt)){drop=null;return null}
   if(m.type!==api.M.SELECT_PLACE)return null;
   const rectOf=p=>zoneEl(p.location,p.sequence)?.getBoundingClientRect()||null;
   const response=dropPlace(m,drop,api.choices(m),{M:api.M,rectOf});drop=null;return response;
  },
  // Called by the move cue. When the held card leaves the hand: {el, same}. same: it lands on the zone it waits on, so
  // the cue shows it there at once with no flight; otherwise the flight starts from the card's picture (its real size).
  // done() removes the copy.
  landing(cue){
   const h=held;
   if(!h?.chosen||cue?.from?.controller!==0||cue.from.location!==api.L.HAND||cue.from.sequence!==h.seq)return null;
   const same=!!h.zone&&cue.to?.controller===0&&cue.to.location===h.zone.location&&cue.to.sequence===h.zone.sequence;
   return {el:h.card.querySelector('img')||h.card,same,done:()=>{if(held===h)finishHeld(false)}};
  },
  // Each duel render: schedules the sweep; a play that ended with the card still in hand (tributes cancelled) sends it
  // back; while the duel asks something else on the way (tributes, a target), the waiting copy fades.
  afterRender(){
   if(!sweepFrame)sweepFrame=requestAnimationFrame(sweep);
   const h=held;if(!h?.chosen)return;
   const m=api.pending();if(!m||m===h.prompt)return;
   if(m.player===0&&m.type===api.M.SELECT_IDLECMD)return finishHeld(true);
   if(m!==h.asked){h.asked=m;keepAlive()}
   h.card.classList.toggle('waiting',m.type!==api.M.SELECT_PLACE);
  },
  reset(){
   const d=drag;cleanup();if(d){unshiftRow(d.row,false);d.card.remove()}
   const h=held;held=null;if(h){h.watch?.disconnect();clearTimeout(h.timer);h.card.remove()}
   drop=null;order=null;cancelAnimationFrame(sweepFrame);sweepFrame=0;clearTimeout(settleTimer);
   for(const el of doc.querySelectorAll('.hand-drag-card'))el.remove();
   for(const el of doc.querySelectorAll(`.${SOURCE},.${DEST},.hand-drag-legal,.hand-drag-over,.hand-first`))el.classList.remove(SOURCE,DEST,'hand-drag-legal','hand-drag-over','hand-first');
   for(const el of doc.querySelectorAll('.hand-ordered,.hand-reordering')){el.classList.remove('hand-ordered','hand-reordering');for(const c of handCards(el)){c.style.order='';c.style.transform=''}}
  },
  cancel(){instance.reset()},
  get dragging(){return !!drag},
 };
 return instance;
}
