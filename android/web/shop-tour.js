// First-visit shop tour (user, 2026-11-23, after Nori and JoKer on Discord, 2026-11-22, were surprised that the next
// boss's curses already show in the deck editor). A few steps, each a bubble (the duel tutorial's .lesson-coach look)
// about one part of the shop. Shown once per device, on the first shop screen without a dialog open; the shop's "?"
// button replays it. Steps whose part is missing (relic-only shops, LVL -1) are skipped.
// Reworked 2026-11-23 (user: "use a pointer image whenever pointing at something and make sure it is very obvious what
// the tip is talking about"): one part per step; the rest of the shop dims around it, the part glows, and a pointing hand
// beside it points at it. The tips name the real gestures: a tap ticks an item, a hold (right-click) reads it.
// Cheap: three fixed elements, placed only when the step changes, the shop redraws or the window resizes; the dim is
// one static box-shadow and the hand bobs with a transform; no timers, no listeners while idle.
import {pageRect,pageWidth,pageHeight} from './ui-zoom.js';

// Its own glow class: the duel tutorial's lesson-target sets position:relative, which moves the shop's absolutely placed
// REROLL and Edit deck buttons.
const KEY='ygo-shop-tour-v1',GLOW='shop-tour-target';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visible=el=>!!el&&el.getClientRects().length>0;
const pick=selector=>[...document.querySelectorAll(selector)].find(visible);
// A step about several elements (both stock shelves) shows them as one part: every match glows, the dim frames them all.
const pickAll=(selector,all)=>all?[...document.querySelectorAll(selector)].filter(visible):[pick(selector)].filter(Boolean);
const union=rects=>rects.reduce((b,r)=>({left:Math.min(b.left,r.left),top:Math.min(b.top,r.top),right:Math.max(b.right,r.right),bottom:Math.max(b.bottom,r.bottom)}),{left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity});
const STEPS=[
 {part:'.shop-stock .shelf',all:true,title:'Welcome to the shop',text:'These cards are for sale. Tap a card to tick it. Hold it (right-click on a computer) to read it.'},
 {part:'.shop-buy',title:'Buy',text:'BUY buys everything you ticked at once. The price is shown under it.'},
 {part:'.shop-layout .packs',title:'Booster packs and decks',text:'Booster packs open into random cards for your collection. Decks add all of their cards.'},
 {part:'.shop-layout .relics',title:'Relics',text:'Relics help you for the rest of the run. Tap one to tick it. Hold it (right-click on a computer) to read it.'},
 {part:'.shop-reference-buttons [data-do="relic-ledger"]',title:'Your relics',text:'This button lists the relics you own. You can sell them there.'},
 {part:'.shop-reroll-counter,.shop-reroll-landscape',title:'Reroll',text:'REROLL replaces everything on sale with new stock, for the coins shown on it.'},
 {part:'.shop-edit-deck',title:'Edit deck',text:'Change your deck between duels. Card stats there include your relics, and before a boss duel also the boss\'s known curses.'},
 {part:'.run-strip',title:'Your run',text:'This track shows your duels: bosses are diamonds and the next duel is ringed in gold. Tap it to see the next boss and its curses.'},
 {part:'.shop-next',title:'Next duel',text:'When you are done, choose your next opponent here.'},
];
// A pointing hand (drawn here, no image file to load); it points up and is turned to point down.
const HAND='<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M19 4c2.8 0 5 2.2 5 5v15.5l1.6-.4c2.7-.6 5 .6 5.9 2.7l1.3-.3c2.6-.6 5 .7 5.8 3l1.1-.2c3-.6 5.8 1.6 5.8 4.7V44c0 5-4 9-9 9H26.5c-3 0-5.8-1.4-7.6-3.8L7.3 34.1c-1.6-2.1-1.2-5.1 1-6.6 2-1.4 4.7-1.1 6.3.7L14 29V9c0-2.8 2.2-5 5-5z" fill="#fff6c9" stroke="#1d1405" stroke-width="3" stroke-linejoin="round"/><path d="M24 25v10M31 27v8M38 30v6" stroke="#1d1405" stroke-width="2.5" stroke-linecap="round"/></svg>';

let tour=null;
function seen(){try{return localStorage.getItem(KEY)==='1'}catch{return true}}
function remember(){try{localStorage.setItem(KEY,'1')}catch{}}
function clearGlow(){for(const x of document.querySelectorAll('.'+GLOW))x.classList.remove(GLOW)}
function node(className,html=''){const el=document.createElement('div');el.className=className;el.setAttribute('aria-hidden','true');el.innerHTML=html;document.body.append(el);return el}

// After each shop render: starts the tour the first time, or puts the glow back on the redrawn shop.
export function shopTourAfterRender(dialogOpen){
 if(tour){draw();return}
 if(!dialogOpen&&!seen())startShopTour();
}
export function startShopTour(){
 closeShopTour();remember();
 const spot=node('shop-tour-spot'),hand=node('shop-tour-hand',HAND);
 const el=document.createElement('aside');el.className='lesson-coach shop-tour';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 el.addEventListener('click',e=>{const b=e.target.closest('[data-tour]');if(!b)return;e.stopPropagation();if(b.dataset.tour==='next')step(1);else closeShopTour()});
 document.body.append(el);tour={el,spot,hand,at:-1,steps:[]};step(1);
}
export function closeShopTour(){if(!tour)return;clearGlow();tour.el.remove();tour.spot.remove();tour.hand.remove();tour=null;removeEventListener('resize',place)}

function step(delta){
 // Only the steps whose part this shop shows, counted again each step (a purchase can redraw the shop).
 const steps=STEPS.filter(s=>pick(s.part));let at=0;
 if(tour.at>=0){const i=steps.indexOf(STEPS[tour.at]);at=i>=0?i+delta:steps.findIndex(s=>STEPS.indexOf(s)>tour.at);if(at<0)at=steps.length}
 if(at<0||at>=steps.length)return closeShopTour();
 tour.at=STEPS.indexOf(steps[at]);tour.count=`${at+1} / ${steps.length}`;tour.last=at===steps.length-1;tour.drawn='';draw();
 removeEventListener('resize',place);addEventListener('resize',place);
}
function draw(){
 const s=STEPS[tour.at];if(!s)return closeShopTour();
 const key=[tour.at,tour.count,tour.last].join('|');
 const fresh=tour.drawn!==key;
 if(fresh){tour.drawn=key;tour.el.innerHTML=`<button class="lesson-exit" data-tour="close" aria-label="Close the shop tour" title="Close the shop tour">✕</button><h3>${esc(s.title)}</h3><p class="lesson-say">${esc(s.text)}</p><div class="lesson-next"><small>${esc(tour.count)}</small><button class="primary" data-tour="next">${tour.last?'Done':'Next'}</button></div>`}
 clearGlow();const parts=pickAll(s.part,s.all);for(const p of parts)p.classList.add(GLOW);if(fresh)parts[0]?.scrollIntoView({block:'nearest',inline:'nearest'});place();
}
// The bubble sits in the half of the screen away from what it explains; the hand points at the part from the first side
// with room for it (below, above, right, left), never under the bubble.
function place(){
 if(!tour)return;const s=STEPS[tour.at],parts=s?pickAll(s.part,s.all):[],st=tour.el.style,W=pageWidth(),H=pageHeight(),width=Math.min(440,W-16);
 const r=parts.length?union(parts.map(pageRect)):null,low=!r||(r.top+r.bottom)/2<H/2;
 Object.assign(st,{width:width+'px',left:Math.round((W-width)/2)+'px',right:'auto',top:low?'auto':'8px',bottom:low?'8px':'auto'});
 tour.spot.hidden=tour.hand.hidden=!r;if(!r)return;
 const pad=6;Object.assign(tour.spot.style,{left:r.left-pad+'px',top:r.top-pad+'px',width:r.right-r.left+pad*2+'px',height:r.bottom-r.top+pad*2+'px'});
 const b=pageRect(tour.el),w=52,h=60,cx=(r.left+r.right)/2-w/2,cy=(r.top+r.bottom)/2-h/2,gap=pad+2;
 const clampX=x=>Math.max(4,Math.min(W-w-4,x)),clampY=y=>Math.max(4,Math.min(H-h-4,y));
 // turn: the hand is drawn pointing up; rotated, its bob still moves towards the part.
 const options=[{x:clampX(cx),y:r.bottom+gap,turn:0},{x:clampX(cx),y:r.top-gap-h,turn:180},{x:r.right+gap,y:clampY(cy),turn:-90},{x:r.left-gap-w,y:clampY(cy),turn:90}];
 const fits=o=>o.x>=0&&o.y>=0&&o.x+w<=W&&o.y+h<=H&&(o.x+w<=b.left||o.x>=b.right||o.y+h<=b.top||o.y>=b.bottom);
 const o=options.find(fits)||{x:clampX(cx),y:clampY(r.bottom-h-4),turn:0};
 Object.assign(tour.hand.style,{left:Math.round(o.x)+'px',top:Math.round(o.y)+'px',transform:o.turn?`rotate(${o.turn}deg)`:''});
}
