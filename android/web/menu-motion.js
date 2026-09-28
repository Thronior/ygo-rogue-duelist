// Continuous, cyclic menu movement shared by touch, mouse, arrows and keyboard.
export function mountMenuMotion(root,count,initial,onSelect){
 const cards=[...root.querySelectorAll('[data-menu]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let position=initial,target=initial,velocity=0,frame=0,last=0,drag=null,suppressUntil=0;
 const wrap=n=>(n%count+count)%count;
 const portrait=()=>matchMedia('(orientation:portrait)').matches;
 const cardSize=()=>{const c=cards.find(c=>!c.hidden)||cards[0];return portrait()?c.offsetHeight:c.offsetWidth;};
 const gap=()=>portrait()?-cardSize()*.22:Math.max(10,root.clientWidth*.012);
 const spacing=()=>Math.max(1,cardSize()*.86+gap());
 function paint(){
  for(const card of cards){
   const i=Number(card.dataset.menu);
   const d=wrap(i-position+count/2)-count/2,dist=Math.abs(d);
   card.hidden=dist>2.6;card.dataset.distance=String(dist);
   card.style.setProperty('--menu-offset',d);
   const near=Math.min(dist,1),offset=Math.sign(d)*(cardSize()*(.72*dist+.28*(near-near*near/2))+gap()*dist);
   card.style.left=portrait()?'50%':`calc(50% + ${offset}px)`;
   const focus=1-Math.min(dist,1);
   card.style.top=portrait()?`calc(50% + ${offset}px)`:`calc(50% + ${focus*14}px)`;
   card.style.scale='none';
   card.style.transform=`translate(-50%,-50%) scale(${1-.28*Math.min(dist,1)})`;
   card.style.filter=`brightness(${1-.42*Math.min(dist,1)})`;
   card.style.opacity=String(Math.min(1,Math.max(0,2.6-dist)));
   card.style.zIndex=String(100-Math.round(dist*10));
  }
 }
 function tick(now){
  const dt=Math.min((now-last)/1000||1/60,.032);last=now;
  velocity+=(target-position)*100*dt;
  velocity*=Math.exp(-16*dt);position+=velocity*dt;
  if(Math.abs(target-position)<.001&&Math.abs(velocity)<.01){position=target;velocity=0;frame=0;paint();return;}
  paint();frame=requestAnimationFrame(tick);
 }
 function settle(next){
  target=next;onSelect(wrap(next));
  if(reduced.matches){cancelAnimationFrame(frame);frame=0;position=target;velocity=0;paint();}
  else if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}
 }
 function down(e){
  if(!e.isPrimary||e.button!==0)return;
  cancelAnimationFrame(frame);frame=0;
  drag={id:e.pointerId,start:portrait()?e.clientY:e.clientX,position,last:performance.now(),point:portrait()?e.clientY:e.clientX,moved:false,vertical:portrait()};
  velocity=0;
 }
 function move(e){
  if(!drag||e.pointerId!==drag.id)return;
  const point=drag.vertical?e.clientY:e.clientX,now=performance.now();
  if(!drag.moved&&Math.abs(point-drag.start)<6)return;
  if(!drag.moved){drag.moved=true;root.setPointerCapture(e.pointerId);root.classList.add('dragging');}
  position=drag.position-(point-drag.start)/spacing();
  const dt=now-drag.last;
  if(dt>0)velocity=.35*velocity+.65*(drag.point-point)/spacing()*1000/dt;
  drag.point=point;drag.last=now;paint();e.preventDefault();
 }
 function up(e){
  if(!drag||e.pointerId!==drag.id)return;
  const previous=drag;drag=null;root.classList.remove('dragging');
  if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);
  if(previous.moved){
   suppressUntil=performance.now()+400;
   if(performance.now()-previous.last>100||e.type==='pointercancel')velocity=0;
   const travel=position-previous.position,projected=position+Math.max(-.65,Math.min(.65,velocity*.13));
   settle(Math.abs(travel)>.18? (travel>0?Math.max(Math.round(projected),Math.floor(previous.position)+1):Math.min(Math.round(projected),Math.ceil(previous.position)-1)):Math.round(projected));
  }else settle(target);
 }
 function click(e){if(performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}}
 function resize(){if(drag){drag=null;root.classList.remove('dragging');}velocity=0;settle(Math.round(target));paint();}
 root.classList.add('smooth-menu');paint();
 root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move);
 root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);root.addEventListener('lostpointercapture',up);
 root.addEventListener('click',click,true);root.addEventListener('dragstart',prevent);
 window.addEventListener('resize',resize);
 function prevent(e){e.preventDefault();}
 return {
  select(index){settle(target+wrap(index-wrap(target)+count/2)-count/2);},
  step(direction){settle(target+direction);},
  destroy(){cancelAnimationFrame(frame);window.removeEventListener('resize',resize);for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up],['dragstart',prevent]])root.removeEventListener(name,fn);root.removeEventListener('click',click,true);}
 };
}
