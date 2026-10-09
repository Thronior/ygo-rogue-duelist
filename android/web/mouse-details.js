// Delegated pointer events keep touch taps/dragging and existing click handlers unchanged.
export function installMouseDetails(root,describe){
 const selector='.draft-scroll .cardbtn,.cde-card>button[data-id],.cardbtn[data-collector="toggle"],.shop-product .product-art';
 let active=null,timer=null,tip=null;
 function clear(){clearTimeout(timer);timer=null;active?.classList.remove('mouse-card-hover');active=null;tip?.remove();tip=null;}
 root.addEventListener('pointerover',event=>{
  if(event.pointerType!=='mouse'||event.buttons)return;
  const el=event.target.closest(selector);if(!el||el===active)return;
  clear();const info=describe(el);if(!info)return;active=el;
  el.classList.add('mouse-card-hover');
  timer=setTimeout(()=>{
   if(active!==el||!el.isConnected)return clear();
   tip=document.createElement('aside');tip.className='mouse-details';tip.setAttribute('role','tooltip');tip.innerHTML=info;
   document.body.append(tip);
   const r=el.getBoundingClientRect(),t=tip.getBoundingClientRect(),gap=12;
   let x=r.right+gap;if(x+t.width>innerWidth-8)x=r.left-t.width-gap;
   tip.style.left=Math.max(8,Math.min(x,innerWidth-t.width-8))+'px';
   tip.style.top=Math.max(8,Math.min(r.top,innerHeight-t.height-8))+'px';
  },160);
 });
 root.addEventListener('pointerout',e=>{if(active&&active.contains(e.target)&&!active.contains(e.relatedTarget))clear();});
 document.addEventListener('pointerdown',clear,true);
 document.addEventListener('scroll',clear,true);
 document.addEventListener('keydown',clear,true);
 window.addEventListener('blur',clear);window.addEventListener('resize',clear);
 document.addEventListener('visibilitychange',clear);
 const observer=new MutationObserver(()=>{if(active&&!active.isConnected||tip&&document.querySelector('dialog[open]'))clear();});
 observer.observe(root,{childList:true,subtree:true});
 return clear;
}
