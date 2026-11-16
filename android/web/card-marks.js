// Card marks (minotalen thread; user, 2026-11-16), shared by the solo (mobile.js) and Tag (tag-ui.js) deck editors.
// A round button top-left on each tile, below any MISPRINT banner: a tap cycles Maybe → Yes → No for that card in
// this run. No tiles are greyed and sort last. The marks live in run.card_marks ({id: 1 or -1}) and only feed the
// weighting (relic_affinity.deck_cards: Yes = 2 more copies, No = none). A tile keeps its place until the order next
// refreshes, like a tap.
export const MARKS={1:['yes','★','Marked Yes'],'-1':['no','✕','Marked No'],0:['','☆','Mark this card']};
export const cardMark=(run,id)=>Number(run?.card_marks?.[id]||0);
export const nextMark=m=>m===0?1:m===1?-1:0;
export const cardMarkVersion=run=>Object.entries(run?.card_marks||{}).sort().join(';');
// Adds the mark to a card button's markup (and greys a No card).
export function markTile(html,run,id){
 const m=cardMark(run,id),[cls,sym,label]=MARKS[m];
 return html.replace(/<\/button>\s*$/,`<i class="card-mark ${cls}" role="button" data-card-mark="${id}" title="${label}" aria-label="${label}">${sym}</i></button>`).replace('class="cardbtn',`class="cardbtn${m===-1?' marked-no':''}`);
}
// Repaints every tile of one card after its mark changed, without redrawing the grid.
export function paintMarks(root,run,id){
 const m=cardMark(run,id),[cls,sym,label]=MARKS[m];
 for(const el of root.querySelectorAll(`[data-card-mark="${id}"]`)){el.className=`card-mark ${cls}`;el.textContent=sym;el.title=label;el.setAttribute('aria-label',label);el.closest('.cardbtn')?.classList.toggle('marked-no',m===-1)}
}
// Puts No cards last, keeping the order otherwise.
export function noMarksLast(order,run,idOf){
 if(!run?.card_marks)return order;
 const no=i=>cardMark(run,idOf(i))===-1;
 return [...order.filter(i=>!no(i)),...order.filter(no)];
}
// The mark sits inside the card's button: its taps are caught before the deck editors' own handlers see them.
let onTap=null;
export function onMarkTap(fn){onTap=fn}
if(typeof document?.addEventListener==='function'){
 document.addEventListener('pointerdown',e=>{if(e.target.closest?.('[data-card-mark]'))e.stopPropagation()},true);
 document.addEventListener('pointerup',e=>{const m=e.target.closest?.('[data-card-mark]');if(!m)return;e.stopPropagation();if(e.button===0)onTap?.(m)},true);
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-card-mark]')){e.stopPropagation();e.preventDefault()}},true);
}
