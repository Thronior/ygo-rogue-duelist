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
 const v=ui.get(s);if(v!==undefined)return v;
 if(cardMaps){const c=cardMaps.get(s);if(c!==undefined)return c}
 return undefined;
}
// Translates one text run; returns undefined when nothing applies.
function lookup(s){
 if(memo.has(s))return memo.get(s);
 let out=exact(s);
 if(out===undefined){
  for(const p of patterns){
   if(p.anchor&&!s.includes(p.anchor))continue;
   const m=p.re.exec(s);if(!m)continue;
   out=p.local.replace(/\{(\d+)\}/g,(x,n)=>{const v=m[p.order.indexOf(+n)+1]??'';return v==='s'?'':v===s?v:lookup(v)??v});break;
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
 if(/[A-Z]{2}/.test(s)&&!/[a-z]/.test(s)){
  const lower=s.toLowerCase();
  for(const c of [lower[0].toUpperCase()+lower.slice(1),lower.replace(/(^|\s)\S/g,x=>x.toUpperCase()),lower]){const v=exact(c);if(v!==undefined)return v.toLocaleUpperCase(locale)}
 }
 return undefined;
}
// For code that draws text itself (canvas images, native confirm dialogs).
export function t(text){if(lang==='en'||text==null)return text;const s=norm(text);if(!s||!LETTER.test(s))return text;return lookup(s)??text}

const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','CODE','NOSCRIPT']);
const ATTRS=['title','aria-label','placeholder'];
function translateTextNode(node){
 const value=node.nodeValue;if(!value||!LETTER.test(value))return;
 const parent=node.parentElement;if(!parent||SKIP.has(parent.tagName)||parent.closest('[data-no-i18n]'))return;
 const s=norm(value),out=lookup(s);
 if(out!==undefined&&out!==s){const lead=/^\s*/.exec(value)[0],trail=/\s*$/.exec(value)[0];node.nodeValue=lead+out+trail}
}
function translateAttributes(el){
 if(el.closest('[data-no-i18n]'))return;
 for(const a of ATTRS){const v=el.getAttribute(a);if(v&&LETTER.test(v)){const out=lookup(norm(v));if(out!==undefined&&out!==norm(v))el.setAttribute(a,out)}}
}
export function translateTree(root){
 if(lang==='en'||!root)return;
 if(root.nodeType===3){translateTextNode(root);return}
 if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);for(let n=walker.nextNode();n;n=walker.nextNode())translateTextNode(n);
 if(root.nodeType===1)translateAttributes(root);
 for(const el of root.querySelectorAll?.('[title],[aria-label],[placeholder]')||[])translateAttributes(el);
}
function observe(){
 observer?.disconnect();if(lang==='en')return;
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
export function attachContent(c,displayCardText){content=c;if(displayCardText)cleanText=displayCardText;buildCardMaps()}

// Loads a language bundle (android/web/i18n/<code>.json) and starts translating the page.
export async function setLanguage(code,{remember=true}={}){
 if(!codes.has(code))code='en';
 if(remember){try{localStorage.setItem(KEY,code)}catch{}}
 document.documentElement.lang=LANGUAGES.find(l=>l[0]===code)[2];
 if(code==='en'){lang='en';locale='en-US';ui=new Map();patterns=[];cards=null;cardMaps=null;memo.clear();observe();return}
 const bundle=await fetch(`i18n/${code}.json`).then(r=>{if(!r.ok)throw Error(`Language file missing (${r.status})`);return r.json()});
 const nextUi=new Map(),nextPatterns=[];
 for(const [en,local] of Object.entries(bundle.ui||{})){if(/\{\d+\}/.test(en))nextPatterns.push(compile(en,local));else nextUi.set(en,local)}
 nextPatterns.sort((a,b)=>b.weight-a.weight);
 lang=code;locale=LANGUAGES.find(l=>l[0]===code)[2];ui=nextUi;patterns=nextPatterns;cards=bundle.cards||null;if(cards&&bundle.setnames)cards.setnames=bundle.setnames;memo.clear();
 buildCardMaps();observe();
}
// Native dialogs cannot be observed, so their message is translated on the way in.
for(const name of ['alert','confirm']){const native=window[name]?.bind(window);if(native)window[name]=message=>native(t(message))}

// Most flags are inline. English and Portuguese use locally bundled split-flags composites.
const FLAGS={
 en:'<rect width="30" height="20" fill="#b22234"/>'+[1,3,5,7,9,11].map(i=>`<rect y="${i*20/13}" width="30" height="${20/13}" fill="#fff"/>`).join('')+'<rect width="13" height="10.8" fill="#3c3b6e"/>',
 de:'<rect width="30" height="20" fill="#ffce00"/><rect width="30" height="13.33" fill="#d00"/><rect width="30" height="6.67" fill="#000"/>',
 es:'<rect width="30" height="20" fill="#c60b1e"/><rect y="5" width="30" height="10" fill="#ffc400"/>',
 fr:'<rect width="30" height="20" fill="#ef4135"/><rect width="20" height="20" fill="#fff"/><rect width="10" height="20" fill="#0055a4"/>',
 it:'<rect width="30" height="20" fill="#ce2b37"/><rect width="20" height="20" fill="#fff"/><rect width="10" height="20" fill="#009246"/>',
 ja:'<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>',
 ko:'<rect width="30" height="20" fill="#fff"/><path d="M15 6a4 4 0 0 1 0 8 2 2 0 0 1 0-4 2 2 0 0 0 0-4z" fill="#003478"/><path d="M15 6a4 4 0 0 0 0 8 2 2 0 0 0 0-4 2 2 0 0 1 0-4z" fill="#c60c30"/><g stroke="#000" stroke-width="1"><path d="M5 4.5l3 -2M5.6 5.4l3-2M6.2 6.3l3-2M21.8 13.7l3 -2M22.4 14.6l3-2M23 15.5l3-2M5 15.5l3 2M5.6 14.6l3 2M6.2 13.7l3 2M21.8 6.3l3 -2M22.4 5.4l3-2M23 4.5l3-2"/></g>',
 zh:'<rect width="30" height="20" fill="#de2910"/><path d="M5 2.4l1.18 3.6H10l-3.06 2.2 1.17 3.6L5 9.6l-3.1 2.2 1.18-3.6L0 6h3.82z" fill="#ffde00"/>'+[[10,2],[12,4],[12,7],[10,9]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".9" fill="#ffde00"/>`).join(''),
};
export const flagSvg=code=>code==='en'||code==='pt'
 ?`<img class="language-flag" src="assets/i18n/flags/${code}.svg" alt="" aria-hidden="true" draggable="false">`
 :`<svg class="language-flag" viewBox="0 0 30 20" aria-hidden="true" focusable="false">${FLAGS[code]||FLAGS.en}</svg>`;
