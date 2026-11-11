// The tutorial's on-screen coach (2026-11-11): one bubble with the current instruction and a glow on the thing to tap.
// tutorial-duel.js holds the script and the text; this file only draws. Cheap by design: the bubble is one fixed
// element updated when the duel screen redraws, and the glow is a two-step CSS animation (two repaints a second).
import {CARD,INTRO,TOUR,NUDGE,FREE_PLAY} from './tutorial-duel.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GLOW='lesson-target';

export class LessonCoach{
 // host: {setPreview(code,element), exit()} from mobile.js.
 constructor(host){
  this.host=host;this.step=null;this.waiting=null;this.caption=null;this.note=null;
  const el=this.el=document.createElement('aside');el.className='lesson-coach';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.hidden=true;
  el.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;e.stopPropagation();
   if(b.dataset.lesson==='next')this.advance();
   if(b.dataset.lesson==='exit')this.host.exit();
  });
  document.body.append(el);
 }
 destroy(){this.clearGlow();this.waiting?.resolve();this.waiting=null;this.el.remove()}
 clearGlow(){for(const x of document.querySelectorAll('.'+GLOW))x.classList.remove(GLOW)}
 glow(...targets){this.clearGlow();for(const t of targets.flat())if(t)t.classList.add(GLOW)}
 draw({title='',text='',why='',next=false,count='',note=''}){
  const key=[title,text,why,next,count,note].join('|');
  if(this.drawn!==key){
   this.drawn=key;
   this.el.innerHTML=`<button class="lesson-exit" data-lesson="exit" aria-label="Leave the tutorial" title="Leave the tutorial">✕</button>${title?`<h3>${esc(title)}</h3>`:''}${note?`<p class="lesson-note">${esc(note)}</p>`:''}<p class="lesson-say">${esc(text)}</p>${why?`<p class="lesson-why">${esc(why)}</p>`:''}${next?`<div class="lesson-next"><small>${esc(count)}</small><button class="primary" data-lesson="next">Next</button></div>`:''}`;
  }
  this.el.hidden=false;this.el.classList.toggle('lesson-blocking',next);this.place();
 }
 // Where the bubble sits, so it never covers what the player must tap: on a phone, in the free space under the card
 // window; on a wide screen, over the opponent's hand and back row (the tutorial opponent never uses them).
 place(){
  const mat=document.querySelector('.duel .mat'),lp=document.querySelector('.duel .lpbar'),box=document.querySelector('.duel>.inspection'),s=this.el.style;
  if(!mat||!lp||!box)return;
  if(matchMedia('(orientation:portrait)').matches){
   const r=box.getBoundingClientRect();
   Object.assign(s,{left:'8px',right:'8px',width:'auto',top:'auto',bottom:Math.max(0,innerHeight-r.bottom+6)+'px'});
  }else{
   const r=mat.getBoundingClientRect(),width=Math.min(440,r.width*.74);
   // An explanation of the opponent's own cards sits over the player's back row instead, so their hand and field stay in view.
   const low=this.waiting?.info.dock==='low';
   Object.assign(s,{left:Math.round(r.left+r.width/2-width/2)+'px',right:'auto',width:Math.round(width)+'px',top:low?'auto':Math.round(lp.getBoundingClientRect().bottom+4)+'px',bottom:low?Math.max(0,Math.round(innerHeight-r.bottom))+'px':'auto'});
  }
 }
 // A card the player must read and dismiss. Resolves on Next.
 card(info,glow=()=>[]){
  this.waiting?.resolve();
  return new Promise(resolve=>{
   this.waiting={info,glow,resolve:()=>{this.waiting=null;resolve()}};
   this.sync();
  });
 }
 advance(){this.waiting?.resolve();this.sync()}
 async intro(){for(const [i,page] of INTRO.entries())await this.card({...page,count:`${i+1} / ${INTRO.length}`},()=>i===2?[document.querySelector('.phases')]:[])}
 // The hand tour: each stop shows its card in the card window.
 async tour(){
  for(const [i,stop] of TOUR.entries()){
   const hand=()=>stop.card?document.querySelector(`.hand [data-code="${stop.card}"]`):null;
   if(stop.card)this.host.setPreview(stop.card,hand());
   await this.card({...stop,count:`${i+1} / ${TOUR.length}`},()=>{
    const box=document.querySelector('.duel>.inspection');
    if(stop.focus==='hand')return [document.querySelector('.hand')];
    if(stop.part==='window')return [box];
    if(stop.part==='stats')return [box?.querySelector('.stats')];
    if(stop.part==='genre')return [box?.querySelector('.badges')];
    if(stop.part==='text')return [box?.querySelector('.card-text')];
    return [hand()?.querySelector('img'),box?.querySelector('img')];
   });
  }
 }
 // A phase explanation while the phase strip lights that phase. Waits only when the script says so.
 async phase(info){
  if(!info)return;
  const button=()=>document.querySelector(`.phases [data-phase="${info.phase}"]`);
  // The strip shows the phase the duel has already reached; light the one being explained instead.
  const strip=[...document.querySelectorAll('.phases [data-phase]')],lit=strip.filter(b=>b.classList.contains('active'));
  const mark=on=>{for(const b of strip)b.classList.toggle('active',on?b===button():lit.includes(b))};
  if(info.block){mark(true);await this.card({title:info.title,text:info.text},()=>[button()]);mark(false);return}
  this.caption={title:info.title,text:info.text};this.sync();
 }
 // The guided step (or null) for the prompt now on screen.
 setStep(step){this.step=step;this.caption=null;this.note=null;this.sync()}
 // A plain line with nothing to tap, shown until the next step.
 say(text){this.caption={text};this.sync()}
 nudge(){this.note=NUDGE;this.sync();const el=this.el;el.classList.remove('lesson-shake');void el.offsetWidth;el.classList.add('lesson-shake')}
 // Redraws the bubble and the glow for whatever is on screen. Called after every duel redraw.
 sync(){
  if(this.waiting){const {info,glow}=this.waiting;this.draw({...info,next:true});this.glow(glow());return}
  const step=this.step;
  if(step?.beat){
   const b=step.beat;this.draw({text:b.say,why:b.why,note:this.note||''});this.glow(this.target(b.show));return;
  }
  if(step?.free){this.draw({text:FREE_PLAY});this.clearGlow();return}
  if(this.caption){this.draw(this.caption);this.clearGlow();return}
  this.el.hidden=true;this.clearGlow();
 }
 // The element to tap next: an open action menu or prompt first, then the card or phase button that leads to it.
 target(show){
  const q=s=>document.querySelector(s);
  if(show.act){const b=q(`.action-pop [data-act="${show.act}"]`);if(b)return [b]}
  if(show.prompt==='confirm'){const ok=q('.reaction-confirm:not([disabled]),[data-do="confirm-target"]:not([disabled]),[data-do="unselect-done"]:not([disabled])');if(ok)return [ok]}
  if(show.prompt==='call'){
   const ok=q('[data-do="choice-confirm"]:not([disabled])');if(ok)return [ok];
   const calls=[...document.querySelectorAll('.tw-calls button,.prompt .choices button')];
   return [calls.find(b=>/tails/i.test(b.textContent+b.getAttribute('aria-label')))||calls.at(-1)];
  }
  if(show.phase)return [q(`.phases [data-phase="${show.phase}"]`)];
  if(show.hand)return [q(`.hand [data-code="${show.hand}"] img`)];
  if(show.zone)return [q(`.zone:not(.enemy)[data-code="${show.zone}"]`)||q(`.zone:not(.enemy)[data-zone^="0,8,"] img`)?.closest('.zone')];
  return [];
 }
}
export const LESSON_CARD=CARD;
