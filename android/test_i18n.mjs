import assert from 'assert';
import fs from 'fs';
import path from 'path';
import url from 'url';

const {readFileSync}=fs;
const {resolve,dirname}=path;
const {fileURLToPath}=url;

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const langs=['de','es','fr','it','pt','ja','ko','zh'];
const catalog=JSON.parse(readFileSync(resolve(root,'data/i18n/catalog.json'),'utf8'));
const catalogKeys=[...new Set(catalog.map(row=>row.en))];
const slots=value=>(String(value).match(/\{\d+\}/g)||[]).sort();

for(const lang of langs){
 const bundle=JSON.parse(readFileSync(resolve(root,`android/web/i18n/${lang}.json`),'utf8'));
 for(const key of catalogKeys){
  assert.ok(Object.prototype.hasOwnProperty.call(bundle.ui,key),`${lang}: missing catalog key ${key}`);
  assert.deepEqual(slots(bundle.ui[key]),slots(key),`${lang}: placeholder mismatch for ${key}`);
 }
}

const local={data:new Map(),getItem(k){return this.data.get(k)??null},setItem(k,v){this.data.set(k,String(v))}};
globalThis.localStorage=local;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{languages:['fr-FR','en-US'],language:'fr-FR'}});
const observers=[];
class MockMutationObserver{
 constructor(callback){this.callback=callback;this.observed=false;observers.push(this)}
 observe(){this.observed=true}
 disconnect(){this.observed=false}
}
globalThis.MutationObserver=MockMutationObserver;
globalThis.NodeFilter={SHOW_TEXT:4};
const body={nodeType:1,tagName:'BODY',closest(){return null},getAttribute(){return null},querySelectorAll(){return []}};
globalThis.document={
 documentElement:{lang:''},body,title:'Test title',
 createTreeWalker(){return {nextNode(){return null}}},
};
globalThis.window={alert(){},confirm(){return true}};
globalThis.fetch=async path=>{
 const match=/i18n\/([a-z]{2})\.json/.exec(String(path));
 if(!match)return {ok:false,status:404};
 const data=JSON.parse(readFileSync(resolve(root,`android/web/i18n/${match[1]}.json`),'utf8'));
 return {ok:true,json:async()=>data};
};

const source=readFileSync(resolve(root,'android/web/i18n.js'),'utf8');
const i18n=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
assert.equal(i18n.browserLanguage(),'fr');
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{languages:['zh-Hant-TW'],language:'en-US'}});
assert.equal(i18n.browserLanguage(),'zh','Chinese regional variants should select the supported zh locale');
local.setItem('ygo-language','it');
assert.equal(i18n.savedLanguage()??i18n.browserLanguage(),'it','saved preference should beat browser language');
local.setItem('ygo-language','not-a-language');
assert.equal(i18n.savedLanguage(),null);

await i18n.setLanguage('en',{remember:false});
assert.equal(observers.length,0,'English should not install a MutationObserver');
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{languages:['fr-FR'],language:'fr-FR'}});
await i18n.setLanguage('fr',{remember:false});
assert.equal(observers.length,1,'a non-English locale should install one observer');
assert.ok(observers[0].observed);
assert.equal(i18n.t('Cancel'),'Annuler','exact UI translation');

const french=JSON.parse(readFileSync(resolve(root,'android/web/i18n/fr.json'),'utf8'));
const darkMagician=french.cards['46986414'];
assert.ok(darkMagician?.[0],'Dark Magician should have an official French card name');
i18n.attachContent({cards:[{id:46986414,name:'Dark Magician',desc:'',strings:[]}],tokenCards:[],archetypes:[]});
assert.equal(i18n.t('Select Dark Magician'),`Sélectionner ${darkMagician[0]}`,'pattern lookup should translate captured card names');
const plural='Uploaded {0} replay{1}. Thank you!';
const rendered=i18n.t('Uploaded 3 replays. Thank you!');
assert.equal(rendered,french.ui[plural].replace('{0}','3').replace('{1}',''),'empty and "s" captures should not leave a stray suffix');

await i18n.setLanguage('en',{remember:false});
assert.equal(observers.length,1,'switching to English must not create an observer');
assert.equal(observers[0].observed,false,'English should disconnect the active observer');
console.log(`i18n checks passed: ${langs.length} bundles, ${catalogKeys.length} catalog keys, browser/saved preference, lookups, empty suffix, observer policy`);
