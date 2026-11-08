import {GENRES,TYPES,CARD_GENRES} from './card-genres.js';
export {GENRES,TYPES};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tests=GENRES.map(g=>[g,g.pattern?new RegExp(g.pattern,'i'):null]);
export function genres(c){if(!c||((c.data?.type&17)===17))return [];if(CARD_GENRES[c.id])return GENRES.filter(g=>CARD_GENRES[c.id].includes(g.id));return tests.filter(([g,re])=>g.flag?!!(c.data?.type&g.flag):re.test(c.desc||'')).map(([g])=>g)}
export function typeIcon(c){const file=TYPES[String(c.race||'').replace(/[^a-z]/gi,'')];return c.data?.type&1&&file?`<img class="genre-icon" src="assets/icons/yugipedia/${file}" alt="" title="${escape(c.race)}">`:''}
export function genreIcons(c){return `<div class="effect-icons" aria-label="Effect categories">${genres(c).map(g=>`<img class="genre-icon" src="assets/icons/yugipedia/${g.icon}" alt="${escape(g.name)}" title="${escape(g.name)}">`).join('')}</div>`}
export const searches={};
export function matchesSearch(c,key){const s=searches[key]||{};if(!c)return false;const text=(c.name+' '+c.desc).toLowerCase();if(s.q&&!s.q.toLowerCase().split(/\s+/).every(w=>text.includes(w)))return false;if(s.race&&c.race!==s.race)return false;if(s.attribute&&c.attribute!==s.attribute)return false;if(s.level&&(!(c.data.type&1)||c.level!==+s.level))return false;if(!s.effects?.length)return true;const tags=genres(c).map(g=>g.id);return s.all?s.effects.every(id=>tags.includes(id)):s.effects.some(id=>tags.includes(id))}
// While filters are on, a clear button sits next to the search button so one tap resets them.
export function searchButton(key){const s=searches[key],n=s?(s.effects?.length||0)+!!s.q+!!s.race+!!s.attribute+!!s.level:0;return `<button type="button" data-effect-search="${key}" title="Search card text and effects" aria-label="Search card text and effects${n?', '+n+' filters active':''}"><img class="genre-icon" src="assets/icons/yugipedia/genres-search-deck.png" alt="">${n?`<small>${n}</small>`:''}</button>${n?`<button type="button" class="effect-search-clear" data-effect-search-clear="${key}" title="Clear filters" aria-label="Clear filters">×</button>`:''}`}
export function clearSearch(key){delete searches[key]}
// Deck editors (solo and Tag) share the deck-status dropdown, the Deselect icon and the reset button.
export const DECK_STATUS_OPTIONS=[['Any','Any card'],['In','In deck'],['Out','Not in deck'],['First','Deck first']];
export const deselectIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="6" y="3" width="12" height="17" rx="1.6"/><path d="M9 8.5l6 6M15 8.5l-6 6"/></svg>';
// Wide deck editors (2026-11-06): when Auto Deck Card Size would fit 18+ cards per row, solo and Tag split into a Deck pane
// (8 per row) and a Collection pane. Shared by mobile.js and tag-ui.js.
export const DECK_SPLIT_COLUMNS=18;
// Cards per row Auto fits across `area`, measured with an empty probe grid in `host`; auto-fill keeps empty tracks.
export function autoColumnsAcross(host,area){
 if(!host||!area)return 0;
 const probe=document.createElement('div');probe.className='cardgrid';probe.style.cssText=`position:absolute;visibility:hidden;height:0;width:${area.clientWidth}px`;host.append(probe);
 const n=getComputedStyle(probe).gridTemplateColumns.split(' ').filter(Boolean).length;probe.remove();return n;
}
// The Split Deck Editor setting (2026-11-06) also splits smaller editors, from 10 cards per row.
export const DECK_SPLIT_MIN=10;
// Cards per row the editor would show if it split, or 0 to keep one grid. Auto splits from 18 by itself; the setting
// splits any editor showing 10 or more, whether that count is the fixed Deck Card Size or what Auto fits.
export function deckSplitColumns(host,area,auto){
 const html=document.documentElement,fixed=html.hasAttribute('data-deck-columns'),total=fixed?Number(html.style?.getPropertyValue('--deck-columns'))||0:(auto??autoColumnsAcross(host,area)),chosen=html.hasAttribute('data-deck-split');
 return (chosen&&total>=DECK_SPLIT_MIN)||(!fixed&&total>=DECK_SPLIT_COLUMNS)?total:0;
}
// The Deck side shows 5 per row (8 from 18) and the Collection side the rest, so cards are the same size in both panes.
export function splitStyle(total){const deck=total>=DECK_SPLIT_COLUMNS?8:5,rest=Math.max(1,total-deck);return `style="grid-template-columns:minmax(0,${deck}fr) minmax(0,${rest}fr);--split-deck:${deck};--split-rest:${rest}"`}
export function splitDeckMarkup(deck,rest,cardMarkup,extraTab){
 const pane=(kind,title,list,empty)=>`<section class="deck-split-pane ${kind}"><h3>${title} <span>${list.length}</span></h3><div class="deck-split-scroll"><div class="cardgrid">${list.map(cardMarkup).join('')||`<p class="muted">${empty}</p>`}</div></div></section>`;
 return pane('deck-pane','Deck',deck,'Tap a card in your collection to add it.')+pane('collection-pane','Collection',rest,extraTab?'No Extra Deck cards to add.':'Every card is in your deck.');
}
// Scroll positions of every deck scroller in `root` (one grid, or both split panes), so a redraw can put them back.
const deckScrollers=root=>[...(root?.querySelectorAll('.deck-split-scroll')||[])].concat(root?.querySelector('.draft-card-scroll:not(.deck-split)')||[]);
export const saveDeckScroll=root=>deckScrollers(root).map(s=>s.scrollTop);
export function restoreDeckScroll(root,saved){if(!saved?.length)return;deckScrollers(root).forEach((s,k)=>{if(saved[k]!==undefined)s.scrollTop=saved[k]})}
// The × also shows when tab, sort or deck status differ from the default; its handler resets those too.
export function deckSearchButtons(key,filtered){const search=searchButton(key);return search.includes('effect-search-clear')||!filtered?search:search+`<button type="button" class="effect-search-clear" data-effect-search-clear="${key}" title="Reset filters" aria-label="Reset filters">×</button>`}
export function openSearch(key,cards,onApply){
 const s=structuredClone(searches[key]||{effects:[]}),d=document.createElement('dialog');d.className='effect-search';
 const options=(values,value)=>'<option value="">—</option>'+values.map(v=>`<option ${v===value?'selected':''}>${escape(v)}</option>`).join('');
 d.innerHTML=`<form method="dialog"><header><input name="q" aria-label="Search names and effect text" placeholder="Search names / effect text" value="${escape(s.q)}"><button value="cancel" aria-label="Close">×</button></header><div class="search-fields"><select name="race" title="Monster Type" aria-label="Monster Type">${options([...new Set(cards.filter(c=>c.data.type&1).map(c=>c.race))].sort(),s.race)}</select><select name="attribute" title="Attribute" aria-label="Attribute">${options(['EARTH','WATER','FIRE','WIND','LIGHT','DARK','DIVINE'],s.attribute)}</select><select name="level" title="Level" aria-label="Level">${options(Array.from({length:12},(_,i)=>String(i+1)),s.level)}</select><select name="match" aria-label="Match effect categories"><option value="any">Any selected</option><option value="all" ${s.all?'selected':''}>All selected</option></select></div><div class="effect-icon-grid">${GENRES.map(g=>`<button type="button" data-genre="${g.id}" title="${escape(g.name)}" aria-label="${escape(g.name)}" aria-pressed="${s.effects.includes(g.id)}"><img src="assets/icons/yugipedia/${g.icon}" alt=""></button>`).join('')}</div><footer><output></output><button type="button" data-reset>Reset</button><button value="apply">Apply</button></footer></form>`;
 const form=d.querySelector('form');const read=()=>({...Object.fromEntries(new FormData(form)),all:form.elements.match.value==='all',effects:[...s.effects]});
 const count=()=>{const old=searches[key];searches[key]=read();d.querySelector('output').textContent=cards.filter(c=>matchesSearch(c,key)).length+' cards';searches[key]=old};
 d.addEventListener('click',e=>{const b=e.target.closest('[data-genre]');if(b){const id=b.dataset.genre;s.effects=s.effects.includes(id)?s.effects.filter(x=>x!==id):[...s.effects,id];b.setAttribute('aria-pressed',String(s.effects.includes(id)));count()}if(e.target.closest('[data-reset]')){form.reset();for(const k of ['q','race','attribute','level'])form.elements[k].value='';form.elements.match.value='any';s.effects=[];d.querySelectorAll('[data-genre]').forEach(b=>b.setAttribute('aria-pressed','false'));count()}});
 form.addEventListener('input',count);d.addEventListener('close',()=>{if(d.returnValue==='apply'){searches[key]=read();onApply()}d.remove()});document.body.append(d);d.showModal();count();
}
