// Duel Bets: an incremental minigame. Bet on which CPU wins a duel, earn money, buy upgrades and more
// boards; nine boards become a bracket, up to nine brackets. Every duel is recorded ahead of time by a worker
// (idle-bets-library.js) and replayed here with a deliberately bare board: coloured slots, ATK numbers and
// LP bars, updated in place. One timer drives everything, 10×/s while boards are on screen, 4×/s otherwise,
// and nothing runs while the page is hidden or after the screen closes.
// Self-contained: mobile.js only opens it (openDuelBets) and gives it the content and a volume reader.
import * as M from './idle-bets-model.js';
import {DuelSupply} from './idle-bets-library.js';
import {assetURL} from './startup-assets.js';
import {balancedVolume} from './audio-balance.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=document.documentElement;
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?0:html.classList.contains('performance-mode')||html.classList.contains('compatibility-mode')?1:2;
const ICON_OK=new Set();
const BET_WINDOW=10000,ROUND_BREAK=6000,FINAL_HOLD=6000,RESULT_HOLD=1800;
let cssLoaded=false;
function loadCSS(){if(cssLoaded)return;cssLoaded=true;const l=document.createElement('link');l.rel='stylesheet';l.href='idle-bets.css';document.head.append(l)}

export class DuelBets{
 constructor({root,content,catalog,volume,onExit}){
  Object.assign(this,{root,content,volume,onExit});loadCSS();
  this.chars={...content.characters,...catalog.cpuWatchOpponents};
  const decks=catalog.cpuWatchDecks||content.cpuDecks||{};
  this.pool=[];this.deckList={};
  for(const [id,records] of Object.entries(decks))records.forEach((r,t)=>{if(!r?.main?.length||!this.chars[id])return;const key=id+':'+t;this.pool.push({id:Number(id),tier:t,label:r.label||'Tier '+(t+1),key});this.deckList[key]={main:r.main,extra:r.extra||[]}});
  this.cards=new Map();for(const c of [...(content.cards||[]),...(content.tokenCards||[])])this.cards.set(c.id,c);
  this.state=M.sanitize(this.load());this.boards=[];this.brackets=[];this.openBracket=null;this.clock=0;this.dirty=false;this.shown=this.state.coins;
  this.supply=new DuelSupply({pool:this.pool,deckList:this.deckList,cards:[...(content.cards||[]),...(content.tokenCards||[])]});
  this.onClick=e=>{const b=e.target.closest('[data-db]');if(!b||!this.root.contains(b))return;e.preventDefault();this.action(b.dataset.db,b)};
  // Card thumbnails are missing for some icons: fall back to the full card art (no inline handlers under the CSP).
  this.onError=e=>{const img=e.target;if(img?.dataset?.full&&img.src!==img.dataset.full){img.src=img.dataset.full;delete img.dataset.full}};root.addEventListener('error',this.onError,true);
  this.onVisible=()=>{if(document.hidden)this.save();this.last=performance.now()};
  root.addEventListener('click',this.onClick);document.addEventListener('visibilitychange',this.onVisible);
  if(M.DEV_TOOLS)globalThis.duelBetsDebug=this;
  this.render();this.supply.start();this.layout();this.last=performance.now();this.loop();
  this.saveTimer=setInterval(()=>{if(this.dirty)this.save()},5000);
 }
 // ---- saving ----
 load(){try{return JSON.parse(localStorage.getItem(M.SAVE_KEY)||'null')}catch{return null}}
 save(){this.dirty=false;this.state.brackets_saved=this.brackets.map(b=>b.saved());try{localStorage.setItem(M.SAVE_KEY,JSON.stringify(this.state))}catch{}}
 // ---- lookups ----
 deck(key){return this.pool.find(d=>d.key===key)}
 seatOf(seat){const d=this.pool.find(x=>x.id===seat.id&&x.tier===seat.tier)||{id:seat.id,tier:seat.tier,label:'Tier '+(seat.tier+1),key:seat.id+':'+seat.tier};const ch=this.chars[d.id]||{};return {...d,name:ch.name||'CPU',sprite:ch.sprite||''}}
 cardName(code){return this.cards.get(code)?.name||'a card'}
 tierChip(label){const t=M.tierKey(label),short={'Opening Duel':'Opening','World Championship':'WC'}[label]||label.replace('Tier ','T');return `<i class="db-tier ${t||'other'}" title="${esc(label)}">${esc(short)}</i>`}
 // ---- screen ----
 render(){
  this.root.innerHTML=`<section class="duel-bets"><header class="db-top"><div class="db-money"><small>TOTAL MONEY</small><b class="db-total"></b></div><div class="db-sub"></div><div class="db-top-buttons"><button class="db-round" data-db="settings" aria-label="Settings"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.5"/></svg></button><button class="db-round" data-db="exit" aria-label="Save and exit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button></div></header><div class="db-body"><main class="db-stage"></main><aside class="db-shop" aria-label="Upgrades"><div class="db-shop-list"></div></aside></div><div class="db-fx" aria-hidden="true"></div></section>`;
  this.el={total:this.root.querySelector('.db-total'),sub:this.root.querySelector('.db-sub'),stage:this.root.querySelector('.db-stage'),shop:this.root.querySelector('.db-shop-list'),fx:this.root.querySelector('.db-fx')};
  this.paintTotal(true);this.renderShop();
 }
 // Boards before brackets; the bracket grid after; one bracket's boards when one is opened.
 layout(){
  for(const b of this.boards)b.detach();
  if(this.state.brackets){
   for(const b of this.boards)b.destroy();this.boards=[];
   while(this.brackets.length<this.state.brackets)this.brackets.push(new Bracket(this,this.brackets.length+1,this.state.brackets_saved[this.brackets.length]));
   if(this.openBracket){this.openBracket.show(this.el.stage)}else this.renderBrackets();
  }else{
   while(this.boards.length<this.state.boards)this.boards.push(new Board(this,this.boards.length+1));
   this.el.stage.innerHTML=`<div class="db-grid n${this.boards.length}"></div>`;const grid=this.el.stage.firstChild;
   for(const b of this.boards)b.attach(grid);
  }
  this.updateSub();this.supply.setTarget(this.visibleDemand());
 }
 visibleDemand(){return this.state.brackets?(this.openBracket?2:1):Math.max(1,this.boards.length)}
 renderBrackets(){
  this.el.stage.innerHTML=`<div class="db-brackets n${this.brackets.length}">${this.brackets.map(b=>`<button class="db-bracket" data-db="open-bracket" data-b="${b.index}"></button>`).join('')}</div>`;
  for(const b of this.brackets)b.tile=this.el.stage.querySelector(`[data-b="${b.index}"]`),b.paintTile();
 }
 updateSub(){const s=this.state;this.el.sub.textContent=`${M.speedOf(s)}× speed${M.multiplier(s)>1?' · ×'+M.multiplier(s)+' payouts':''}${s.brackets?` · ${s.brackets} bracket${s.brackets>1?'s':''}`:` · ${s.boards} board${s.boards>1?'s':''}`}`}
 // ---- shop ----
 renderShop(){
  const s=this.state,items=M.visibleItems(s);this.shopIds=items.map(i=>i.id).join();
  this.el.shop.innerHTML=items.map(it=>{const level=M.itemLevel(s,it.id),maxed=level>=it.max,cost=maxed?0:M.itemCost(it.id,level);
   return `<div class="db-item ${it.kind}" data-item="${it.id}"><span class="db-icon"><img loading="lazy" decoding="async" alt="" src="${assetURL('assets/cards-thumb/'+it.icon+'.jpg')}" data-full="${assetURL('assets/cards/'+it.icon+'.jpg')}"></span><span class="db-item-text"><b>${esc(it.name)}${it.kind!=='opener'||it.max>1?` <small class="db-count">${it.max===Infinity?'×'+level:level+'/'+it.max}</small>`:''}</b><small>${esc(maxed&&it.maxText?it.maxText:it.text(level))}</small></span><button class="db-buy" data-db="buy" data-id="${it.id}" ${maxed?'disabled':''}>${maxed?'MAX':M.fmt(cost)}</button></div>`}).join('')||'<p class="db-empty">Win a bet to open the shop.</p>';
  this.paintAfford();
 }
 paintAfford(){for(const b of this.el.shop.querySelectorAll('.db-buy')){const id=b.dataset.id,level=M.itemLevel(this.state,id);if(level>=M.ITEM[id].max)continue;b.classList.toggle('poor',!M.canAfford(this.state,M.itemCost(id,level)))}}
 refreshShop(){const ids=M.visibleItems(this.state).map(i=>i.id).join();if(ids!==this.shopIds)this.renderShop();else this.paintAfford()}
 // ---- money ----
 gain(amount,{from=null,size='small',label=''}={}){if(!(amount>0))return;M.earn(this.state,amount);this.dirty=true;this.fx(amount,from,size,label);this.paintTotal();this.refreshShop()}
 paintTotal(now=false){
  if(this.state.settings.infinite){this.el.total.textContent='∞';return}
  const target=this.state.coins;if(now||motion()===0){this.shown=target;this.el.total.textContent=M.fmt(target);return}
  if(this.counting)return;this.counting=true;const from=this.shown,t0=performance.now();
  const step=t=>{if(!this.el)return;const k=Math.min(1,(t-t0)/450),goal=this.state.coins;this.shown=from+(goal-from)*(1-(1-k)**3);this.el.total.textContent=M.fmt(this.shown);
   if(k<1)requestAnimationFrame(step);else{this.counting=false;this.shown=goal;this.el.total.textContent=M.fmt(goal);if(goal!==target)this.paintTotal()}};requestAnimationFrame(step);
 }
 // ---- effects ----
 sound(path,gain=1){const v=this.volume?.()||0;if(!v||document.hidden)return;this.voices??=Array.from({length:5},()=>new Audio());const a=this.voices[this.voiceAt=((this.voiceAt||0)+1)%this.voices.length];a.pause();a.src=assetURL(path);balancedVolume(a,v,gain);a.play().catch(()=>{})}
 fx(amount,from,size,label){
  const fxOn=this.state.settings.fx,m=motion(),now=performance.now();
  if(size==='small'){if(now-(this.lastTick||0)>180){this.lastTick=now;if(fxOn!=='off')this.sound('sound/coin-pickup'+['','-2','-3'][Math.floor(Math.random()*3)]+'.wav',.35)}}
  else if(size==='medium')this.sound('assets/sfx/count-coins.wav',.9);
  else{this.sound(size==='jackpot'?'assets/sfx/pack-rare.mp3':'assets/sfx/perfect-chime.wav',1.1);setTimeout(()=>this.sound('assets/sfx/reward-ding.wav',1),220)}
  if(fxOn==='off'||m===0||!this.el)return;
  const layer=this.el.fx,box=layer.getBoundingClientRect(),src=(from&&from.isConnected?from:this.el.stage).getBoundingClientRect();
  const x=src.left-box.left+src.width/2,y=src.top-box.top+src.height*(size==='small'?.5:.45);
  // Small: a floating "+0.3". Medium: "+100" and coins flying to the total. Big: a banner and a coin shower.
  if(this.fxCount>40&&size==='small')return;
  const pop=document.createElement('div');pop.className='db-pop '+size;pop.textContent=(label?label+' ':'')+'+'+M.fmt(amount);pop.style.left=x+'px';pop.style.top=y+'px';layer.append(pop);this.fxCount=(this.fxCount||0)+1;
  const life=size==='small'?900:size==='medium'?1400:2600;
  pop.animate(size==='small'?[{opacity:0,translate:'-50% 0'},{opacity:1,translate:'-50% -10px',offset:.2},{opacity:0,translate:'-50% -34px'}]:[{opacity:0,scale:.5,translate:'-50% -50%'},{opacity:1,scale:1.15,translate:'-50% -50%',offset:.15},{opacity:1,scale:1,translate:'-50% -60%',offset:.75},{opacity:0,scale:1,translate:'-50% -90%'}],{duration:life,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>{pop.remove();this.fxCount--});
  if(size==='small'||fxOn==='light'&&size==='medium')return;
  const total=this.el.total.getBoundingClientRect(),tx=total.left-box.left+total.width/2,ty=total.top-box.top+total.height/2,n=Math.min(m===1?6:size==='medium'?8:22,size==='medium'?8:22);
  for(let i=0;i<n;i++){const c=document.createElement('img');c.className='db-coin';c.alt='';c.src=assetURL('assets/ui/coins.png');c.style.left=x+'px';c.style.top=y+'px';layer.append(c);
   const sx=(Math.random()-.5)*(size==='medium'?80:220),sy=-30-Math.random()*(size==='medium'?40:120);
   c.animate([{opacity:0,translate:'0 0',scale:.5},{opacity:1,translate:`${sx}px ${sy}px`,scale:1,offset:.4},{opacity:.9,translate:`${tx-x}px ${ty-y}px`,scale:.6}],{duration:700+Math.random()*350,delay:i*(size==='medium'?30:45),easing:'cubic-bezier(.3,.6,.4,1)',fill:'backwards'}).finished.catch(()=>{}).finally(()=>c.remove())}
  setTimeout(()=>this.el?.total.animate([{scale:1},{scale:size==='medium'?1.12:1.3},{scale:1}],{duration:320,easing:'ease-out'}),700);
  if(size!=='medium'&&from?.isConnected)from.animate([{boxShadow:'0 0 0 0 var(--db-accent)'},{boxShadow:'0 0 0 6px transparent'}],{duration:900,iterations:2});
 }
 // ---- the clock ----
 loop(){
  if(!this.el)return;const now=performance.now(),dt=document.hidden?0:Math.min(250,now-this.last);this.last=now;
  if(dt>0){const gdt=dt*M.speedOf(this.state);this.clock+=dt;for(const b of this.boards)b.tick(gdt);for(const b of this.brackets)b.tick(gdt,dt)}
  const watching=this.boards.length||this.openBracket;this.timer=setTimeout(()=>this.loop(),document.hidden?1000:watching?100:250);
 }
 // ---- input ----
 action(a,el){
  if(a==='exit')return this.exit();
  if(a==='settings')return this.settings();
  if(a==='buy'){const id=el.dataset.id,r=M.buy(this.state,id);if(!r){el.animate([{translate:'0 0'},{translate:'-4px 0'},{translate:'4px 0'},{translate:'0 0'}],{duration:220});return}
   this.dirty=true;this.sound('assets/sfx/purchase-coins.wav',.8);this.paintTotal();this.renderShop();this.updateSub();
   if(r.kind==='board'||r.kind==='bracket'){this.sound('assets/sfx/rare-shimmer.wav',1);this.layout();const label=r.kind==='bracket'?(this.state.brackets===1?'Bracket mode!':'Bracket '+this.state.brackets+' open!'):'Board '+this.state.boards+' open!';this.banner(label)}
   this.save();return}
  if(a==='pick'){const board=this.boards[Number(el.dataset.slot)-1];return board?.bet(Number(el.dataset.seat))}
  if(a==='open-bracket'){const b=this.brackets[Number(el.dataset.b)-1];if(b){this.openBracket=b;this.layout()}return}
  if(a==='close-bracket'){const b=this.openBracket;this.openBracket=null;b?.hide();this.layout();return}
  if(a==='bracket-pick'){const b=this.brackets[Number(el.dataset.b)-1];return b?.betDuel(Number(el.dataset.duel),Number(el.dataset.seat))}
  if(a==='champion'){const b=this.brackets[Number(el.dataset.b)-1];return b&&this.championPicker(b)}
 }
 banner(text){if(!this.el)return;const b=document.createElement('div');b.className='db-banner';b.textContent=text;this.el.fx.append(b);b.animate([{opacity:0,scale:.6},{opacity:1,scale:1.05,offset:.15},{opacity:1,scale:1,offset:.8},{opacity:0,scale:1}],{duration:2200,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>b.remove())}
 modal(title,body,onClick){const d=document.createElement('dialog');d.className='db-modal';d.innerHTML=`<header><h2>${esc(title)}</h2><button data-close aria-label="Close">✕</button></header><div class="db-modal-body">${body}</div>`;this.root.querySelector('.duel-bets').append(d);
  d.addEventListener('click',e=>{if(e.target.closest('[data-close]')||e.target===d){d.close();return}onClick?.(e,d)});d.onclose=()=>d.remove();d.showModal();return d}
 settings(){const s=this.state.settings,st=this.state.stats;
  const row=(name,value,label)=>`<label class="db-set"><input type="radio" name="fx" value="${value}" ${s.fx===value?'checked':''}> ${label}</label>`;
  this.modal('Settings',`<h3>Coin effects</h3><div class="db-set-row">${row('fx','full','Full')}${row('fx','light','Light')}${row('fx','off','Off')}</div>${M.DEV_TOOLS?`<h3>Testing (this branch only)</h3><label class="db-set"><input type="checkbox" data-infinite ${s.infinite?'checked':''}> Infinite money</label>`:''}<h3>Records</h3><p>Bets placed: ${st.bets.toLocaleString()} · Correct calls: ${st.correct.toLocaleString()}<br>Exodia wins seen: ${st.exodia} · Destiny Board wins seen: ${st.destiny} · Champions called: ${st.champions}<br>Money earned: ${M.fmt(this.state.earned)}</p><h3>Progress</h3><button data-reset class="db-danger">Reset Duel Bets</button>`,(e,d)=>{
   const r=e.target.closest('input[name="fx"]');if(r){s.fx=r.value;this.dirty=true}
   const inf=e.target.closest('[data-infinite]');if(inf){s.infinite=inf.checked;this.dirty=true;this.paintTotal(true);this.refreshShop()}
   if(e.target.closest('[data-reset]')){if(!e.target.dataset.armed){e.target.dataset.armed='1';e.target.textContent='Tap again to erase all Duel Bets progress';return}d.close();this.reset()}
  })}
 reset(){for(const b of this.boards)b.destroy();for(const b of this.brackets)b.destroy();this.boards=[];this.brackets=[];this.openBracket=null;const inf=this.state.settings.infinite;this.state=M.newState();this.state.settings.infinite=inf;this.save();this.paintTotal(true);this.renderShop();this.layout()}
 championPicker(b){if(b.phase!=='bet'||b.bet)return;const stake=M.championStake(this.state,b.index),pay=M.championPayout(this.state,b.index);
  this.modal(`Bracket ${b.index} · Who takes it?`,`<p>Bet ${M.fmt(stake)} · the CPU with the most wins after ${M.BRACKET_ROUNDS} rounds pays ${M.fmt(pay)}.</p><div class="db-roster">${b.roster.map((d,i)=>{const s=this.seatOf(d);return `<button data-pick="${i}" ${M.canAfford(this.state,stake)?'':'disabled'}><img loading="lazy" alt="" src="${assetURL('assets/'+s.sprite)}"><span>${esc(s.name)}</span>${this.tierChip(s.label)}</button>`}).join('')}</div>`,(e,d)=>{const p=e.target.closest('[data-pick]');if(!p)return;if(b.betChampion(Number(p.dataset.pick)))d.close()})}
 exit(){this.save();this.destroy();this.onExit?.()}
 back(){const d=this.root.querySelector('.db-modal[open]');if(d){d.close();return}if(this.openBracket){this.action('close-bracket');return}this.exit()}
 destroy(){
  // Stakes on duels still playing come back: nothing is decided while the screen is closed.
  for(const b of this.boards)b.refund();for(const b of this.brackets)b.refund();this.save();
  clearTimeout(this.timer);clearInterval(this.saveTimer);for(const b of this.boards)b.destroy();for(const b of this.brackets)b.destroy();this.supply.close();
  this.root.removeEventListener('click',this.onClick);this.root.removeEventListener('error',this.onError,true);document.removeEventListener('visibilitychange',this.onVisible);for(const v of this.voices||[])v.pause();this.el=null;
 }
}

// One replayed duel. el = the board's DOM (null while nobody is looking).
class Replay{
 constructor(game,tl,{level,slot,pick=null,start=0}){Object.assign(this,{game,tl,level,slot,pick});this.sched=M.schedule(tl);this.t=start;this.i=0;this.pending=0;this.seats=tl.seats.map(s=>game.seatOf(s));
  // Joining part-way (a bracket opened mid-round): what already happened pays at once.
  if(start>0){let lump=0;while(this.i<tl.frames.length&&this.sched.at[this.i]<=start){lump+=M.eventIncome(game.state,tl.frames[this.i][0],level);this.i++}if(lump>0)game.gain(lump,{size:'small'})}}
 get done(){return this.t>=this.sched.total}
 lastBoard(upto){for(let i=upto;i>=0;i--)if(this.tl.frames[i]?.[1])return this.tl.frames[i][1];return null}
 tick(dt,view){
  this.t+=dt;const s=this.game.state;let shown=null,events=[];
  while(this.i<this.tl.frames.length&&this.sched.at[this.i]<=this.t){const f=this.tl.frames[this.i++];events.push(...f[0]);if(f[1])shown=f[1];this.pending+=M.eventIncome(s,f[0],this.level)}
  if(view&&(shown||events.length))view.frame(shown,events,this);
  if(this.pending>0&&(this.game.clock-(this.paidAt||0)>350||this.done)){this.paidAt=this.game.clock;const v=this.pending;this.pending=0;this.game.gain(v,{from:view?.root||null,size:'small'})}
 }
 result(){return M.resultOf(this.tl,this.seats)}
}

// The bare board. Built once, then only text, classes and widths change.
class BoardView{
 constructor(game,parent,{title,stakes}){this.game=game;this.root=document.createElement('div');this.root.className='db-board';
  const side=p=>`<div class="db-side p${p}"><div class="db-who"><img alt="" class="db-face"><span class="db-name"></span><span class="db-chip"></span><span class="db-lp"><i></i><b>8000</b></span><small class="db-counts"></small></div><div class="db-row db-st">${'<i></i>'.repeat(5)}</div><div class="db-row db-mz">${'<i><b></b></i>'.repeat(5)}</div></div>`;
  this.root.innerHTML=`<div class="db-head"><span class="db-league">${esc(title)}</span><span class="db-stakes">${esc(stakes)}</span></div><div class="db-field">${side(1)}<div class="db-mid"><span class="db-ticker"></span></div>${side(0)}</div><div class="db-overlay"></div>`;
  parent.append(this.root);
  this.sides=[0,1].map(p=>{const el=this.root.querySelector('.db-side.p'+p);return {el,face:el.querySelector('.db-face'),name:el.querySelector('.db-name'),chip:el.querySelector('.db-chip'),lp:el.querySelector('.db-lp b'),bar:el.querySelector('.db-lp i'),counts:el.querySelector('.db-counts'),st:[...el.querySelectorAll('.db-st i')],mz:[...el.querySelectorAll('.db-mz i')],last:null}});
  this.ticker=this.root.querySelector('.db-ticker');this.overlay=this.root.querySelector('.db-overlay');
 }
 setStakes(text){this.root.querySelector('.db-stakes').textContent=text}
 seats(seats,pick=null){seats.forEach((s,p)=>{const v=this.sides[p];v.face.src=assetURL('assets/'+s.sprite);v.name.textContent=s.name;v.chip.innerHTML=this.game.tierChip(s.label);v.el.classList.toggle('picked',pick===p)});}
 clear(){for(const v of this.sides){v.last=null;v.lp.textContent='8000';v.bar.style.width='100%';v.counts.textContent='';v.el.classList.remove('won','lost');for(const z of [...v.st,...v.mz]){z.className='';z.title='';if(z.firstChild)z.firstChild.textContent=''}}this.ticker.textContent=''}
 frame(board,events,replay){
  if(board)board.forEach((row,p)=>this.row(p,row));
  const anim=this.game.state.settings.fx!=='off'&&motion()===2;
  let line='';
  for(const e of events){const p=e[1],v=this.sides[p];
   if(e[0]==='t'){line=`${replay.seats[p].name}'s turn`}
   else if(e[0]==='s'||e[0]==='f'){if(!/attack/.test(line))line=`${e[0]==='f'?'Fusion: ':''}${this.game.cardName(e[2])}`;if(anim&&v.mz[e[3]])v.mz[e[3]].animate([{scale:1.5,opacity:.4},{scale:1,opacity:1}],{duration:260,easing:'ease-out'})}
   else if(e[0]==='a'){const a=v.mz[e[2]],code=v.last?.[4+e[2]]?.[0];line=`${code?this.game.cardName(code):'Monster'} attacks${e[3]<0?' directly!':''}`;if(anim&&a)a.animate([{translate:'0 0'},{translate:`0 ${p?10:-10}px`},{translate:'0 0'}],{duration:260});const t=e[3]>=0?this.sides[1-p].mz[e[3]]:null;if(anim&&t)t.animate([{opacity:1},{opacity:.25},{opacity:1}],{duration:300})}
   else if(e[0]==='c'){if(!line)line=this.game.cardName(e[2])}
   else if(e[0]==='l'&&anim)v.lp.animate([{scale:1.4,color:e[2]<0?'#ff6a6a':'#7dff9a'},{scale:1}],{duration:380})
  }
  if(line)this.ticker.textContent=line;
 }
 row(p,row){const v=this.sides[p],last=v.last;v.last=row;
  if(!last||last[0]!==row[0]){v.lp.textContent=Math.max(0,row[0]);v.bar.style.width=Math.max(0,Math.min(100,row[0]/80))+'%'}
  if(!last||last[1]!==row[1]||last[2]!==row[2])v.counts.textContent=`✋${row[1]} 🂠${row[2]}`;
  for(let i=0;i<5;i++){const m=row[4+i],o=last?.[4+i],z=v.mz[i];if(last&&JSON.stringify(m)===JSON.stringify(o))continue;
   if(!m){z.className='';z.title='';z.firstChild.textContent='';continue}
   const [code,atk,def,pos]=m,faceDown=!(pos&5),def_=!!(pos&12);z.className=(faceDown?'set':'up')+(def_?' def':'');z.title=faceDown?'Set monster':this.game.cardName(code);z.firstChild.textContent=faceDown?'':def_?def:atk}
  for(let i=0;i<5;i++){const c=row[9+i],o=last?.[9+i],z=v.st[i];if(last&&JSON.stringify(c)===JSON.stringify(o))continue;
   if(!c){z.className='';z.title='';continue}const [code,up]=c;const t=up?Number(this.game.cards.get(code)?.data?.type)||0:0;z.className=up?(t&4?'trap':'spell'):'set';z.title=up?this.game.cardName(code):'Set card'}
 }
 ending(winner,payout){this.sides.forEach((v,p)=>{v.el.classList.toggle('won',winner===p);v.el.classList.toggle('lost',winner!==p&&winner<2)})}
 show(html){this.overlay.innerHTML=html;this.overlay.classList.toggle('on',!!html)}
 remove(){this.root.remove()}
}

// A board before brackets: wait for a duel, take a bet, play it, pay, repeat.
class Board{
 constructor(game,slot){Object.assign(this,{game,slot});this.level=slot;this.phase='load';this.replay=null;this.next=null;this.fetch()}
 stakeText(){const s=M.boardStake(this.level),p=M.correctPayout(this.game.state,this.slot,this.level);return s?`Bet ${M.fmt(s)} · win ${M.fmt(p)}`:`Free bet · win ${M.fmt(p)}`}
 attach(grid){this.view=new BoardView(this.game,grid,{title:`Board ${this.slot} · ${M.LEAGUES[this.slot-1]}`,stakes:this.stakeText()});this.paint()}
 detach(){this.view?.remove();this.view=null}
 fetch(){this.phase='load';this.game.supply.take().then(tl=>{if(this.dead)return;this.next=tl;this.phase='bet';this.paint()}).catch(()=>{if(!this.dead)setTimeout(()=>this.fetch(),3000)})}
 paint(){const v=this.view;if(!v)return;v.setStakes(this.stakeText());
  if(this.phase==='load'){v.clear();v.show('<div class="db-wait"><span class="db-spinner"></span>Shuffling decks…</div>');return}
  if(this.phase==='bet'){const seats=this.next.seats.map(s=>this.game.seatOf(s)),stake=M.boardStake(this.level),afford=M.canAfford(this.game.state,stake);v.clear();v.seats(seats);
   v.show(`<div class="db-bet">${seats.map((s,p)=>`<button class="db-pick" data-db="pick" data-slot="${this.slot}" data-seat="${p}" ${afford?'':'disabled'}><img alt="" src="${assetURL('assets/'+s.sprite)}"><b>${esc(s.name)}</b>${this.game.tierChip(s.label)}</button>`).join('<span class="db-vs">VS</span>')}<div class="db-place">${afford?'Place your bets':'Need '+M.fmt(stake)+' to bet'}</div></div>`);return}
  if(this.phase==='play'){v.show('');v.seats(this.replay.seats,this.replay.pick);const b=this.replay.lastBoard(this.replay.i-1);if(b)v.frame(b,[],this.replay);return}
 }
 bet(seat){if(this.phase!=='bet')return;const stake=M.boardStake(this.level);if(!M.spend(this.game.state,stake)){this.paint();return}
  const st=this.game.state.stats;st.bets++;this.stake=stake;this.game.dirty=true;this.game.paintTotal();this.game.refreshShop();
  this.replay=new Replay(this.game,this.next,{level:this.level,slot:this.slot,pick:seat});this.next=null;this.phase='play';this.view?.clear();this.paint();this.game.sound('assets/sfx/shop-select.wav',.6)}
 tick(dt){
  if(this.phase==='bet'&&this.view&&!this.view.overlay.querySelector('.db-pick:not([disabled])')&&M.canAfford(this.game.state,M.boardStake(this.level)))this.paint();
  if(this.phase==='play'){this.replay.tick(dt,this.view);if(this.replay.done)this.finish()}
  else if(this.phase==='result'){this.hold-=dt/M.speedOf(this.game.state);if(this.hold<=0){this.game.supply.release(this.replay?.tl);this.replay=null;this.fetch();this.paint()}}
 }
 finish(){const g=this.game,s=g.state,r=this.replay.result(),pick=this.replay.pick,pay=M.duelPayout(s,r,this.level,this.slot,pick),kind=r.reason;
  this.stake=0;this.phase='result';this.hold=RESULT_HOLD;
  if(pick===r.winner){s.stats.correct++;s.stats.slots[this.slot]=(s.stats.slots[this.slot]||0)+1}
  if([16,20,31,33].includes(kind))s.stats.exodia++;if(kind===21)s.stats.destiny++;
  this.view?.ending(r.winner);
  const winnerName=r.winner<2?this.replay.seats[r.winner].name:'Nobody';
  this.view?.show(`<div class="db-result ${pick===r.winner?'good':pick==null?'':'bad'}"><b>${esc(winnerName)} wins</b><small>${pick==null?'':pick===r.winner?'Correct call!':'Wrong call'}</small></div>`);
  g.payParts(pay,this.view?.root);g.dirty=true}
 refund(){if(this.phase==='play'&&this.stake){if(!this.game.state.settings.infinite)this.game.state.coins+=this.stake;this.stake=0}}
 destroy(){this.dead=true;this.game.supply.release(this.replay?.tl);this.game.supply.release(this.next);this.detach()}
}
DuelBets.prototype.payParts=function(pay,from){
 // Each part of a payout pops on its own: jackpots get the big treatment.
 pay.parts.forEach(([label,value,big],i)=>setTimeout(()=>{if(!this.el)return;const jackpot=/JACKPOT|Alternate|Deck-out/.test(label);this.gain(value,{from,size:jackpot?'jackpot':big?'medium':'small',label:big||jackpot?label:''});if(jackpot)this.banner(label+'!')},i*260));
};

// A bracket: 18 random CPUs from every tier play 3 rounds on 9 boards; most wins is the champion.
class Bracket{
 constructor(game,index,saved){Object.assign(this,{game,index});this.random=Math.random;
  const roster=saved?.roster?.map(k=>game.deck(k)).filter(Boolean);
  if(roster?.length===M.ROSTER_SIZE){this.roster=roster;this.round=Math.min(M.BRACKET_ROUNDS-1,saved.round|0);this.wins=saved.wins?.length===M.ROSTER_SIZE?saved.wins:Array(M.ROSTER_SIZE).fill(0);this.dmg=saved.dmg?.length===M.ROSTER_SIZE?saved.dmg:Array(M.ROSTER_SIZE).fill(0);this.bet=saved.bet??null}else this.fresh();
  this.startPhase(this.round===0?'bet':'break')}
 fresh(){this.roster=M.pickRoster(this.game.pool,Math.random);this.round=0;this.wins=Array(M.ROSTER_SIZE).fill(0);this.dmg=Array(M.ROSTER_SIZE).fill(0);this.bet=null}
 // Mid-round, the round restarts on the next visit, so its results so far are not kept.
 saved(){const base=this.phase==='round'&&this.roundStart?this.roundStart:this;return {roster:this.roster.map(d=>d.key),round:Math.min(this.round,M.BRACKET_ROUNDS-1),wins:[...base.wins],dmg:[...base.dmg],bet:this.bet}}
 level(slot){return M.slotLevel(slot,this.index)}
 startPhase(phase){this.phase=phase;this.left=phase==='bet'?BET_WINDOW:phase==='break'?ROUND_BREAK:FINAL_HOLD;
  if(phase==='bet'||phase==='break'){this.pairs=M.pairRound(M.ROSTER_SIZE,Math.random);const views=this.duels?.map(d=>d.view);this.duels=this.pairs.map((pair,i)=>({pair,slot:i+1,pick:null,stake:0,replay:null,model:null,done:false,winner:null,view:views?.[i]||null}));if(this.game.openBracket===this)this.requestAll()}
  this.game.dirty=true;this.paintAll()}
 requestAll(){for(const d of this.duels)this.request(d)}
 request(d){if(d.replay||d.asked||d.done)return;d.asked=true;const duels=this.duels;this.game.supply.record(d.pair.map(i=>this.roster[i]),true,()=>!d.done&&!this.dead&&this.duels===duels).then(tl=>{d.asked=false;if(d.done||this.dead)return;
   if(this.phase==='round'){const start=d.model?Math.min(.95,d.model.t/d.model.dur):0;const sched=M.schedule(tl);d.replay=new Replay(this.game,tl,{level:this.level(d.slot),slot:d.slot,pick:d.pick,start:start*sched.total});d.model=null}else d.tl=tl;
   this.paintDuel(d)}).catch(()=>{d.asked=false})}
 async startRound(){this.phase='round';this.roundStart={wins:[...this.wins],dmg:[...this.dmg]};
  for(const d of this.duels){if(d.tl){d.replay=new Replay(this.game,d.tl,{level:this.level(d.slot),slot:d.slot,pick:d.pick});d.tl=null;continue}
   // Nobody is watching: settle it from the decks' records, over the length of a real recorded duel.
   const sample=await this.game.supply.sample(),[a,b]=d.pair.map(i=>this.roster[i]),stats=this.game.supply.stats;
   const winner=M.modelWinner(a,b,stats,Math.random);d.model={t:0,dur:sample?M.schedule(sample).total:30000,winner,reason:M.modelWinKind(winner?b:a,stats,Math.random),sample};
   if(this.game.openBracket===this)this.request(d)}
  this.paintAll()}
 betDuel(i,seat){const d=this.duels[i];if(!d||d.pick!=null||this.phase==='round'||this.phase==='final')return;const stake=M.boardStake(this.level(d.slot));if(!M.spend(this.game.state,stake))return;d.pick=seat;d.stake=stake;this.game.state.stats.bets++;this.game.dirty=true;this.game.paintTotal();this.game.refreshShop();this.paintDuel(d)}
 betChampion(i){if(this.phase!=='bet'||this.bet)return false;const stake=M.championStake(this.game.state,this.index);if(!M.spend(this.game.state,stake))return false;this.bet={pick:i,stake};this.game.dirty=true;this.game.paintTotal();this.game.refreshShop();this.paintAll();return true}
 tick(gdt,dt){
  if(this.phase!=='round'){this.left-=dt;if(this.left<=0){if(this.phase==='final'){this.fresh();this.startPhase('bet')}else this.startRound()}else if((this.tileAt=(this.tileAt||0)+dt)>480){this.tileAt=0;if(this.game.openBracket===this)this.paintHead();else if(this.tile&&!this.game.openBracket)this.paintTile()}return}
  let all=true;
  for(const d of this.duels){if(d.done)continue;all=false;
   if(d.replay){d.replay.tick(gdt,d.view||null);if(d.replay.done)this.settle(d,d.replay.result(),d.replay)}
   else if(d.model){d.model.t+=gdt;if(d.model.t>=d.model.dur)this.settleModel(d)}}
  if(all)this.endRound();else if(this.tile&&!this.game.openBracket&&(this.tileAt=(this.tileAt||0)+dt)>500){this.tileAt=0;this.paintTile()}
 }
 settleModel(d){const m=d.model,sample=m.sample,s=this.game.state,level=this.level(d.slot);
  // Fees from a comparable recorded duel stand in for this one's events.
  let fees=0;if(sample)for(const f of sample.frames)fees+=M.eventIncome(s,f[0],level);
  const r={winner:m.winner,reason:m.reason,turns:sample?.turns||10,winnerLp:sample&&sample.winner<2?M.finalLp(sample,sample.winner):4000,winnerTier:this.roster[d.pair[m.winner]].label};
  if(fees>0)this.game.gain(fees,{from:this.tile,size:'small'});const dmg=[0,0];if(r.winner<2){dmg[r.winner]=8000;dmg[1-r.winner]=8000-r.winnerLp}this.settle(d,r,null,dmg)}
 settle(d,r,replay,damage){d.done=true;d.winner=r.winner;const s=this.game.state;
  if(r.winner<2){this.wins[d.pair[r.winner]]++}
  const dmg=replay?M.damageDealt(replay.tl):damage;if(dmg){this.dmg[d.pair[0]]+=dmg[0]||0;this.dmg[d.pair[1]]+=dmg[1]||0}
  if(d.pick===r.winner&&d.pick!=null){s.stats.correct++}
  if([16,20,31,33].includes(r.reason))s.stats.exodia++;if(r.reason===21)s.stats.destiny++;
  const pay=M.duelPayout(s,r,this.level(d.slot),d.slot,d.pick);d.stake=0;
  this.game.payParts(pay,d.view?.root||(this.game.openBracket?null:this.tile));d.view?.ending(r.winner);
  if(d.view){const name=r.winner<2?this.game.seatOf(this.roster[d.pair[r.winner]]).name:'Nobody';d.view.show(`<div class="db-result ${d.pick==null?'':d.pick===r.winner?'good':'bad'}"><b>${esc(name)} wins</b></div>`)}
  this.game.dirty=true}
 endRound(){this.round++;
  if(this.round>=M.BRACKET_ROUNDS){const order=M.standings(this.wins,this.dmg),champ=order[0],s=this.game.state;
   if(this.bet){if(this.bet.pick===champ){s.stats.champions++;const v=M.championPayout(s,this.index);setTimeout(()=>{if(!this.game.el)return;this.game.gain(v,{from:this.tile,size:'big',label:'CHAMPION'});this.game.banner(this.game.seatOf(this.roster[champ]).name+' takes Bracket '+this.index+'!')},300)}this.bet=null}
   this.champion=champ;this.round=M.BRACKET_ROUNDS;this.startPhase('final');this.game.save()}
  else{this.startPhase('break');this.game.save()}}
 // ---- drawing ----
 tileHTML(){const order=M.standings(this.wins,this.dmg).slice(0,3),g=this.game;
  const status=this.phase==='bet'?`Betting · ${Math.ceil(this.left/1000)}s`:this.phase==='break'?`Round ${this.round+1} in ${Math.ceil(this.left/1000)}s`:this.phase==='final'?'Champion crowned':`Round ${this.round+1}/${M.BRACKET_ROUNDS}`;
  const progress=this.phase==='round'?this.duels.filter(d=>d.done).length/9:0;
  const champ=this.phase==='final'?g.seatOf(this.roster[this.champion]).name:'';
  return `<span class="db-bk-title">Bracket ${this.index}</span><span class="db-bk-status">${esc(status)}</span><span class="db-bk-bar"><i style="width:${Math.round(progress*100)}%"></i></span>${champ?`<b class="db-bk-champ">🏆 ${esc(champ)}</b>`:`<ol>${order.map(i=>`<li>${esc(g.seatOf(this.roster[i]).name)} <b>${this.wins[i]}</b></li>`).join('')}</ol>`}<span class="db-bk-bet">${this.bet?'Your pick: '+esc(g.seatOf(this.roster[this.bet.pick]).name):this.phase==='bet'?`<span class="db-bk-betbtn" data-db="champion" data-b="${this.index}">Bet on champion · ${M.fmt(M.championStake(g.state,this.index))}</span>`:''}</span>`}
 paintTile(){if(this.tile?.isConnected)this.tile.innerHTML=this.tileHTML()}
 show(stage){this.hideViews();stage.innerHTML=`<div class="db-bk-head"><button data-db="close-bracket">‹ Brackets</button><span class="db-bk-info"></span>${''}</div><div class="db-grid n9"></div>`;
  const grid=stage.querySelector('.db-grid');this.head=stage.querySelector('.db-bk-info');
  for(const d of this.duels){d.view=new BoardView(this.game,grid,{title:`Board ${d.slot}`,stakes:''});}
  this.requestAll();this.paintAll()}
 hideViews(){for(const d of this.duels||[]){d.view?.remove();d.view=null}}
 hide(){this.hideViews();this.head=null}
 paintAll(){if(this.game.openBracket!==this){this.paintTile();return}for(const d of this.duels)this.paintDuel(d);this.paintHead()}
 paintHead(){if(!this.head)return;const order=M.standings(this.wins,this.dmg).slice(0,3);this.head.innerHTML=`<b>Bracket ${this.index}</b> · ${this.phase==='round'?`Round ${this.round+1}/${M.BRACKET_ROUNDS}`:this.phase==='final'?'Final standings':`Round ${this.round+1} starts soon`} · Leaders: ${order.map(i=>`${esc(this.game.seatOf(this.roster[i]).name)} (${this.wins[i]})`).join(', ')}${this.phase==='bet'&&!this.bet?` <button data-db="champion" data-b="${this.index}">Bet on champion</button>`:this.bet?` · Your pick: ${esc(this.game.seatOf(this.roster[this.bet.pick]).name)}`:''}`}
 paintDuel(d){const v=d.view;if(!v)return;const level=this.level(d.slot),seats=d.pair.map(i=>this.game.seatOf(this.roster[i]));v.setStakes(`Bet ${M.fmt(M.boardStake(level))} · win ${M.fmt(M.correctPayout(this.game.state,d.slot,level))}`);
  if(this.phase==='bet'||this.phase==='break'){v.clear();v.seats(seats,d.pick);
   v.show(d.pick!=null?`<div class="db-wait">Your bet: ${esc(seats[d.pick].name)}</div>`:`<div class="db-bet">${seats.map((s,p)=>`<button class="db-pick" data-db="bracket-pick" data-b="${this.index}" data-duel="${d.slot-1}" data-seat="${p}" ${M.canAfford(this.game.state,M.boardStake(level))?'':'disabled'}><img alt="" src="${assetURL('assets/'+s.sprite)}"><b>${esc(s.name)}</b>${this.game.tierChip(s.label)}</button>`).join('<span class="db-vs">VS</span>')}<div class="db-place">Place your bets</div></div>`);return}
  if(this.phase==='final'){v.show(`<div class="db-wait">Round over</div>`);return}
  if(d.done)return;
  if(d.replay){v.show('');v.seats(d.replay.seats,d.pick);const b=d.replay.lastBoard(d.replay.i-1);if(b)v.frame(b,[],d.replay);return}
  v.clear();v.seats(seats,d.pick);v.show('<div class="db-wait"><span class="db-spinner"></span>Catching up…</div>')}
 refund(){const s=this.game.state;if(this.phase==='round')for(const d of this.duels)if(d.stake&&!d.done){if(!s.settings.infinite)s.coins+=d.stake;d.stake=0;d.pick=null}
}
 destroy(){this.dead=true;this.hideViews()}
}
