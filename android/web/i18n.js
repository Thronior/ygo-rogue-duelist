// Interface languages (2026-11-08). The game is written in English; another language is applied where text meets the
// screen: a MutationObserver rewrites text nodes and title/aria-label/placeholder attributes from a dictionary, so game
// logic keeps comparing English names and no template has to change. Card names and texts come from the official
// database of that language (data/i18n/cards), everything else from data/i18n/ui/<lang>.json (tools/i18n/README.md).
// English installs no observer and costs nothing.
export const LANGUAGES=[
 ['en','English','en-US'],['de','Deutsch','de-DE'],['es','Español','es-ES'],['fr','Français','fr-FR'],['it','Italiano','it-IT'],
 ['pt','Português','pt-BR'],['ja','日本語','ja-JP'],['ko','한국어','ko-KR'],['zh','简体中文','zh-CN']];
const KEY='ygo-language',codes=new Set(LANGUAGES.map(l=>l[0]));
export function savedLanguage(){try{const v=localStorage.getItem(KEY);return codes.has(v)?v:null}catch{return null}}
// The browser's preferred languages pick the default; Chinese variants all use Simplified Chinese.
export function browserLanguage(){
 for(const tag of navigator.languages?.length?navigator.languages:[navigator.language||'en']){const code=String(tag).toLowerCase().split(/[-_]/)[0];if(codes.has(code))return code}
 return 'en';
}
let lang='en',locale='en-US',ui=new Map(),patterns=[],cards=null,cardMaps=null,memo=new Map(),observer=null,content=null,cleanText=s=>s;
export const currentLanguage=()=>lang;
// Original Japanese duelist names (character-names.js): checked before the dictionary while the setting is on. In
// English the observer then runs for them alone; with the setting off English still installs nothing.
let japanese=false,names=new Map(),namesFor=()=>new Map();
const active=()=>lang!=='en'||names.size>0;
// `table(lang)` (character-names.js japaneseNames) is passed in so this module keeps no imports.
export function setJapaneseNames(on,table=namesFor){japanese=!!on;namesFor=table;names=japanese?namesFor(lang):new Map();memo.clear();observe()}
// The BCP 47 locale of the language (en-US for English), for dates drawn on canvas (run card).
export const currentLocale=()=>locale;
const norm=s=>String(s).replace(/\s+/g,' ').trim();
const LETTER=/[A-Za-z]/;

// Patterns ("Select {0}") match whole text runs; captured values are translated too (card names, labels).
function compile(en,local){
 const parts=en.split(/(\{\d+\})/),order=[];let source='^';
 for(const p of parts){const m=/^\{(\d+)\}$/.exec(p);if(m){order.push(+m[1]);source+='(.*?)'}else source+=p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
 const literal=parts.filter(p=>!/^\{\d+\}$/.test(p)).join('');
 return {re:new RegExp(source+'$'),order,local,anchor:literal.split(/\{\d+\}| /).sort((a,b)=>b.length-a.length)[0]||'',weight:literal.length};
}
function exact(s){
 const n=names.get(s);if(n!==undefined)return n;
 const v=ui.get(s);if(v!==undefined)return v;
 if(cardMaps){const c=cardMaps.get(s);if(c!==undefined)return c}
 return undefined;
}
// Randomized cards' effect texts stay whole and English until they are translated as a whole (Discord 2026-11-22,
// German: "…declares an attack: Eig. opponent shuffles…": the "Name: text" fallback and the "Your {0}" pattern
// translated one word of an English effect). random-cards.js registers each text and each of its lines.
const keptEnglish=new Set();
export function keepEnglish(text){
 const s=String(text??'');if(!s)return;
 keptEnglish.add(norm(s));for(const line of s.split(/\r?\n/))if(LETTER.test(line))keptEnglish.add(norm(line));
}
// Translates one text run; returns undefined when nothing applies.
function lookup(s){
 if(keptEnglish.has(s))return exact(s);   // a whole translation is fine (a real card's own text), a partial one never
 if(memo.has(s))return memo.get(s);
 let out=exact(s);
 if(out===undefined){
  for(const p of patterns){
   if(p.anchor&&!s.includes(p.anchor))continue;
   const m=p.re.exec(s);if(!m)continue;
   out=p.local.replace(/\{(\d+)\}/g,(x,n)=>{const v=(m[p.order.indexOf(+n)+1]??'').trim();return v==='s'?'':v===s?v:lookup(v)??v});break;
  }
 }
 if(out===undefined)out=fallback(s);
 if(memo.size>20000)memo.clear();
 memo.set(s,out);return out;
}
// Only for text the dictionary has no entry for (Discord 2026-11-09):
// - a line built from parts joined by " · ", like the card info's "Effect Monster · Fiend ·" or the deck editor count,
//   is translated part by part (also a run starting with the separator, like the subtype line's "· Effect");
// - an ALL-CAPS label such as the shop's BUY or REROLL uses its normal-case entry, written in capitals.
const SEPARATOR=/((?:^| )·(?: |$))/;
function fallback(s){
 if(SEPARATOR.test(s)){
  let changed=false;
  const out=s.split(SEPARATOR).map((part,i)=>{if(i%2||!LETTER.test(part))return part;const v=lookup(part.trim());if(v===undefined||v===part.trim())return part;changed=true;return v}).join('');
  return changed?out:undefined;
 }
 // A numbered effect option ("1: Gain 1200 Life Points.") keeps its number and translates the card's own string
 // (itch.io, a Chinese player, 2026-11-18: Yu-Jo Friendship and Poison of the Old Man options stayed English).
 const numbered=/^(\d+: )(.+)$/.exec(s);
 if(numbered){const v=lookup(numbered[2]);return v===undefined?undefined:numbered[1]+v}
 // A chain or activation choice names the card, then its effect string: "Poison of the Old Man — Gain 1200 Life
 // Points." (2026-11-18). Each side is translated on its own; a side without an entry stays as it is.
 if(s.includes(' — ')){
  const parts=s.split(' — '),out=parts.map(p=>LETTER.test(p)?lookup(p.trim()):undefined);
  return out.some(v=>v!==undefined)?parts.map((p,i)=>out[i]??p).join(' — '):undefined;
 }
 // "Name: text", like a draft relic tile's hover text "Diamond Ankh: When acquired, …" (2026-11-18). The text must
 // translate; the name keeps its English form when it has no entry.
 const labelled=/^([^:]{1,80}): (.+)$/.exec(s);
 if(labelled&&LETTER.test(labelled[2])){const v=lookup(labelled[2]);if(v!==undefined)return (lookup(labelled[1])??labelled[1])+': '+v}
 if(/[A-Z]{2}/.test(s)&&!/[a-z]/.test(s)){
  const lower=s.toLowerCase();
  for(const c of [lower[0].toUpperCase()+lower.slice(1),lower.replace(/(^|\s)\S/g,x=>x.toUpperCase()),lower]){const v=exact(c);if(v!==undefined)return v.toLocaleUpperCase(locale)}
 }
 return undefined;
}
// For code that draws text itself (canvas images, native confirm dialogs).
export function t(text){if(!active()||text==null)return text;const s=norm(text);if(!s||!LETTER.test(s))return text;return lookup(s)??text}

const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','CODE','NOSCRIPT']);
const ATTRS=['title','aria-label','placeholder'];
// Text this module wrote is never translated again (Discord 2026-11-16: German froze on Settings → Display). The
// observer sees every write, and German "Auto (100 %)" matched "Auto ({0}%)" again with "100 " captured, giving a
// different spacing each pass, so the page rewrote one label forever. A chain like Traps → Fallen → Gefallen stops too.
const written=new WeakMap();
function translateTextNode(node){
 const value=node.nodeValue;if(!value||!LETTER.test(value)||written.get(node)===value)return;
 const parent=node.parentElement;if(!parent||SKIP.has(parent.tagName)||parent.closest('[data-no-i18n]'))return;
 const s=norm(value),out=lookup(s);
 if(out!==undefined&&norm(out)!==s){const lead=/^\s*/.exec(value)[0],trail=/\s*$/.exec(value)[0];node.nodeValue=lead+out+trail;written.set(node,node.nodeValue)}
}
function translateAttributes(el){
 if(el.closest('[data-no-i18n]'))return;
 let mine=written.get(el);
 for(const a of ATTRS){const v=el.getAttribute(a);if(v&&LETTER.test(v)&&mine?.[a]!==v){const out=lookup(norm(v));if(out!==undefined&&norm(out)!==norm(v)){el.setAttribute(a,out);if(!mine)written.set(el,mine={});mine[a]=el.getAttribute(a)}}}
}
export function translateTree(root){
 if(!active()||!root)return;
 if(root.nodeType===3){translateTextNode(root);return}
 if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);for(let n=walker.nextNode();n;n=walker.nextNode())translateTextNode(n);
 if(root.nodeType===1)translateAttributes(root);
 for(const el of root.querySelectorAll?.('[title],[aria-label],[placeholder]')||[])translateAttributes(el);
}
function observe(){
 observer?.disconnect();if(!active())return;
 observer=new MutationObserver(records=>{
  for(const r of records){
   if(r.type==='childList')for(const n of r.addedNodes)translateTree(n);
   else if(r.type==='characterData')translateTextNode(r.target);
   else if(r.type==='attributes')translateAttributes(r.target);
  }
 });
 observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
 translateTree(document.body);document.title=t(document.title);
}

// Card names, texts and effect labels: English (as shown) → this language, for display only.
function buildCardMaps(){
 searchMemo.clear();
 if(!cards||!content){cardMaps=null;return}
 const map=new Map(),add=(en,local)=>{const k=norm(en);if(k&&local&&!map.has(k)&&!ui.has(k))map.set(k,local)};
 for(const c of [...(content.cards||[]),...(content.tokenCards||[])]){
  const local=cards[c.id];if(!local)continue;
  add(c.name,local[0]);
  // A card whose game text differs from the official one (pre-errata, custom) is translated in the ui dictionary.
  const en=cleanText(c.desc);if(!ui.has(norm(en)))add(en,local[1]);
  (c.strings||[]).forEach((s,i)=>{if(s&&local[2]?.[i])add(s,local[2][i])});
 }
 for(const a of content.archetypes||[]){const local=cards.setnames?.[a.setcode];if(local)add(a.name,local)}
 cardMaps=map;memo.clear();
}
// A card's name and text in the current language, as the inspect panel shows them (localized-cards.js draws them on the
// card picture). Null in English or when the language has no entry for the card.
export function localCardText(c){
 if(lang==='en'||!cards||!c)return null;const local=cards[c.id];if(!local)return null;
 const own=ui.get(norm(cleanText(c.desc||'')));
 return {name:local[0],desc:own??local[1]??c.desc};
}
// Card search (Kyky, Discord 2026-11-21): a card matches its English name and text and, in another language, also its
// translated name and text; case and accents are ignored. Built per card on first use, dropped when the language changes.
const searchMemo=new Map();
export const foldSearch=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function cardSearchText(c){
 if(!c)return '';const hit=searchMemo.get(c.id);if(hit&&hit[0]===c.desc&&hit[1]===c.name)return hit[2];
 const local=lang==='en'?null:localCardText(c),text=foldSearch(c.name+' '+(c.desc||'')+(local?' '+local.name+' '+local.desc:''));
 searchMemo.set(c.id,[c.desc,c.name,text]);return text;
}
// Every word of the query must appear (in either language).
export function cardMatchesQuery(c,query){const words=foldSearch(query).split(/\s+/).filter(Boolean);if(!words.length)return true;const text=cardSearchText(c);return words.every(w=>text.includes(w))}
export function attachContent(c,displayCardText){content=c;if(displayCardText)cleanText=displayCardText;buildCardMaps()}

// Loads a language bundle (android/web/i18n/<code>.json) and starts translating the page.
export async function setLanguage(code,{remember=true}={}){
 if(!codes.has(code))code='en';
 if(remember){try{localStorage.setItem(KEY,code)}catch{}}
 document.documentElement.lang=LANGUAGES.find(l=>l[0]===code)[2];
 if(code==='en'){lang='en';locale='en-US';ui=new Map();patterns=[];cards=null;cardMaps=null;names=japanese?namesFor('en'):new Map();memo.clear();searchMemo.clear();observe();return}
 const bundle=await fetch(`i18n/${code}.json`).then(r=>{if(!r.ok)throw Error(`Language file missing (${r.status})`);return r.json()});
 const nextUi=new Map(),nextPatterns=[];
 for(const [en,local] of Object.entries(bundle.ui||{})){if(/\{\d+\}/.test(en))nextPatterns.push(compile(en,local));else nextUi.set(en,local)}
 nextPatterns.sort((a,b)=>b.weight-a.weight);
 lang=code;locale=LANGUAGES.find(l=>l[0]===code)[2];ui=nextUi;patterns=nextPatterns;cards=bundle.cards||null;if(cards&&bundle.setnames)cards.setnames=bundle.setnames;names=japanese?namesFor(code):new Map();memo.clear();
 buildCardMaps();observe();
}
// Native dialogs cannot be observed, so their message is translated on the way in.
if(globalThis.window)for(const name of ['alert','confirm']){const native=window[name]?.bind(window);if(native)window[name]=message=>native(t(message))}

// Language flags (2026-11-10): one bundled SVG per language in assets/i18n/flags, from lipis/flag-icons (MIT; see
// its README). English and Portuguese are split composites (UK/US, Portugal/Brazil).
export const flagSvg=code=>`<img class="language-flag" src="assets/i18n/flags/${codes.has(code)?code:'en'}.svg" alt="" aria-hidden="true" draggable="false">`;
