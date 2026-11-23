import {forcedUltra as ULTRA_RARE} from './ultra-rarity.js';
import {buzz} from './juice.js';
let active=null,rainReady=null;
const cardIndexes=new WeakMap();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Open all (2026-11-14): the cards a pool held before these packs were added, for the summary's NEW markers. `pool` is
// the pool after the packs were awarded; a pool missing any pulled copy is not that, so no markers are guessed.
export function ownedBefore(pool,packs){
 if(!Array.isArray(pool))return null;const left=new Map();for(const id of pool)left.set(id,(left.get(id)||0)+1);
 for(const p of packs||[])for(const id of p.cards||[]){const n=left.get(id)||0;if(!n)return null;left.set(id,n-1)}
 return new Set([...left].filter(([,n])=>n>0).map(([id])=>id));
}
// Presentation only: every card is already awarded and saved before this opens.
// `owned` (a Set of card ids held before these packs, or null) marks NEW cards in the Open all summary.
// skip (Settings → Gameplay "Skip Pack Animations", itch.io request; user 2026-11-22): straight to the Open all summary.
export function openPacks({packs,content,image,inspect,sound=()=>{},stopSound=()=>{},done=()=>{},owned=null,skip=false}){
 active?.();if(!packs.length){done();return}
 let cardsById=cardIndexes.get(content.cards);if(!cardsById){cardsById=new Map(content.cards.map(c=>[c.id,c]));cardIndexes.set(content.cards,cardsById)}
 packs=packs.map(p=>{const order=new Map();(p.cards||[]).forEach((id,i)=>{if(!order.has(id))order.set(id,i)});return {...p,cards:[...(p.cards||[])].sort((a,b)=>Number(ULTRA_RARE.has(a))-Number(ULTRA_RARE.has(b))||order.get(a)-order.get(b))};});
 const dialog=document.createElement('dialog');dialog.className='pack-theatre';document.body.append(dialog);
 // The money rain (2.2 MB, 149 frames) was first fetched and decoded on the frame an Ultra Rare turned over (player
 // report 2026-11-11: pack openings lag on an Ultra Rare). It is loaded while the pack is still closed instead.
 if(!rainReady&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&packs.some(p=>p.cards.some(id=>ULTRA_RARE.has(id)))){rainReady=new Image();rainReady.src='assets/effects/money-rain.gif';rainReady.decode?.().catch(()=>{})}
 let index=0,revealed=0,timers=[],closed=false,opening=false,jackpot=false;
 const later=(fn,ms)=>timers.push(setTimeout(()=>{if(!closed)fn()},ms*1.2));
 const clear=()=>{timers.forEach(clearTimeout);timers=[]};
 const finish=()=>{if(closed)return;closed=true;clear();stopSound();dialog.close();dialog.remove();if(active===finish)active=null;done()};active=finish;
 function burst(rare=false){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const fx=document.createElement('div');fx.className='pack-burst'+(rare?' gold':'');fx.setAttribute('aria-hidden','true');for(let i=0;i<(rare?28:42);i++){const dot=document.createElement('i'),angle=i*2.39996,distance=70+(i%7)*22;dot.style.setProperty('--dx',Math.cos(angle)*distance+'px');dot.style.setProperty('--dy',Math.sin(angle)*distance+'px');dot.style.setProperty('--delay',(i%5)*.025+'s');fx.append(dot)}dialog.append(fx);later(()=>fx.remove(),1400)}
 const info=()=>content.packs.find(p=>p.id===packs[index].id);
 const ids=()=>packs[index].cards||[];
 function cardMarkup(id,n){const c=cardsById.get(id),superRare=info()?.super_rare_display?.includes(id),rare=superRare||info()?.rare_display?.includes(id),ultra=ULTRA_RARE.has(id)&&!superRare;return `<button class="pack-pull ${rare?'rare':''} ${superRare?'super-rare':''} ${ultra?'ultra':''}" data-reveal="${n}" aria-label="Reveal card ${n+1}"><img src="assets/card-back.jpg" alt="Face-down card"><span>?</span></button>`}
 function revealOne(){if(revealed>=ids().length)return;const n=revealed++,id=ids()[n],el=dialog.querySelector(`[data-reveal="${n}"]`),c=cardsById.get(id);el.classList.add('turned');el.dataset.inspect=id;el.setAttribute('aria-label','Inspect '+(c?.name||'card'));el.innerHTML=`<img src="${image(id)}" alt="${esc(c?.name)}"><span>${esc(c?.name)}</span>${el.classList.contains('ultra')?'<b>ULTRA RARE</b>':el.classList.contains('super-rare')?'<b>SUPER RARE</b>':el.classList.contains('rare')?'<b>RARE</b>':''}`;if(el.classList.contains('ultra')){el.insertAdjacentHTML('beforeend','<i class="card-sparkles" aria-hidden="true">✦<em>✧</em><strong>✦</strong></i>');burst(true);if(!jackpot){jackpot=true;sound('pack-rare');buzz(60);const rain=document.createElement('img');rain.className='pack-money';rain.src='assets/effects/money-rain.gif';rain.alt='';rain.setAttribute('aria-hidden','true');dialog.append(rain);later(()=>rain.remove(),9000)}}else sound(el.classList.contains('rare')?'rare-shimmer':'card-reveal');dialog.querySelector('.pack-progress').textContent=`${revealed} / ${ids().length} revealed`;if(revealed===ids().length){dialog.querySelector('.pack-next').hidden=false;dialog.querySelector('.pack-skip').hidden=true;dialog.classList.add('all-revealed')}}
 function revealAll(){if(!opening)open(true);clear();dialog.querySelectorAll('.pack-burst,.pack-money').forEach(e=>e.remove());while(revealed<ids().length){revealOne()} }
 // Open all: every remaining pack at once, as one grid grouped by pack (each pack in its usual reveal order). No flips
 // or per-card effects, lazy images, one sound for the lot; the cards are the ones already awarded, as in each pack.
 function openAll(){
  clear();stopSound();dialog.querySelectorAll('.pack-burst,.pack-money').forEach(e=>e.remove());dialog.classList.remove('opening');dialog.classList.add('pack-summary-view','all-revealed');
  const rest=packs.slice(index),seen=new Set(),tiers={ultra:false,rare:false};let total=0,fresh=0;
  const group=pack=>{const p=content.packs.find(x=>x.id===pack.id);return `<section class="pack-summary-group"><h3>${esc(p?.name||'Your cards')}</h3><div class="pack-summary-grid">${(pack.cards||[]).map(id=>{
   const c=cardsById.get(id),superRare=p?.super_rare_display?.includes(id),rare=superRare||p?.rare_display?.includes(id),ultra=ULTRA_RARE.has(id)&&!superRare,isNew=!!owned&&!owned.has(id)&&!seen.has(id);
   seen.add(id);total++;if(isNew)fresh++;if(ultra)tiers.ultra=true;else if(rare)tiers.rare=true;
   return `<button class="pack-summary-card ${rare?'rare':''} ${superRare?'super-rare':''} ${ultra?'ultra':''}" data-inspect="${id}" aria-label="Inspect ${esc(c?.name||'card')}"><img src="${image(id)}" alt="${esc(c?.name)}" loading="lazy" decoding="async"><span>${esc(c?.name)}</span>${ultra?'<b class="pack-summary-rarity">ULTRA RARE</b>':superRare?'<b class="pack-summary-rarity">SUPER RARE</b>':rare?'<b class="pack-summary-rarity">RARE</b>':''}${isNew?'<b class="new-card-marker">NEW</b>':''}</button>`}).join('')}</div></section>`};
  const body=rest.map(group).join('');
  dialog.innerHTML=`<header><div><small>ALL ${rest.length} PACKS</small><h2>All your pulls</h2></div><button class="pack-close">Close</button></header><div class="pack-stage pack-summary">${body}</div><footer><span class="pack-progress">${owned?`${total} cards · ${fresh} new`:`${total} cards`}</span><button class="pack-next primary">Continue</button></footer>`;
  index=packs.length-1;opening=true;
  if(tiers.ultra){burst(true);sound('pack-rare');buzz(60)}else sound(tiers.rare?'rare-shimmer':'card-reveal');
  dialog.querySelector('.pack-next')?.focus({preventScroll:true});
 }
 function open(instant=false){if(opening)return;opening=true;dialog.classList.add('opening');burst();sound('pack-rustle');dialog.querySelector('.pack-open').disabled=true;dialog.querySelector('.pack-open-all')?.remove();
  const deal=()=>{dialog.querySelector('.pack-stage').innerHTML=`<div class="pack-reveal-dust" aria-hidden="true">${Array.from({length:22},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><div class="pack-pulls">${ids().map(cardMarkup).join('')}</div>`;dialog.querySelector('.pack-skip').hidden=false;if(!instant)ids().forEach((_,i)=>later(revealOne,200+i*210));};if(instant)deal();else later(deal,650);
 }
 function show(){clear();stopSound();opening=false;revealed=0;jackpot=false;dialog.classList.remove('opening','all-revealed');const p=info();dialog.innerHTML=`<header><div><small>BOOSTER ${index+1} / ${packs.length}</small><h2>${esc(p?.name||'Your cards')}</h2></div><button class="pack-close">Close</button></header><div class="pack-stage"><div class="pack-aura" aria-hidden="true"></div><div class="pack-sparks" aria-hidden="true">${Array.from({length:16},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><button class="pack-open" aria-label="Open pack"><span class="pack-tear-art"><img class="pack-tear-body" src="${p?'assets/packs/'+p.id+'.jpg':'assets/card-back.jpg'}" alt="${esc(p?.name||'Cards')}"><img class="pack-tear-top" src="${p?'assets/packs/'+p.id+'.jpg':'assets/card-back.jpg'}" alt="" aria-hidden="true"><i class="pack-tear-seam" aria-hidden="true"></i></span><strong>OPEN PACK</strong></button>${packs.length-index>1?`<button class="pack-open-all">Open all (${packs.length-index})</button>`:''}</div><footer><span class="pack-progress">Your cards are already in your collection</span><button class="pack-skip" hidden>Reveal all</button><button class="pack-next primary" hidden>${index+1<packs.length?'Next pack':'Continue'}</button></footer>`}
 dialog.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();if(b.dataset.inspect){inspect(Number(b.dataset.inspect));return}if(b.classList.contains('pack-close'))finish();else if(b.classList.contains('pack-open'))open();else if(b.classList.contains('pack-open-all'))openAll();else if(b.classList.contains('pack-skip'))revealAll();else if(b.classList.contains('pack-next')){index++;index<packs.length?show():finish()}});
 dialog.addEventListener('contextmenu',e=>{const card=e.target.closest('[data-reveal],.pack-summary-card');if(!card)return;e.preventDefault();e.stopPropagation();if(e.button===2&&e.pointerType!=='touch'&&card.dataset.inspect)inspect(Number(card.dataset.inspect))});
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish()});show();dialog.showModal();if(skip)openAll();return finish;
}
