// Card pictures in the player's language (user, 2026-11-20). The scans are English prints; in another language each
// card is redrawn once with its translated name and text (localized-card-art.js) and kept in Cache Storage, so a device
// draws a card once per language. Until a card's picture is ready the English scan shows, and the picture replaces it
// on screen when it lands. English does nothing here: localizedImage returns undefined at once.
// Cost: drawing waits for idle time, one card at a time; cards asked for by a screen come before the run's deck.
import {drawLocalizedCard} from './localized-card-art.js';
import {currentLanguage,currentLocale,localCardText,t} from './i18n.js';

const RENDER=1;                    // raise when the drawing changes, so cached pictures are drawn again
const SCALE=1.5;                   // 432x630 from the 288x420 scans: sharper text than the scan's, half the bytes of 2x
const QUALITY=.85;
const CACHE_PREFIX='ygo-card-text-';
const MAX_CACHED=900;              // pictures kept per language (~45 MB at most)
const MAX_URLS=300;                // blob URLs held in memory

let lang='en',generation=0,cardOf=()=>null,cache=null,cacheReady=null,puts=0,fontsReady=null;
const urls=new Map();              // id -> blob URL for the current language (insertion order = age)
const failed=new Set(),urgent=new Set(),later=new Set();
let running=false,scheduled=false;

export function setupLocalizedCards({card}){cardOf=card}

// Called after every language change (and at boot). English: drop everything. Another language: keep only its cache.
export function resetLocalizedCards(){
 const next=currentLanguage();
 if(next===lang&&generation)return;
 generation++;lang=next;
 for(const url of urls.values())URL.revokeObjectURL(url);
 urls.clear();failed.clear();urgent.clear();later.clear();cache=null;
 cacheReady=globalThis.caches?caches.keys().then(async names=>{
  for(const name of names)if(name.startsWith(CACHE_PREFIX)&&name!==CACHE_PREFIX+lang)await caches.delete(name).catch(()=>{});
  if(lang!=='en')cache=await caches.open(CACHE_PREFIX+lang);
 }).catch(()=>{cache=null}):Promise.resolve();
}

let busy=0;                        // the card being drawn now, so a screen asking again does not queue it twice
const eligible=id=>lang!=='en'&&id>0&&id<100000000&&!failed.has(id)&&id!==busy;

// The picture for a card, or undefined (the caller shows the English scan); schedules the picture when it is missing.
export function localizedImage(id){
 if(lang==='en')return undefined;
 const url=urls.get(id);if(url)return url;
 if(eligible(id)&&!urgent.has(id)){later.delete(id);urgent.add(id);schedule()}
 return undefined;
}
// The run's cards, drawn in spare time so the deck editor and the duel find them ready.
export function warmLocalizedCards(ids){
 if(lang==='en'||!ids)return;
 for(const raw of ids){const id=Number(raw);if(eligible(id)&&!urls.has(id)&&!urgent.has(id))later.add(id)}
 if(later.size)schedule();
}

// Cards a screen shows wait at most 1.2 s for idle time; the deck's warm-up waits for true idle time (a phone takes
// up to ~150 ms per card, which must not land on a duel animation).
const idle=globalThis.requestIdleCallback?(fn,timeout)=>requestIdleCallback(fn,timeout?{timeout}:undefined):fn=>setTimeout(fn,60);
function schedule(){if(scheduled||running)return;scheduled=true;idle(step,urgent.size?1200:0)}
async function step(){
 scheduled=false;if(running)return;
 const from=urgent.size?urgent:later;const id=from.values().next().value;if(id===undefined)return;
 from.delete(id);running=true;busy=id;
 try{await make(id)}catch(error){failed.add(id);console.warn('Card picture',id,error?.message||error)}
 finally{running=false;busy=0;if(urgent.size||later.size)schedule()}
}

// What goes on the card: translated name and text, and the type line in the same language.
function infoFor(c){
 const local=localCardText(c);if(!local)return null;
 const type=Number(c.data?.type)||0;
 if(c.type==='Spell Card'||c.type==='Trap Card')
  return {kind:c.type==='Spell Card'?'spell':'trap',name:local.name,desc:local.desc,line:t(c.type),icon:c.race&&c.race!=='Normal'};
 if(type&0x4000||!(type&1))return null;   // tokens and anything unexpected keep their scan
 const parts=[t(c.race)];
 for(const [bit,word] of [[0x40,'Fusion'],[0x80,'Ritual'],[0x400000,'Toon'],[0x200,'Spirit'],[0x400,'Union'],[0x200000,'Flip']])if(type&bit)parts.push(t(word));
 if(type&0x20)parts.push(t('Effect'));else if(parts.length===1)parts.push(t('Normal'));
 const cjk=['ja','zh'].includes(lang);
 return {kind:'monster',name:local.name,desc:local.desc,line:parts.join(cjk?'／':'/'),flavor:!(type&0x20)&&parts.length===2&&!(type&0xc0)};
}
// FNV-1a: a changed translation gets a new cache entry instead of the old picture.
function hash(text){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0).toString(36)}

const loadImage=src=>new Promise((ok,no)=>{const i=new Image();i.decoding='async';i.onload=()=>ok(i);i.onerror=()=>no(Error('Could not load '+src));i.src=src});

async function make(id){
 if(urls.has(id))return;
 const started=generation,c=cardOf(id),info=c&&infoFor(c);
 if(!info){failed.add(id);return}
 await cacheReady;
 const key=`card-text/${lang}/${id}-${hash([RENDER,SCALE,info.name,info.desc,info.line].join('|'))}.jpg`;
 let blob=null;
 if(cache)blob=await cache.match(key).then(r=>r?.blob()).catch(()=>null);
 if(!blob){
  fontsReady??=Promise.all([document.fonts.load('600 20px "YGO Card Name"'),document.fonts.load('500 20px "YGO Card Text"')]).catch(()=>{});
  await fontsReady;
  const scan=await loadImage(`assets/cards/${id}.jpg`);
  if(started!==generation)return;
  const canvas=drawLocalizedCard(document.createElement('canvas'),scan,info,{lang,scale:SCALE,locale:currentLocale()});
  blob=await new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error('encode')),'image/jpeg',QUALITY));
  canvas.width=canvas.height=0;
  if(started!==generation)return;
  if(cache){await cache.put(key,new Response(blob,{headers:{'Content-Type':'image/jpeg'}})).catch(()=>{});if(++puts%50===0)trim(cache)}
 }
 if(started!==generation)return;
 const url=URL.createObjectURL(blob);urls.set(id,url);forget();
 // Pictures already on screen change over now; later renders get the new URL from localizedImage.
 for(const img of document.querySelectorAll(`img[src="assets/cards/${id}.jpg"]`))img.src=url;
}

// Oldest cache entries go once a language holds more than MAX_CACHED pictures (keys come back oldest first).
async function trim(store){
 const keys=await store.keys().catch(()=>[]);
 for(const request of keys.slice(0,Math.max(0,keys.length-MAX_CACHED)))await store.delete(request).catch(()=>{});
}
// Blob URLs beyond MAX_URLS are released unless a picture on screen still uses them (the cache keeps the bytes).
function forget(){
 if(urls.size<=MAX_URLS)return;
 for(const [id,url] of urls){
  if(urls.size<=MAX_URLS)break;
  if(document.querySelector(`img[src="${url}"]`))continue;
  urls.delete(id);URL.revokeObjectURL(url);
 }
}
