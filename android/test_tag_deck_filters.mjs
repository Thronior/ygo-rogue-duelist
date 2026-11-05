// Tag's deck tab: Deselect all asks first, and the × resets type, sort and deck status with the search.
import assert from 'node:assert/strict';
Object.assign(globalThis,{window:globalThis,Audio:class{},addEventListener(){},innerHeight:800,
 document:{hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null}},location:{search:''},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
const {TagUI}=await import('./web/tag-ui.js');
const {searches,DECK_STATUS_OPTIONS,deckSearchButtons}=await import('./web/card-search.js');

const calls=[],render=TagUI.prototype.render;
TagUI.prototype.render=()=>calls.push(['render']);
const root={style:{setProperty(){}},addEventListener(){}};
const ui=new TagUI({root,content:{characters:[{name:'Yugi'}]},profile:{unlocked:[0]},image:id=>`${id}.jpg`,dialog:(title,body)=>calls.push(['dialog',title,body])});
ui.saveDraft=()=>calls.push(['save']);
calls.length=0;
ui.view={seat:0,ready:[false,false],run:{character:0,selected:[0,1,2]}};

await ui.action('deselect-all',{dataset:{}});
const [kind,title,body]=calls.shift();
assert.equal(kind,'dialog');assert.equal(title,'Deselect all?');
assert.match(body,/data-tag="deselect-all-confirm"/);
assert.deepEqual(ui.view.run.selected,[0,1,2],'nothing is removed before confirming');
await ui.action('deselect-all-confirm',{dataset:{}});
assert.deepEqual(ui.view.run.selected,[]);

ui.deckFilter='Monster';ui.deckSort='ATK';ui.deckStatus='Out';searches['tag-deck']={q:'dragon'};
ui.resetDeckFilters();
assert.deepEqual([ui.deckFilter,ui.deckSort,ui.deckStatus,searches['tag-deck']],['All','Newest','First',undefined]);

assert.equal(ui.deckStatus,'First','Deck first is the default');
assert.deepEqual(DECK_STATUS_OPTIONS.map(([value])=>value),['Any','In','Out','First']);
assert.doesNotMatch(deckSearchButtons('tag-deck',false),/effect-search-clear/,'no × when nothing is filtered');
assert.match(deckSearchButtons('tag-deck',true),/data-effect-search-clear="tag-deck"/,'× when only tab, sort or status is changed');
TagUI.prototype.render=render;
console.log('PASS Tag deck filters: Deselect all confirms, × resets everything');
