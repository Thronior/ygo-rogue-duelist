export function deckPreviewCards(deck,card){
 const group=id=>{const t=Number(card(id)?.data?.type||0);return t&1?0:t&2?1:t&4?2:3};
 return [...deck.main,...(deck.extra||[])].sort((a,b)=>group(a)-group(b));
}
export function openDeckPreview(modal,deck,{card,cardButton,esc,details,sound=()=>{}}){
 const focus=document.activeElement,background=[...modal.children];
 const overlay=document.createElement('section');overlay.className='deck-preview-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Deck preview');
 const title=esc(deck.name)+' - Tier '+Number(deck.tier),grid=`<div class="cardgrid pile-inspection">${deckPreviewCards(deck,card).map(id=>cardButton(id,`data-deck-inspect="${id}"`)).join('')}</div>`;
 let inspecting=false;
 const show=()=>{inspecting=false;overlay.innerHTML=`<div class="modal-head"><h2>${title}</h2><button data-preview-close>Close</button></div>${grid}`;overlay.querySelector('button').focus()};
 const cleanup=()=>{overlay.remove();background.forEach(el=>el.inert=false);modal.removeEventListener('close',cleanup);focus?.focus?.({preventScroll:true})};
 overlay.closePreview=()=>{sound('window-close');if(inspecting)show();else cleanup()};
 overlay.addEventListener('click',event=>{event.stopPropagation();if(event.target.closest('[data-preview-close]'))return overlay.closePreview();const button=event.target.closest('[data-deck-inspect]');if(!button)return;const c=card(Number(button.dataset.deckInspect));if(!c)return;inspecting=true;sound('inspect-open');overlay.innerHTML=`<div class="modal-head"><h2>${esc(c.name)}</h2><button data-preview-close>Back</button></div>${details(c)}`;overlay.querySelector('button').focus()});
 background.forEach(el=>el.inert=true);modal.append(overlay);modal.addEventListener('close',cleanup);show();return overlay;
}
