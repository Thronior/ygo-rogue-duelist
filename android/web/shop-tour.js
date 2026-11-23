// First-visit shop tour (user, 2026-11-23, after Nori and JoKer on Discord, 2026-11-22, were surprised that the next
// boss's curses already show in the deck editor). A few steps, each a bubble (the duel tutorial's .lesson-coach look)
// and a glow on the part of the shop it explains. Shown once per device, on the first shop screen without a dialog
// open; the shop's "?" button replays it. Steps whose part is missing (relic-only shops, LVL -1) are skipped.
// Cheap: one fixed element, redrawn only when the step changes or the shop redraws; no timers, no listeners while idle.
import {pageRect,pageWidth,pageHeight} from './ui-zoom.js';

// Its own glow class: the duel tutorial's lesson-target sets position:relative, which moves the shop's absolutely placed
// REROLL and Edit deck buttons.
const KEY='ygo-shop-tour-v1',GLOW='shop-tour-target';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visible=el=>!!el&&el.getClientRects().length>0;
const pick=selector=>[...document.querySelectorAll(selector)].find(visible);
const STEPS=[
 {part:'.shop-stock .shelf',title:'Welcome to the shop',text:'Tick the box on anything you want, then press BUY to buy it all at once. Tap a picture to read the card.'},
 {part:'.shop-layout .packs',title:'Booster packs and decks',text:'Booster packs open into random cards for your collection. Decks add all of their cards.'},
 {part:'.shop-layout .relics',title:'Relics',text:'Relics help you for the rest of the run. Tap one to read it. The Relics button lists the ones you own, and you can sell them there.'},
 {part:'.shop-reroll-counter,.shop-reroll-landscape',title:'Reroll',text:'REROLL replaces everything on sale with new stock.'},
 {part:'.shop-edit-deck',title:'Edit deck',text:'Change your deck between duels. Card stats there include your relics, and before a boss duel also the boss\'s known curses.'},
 {part:'.run-strip',title:'Your run',text:'This track shows your duels: bosses are diamonds and the next duel is ringed in gold. Tap it to see the next boss and its curses.'},
 {part:'.shop-next',title:'Next duel',text:'When you are done, choose your next opponent here.'},
];

let tour=null;
function seen(){try{return localStorage.getItem(KEY)==='1'}catch{return true}}
function remember(){try{localStorage.setItem(KEY,'1')}catch{}}
function clearGlow(){for(const x of document.querySelectorAll('.'+GLOW))x.classList.remove(GLOW)}

// After each shop render: starts the tour the first time, or puts the glow back on the redrawn shop.
export function shopTourAfterRender(dialogOpen){
 if(tour){draw();return}
 if(!dialogOpen&&!seen())startShopTour();
}
export function startShopTour(){
 closeShopTour();remember();
 const el=document.createElement('aside');el.className='lesson-coach shop-tour';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 el.addEventListener('click',e=>{const b=e.target.closest('[data-tour]');if(!b)return;e.stopPropagation();if(b.dataset.tour==='next')step(1);else closeShopTour()});
 document.body.append(el);tour={el,at:-1,steps:[]};step(1);
}
export function closeShopTour(){if(!tour)return;clearGlow();tour.el.remove();tour=null;removeEventListener('resize',place)}

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
 clearGlow();const target=pick(s.part);if(target){target.classList.add(GLOW);if(fresh)target.scrollIntoView({block:'nearest',inline:'nearest'})}place();
}
// The bubble sits in the half of the screen away from what it explains, so the glowing part stays in view.
function place(){
 if(!tour)return;const target=pick(STEPS[tour.at]?.part),st=tour.el.style,width=Math.min(440,pageWidth()-16);
 const r=target?pageRect(target):null,low=!r||r.top+r.height/2<pageHeight()/2;
 Object.assign(st,{width:width+'px',left:Math.round((pageWidth()-width)/2)+'px',right:'auto',top:low?'auto':'8px',bottom:low?'8px':'auto'});
}
