// Shop pointer gestures: selecting never purchases; scrolling cancels both actions.
export function installShopGestures(root,{tap,hold,delay=500}){
 let gesture=null;
 const suppressedClicks=[];
 const itemFor=target=>target?.closest?.('[data-shop-item]')||null;
 const cancel=()=>{if(gesture){clearTimeout(gesture.timer);gesture.cancelled=true}};
 const rememberClick=e=>{
  suppressedClicks.push({index:gesture.index,x:Number.isFinite(e.clientX)?e.clientX:gesture.x,y:Number.isFinite(e.clientY)?e.clientY:gesture.y,until:Date.now()+1500});
  if(suppressedClicks.length>8)suppressedClicks.shift();
 };
 const consumeClick=(e,item)=>{
  if(e.detail===0)return false;
  const now=Date.now();
  for(let i=suppressedClicks.length-1;i>=0;i--)if(suppressedClicks[i].until<now)suppressedClicks.splice(i,1);
  const index=item?Number(item.dataset.shopItem):NaN;
  const tokenIndex=suppressedClicks.findIndex(token=>(Number.isFinite(index)&&token.index===index)||(Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)&&Math.hypot(e.clientX-token.x,e.clientY-token.y)<=24));
  if(tokenIndex<0)return false;
  suppressedClicks.splice(tokenIndex,1);
  e.preventDefault();e.stopImmediatePropagation();
  return true;
 };
 root.addEventListener('pointerdown',e=>{
  cancel();gesture=null;
  const el=itemFor(e.target);
  if(!el||e.button!==0||e.isPrimary===false)return;
  const g=gesture={id:e.pointerId,el,index:Number(el.dataset.shopItem),x:e.clientX,y:e.clientY,pointerType:e.pointerType,cancelled:false,held:false};
  g.timer=setTimeout(()=>{if(g!==gesture||g.cancelled||!el.isConnected)return;g.held=true;hold(g.index)},delay);
 },true);
 root.addEventListener('pointermove',e=>{const threshold=gesture?.pointerType==='touch'?18:10;if(gesture?.id===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>threshold)cancel()},{capture:true,passive:true});
 // Only a shop scroller containing the active card cancels its hold. Viewport and unrelated scrolls are irrelevant.
 root.addEventListener('scroll',e=>{if(!gesture||!e.target||e.target===root)return;if(e.target.contains?.(gesture.el))cancel()},{capture:true,passive:true});
 root.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId){cancel();rememberClick(e);gesture=null}},true);
 root.addEventListener('pointerup',e=>{
  if(gesture?.id!==e.pointerId)return;
  const g=gesture;clearTimeout(g.timer);
  const item=itemFor(e.target),sameItem=Number(item?.dataset.shopItem)===g.index;
  if(sameItem||g.held)rememberClick(e);
  if(!g.cancelled&&!g.held&&sameItem)tap(g.index);
  gesture=null;
 },true);
 root.addEventListener('click',e=>{
  const el=itemFor(e.target);
  if(consumeClick(e,el))return;
  if(!el)return;
  e.preventDefault();e.stopImmediatePropagation();
  const g=gesture;clearTimeout(g?.timer);gesture=null;
  if(e.detail===0||!g||(!g.cancelled&&!g.held&&Number(el.dataset.shopItem)===g.index))tap(Number(el.dataset.shopItem));
 },true);
 root.addEventListener('contextmenu',e=>{const el=itemFor(e.target);if(!el)return;e.preventDefault();if(e.button!==2||e.pointerType==='touch')return;cancel();gesture=null;hold(Number(el.dataset.shopItem))},true);
 root.addEventListener('dragstart',e=>{if(itemFor(e.target)){cancel();e.preventDefault()}},true);
}
