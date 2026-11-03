// Tag packs open the same card and odds preview as solo, from the shop and the opponent screen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
Object.assign(globalThis,{window:globalThis,Audio:class{},addEventListener(){},innerHeight:800,
 document:{hidden:false,addEventListener(){},removeEventListener(){}},location:{search:''},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
const {TagUI}=await import('./web/tag-ui.js');

const listeners={},calls=[],render=TagUI.prototype.render;
TagUI.prototype.render=()=>{};
const root={style:{setProperty(){}},addEventListener(type,fn){listeners[type]=fn}};
const ui=new TagUI({root,content:{},profile:{unlocked:[0]},image:id=>`${id}.jpg`,inspect:id=>calls.push(['card',id]),inspectPack:id=>calls.push(['pack',id]),dialog:(title,body)=>calls.push(['dialog',title,body])});
TagUI.prototype.render=render;
ui.cardById=id=>({name:`Card ${id}`});
ui.view={run:{shop:[{kind:'pack',id:'LOB',price:35},{kind:'deck',id:'SDY',name:'Starter Deck',cards:[7,7,8],price:60},{kind:'single',id:9,price:15}]}};

await ui.action('item',{dataset:{index:'0'}});
assert.deepEqual(calls.shift(),['pack','LOB'],'a shop pack opens the card preview, not a text dialog');
await ui.action('item',{dataset:{index:'1'}});
const [kind,title,body]=calls.shift();
assert.equal(kind,'dialog');assert.equal(title,'Starter Deck');
assert.equal(body.match(/data-tag="inspect"/g).length,2,'a deck still lists its unique cards');
await ui.action('item',{dataset:{index:'2'}});
assert.deepEqual(calls.shift(),['card',9]);

ui.working=true;
await ui.action('pack',{dataset:{pack:'MRD'}});
assert.deepEqual(calls.shift(),['pack','MRD'],'packs can be read while a teammate is locking in');
ui.working=false;

const rightClick=async(tag,dataset)=>{
 const el={dataset:{tag,...dataset}};let prevented=false;
 listeners.contextmenu({target:{closest:selector=>selector.includes(`[data-tag="${tag}"]`)?el:null},button:2,pointerType:'mouse',preventDefault(){prevented=true}});
 await Promise.resolve();return prevented;
};
assert.equal(await rightClick('pack',{pack:'MRD'}),true,'the browser menu stays closed');
assert.deepEqual(calls.shift(),['pack','MRD'],'right-clicking an opponent pack opens the preview');
await rightClick('item',{index:'0'});
assert.equal(calls.length,0,'shop right-clicks belong to the shop gestures, so the preview loads once');

const source=readFileSync(new URL('./web/tag-ui.js',import.meta.url),'utf8');
assert.match(source,/<img data-tag="pack" data-pack="\$\{pack\.id\}"/,'the guaranteed opponent pack is clickable');
assert.match(source,/<img data-tag="pack" data-pack="\$\{id\}"/,'starting packs are clickable');
assert.match(readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8'),/new TagUI\(\{.*image,inspect,inspectPack,dialog/,'Tag receives the solo preview');
console.log('PASS Tag pack preview: shop, opponent and starting packs, one load per right-click, deck and single items unchanged');
