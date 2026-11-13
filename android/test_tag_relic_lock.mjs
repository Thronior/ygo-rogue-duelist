// Tag shop relic locks (2026-11-13): the lock button sends one shared relic-lock request; the markup matches solo.
import assert from 'node:assert/strict';
Object.assign(globalThis,{window:globalThis,Audio:class{},addEventListener(){},innerHeight:800,
 document:{hidden:false,addEventListener(){},removeEventListener(){}},location:{search:''},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
const {TagUI}=await import('./web/tag-ui.js');
const {relicLockButton,relicLockClass}=await import('./web/relic-lock.js');
const render=TagUI.prototype.render;TagUI.prototype.render=()=>{};
const root={style:{setProperty(){}},addEventListener(){}};
const ui=new TagUI({root,content:{},profile:{unlocked:[0]},image:id=>`${id}.jpg`,inspect(){},inspectPack(){},dialog(){}});
TagUI.prototype.render=render;
const sent=[];ui.session={connected:true,request:async(action,value)=>{sent.push([action,value]);return {locked:true}}};
ui.view={phase:'shop',paused:false,run:{relic_locks:['urn'],shop:[{kind:'artifact',id:'urn',price:60},{kind:'artifact',id:'eye',price:90},{kind:'pack',id:'LOB',price:35}]}};
await ui.action('relic-lock',{dataset:{index:'1'}});
assert.deepEqual(sent,[['relic-lock',1]]);
ui.view.phase='draft';await ui.action('relic-lock',{dataset:{index:'1'}});assert.equal(sent.length,1,'only in the shop');
const r=ui.view.run;
assert.match(relicLockButton(r,r.shop[0],0,'data-tag="relic-lock"'),/aria-pressed="true".*Unlock relic/);
assert.match(relicLockButton(r,r.shop[1],1,'data-tag="relic-lock"'),/data-tag="relic-lock" data-index="1" aria-pressed="false"/);
assert.equal(relicLockButton(r,r.shop[2],2),'','packs have no lock');
assert.equal(relicLockButton(r,{...r.shop[0],sold:true},0),'','sold relics have no lock');
assert.equal(relicLockClass(r,r.shop[0]),' has-relic-lock relic-locked');
console.log('PASS Tag relic lock button: one shared request, shop only, same markup as solo');
