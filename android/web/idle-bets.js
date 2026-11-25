// Duel Bets: an incremental minigame. Bet on which CPU wins a duel, earn money, buy upgrades and more
// boards; nine boards become a bracket, up to nine brackets. Every duel is recorded ahead of time by a worker
// (idle-bets-library.js) and replayed here with a deliberately bare board: coloured slots, ATK numbers and
// LP bars, updated in place. One timer drives everything, 10×/s while boards are on screen, 4×/s otherwise,
// and nothing runs while the page is hidden or after the screen closes.
// The settings gear is the game's own (mobile.js navigationIcons.settings), copied so this file stays self-contained.
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
  this.onError=e=>{const img=e.target;if(img?.tagName!=='IMG')return;if(img.dataset.full&&img.src!==img.dataset.full){img.src=img.dataset.full;delete img.dataset.full}else img.style.visibility='hidden'};root.addEventListener('error',this.onError,true);
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
  this.root.innerHTML=`<section class="duel-bets"><header class="db-top"><div class="db-money"><small>TOTAL MONEY</small><b class="db-total"></b></div><div class="db-sub"></div><div class="db-top-buttons"><button class="db-round" data-db="settings" aria-label="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 3 .6-2h4.8l.6 2 1.6.9 2-.5 2.4 4.2-1.4 1.5v1.8l1.4 1.5-2.4 4.2-2-.5-1.6.9-.6 2H9l-.6-2-1.6-.9-2 .5-2.4-4.2 1.4-1.5V9.1L2.4 7.6l2.4-4.2 2 .5Z" transform="translate(0 2)"/><circle cx="12" cy="12" r="3.3"/></svg></button><button class="db-round" data-db="exit" aria-label="Save and exit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button></div></header><div class="db-body"><main class="db-stage"></main><aside class="db-shop" aria-label="Upgrades"><div class="db-shop-list"></div></aside></div><div class="db-fx" aria-hidden="true"></div></section>`;
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
   return `<div class="db-item ${it.kind}" data-item="${it.id}"><span class="db-icon">${it.art?`<img class="relic" loading="lazy" decoding="async" alt="" src="${esc(assetURL('assets/relics/'+it.art+'.png'))}">`:`<img loading="lazy" decoding="async" alt="" src="${assetURL('assets/cards-thumb/'+it.icon+'.jpg')}" data-full="${assetURL('assets/cards/'+it.icon+'.jpg')}">`}</span><span class="db-item-text"><b>${esc(it.name)}${it.kind!=='opener'||it.max>1?` <small class="db-count">${it.max===Infinity?'×'+level:level+'/'+it.max}</small>`:''}</b></span><button class="db-buy" data-db="buy" data-id="${it.id}" ${maxed?'disabled':''}>${maxed?'MAX':M.fmt(cost)}</button></div>`}).join('')||'<p class="db-empty">Win a bet to open the shop.</p>';
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
 // Board sounds: each one at most every 150 ms, quieter and rarer when many boards share the screen.
 boardSound(path,gain=1){if(this.state.settings.fx==='off')return;const many=(this.openBracket?9:this.boards.length)>4,now=performance.now();this.lastSfx??={};
  if(now-(this.lastSfx[path]||0)<(many?400:150))return;this.lastSfx[path]=now;this.sound(path,gain*(many?.6:1))}
 // A big final blow gets the duel's own finisher voice, like the main game (only with a few boards on screen).
 finisher(tl,r){if(r.reason!==1||(this.openBracket?9:this.boards.length)>4||this.state.settings.fx==='off')return;let hit=0;
  for(let i=tl.frames.length-1;i>=0&&!hit;i--)for(const e of tl.frames[i][0])if(e[0]==='l'&&e[2]<0){hit=-e[2];break}
  const word=hit>=8000?'godlike':hit>=6000?'annihilation':hit>=4500?'devastating':hit>=3000?'overkill':'';if(word)this.sound('assets/sfx/kill-'+word+'.wav',1.2)}
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
  setTimeout(()=>this.el?.total.animate([{scale:1,textShadow:'0 0 0 transparent'},{scale:size==='medium'?1.15:1.35,textShadow:'0 0 14px var(--db-accent)'},{scale:1,textShadow:'0 0 0 transparent'}],{duration:size==='medium'?360:600,easing:'ease-out'}),700);
  if(size!=='medium'&&from?.isConnected)from.animate([{boxShadow:'0 0 0 0 var(--db-accent)'},{boxShadow:'0 0 0 6px transparent'}],{duration:900,iterations:2});
 }
 // ---- the clock ----
 loop(){
  if(!this.el)return;const now=performance.now(),dt=document.hidden?0:Math.min(250,now-this.last);this.last=now;
  if(dt>0){const gdt=dt*M.speedOf(this.state);this.clock+=dt;for(const b of this.boards)b.tick(gdt);for(const b of this.brackets)b.tick(gdt,dt)}
  if(dt>0)this.autoBet(dt);
  const watching=this.boards.length||this.openBracket;this.timer=setTimeout(()=>this.loop(),document.hidden?1000:watching?100:250);
 }
 // Auto Bet: one waiting board per interval, in board order (normal boards, then bracket duels between rounds).
 autoBet(dt){const every=M.autoInterval(this.state);if(!every)return;this.autoAt=Math.min(every,(this.autoAt||0)+dt);if(this.autoAt<every)return;
  for(const b of this.boards)if(b.phase==='bet'&&b.next&&M.canAfford(this.state,M.boardStake(b.level))){this.autoAt=0;b.bet(M.autoPick(this.state,b.next.seats.map(x=>this.seatOf(x))),true);return}
  for(const br of this.brackets)if(br.phase==='bet'||br.phase==='break')for(const d of br.duels||[])if(d.pick==null&&M.canAfford(this.state,M.boardStake(br.level(d.slot)))){this.autoAt=0;br.betDuel(d.slot-1,M.autoPick(this.state,d.pair.map(i=>br.roster[i])));return}}
 // ---- input ----
 action(a,el){
  if(a==='exit')return this.exit();
  if(a==='settings')return this.settings();
  if(a==='buy'){const id=el.dataset.id,r=M.buy(this.state,id);if(!r){el.animate([{translate:'0 0'},{translate:'-4px 0'},{translate:'4px 0'},{translate:'0 0'}],{duration:220});return}
   this.dirty=true;this.sound('assets/sfx/purchase-coins.wav',.8);this.paintTotal();this.renderShop();this.updateSub();this.bought(id);
   if(r.kind==='board'||r.kind==='bracket'){this.sound('assets/sfx/rare-shimmer.wav',1);this.layout();this.arrive(r.kind==='bracket'?`.db-bracket[data-b="${this.state.brackets}"]`:`.db-board[data-slot="${this.state.boards}"]`);const label=r.kind==='bracket'?(this.state.brackets===1?'Bracket mode!':'Bracket '+this.state.brackets+' open!'):'Board '+this.state.boards+' open!';this.banner(label)}
   this.save();return}
  if(a==='pick'){const board=this.boards[Number(el.dataset.slot)-1];return board?.bet(Number(el.dataset.seat))}
  if(a==='open-bracket'){const b=this.brackets[Number(el.dataset.b)-1];if(b){this.openBracket=b;this.layout()}return}
  if(a==='close-bracket'){const b=this.openBracket;this.openBracket=null;b?.hide();this.layout();return}
  if(a==='bracket-pick'){const b=this.brackets[Number(el.dataset.b)-1];return b?.betDuel(Number(el.dataset.duel),Number(el.dataset.seat))}
  if(a==='champion'){const b=this.brackets[Number(el.dataset.b)-1];return b&&this.championPicker(b)}
 }
 // A purchase: coins fly from the total into the item, the row flashes and its count pops.
 bought(id){const row=this.el?.shop.querySelector(`[data-item="${id}"]`);if(!row||this.state.settings.fx==='off'||!motion())return;
  row.animate([{boxShadow:'inset 0 0 0 2px var(--db-accent),0 0 14px var(--db-accent)'},{boxShadow:'inset 0 0 0 0 transparent,0 0 0 transparent'}],{duration:700,easing:'ease-out'});
  row.querySelector('.db-icon')?.animate([{scale:1,rotate:'0deg'},{scale:1.35,rotate:'-10deg',offset:.35},{scale:1,rotate:'0deg'}],{duration:450,easing:'ease-out'});
  const count=row.querySelector('.db-count');count?.animate([{scale:1,color:'#fff'},{scale:1.8,color:'#fff',offset:.3},{scale:1}],{duration:500,easing:'ease-out'});
  if(motion()<2||this.state.settings.fx!=='full')return;const box=this.el.fx.getBoundingClientRect(),a=this.el.total.getBoundingClientRect(),b=row.querySelector('.db-icon').getBoundingClientRect();
  const x0=a.left-box.left+a.width/2,y0=a.top-box.top+a.height/2,x1=b.left-box.left+b.width/2,y1=b.top-box.top+b.height/2;
  for(let i=0;i<6;i++){const c=document.createElement('img');c.className='db-coin';c.alt='';c.src=assetURL('assets/ui/coins.png');c.style.left=x0+'px';c.style.top=y0+'px';this.el.fx.append(c);
   c.animate([{opacity:0,translate:'0 0',scale:.6},{opacity:1,translate:`${(x1-x0)/2}px ${Math.min(0,(y1-y0)/2)-40-Math.random()*30}px`,scale:1,offset:.45},{opacity:.9,translate:`${x1-x0}px ${y1-y0}px`,scale:.5}],{duration:520,delay:i*40,easing:'ease-in-out',fill:'backwards'}).finished.catch(()=>{}).finally(()=>c.remove())}}
 // A board or bracket that just opened sweeps in with a gold glow.
 arrive(sel){const el=this.el?.stage.querySelector(sel);if(!el||!motion()||this.state.settings.fx==='off')return;el.animate([{opacity:0,scale:.7,boxShadow:'0 0 0 0 var(--db-accent)'},{opacity:1,scale:1.04,boxShadow:'0 0 30px 6px var(--db-accent)',offset:.55},{opacity:1,scale:1,boxShadow:'0 0 0 0 transparent'}],{duration:900,easing:'ease-out'})}
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

// A scaled-down duel field: card art in every zone, piles, hands and LP, with each CPU's portrait filling its
// half of the board behind it. Built once; afterwards only image sources, classes and text change.
const CARD_BACK='assets/card-back.jpg',PHASES=[[1,'DP'],[2,'SP'],[4,'MP1'],[8,'BP'],[256,'MP2'],[512,'EP']];
const cardSrc=code=>assetURL('assets/cards-thumb/'+code+'.jpg'),cardFull=code=>assetURL('assets/cards/'+code+'.jpg');
class BoardView{
 constructor(game,parent,{title,stakes,slot=1}){this.game=game;this.root=document.createElement('div');this.root.className='db-board';this.root.dataset.slot=slot;
  // Rows: 1 top hand/info · 2-3 top player's Spell/Trap and monsters · 4 middle · 5-6 bottom player's · 7 bottom hand.
  const zone=(cls,row,col)=>`<i class="z ${cls}" style="grid-area:${row}/${col}"><img alt="" draggable="false"><b></b></i>`;
  const cells=[];
  for(let i=0;i<5;i++){cells.push(zone('st p1 s'+i,2,6-i),zone('mz p1 m'+i,3,6-i),zone('mz p0 m'+i,5,2+i),zone('st p0 s'+i,6,2+i))}
  cells.push(zone('pile deck p1',2,1),zone('pile extra p1',2,7),zone('pile grave p1',3,1),zone('st field p1',3,7),zone('st field p0',5,1),zone('pile grave p0',5,7),zone('pile extra p0',6,1),zone('pile deck p0',6,7));
  const info=p=>`<div class="db-who p${p}" style="grid-area:${p?1:7}/1/${p?2:8}/5"><span class="db-name"></span><span class="db-chip"></span><span class="db-lp"><i></i><b>8000</b></span></div><div class="db-hand p${p}" style="grid-area:${p?1:7}/5/${p?2:8}/8"></div>`;
  this.root.innerHTML=`<div class="db-head"><span class="db-league">${esc(title)}</span><span class="db-stakes">${esc(stakes)}</span></div><div class="db-field"><img class="db-art a0" alt=""><img class="db-art a1" alt=""><i class="db-danger p0"></i><i class="db-danger p1"></i><div class="db-mat">${info(1)}${cells.join('')}<div class="db-mid" style="grid-area:4/1/5/8"><span class="db-phases"><b class="db-turn"></b>${PHASES.map(([n,t])=>`<i data-ph="${n}">${t}</i>`).join('')}</span></div>${info(0)}</div></div><div class="db-overlay"></div>`;
  parent.append(this.root);
  const q=s=>this.root.querySelector(s),zones=(p,cls)=>[0,1,2,3,4].map(i=>q(`.z.${cls}.p${p}.${cls==='mz'?'m':'s'}${i}`));
  this.sides=[0,1].map(p=>({who:q('.db-who.p'+p),name:q(`.db-who.p${p} .db-name`),chip:q(`.db-who.p${p} .db-chip`),lp:q(`.db-who.p${p} .db-lp b`),bar:q(`.db-who.p${p} .db-lp i`),hand:q('.db-hand.p'+p),
   mz:zones(p,'mz'),st:zones(p,'st'),field:q('.z.field.p'+p),deck:q('.z.deck.p'+p),extra:q('.z.extra.p'+p),grave:q('.z.grave.p'+p),art:q('.db-art.a'+p),danger:q('.db-danger.p'+p),last:null,handN:-1}));
  this.mat=q('.db-mat');this.phases=[...this.root.querySelectorAll('.db-phases i')];this.turnEl=q('.db-turn');this.overlay=q('.db-overlay');this.field=q('.db-field');
 }
 setStakes(text){this.root.querySelector('.db-stakes').textContent=text}
 // Card art: the small thumbnail, else the full card (error listener in DuelBets), else the bare zone.
 card(z,code,{back=false,label=''}={}){const img=z.firstChild,key=back?'back':String(code||'');
  if(z.dataset.code!==key){z.dataset.code=key;
   if(!key){img.removeAttribute('src');img.style.visibility='hidden'}else{img.style.visibility='';if(back){delete img.dataset.full;img.src=assetURL(CARD_BACK)}else{img.dataset.full=cardFull(code);img.src=cardSrc(code)}}}
  if(z.lastChild.textContent!==label)z.lastChild.textContent=label}
 seats(seats,pick=null){seats.forEach((s,p)=>{const v=this.sides[p],src=assetURL('assets/'+s.sprite);if(v.art.getAttribute('src')!==src)v.art.src=src;v.name.textContent=s.name;v.chip.innerHTML=this.game.tierChip(s.label);v.who.classList.toggle('picked',pick===p)})}
 clear(){for(const v of this.sides){v.last=null;v.handN=-1;v.hand.innerHTML='';v.lp.textContent='8000';v.bar.style.width='100%';v.who.classList.remove('won','lost','low');v.danger.style.opacity=0;v.danger.classList.remove('critical');
   for(const z of [...v.mz,...v.st,v.field,v.grave,v.deck,v.extra]){z.classList.remove('up','set','def');this.card(z,0)}}this.turnN=0;this.turnEl.textContent='';this.phase(0);this.field.classList.remove('playing')}
 frame(board,events,replay){
  this.field.classList.add('playing');
  if(board)board.forEach((row,p)=>this.row(p,row));
  const anim=this.game.state.settings.fx!=='off'&&motion()===2;
  for(const e of events){const p=e[1],v=this.sides[p];
   if(e[0]==='t'){this.turnN=(this.turnN||0)+1;this.turnEl.textContent='T'+this.turnN;this.turnEl.classList.toggle('p1',p===1)}
   else if(e[0]==='p')this.phase(p)
   else if(e[0]==='s'||e[0]==='f'){const z=v.mz[e[3]],atk=v.last?.[4+e[3]]?.[1]||0,boss=e[0]==='f'||atk>=2500;
    // Boss monsters (2500+ ATK) and Fusions land hard: bigger slam, gold ring, a shake and a sound.
    if(anim&&z)z.animate(boss?[{scale:2.4,opacity:0,translate:`0 ${p?'-':''}30%`},{scale:.92,opacity:1,translate:'0 0',offset:.6},{scale:1}]:[{scale:1.6,opacity:.3},{scale:1,opacity:1}],{duration:boss?420:280,easing:'ease-out'});
    this.ring(z,boss?'#ffd76a':'#ffffffaa');if(boss){this.shake(4);this.flash(p,'#ffd76a44',500);this.game.boardSound('assets/sfx/card-reveal.wav',.55)}}
   else if(e[0]==='a'){const a=v.mz[e[2]];if(anim&&a)a.animate([{translate:'0 0',scale:1},{translate:`0 ${p?18:-18}%`,scale:1.12,offset:.35},{translate:`0 ${p?45:-45}%`,scale:1.05,offset:.6},{translate:'0 0',scale:1}],{duration:340,easing:'ease-in-out'});
    const t=e[3]>=0?this.sides[1-p].mz[e[3]]:null;if(anim&&t)t.animate([{opacity:1,translate:'0 0'},{opacity:.3,translate:'3px 0',offset:.3},{opacity:1,translate:'-3px 0',offset:.6},{opacity:1,translate:'0 0'}],{duration:340,delay:150});
    if(t)setTimeout(()=>this.ring(t,'#ff5050'),180);else setTimeout(()=>this.flash(1-p,'#ff303066',380),170)}
   else if(e[0]==='l'){const n=e[2];this.damage(p,n);if(anim)v.lp.animate([{scale:1.5,color:n<0?'#ff6a6a':'#7dff9a'},{scale:1}],{duration:420});
    if(n<0){const hit=-n;this.shake(hit>=3000?7:hit>=1500?4:hit>=700?2:0);if(hit>1000)this.hurt(p,hit);if(hit>=1500)this.flash(p,'#ff202070',450);if(hit>=1000)this.game.boardSound('assets/sfx/count-lp-damage.wav',.5)}
    else if(n>=1000){this.flash(p,'#40ff8050',450);this.game.boardSound('assets/sfx/count-lp-heal.wav',.45)}}
  }
 }
 row(p,row){const v=this.sides[p],last=v.last;v.last=row;const same=(a,b)=>a===b||JSON.stringify(a)===JSON.stringify(b);
  if(!last||last[0]!==row[0]){v.lp.textContent=Math.max(0,row[0]);v.bar.style.width=Math.max(0,Math.min(100,row[0]/80))+'%';this.danger(p,row[0])}
  if(v.handN!==row[1]){v.handN=row[1];v.hand.innerHTML='<i></i>'.repeat(Math.min(row[1],8))+(row[1]?`<b>${row[1]}</b>`:'')}
  for(let i=0;i<5;i++){const m=row[4+i],z=v.mz[i];if(last&&same(m,last[4+i]))continue;
   if(!m){if(last?.[4+i])this.poof(z);z.classList.remove('up','set','def');this.card(z,0);continue}
   const [code,atk,def,pos]=m,down=!(pos&5),defence=!!(pos&12);z.classList.toggle('set',down);z.classList.toggle('up',!down);z.classList.toggle('def',defence);
   this.card(z,code,{back:down,label:down?'':defence?String(def):String(atk)})}
  const st=(z,c)=>{if(!c){z.classList.remove('up','set');this.card(z,0);return}const [code,up]=c;z.classList.toggle('set',!up);z.classList.toggle('up',!!up);this.card(z,code,{back:!up})};
  for(let i=0;i<5;i++)if(!last||!same(row[9+i],last[9+i]))st(v.st[i],row[9+i]);
  if(!last||!same(row[14],last[14]))st(v.field,row[14]);
  if(!last||last[2]!==row[2])this.card(v.deck,0,{back:!!row[2],label:String(row[2])});
  if(!last||last[16]!==row[16])this.card(v.extra,0,{back:!!row[16],label:row[16]?String(row[16]):''});
  if(!last||last[3]!==row[3]||last[15]!==row[15]||last[17]!==row[17]){this.card(v.grave,row[15]||0,{label:row[3]?String(row[3]):''})}
 }
 // ---- impact: 0 none (Off / reduced motion) · 1 light (no shakes or particles) · 2 full ----
 lvl(){const fx=this.game.state.settings.fx,m=motion();return fx==='off'||m===0?0:fx==='light'||m===1?1:2}
 play(el,frames,opt){return el.animate(frames,opt).finished.catch(()=>{}).finally(()=>el.remove())}
 temp(cls,parent=this.field,tag='i'){const el=document.createElement(tag);el.className=cls;parent.append(el);return el}
 shake(px){if(this.lvl()<2||!px)return;this.mat.animate([{translate:'0 0'},{translate:`${px}px ${-px*.6}px`},{translate:`${-px}px ${px*.5}px`},{translate:`${px*.5}px ${-px*.3}px`},{translate:'0 0'}],{duration:280,easing:'ease-out'})}
 // A word slammed onto the board (DUEL!, CORRECT!, MISS…).
 stamp(text,cls,x=50,y=50){if(!this.lvl())return;const el=this.temp('db-stamp '+cls,this.field,'b');el.textContent=text;el.style.left=x+'%';el.style.top=y+'%';
  this.play(el,[{opacity:0,scale:2.6},{opacity:1,scale:.94,offset:.16},{opacity:1,scale:1,offset:.22},{opacity:1,scale:1,offset:.78},{opacity:0,scale:1.08}],{duration:1400,easing:'ease-out'})}
 // A coloured flash over one player's half (0 = bottom, 1 = top) or the whole board (null).
 flash(p,color,ms=420){if(!this.lvl())return;const el=this.temp('db-flash');if(p!=null){el.style.top=p?'0':'50%';el.style.bottom=p?'50%':'0'}el.style.background=`radial-gradient(ellipse at 50% ${p===1?'25%':p===0?'75%':'50%'},${color},transparent 72%)`;
  this.play(el,[{opacity:1},{opacity:0}],{duration:ms,easing:'ease-out'})}
 ring(z,color){if(this.lvl()<2||!z)return;const r=this.temp('db-ring',z);r.style.borderColor=color;this.play(r,[{opacity:1,scale:.5},{opacity:0,scale:2.1}],{duration:520,easing:'ease-out'})}
 // A destroyed monster bursts out of its zone instead of just vanishing.
 poof(z){if(!this.lvl())return;const img=z.firstChild;if(!img.getAttribute('src')||img.style.visibility==='hidden')return;const c=img.cloneNode();c.className='db-poof';z.append(c);
  this.play(c,[{opacity:1,scale:1,rotate:'0deg'},{opacity:.8,scale:1.25,rotate:'-6deg',offset:.3},{opacity:0,scale:.2,rotate:'25deg'}],{duration:460,easing:'ease-in'});
  if(this.lvl()>1)for(let i=0;i<5;i++){const k=this.temp('db-shard',z);const a=Math.random()*Math.PI*2,d=60+Math.random()*60;this.play(k,[{opacity:1,translate:'0 0',scale:1},{opacity:0,translate:`${Math.cos(a)*d}% ${Math.sin(a)*d}%`,scale:.3}],{duration:420+Math.random()*200,easing:'ease-out'})}}
 // A duel starts: the backed CPU's half lights up and DUEL! slams down.
 duelStart(pick){const v=this.sides[pick];if(v&&this.lvl())v.art.animate([{opacity:1,scale:1.06},{opacity:.32,scale:1}],{duration:900,easing:'ease-out'});this.stamp('DUEL!','duel');this.flash(pick??null,'#ffd76a66',600)}
 // The duel is over: the winner's half flares, the loser's fades; your call is stamped on top.
 outcome(winner,pick){if(winner<2){this.flash(winner,'#ffe27a88',900);const v=this.sides[winner];if(this.lvl())v.art.animate([{opacity:.32},{opacity:.9,offset:.25},{opacity:.6}],{duration:1400,fill:'forwards'})}
  if(pick==null)return;if(winner===pick){this.stamp('CORRECT!','good',50,42);this.shake(3)}else this.stamp('MISS','bad',50,42)}
 // The hit CPU's portrait shakes on any hit over 1000 damage, harder for bigger hits.
 hurt(p,hit){if(!this.lvl())return;const px=Math.min(14,4+hit/500),v=this.sides[p];
  v.art.animate([{translate:'0 0'},{translate:`${-px}px ${px*.3}px`},{translate:`${px}px ${-px*.3}px`},{translate:`${-px*.7}px 0`},{translate:`${px*.5}px ${px*.2}px`},{translate:`${-px*.25}px 0`},{translate:'0 0'}],{duration:420,easing:'ease-out',composite:'add'})}
 // That player's half turns redder as their LP falls (none at 8000+, strongest at 0); under 1000 it pulses.
 danger(p,lp){const v=this.sides[p],k=Math.max(0,Math.min(1,1-lp/8000));v.danger.style.opacity=this.game.state.settings.fx==='off'?0:(k**1.6*.85).toFixed(3);v.danger.classList.toggle('critical',lp>0&&lp<1000&&this.lvl()>0);v.who.classList.toggle('low',lp<2000)}
 // The lit phase: Battle Phase covers its steps (8-128).
 phase(n){const key=n>=8&&n<256?8:n;for(const i of this.phases)i.classList.toggle('on',Number(i.dataset.ph)===key)}
 // Damage numbers: rise from the hit player's half of the field (top player = upper half) and fade.
 damage(p,amount){if(!amount||this.game.state.settings.fx==='off')return;if((this.dmgN||0)>=4)return;
  const el=document.createElement('b'),big=Math.abs(amount)>=2000;el.className='db-dmg'+(amount>0?' heal':'')+(big?' big':'');el.textContent=(amount>0?'+':'−')+Math.abs(amount);
  el.style.left=(30+Math.random()*40)+'%';el.style.top=(p?24:62)+'%';this.field.append(el);this.dmgN=(this.dmgN||0)+1;
  const done=()=>{el.remove();this.dmgN--};
  if(motion()===0){setTimeout(done,700);return}
  el.animate([{opacity:0,scale:.5,translate:'-50% 0'},{opacity:1,scale:big?1.25:1.1,translate:'-50% -20%',offset:.15},{opacity:1,scale:1,translate:'-50% -60%',offset:.7},{opacity:0,scale:1,translate:'-50% -110%'}],{duration:big?1300:1000,easing:'ease-out'}).finished.catch(()=>{}).finally(done)}
 ending(winner){this.sides.forEach((v,p)=>{v.who.classList.toggle('won',winner===p);v.who.classList.toggle('lost',winner!==p&&winner<2)})}
 // The betting view: each CPU's portrait fills its half of the board; tap a half to back that CPU.
 betView(seats,attrs,afford,place){this.clear();this.seats(seats);
  this.show(`<div class="db-bet">${seats.map((s,p)=>`<button class="db-pick s${p}" ${attrs(p)} ${afford?'':'disabled'}><span><b>${esc(s.name)}</b>${this.game.tierChip(s.label)}</span></button>`).join('')}<span class="db-vs">VS</span><div class="db-place">${esc(place)}</div></div>`)}
 show(html){this.overlay.innerHTML=html;this.overlay.classList.toggle('on',!!html);this.root.classList.toggle('betting',!!this.overlay.querySelector('.db-bet'))}
 remove(){this.root.remove()}
}

// A board before brackets: wait for a duel, take a bet, play it, pay, repeat.
class Board{
 constructor(game,slot){Object.assign(this,{game,slot});this.level=slot;this.phase='load';this.replay=null;this.next=null;this.fetch()}
 stakeText(){const s=M.boardStake(this.level),p=M.correctPayout(this.game.state,this.slot,this.level);return s?`Bet ${M.fmt(s)} · win ${M.fmt(p)}`:`Free bet · win ${M.fmt(p)}`}
 attach(grid){this.view=new BoardView(this.game,grid,{title:`Board ${this.slot} · ${M.LEAGUES[this.slot-1]}`,stakes:this.stakeText(),slot:this.slot});this.paint()}
 detach(){this.view?.remove();this.view=null}
 fetch(){this.phase='load';this.game.supply.take().then(tl=>{if(this.dead)return;this.next=tl;this.phase='bet';this.paint()}).catch(()=>{if(!this.dead)setTimeout(()=>this.fetch(),3000)})}
 paint(){const v=this.view;if(!v)return;v.setStakes(this.stakeText());
  if(this.phase==='load'){v.clear();v.show('<div class="db-wait"><span class="db-spinner"></span>Shuffling decks…</div>');return}
  if(this.phase==='bet'){const seats=this.next.seats.map(s=>this.game.seatOf(s)),stake=M.boardStake(this.level),afford=M.canAfford(this.game.state,stake);
   v.betView(seats,p=>`data-db="pick" data-slot="${this.slot}" data-seat="${p}"`,afford,afford?'Place your bets':'Need '+M.fmt(stake)+' to bet');return}
  if(this.phase==='play'){v.show('');v.seats(this.replay.seats,this.replay.pick);const b=this.replay.lastBoard(this.replay.i-1);if(b)v.frame(b,[],this.replay);return}
 }
 bet(seat,auto=false){if(this.phase!=='bet')return;const stake=M.boardStake(this.level);if(!M.spend(this.game.state,stake)){this.paint();return}
  const st=this.game.state.stats;st.bets++;this.stake=stake;this.game.dirty=true;this.game.paintTotal();this.game.refreshShop();
  this.replay=new Replay(this.game,this.next,{level:this.level,slot:this.slot,pick:seat});this.next=null;this.phase='play';this.view?.clear();this.paint();this.view?.duelStart(seat);this.game.boardSound(auto?'assets/sfx/deck-select.wav':'assets/sfx/shop-select.wav',auto?.35:.7)}
 tick(dt){
  if(this.phase==='bet'&&this.view&&!this.view.overlay.querySelector('.db-pick:not([disabled])')&&M.canAfford(this.game.state,M.boardStake(this.level)))this.paint();
  if(this.phase==='play'){this.replay.tick(dt,this.view);if(this.replay.done)this.finish()}
  else if(this.phase==='result'){this.hold-=dt/M.speedOf(this.game.state);if(this.hold<=0){this.game.supply.release(this.replay?.tl);this.replay=null;this.fetch();this.paint()}}
 }
 finish(){const g=this.game,s=g.state,r=this.replay.result(),pick=this.replay.pick,pay=M.duelPayout(s,r,this.level,this.slot,pick),kind=r.reason;
  this.stake=0;this.phase='result';this.hold=RESULT_HOLD;
  if(pick===r.winner){s.stats.correct++;s.stats.slots[this.slot]=(s.stats.slots[this.slot]||0)+1}
  if([16,20,31,33].includes(kind))s.stats.exodia++;if(kind===21)s.stats.destiny++;
  this.view?.ending(r.winner);this.view?.outcome(r.winner,pick);g.finisher(this.replay.tl,r);
  const winnerName=r.winner<2?this.replay.seats[r.winner].name:'Nobody';
  this.view?.show(`<div class="db-result ${pick===r.winner?'good':pick==null?'':'bad'}"><b>${esc(winnerName)} wins</b></div>`);
  g.payParts(pay,this.view?.root);g.dirty=true}
 refund(){if(this.phase==='play'&&this.stake){if(!this.game.state.settings.infinite)this.game.state.coins+=this.stake;this.stake=0}}
 destroy(){this.dead=true;this.game.supply.release(this.replay?.tl);this.game.supply.release(this.next);this.detach()}
}
// Exodia / Destiny Board / other jackpots: the whole screen flashes and shakes and the card bursts in.
DuelBets.prototype.jackpot=function(label){if(!this.el||this.state.settings.fx==='off')return;const m=motion(),art=/EXODIA/.test(label)?33396948:/DESTINY/.test(label)?94212438:null;
 const flash=document.createElement('i');flash.className='db-screenflash';this.el.fx.append(flash);flash.animate([{opacity:.9},{opacity:0}],{duration:700,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>flash.remove());
 if(m===2&&this.state.settings.fx==='full')this.root.querySelector('.db-body')?.animate([{translate:'0 0'},{translate:'8px -5px'},{translate:'-8px 4px'},{translate:'5px 3px'},{translate:'-3px -2px'},{translate:'0 0'}],{duration:450,easing:'ease-out'});
 if(art&&m){const img=document.createElement('img');img.className='db-splash';img.alt='';img.src=assetURL('assets/cards/'+art+'.jpg');this.el.fx.append(img);
  img.animate([{opacity:0,scale:3,rotate:'-12deg'},{opacity:1,scale:1,rotate:'-4deg',offset:.18},{opacity:1,scale:1.04,rotate:'-4deg',offset:.8},{opacity:0,scale:1.3,rotate:'-4deg'}],{duration:2400,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>img.remove())}};
DuelBets.prototype.payParts=function(pay,from){
 // Each part of a payout pops on its own: jackpots get the big treatment.
 pay.parts.forEach(([label,value,big],i)=>setTimeout(()=>{if(!this.el)return;const jackpot=/JACKPOT|Alternate|Deck-out/.test(label);this.gain(value,{from,size:jackpot?'jackpot':big?'medium':'small',label:big||jackpot?label:''});if(jackpot){this.jackpot(label);this.banner(label+'!')}},i*260));
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
  this.game.payParts(pay,d.view?.root||(this.game.openBracket?null:this.tile));d.view?.ending(r.winner);d.view?.outcome(r.winner,d.pick);if(d.view&&replay)this.game.finisher(replay.tl,r);
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
  for(const d of this.duels){d.view=new BoardView(this.game,grid,{title:`Board ${d.slot}`,stakes:'',slot:d.slot});}
  this.requestAll();this.paintAll()}
 hideViews(){for(const d of this.duels||[]){d.view?.remove();d.view=null}}
 hide(){this.hideViews();this.head=null}
 paintAll(){if(this.game.openBracket!==this){this.paintTile();return}for(const d of this.duels)this.paintDuel(d);this.paintHead()}
 paintHead(){if(!this.head)return;const order=M.standings(this.wins,this.dmg).slice(0,3);this.head.innerHTML=`<b>Bracket ${this.index}</b> · ${this.phase==='round'?`Round ${this.round+1}/${M.BRACKET_ROUNDS}`:this.phase==='final'?'Final standings':`Round ${this.round+1} starts soon`} · Leaders: ${order.map(i=>`${esc(this.game.seatOf(this.roster[i]).name)} (${this.wins[i]})`).join(', ')}${this.phase==='bet'&&!this.bet?` <button data-db="champion" data-b="${this.index}">Bet on champion</button>`:this.bet?` · Your pick: ${esc(this.game.seatOf(this.roster[this.bet.pick]).name)}`:''}`}
 paintDuel(d){const v=d.view;if(!v)return;const level=this.level(d.slot),seats=d.pair.map(i=>this.game.seatOf(this.roster[i]));v.setStakes(`Bet ${M.fmt(M.boardStake(level))} · win ${M.fmt(M.correctPayout(this.game.state,d.slot,level))}`);
  if(this.phase==='bet'||this.phase==='break'){v.clear();v.seats(seats,d.pick);
   if(d.pick!=null)v.show(`<div class="db-wait">Your bet: ${esc(seats[d.pick].name)}</div>`);else v.betView(seats,p=>`data-db="bracket-pick" data-b="${this.index}" data-duel="${d.slot-1}" data-seat="${p}"`,M.canAfford(this.game.state,M.boardStake(level)),'Place your bets');return}
  if(this.phase==='final'){v.show(`<div class="db-wait">Round over</div>`);return}
  if(d.done)return;
  if(d.replay){v.show('');v.seats(d.replay.seats,d.pick);const b=d.replay.lastBoard(d.replay.i-1);if(b)v.frame(b,[],d.replay);return}
  v.clear();v.seats(seats,d.pick);v.show('<div class="db-wait"><span class="db-spinner"></span>Catching up…</div>')}
 refund(){const s=this.game.state;if(this.phase==='round')for(const d of this.duels)if(d.stake&&!d.done){if(!s.settings.infinite)s.coins+=d.stake;d.stake=0;d.pick=null}
}
 destroy(){this.dead=true;this.hideViews()}
}
