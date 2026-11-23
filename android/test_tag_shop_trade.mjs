// Tag trading from the shop's deck editor (user, 2026-11-23). Shop deck edits normally reach the host only on the way back to
// the shop; a trade renumbers the collection, so voting sends them first, edits after your vote go straight away, and an
// edit the host never got is dropped once the trade begins.
import assert from 'node:assert/strict';
Object.assign(globalThis,{window:globalThis,Audio:class{},addEventListener(){},innerHeight:800,
 document:{hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null}},location:{search:''},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
const {TagUI}=await import('./web/tag-ui.js');
const sent=[],render=TagUI.prototype.render;
TagUI.prototype.render=()=>{};
const ui=new TagUI({root:{style:{setProperty(){}},addEventListener(){},querySelector(){return null},querySelectorAll(){return []}},content:{characters:[{name:'Yugi'}]},profile:{unlocked:[0]},image:id=>`${id}.jpg`,dialog(){}});
ui.session={code:'ROOM',connected:true,request:async(action,value)=>{sent.push([action,structuredClone(value)])}};
const trade=(votes,status='idle')=>({id:'t1',status,votes,sent:[false,false],selected:[],received:[],ack:[false,false],available:true});
ui.view={phase:'shop',seat:0,paused:false,ready:[false,false],trade:trade([false,true]),run:{character:0,round:1,pool:[10,11,12,13],selected:[0,1]}};

ui.editDeck([0,1,2]);
assert.deepEqual(sent,[],'a shop deck edit waits for the way back to the shop');
await ui.action('trade-vote',{dataset:{}});
assert.deepEqual(sent,[['deck',[0,1,2]],['trade-vote',{id:'t1',ready:true}]],'voting sends the pending deck edit first');

sent.length=0;ui.view.trade=trade([true,false]);
ui.editDeck([0,1,2,3]);await Promise.resolve();
assert.deepEqual(sent,[['deck',[0,1,2,3]]],'after your vote, shop deck edits go to the host at once');

// The teammate's vote arrives before an edit was confirmed: the trade renumbers the pool, so the stale edit is dropped.
ui.shopDeck={code:'ROOM',round:1,selected:[3],sent:false};
ui.updateRoomBadge=()=>{};ui.update({phase:'shop',seat:0,paused:false,ready:[false,false],trade:trade([true,true],'select'),shopping:{carts:[[],[]],locks:[null,null]},run:{character:0,round:1,pool:[10,11,12,13],selected:[0,1,2],shop:[]}});
assert.equal(ui.shopDeck,null,'an unconfirmed shop deck edit is dropped when the trade begins');
assert.deepEqual(ui.view.run.selected,[0,1,2],'the host deck shows');
TagUI.prototype.render=render;
console.log('PASS Tag shop trade: voting sends shop deck edits first, edits after a vote go at once, a stale edit is dropped');
