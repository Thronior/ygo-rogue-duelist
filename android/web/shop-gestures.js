// Shop pointer gestures: selecting never purchases; scrolling cancels both actions.
export function installShopGestures(root,{tap,hold,delay=500}){
 let gesture=null,suppressClick=false;
 const cancel=()=>{if(gesture){clearTimeout(gesture.timer);gesture.cancelled=true}};
 root.addEventListener('pointerdown',e=>{suppressClick=false;cancel();gesture=null;const el=e.target.closest('[data-shop-item]');if(!el||e.button!==0)return;const g=gesture={id:e.pointerId,el,index:Number(el.dataset.shopItem),x:e.clientX,y:e.clientY,cancelled:false,held:false};g.timer=setTimeout(()=>{if(g!==gesture||g.cancelled||!el.isConnected)return;g.held=true;hold(g.index)},delay)},true);
 root.addEventListener('pointermove',e=>{if(gesture?.id===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>10)cancel()},{capture:true,passive:true});
 root.addEventListener('scroll',cancel,{capture:true,passive:true});root.addEventListener('pointercancel',cancel,true);
 root.addEventListener('pointerup',e=>{if(gesture?.id!==e.pointerId)return;const g=gesture;clearTimeout(g.timer);gesture=null;suppressClick=true;if(!g.cancelled&&!g.held&&e.target.closest('[data-shop-item]')===g.el)tap(g.index)},true);
 root.addEventListener('click',e=>{if(suppressClick&&e.detail!==0){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();return}const el=e.target.closest('[data-shop-item]');if(!el)return;e.preventDefault();e.stopImmediatePropagation();if(e.detail===0)tap(Number(el.dataset.shopItem))},true);
 root.addEventListener('contextmenu',e=>{if(e.target.closest('[data-shop-item]'))e.preventDefault()},true);
 root.addEventListener('dragstart',e=>{if(e.target.closest('[data-shop-item]')){cancel();e.preventDefault()}},true);
}
