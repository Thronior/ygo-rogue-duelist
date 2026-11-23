// Localized card pictures must never put a released blob URL on screen (Discord, magna98, 2026-11-22: no art in the
// card window in Italian). With 300+ localized pictures on screen (split deck editor, big collection) the URL cap used
// to release the picture it had just drawn, so the card's tiles and its card window showed a broken image.
// Usage: runtime/ai/node.exe android/test_localized_card_urls_nov22.mjs [path to localized-cards.js]
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import url from 'url';

const root=path.resolve(path.dirname(url.fileURLToPath(import.meta.url)),'..');
const file=process.argv[2]||path.join(root,'android/web/localized-cards.js');
let source=fs.readFileSync(file,'utf8');
const imports=[
 [/import \{drawLocalizedCard\} from '\.\/localized-card-art\.js';/,'const {drawLocalizedCard}=globalThis.__localizedStubs;'],
 [/import \{currentLanguage,currentLocale,localCardText,t\} from '\.\/i18n\.js';/,'const {currentLanguage,currentLocale,localCardText,t}=globalThis.__localizedStubs;'],
];
for(const [from,to] of imports){assert.match(source,from,'localized-cards.js imports changed; update this test');source=source.replace(from,to)}

let lang='it';
globalThis.__localizedStubs={
 drawLocalizedCard:canvas=>canvas,
 currentLanguage:()=>lang,currentLocale:()=>lang,t:x=>x,
 localCardText:c=>({name:'Carta '+c.id,desc:'Testo'}),
};
// Pictures on screen: plain objects with a src attribute, found by the module's img[src="..."] selector.
class Img{constructor(src){this.tagName='IMG';this.attr=src}getAttribute(){return this.attr}set src(v){this.attr=v}get src(){return this.attr}}
const images=[];let onError=null;
globalThis.document={
 images,
 querySelectorAll(selector){const m=/^img\[src="(.*)"\]$/.exec(selector);assert.ok(m,selector);return images.filter(i=>i.attr===m[1])},
 querySelector(selector){return this.querySelectorAll(selector)[0]||null},
 addEventListener(type,fn,capture){if(type==='error'&&capture)onError=fn},
 createElement:()=>({width:0,height:0,toBlob(cb){cb({size:1})}}),
 fonts:{load:async()=>{}},
};
globalThis.Image=class{set src(v){this._src=v;setTimeout(()=>this.onload?.(),0)}get src(){return this._src}};
globalThis.requestIdleCallback=fn=>setTimeout(fn,0);
let made=0;const revoked=new Set();
globalThis.URL.createObjectURL=()=>`blob:test/${++made}`;
globalThis.URL.revokeObjectURL=u=>revoked.add(u);
delete globalThis.caches;

const cards=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
cards.setupLocalizedCards({card:id=>({id,type:'Spell Card',race:'Normal',data:{type:2}})});
cards.resetLocalizedCards();

// 301 cards on screen with their English scans; each is drawn and swapped in as it lands.
const N=301,scan=id=>`assets/cards/${id}.jpg`;
for(let id=1;id<=N;id++)images.push(new Img(scan(id)));
const settle=()=>new Promise(r=>setTimeout(r,5));
for(let id=1;id<=N;id++){assert.equal(cards.localizedImage(id),undefined);for(let k=0;k<20&&images[id-1].attr===scan(id);k++)await settle()}
for(let k=0;k<20;k++)await settle();

const dead=images.filter(i=>revoked.has(i.attr));
assert.deepEqual(dead.map(i=>i.attr),[],'no picture on screen may show a released URL');
assert.ok(images.every(i=>i.attr.startsWith('blob:')),'every card on screen shows its localized picture');
assert.equal(cards.localizedImage(N),images[N-1].attr,'the newest picture stays available for the card window');
assert.ok(made<=N+1,`each card is drawn once (${made} pictures for ${N} cards)`);

// Once pictures leave the screen the cap applies again: the oldest off-screen URLs are released.
images.splice(0,150);
cards.localizedImage(N+1);images.push(new Img(scan(N+1)));
for(let k=0;k<40&&images.at(-1).attr===scan(N+1);k++)await settle();
assert.ok(images.at(-1).attr.startsWith('blob:')&&!revoked.has(images.at(-1).attr),'a new picture lands after trimming');
assert.ok(revoked.size>0,'off-screen URLs are released past the cap');
assert.ok(images.every(i=>!revoked.has(i.attr)),'trimming never releases a picture on screen');

// A language change releases every URL; a picture that still loads one falls back to its scan instead of breaking.
const stale=images[0],staleId=151;   // cards 1-150 left the screen above
assert.equal(stale.attr,cards.localizedImage(staleId));
lang='fr';cards.resetLocalizedCards();
assert.ok(revoked.has(stale.attr));
assert.ok(onError,'an image error listener is installed');
onError({target:stale});
assert.equal(stale.attr,scan(staleId),'a released URL falls back to the English scan');
const other=new Img('assets/icons/x.png');onError({target:other});
assert.equal(other.attr,'assets/icons/x.png','other images are left alone');

console.log(`PASS localized card URLs: ${N} pictures on screen keep live URLs, cap trims only off-screen ones, released URLs fall back to scans`);
