import assert from 'node:assert/strict';
import {mountMenuMotion} from '../../android/web/menu-motion.js';

function surface(){
 const listeners=new Map(),classes=new Set();
 return {listeners,classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),contains:n=>classes.has(n)},addEventListener(n,f){listeners.set(n,f)},removeEventListener(n,f){if(listeners.get(n)===f)listeners.delete(n)},emit(n,e){listeners.get(n)?.({type:n,...e})}};
}
for(const vertical of [false,true])for(const input of ['touch-card','touch-heading','touch-background','mouse-card']){
 globalThis.matchMedia=q=>({matches:q.includes('reduced-motion')||vertical});
 globalThis.cancelAnimationFrame=()=>{};globalThis.window=surface();globalThis.document={querySelector:()=>null};
 const root=surface(),cards=Array.from({length:7},(_,i)=>({dataset:{menu:String(i)},style:{setProperty(){}},offsetHeight:300,offsetWidth:200,hidden:false}));
 let captured=false;const selected=[];Object.assign(root,{clientWidth:900,querySelectorAll:()=>cards,closest:()=>root,setPointerCapture(){captured=true},hasPointerCapture:()=>captured,releasePointerCapture(){captured=false}});
 const motion=mountMenuMotion(root,7,2,i=>selected.push(i));
 const startTarget=input==='touch-background'?root:input==='touch-heading'?{parentElement:cards[2]}:cards[2];
 const event=(point,target=startTarget)=>({target,pointerId:1,pointerType:input.startsWith('touch')?'touch':'mouse',isPrimary:true,button:0,clientX:vertical?50:point,clientY:vertical?point:50,preventDefault(){},stopImmediatePropagation(){}});
 root.emit('pointerdown',event(200));root.emit('pointermove',event(170));
 if(input==='touch-card'||input==='touch-heading')root.emit('lostpointercapture',event(170));
 assert.equal(selected.length,0,'capture handoff must not settle the drag');
 const before=cards[2].style.transform;root.emit('pointermove',event(70,root));assert.notEqual(cards[2].style.transform,before,'drag must continue after implicit capture ends');
 root.emit('pointerup',event(70,root));assert.equal(selected.length,1);assert.notEqual(selected[0],2);
 let blocked=false;root.emit('click',{preventDefault(){blocked=true},stopImmediatePropagation(){}});assert.ok(blocked,'swipe must not activate card');
 motion.destroy();assert.equal(root.listeners.size,0);assert.equal(window.listeners.size,0);
 // A normal tap remains available to the card click handler.
 const tapped=mountMenuMotion(root,7,2,()=>{});root.emit('pointerdown',event(200));root.emit('pointerup',event(200));blocked=false;root.emit('click',{preventDefault(){blocked=true},stopImmediatePropagation(){}});assert.equal(blocked,false);
 // Losing capture on the carousel itself must still end the gesture.
 root.emit('pointerdown',event(200));root.emit('pointermove',event(100));captured=false;root.emit('lostpointercapture',event(100,root));assert.equal(root.classList.contains('dragging'),false);
 tapped.destroy();
}
console.log('PASS portrait/landscape: touch card, heading, background and mouse drags; taps; swipe-click suppression; true capture loss; cleanup');
