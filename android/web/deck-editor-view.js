// Deck editor pieces shared by Tag (tag-ui.js) and Draft Duels (draft-ui.js), with the same behaviour as solo
// (mobile.js renderDraft): type tabs, effect search, Deck status, Sort, Deselect, ATK/DEF on monsters, and the
// wide-screen Deck + Collection split. The editor object holds its state in deckFilter, deckSort, deckStatus,
// deckSplit, deckOrder and deckOrderKey; Sort and Deck status are remembered per device (deck-sort-preference.js).
import {frameLevelName,deckCardMarkup,deckStats,attributeOrder} from './feedback-ui.js';
import {searches,matchesSearch,openSearch,clearSearch,DECK_STATUS_OPTIONS,deselectIcon,deckSearchButtons,splitDeckMarkup,splitStyle,deckSplitColumns,isExtraDeckCard,splitCounts} from './card-search.js';
import {DEFAULT_DECK_SORT,DEFAULT_DECK_STATUS,rememberDeckSort} from './deck-sort-preference.js';
import {stacksOn,groupStacks,stackButton} from './deck-stacks.js';
import {pagedGrid} from './deck-paging.js';
import {cardMarkVersion,noMarksLast,yesMarksFirst} from './card-marks.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const DECK_TYPE_TABS=['All','Monster','Spell','Trap','Extra'];
const TYPE_BITS={Monster:1,Spell:2,Trap:4,Extra:64};

export const deckFiltered=ed=>ed.deckFilter!=='All'||ed.deckSort!==DEFAULT_DECK_SORT||ed.deckStatus!==DEFAULT_DECK_STATUS;
// After a duel only the type tab and the search reset; the reset button (all) also restores the default Sort and Deck status.
export function resetDeckFilters(ed,searchKey,all=true){ed.deckFilter='All';clearSearch(searchKey);if(all){ed.deckSort=DEFAULT_DECK_SORT;ed.deckStatus=DEFAULT_DECK_STATUS;rememberDeckSort({sort:ed.deckSort,status:ed.deckStatus})}}

// Pool indices in display order. A tap keeps every card in place; the order refreshes only when type, sort, status,
// search, the pool or the split changes.
export function deckOrder(ed,{pool,selected,lookup,run,info,searchKey}){
 // Checked first, so a tap on a 9,000-card collection doesn't filter and sort it all again.
 // Card marks (card-marks.js) reorder the cards but keep the page count (deck-paging.js), so they key only the order.
 const base=JSON.stringify([ed.deckFilter,ed.deckSort,ed.deckStatus,searches[searchKey]||null,pool.length,!!ed.deckSplit]),key=base+'|'+cardMarkVersion(run);
 ed.deckPageKey=base;
 // The split's Extra Deck pane (deckCardsArea) reads the pool through this.
 ed.deckIsExtra=i=>isExtraDeckCard(lookup(pool[i]));
 // The pool's contents and the relics (ATK/DEF sorts read relic-adjusted stats) are part of the cache too: Draft rebuilds
 // its pool at the same size, and a new relic moves cards, which left just-added cards unsorted at the bottom (Nori,
 // 2026-11-21). One pass over the ids (hosts rebuild the array each render, so identity can't be used); still far cheaper
 // than filtering and sorting again.
 let h=pool.length|0;for(const id of pool)h=Math.imul(h^(Number(id)|0),16777619);
 const contents=h+'|'+(run?.artifacts||[]).join(',')+'|'+(run?.curses||[]).join(',');
 if(ed.deckOrder&&ed.deckOrderKey===key&&ed.deckOrderContents===contents)return ed.deckOrder.filter(i=>i<pool.length);
 let order=pool.map((_,i)=>i).filter(i=>matchesSearch(lookup(pool[i]),searchKey));
 const inDeck=new Set(selected);
 // The split shows both groups side by side, so In/Out only filter the single grid.
 if(!ed.deckSplit&&(ed.deckStatus==='In'||ed.deckStatus==='Out'))order=order.filter(i=>inDeck.has(i)===(ed.deckStatus==='In'));
 if(ed.deckFilter!=='All')order=order.filter(i=>lookup(pool[i])?.data.type&(TYPE_BITS[ed.deckFilter]||0));
 const name=i=>lookup(pool[i])?.name||'';
 if(ed.deckSort==='Default')order.sort((a,b)=>frameLevelName(lookup(pool[a]),lookup(pool[b]))||a-b);
 else if(ed.deckSort==='Name')order.sort((a,b)=>name(a).localeCompare(name(b)));
 // As solo's Type sort (mobile.js draftSortedFresh): Monsters, Spells, Traps, then by Type (Spell/Trap: their kind) and name.
 // Tag had no Type sort (bug report, 2026-11-25).
 else if(ed.deckSort==='Type'){const cat=c=>c?.data.type&1?0:c?.data.type&2?1:c?.data.type&4?2:3,sub=c=>String(c?.race||'');order.sort((a,b)=>{const x=lookup(pool[a]),y=lookup(pool[b]);return cat(x)-cat(y)||sub(x).localeCompare(sub(y))||name(a).toLowerCase().localeCompare(name(b).toLowerCase())||a-b})}
 else if(ed.deckSort==='Attribute')attributeOrder(order,pool,lookup,run);
 else if(ed.deckSort==='ATK'){const attacks=new Map(order.map(i=>[i,lookup(pool[i]).data.type&1?deckStats(lookup(pool[i]),run,i,info)[0]:0]));order.sort((a,b)=>attacks.get(b)-attacks.get(a)||name(a).localeCompare(name(b))||a-b)}
 else if(ed.deckSort==='DEF')order.sort((a,b)=>(lookup(pool[b])?.defense||0)-(lookup(pool[a])?.defense||0));
 // Same Level: highest ATK first (Septarium, 2026-11-16).
 else if(ed.deckSort==='Level'){const atk=i=>{const c=lookup(pool[i]);return c?.data.type&1?deckStats(c,run,i,info)[0]:-1},attacks=new Map(order.map(i=>[i,atk(i)]));order.sort((a,b)=>(lookup(pool[b])?.level||0)-(lookup(pool[a])?.level||0)||attacks.get(b)-attacks.get(a)||name(a).localeCompare(name(b))||a-b)}
 else if(ed.deckSort==='Newest')order.reverse();
 order=noMarksLast(order,run,i=>pool[i]);
 // Deck first keeps the chosen sort inside each group.
 if(ed.deckStatus==='First')order=[...order.filter(i=>inDeck.has(i)),...order.filter(i=>!inDeck.has(i))];
 else if(ed.deckStatus==='Marked')order=yesMarksFirst(order,run,i=>pool[i]);
 ed.deckOrderKey=key;ed.deckOrder=order;ed.deckOrderContents=contents;return order;
}

// Type tabs, search, Deck status, Sort and Deselect. `action(label, name, attrs)` makes a button for the host UI.
export function deckToolbar(ed,{searchKey,sorts,action,idPrefix}){
 return `<div class="draft-tabs deck-filter-row">${deckSearchButtons(searchKey,deckFiltered(ed))}${DECK_TYPE_TABS.map(t=>action(t==='Extra'?'Extra Deck':t,'deck-filter',`data-filter="${t}" class="${ed.deckFilter===t?'active':''}"`)).join('')}<select id="${idPrefix}-deck-status" data-draft-deck aria-label="Deck status">${DECK_STATUS_OPTIONS.filter(([value])=>value!=='Marked'||!ed.isDraft).map(([value,label])=>`<option value="${value}" ${ed.deckStatus===value?'selected':''}>${label}</option>`).join('')}</select><select id="${idPrefix}-deck-sort" data-draft-sort aria-label="Sort cards">${sorts.map(t=>`<option value="${t}" ${ed.deckSort===t?'selected':''}>${t}</option>`).join('')}</select>${action(deselectIcon,'deselect-all','class="deck-deselect" aria-label="Deselect all" title="Deselect all"')}<span class="deck-filter-break" aria-hidden="true"></span></div>`;
}

// The card area: one grid, or Deck and Collection panes when the screen is wide enough.
// `stack` ({run, attr, extra, locked}) collapses copies when the player stacks them (deck-stacks.js).
export function deckCardsArea(ed,order,selected,cardMarkup,stack=null){
 // Big collections draw in pages (deck-paging.js); the page count holds while the order does.
 const inDeck=new Set(selected),on=stack&&stacksOn(),page={id:'shared-editor',key:`${ed.deckPageKey??ed.deckOrderKey}|${!!on}`};
 if(ed.deckSplit){let deckSide=order.filter(i=>inDeck.has(i)),rest=order.filter(i=>!inDeck.has(i)),markup=cardMarkup;const isExtra=ed.deckIsExtra||null,counts=isExtra?splitCounts(deckSide,rest,isExtra):{'deck-pane':deckSide.length,'collection-pane':rest.length};
  if(on){const a=groupStacks(deckSide,stack.run,selected,stack.limit),b=groupStacks(rest,stack.run,selected,stack.limit);deckSide=a.order;rest=b.order;markup=i=>stackButton(cardMarkup(i),a.stack(i)||b.stack(i),{...stack,pane:inDeck.has(i)?'deck':'collection'})}
  return `<div class="draft-card-scroll deck-split" ${splitStyle(ed.deckSplit)}>${splitDeckMarkup(deckSide,rest,markup,ed.deckFilter==='Extra',page,counts,isExtra)}</div>`}
 let cards;if(on){const s=groupStacks(order,stack.run,selected,stack.limit);cards=pagedGrid(page.id,page.key,s.order,i=>stackButton(cardMarkup(i),s.stack(i),stack))}else cards=pagedGrid(page.id,page.key,order,cardMarkup);
 return `<div class="draft-card-scroll"><div class="cardgrid">${cards||(ed.deckFilter==='Extra'?'<p class="muted">No Extra Deck cards yet. Fusion Monsters you get will appear here.</p>':'')}</div></div>`;
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
