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
