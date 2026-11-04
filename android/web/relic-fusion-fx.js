// Relic fusion reveal (2026-11-03): the pieces drift in, collide in a flash, and the fused relic appears.
// Transforms and opacity only, so low-end WebViews keep up. A tap skips ahead; a second tap closes.
const escape=s=>String(s).replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);

export function playRelicFusion({pieces,result,sound=()=>{}}){
 return new Promise(resolve=>{
  const html=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,lite=html.classList.contains('compatibility-mode');
  const root=document.createElement('div');root.className='relic-fusion';root.setAttribute('role','dialog');root.setAttribute('aria-label','Relic fusion: '+result.name);
  root.innerHTML=`<div class="relic-fusion-stage">${pieces.map((p,i)=>`<img class="relic-fusion-piece" style="--angle:${(360/pieces.length)*i-90}deg" src="${escape(p.img)}" alt="${escape(p.name)}">`).join('')}<div class="relic-fusion-flash"></div></div>
<div class="relic-fusion-result"><small>RELIC FUSION</small><img src="${escape(result.img)}" alt=""><h2>${escape(result.name)}</h2><p>${escape(result.text)}</p><span class="relic-fusion-hint">Tap to continue</span></div>`;
  document.body.append(root);
  const animations=[];let done=false,revealed=false;
  const reveal=()=>{if(revealed)return;revealed=true;for(const a of animations)a.finish?.();root.classList.add('revealed');sound('perfect-chime')};
  const close=()=>{if(done)return;done=true;root.animate([{opacity:1},{opacity:0}],{duration:reduced?1:180}).finished.catch(()=>{}).finally(()=>{root.remove();resolve()})};
  root.addEventListener('click',()=>revealed?close():reveal());
  if(reduced){reveal();return}
  sound('rare-shimmer');
  const radius=Math.min(innerWidth,innerHeight)*.3,pieceEls=[...root.querySelectorAll('.relic-fusion-piece')];
  pieceEls.forEach((el,i)=>{
   const angle=((360/pieces.length)*i-90)*Math.PI/180,x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
   const frames=lite?[{transform:`translate(${x}px,${y}px)`,opacity:0},{transform:`translate(${x}px,${y}px)`,opacity:1,offset:.25},{transform:'translate(0,0) scale(.35)',opacity:1}]
    :[{transform:`translate(${x}px,${y}px) rotate(0deg) scale(.6)`,opacity:0},{transform:`translate(${x}px,${y}px) rotate(0deg) scale(1)`,opacity:1,offset:.25},{transform:`translate(${x*.35}px,${y*.35}px) rotate(200deg) scale(.8)`,opacity:1,offset:.75},{transform:'translate(0,0) rotate(360deg) scale(.3)',opacity:1}];
   animations.push(el.animate(frames,{duration:1100,delay:i*70,easing:'cubic-bezier(.55,0,.75,.4)',fill:'forwards'}));
  });
  const flash=root.querySelector('.relic-fusion-flash'),end=1100+pieces.length*70;
  animations.push(flash.animate([{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1.4)',offset:.35},{opacity:0,transform:'scale(2.2)'}],{duration:520,delay:end-120,easing:'ease-out',fill:'forwards'}));
  setTimeout(()=>{if(!done)reveal()},end+180);
 });
}
