// Paged deck grids (Nori, 2026-11-16): long loop runs reach 9,000+ cards, and drawing every tile made the browser
// grind on each tap, sort or search. A grid draws PAGE tiles, then PAGE more whenever its end comes within NEAR px of
// the bottom of its scroller. The shown count survives redraws (a tap rebuilds stacks and split panes) and goes back to
// PAGE when the order changes (type tab, sort, Deck status, search or a new card). Used by the solo deck editor
// (mobile.js) and the Tag and Draft Duels editors (deck-editor-view.js).
export const PAGE=300;
const NEAR=900;
const grids=new Map();

// Markup for the first tiles of `items`, plus an end marker while more are left. `id` names the grid, `key` its order.
export function pagedGrid(id,key,items,markup,after=null){
 let g=grids.get(id);
 if(!g||g.key!==key)g={key,count:PAGE};
 Object.assign(g,{items,markup,after});grids.set(id,g);
 const n=Math.min(items.length,g.count);
 if(n<items.length)schedule();
 return items.slice(0,n).map(markup).join('')+marker(id,items.length-n);
}
const marker=(id,rest)=>rest>0?`<div class="deck-more" data-deck-more="${id}" aria-hidden="true">+${rest}</div>`:'';

function scroller(el){for(let p=el.parentElement;p;p=p.parentElement){const y=getComputedStyle(p).overflowY;if((y==='auto'||y==='scroll')&&p.scrollHeight>p.clientHeight)return p}return null}

// Adds pages to every grid whose end is near, until each end is out of reach.
function fill(){
 queued=false;
 for(const el of document.querySelectorAll('[data-deck-more]')){
  const g=grids.get(el.dataset.deckMore);if(!g){el.remove();continue}
  for(let guard=0;guard<40&&el.isConnected;guard++){
   const box=scroller(el),limit=(box?box.getBoundingClientRect().bottom:innerHeight)+NEAR;
   if(el.getBoundingClientRect().top>limit)break;
   const from=g.count;g.count+=PAGE;
   const tmp=document.createElement('template');tmp.innerHTML=g.items.slice(from,g.count).map(g.markup).join('');
   const nodes=[...tmp.content.children];el.before(tmp.content);g.after?.(nodes);
   const rest=g.items.length-g.count;if(rest>0)el.textContent='+'+rest;else el.remove();
  }
 }
}
let queued=false;
function schedule(){if(queued||typeof requestAnimationFrame!=='function')return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(fill))}
// Scroll events don't bubble, so one capturing listener sees every scroller. Nothing runs without a marker.
// (Guarded so Node tests can import the deck editor modules with a stub document.)
if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
 document.addEventListener('scroll',()=>{if(!queued&&document.querySelector('[data-deck-more]'))schedule()},{capture:true,passive:true});
 globalThis.addEventListener?.('resize',()=>{if(document.querySelector('[data-deck-more]'))schedule()},{passive:true});
}
