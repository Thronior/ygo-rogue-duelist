// Deck editor pieces shared by Tag (tag-ui.js) and Draft Duels (draft-ui.js), with the same behaviour as solo
// (mobile.js renderDraft): type tabs, effect search, Deck status, Sort, Deselect, ATK/DEF on monsters, and the
// wide-screen Deck + Collection split. The editor object holds its state in deckFilter, deckSort, deckStatus,
// deckSplit, deckOrder and deckOrderKey; Sort and Deck status are remembered per device (deck-sort-preference.js).
import {frameLevelName,deckCardMarkup,deckStats,attributeOrder} from './feedback-ui.js';
import {searches,matchesSearch,openSearch,clearSearch,DECK_STATUS_OPTIONS,deselectIcon,deckSearchButtons,splitDeckMarkup,splitStyle,deckSplitColumns} from './card-search.js';
import {DEFAULT_DECK_SORT,DEFAULT_DECK_STATUS,rememberDeckSort} from './deck-sort-preference.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const DECK_TYPE_TABS=['All','Monster','Spell','Trap','Extra'];
const TYPE_BITS={Monster:1,Spell:2,Trap:4,Extra:64};

export const deckFiltered=ed=>ed.deckFilter!=='All'||ed.deckSort!==DEFAULT_DECK_SORT||ed.deckStatus!==DEFAULT_DECK_STATUS;
// After a duel only the type tab and the search reset; the reset button (all) also restores the default Sort and Deck status.
export function resetDeckFilters(ed,searchKey,all=true){ed.deckFilter='All';clearSearch(searchKey);if(all){ed.deckSort=DEFAULT_DECK_SORT;ed.deckStatus=DEFAULT_DECK_STATUS;rememberDeckSort({sort:ed.deckSort,status:ed.deckStatus})}}

// Pool indices in display order. A tap keeps every card in place; the order refreshes only when type, sort, status,
// search, the pool or the split changes.
export function deckOrder(ed,{pool,selected,lookup,run,info,searchKey}){
 let order=pool.map((_,i)=>i).filter(i=>matchesSearch(lookup(pool[i]),searchKey));
 const inDeck=new Set(selected);
 // The split shows both groups side by side, so In/Out only filter the single grid.
 if(!ed.deckSplit&&(ed.deckStatus==='In'||ed.deckStatus==='Out'))order=order.filter(i=>inDeck.has(i)===(ed.deckStatus==='In'));
 if(ed.deckFilter!=='All')order=order.filter(i=>lookup(pool[i])?.data.type&(TYPE_BITS[ed.deckFilter]||0));
 const name=i=>lookup(pool[i])?.name||'';
 if(ed.deckSort==='Default')order.sort((a,b)=>frameLevelName(lookup(pool[a]),lookup(pool[b]))||a-b);
 else if(ed.deckSort==='Name')order.sort((a,b)=>name(a).localeCompare(name(b)));
 else if(ed.deckSort==='Attribute')attributeOrder(order,pool,lookup,run);
 else if(ed.deckSort==='ATK'){const attacks=new Map(order.map(i=>[i,lookup(pool[i]).data.type&1?deckStats(lookup(pool[i]),run,i,info)[0]:0]));order.sort((a,b)=>attacks.get(b)-attacks.get(a)||name(a).localeCompare(name(b))||a-b)}
 else if(['DEF','Level'].includes(ed.deckSort)){const key={DEF:'defense',Level:'level'}[ed.deckSort];order.sort((a,b)=>(lookup(pool[b])?.[key]||0)-(lookup(pool[a])?.[key]||0))}
 else if(ed.deckSort==='Newest')order.reverse();
 // Deck first keeps the chosen sort inside each group.
 if(ed.deckStatus==='First')order=[...order.filter(i=>inDeck.has(i)),...order.filter(i=>!inDeck.has(i))];
 const key=JSON.stringify([ed.deckFilter,ed.deckSort,ed.deckStatus,searches[searchKey]||null,pool.length,!!ed.deckSplit]);
 if(ed.deckOrder&&ed.deckOrderKey===key)return ed.deckOrder.filter(i=>i<pool.length);
 ed.deckOrderKey=key;ed.deckOrder=order;return order;
}

// Type tabs, search, Deck status, Sort and Deselect. `action(label, name, attrs)` makes a button for the host UI.
export function deckToolbar(ed,{searchKey,sorts,action,idPrefix}){
 return `<div class="draft-tabs deck-filter-row">${deckSearchButtons(searchKey,deckFiltered(ed))}${DECK_TYPE_TABS.map(t=>action(t==='Extra'?'Extra Deck':t,'deck-filter',`data-filter="${t}" class="${ed.deckFilter===t?'active':''}"`)).join('')}<select id="${idPrefix}-deck-status" data-draft-deck aria-label="Deck status">${DECK_STATUS_OPTIONS.map(([value,label])=>`<option value="${value}" ${ed.deckStatus===value?'selected':''}>${label}</option>`).join('')}</select><select id="${idPrefix}-deck-sort" data-draft-sort aria-label="Sort cards">${sorts.map(t=>`<option value="${t}" ${ed.deckSort===t?'selected':''}>${t}</option>`).join('')}</select>${action(deselectIcon,'deselect-all','class="deck-deselect" aria-label="Deselect all" title="Deselect all"')}<span class="deck-filter-break" aria-hidden="true"></span></div>`;
}

// The card area: one grid, or Deck and Collection panes when the screen is wide enough.
export function deckCardsArea(ed,order,selected,cardMarkup){
 if(ed.deckSplit){const inDeck=new Set(selected);return `<div class="draft-card-scroll deck-split" ${splitStyle(ed.deckSplit)}>${splitDeckMarkup(order.filter(i=>inDeck.has(i)),order.filter(i=>!inDeck.has(i)),cardMarkup,ed.deckFilter==='Extra')}</div>`}
 return `<div class="draft-card-scroll"><div class="cardgrid">${order.map(cardMarkup).join('')||(ed.deckFilter==='Extra'?'<p class="muted">No Extra Deck cards yet. Fusion Monsters you get will appear here.</p>':'')}</div></div>`;
}

// One card button with its ATK/DEF (relic-aware, like solo) and NEW marker. `attrs` carries the host's tap action.
export function deckCardButton({id,index,card,run,info,image,selected,attrs,extra=''}){
 return deckCardMarkup(`<button class="cardbtn ${selected?'selected':''}" ${attrs} data-index="${index}" data-id="${id}" aria-pressed="${selected}"><img src="${image(id)}" draggable="false" loading="lazy" alt=""><span>${esc(card?.name||'')}</span>${extra}</button>`,card,run,index,info);
}

// Search, reset and the two menus; render() redraws the editor.
export function wireDeckToolbar(root,ed,{searchKey,cards,idPrefix,render}){
 const search=root.querySelector(`[data-effect-search="${searchKey}"]`);if(search)search.onclick=()=>openSearch(searchKey,cards(),render);
 const clear=root.querySelector(`[data-effect-search-clear="${searchKey}"]`);if(clear)clear.onclick=()=>{resetDeckFilters(ed,searchKey);render()};
 const sort=root.querySelector(`#${idPrefix}-deck-sort`);if(sort)sort.onchange=()=>{ed.deckSort=sort.value;rememberDeckSort({sort:ed.deckSort});render()};
 const status=root.querySelector(`#${idPrefix}-deck-status`);if(status)status.onchange=()=>{ed.deckStatus=status.value;rememberDeckSort({status:ed.deckStatus});render()};
}

// Wide screens split into Deck and Collection panes, like solo (mobile.js checkDraftSplit). Returns true when the
// split changed and the caller must redraw.
export function updateDeckSplit(ed,host){
 const area=host?.querySelector('.draft-card-scroll');if(!area)return false;
 const total=deckSplitColumns(host,area);if(total===(ed.deckSplit||0))return false;
 ed.deckSplit=total;return true;
}
