// Card marks in Tag (user, 2026-11-16): a tap on a tile's mark cycles Maybe → Yes → No at once and sends it to the
// host; a failed request puts the old mark back. The shared deck editor puts No cards last without resetting its pages.
import assert from 'node:assert/strict';
Object.assign(globalThis,{window:globalThis,Audio:class{},addEventListener(){},innerHeight:800,
 document:{hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null},querySelectorAll(){return []}},location:{search:''},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
const {TagUI}=await import('./web/tag-ui.js');
const {markTile,noMarksLast,cardMarkVersion}=await import('./web/card-marks.js');
const {deckOrder}=await import('./web/deck-editor-view.js');

const sent=[];let fail=false;
const root={style:{setProperty(){}},addEventListener(){},querySelector(){return null},querySelectorAll(){return []}};
TagUI.prototype.render=()=>{};
const ui=new TagUI({root,content:{characters:[{name:'Yugi'}]},profile:{unlocked:[0]},image:id=>`${id}.jpg`,dialog(){}});
ui.error=()=>{};
ui.session={connected:true,request:async(action,value)=>{sent.push([action,value]);if(fail)throw Error('offline')}};
ui.view={seat:0,phase:'draft',ready:[true,false],run:{character:0,pool:[10,20,30],selected:[0]}};
const tap=id=>ui.cycleMark({dataset:{cardMark:String(id)}});

await tap(20);assert.deepEqual(ui.view.run.card_marks,{20:1});assert.deepEqual(sent.at(-1),['mark',[20,1]]);
await tap(20);assert.deepEqual(ui.view.run.card_marks,{20:-1},'works while locked in');
await tap(20);assert.deepEqual(ui.view.run.card_marks,{});assert.deepEqual(sent.at(-1),['mark',[20,0]]);
fail=true;await tap(30);assert.deepEqual(ui.view.run.card_marks,{},'a failed request puts the old mark back');fail=false;
ui.view.phase='duel';const before=sent.length;await tap(10);assert.equal(sent.length,before,'no marks during a duel');

assert.match(markTile('<button class="cardbtn selected"><img></button>',{card_marks:{5:-1}},5),/class="cardbtn marked-no selected".*data-card-mark="5".*✕/);
assert.match(markTile('<button class="cardbtn"><img></button>',{},5),/☆<\/i><\/button>$/);
assert.deepEqual(noMarksLast([0,1,2],{card_marks:{20:-1}},i=>[10,20,30][i]),[0,2,1]);

// Shared editor: a No mark moves the card last; the page key (deck-paging.js) stays the same.
const lookup=id=>({id,name:'C'+id,data:{type:2}}),ed={deckFilter:'All',deckSort:'Name',deckStatus:'Any',deckSplit:0};
const run={pool:[10,20,30],selected:[],card_marks:{}};
const args={pool:run.pool,selected:[],lookup,run,info:{},searchKey:'tag-deck'};
assert.deepEqual(deckOrder(ed,args),[0,1,2]);const page=ed.deckPageKey;
run.card_marks={10:-1};assert.notEqual(cardMarkVersion(run),'');
assert.deepEqual(deckOrder(ed,args),[1,2,0]);assert.equal(ed.deckPageKey,page);
console.log('PASS Tag card marks: cycle, host request, revert on failure, not in duels, No last, pages kept');
