// Pack hover text (itch.io, a Chinese player, 2026-11-18): the shop tooltip, pack details and the duelist screen's
// pack fan show experience-ui.js packSummary() as ONE text run ("Main monster types: Spellcaster, Dragon. Archetypes:
// Toon. Support: Fusion Summoning. 52 different cards. Click to inspect."), which no dictionary entry or pattern
// matched, so it stayed English. Its pieces were already translated; this writes one {0} pattern per pack (the card
// count stays {0}, so adding a card keeps it working), composed from those pieces through i18n.js itself, plus the
// archetype lists the Millennium Puzzle packs show in their own <span>.
// The entries are derived from content.json: rerun after packs change (it replaces the old generated entries).
// Usage: runtime/ai/node.exe tools/i18n/add_nov18_pack_summary_terms.mjs  (after build_bundles.py), then build_bundles.py again.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),web=path.join(root,'android/web');
const LANGS=['de','es','fr','it','ja','ko','pt','zh'],CJK=new Set(['ja','zh']);
const content=JSON.parse(fs.readFileSync(path.join(web,'content.json'),'utf8'));
const {packSummary}=await import(pathToFileURL(path.join(web,'experience-ui.js')).href);
const {allCardsPackDescription}=await import(pathToFileURL(path.join(web,'pack-inspection.js')).href);

// i18n.js runs as in android/test_i18n.mjs: no DOM, bundles read from disk.
globalThis.localStorage={getItem:()=>null,setItem(){}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{languages:['en'],language:'en'}});
globalThis.MutationObserver=class{observe(){}disconnect(){}};globalThis.NodeFilter={SHOW_TEXT:4};
globalThis.document={documentElement:{lang:''},body:{nodeType:1,closest:()=>null,getAttribute:()=>null,querySelectorAll:()=>[]},title:'',createTreeWalker:()=>({nextNode:()=>null})};
globalThis.fetch=async p=>{const m=/i18n\/([a-z]{2})\.json/.exec(String(p));return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(web,`i18n/${m[1]}.json`),'utf8'))}};
const i18n=await import(`data:text/javascript;base64,${Buffer.from(fs.readFileSync(path.join(web,'i18n.js'),'utf8')).toString('base64')}`);

const SUMMARY=/^(?:Main monster types: (.+?)\. )?(Attributes: LIGHT, DARK\. )?(?:Archetypes: (.+?)\. )?Support: (.+?)\. (\d+) different cards\. Click to inspect\.$/;
const TAIL='. {0} different cards. Click to inspect.';
const generated=key=>/^(?:Main monster types: |Attributes: LIGHT, DARK(?:, WATER)?\. |Archetypes: |Support: ).*\{0\} different cards\. Click to inspect\.$/.test(key);
const packs=content.packs.map(p=>({p,s:packSummary(content,p.id)})).filter(x=>x.s);
const untranslated=new Map();
for(const lang of LANGS){
 await i18n.setLanguage(lang,{remember:false});i18n.attachContent(content);
 const ui=JSON.parse(fs.readFileSync(path.join(root,`data/i18n/ui/${lang}.json`),'utf8'));
 const t=s=>{const v=i18n.t(s);if(v===s&&/[A-Za-z]/.test(s))untranslated.set(s,(untranslated.get(s)||new Set()).add(lang));return v};
 const list=items=>items.split(', ').map(t).join(CJK.has(lang)?'、':', ');
 const label=en=>{const v=t(en);return v.endsWith('：')?v:v+' '};
 const end=CJK.has(lang)?'。':'. ';
 const out={};
 for(const {p,s} of packs){
  const m=SUMMARY.exec(s);if(!m)throw Error(`${p.id}: unexpected summary ${s}`);
  const [,types,attrs,series,support]=m;
  let v='';
  if(types)v+=label('Main monster types:')+list(types)+end;
  if(attrs)v+=t(attrs.trim())+(CJK.has(lang)?'':' ');
  if(series)v+=label('Archetypes:')+list(series)+end;
  const tail=ui[TAIL];if(!tail)throw Error(`${lang}: missing ${TAIL}`);
  v+=label('Support:')+(support==='mixed monsters, Spells and Traps'?t(support):list(support))+tail;
  out[s.replace(/\. \d+ different cards\. Click to inspect\.$/,TAIL)]=v;
  // The Millennium Puzzle packs show the archetype list in its own <span> (mobile.js boosterDescriptionHtml).
  if(allCardsPackDescription(p)&&series)out[series]=list(series);
 }
 for(const key of Object.keys(ui))if(generated(key)&&!(key in out))delete ui[key];
 Object.assign(ui,out);
 fs.writeFileSync(path.join(root,`data/i18n/ui/${lang}.json`),JSON.stringify(ui,null,1)+'\n','utf8');
 console.log(lang,Object.keys(out).length,'entries');
}
for(const [s,langs] of untranslated)console.log('kept in English:',JSON.stringify(s),[...langs].join(','));
