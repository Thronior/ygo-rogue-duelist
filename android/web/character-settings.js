// Character settings (itch.io request, user 2026-11-18): each character keeps a list of saved card marks (★ 1, ✕ -1)
// that every new run of that character starts with, and a switch that also saves marks set during a run.
// Opened from the gear on the character select portrait, and from the Character tab of Settings during a duel.
// The data lives in settings.json (storage.character_settings). Since 2026-11-21 (magna98) each character also keeps its own
// favourite packs (row.packs), which replaced the one device-wide settings.favoritePacks list.
import {MARKS} from './card-marks.js';
import {markAllMarkup} from './mark-all.js';
import {cardMatchesQuery} from './i18n.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const PAGE=48;

export function characterSettings(settings,index){
 const row=settings?.characterSettings?.[String(index)];
 return {marks:{...(row?.marks||{})},keepRunMarks:!!row?.keepRunMarks,packs:Array.isArray(row?.packs)?row.packs.filter(id=>typeof id==='string'):[]};
}
function store(settings,index,row){
 const all={...(settings.characterSettings||{})};
 if(!row.packs?.length)delete row.packs;
 if(Object.keys(row.marks).length||row.keepRunMarks||row.packs)all[String(index)]=row;else delete all[String(index)];
 settings.characterSettings=all;
}
export function setSavedMark(settings,index,id,mark){
 const row=characterSettings(settings,index);
 if(mark)row.marks[String(id)]=mark;else delete row.marks[String(id)];
 store(settings,index,row);
}
export function setKeepRunMarks(settings,index,on){const row=characterSettings(settings,index);row.keepRunMarks=!!on;store(settings,index,row)}
export function clearSavedMarks(settings,index){const row=characterSettings(settings,index);row.marks={};store(settings,index,row)}
export const savedMark=(settings,index,id)=>Number(characterSettings(settings,index).marks[String(id)]||0);

// Favourite packs per character (magna98, user 2026-11-21).
export const packsFor=(settings,index)=>characterSettings(settings,index).packs;
export function setPackFavourite(settings,index,id,on){
 const row=characterSettings(settings,index),has=row.packs.includes(id);
 if(on&&!has)row.packs=[...row.packs,id].slice(-300);else if(!on&&has)row.packs=row.packs.filter(x=>x!==id);else return;
 store(settings,index,row);
}
// Every pack any character has starred (Collection shows a star for these).
export function allFavouritePacks(settings){const out=new Set();for(const row of Object.values(settings?.characterSettings||{}))for(const id of Array.isArray(row?.packs)?row.packs:[])if(typeof id==='string')out.add(id);return [...out]}
export const favouriteCharacters=(settings,id,characters)=>characters.filter(i=>packsFor(settings,i).includes(id));
// Once: the old device-wide stars become every playable character's favourites. Returns true when settings changed.
export function migrateFavouritePacks(settings,characters){
 const old=Array.isArray(settings?.favoritePacks)?settings.favoritePacks.filter(id=>typeof id==='string'):[];
 if(!old.length||!characters?.length)return false;
 for(const i of characters)for(const id of old)setPackFavourite(settings,i,id,true);
 settings.favoritePacks=[];return true;
}

// The pane shown in the character's settings window and in the duel's Character tab.
export function characterPane(settings,index,name,packName=id=>id){
 const {marks,keepRunMarks,packs}=characterSettings(settings,index),values=Object.values(marks);
 const yes=values.filter(v=>v===1).length,no=values.filter(v=>v===-1).length;
 return `<div class="character-settings" data-char-index="${index}"><h3>${esc(name)}</h3>
<label class="set-row"><span class="set-text"><b>Save marks from runs</b><small>★ and ✕ you set during a run are also saved for this character's next runs.</small></span><input type="checkbox" class="switch" data-char-keep-marks="${index}" ${keepRunMarks?'checked':''}></label>
<div class="set-row char-marks-row"><span class="set-text"><b>Saved card marks</b><small>Every new run with this character starts with these marks. You can still change them during the run.</small><small class="char-marks-count"><span class="char-mark-sample yes">★</span> ${yes} <span class="char-mark-sample no">✕</span> ${no}</small></span><span class="char-marks-actions"><button type="button" data-do="char-marks-edit" data-char-index="${index}">Edit card marks</button>${yes||no?`<button type="button" data-do="char-marks-clear" data-char-index="${index}">Clear</button>`:''}</span></div>
<div class="set-row char-packs-row"><span class="set-text"><b>Favourite packs</b><small>Packs starred for this character go first on its shop shelf. Star them in the shop or in Collection.</small></span>${packs.length?`<span class="char-fav-packs">${packs.map(id=>`<img class="char-fav-pack" loading="lazy" src="assets/packs/${esc(id)}.jpg" alt="${esc(packName(id))}" title="${esc(packName(id))}">`).join('')}</span>`:'<small class="muted">None yet.</small>'}</div></div>`;
}

// The card marks editor: every card in the game, searchable, filtered by mark, a page at a time.
export function editorCards(cards,settings,index,{query='',filter='all'}={}){
 const q=query.trim().toLowerCase(),marks=characterSettings(settings,index).marks;
 return cards.filter(c=>{
  const m=Number(marks[String(c.id)]||0);
  if(filter==='yes'&&m!==1||filter==='no'&&m!==-1||filter==='marked'&&!m)return false;
  return !q||cardMatchesQuery(c,q);
 });
}
export function editorGrid(list,settings,index,page,image){
 const pages=Math.max(1,Math.ceil(list.length/PAGE)),p=Math.min(Math.max(0,page),pages-1);
 const tiles=list.slice(p*PAGE,p*PAGE+PAGE).map(c=>{const m=savedMark(settings,index,c.id),[cls,sym,label]=MARKS[m];
  return `<button type="button" class="char-mark-tile ${m===-1?'marked-no':''}" data-char-mark="${c.id}" aria-label="${esc(c.name)}: ${label}" title="${esc(c.name)}"><img loading="lazy" src="${image(c.id)}" alt=""><i class="card-mark ${cls}" aria-hidden="true">${sym}</i><span>${esc(c.name)}</span></button>`}).join('');
 return {page:p,pages,html:`<div class="char-marks-grid">${tiles||'<p class="muted">No cards match.</p>'}</div><div class="char-marks-pager"><button type="button" data-do="char-marks-page" data-step="-1" ${p?'':'disabled'} aria-label="Previous page">‹</button><span>${p+1} / ${pages} · ${list.length.toLocaleString()} cards</span><button type="button" data-do="char-marks-page" data-step="1" ${p<pages-1?'':'disabled'} aria-label="Next page">›</button></div>`};
}
// Card source (user, 2026-11-18): the whole collection or one pack, the character's starting packs listed first.
// character: {starting_packs, pack, alternate:{starting_packs}}; packs: [{id,name,common,rare}].
export function packSources(character,packs){
 const byId=new Map(packs.map(p=>[p.id,p]));
 const start=[...new Set([...(character?.starting_packs||[]),...(character?.alternate?.starting_packs||[]),character?.pack].filter(id=>byId.has(id)))];
 const rest=packs.filter(p=>!start.includes(p.id)).sort((a,b)=>a.name.localeCompare(b.name));
 return {start:start.map(id=>byId.get(id)),rest};
}
// The cards of one pack, by name; ids the card list does not know are skipped.
export function packCards(pack,cardsById){
 return [...new Set([...(pack?.rare||[]),...(pack?.common||[])])].map(id=>cardsById.get(Number(id))).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
}
export function editorMarkup(index,{query='',filter='all',source='all'}={},sources={start:[],rest:[]}){
 const opt=(v,label)=>`<option value="${v}" ${filter===v?'selected':''}>${label}</option>`;
 const pack=p=>`<option value="${esc(p.id)}" ${source===p.id?'selected':''}>${esc(p.name)}</option>`;
 const from=`<select data-char-marks-source aria-label="Cards from"><option value="all" ${source==='all'?'selected':''}>Entire collection</option>${sources.start.length?`<optgroup label="Starting packs">${sources.start.map(pack).join('')}</optgroup>`:''}${sources.rest.length?`<optgroup label="Packs">${sources.rest.map(pack).join('')}</optgroup>`:''}</select>`;
 return `<div class="char-marks-editor" data-char-index="${index}"><p class="muted">Tap a card to cycle ☆ → ★ → ✕.</p><div class="char-marks-tools">${from}<input type="search" data-char-marks-search value="${esc(query)}" placeholder="Search cards" aria-label="Search cards"><select data-char-marks-filter aria-label="Show">${opt('all','All cards')}${opt('marked','Marked')}${opt('yes','★ only')}${opt('no','✕ only')}</select>${markAllMarkup()}</div><div class="char-marks-body"></div><div class="char-marks-back"><button type="button" data-do="char-marks-back" data-char-index="${index}">Back</button></div></div>`;
}
