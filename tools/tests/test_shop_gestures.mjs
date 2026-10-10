import assert from 'node:assert/strict';
import {installShopGestures} from '../../android/web/shop-gestures.js';
const timers=new Map();let tid=0;
globalThis.setTimeout=fn=>{timers.set(++tid,fn);return tid};globalThis.clearTimeout=id=>timers.delete(id);
function setup(){
 timers.clear();const listeners=new Map(),taps=[],holds=[];
 const root={addEventListener(type,fn){listeners.set(type,fn)}};
 const item={dataset:{shopItem:'2'},isConnected:true,closest(){return this}};
 installShopGestures(root,{tap:i=>taps.push(i),hold:i=>holds.push(i)});
 const emit=(type,extra={})=>listeners.get(type)?.({target:item,pointerId:1,button:0,clientX:0,clientY:0,detail:1,preventDefault(){},stopImmediatePropagation(){},...extra});
 return {emit,taps,holds};
}
for(const mode of ['normal','missing-up','click-only','keyboard']){
 const {emit,taps}=setup();
 if(mode==='normal'||mode==='missing-up')emit('pointerdown');
 if(mode==='normal')emit('pointerup');
 emit('click',{detail:mode==='keyboard'?0:1});assert.deepEqual(taps,[2],mode+' must select exactly once');assert.equal(timers.size,0);
}
for(const mode of ['scroll','move','cancel','hold'])for(const missingUp of [true,false]){
 const {emit,taps,holds}=setup();emit('pointerdown');
 if(mode==='hold'){for(const fn of [...timers.values()])fn()}else if(mode==='move')emit('pointermove',{clientX:30});else emit(mode==='cancel'?'pointercancel':'scroll');
 if(!missingUp)emit('pointerup');emit('click');assert.deepEqual(taps,[],mode+' must not select');assert.equal(holds.length,mode==='hold'?1:0);
 emit('pointerdown');emit('pointerup');emit('click');assert.deepEqual(taps,[2],'next tap recovers after '+mode);
}
console.log('PASS shop clicks recover without pointerup; taps select once; scroll, drag, cancellation and inspection do not select; next tap recovers.');
