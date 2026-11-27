// Clickable card text (user's idea, 2026-11-16). In the inspection window, the effect text's monster Types, Attributes,
// "Level N" and quoted names become links while a deck editor or the Collection is behind the window. A tap closes the
// window and sets that screen's search (card-search.js) to the link. Links only get a dotted underline: keyword
// highlights in card text were turned down on 2026-11-03.
// i18n.js translates whole text nodes and links split them, so the text is translated here and marked data-no-i18n.
// Terms are matched in the shown language; the search always gets the English value it filters by.
import {t,currentLanguage} from './i18n.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const ATTRIBUTES=['EARTH','WATER','FIRE','WIND','LIGHT','DARK','DIVINE'];
// Quote pairs used by the 9 languages' card texts.
const QUOTES=[['"','"'],['“','”'],['„','“'],['«','»'],['「','」'],['『','』']];
let cache=null;

function build(content){
 const lang=currentLanguage();
 if(cache?.lang===lang&&cache.content===content)return cache;
 const races=[...new Set(content.cards.filter(c=>c.data?.type&1&&c.race).map(c=>c.race))];
 const terms=new Map();
 for(const r of races)terms.set(t(r),['race',r]);
 for(const a of ATTRIBUTES)terms.set(t(a),['attribute',a]);
 // Quoted names map back to the English card or archetype name the search reads.
 const names=new Map();
 for(const c of content.cards)names.set(t(c.name),c.name);
 for(const a of content.archetypes||[])if(!names.has(t(a.name)))names.set(t(a.name),a.name);
 // Chinese, Japanese and Korean words run together, so those languages match without word edges.
 const cjk=['ja','ko','zh'].includes(lang),before=cjk?'':'(?<![\\p{L}\\p{N}-])',after=cjk?'':'(?![\\p{L}\\p{N}])';
 const words=[...terms.keys()].filter(Boolean).sort((a,b)=>b.length-a.length).map(reEsc).join('|');
 const quoted=QUOTES.map(([o,c])=>`${reEsc(o)}\\s?([^${reEsc(c)}${reEsc(o)}\\n]{2,60}?)\\s?${reEsc(c)}`).join('|');
 const re=new RegExp(`(${quoted})|${before}${reEsc(t('Level'))}\\s?(\\d{1,2})${after}|${before}(${words})${after}`,'gu');
 return cache={lang,content,terms,names,re,quotes:QUOTES.length};
}

// Effect text as HTML: translated, escaped, with links. `linked` false gives the plain translated text.
export function cardTextHtml(text,content,linked){
 const shown=t(text);
 if(!linked||!content?.cards)return esc(shown);
 const {terms,names,re,quotes}=build(content);
 let out='',last=0;
 for(const m of shown.matchAll(re)){
  let kind,value,label=m[0];
  if(m[1]!==undefined){const name=m.slice(2,2+quotes).find(x=>x!==undefined);kind='name';value=names.get(name)??name}
  else if(m[2+quotes]!==undefined){kind='level';value=m[2+quotes]}
  else{[kind,value]=terms.get(m[3+quotes])||[];if(!kind)continue}
  out+=esc(shown.slice(last,m.index))+`<a href="#" class="card-link" data-card-link="${kind}" data-value="${esc(value)}">${esc(label)}</a>`;
  last=m.index+label.length;
 }
 return out+esc(shown.slice(last));
}

// The search a link sets: only that filter, replacing any other.
export const linkSearch=({cardLink,value})=>({effects:[],...(cardLink==='name'?{q:value}:{[cardLink]:value})});

// Pack details window (CITYDRIVER on Discord, 2026-11-19): the summary (experience-ui.js packSummary, from
// pack-summary.js parts) with each Type, Attribute, archetype and Support theme a link. A link carries the English
// term in data-value, so the pack filter works in every language. Translated here as one run per piece, built the way
// tools/i18n/add_nov18_pack_summary_terms.mjs composes the whole sentence; mark the host data-no-i18n.
// `base` is a Millennium Puzzle pack's own sentence (pack-inspection.js), shown before its archetype list.
export function packSummaryHtml(parts,base=''){
 if(!parts)return '';
 const cjk=['ja','zh'].includes(currentLanguage()),sep=cjk?'、':', ',end=cjk?'。':'. ';
 const label=en=>{const v=t(en);return esc(v.endsWith('：')?v:v+' ')},tip=esc(t('Show only these cards from this pack'));
 const link=(kind,value)=>`<a href="#" role="button" class="card-link pack-term" data-pack-term="${kind}" data-value="${esc(value)}" title="${tip}" aria-pressed="false">${esc(t(value))}</a>`;
 const list=(kind,values)=>values.map(v=>link(kind,v)).join(sep);
 if(base)return `<span>${esc(t(base))}</span>${parts.series.length?` ${label('Archetypes:')}${list('series',parts.series)}`:''}`;
 let out='';
 if(parts.attributes.length){
  // One whole sentence ("Attributes: LIGHT, DARK."), its Attribute words then turned into links.
  let s=esc(t(`Attributes: ${parts.attributes.join(', ')}.`));
  let from=0;for(const a of parts.attributes){const word=esc(t(a)),at=s.indexOf(word,from);if(at<0)continue;const html=link('attribute',a);s=s.slice(0,at)+html+s.slice(at+word.length);from=at+html.length}
  out+=s+(cjk?'':' ');
 }
 if(parts.types.length)out+=label('Main monster types:')+list('race',parts.types)+end;
 if(parts.series.length)out+=label('Archetypes:')+list('series',parts.series)+end;
 out+=label('Support:')+(parts.themes.length?list('theme',parts.themes):esc(t('mixed monsters, Spells and Traps')));
 out+=translateWith('. {0} different cards. Click to inspect.',parts.count);
 // The rest of the pack's Types, each a filter link too (CITYDRIVER, 2026-11-26).
 if(parts.otherTypes?.length)out+=`<br><span class="pack-other-types">${label('Other monster types:')}${list('race',parts.otherTypes)}</span>`;
 return out;
}

// A "{0}" pattern translated through i18n.js, then filled with HTML (already escaped) or a number.
// Each slot travels as a word no dictionary holds, so the pattern still matches and the slot comes back unchanged.
export function translateWith(en,...values){
 const slot=n=>`Xpackslot${n}x`;
 let s=esc(t(en.replace(/\{(\d+)\}/g,(m,n)=>slot(n))));
 values.forEach((v,n)=>{s=s.split(slot(n)).join(String(v))});
 return s;
}
