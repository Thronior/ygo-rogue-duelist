// Original Japanese Names (Settings → Display, user 2026-11-23): duelist names switch to their original Japanese names
// in every language, card names never change, and English with the setting off still installs no observer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {japaneseNames} from './web/character-names.js';

const root=fileURLToPath(new URL('../',import.meta.url));
globalThis.localStorage={data:new Map(),getItem(k){return this.data.get(k)??null},setItem(k,v){this.data.set(k,String(v))}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{languages:['en-US'],language:'en-US'}});
let observing=0;
globalThis.MutationObserver=class{observe(){observing++}disconnect(){}};
globalThis.NodeFilter={SHOW_TEXT:4};
globalThis.document={documentElement:{lang:''},body:{nodeType:1,tagName:'BODY',closest(){return null},getAttribute(){return null},querySelectorAll(){return []}},title:'Test',createTreeWalker(){return {nextNode(){return null}}}};
globalThis.window={alert(){},confirm(){return true}};
globalThis.fetch=async path=>{const m=/i18n\/([a-z]{2})\.json/.exec(String(path));return {ok:true,json:async()=>JSON.parse(fs.readFileSync(root+`android/web/i18n/${m[1]}.json`,'utf8'))}};
const i18n=await import(`data:text/javascript;base64,${Buffer.from(fs.readFileSync(root+'android/web/i18n.js','utf8')).toString('base64')}`);

const content=JSON.parse(fs.readFileSync(root+'android/web/content.json','utf8'));
const cards=new Set(content.cards.map(c=>c.name)),characters=new Set(content.characters.map(c=>c.name));
for(const lang of ['en','de','es','fr','it','pt','ja','ko','zh'])for(const [en,local] of japaneseNames(lang)){
 assert.ok(characters.has(en),`${lang}: ${en} is a character`);
 assert.ok(!cards.has(en)&&!cards.has(local),`${lang}: ${en} → ${local} never touches a card name`);
}

await i18n.setLanguage('en',{remember:false});
assert.equal(observing,0,'English with the setting off installs no observer');
assert.equal(i18n.t('Joey Wheeler'),'Joey Wheeler');
i18n.setJapaneseNames(true,japaneseNames);
assert.equal(i18n.t('Joey Wheeler'),'Katsuya Jonouchi');
assert.equal(i18n.t('Paradox Brothers'),'Meikyu Brothers');
assert.equal(i18n.t('Dark Magician'),'Dark Magician','a card name stays');
assert.ok(observing>0,'the observer runs while the setting is on');
await i18n.setLanguage('fr',{remember:false});
assert.equal(i18n.t('Paradox Brothers'),'Frères Meikyu','follows the language');
await i18n.setLanguage('ko',{remember:false});
assert.equal(i18n.t('Joey Wheeler'),'죠노우치 카츠야');
i18n.setJapaneseNames(false);
assert.equal(i18n.t('Joey Wheeler'),'조이','off: the localized name again');
await i18n.setLanguage('ja',{remember:false});
i18n.setJapaneseNames(true);
assert.equal(i18n.t('Joey Wheeler'),'城之内克也','Japanese already shows the original name');
console.log('PASS Original Japanese Names: duelists switch in every language, cards never');
