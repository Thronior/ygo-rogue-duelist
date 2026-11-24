import {GENRES,TYPES,CARD_GENRES} from './card-genres.js';
import {pagedGrid} from './deck-paging.js';
import {isRandomId} from './collector-rules.js';
import {cardMark} from './card-marks.js';
import {cardMatchesQuery} from './i18n.js';
export {GENRES,TYPES};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tests=GENRES.map(g=>[g,g.pattern?new RegExp(g.pattern,'i'):null]);
// Every Fusion Monster is tagged Fusion support and every Equip Spell Equip cards from its type bits (user, 2026-11-24),
// whatever the hand list or the (maybe translated) text says, so custom and randomized cards can't miss them.
const FUSION=1|0x40,EQUIP=2|0x40000,byType=t=>(t&FUSION)===FUSION?'fusion-material':(t&EQUIP)===EQUIP?'equip':'';
export function genres(c){if(!c||((c.data?.type&17)===17))return [];const t=c.data?.type|0,own=byType(t),ids=CARD_GENRES[c.id];if(ids)return GENRES.filter(g=>g.id===own||ids.includes(g.id));return tests.filter(([g,re])=>g.id===own||(g.flag?!!(t&g.flag):re.test(c.desc||''))).map(([g])=>g)}
export function typeIcon(c){const file=TYPES[String(c.race||'').replace(/[^a-z]/gi,'')];return c.data?.type&1&&file?`<img class="genre-icon" src="assets/icons/yugipedia/${file}" alt="" title="${escape(c.race)}">`:''}
export function genreIcons(c){return `<div class="effect-icons" aria-label="Effect categories">${genres(c).map(g=>`<img class="genre-icon" src="assets/icons/yugipedia/${g.icon}" alt="${escape(g.name)}" title="${escape(g.name)}">`).join('')}</div>`}
// Level filter: single Levels plus ranges by Tribute count ("1-4" none, "5-6" one, "7-8" and "9-12" two or more).
// Values are "N" or "lo-hi"; monsters only, like the single Levels.
export const LEVEL_RANGES=[[1,4],[5,6],[7,8],[9,12]];
export const LEVEL_FILTERS=[...LEVEL_RANGES.map(([a,b])=>[`${a}-${b}`,`Levels ${a}-${b}`]),...Array.from({length:12},(_,i)=>[String(i+1),`Level ${i+1}`])];
const levelBounds=new Map();
export function inLevel(c,value){if(!(c.data.type&1))return false;let b=levelBounds.get(value);if(!b){const [lo,hi=lo]=String(value).split('-').map(Number);levelBounds.set(value,b=[lo,hi])}return c.level>=b[0]&&c.level<=b[1]}
export const searches={};
// ★ and ? in the search window (user, 2026-11-20, for CITYDRIVER's Favourites and Nori's randomized-cards asks): cards
// marked ★ Yes, and randomized (rainbow) cards. Marks live in a run, so a deck editor names its run with searchMarks.
const markRuns={};
export function searchMarks(key,run){markRuns[key]=run}
const FLAGS=[['marked','★','Marked Yes'],['random','?','Randomized only']];
export function matchesSearch(c,key){const s=searches[key]||{};if(!c)return false;if(s.random&&!isRandomId(c.id))return false;if(s.marked&&cardMark(markRuns[key]?.(),c.id)!==1)return false;if(s.q&&!cardMatchesQuery(c,s.q))return false;if(s.race&&c.race!==s.race)return false;if(s.attribute&&c.attribute!==s.attribute)return false;if(s.level&&!inLevel(c,s.level))return false;if(!s.effects?.length)return true;const tags=genres(c).map(g=>g.id);return s.all?s.effects.every(id=>tags.includes(id)):s.effects.some(id=>tags.includes(id))}
// While filters are on, a clear button sits next to the search button so one tap resets them.
export function searchButton(key){const s=searches[key],n=s?(s.effects?.length||0)+!!s.q+!!s.race+!!s.attribute+!!s.level+!!s.marked+!!s.random:0;return `<button type="button" data-effect-search="${key}" title="Search card text and effects" aria-label="Search card text and effects${n?', '+n+' filters active':''}"><img class="genre-icon" src="assets/icons/yugipedia/genres-search-deck.png" alt="">${n?`<small>${n}</small>`:''}</button>${n?`<button type="button" class="effect-search-clear" data-effect-search-clear="${key}" title="Clear filters" aria-label="Clear filters">×</button>`:''}`}
export function clearSearch(key){delete searches[key]}
// Deck editors (solo and Tag) share the deck-status dropdown, the Deselect icon and the reset button.
export const DECK_STATUS_OPTIONS=[['Any','Any card'],['In','In deck'],['Out','Not in deck'],['First','Deck first'],['Marked','Marked first']];
// Marked first (user, 2026-11-17): ★ cards, then unmarked ones, then ✕, each group in the chosen sort. Draft Duels have
// no marks, so their editor leaves it out.
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
// `page` ({id, key, after}) draws each pane in pages (deck-paging.js).
// counts: the real card counts when stacks fold copies into one tile (Discord, 2026-11-17: "Deck 10" for 12 cards).
export function splitDeckMarkup(deck,rest,cardMarkup,extraTab,page=null,counts=null,isExtra=null){
 const tiles=(kind,list)=>page?pagedGrid(`${page.id}-${kind}`,page.key,list,cardMarkup,page.after):list.map(cardMarkup).join('');
 const pane=(kind,title,list,empty)=>`<section class="deck-split-pane ${kind}"><h3>${title} <span>${counts?.[kind]??list.length}</span></h3><div class="deck-split-scroll"><div class="cardgrid">${tiles(kind,list)||`<p class="muted">${empty}</p>`}</div></div></section>`;
 const collection=pane('collection-pane','Collection',rest,extraTab?'No Extra Deck cards to add.':'Every card is in your deck.');
 // The Extra Deck in its own pane under the Deck (Nori, user 2026-11-24), while any Extra Deck card is shown.
 const extra=isExtra?deck.filter(isExtra):[];
 if(!isExtra||!extra.length&&!rest.some(isExtra))return pane('deck-pane','Deck',deck,'Tap a card in your collection to add it.')+collection;
 return `<div class="deck-split-side">${pane('deck-pane','Deck',deck.filter(i=>!isExtra(i)),'Tap a card in your collection to add it.')}${pane('deck-extra-pane','Extra Deck',extra,'Tap a Fusion Monster in your collection to add it.')}</div>`+collection;
}
// Fusion, Synchro, Xyz and Link: the cards the split's Extra Deck pane holds.
export const EXTRA_DECK_TYPES=0x40|0x2000|0x800000|0x4000000;
export const isExtraDeckCard=c=>!!((c?.data?.type|0)&EXTRA_DECK_TYPES);
// Real counts per pane when stacks fold copies into one tile; `deck` and `rest` are the unfolded lists.
export function splitCounts(deck,rest,isExtra){let n=0;for(const i of deck)if(isExtra(i))n++;return {'deck-pane':deck.length-n,'deck-extra-pane':n,'collection-pane':rest.length}}
// Scroll positions of every deck scroller in `root` (one grid, or both split panes), so a redraw can put them back.
const deckScrollers=root=>[...(root?.querySelectorAll('.deck-split-scroll')||[])].concat(root?.querySelector('.draft-card-scroll:not(.deck-split)')||[]);
// Keyed by pane, so the Extra Deck pane coming or going doesn't hand one pane's position to another.
const scrollKeys=list=>{const seen={};return list.map(s=>{const k=s.closest?.('.deck-split-pane')?.classList?.[1]||'grid';seen[k]=(seen[k]||0)+1;return k+'#'+seen[k]})};
export const saveDeckScroll=root=>{const list=deckScrollers(root),keys=scrollKeys(list);return list.map((s,k)=>[keys[k],s.scrollTop])};
export function restoreDeckScroll(root,saved){if(!saved?.length)return;const at=new Map(saved),list=deckScrollers(root),keys=scrollKeys(list);list.forEach((s,k)=>{const top=at.get(keys[k]);if(top!==undefined)s.scrollTop=top})}
// The × also shows when tab, sort or deck status differ from the default; its handler resets those too.
export function deckSearchButtons(key,filtered){const search=searchButton(key);return search.includes('effect-search-clear')||!filtered?search:search+`<button type="button" class="effect-search-clear" data-effect-search-clear="${key}" title="Reset filters" aria-label="Reset filters">×</button>`}
export const LIVE_SEARCH_MS=300;
export function openSearch(key,cards,onApply){
 const s=structuredClone(searches[key]||{effects:[]}),d=document.createElement('dialog');d.className='effect-search';
 const options=(values,value)=>'<option value="">—</option>'+values.map(v=>`<option value="${escape(v)}" ${v===value?'selected':''}>${escape(v)}</option>`).join('');
 d.innerHTML=`<form method="dialog"><header><input name="q" aria-label="Search names and effect text" placeholder="Search names / effect text" value="${escape(s.q)}"><button value="cancel" aria-label="Close">×</button></header><div class="search-fields"><select name="race" title="Monster Type" aria-label="Monster Type">${options([...new Set(cards.filter(c=>c.data.type&1).map(c=>c.race))].sort(),s.race)}</select><select name="attribute" title="Attribute" aria-label="Attribute">${options(['EARTH','WATER','FIRE','WIND','LIGHT','DARK','DIVINE'],s.attribute)}</select><select name="level" title="Level" aria-label="Level"><option value="">—</option>${LEVEL_FILTERS.map(([v,label])=>`<option value="${v}" ${v===s.level?'selected':''}>${label}</option>`).join('')}</select><select name="match" aria-label="Match effect categories"><option value="any">Any selected</option><option value="all" ${s.all?'selected':''}>All selected</option></select></div><div class="effect-icon-grid">${FLAGS.filter(([f])=>s[f]||(f==='marked'?!!markRuns[key]?.():cards.some(c=>isRandomId(c.id)))).map(([f,sym,label])=>`<button type="button" class="search-flag" data-search-flag="${f}" title="${label}" aria-label="${label}" aria-pressed="${!!s[f]}"><span aria-hidden="true">${sym}</span></button>`).join('')}${GENRES.map(g=>`<button type="button" data-genre="${g.id}" title="${escape(g.name)}" aria-label="${escape(g.name)}" aria-pressed="${s.effects.includes(g.id)}"><img src="assets/icons/yugipedia/${g.icon}" alt=""></button>`).join('')}</div><footer><output></output><button type="button" data-reset>Reset</button><button value="apply">Apply</button></footer></form>`;
 const form=d.querySelector('form');const read=()=>({...Object.fromEntries(new FormData(form)),all:form.elements.match.value==='all',effects:[...s.effects],marked:!!s.marked,random:!!s.random});
 // Live search (CITYDRIVER, user 2026-11-24): the cards behind the window follow it as you type or tap, LIVE_SEARCH_MS
 // after the last change so a big collection is not filtered and drawn on every letter. Closing it any way keeps what
 // is shown; an unchanged search draws nothing.
 let live=0,shown='';
 const apply=()=>{clearTimeout(live);live=0;const next=read(),text=JSON.stringify(next);if(text===shown)return;shown=text;searches[key]=next;onApply()};
 const count=()=>{const old=searches[key];searches[key]=read();d.querySelector('output').textContent=cards.filter(c=>matchesSearch(c,key)).length+' cards';searches[key]=old;if(shown){clearTimeout(live);live=setTimeout(apply,LIVE_SEARCH_MS)}};
 d.addEventListener('click',e=>{const flag=e.target.closest('[data-search-flag]');if(flag){const f=flag.dataset.searchFlag;s[f]=!s[f];flag.setAttribute('aria-pressed',String(s[f]));count()}const b=e.target.closest('[data-genre]');if(b){const id=b.dataset.genre;s.effects=s.effects.includes(id)?s.effects.filter(x=>x!==id):[...s.effects,id];b.setAttribute('aria-pressed',String(s.effects.includes(id)));count()}if(e.target.closest('[data-reset]')){form.reset();for(const k of ['q','race','attribute','level'])form.elements[k].value='';form.elements.match.value='any';s.effects=[];s.marked=s.random=false;d.querySelectorAll('[data-genre],[data-search-flag]').forEach(b=>b.setAttribute('aria-pressed','false'));count()}});
 // Enter in the text box applies the search (user, 2026-11-18). Without this the form's first button, the × close,
 // took the Enter and closed the window without applying. Not while an IME is still composing (Japanese, Chinese, Korean).
 form.elements.q.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();d.close('apply')}});
 form.addEventListener('input',e=>{if(!e.isComposing)count()});d.addEventListener('close',()=>{apply();d.remove()});document.body.append(d);d.showModal();count();shown=JSON.stringify(read());
}
