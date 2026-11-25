// Tag shop relic banish (2026-11-24): the cross arms on this screen only; the confirm sends one shared relic-banish request
// with the relic's index and id; the markup matches solo with data-tag triggers.
import assert from 'node:assert/strict';
Object.assign(globalThis,{window:globalThis,Audio:class{},addEventListener(){},innerHeight:800,
 document:{hidden:false,addEventListener(){},removeEventListener(){}},location:{search:''},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
const {TagUI}=await import('./web/tag-ui.js');
const {relicBanishButton,relicBanishPrice}=await import('./web/relic-lock.js');
const render=TagUI.prototype.render;TagUI.prototype.render=()=>{};
const root={style:{setProperty(){}},addEventListener(){}};
const ui=new TagUI({root,content:{},profile:{unlocked:[0]},image:id=>`${id}.jpg`,inspect(){},inspectPack(){},dialog(){}});
const sent=[];ui.session={connected:true,request:async(action,value)=>{sent.push([action,value]);return {banished:'eye'}}};
ui.view={phase:'shop',paused:false,run:{gold:50,shop:[{kind:'artifact',id:'urn',price:60},{kind:'artifact',id:'eye',price:90},{kind:'pack',id:'LOB',price:35}]}};
await ui.action('relic-banish-arm',{dataset:{index:'1'}});
assert.deepEqual(ui.banishArmed,{index:1,id:'eye'},'armed locally');assert.equal(sent.length,0,'arming sends nothing');
await ui.action('relic-banish-arm',{dataset:{index:'1'}});assert.equal(ui.banishArmed,null,'a second tap on the cross cancels');
await ui.action('relic-banish-arm',{dataset:{index:'1'}});
await ui.action('relic-banish',{dataset:{index:'1'}});
assert.deepEqual(sent,[['relic-banish',{index:1,id:'eye'}]]);assert.equal(ui.banishArmed,null);
ui.view.phase='draft';await ui.action('relic-banish',{dataset:{index:'1'}});assert.equal(sent.length,1,'only in the shop');
TagUI.prototype.render=render;
const shop=ui.view.run.shop;
assert.match(relicBanishButton(shop[1],1,false,'10',true,'data-tag'),/data-tag="relic-banish-arm" data-index="1" aria-pressed="false"/);
assert.match(relicBanishButton(shop[1],1,true,'10',true,'data-tag'),/data-tag="relic-banish" data-index="1"/);
assert.ok(!relicBanishButton(shop[1],1,true,'10',true,'data-tag').includes('data-do'),'no solo triggers in Tag');
assert.equal(relicBanishButton(shop[2],2,false,'10',true,'data-tag'),'','packs have no cross');
assert.equal(relicBanishButton({...shop[0],sold:true},0,false,'10',true,'data-tag'),'','sold relics have no cross');
assert.match(relicBanishButton(shop[1],1,true,'10',false,'data-tag'),/relic-banish-confirm fx-cant-afford/);
// Price (2026-11-25): 20, +10 per relic on the run's (Tag: the team's) banish list, at most 60, as campaign_expansion.banish_price.
assert.deepEqual([0,1,2,3,4,5,9].map(n=>relicBanishPrice({relic_banishes:Array(n).fill('x')})),[20,30,40,50,60,60,60]);
assert.equal(relicBanishPrice({}),20);
console.log('PASS Tag relic banish button: arms locally, one shared request with index and id, shop only, same markup as solo, price 20 +10 up to 60');
