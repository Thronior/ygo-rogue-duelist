// Continuous, cyclic menu movement shared by touch, mouse, arrows and keyboard.
export function mountMenuMotion(root,count,initial,onSelect){
 const cards=[...root.querySelectorAll('[data-menu]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let position=initial,target=initial,velocity=0,frame=0,last=0,drag=null,suppressUntil=0,opening=false,destroyed=false,twirl=null,back=null,backAnimation=null;
 const wrap=n=>(n%count+count)%count;
 const portrait=()=>matchMedia('(orientation:portrait)').matches;
 const cardSize=()=>{const c=cards.find(c=>!c.hidden)||cards[0];return portrait()?c.offsetHeight:c.offsetWidth;};
 const gap=()=>portrait()?-cardSize()*.22:Math.max(10,root.clientWidth*.012);
 const spacing=()=>Math.max(1,cardSize()*.86+gap());
 function paint(){
  const vertical=portrait(),size=cardSize(),space=vertical?-size*.22:Math.max(10,root.clientWidth*.012);
  for(const card of cards){
   const i=Number(card.dataset.menu);
   const d=wrap(i-position+count/2)-count/2,dist=Math.abs(d);
   card.hidden=dist>2.6;card.dataset.distance=String(dist);
   card.style.setProperty('--menu-offset',d);
   const near=Math.min(dist,1),offset=Math.sign(d)*(size*(.72*dist+.28*(near-near*near/2))+space*dist);
   card.style.left=vertical?'50%':`calc(50% + ${offset}px)`;
   const focus=1-Math.min(dist,1);
   card.style.top=vertical?`calc(50% + ${offset}px)`:`calc(50% + ${focus*14}px)`;
   card.style.scale='none';
   card.style.transform=`translate(-50%,-50%) scale(${1-.28*Math.min(dist,1)})`;
   card.style.filter=`brightness(${1-.42*Math.min(dist,1)})`;
   card.style.opacity=String(Math.min(1,Math.max(0,2.6-dist)));
   card.style.zIndex=String(100-Math.round(dist*10));
  }
 }
 function tick(now){
  const dt=Math.min((now-last)/1000||1/60,.032)/1.2;last=now;
  velocity+=(target-position)*100*dt;
  velocity*=Math.exp(-16*dt);position+=velocity*dt;
  if(Math.abs(target-position)<.001&&Math.abs(velocity)<.01){position=target;velocity=0;frame=0;paint();return;}
  paint();frame=requestAnimationFrame(tick);
 }
 function settle(next){
  if(opening||destroyed)return;
  target=next;onSelect(wrap(next));
  if(reduced.matches){cancelAnimationFrame(frame);frame=0;position=target;velocity=0;paint();}
  else if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}
 }
 function down(e){
  if(opening||destroyed||!e.isPrimary||e.button!==0)return;
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
  // Touch starts with implicit capture on the card. Its bubbled loss during
  // transfer to the carousel is not the end of the carousel's drag.
  if(e.type==='lostpointercapture'&&(e.target!==root||root.hasPointerCapture(e.pointerId)))return;
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
 function click(e){if(opening||performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}}
 function resize(){if(drag){drag=null;root.classList.remove('dragging');}velocity=0;settle(Math.round(target));paint();}
 const wheelRoot=root.closest('.title')||root;
 let wheelTotal=0,wheelLast=0,wheelStep=-Infinity;
 function wheel(e){
  if(e.ctrlKey||opening||destroyed||drag||document.querySelector('dialog[open]'))return;
  const raw=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!raw)return;
  e.preventDefault();const now=performance.now();
  if(now-wheelStep<160)return;
  if(now-wheelLast>180||Math.sign(raw)!==Math.sign(wheelTotal))wheelTotal=0;
  wheelLast=now;wheelTotal+=raw*(e.deltaMode===1?16:e.deltaMode===2?120:1);
  if(Math.abs(wheelTotal)>=40){settle(Math.round(target)+Math.sign(wheelTotal));wheelTotal=0;wheelStep=now;}
 }
 wheelRoot.addEventListener('wheel',wheel,{passive:false});
 root.classList.add('smooth-menu');paint();
 root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move);
 root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);root.addEventListener('lostpointercapture',up);
 root.addEventListener('click',click,true);root.addEventListener('dragstart',prevent);
 window.addEventListener('resize',resize);
 function prevent(e){e.preventDefault();}
 return {
  async open(card,onOpen){
   if(opening||destroyed||!cards.includes(card))return;
   opening=true;cancelAnimationFrame(frame);frame=0;drag=null;velocity=0;
   root.classList.remove('dragging');root.setAttribute('aria-busy','true');
   const base=card.style.transform;
   try{
    if(!reduced.matches){
     back=document.createElement('img');back.className='menu-twirl-back';back.src='assets/card-back.jpg';back.alt='';
     Object.assign(back.style,{position:'absolute',inset:'0',width:'100%',height:'100%',maxWidth:'none',maxHeight:'none',objectFit:'fill',borderRadius:'inherit',pointerEvents:'none',zIndex:'20'});
     card.append(back);
     backAnimation=back.animate([{opacity:0},{opacity:0,offset:.249},{opacity:1,offset:.25},{opacity:1,offset:.75},{opacity:0,offset:.751},{opacity:0}],{duration:280,easing:'linear'});
    }
    twirl=card.animate(reduced.matches?[{opacity:1},{opacity:.65},{opacity:1}]:[
     {transform:base+' perspective(900px) rotateY(0deg) rotateZ(0deg)'},
     {transform:base+' perspective(900px) rotateY(180deg) rotateZ(8deg)',offset:.5},
     {transform:base+' perspective(900px) rotateY(360deg) rotateZ(0deg)'}
    ],{duration:reduced.matches?100:280,easing:'linear'});
    await twirl.finished;
    if(!destroyed&&root.isConnected)await onOpen();
   }catch(error){if(error.name!=='AbortError')throw error;}
   finally{backAnimation?.cancel();backAnimation=null;back?.remove();back=null;twirl?.cancel();twirl=null;opening=false;root.removeAttribute('aria-busy');}
  },
  select(index){settle(target+wrap(index-wrap(target)+count/2)-count/2);},
  step(direction){settle(target+direction);},
  destroy(){wheelRoot.removeEventListener('wheel',wheel);destroyed=true;backAnimation?.cancel();back?.remove();back=null;twirl?.cancel();cancelAnimationFrame(frame);window.removeEventListener('resize',resize);for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up],['dragstart',prevent]])root.removeEventListener(name,fn);root.removeEventListener('click',click,true);}
 };
}
