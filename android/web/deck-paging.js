// Paged deck grids (Nori, 2026-11-16): long loop runs reach 9,000+ cards, and drawing every tile made the browser
// grind on each tap, sort or search. A grid draws PAGE tiles first. The shown range survives redraws (a tap rebuilds
// stacks and split panes) and goes back to the first PAGE when the order changes (type tab, sort, Deck status, search or
// a new card). Used by the solo deck editor (mobile.js) and the Tag and Draft Duels editors (deck-editor-view.js).
//
// Windowing (Nori, Discord 2026-11-20: scrolling a huge collection got slower and slower, because every page drawn
// stayed in the page). Only rows near the view are drawn: rows come in CHUNK rows at a time as they get within NEAR px
// of the view, and go once they are more than FAR px away. A spacer (.deck-gap) holds the height of the rows released
// above, so the scroll position and the cards on screen don't move; rows are added and released whole (a multiple of
// the grid's columns), so no card on screen changes column. The selected card (keyboard or gamepad) is never released.
// One rAF-batched pass per scroll; nothing runs without a big grid on the page.
export const PAGE=300;
const NEAR=900,FAR=2400,CHUNK=6;
const grids=new Map();

// Markup for the shown tiles of `items`, plus a spacer for released rows and an end marker. `id` names the grid, `key`
// its order.
export function pagedGrid(id,key,items,markup,after=null){
 let g=grids.get(id);
 if(!g||g.key!==key)g={key,start:0,count:PAGE,gap:0};
 Object.assign(g,{id,items,markup,after});grids.set(id,g);
 if(g.start>=items.length)Object.assign(g,{start:0,gap:0});
 const big=items.length>PAGE,start=g.start,n=Math.min(items.length,Math.max(g.count,start+PAGE));g.count=n;
 if(big)schedule();
 return gapMarkup(id,start?g.gap:0)+items.slice(start,n).map(markup).join('')+(big?marker(id,items.length-n):'');
}
const gapMarkup=(id,h)=>h>0?`<div class="deck-gap" data-deck-gap="${id}" aria-hidden="true" style="grid-column:1/-1;height:${h}px"></div>`:'';
// Big grids always end with the marker (hidden once the last tile is drawn), so the pass can find the grid.
const marker=(id,rest)=>`<div class="deck-more" data-deck-more="${id}" aria-hidden="true"${rest>0?'':' hidden'}>+${Math.max(0,rest)}</div>`;

function scroller(el){for(let p=el.parentElement;p;p=p.parentElement){const y=getComputedStyle(p).overflowY;if((y==='auto'||y==='scroll')&&p.scrollHeight>p.clientHeight)return p}return null}
const make=html=>{const tmp=document.createElement('template');tmp.innerHTML=html;return tmp.content};
const top=el=>el.getBoundingClientRect().top;
// The tile holding the selection: the gamepad's (data-pad-focus) or the keyboard's.
function held(grid){let el=grid.querySelector('[data-pad-focus]')||(grid.contains(document.activeElement)?document.activeElement:null);while(el&&el.parentElement!==grid)el=el.parentElement;return el}

// Brings every big grid's drawn rows in line with its view.
function fill(){
 queued=false;
 for(const end of document.querySelectorAll('[data-deck-more]')){
  const g=grids.get(end.dataset.deckMore),grid=end.parentElement;
  if(!g||!grid){end.remove();continue}
  try{windowGrid(g,grid,end)}catch(e){console.warn('deck-paging',e)}
 }
}

function windowGrid(g,grid,end){
 const box=scroller(grid),css=getComputedStyle(grid);
 const view=box?box.getBoundingClientRect():{top:0,bottom:innerHeight};
 const cols=Math.max(1,css.gridTemplateColumns.split(' ').filter(Boolean).length),rowGap=parseFloat(css.rowGap)||0;
 let gap=grid.querySelector(':scope>[data-deck-gap]');
 const tiles=()=>[...grid.children].filter(el=>el!==gap&&el!==end);
 const draw=(from,to)=>{const frag=make(g.items.slice(from,to).map(g.markup).join('')),nodes=[...frag.children];return {frag,nodes}};
 const done=nodes=>{if(nodes.length)g.after?.(nodes)};
 const setGap=h=>{g.gap=g.start?Math.max(0,Math.round(h)):0;if(!g.gap){gap?.remove();gap=null;return}if(!gap){gap=make(gapMarkup(g.id,g.gap)).firstElementChild;grid.prepend(gap)}else gap.style.height=g.gap+'px'};
 const setEnd=()=>{const rest=g.items.length-g.count;end.hidden=rest<=0;end.textContent='+'+Math.max(0,rest)};
 // Puts `anchor` back where it was on screen after rows above it changed (browsers without scroll anchoring).
 const keep=(anchor,y)=>{if(!box||!anchor.isConnected)return;const d=top(anchor)-y;if(Math.abs(d)>=.5)box.scrollTop+=d};
 let list=tiles();
 if(!list.length){g.start=0;setGap(0);return}

 // After a column change the first drawn tile may sit mid-row: draw the rest of that row first.
 if(g.start%cols){const a=list[0],y=top(a),from=g.start-g.start%cols,{frag,nodes}=draw(from,g.start);a.before(frag);const h=y-top(nodes[0]);g.start=from;setGap(g.gap-h);done(nodes);keep(a,y);list=tiles()}

 // Where the view is inside the spacer (a jump: back to the top after a redraw, or a dragged scrollbar), estimated from
 // the released rows' average height. Far from the drawn rows, draw a fresh PAGE there instead of everything between.
 let target=g.start;
 if(gap&&g.start>0&&gap.getBoundingClientRect().bottom>view.top-NEAR){
  const pitch=(g.gap+rowGap)/(g.start/cols);
  target=Math.min(g.start,Math.floor(Math.max(0,view.top-NEAR-gap.getBoundingClientRect().top)/Math.max(1,pitch))*cols);
  if(target+PAGE<g.start){
   list.forEach(el=>el.remove());g.start=target;g.count=Math.min(g.items.length,target+PAGE);
   const {frag,nodes}=draw(target,g.count);end.before(frag);setGap(target/cols*pitch-rowGap);setEnd();done(nodes);list=tiles();
  }
 }
 // Restore rows above as the view nears the first drawn row.
 for(let guard=0;guard<30&&g.start>0;guard++){
  const first=list[0],y=top(first);if(y<view.top-NEAR&&target>=g.start)break;
  const from=Math.max(0,Math.min(target,g.start-CHUNK*cols)),{frag,nodes}=draw(from,g.start);
  first.before(frag);const h=y-top(nodes[0]);g.start=from;setGap(g.gap-h);done(nodes);keep(first,y);target=Math.min(target,g.start);list=tiles();
 }

 // Draw rows below as the view nears the end.
 for(let guard=0;guard<40&&g.count<g.items.length;guard++){
  const last=list[list.length-1];if(last.getBoundingClientRect().bottom>view.bottom+NEAR)break;
  const from=g.count;g.count=Math.min(g.items.length,from+CHUNK*cols);const {frag,nodes}=draw(from,g.count);end.before(frag);setEnd();done(nodes);list=tiles();
 }

 const hold=held(grid),holdAt=hold?list.indexOf(hold):-1;
 // Release whole rows far above the view (4 rows at least, so small scrolls don't churn).
 {let cut=0;const limit=view.top-FAR;while(cut<list.length&&list[cut].getBoundingClientRect().bottom<limit)cut+=cols;
  cut=Math.min(cut,list.length-1);cut-=cut%cols;if(holdAt>=0)cut=Math.min(cut,holdAt-holdAt%cols);
  if(cut>=cols*4){const anchor=list[cut],y=top(anchor),h=y-top(list[0]),had=!!gap;
   for(let k=0;k<cut;k++)list[k].remove();g.start+=cut;setGap(had?g.gap+h:h-rowGap);keep(anchor,y);list=tiles()}}
 // Release rows far below the view; they come back on the way down.
 {const limit=view.bottom+FAR;let cut=list.length;while(cut>0&&top(list[cut-1])>limit)cut--;
  if(holdAt>=0)cut=Math.max(cut,holdAt+1);
  if(list.length-cut>=cols*4){for(let k=cut;k<list.length;k++)list[k].remove();g.count=g.start+cut;setEnd()}}
}
let queued=false;
function schedule(){if(queued||typeof requestAnimationFrame!=='function')return;queued=true;requestAnimationFrame(fill)}
// Scroll events don't bubble, so one capturing listener sees every scroller. Nothing runs without a marker.
// (Guarded so Node tests can import the deck editor modules with a stub document.)
if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
 document.addEventListener('scroll',()=>{if(!queued&&document.querySelector('[data-deck-more]'))schedule()},{capture:true,passive:true});
 globalThis.addEventListener?.('resize',()=>{if(document.querySelector('[data-deck-more]'))schedule()},{passive:true});
}
