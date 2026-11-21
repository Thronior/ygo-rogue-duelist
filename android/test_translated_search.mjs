// Card search in other languages (Kyky, Discord 2026-11-21): English and the translated name/text both match, accents and
// case ignored. Run from the repo root: runtime/ai/node.exe android/test_translated_search.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
const web=new URL('./web/',import.meta.url);
globalThis.MutationObserver=class{observe(){}disconnect(){}takeRecords(){return []}};
globalThis.NodeFilter={SHOW_TEXT:4};globalThis.document={documentElement:{},createTreeWalker:()=>({nextNode:()=>null}),body:{childNodes:[],nodeType:0,querySelectorAll:()=>[],getAttribute:()=>null,hasAttribute:()=>false},querySelectorAll:()=>[]};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL(String(url),web),'utf8'))});
const i18n=await import('./web/i18n.js');
const {matchesSearch,searches}=await import('./web/card-search.js');
const content=JSON.parse(fs.readFileSync(new URL('content.json',web),'utf8'));
const card=name=>content.cards.find(c=>c.name===name);
i18n.attachContent(content);
const dm=card('Dark Magician'),sword=card('Legendary Sword');
// English: unchanged behaviour, plus accents and case folded.
assert.ok(i18n.cardMatchesQuery(dm,'dark MAGICIAN'));
assert.ok(!i18n.cardMatchesQuery(dm,'magicien'));
assert.equal(i18n.foldSearch('Épée Légendaire'),'epee legendaire');
// French: the translated name and text match, with or without accents; English still matches.
await i18n.setLanguage('fr',{remember:false});
const frName=i18n.localCardText(dm).name;
assert.ok(frName&&!/dark magician/i.test(frName),frName);
assert.ok(i18n.cardMatchesQuery(dm,frName.toUpperCase()),frName);
assert.ok(i18n.cardMatchesQuery(dm,'dark magician'));
const frSword=i18n.localCardText(sword)?.name||'';
assert.ok(i18n.cardMatchesQuery(sword,i18n.foldSearch(frSword)),'accents ignored: '+frSword);
searches.t={q:frName};assert.ok(matchesSearch(dm,'t'));assert.ok(!matchesSearch(sword,'t'));
// Back to English: the French words stop matching.
await i18n.setLanguage('en',{remember:false});
assert.ok(!i18n.cardMatchesQuery(dm,frName)||/dark|magician/i.test(frName));
console.log('PASS translated card search:',frName,'/',frSword);
