import assert from 'node:assert/strict';
import {installShopGestures} from '../../android/web/shop-gestures.js';
const timers=new Map();let tid=0;
globalThis.setTimeout=fn=>{timers.set(++tid,fn);return tid};globalThis.clearTimeout=id=>timers.delete(id);
function setup({rerenderOnTap=false}={}){
 timers.clear();const listeners=new Map(),taps=[],holds=[];
 const root={addEventListener(type,fn){listeners.set(type,fn)}};
 let item={dataset:{shopItem:'2'},isConnected:true,closest(){return this}};
 installShopGestures(root,{tap:i=>{taps.push(i);if(rerenderOnTap)item={dataset:{shopItem:String(i)},isConnected:true,closest(){return this}}},hold:i=>holds.push(i)});
 const emit=(type,extra={})=>{let prevented=false,stopped=false;listeners.get(type)?.({target:item,pointerId:1,button:0,isPrimary:true,pointerType:'mouse',clientX:0,clientY:0,detail:1,preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true},...extra});return {prevented,stopped}};
 return {emit,taps,holds,root,get item(){return item}};
}
// Pointerup selects the item and rerenders the shop before a delayed touch
// click. The suppression token survives a new pointerdown and is matched by
// inventory index or original coordinates, so it cannot steal a Relics click.
{
 const {emit,taps,item}=setup({rerenderOnTap:true});emit('pointerdown');emit('pointerup');
 emit('pointerdown',{target:{closest(){return null}},clientX:200,clientY:200});
 const relicClick=emit('click',{target:{closest(){return null}},clientX:200,clientY:200});
 assert.equal(relicClick.prevented,false,'a Relics button click must remain available');
 const delayed=emit('click',{target:item,clientX:0,clientY:0});
 assert.equal(delayed.prevented,true,'the delayed shop click must be suppressed');
 assert.deepEqual(taps,[2],'a delayed click must not toggle the selection back off');
}
for(const mode of ['normal','missing-up','click-only','keyboard']){
 const {emit,taps}=setup();
 if(mode==='normal'||mode==='missing-up')emit('pointerdown');
 if(mode==='normal')emit('pointerup');
 emit('click',{detail:mode==='keyboard'?0:1});assert.deepEqual(taps,[2],mode+' must select exactly once');assert.equal(timers.size,0);
}
for(const mode of ['scroll','move','cancel','hold'])for(const missingUp of [true,false]){
 const {emit,taps,holds}=setup();emit('pointerdown');
 if(mode==='hold'){for(const fn of [...timers.values()])fn()}else if(mode==='move')emit('pointermove',{clientX:30});else if(mode==='scroll')emit('scroll',{target:{contains:node=>node.dataset?.shopItem==='2'}});else emit('pointercancel');
 if(!missingUp)emit('pointerup');emit('click');assert.deepEqual(taps,[],mode+' must not select');assert.equal(holds.length,mode==='hold'?1:0);
 emit('pointerdown');emit('pointerup');emit('click');assert.deepEqual(taps,[2],'next tap recovers after '+mode);
}
// Unrelated viewport scrolls must not cancel a stationary shop-card hold.
{
 const {emit,taps,holds}=setup();emit('pointerdown');emit('scroll',{target:{contains:()=>false}});
 for(const fn of [...timers.values()])fn();emit('pointerup');emit('click');
 assert.deepEqual(holds,[2],'an unrelated scroll must not cancel the item detail hold');
 assert.deepEqual(taps,[],'a held item must not also be selected');
}
{
 const {emit,taps,holds,root}=setup();emit('pointerdown');emit('scroll',{target:root});
 for(const fn of [...timers.values()])fn();emit('pointerup');emit('click');
 assert.deepEqual(holds,[2],'viewport scrolling must not cancel a stationary card hold');
 assert.deepEqual(taps,[]);
}
// Small finger drift should still permit a long press.
{
 const {emit,taps,holds}=setup();emit('pointerdown',{pointerType:'touch'});emit('pointermove',{pointerType:'touch',clientX:12});
 for(const fn of [...timers.values()])fn();emit('pointerup');emit('click');
 assert.deepEqual(holds,[2],'normal finger drift must not cancel item inspection');
 assert.deepEqual(taps,[],'a long press must not select the item');
}
// A held gesture may release over a newly opened popup; its compatibility
// click must be consumed by coordinates so it cannot activate the popup.
{
 const {emit,taps,holds}=setup();emit('pointerdown');for(const fn of [...timers.values()])fn();
 emit('pointerup',{target:{closest(){return null}},clientX:40,clientY:40});
 const popupClick=emit('click',{target:{closest(){return null}},clientX:40,clientY:40});
 assert.equal(popupClick.prevented,true,'the long-press compatibility click must not activate a popup');
 assert.deepEqual(holds,[2]);assert.deepEqual(taps,[]);
}
// A shop-card tap may rerender before its compatibility click arrives. That
// click suppression must never consume a later click on another control.
{
 const {emit}=setup(),other={closest(){return null}};let prevented=false,stopped=false;
 emit('pointerdown');emit('pointerup');
 emit('click',{target:other,clientX:200,clientY:200,preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}});
 assert.equal(prevented,false,'an unrelated click should not be prevented');
 assert.equal(stopped,false,'an unrelated click should continue to the application handler');
}
console.log('PASS shop taps select once; delayed touch clicks cannot repeat selection; unrelated scrolls do not cancel holds; drag, active scrolling, cancellation, inspection, and next-tap recovery work.');
