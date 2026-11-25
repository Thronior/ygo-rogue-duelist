// Tag "Keep playing" after a lost run (MonkehestMan, Discord 2026-11-25): the run-ended screen's Exit asked "Exit tag duels?"
// and its "Keep playing" only closed that window, leaving the team on an ending with nothing to play. A lost run, or one
// ended by skipping the final 1v1, now leaves at once; while the final 1v1 or the next loop is still on offer, Exit asks first.
import assert from 'node:assert/strict';
let modalOpen=false,closed=0;
const modal={close(){modalOpen=false;closed++}};
Object.assign(globalThis,{window:globalThis,Audio:class{},addEventListener(){},innerHeight:800,
 document:{hidden:false,addEventListener(){},removeEventListener(){},querySelector:s=>s==='#modal'?modal:null,querySelectorAll:()=>[]},location:{search:''},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
const {TagUI}=await import('./web/tag-ui.js');
TagUI.prototype.render=()=>{};
const dialogs=[];
const make=()=>{const ui=new TagUI({root:{style:{setProperty(){}},addEventListener(){},removeEventListener(){}},content:{},profile:{unlocked:[0]},image:id=>`${id}.jpg`,inspect(){},inspectPack(){},dialog:(title,body)=>{dialogs.push([title,body]);modalOpen=true},onExit:async()=>{ui.exited=(ui.exited||0)+1}});
 ui.left=0;ui.session={code:'ABCDE',seat:0,connected:true,exit:async()=>{ui.left++}};ui.destroy=()=>{};return ui};
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
// Run lost: no confirmation, the room is left and the menu is reached.
for(const [phase,finale] of [['gameover',{status:'available',votes:[false,false]}],['complete',{status:'skipped',votes:[false,false]}]]){
 const ui=make();ui.view={phase,seat:0,finale};dialogs.length=0;
 await ui.action('exit',{dataset:{}});
 ok(!dialogs.length&&ui.left===1&&ui.exited===1,`${phase}/${finale.status}: Exit leaves without a "Keep playing" window`);
}
// Something left to play: the window still asks, and Keep playing closes it without leaving.
for(const [phase,finale] of [['complete',{status:'available',votes:[false,false]}],['complete',{status:'finished',winner:0,votes:[false,false]}],['shop',{status:'available',votes:[false,false]}]]){
 const ui=make();ui.view={phase,seat:0,finale};dialogs.length=0;
 await ui.action('exit',{dataset:{}});
 ok(dialogs.length===1&&/cancel-exit/.test(dialogs[0][1])&&ui.left===0,`${phase}/${finale.status}: Exit asks first`);
 await ui.action('cancel-exit',{dataset:{}});
 ok(!modalOpen&&ui.left===0&&!ui.exited,`${phase}/${finale.status}: Keep playing closes the window and stays`);
}
console.log(`PASS Tag exit after a lost run (${checks} checks): leaves at once when nothing is left to play, asks otherwise`);
