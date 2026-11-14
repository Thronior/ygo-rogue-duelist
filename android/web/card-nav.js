// Previous / Next in the card window, and the card's art full screen (user, 2026-11-14).
// The window steps through the list the card was opened from, in the order the player sees it. The list is read
// from the page: the tiles of that list in document order, so the deck editors' filters, search, sort and stacked
// tiles (one step per visible tile, not per copy), a duel pile, a pack's card list and a Collection page all match
// the screen without knowing their rules. The shop goes singles, then packs (and decks), then relics.
// Buttons sit at the foot of the window; a horizontal swipe and the Left / Right arrow keys step too. Tapping the
// card image shows the same image file (image(id)) scaled up with CSS; tap anywhere or Escape closes it.
// Cheap on low-end phones: nothing runs until a window opens, and a step is one ordinary card-window render.

// Tiles that open a card window, most specific first. `kind` says how the host reads the card from the tile.
const CARD_TILES=[
 ['.cardbtn[data-pick]','pick'],              // solo deck editor (renderDraft)
 ['.cardbtn[data-tag="card"][data-id]','tag'], // Tag deck editor
 ['[data-collector="toggle"][data-id]','id'],  // Draft Duels deck editor
 ['[data-tag="trade-card"][data-id]','id'],
 ['[data-tag="inspect"][data-id]','id'],
 ['[data-inspect]','inspect'],                 // Collection, duel piles, pack card lists, deck lists
];
const SHOP_GROUP={single:0,pack:1,deck:1,artifact:2};
const SHOP_WINDOW={pack:'[data-pack-inspection]',artifact:'.relic-card'};
const SOURCE_MS=4000;

let cfg=null,source=null,pending=null,swipe=null;

export function tileFrom(target){
 if(!target?.closest)return null;
 const shop=target.closest('[data-shop-item]');if(shop)return shop.closest('.relic-lock')?null:shop;
 if(target.closest('.relic-lock,.stack-minus,.purchase-check,.related-cards-panel'))return null;
 for(const [sel] of CARD_TILES){const el=target.closest(sel);if(el)return el}
 return null;
}

// The element the player last pressed, right-clicked or activated. A window that opens soon after for the same card
// gets the buttons; any other window just clears it.
export function noteCardNavSource(el){source=el?{el:tileFrom(el)||null,at:performance.now()}:null}

const srcOf=m=>m.querySelector(':scope>.inspect>img')?.getAttribute('src');

function cardItem(el,kind){
 const d=el.dataset;let id,pool=null;
 if(kind==='pick'){pool=Number(d.pick);id=cfg.poolCard(pool)}
 else if(kind==='tag'){id=Number(d.id);pool=d.index===undefined?null:Number(d.index)}
 else id=Number(kind==='inspect'?d.inspect:d.id);
 if(!id||!cfg.hasCard(id))return null;
 return {el,open:()=>cfg.openCard(id,pool,el),matches:m=>srcOf(m)===cfg.image(id)};
}

function shopItem(el,shop){
 const i=Number(el.dataset.shopItem),x=shop?.[i];if(!x)return null;
 return {el,group:SHOP_GROUP[x.kind]??1,open:()=>cfg.openShop(i),matches:m=>x.kind==='single'?srcOf(m)===cfg.image(x.id):!!m.querySelector(SHOP_WINDOW[x.kind]||'.cardgrid')};
}

// The sequence for a tile, and where the tile sits in it.
export function buildSequence(el){
 if(!el)return null;
 let seq;
 if(el.matches('[data-shop-item]')){
  const shop=cfg.shop(),doc=el.ownerDocument;
  seq=[...doc.querySelectorAll('[data-shop-item]')].filter(x=>!cfg.modal.contains(x)).map(x=>shopItem(x,shop)).filter(Boolean);
  seq=seq.map((x,n)=>[x,n]).sort((a,b)=>a[0].group-b[0].group||a[1]-b[1]).map(([x])=>x);
 }else{
  // The split deck editor steps through both panes: the Deck pane, then the Collection pane.
  const entry=CARD_TILES.find(([sel])=>el.matches(sel)),list=el.closest('.draft-card-scroll')||el.closest('.cardgrid');if(!entry||!list)return null;
  seq=[...list.querySelectorAll(entry[0])].map(x=>cardItem(x,entry[1])).filter(Boolean);
 }
 const index=seq.findIndex(x=>x.el===el);
 return index<0||seq.length<2?null:{seq,index};
}

const bar=()=>cfg?.modal.querySelector(':scope>.card-nav');

function renderBar(nav){
 const {modal}=cfg,old=bar();old?.remove();
 const el=document.createElement('nav');el.className='card-nav';el.setAttribute('aria-label','Card navigation');el.nav=nav;
 const first=nav.index===0,last=nav.index===nav.seq.length-1;
 el.innerHTML=`<button type="button" class="card-nav-prev" data-step="-1" aria-label="Previous card" ${first?'disabled':''}><span aria-hidden="true">‹</span><span>Previous</span></button><span class="card-nav-count">${nav.index+1} / ${nav.seq.length}</span><button type="button" class="card-nav-next" data-step="1" aria-label="Next card" ${last?'disabled':''}><span>Next</span><span aria-hidden="true">›</span></button>`;
 el.addEventListener('click',e=>{const b=e.target.closest('[data-step]');e.stopPropagation();if(b&&!b.disabled)stepCardNav(Number(b.dataset.step),true)});
 modal.append(el);
}

// Called at the end of every dialog(): stepping, or a window opened from a list tile, gets the buttons.
export function cardNavAttach(){
 if(!cfg)return;
 const {modal}=cfg,img=modal.querySelector(':scope>.inspect>img');
 if(img){img.classList.add('card-art-zoom');img.setAttribute('role','button');img.setAttribute('aria-label','Show full-size art');img.tabIndex=0}
 let nav=pending;pending=null;
 if(!nav){const s=source;source=null;if(!s?.el||performance.now()-s.at>SOURCE_MS)return;nav=buildSequence(s.el);if(!nav||!nav.seq[nav.index].matches(modal))return}
 renderBar(nav);
}

export function stepCardNav(dir,fromButton=false){
 const b=bar();if(!b?.nav)return false;
 const {seq,index}=b.nav,next=index+dir;if(next<0||next>=seq.length)return false;
 const {modal}=cfg,tab=modal.querySelector('.inspection-tabs [aria-selected="true"]')?.getAttribute('aria-controls'),art=!!modal.querySelector('.card-art-full');
 pending={seq,index:next};
 try{cfg.keepParent(()=>seq[next].open())}finally{pending=null}
 const nb=bar();if(nb?.nav?.index!==next)return false;
 if(tab&&tab!=='collection-details-panel')modal.querySelector(`.inspection-tabs [aria-controls="${tab}"]`)?.click();
 if(art)openArt();
 if(fromButton){const want=nb.querySelector(dir<0?'.card-nav-prev':'.card-nav-next'),focus=want&&!want.disabled?want:nb.querySelector('button:not([disabled])');focus?.focus({preventScroll:true})}
 return true;
}

function openArt(){
 const {modal}=cfg,img=modal.querySelector(':scope>.inspect>img');if(!img||modal.querySelector('.card-art-full'))return;
 const box=document.createElement('div');box.className='card-art-full';box.setAttribute('role','dialog');box.setAttribute('aria-label','Full-size card art');box.tabIndex=-1;
 const big=document.createElement('img');big.src=img.getAttribute('src');big.alt=img.alt||'';big.draggable=false;big.decoding='async';box.append(big);
 modal.append(box);box.focus({preventScroll:true});
}

// Escape, Android Back and right-click close the full-size art first (closeDialog asks here).
export function closeCardArt(){const box=cfg?.modal.querySelector('.card-art-full');if(!box)return false;box.remove();cfg.modal.querySelector(':scope>.inspect>img')?.focus({preventScroll:true});return true}

// A list or row that scrolls sideways keeps its own swipe.
function scrollsSideways(el,stop){
 for(let n=el;n&&n!==stop;n=n.parentElement){if(n.scrollWidth>n.clientWidth+2){const o=getComputedStyle(n).overflowX;if(o==='auto'||o==='scroll')return true}}
 return false;
}
const typing=el=>!!el?.closest?.('input,select,textarea,[contenteditable="true"],[role="tab"],[role="slider"]');

export function installCardNav(options){
 cfg=options;const {modal}=cfg;
 const note=e=>noteCardNavSource(e.target);
 document.addEventListener('pointerdown',note,true);
 document.addEventListener('contextmenu',note,true);
 // Keyboard and gamepad activation: a click with no pointer press before it.
 document.addEventListener('click',e=>{if(e.detail===0)note(e)},true);
 modal.addEventListener('click',e=>{
  if(e.target.closest('.card-art-full')){e.stopPropagation();closeCardArt();return}
  if(e.target.matches?.('.inspect>img.card-art-zoom')&&e.target.parentElement.parentElement===modal){e.stopPropagation();openArt()}
 });
 modal.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('.inspect>img.card-art-zoom')){e.preventDefault();openArt()}});
 document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||!modal.open||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'))return;
  if(typing(e.target)||!bar())return;
  e.preventDefault();stepCardNav(e.key==='ArrowLeft'?-1:1);
 });
 modal.addEventListener('touchstart',e=>{
  swipe=null;if(e.touches.length!==1||!bar()||typing(e.target)||scrollsSideways(e.target,modal))return;
  const t=e.touches[0];swipe={x:t.clientX,y:t.clientY,at:performance.now()};
 },{passive:true});
 modal.addEventListener('touchmove',e=>{if(e.touches.length>1)swipe=null},{passive:true});
 modal.addEventListener('touchcancel',()=>{swipe=null},{passive:true});
 modal.addEventListener('touchend',e=>{
  const s=swipe;swipe=null;if(!s||e.touches.length)return;
  const t=e.changedTouches[0],dx=t.clientX-s.x,dy=t.clientY-s.y;
  if(performance.now()-s.at>700||Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy)*1.4)return;
  stepCardNav(dx<0?1:-1);
 },{passive:true});
}
