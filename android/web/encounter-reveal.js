export const escapeEncounter=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=escapeEncounter;
export const hasSpyglass=r=>(r.artifacts||[]).includes('deck_spyglass')||r.mirror_copy==='deck_spyglass';
export const bossRerollPrice=r=>{const n=Math.max(0,Number(r.boss_rerolls)||0);return n<2?[30,50][n]:100+(n-2)*50};
export function encounterPortrait(content,r,i){
 const c=content.characters[i],boss=(r.round+1)%3===0;
 return boss||hasSpyglass(r)||(r.revealed_opponents||[]).includes(i)?`<div class="duelist-hero encounter-hero" style="background-image:url('assets/${esc(c.background||'character-backgrounds/'+i+'.jpg')}')"><img src="assets/${esc(c.sprite)}" alt="${esc(c.name)}"><h2>${esc(c.name)}</h2></div>`:`<div class="duelist-hero encounter-hero encounter-mystery" aria-label="Unknown opponent"><span>?</span></div>`;
}
export function encounterCard(content,r,i,{button,curseIcons}={}){
 const reward=r.route_rewards[i],p=content.packs.find(x=>x.id===reward.pack),boss=(r.round+1)%3===0;
 return `<section class="opponent" data-encounter="${i}">${encounterPortrait(content,r,i)}<div class="reward"><img src="textures/attack.png" alt=""><span>SHOP BOOST<br><b>${esc(reward.label)}</b></span></div><div class="reward"><img src="assets/packs/${esc(p.id)}.jpg" alt=""><span>GUARANTEED PACK<br>${esc(p.name)}</span></div>${boss?curseIcons(content,r.route_curses?.[i]||[]):''}${!boss&&!hasSpyglass(r)&&!(r.revealed_opponents||[]).includes(i)?button('<span>Reveal</span><img src="assets/ui/coins.png" alt="Coins"><b>15</b>','reveal-opponent',`data-opponent="${i}" ${r.gold<15?'disabled':''}`,'opponent-reveal'):''}${hasSpyglass(r)?button('View deck','peek-deck',`data-opponent="${i}"`):''}${button(boss?'Challenge boss':'Start duel','start',`data-opponent="${i}"`,'primary')}</section>`;
}
export function bossBanner(r){return `<div class="boss-banner"><h2>Boss Duel</h2></div>`}
export function bossControls(r,{tag=false,disabled=false,action='boss-reroll'}={}){const cost=bossRerollPrice(r);return `<div class="boss-economy"><div class="boss-wallet" aria-label="${r.gold} coins"><img src="assets/ui/coins.png" alt=""><div><small>YOUR COINS</small><strong>${Number(r.gold).toLocaleString()}</strong></div></div><button class="boss-reroll-shop" ${tag?'data-tag':'data-do'}="${action}" ${disabled||r.gold<cost?'disabled':''} aria-label="Reroll ${tag?'bosses':'boss'} for ${cost} coins"><span class="boss-reroll-label"><span aria-hidden="true">↻</span> REROLL</span><span class="boss-reroll-price"><img src="assets/ui/coins.png" alt="Coins"><strong>${cost}</strong></span></button></div>`}
// Every timer and animation is owned by the overlay and cleaned up on navigation.
export async function playEncounterReveal({content,opponents,players=[0],lp=[8000,8000],slot=false,sound=()=>{},tickSound=()=>{},stopTick=()=>{},active=()=>true,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches}){
 const overlay=document.createElement('section');overlay.className='encounter-cinematic '+(slot?'boss-reel':'duel-intro');overlay.setAttribute('role','status');
 const portrait=i=>{const c=content.characters[i];return `<div class="versus-portrait"><img src="assets/${esc(c.sprite)}" alt="${esc(c.name)}"><strong>${esc(c.name)}</strong></div>`};
 const life=n=>`<div class="versus-lp"><small>LP</small><strong>${Number(lp[n]).toLocaleString()}</strong></div>`;
 overlay.innerHTML=`<div class="encounter-aura"></div><div class="cinematic-copy"><h1>${slot?'FATE IS TURNING':"IT’S TIME TO DUEL"}</h1></div>${slot?`<div class="cinematic-reels">${opponents.map(()=>'<div class="cinematic-window slot-window"><img alt=""><strong></strong></div>').join('')}</div>`:`<div class="versus-stage"><div class="versus-side versus-player"><div class="versus-portraits">${players.map(portrait).join('')}</div>${life(0)}</div><strong class="versus-mark">VS</strong><div class="versus-side versus-opponent" aria-hidden="true" style="visibility:hidden;opacity:0"><div class="versus-portraits">${opponents.map(portrait).join('')}</div>${life(1)}</div></div>`}<div class="cinematic-line"></div>`;
 const concealed=slot?[...document.querySelectorAll('.page.boss .routes')].map(el=>({el,visibility:el.style.visibility,hidden:el.getAttribute('aria-hidden')})):[];for(const x of concealed){x.el.style.visibility='hidden';x.el.setAttribute('aria-hidden','true')}
 document.body.append(overlay);const windows=[...overlay.querySelectorAll('.slot-window')],animations=[];let timer,watch,spin;
 const show=(ids)=>windows.forEach((w,n)=>{const c=content.characters[ids[n]];w.querySelector('img').src='assets/'+c.sprite;w.querySelector('img').alt=c.name;w.querySelector('strong').textContent=c.name});
 const duration=reduced?1500:slot?2300:2800;
 try{
  sound(slot?'diceroll':'nextturn',slot?.18:.25,slot?1450:0);const initial=(content.playable||content.characters.map((_,i)=>i)).filter(i=>!opponents.includes(i));show(slot&&!reduced?opponents.map((_,n)=>initial[n%initial.length]):opponents);
  if(slot&&!reduced){let tick=0;const pool=content.playable||content.characters.map((_,i)=>i);spin=setInterval(()=>{tick++;show(opponents.map((_,n)=>pool[(tick*3+n*7)%pool.length]));windows.forEach(w=>animations.push(w.querySelector('img').animate([{transform:'translateY(-45%)'},{transform:'translateY(45%)'}],{duration:90})));if(tick%3===0)tickSound();},90);timer=setTimeout(()=>{clearInterval(spin);show(opponents);overlay.classList.add('landed');sound('specialsummon',.3)},1450)}
  else{overlay.classList.add('landed');if(!slot){const left=overlay.querySelector('.versus-player'),right=overlay.querySelector('.versus-opponent');if(!reduced)animations.push(left.animate([{opacity:0,transform:'translateX(-90px)'},{opacity:1,transform:'translateX(0)'}],{duration:450,fill:'both',easing:'ease-out'}));timer=setTimeout(()=>{right.style.visibility='visible';right.style.opacity='1';right.removeAttribute('aria-hidden');if(!reduced)animations.push(right.animate([{opacity:0,transform:'translateX(110px) scale(.85)',filter:'brightness(3)'},{opacity:1,transform:'translateX(0) scale(1)',filter:'brightness(1)'}],{duration:550,fill:'both',easing:'cubic-bezier(.16,1,.3,1)'}));sound('specialsummon',.3)},reduced?350:850)}}
  if(!reduced)animations.push(overlay.animate([{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.83},{opacity:0}],{duration,fill:'both'}));
  await new Promise(resolve=>{let elapsed=0;watch=setInterval(()=>{elapsed+=50;if(elapsed>=duration||!active()||document.hidden||!overlay.isConnected)resolve()},50)});
 }finally{stopTick();clearTimeout(timer);clearInterval(watch);clearInterval(spin);animations.forEach(a=>a.cancel());overlay.remove();for(const x of concealed){x.el.style.visibility=x.visibility;if(x.hidden===null)x.el.removeAttribute('aria-hidden');else x.el.setAttribute('aria-hidden',x.hidden)}}
}

export async function playPortraitReveal({before,update,after,active=()=>true}){
 if(!before){await update();return}const flash=document.createElement('div');flash.className='portrait-reveal-flash';const animations=[];const position=el=>{const r=el.getBoundingClientRect();Object.assign(flash.style,{position:'fixed',inset:'auto',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:'1001'})};
 try{
  position(before);document.body.append(flash);let a=flash.animate([{opacity:0},{opacity:1}],{duration:100,fill:'both'});animations.push(a);await a.finished.catch(()=>{});
  if(!active())return;await update();const target=after();if(!target||!active())return;
  position(target);flash.style.opacity='1';a.cancel();a=flash.animate([{opacity:1},{opacity:0}],{duration:300,fill:'both',easing:'ease-out'});animations.push(a);await a.finished.catch(()=>{});
 }finally{animations.forEach(a=>a.cancel());flash.remove()}
}
