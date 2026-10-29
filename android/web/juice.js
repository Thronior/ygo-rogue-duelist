// Effects that scale with the numbers: LP danger, flames behind strong monsters, the hand-limit shake,
// damage that hits harder, finishers with voice lines, portrait reactions, heals, stat pops, the deck-out
// warning, chain escalation, summon weight, the coin tally, buying and the shop reroll reels.
// Only opacity and transforms animate. Loops are few (the flames are animated images, decoded off the
// main thread) and stop under reduced motion and Performance Mode. Compatibility mode never moves
// board elements. Callers keep their own pacing: nothing here blocks a duel cue.
import {shake,wallMs as wall} from './duel-motion.js';
import {assetURL} from './startup-assets.js';

const html=document.documentElement;
const prefs=()=>{const compat=html.classList.contains('compatibility-mode');return {reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,lite:compat||html.classList.contains('performance-mode'),compat}};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const center=el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,r}};
function temp(tag,cls,parent=document.body){const el=document.createElement(tag);el.className=cls;el.setAttribute('aria-hidden','true');parent.append(el);return el}
function play(el,frames,options){const a=el.animate(frames,options);a.finished.catch(()=>{}).finally(()=>el.remove());return a}
const later=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// The game supplies its player: (path,{loop,gain}) => voice or null. The blade is the negation slash;
// finisher voice lines are assets/sfx/kill-<word>.wav.
const SOUNDS={blade:'assets/sfx/negation.wav',coin:'assets/sfx/purchase-coins.wav',ding:'assets/sfx/reward-ding.wav','reroll-loop':'assets/sfx/reward-reel.wav'};
let player=()=>null;
export function setJuiceSound(play){player=play}
// Finisher voices sit 3 dB above the other effects so they carry over the hit and the coin pickups.
function sound(name,{loop=false}={}){const voice=name.startsWith('kill-'),path=SOUNDS[name]||(voice?`assets/sfx/${name}.wav`:null);return path?player(path,{loop,gain:loop?.55:voice?1.4:1}):null}
function fadeOut(voice,ms=90){if(!voice?.pause)return;const from=voice.volume,t0=performance.now();const step=()=>{const k=Math.min(1,(performance.now()-t0)/ms);voice.volume=from*(1-k);if(k<1)requestAnimationFrame(step);else voice.pause()};requestAnimationFrame(step)}

// LP danger: each side of the field reddens as that player's LP drains; under 1000 it beats like a heart.
// Static gradients whose opacity changes only when LP does.
export function lpDanger(main,lp,max){
 if(!main)return;
 for(const [player,side] of [[0,'own'],[1,'enemy']]){
  let el=main.querySelector(':scope>.fx-danger.'+side);
  if(!el){el=document.createElement('div');el.className='fx-danger '+side;el.setAttribute('aria-hidden','true');main.prepend(el)}
  const start=Math.max(1,max[player]||8000),lost=clamp(1-lp[player]/start,0,1),strength=lost**1.6;
  el.style.opacity=(strength*.9).toFixed(3);el.style.transform=`scaleY(${(.55+.45*lost).toFixed(3)})`;
  const critical=lp[player]>0&&lp[player]<=Math.min(1000,start*.15);
  el.classList.toggle('critical',critical);
  main.querySelector(player?'.lpbar .life.enemy':'.lpbar .life:not(.enemy)')?.classList.toggle('fx-critical',critical);
  portraitOf(player)?.style.setProperty('--danger',(strength*.9).toFixed(3));
 }
}
// A pale "ghost" holds the old LP length and drains a beat after the bar.
export function lpGhost(life,from,to){
 if(!life||to>=from||prefs().reduced)return;
 life.querySelectorAll(':scope>.fx-ghost').forEach(g=>g.remove());
 const ghost=document.createElement('span');ghost.className='fx-ghost';ghost.setAttribute('aria-hidden','true');life.prepend(ghost);
 play(ghost,[{transform:`scaleX(${from})`},{transform:`scaleX(${from})`,offset:.35},{transform:`scaleX(${to})`}],{duration:wall(900),easing:'cubic-bezier(.5,0,.2,1)'});
}

// Portraits: the turn player's rim turns gold; a hit makes it flinch, a heal makes it bob, a lethal blow
// tips it over. Same element as the emotes anchor to, and only transforms move.
const portraitOf=player=>document.querySelector(player?'.duel .field-character:not(.own)':'.duel .field-character.own');
function portraitTurn(player){for(const p of [0,1])portraitOf(p)?.classList.toggle('fx-turn',p===player)}
function portraitHit(player,tier){
 const el=portraitOf(player),{reduced}=prefs();if(!el||reduced)return;const s=[2,3,5,7,9][tier-1];
 el.animate([{translate:'0 0',rotate:'0deg'},{translate:`${-s}px ${s/3}px`,rotate:`${-s/3}deg`,offset:.2},{translate:`${s*.8}px ${-s/4}px`,rotate:`${s/4}deg`,offset:.45},{translate:`${-s/3}px 0`,rotate:`${-s/8}deg`,offset:.7},{translate:'0 0',rotate:'0deg'}],{duration:wall(260+tier*40),easing:'ease-out',composite:'add'});
}
function portraitKO(player){const el=portraitOf(player);if(!el)return;el.animate(prefs().reduced?[{opacity:1},{opacity:.5}]:[{rotate:'0deg',translate:'0 0',opacity:1},{rotate:'-4deg',translate:'0 -6px',opacity:1,offset:.25},{rotate:'14deg',translate:'4px 10px',opacity:.55}],{duration:wall(700),delay:wall(240),easing:'cubic-bezier(.5,0,.75,1)',fill:'forwards'})}

// Flames behind strong monsters: from 2000 ATK a flame burns behind the card and grows with ATK up to
// 8000; from 5000 it burns blue. All flames live in one layer behind every card on the mat, so they never
// cover a card or its numbers. They are animated WebP images: no CSS animation, and the browser repaints
// only each flame's box at about 9 fps. Three phase-shifted copies keep neighbours out of step.
const BLUE_AT=5000,MAX_AT=8000,growth=atk=>clamp((atk-2000)/(MAX_AT-2000),0,1);
const flameSrc=(blue,still)=>assetURL(`assets/effects/${blue?'flame-hot':'flame'}-${still?'still.png':'abc'[Math.floor(Math.random()*3)]+'.webp'}`);
function powerFlame(zone,atk){
 const mat=zone.closest('.mat'),img=zone.querySelector(':scope>img'),key=zone.dataset.zone;
 let blaze=mat?.querySelector(`:scope>.fx-flame-layer>.fx-blaze[data-for="${key}"]`);
 if(!mat||!img||!(atk>=2000)){delete zone.dataset.fxPower;blaze?.remove();return}
 // The ATK number warms with the flame: 2000, 3000, 4000, 5000 (blue), 8000.
 zone.dataset.fxPower=String(atk>=8000?5:atk>=BLUE_AT?4:atk>=4000?3:atk>=3000?2:1);
 let layer=mat.querySelector(':scope>.fx-flame-layer');
 if(!layer){layer=document.createElement('div');layer.className='fx-flame-layer';layer.setAttribute('aria-hidden','true');mat.prepend(layer)}
 if(!blaze){blaze=document.createElement('div');blaze.className='fx-blaze';blaze.dataset.for=key;layer.append(blaze)}
 const {reduced,lite}=prefs(),still=reduced||lite,blue=atk>=BLUE_AT,kind=(blue?'b':'o')+(still?'s':''),before=Number(blaze.dataset.atk)||0;
 if(blaze.dataset.kind!==kind){blaze.dataset.kind=kind;blaze.classList.toggle('blue',blue);blaze.innerHTML=`<span class="fx-glow"></span><img class="fx-flame" alt="" src="${flameSrc(blue,still)}">`}
 blaze.dataset.atk=String(atk);placeBlaze(blaze,zone,img);
 // Raising ATK makes the flame flare up once.
 if(before&&atk>before&&!reduced)blaze.animate([{scale:'1 1'},{scale:'1.12 1.3',offset:.3},{scale:'1 1'}],{duration:wall(460),easing:'ease-out'});
}
// Layout boxes only (no transforms involved), so the field's 3D tilt is fine. Whole pixels; the flame keeps
// the image's proportions, its rounded base hides behind the card and its tongues rise around it.
function placeBlaze(blaze,zone,img){
 const g=growth(Number(blaze.dataset.atk)),w=img.offsetWidth,h=img.offsetHeight,x=zone.offsetLeft+img.offsetLeft,y=zone.offsetTop+img.offsetTop,W=Math.round(w*(1.45+g)),H=Math.round(W/.8);
 Object.assign(blaze.style,{left:Math.round(x+w/2-W/2)+'px',top:Math.round(y+h*1.02-H)+'px',width:W+'px',height:H+'px'});
}
// Flames follow layout changes (rotation, window resize) without a re-render.
let placing=0;
addEventListener('resize',()=>{if(placing||!document.querySelector('.fx-blaze'))return;placing=requestAnimationFrame(()=>{placing=0;for(const b of document.querySelectorAll('.fx-blaze')){const zone=b.closest('.mat')?.querySelector(`.zone[data-zone="${b.dataset.for}"]`),img=zone?.querySelector(':scope>img');if(img)placeBlaze(b,zone,img)}})});

// Hand over the limit: the whole hand row shakes (one animation, not one per card), harder the more cards
// are over; the extra cards get a red rim.
function handLimit(hand,limit){
 if(!hand)return;
 const cards=[...hand.querySelectorAll(':scope>button')],excess=cards.length-limit;
 hand.classList.toggle('fx-overflow',excess>0);hand.classList.toggle('fx-jitter-2',excess===2);hand.classList.toggle('fx-jitter-3',excess>=3);
 cards.forEach((b,i)=>b.classList.toggle('fx-excess',excess>0&&i>=limit));
}

// Deck-out warning on your deck pile: amber at 10, a red pulse at 5, faster at 2.
function deckWarning(pile,count){
 if(!pile)return;
 const level=count<=2?'critical':count<=5?'danger':count<=10?'warn':'';
 if(!level){delete pile.dataset.fxDeck;pile.querySelector(':scope>.fx-pile-glow')?.remove();return}
 pile.dataset.fxDeck=level;
 if(!pile.querySelector(':scope>.fx-pile-glow')){const g=document.createElement('span');g.className='fx-pile-glow';g.setAttribute('aria-hidden','true');pile.prepend(g)}
}

// Once per duel render: flames, hand limit, deck warning and the turn rim.
export function syncDuel(root,{turnPlayer,deck,handLimit:limit=6}={}){
 const main=root.querySelector('.duel-main');if(!main)return;
 const zones=[...root.querySelectorAll('.mat .zone[data-zone^="0,4,"],.mat .zone[data-zone^="1,4,"]')];
 for(const zone of zones){const stat=zone.dataset.code?zone.querySelector('[data-stat=attack]'):null;powerFlame(zone,stat?Number(stat.dataset.value):0)}
 for(const b of root.querySelectorAll('.fx-blaze'))if(!b.closest('.mat')?.querySelector(`.zone[data-zone="${b.dataset.for}"][data-code]`))b.remove();
 handLimit(main.querySelector(':scope>.hand'),limit);
 deckWarning(root.querySelector('.zone.pile[data-pile="0,deck"]'),deck);
 portraitTurn(turnPlayer);
}

// Damage. The number grows with the amount; 1000+ adds a flash, 2000+ a shockwave; the portrait flinches.
// Shaking the board stays with the caller (it owns the duel's shake rules).
export const damageTier=n=>n>=4000?5:n>=2000?4:n>=1000?3:n>=500?2:1;
export function scaleNumber(el,amount,heal=false){
 const tier=damageTier(amount);el.classList.add('fx-dmg','t'+(heal?1:tier));
 el.style.scale=String(heal?clamp(.75+.25*Math.log2(amount/250),.75,1.8):clamp(.75+.32*Math.log2(amount/250),.75,2.3));
}
export function hit(player,amount,before){
 const {reduced,lite,compat}=prefs(),tier=damageTier(amount),life=document.querySelector(player?'.lpbar .life.enemy':'.lpbar .life:not(.enemy)');
 if(!compat)portraitHit(player,tier);
 const killed=Number.isFinite(before)&&before-amount<=0;
 if(killed)portraitKO(player);
 if(!reduced&&!lite){
  const {x,y}=life?center(life):{x:innerWidth/2,y:innerHeight/2};
  if(tier>=3){const flash=temp('div','fx-hit-flash');flash.style.setProperty('--y',player?'15%':'85%');play(flash,[{opacity:[0,0,.16,.26,.4][tier-1]},{opacity:0}],{duration:wall(140+tier*60),easing:'ease-out'})}
  if(tier>=4){const ring=temp('div','fx-shockwave');Object.assign(ring.style,{left:x+'px',top:y+'px'});play(ring,[{opacity:.95,scale:.03},{opacity:0,scale:tier===5?1.35:.9}],{duration:wall(520),easing:'cubic-bezier(.1,.6,.3,1)'})}
 }
 // Finishers are for the opponent's last LP: exact lethal is PERFECT, overkill escalates its word.
 return killed&&player===1?finisher(amount-before):null;
}

// Finishers. PERFECT is a blade cut with no shake; every 1000 overkill changes the word and its show:
// letters slam in from DEVASTATING, a flash from ANNIHILATION, shockwave rings from CATACLYSM, and each
// word has its own voice line. Resolves when the banner is gone, so the victory screens wait for it.
export const KILL_WORDS=['OVERKILL','BRUTAL','SAVAGE','DEVASTATING','ANNIHILATION','CATACLYSM','APOCALYPSE','GODLIKE'];
let finishing=null;
export const finisherDone=()=>finishing||Promise.resolve();
export const finisherPlaying=()=>!!finishing;
// Voice lines start 200 ms after the blow, clear of the hit and coin sounds that land with it.
const VOICE_DELAY=200;
function finisher(overkill){
 const {reduced,lite}=prefs();
 if(overkill<=0)return finishing=perfect(reduced,lite);
 const level=Math.min(KILL_WORDS.length-1,Math.floor(overkill/1000)),word=KILL_WORDS[level],banner=temp('div','fx-banner lv'+level);
 banner.style.setProperty('--lv',level);banner.setAttribute('role','status');banner.removeAttribute('aria-hidden');
 banner.innerHTML=`<span class="word" data-text="${word}">${[...word].map(ch=>`<b>${ch}</b>`).join('')}</span><small>+${overkill.toLocaleString()} DAMAGE</small>`;
 const show=play(banner,reduced?[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.8},{opacity:0}]:[{opacity:0,scale:2.4},{opacity:1,scale:.94,offset:.12},{opacity:1,scale:1,offset:.2},{opacity:1,scale:1.03+level*.01,offset:.82},{opacity:0,scale:1.1}],{duration:wall(1500+level*120),easing:'ease-out'});
 if(!reduced&&!lite&&level>=3)banner.querySelectorAll('.word b').forEach((b,k)=>b.animate([{opacity:0,translate:'0 -40%',scale:1.8},{opacity:1,translate:'0 0',scale:1}],{duration:wall(220),delay:wall(60+k*45),easing:'cubic-bezier(.3,1.6,.5,1)',fill:'backwards'}));
 if(!reduced&&!lite&&level>=4){const flash=temp('div','fx-hit-flash');flash.style.setProperty('--y','50%');play(flash,[{opacity:.25+level*.05},{opacity:0}],{duration:wall(500)})}
 if(!reduced&&!lite&&level>=5){const r=banner.getBoundingClientRect();for(let i=0;i<level-4;i++){const ring=temp('div','fx-shockwave fx-finish-ring lv'+level);Object.assign(ring.style,{left:r.left+r.width/2+'px',top:r.top+r.height*.4+'px'});play(ring,[{opacity:.9,scale:.045},{opacity:0,scale:(7+i*2)*.15}],{duration:wall(700+i*140),delay:wall(120+i*160),easing:'cubic-bezier(.1,.6,.3,1)',fill:'backwards'})}}
 // A 120 ms freeze-frame, then a final shake that grows with the word.
 const duel=document.querySelector('.duel');if(!reduced&&!lite&&duel)later(120).then(()=>shake(duel,{strength:Math.min(18,12+level),duration:wall(480+level*30)}));
 later(wall(90)+VOICE_DELAY).then(()=>sound('kill-'+word.toLowerCase()));
 return finishing=show.finished.catch(()=>{}).then(()=>{finishing=null});
}
function perfect(reduced,lite){
 const banner=temp('div','fx-banner fx-perfect');banner.setAttribute('role','status');banner.removeAttribute('aria-hidden');
 banner.innerHTML='<span class="word">PERFECT</span><span class="slice top" aria-hidden="true">PERFECT</span><span class="slice bottom" aria-hidden="true">PERFECT</span><small>EXACT LETHAL</small>';
 const duration=wall(1900);later(wall(380)+VOICE_DELAY).then(()=>sound('kill-perfect'));
 if(reduced)return play(banner,[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.8},{opacity:0}],{duration}).finished.catch(()=>{}).then(()=>{finishing=null});
 const show=play(banner,[{opacity:0,scale:1.12},{opacity:1,scale:1,offset:.1},{opacity:1,scale:1,offset:.85},{opacity:0,scale:1}],{duration,easing:'ease-out'});
 const word=banner.querySelector('.word').getBoundingClientRect(),line=temp('div','fx-cut');line.style.top=word.top+word.height*.5-1+'px';
 play(line,[{scale:'0 1',opacity:1},{scale:'0 1',opacity:1,offset:.12},{scale:'1 1',opacity:1,offset:.24},{scale:'1 1',opacity:1,offset:.5},{scale:'1 .1',opacity:0}],{duration:wall(1100),easing:'cubic-bezier(.7,0,.3,1)'});
 for(const [cls,dx,dy] of [['top',-16,-3],['bottom',16,3]])banner.querySelector('.slice.'+cls).animate([{translate:'0 0'},{translate:'0 0',offset:.22},{translate:`${dx}px ${dy}px`,offset:.4},{translate:`${dx*1.2}px ${dy*1.2}px`}],{duration,easing:'ease-out',fill:'forwards'});
 if(!lite){const flash=temp('div','fx-hit-flash fx-white');play(flash,[{opacity:0},{opacity:0,offset:.2},{opacity:.4,offset:.26},{opacity:0}],{duration:wall(1000)})}
 later(wall(250)).then(()=>sound('blade'));
 return show.finished.catch(()=>{}).then(()=>{finishing=null});
}

// Heal: green sparkles rise from the LP bar (more for bigger heals), a green edge, and the portrait bobs.
export function heal(player,amount){
 const {reduced,lite,compat}=prefs(),life=document.querySelector(player?'.lpbar .life.enemy':'.lpbar .life:not(.enemy)');
 const portrait=portraitOf(player);if(portrait&&!reduced&&!compat)portrait.animate([{translate:'0 0'},{translate:'0 -6px',offset:.35},{translate:'0 0'}],{duration:wall(420),easing:'ease-out',composite:'add'});
 if(reduced||lite||!life)return;
 const {r}=center(life),n=clamp(Math.round(amount/300),4,16);
 for(let i=0;i<n;i++){const s=temp('div','fx-spark');Object.assign(s.style,{left:r.left+Math.random()*r.width+'px',top:r.top+r.height/2+'px'});play(s,[{opacity:0,translate:'0 0',scale:.6},{opacity:1,offset:.2},{opacity:0,translate:`${(Math.random()-.5)*30}px ${player?60+Math.random()*60:-(60+Math.random()*80)}px`,scale:1.2}],{duration:wall(700+Math.random()*500),delay:wall(i*40),easing:'ease-out',fill:'backwards'})}
 const main=document.querySelector('.duel-main');if(main){const edge=temp('div','fx-edge '+(player?'enemy':'own'),main);main.prepend(edge);play(edge,[{opacity:0},{opacity:clamp(amount/3000,.35,1),offset:.25},{opacity:0}],{duration:wall(900),easing:'ease-out'})}
}

// Stat change: "▲ +500 ATK" over the card, sized by the change (the counter already plays its sound).
export function statPop(zone,delta){
 if(!zone?.isConnected||!delta)return;
 const {reduced,compat}=prefs(),{x,r}=center(zone),pop=temp('div','fx-stat-pop '+(delta>0?'up':'down'));
 pop.textContent=(delta>0?'▲ +':'▼ ')+Math.abs(delta)+' ATK';pop.style.left=x+'px';pop.style.top=r.top+'px';pop.style.fontSize=clamp(13+Math.abs(delta)/120,14,34)+'px';
 play(pop,reduced?[{opacity:0},{opacity:1,offset:.2},{opacity:0}]:[{opacity:0,translate:'-50% 0',scale:.5},{opacity:1,translate:'-50% -60%',scale:1.15,offset:.18},{opacity:1,translate:'-50% -90%',scale:1,offset:.7},{opacity:0,translate:'-50% -130%',scale:1}],{duration:wall(1100),easing:'ease-out'});
 const img=zone.querySelector(':scope>img');if(img&&!reduced&&!compat)img.animate(delta>0?[{translate:'0 0'},{translate:'0 -5px',offset:.3},{translate:'0 0'}]:[{translate:'0 0'},{translate:'0 3px',offset:.3},{translate:'0 0'}],{duration:wall(380),easing:'ease-out',composite:'add'});
}

// Chain escalation: each link's badge is bigger and the field darkens toward violet; links 4+ rattle it.
export function chainLink(anchor,link){
 const {reduced,lite,compat}=prefs(),badge=anchor?.querySelector(`.chain-link-badge[data-link="${link}"]`);
 if(badge)badge.style.scale=String(1+.18*Math.min(link-1,5));
 // The tint lives in the duel screen (under the hand and LP bar), so it leaves with the duel.
 const main=document.querySelector('.duel-main');let tint=main?.querySelector(':scope>.fx-chain-tint');
 if(link>=2&&main){if(!tint){tint=temp('div','fx-chain-tint',main);main.prepend(tint)}requestAnimationFrame(()=>tint.style.opacity=String(Math.min(.85,(link-1)*.22)))}
 if(link>=4&&!reduced&&!lite&&!compat)shake(document.querySelector('.duel'),{strength:Math.min(6,link),duration:wall(200)});
}
export function clearChain(){const tint=document.querySelector('.duel-main>.fx-chain-tint');if(tint){tint.style.opacity='0';setTimeout(()=>tint.remove(),400)}}

// Summon weight: higher Levels land heavier, with dust rings, a board shake from 7 and a flash from 10.
export function summonWeight(zone,level){
 if(!zone||!(level>=5))return;
 const {reduced,lite,compat}=prefs(),heavy=level>=7,huge=level>=10;
 later(wall(heavy?360:260)).then(()=>{
  if(!zone.isConnected)return;const {x,y,r}=center(zone);
  if(!lite&&!reduced)for(let i=0;i<(huge?3:heavy?2:1);i++){const d=temp('div','fx-dust');Object.assign(d.style,{left:x-r.width*.6+'px',top:y-r.width*.6+'px',width:r.width*1.2+'px',height:r.width*1.2+'px'});play(d,[{opacity:.9,scale:.6},{opacity:0,scale:huge?3.2:heavy?2.4:1.7}],{duration:wall(520+i*120),delay:wall(i*90),easing:'ease-out',fill:'backwards'})}
  if(heavy&&!reduced&&!lite&&!compat)shake(document.querySelector('.duel'),{strength:huge?9:5,duration:wall(huge?420:300)});
  if(huge&&!reduced&&!lite){const flash=temp('div','fx-hit-flash');flash.style.setProperty('--y','55%');play(flash,[{opacity:.35},{opacity:0}],{duration:wall(420)})}
 });
}

// Coin tally: the total counts up, then the window itself celebrates by tier, all inside the window (it
// clips its overflow). 0-59 count and pop; 60+ a gold total and a coin burst; 150+ a glow ring and each
// line lights up in turn; 300+ a light runs around the frame, the total turns radiant and coins cascade.
export const coinTier=n=>n>=300?4:n>=150?3:n>=60?2:1;
export function coinTally(tally,amount){
 const total=tally?.querySelector('.reward-tally-total');if(!total)return;
 const {reduced,lite}=prefs(),box=tally.closest('dialog')||tally,number=total.firstChild,tier=coinTier(amount);
 box.querySelectorAll('.fx-tally-ring,.fx-frame,.fx-shine,.fx-in-coin,.fx-row-light').forEach(e=>e.remove());total.classList.remove('fx-gold','fx-radiant');
 const rows=[...tally.querySelectorAll('.reward-tally-lines .row,.reward-tally-lines summary')];
 if(!reduced)rows.forEach((row,i)=>row.animate([{opacity:0,translate:'-12px 0'},{opacity:1,translate:'0 0'}],{duration:wall(260),delay:wall(i*70),easing:'ease-out',fill:'backwards'}));
 const duration=reduced?0:clamp(380+Math.log2(Math.max(2,amount))*120,400,1500),start=performance.now();let shown=-1;
 const paint=v=>{const n=Math.round(v);if(n!==shown&&number){shown=n;number.textContent='+'+n.toLocaleString()+' '}};
 // Every other frame, like the game's own counters.
 const step=now=>{if(!total.isConnected)return;const t=duration?Math.min(1,(now-start)/duration):1;paint(amount*(1-(1-t)**3));if(t<1)requestAnimationFrame(()=>requestAnimationFrame(step));else land()};
 requestAnimationFrame(step);
 function land(){
  paint(amount);if(tier>=2)total.classList.add('fx-gold');if(tier>=4)total.classList.add('fx-radiant');
  sound(tier>=3?'ding':'coin');
  if(reduced)return;
  total.animate([{scale:1},{scale:1+tier*.1,offset:.3},{scale:1}],{duration:wall(380),easing:'ease-out'});
  if(tier>=3){
   const ring=temp('div','fx-tally-ring',total);play(ring,[{opacity:0,scale:.5},{opacity:1,scale:1,offset:.3},{opacity:.55,scale:1.1}],{duration:wall(1400),easing:'ease-out',fill:'forwards'});
   rows.forEach((row,i)=>{const light=temp('span','fx-row-light',row);play(light,[{translate:'-100% 0'},{translate:'100% 0'}],{duration:wall(520),delay:wall(120+i*90),easing:'ease-in-out',fill:'backwards'})});
  }
  if(tier>=2&&!lite)coinsInside(box,total,[0,0,8,12,16][tier],tier>=4);
  if(tier>=4){
   const frame=temp('div','fx-frame',box);frame.innerHTML='<i></i>';
   later(wall(2600)).then(()=>frame.isConnected&&play(frame,[{opacity:1},{opacity:0}],{duration:wall(500)}));
   if(!lite)temp('div','fx-shine',box);
  }
 }
}
function coinsInside(box,from,n,cascade){
 const b=box.getBoundingClientRect(),f=from.getBoundingClientRect(),cx=f.left-b.left+f.width/2,cy=f.top-b.top+f.height/2,src=assetURL('assets/ui/coins.png');
 for(let i=0;i<n;i++){
  const c=temp('img','fx-in-coin',box);c.src=src;c.alt='';
  const x=cascade?b.width*(.08+.84*Math.random()):cx,y=cascade?-24:cy;Object.assign(c.style,{left:x-11+'px',top:y-11+'px'});
  const frames=cascade
   ?[{opacity:0,translate:'0 0',rotate:'0deg'},{opacity:1,offset:.12},{opacity:1,offset:.8},{opacity:0,translate:`${(Math.random()-.5)*40}px ${b.height*(.7+.25*Math.random())}px`,rotate:`${(Math.random()-.5)*540}deg`}]
   :[{opacity:0,translate:'0 0',scale:.4},{opacity:1,translate:`${(Math.random()-.5)*b.width*.7}px ${-30-Math.random()*50}px`,scale:1,offset:.45},{opacity:0,translate:`${(Math.random()-.5)*b.width*.8}px ${20+Math.random()*60}px`,scale:.7,rotate:`${(Math.random()-.5)*360}deg`}];
  play(c,frames,{duration:wall(cascade?1100+Math.random()*500:800+Math.random()*300),delay:wall(i*(cascade?70:25)),easing:cascade?'ease-in':'cubic-bezier(.2,.7,.4,1)',fill:'backwards'});
 }
}

// Buying: coins stream from the balance into each bought item, which lifts while a SOLD stamp slams down
// and then fades into the shop's own sold look. Called after the shop re-renders.
export function buy(products,balance,prices){
 const {reduced,lite}=prefs(),to=balance?center(balance):null,coin=assetURL('assets/ui/coins.png');
 products.forEach((product,k)=>{
  const art=product?.querySelector('.product-art');if(!art)return;
  const {x,y}=center(art),price=prices[k]||10,delay=k*180;
  if(to&&!reduced&&!lite)for(let i=0,n=clamp(Math.round(price/12),3,10);i<n;i++){const c=temp('img','fx-coin');c.src=coin;c.alt='';Object.assign(c.style,{left:to.x-13+'px',top:to.y-13+'px'});
   const mx=(x-to.x)/2+(Math.random()-.5)*60,my=Math.min(0,(y-to.y)/2)-60-Math.random()*40;
   play(c,[{opacity:0,translate:'0 0',scale:.7},{opacity:1,translate:`${mx}px ${my}px`,scale:1,offset:.45},{opacity:1,translate:`${x-to.x}px ${y-to.y}px`,scale:.6,offset:.92},{opacity:0,translate:`${x-to.x}px ${y-to.y}px`,scale:.3}],{duration:wall(520),delay:wall(delay+i*35),easing:'ease-in-out',fill:'backwards'})}
  later(wall(delay+(reduced||lite?0:420))).then(()=>{
   if(!art.isConnected)return;
   if(!reduced)art.animate([{translate:'0 0',scale:1},{translate:'0 -6px',scale:1.05,offset:.3},{translate:'0 1px',scale:.98,offset:.6},{translate:'0 0',scale:1}],{duration:wall(360),easing:'ease-out'});
   const stamp=temp('div','fx-stamp',art);stamp.textContent='SOLD';
   play(stamp,reduced?[{opacity:1},{opacity:1,offset:.8},{opacity:0}]:[{opacity:0,scale:2.6},{opacity:1,scale:.92,offset:.18},{opacity:1,scale:1,offset:.26},{opacity:1,scale:1,offset:.8},{opacity:0,scale:1}],{duration:wall(1400),easing:'ease-out'});
   if(!reduced&&!lite){const b=temp('div','fx-burst');Object.assign(b.style,{left:x+'px',top:y+'px'});play(b,[{opacity:1,scale:.3},{opacity:0,scale:1.8}],{duration:wall(420),easing:'ease-out'})}
  });
 });
 if(balance&&!reduced)balance.animate([{scale:1},{scale:.88,offset:.3},{scale:1.06,offset:.6},{scale:1}],{duration:wall(420),delay:wall(100),easing:'ease-out'});
}

// Reroll: after the shop re-renders with its new stock, every item spins like a slot reel from its old art
// through others of its kind (cards, packs, relics) and lands left to right on the new art. One image strip
// per item, moved with transform only; the reel sound loops while anything spins and fades as the last lands.
const kindOf=src=>/\/relics\//.test(src)?'relic':/\/(packs|decks)\//.test(src)?'pack':'card';
let spinToken=0,reelVoice=null;
export function shopArt(root){return [...root.querySelectorAll('.shop-product .product-art')].map(a=>a.querySelector(':scope>img')?.getAttribute('src')||null)}
export function reroll(root,previous){
 const {reduced,lite}=prefs(),token=++spinToken,arts=[...root.querySelectorAll('.shop-product .product-art')];
 fadeOut(reelVoice,40);reelVoice=null;
 if(reduced)return;
 const pools={};for(const src of [...previous,...shopArt(root)])if(src)(pools[kindOf(src)]??=new Set()).add(src);
 let spinning=0;
 arts.forEach((art,i)=>{
  const img=art.querySelector(':scope>img'),final=img?.getAttribute('src');if(!final)return;
  if(lite){img.animate([{opacity:0,translate:'0 -8px'},{opacity:1,translate:'0 0'}],{duration:wall(220),delay:wall(i*25),fill:'backwards'});return}
  const box=img.getBoundingClientRect(),height=box.height;if(!height)return;
  const pool=[...(pools[kindOf(final)]||[])].filter(s=>s!==final),spins=4+Math.floor(i/3);
  const srcs=[previous[i]||final,...Array.from({length:spins-1},(_,k)=>pool.length?pool[(i*7+k*3+1)%pool.length]:final),final];
  const reel=document.createElement('div'),strip=document.createElement('div');reel.className='fx-reel';reel.setAttribute('aria-hidden','true');
  // The reel takes the image's place in the stacking order, so slots that layer their art still show it.
  img.after(reel);Object.assign(reel.style,{left:img.offsetLeft+'px',top:img.offsetTop+'px',width:box.width+'px',height:height+'px',zIndex:getComputedStyle(img).zIndex});reel.style.setProperty('--h',height+'px');
  for(const src of srcs){const s=document.createElement('img');s.src=src;s.alt='';strip.append(s)}
  reel.append(strip);art.classList.add('fx-spinning');spinning++;
  const end=-(srcs.length-1)*height;
  strip.animate([{transform:'translateY(0)'},{transform:`translateY(${end-height*.08}px)`,offset:.86},{transform:`translateY(${end+height*.03}px)`,offset:.94},{transform:`translateY(${end}px)`}],{duration:wall(480+i*55),easing:'cubic-bezier(.2,.65,.25,1)',fill:'forwards'})
   .finished.catch(()=>{}).then(()=>{
    art.classList.remove('fx-spinning');reel.remove();
    if(token!==spinToken)return;
    if(--spinning<=0){fadeOut(reelVoice);reelVoice=null}
    if(art.isConnected&&Math.random()<.25){const g=temp('div','fx-glint',art);later(700).then(()=>g.remove())}
   });
 });
 if(spinning)reelVoice=sound('reroll-loop',{loop:true});
 // False when nothing spun (reduced motion, Performance Mode), so the caller plays its usual reroll sound.
 return spinning>0;
}
