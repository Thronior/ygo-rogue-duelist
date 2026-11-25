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
const BET_WINDOW=1500,FINAL_HOLD=6000,RESULT_HOLD=1800;
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
  // Duel Feats use the main game's public battle coin rules.
  M.setCoinRules(content.battleCoinRules);const byName=new Map([...this.cards.values()].map(c=>[c.name,c.id]));
  this.cardInfo=code=>{const c=this.cards.get(code);return c?{type:Number(c.data?.type)||0,level:Number(c.level)||0,race:c.race,attribute:c.attribute}:null};
  this.signatures=id=>new Set((this.chars[id]?.cards||[]).map(n=>byName.get(n)).filter(Boolean));
  {const best=new Map();for(const d of this.pool)best.set(d.id,Math.max(best.get(d.id)??0,M.tierRank(d.label)));
   M.registerCharacters([...best].map(([id,rank])=>({id,rank,uc:!!this.chars[id]?.ultimate_collector,name:this.chars[id]?.name||'CPU',sprite:this.chars[id]?.sprite||''})).sort((a,b)=>a.name.localeCompare(b.name)))}
  this.state=M.sanitize(this.load());this.boards=[];this.brackets=[];this.openBracket=null;this.clock=0;this.dirty=false;this.shown=this.state.coins;
  this.supply=new DuelSupply({pool:this.pool,deckList:this.deckList,cards:[...(content.cards||[]),...(content.tokenCards||[])]});
  this.onClick=e=>{const b=e.target.closest('[data-db]');if(!b||!this.root.contains(b))return;e.preventDefault();this.action(b.dataset.db,b)};
  // Card thumbnails are missing for some icons: fall back to the full card art (no inline handlers under the CSP).
  this.onError=e=>{const img=e.target;if(img?.tagName!=='IMG')return;if(img.dataset.full&&img.src!==img.dataset.full){img.src=img.dataset.full;delete img.dataset.full}else img.style.visibility='hidden'};root.addEventListener('error',this.onError,true);
  this.onVisible=()=>{if(document.hidden)this.save();this.last=performance.now()};
  root.addEventListener('click',this.onClick);document.addEventListener('visibilitychange',this.onVisible);
  // Reloading or closing the app mid-duel refunds the stakes still in play, like Save & Exit.
  this.onHide=()=>{for(const b of this.boards)b.refund();for(const b of this.brackets)b.refund();this.save()};addEventListener('pagehide',this.onHide);
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
  this.root.innerHTML=`<section class="duel-bets"><header class="db-top"><div class="db-money"><small>TOTAL MONEY</small><b class="db-total"></b></div><div class="db-sub"></div><div class="db-top-buttons"><button class="db-round" data-db="deck-stats" aria-label="CPU deck stats" title="CPU deck stats"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M8 2.5v3M12 2.5v3M16 2.5v3M8.5 10h7M8.5 13.5h7M8.5 17h4.5"/></svg></button><button class="db-round" data-db="settings" aria-label="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 3 .6-2h4.8l.6 2 1.6.9 2-.5 2.4 4.2-1.4 1.5v1.8l1.4 1.5-2.4 4.2-2-.5-1.6.9-.6 2H9l-.6-2-1.6-.9-2 .5-2.4-4.2 1.4-1.5V9.1L2.4 7.6l2.4-4.2 2 .5Z" transform="translate(0 2)"/><circle cx="12" cy="12" r="3.3"/></svg></button><button class="db-round" data-db="exit" aria-label="Save and exit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button></div></header><div class="db-body"><main class="db-stage"></main><aside class="db-shop" aria-label="Upgrades"><nav class="db-shop-tabs" role="tablist"></nav><div class="db-shop-list"></div></aside></div><div class="db-fx" aria-hidden="true"></div></section>`;
  this.el={tabs:this.root.querySelector('.db-shop-tabs'),total:this.root.querySelector('.db-total'),sub:this.root.querySelector('.db-sub'),stage:this.root.querySelector('.db-stage'),shop:this.root.querySelector('.db-shop-list'),fx:this.root.querySelector('.db-fx')};
  this.paintTotal(true);this.renderShop();
  // Shop tooltips: hover an item (mouse) or tap its picture (touch) for exactly what it does.
  this.el.tip=document.createElement('div');this.el.tip.className='db-tip';this.root.querySelector('.duel-bets').append(this.el.tip);
  this.el.shop.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const row=e.target.closest('.db-item');if(row)this.showTip(row)});
  this.el.shop.addEventListener('pointerleave',()=>this.hideTip());
  this.el.shop.addEventListener('scroll',()=>this.hideTip(),{passive:true});
  this.el.shop.addEventListener('click',e=>{const icon=e.target.closest('.db-icon');if(!icon)return;const row=icon.closest('.db-item');if(this.tipFor===row.dataset.item)this.hideTip();else{this.showTip(row);clearTimeout(this.tipTimer);this.tipTimer=setTimeout(()=>this.hideTip(),4000)}});
 }
 showTip(row){const id=row.dataset.item,it=M.ITEM[id];if(!it)return;this.tipFor=id;const tip=this.el.tip;
  tip.innerHTML=`<b>${esc(it.name)}</b>${M.tooltip(this.state,id).map(t=>`<p>${esc(t)}</p>`).join('')}`;tip.classList.add('on');
  const r=row.getBoundingClientRect(),box=this.root.querySelector('.duel-bets').getBoundingClientRect(),portrait=matchMedia('(orientation:portrait)').matches;
  if(portrait){tip.style.left='8px';tip.style.right='8px';tip.style.top='';tip.style.bottom=(box.bottom-r.top+6)+'px'}
  else{tip.style.right=(box.right-r.left+8)+'px';tip.style.left='';tip.style.bottom='';tip.style.top=Math.max(8,Math.min(r.top-box.top,box.height-tip.offsetHeight-8))+'px'}}
 hideTip(){this.tipFor=null;this.el?.tip.classList.remove('on')}
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
  for(const b of this.brackets){b.tile=this.el.stage.querySelector(`.db-bracket[data-b="${b.index}"]`);b.buildTile()}
 }
 updateSub(){const s=this.state;this.el.sub.textContent=`${M.speedOf(s)}× speed${M.multiplier(s)>1?' · ×'+M.multiplier(s)+' payouts':''}${s.brackets?` · ${s.brackets} bracket${s.brackets>1?'s':''}`:` · ${s.boards} board${s.boards>1?'s':''}`}`}
 // ---- shop ----
 renderShop(){
  // Category tabs; the open tab lists its items from the dearest to the cheapest first-purchase price.
  const s=this.state,all=M.visibleItems(s);this.shopIds=all.map(i=>i.id).join();
  const cats=M.CATEGORIES.map(c=>c[0]).filter(c=>all.some(i=>M.categoryOf(i.id)===c));if(!cats.includes(this.shopTab))this.shopTab=cats[0];
  const tab=c=>`<button role="tab" data-db="shop-tab" data-cat="${esc(c)}" aria-selected="${c===this.shopTab}" class="${c===this.shopTab?'on':''}">${esc(c)}<i></i></button>`;
  this.el.tabs.innerHTML=M.TAB_ROWS.map(row=>row.filter(c=>cats.includes(c))).filter(row=>row.length).map(row=>`<div class="db-tabrow">${row.map(tab).join('')}</div>`).join('');
  const items=all.filter(i=>M.categoryOf(i.id)===this.shopTab).sort((a,b)=>M.itemCost(b.id,0)-M.itemCost(a.id,0));
  const head='';this.el.shop.innerHTML=items.map(it=>{const level=M.itemLevel(s,it.id),maxed=level>=it.max,cost=maxed?0:M.itemCost(it.id,level);
   return `<div class="db-item ${it.kind}" data-item="${it.id}"><span class="db-icon">${it.portrait?`<img class="face" loading="lazy" decoding="async" alt="" src="${esc(assetURL('assets/'+it.portrait))}">`:it.art?`<img class="relic" loading="lazy" decoding="async" alt="" src="${esc(assetURL('assets/relics/'+it.art+'.png'))}">`:`<img loading="lazy" decoding="async" alt="" src="${assetURL('assets/cards-thumb/'+it.icon+'.jpg')}" data-full="${assetURL('assets/cards/'+it.icon+'.jpg')}">`}</span><span class="db-item-text"><b>${esc(it.name)}${it.kind!=='opener'||it.max>1?` <small class="db-count">${it.max===Infinity?'×'+level:level+'/'+it.max}</small>`:''}</b></span>${maxed&&it.keep?`<button class="db-buy db-toggle ${M.isOn(s,it.id)?'on':''}" data-db="toggle-item" data-id="${it.id}">${M.isOn(s,it.id)?'ON':'OFF'}</button>`:`<button class="db-buy" data-db="buy" data-id="${it.id}" ${maxed?'disabled':''}>${maxed?'MAX':M.fmt(cost)}</button>`}</div>`.replace(/^/,head)}).join('')||'<p class="db-empty">Win a bet to open the shop.</p>';
  this.paintAfford();
 }
 paintAfford(){for(const b of this.el.shop.querySelectorAll('.db-buy:not(.db-toggle)')){const id=b.dataset.id,level=M.itemLevel(this.state,id);if(level>=M.ITEM[id].max)continue;b.classList.toggle('poor',!M.canAfford(this.state,M.itemCost(id,level)))}
  // A dot on each tab that has something you can buy right now.
  const ok=new Set(M.visibleItems(this.state).filter(i=>{const l=M.itemLevel(this.state,i.id);return l<i.max&&M.canAfford(this.state,M.itemCost(i.id,l))}).map(i=>M.categoryOf(i.id)));
  for(const t of this.el.tabs?.querySelectorAll('button')||[])t.classList.toggle('can',ok.has(t.dataset.cat))}
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
 crowded(){return (this.openBracket?9:this.boards.length)>=7}
 boardSound(path,gain=1){if(this.state.settings.fx==='off')return;const many=(this.openBracket?9:this.boards.length)>4,now=performance.now();this.lastSfx??={};
  if(now-(this.lastSfx[path]||0)<(many?400:150))return;this.lastSfx[path]=now;this.sound(path,gain*(many?.6:1))}
 // A big final blow gets the duel's own finisher voice, like the main game (only with a few boards on screen).
 finisher(tl,r){if(r.reason!==1||(this.openBracket?9:this.boards.length)>4||this.state.settings.fx==='off')return;let hit=0;
  for(let i=tl.frames.length-1;i>=0&&!hit;i--)for(const e of tl.frames[i][0])if(e[0]==='l'&&e[2]<0){hit=-e[2];break}
  const word=hit>=8000?'godlike':hit>=6000?'annihilation':hit>=4500?'devastating':hit>=3000?'overkill':'';if(word)this.sound('assets/sfx/kill-'+word+'.wav',1.2)}
 fx(amount,from,size,label){
  const fxOn=this.state.settings.fx,m=motion(),now=performance.now();
  // Coin sounds are as loud as the coin is big, compared with what was earned over the last ~2 seconds.
  this.recentCoins=(this.recentCoins||[]).filter(x=>now-x[0]<2000);this.recentCoins.push([now,amount]);const avg=this.recentCoins.reduce((a,x)=>a+x[1],0)/this.recentCoins.length,loud=Math.max(.15,Math.min(1,Math.sqrt(amount/avg)/1.3));
  if(size==='small'){if(now-(this.lastTick||0)>180){this.lastTick=now;if(fxOn!=='off')this.sound('sound/coin-pickup'+['','-2','-3'][Math.floor(Math.random()*3)]+'.wav',.4*loud)}}
  else if(size==='medium')this.sound('assets/sfx/count-coins.wav',.95*Math.max(.35,loud));
  else{this.sound(size==='jackpot'?'assets/sfx/pack-rare.mp3':'assets/sfx/perfect-chime.wav',1.1);setTimeout(()=>this.sound('assets/sfx/reward-ding.wav',1),220)}
  if(fxOn==='off'||m===0||!this.el)return;
  // Pop from where the money came from; a source that is not on screen (another bracket) pops beside the total.
  const shown=from&&from.isConnected&&from.getClientRects().length,layer=this.el.fx,box=layer.getBoundingClientRect(),src=(shown?from:this.el.total).getBoundingClientRect();if(!shown&&size==='small')return;
  // Each new pop from the same place takes the next lane up, plus a little jitter, so pops never stack exactly.
  this.lanes??=new WeakMap();const key=shown?from:this.el.total,lane=((this.lanes.get(key)||0)+1)%5;this.lanes.set(key,lane);
  const x=src.left-box.left+src.width*(.5+(Math.random()-.5)*(size==='small'?.5:.3)),y=src.top-box.top+src.height*(size==='small'?.55:.48)-lane*(size==='small'?13:24)+(Math.random()-.5)*8;
  // Small: a floating "+0.3". Medium: "+100" and coins flying to the total. Big: a banner and a coin shower.
  if(this.fxCount>40&&size==='small')return;
  const pop=document.createElement('div');pop.className='db-pop '+size;pop.textContent=(label?label+' ':'')+'+'+M.fmt(amount);pop.style.left=x+'px';pop.style.top=y+'px';layer.append(pop);this.fxCount=(this.fxCount||0)+1;
  const life=size==='small'?900:size==='medium'?1400:2600;
  pop.animate(size==='small'?[{opacity:0,translate:'-50% 0'},{opacity:1,translate:'-50% -10px',offset:.2},{opacity:0,translate:'-50% -34px'}]:[{opacity:0,scale:.5,translate:'-50% -50%'},{opacity:1,scale:1.15,translate:'-50% -50%',offset:.15},{opacity:1,scale:1,translate:'-50% -60%',offset:.75},{opacity:0,scale:1,translate:'-50% -90%'}],{duration:life,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>{pop.remove();this.fxCount--});
  if(size==='small'||fxOn==='light'&&size==='medium'||this.state.brackets&&size==='medium')return;// bracket mode: no small coin icons
  const total=this.el.total.getBoundingClientRect(),tx=total.left-box.left+total.width/2,ty=total.top-box.top+total.height/2,n=Math.min(m===1?5:size==='medium'?8:12,size==='medium'?8:12);
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
  for(const br of this.brackets)for(const d of br.openBets()){this.autoAt=0;br.betDuel(d.slot-1,M.autoPick(this.state,d.pair.map(i=>br.roster[i])));return}}
 // ---- input ----
 action(a,el){
  if(a==='exit')return this.exit();
  if(a==='settings')return this.settings();
  if(a==='deck-stats')return this.deckStats();
  if(a==='toggle-item'){const id=el.dataset.id,off=this.state.settings.off;if(off[id])delete off[id];else off[id]=true;this.dirty=true;this.renderShop();return}
  if(a==='shop-tab'){this.shopTab=el.dataset.cat;this.hideTip();this.renderShop();this.el.shop.scrollTop=0;return}
  if(a==='buy'){const id=el.dataset.id,r=M.buy(this.state,id);if(!r){el.animate([{translate:'0 0'},{translate:'-4px 0'},{translate:'4px 0'},{translate:'0 0'}],{duration:220});return}
   this.dirty=true;this.sound('assets/sfx/purchase-coins.wav',.8);this.paintTotal();this.renderShop();this.updateSub();this.bought(id);if(this.tipFor===id){const row=this.el.shop.querySelector(`[data-item="${id}"]`);if(row)this.showTip(row)}
   if(r.kind==='board'||r.kind==='bracket'){this.sound('assets/sfx/rare-shimmer.wav',1);this.layout();this.arrive(r.kind==='bracket'?`.db-bracket[data-b="${this.state.brackets}"]`:`.db-board[data-slot="${this.state.boards}"]`);const label=r.kind==='bracket'?(this.state.brackets===1?M.bracketName(1)+'!':M.bracketName(this.state.brackets)+' open!'):'Board '+this.state.boards+' open!';this.banner(label)}
   this.save();return}
  if(a==='pick'){const board=this.boards[Number(el.dataset.slot)-1];return board?.bet(Number(el.dataset.seat))}
  if(a==='open-bracket'){const b=this.brackets[Number(el.dataset.b)-1];if(b){this.openBracket=b;this.layout()}return}
  // The standings panel in an open bracket hides behind a burger button (remembered while the screen is open).
  if(a==='toggle-standings'){this.sideOpen=!this.sideOpen;el.setAttribute('aria-expanded',this.sideOpen);this.el.stage.querySelector('.db-bk-open')?.classList.toggle('side-open',this.sideOpen);if(this.sideOpen)this.openBracket?.table?.update(null,null,false);return}
  if(a==='close-bracket'){const b=this.openBracket;this.openBracket=null;b?.hide();this.layout();return}
  if(a==='bracket-pick'){const b=this.brackets[Number(el.dataset.b)-1];return b?.betDuel(Number(el.dataset.duel),Number(el.dataset.seat))}
  if(a==='champion'){const b=this.brackets[Number(el.dataset.b)-1];return b&&this.championPicker(b)}
  if(a==='skip-champion'){const b=this.brackets[Number(el.dataset.b)-1];if(b&&b.phase==='bet'&&!b.bet){b.skipBet=true;b.left=Math.min(b.left,1500);b.paintAll()}return}
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
 // Where a jackpot shows: the board it came from, or the bracket tile holding its crosstable cell; null when off screen.
 spot(from){const el=from?.closest?.('.db-board,.db-bracket')||from;if(!el?.isConnected||!el.getClientRects().length)return null;const box=this.el.fx.getBoundingClientRect(),r=el.getBoundingClientRect();return {x:r.left-box.left+r.width/2,y:r.top-box.top+r.height/2,w:r.width,h:r.height}}
 place(el,at){el.style.left=at.x+'px';el.style.top=at.y+'px';el.style.maxWidth=Math.max(120,at.w-8)+'px';el.style.setProperty('--fit',Math.max(.45,Math.min(1,at.w/520)))}
 banner(text,from){if(!this.el)return;let at=null;if(from!==undefined){at=this.spot(from);if(!at)return}const b=document.createElement('div');b.className='db-banner'+(at?' local':'');b.textContent=text;if(at)this.place(b,at);
  // Banners showing at the same time stack instead of covering each other.
  const live=[...this.el.fx.querySelectorAll('.db-banner')].length;if(live)b.style.marginTop=(live*(at?34:60))+'px';this.el.fx.append(b);b.animate([{opacity:0,scale:.6},{opacity:1,scale:1.05,offset:.15},{opacity:1,scale:1,offset:.8},{opacity:0,scale:1}],{duration:2200,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>b.remove())}
 modal(title,body,onClick){const d=document.createElement('dialog');d.className='db-modal';d.innerHTML=`<header><h2>${esc(title)}</h2><button data-close aria-label="Close">✕</button></header><div class="db-modal-body">${body}</div>`;this.root.querySelector('.duel-bets').append(d);
  d.addEventListener('click',e=>{if(e.target.closest('[data-close]')||e.target===d){d.close();return}onClick?.(e,d)});d.onclose=()=>d.remove();d.showModal();return d}
 settings(){const s=this.state.settings,st=this.state.stats;
  const row=(name,value,label)=>`<label class="db-set"><input type="radio" name="fx" value="${value}" ${s.fx===value?'checked':''}> ${label}</label>`;
  this.modal('Settings',`<h3>Coin effects</h3><div class="db-set-row">${row('fx','full','Full')}${row('fx','light','Light')}${row('fx','off','Off')}</div>${M.DEV_TOOLS?`<h3>Testing (this branch only)</h3><label class="db-set"><input type="checkbox" data-infinite ${s.infinite?'checked':''}> Infinite money</label>`:''}<h3>Records</h3><p>Bets placed: ${st.bets.toLocaleString()} · Correct calls: ${st.correct.toLocaleString()}<br>Exodia wins seen: ${st.exodia} · Destiny Board wins seen: ${st.destiny} · Champions called: ${st.champions}<br>Money earned: ${M.fmt(this.state.earned)}</p><h3>Progress</h3><button data-reset class="db-danger">Reset Duel Bets</button>`,(e,d)=>{
   const r=e.target.closest('input[name="fx"]');if(r){s.fx=r.value;this.dirty=true}
   const inf=e.target.closest('[data-infinite]');if(inf){s.infinite=inf.checked;this.dirty=true;this.paintTotal(true);this.refreshShop()}
   if(e.target.closest('[data-reset]')){if(!e.target.dataset.armed){e.target.dataset.armed='1';e.target.textContent='Tap again to erase all Duel Bets progress';return}d.close();this.reset()}
  })}
 // CPU deck stats: every finished duel on your boards and brackets, per deck, best to worst. Ranked by a smoothed
 // win rate ((wins+1)/(duels+2)) so a 1–0 deck doesn't outrank a 40–10 one; decks with no duels yet come last.
 // Built fresh each time it opens and every 10 seconds while it stays open.
 deckStatsHTML(){const stats=this.state.deckStats||{};
  const rows=this.pool.map(d=>{const [g,w,ex,de]=stats[d.id+':'+d.tier]||[0,0,0,0],s=this.seatOf(d);return {...s,g,w,l:g-w,ex,de,score:g?(w+1)/(g+2):-1}})
   .sort((a,b)=>b.score-a.score||b.g-a.g||a.name.localeCompare(b.name));
  const played=rows.filter(r=>r.g).length,duels=rows.reduce((n,r)=>n+r.g,0)/2;
  return `<p class="db-stats-note">${Math.round(duels).toLocaleString()} duels played · ${played} of ${rows.length} decks have played · best to worst · updates every 10 s</p><table class="db-stats"><thead><tr><th>#</th><th></th><th>CPU</th><th>Deck</th><th>Duels</th><th>W</th><th>L</th><th>Win %</th><th>Exodia</th><th>Destiny</th></tr></thead><tbody>${
   rows.map((r,i)=>`<tr class="${r.g?'':'none'}"><td>${i+1}</td><td><img loading="lazy" alt="" src="${assetURL('assets/'+r.sprite)}"></td><td>${esc(r.name)}</td><td>${this.tierChip(r.label)}</td><td>${r.g}</td><td>${r.w}</td><td>${r.l}</td><td>${r.g?Math.round(r.w/r.g*100)+'%':'–'}</td><td>${r.ex||''}</td><td>${r.de||''}</td></tr>`).join('')}</tbody></table>`}
 deckStats(){const d=this.modal('CPU deck stats',`<div class="db-stats-wrap">${this.deckStatsHTML()}</div>`),body=d.querySelector('.db-modal-body');
  const timer=setInterval(()=>{if(!d.open||!this.el){clearInterval(timer);return}const top=body.scrollTop;d.querySelector('.db-stats-wrap').innerHTML=this.deckStatsHTML();body.scrollTop=top},10000);
  d.addEventListener('close',()=>clearInterval(timer))}
 reset(){for(const b of this.boards)b.destroy();for(const b of this.brackets)b.destroy();this.boards=[];this.brackets=[];this.openBracket=null;const inf=this.state.settings.infinite;this.state=M.newState();this.state.settings.infinite=inf;this.save();this.paintTotal(true);this.renderShop();this.layout()}
 championPicker(b){if(b.phase!=='bet'||b.bet)return;const stake=M.championStake(this.state,b.index),pay=M.championPayout(this.state,b.index);
  this.modal(`${M.bracketName(b.index)} · Who takes it?`,`<p>Bet ${M.fmt(stake)} · the CPU with the most wins after ${M.BRACKET_ROUNDS} rounds pays ${M.fmt(pay)}.</p><div class="db-roster">${b.roster.map((d,i)=>{const s=this.seatOf(d);return `<button data-pick="${i}" ${M.canAfford(this.state,stake)?'':'disabled'}><img loading="lazy" alt="" src="${assetURL('assets/'+s.sprite)}"><span>${esc(s.name)}</span>${this.tierChip(s.label)}</button>`}).join('')}</div>`,(e,d)=>{const p=e.target.closest('[data-pick]');if(!p)return;if(b.betChampion(Number(p.dataset.pick)))d.close()})}
 exit(){this.save();this.destroy();this.onExit?.()}
 back(){const d=this.root.querySelector('.db-modal[open]');if(d){d.close();return}if(this.openBracket){this.action('close-bracket');return}this.exit()}
 destroy(){
  // Stakes on duels still playing come back: nothing is decided while the screen is closed.
  for(const b of this.boards)b.refund();for(const b of this.brackets)b.refund();this.save();
  clearTimeout(this.timer);clearInterval(this.saveTimer);for(const b of this.boards)b.destroy();for(const b of this.brackets)b.destroy();this.supply.close();
  this.root.removeEventListener('click',this.onClick);this.root.removeEventListener('error',this.onError,true);document.removeEventListener('visibilitychange',this.onVisible);removeEventListener('pagehide',this.onHide);for(const v of this.voices||[])v.pause();this.el=null;
 }
}

// One replayed duel. el = the board's DOM (null while nobody is looking).
class Replay{
 constructor(game,tl,{level,slot,pick=null,start=0}){Object.assign(this,{game,tl,level,slot,pick});this.sched=M.schedule(tl);this.t=start;this.i=0;this.pending=0;this.seats=tl.seats.map(s=>game.seatOf(s));
  // Joining part-way (a bracket opened mid-round): what already happened pays at once.
  if(start>0){let lump=0;while(this.i<tl.frames.length&&this.sched.at[this.i]<=start){lump+=M.eventIncome(game.state,tl.frames[this.i][0],level);this.i++}if(lump>0)game.gain(lump,{size:'small'})}}
 get done(){return this.t>=this.sched.total}
 lastBoard(upto){for(let i=upto;i>=0;i--)if(this.tl.frames[i]?.[1])return this.tl.frames[i][1];return null}
 tick(dt,view,anchor=null){
  this.t+=dt;const s=this.game.state;let shown=null,events=[];
  while(this.i<this.tl.frames.length&&this.sched.at[this.i]<=this.t){const f=this.tl.frames[this.i++];events.push(...f[0]);if(f[1])shown=f[1];this.pending+=M.eventIncome(s,f[0],this.level)}
  if(view&&(shown||events.length))view.frame(shown,events,this);
  if(this.pending>0&&(this.game.clock-(this.paidAt||0)>350||this.done)){this.paidAt=this.game.clock;const v=this.pending;this.pending=0;this.game.gain(v,{from:view?.root||anchor,size:'small'})}
 }
 result(){return M.resultOf(this.tl,this.seats)}
}

// A scaled-down duel field: card art in every zone, piles, hands and LP, with each CPU's portrait filling its
// half of the board behind it. Built once; afterwards only image sources, classes and text change.
// Board colours (idle-bets.css .db-board[data-slot]): a live duel's crosstable cells use its board's colour.
const SLOT_HUES=[200,280,140,20,330,50,175,240,0];
const CARD_BACK='assets/card-back.jpg',PHASES=[[1,'DP'],[2,'SP'],[4,'MP1'],[8,'BP'],[256,'MP2'],[512,'EP']];
const cardSrc=code=>assetURL('assets/cards-thumb/'+code+'.jpg'),cardFull=code=>assetURL('assets/cards/'+code+'.jpg');
class BoardView{
 constructor(game,parent,{title,stakes,slot=1}){this.game=game;this.root=document.createElement('div');this.root.className='db-board';this.root.dataset.slot=slot;
  // Rows: 1 top hand/info · 2-3 top player's Spell/Trap and monsters · 4 middle · 5-6 bottom player's · 7 bottom hand.
  const zone=(cls,row,col)=>`<i class="z ${cls}" style="grid-area:${row}/${col}"><img alt="" draggable="false"><b></b></i>`;
  const cells=[];
  for(let i=0;i<5;i++){cells.push(zone('st p1 s'+i,2,6-i),zone('mz p1 m'+i,3,6-i),zone('mz p0 m'+i,5,2+i),zone('st p0 s'+i,6,2+i))}
  cells.push(zone('pile deck p1',2,1),zone('pile extra p1',2,7),zone('pile grave p1',3,1),zone('st field p1',3,7),zone('st field p0',5,1),zone('pile grave p0',5,7),zone('pile extra p0',6,1),zone('pile deck p0',6,7));
  const info=p=>`<div class="db-who p${p}" style="grid-area:${p?1:7}/1/${p?2:8}/5"><span class="db-name"></span><span class="db-chip"></span></div><div class="db-hand p${p}" style="grid-area:${p?1:7}/5/${p?2:8}/8"></div>`;
  this.root.innerHTML=`<div class="db-head"><span class="db-league">${esc(title)}</span><span class="db-stakes">${esc(stakes)}</span></div><div class="db-field"><img class="db-art a0" alt=""><img class="db-art a1" alt=""><i class="db-danger p0"></i><i class="db-danger p1"></i><div class="db-gauge p0"><b>8000</b><i><s></s></i></div><div class="db-gauge p1"><b>8000</b><i><s></s></i></div><div class="db-mat">${info(1)}${cells.join('')}<div class="db-mid" style="grid-area:4/1/5/8"><span class="db-phases"><b class="db-turn"></b>${PHASES.map(([n,t])=>`<i data-ph="${n}">${t}</i>`).join('')}</span></div>${info(0)}</div></div><div class="db-overlay"></div>`;
  parent.append(this.root);
  const q=s=>this.root.querySelector(s),zones=(p,cls)=>[0,1,2,3,4].map(i=>q(`.z.${cls}.p${p}.${cls==='mz'?'m':'s'}${i}`));
  this.sides=[0,1].map(p=>({who:q('.db-who.p'+p),name:q(`.db-who.p${p} .db-name`),chip:q(`.db-who.p${p} .db-chip`),lp:q(`.db-gauge.p${p} b`),bar:q(`.db-gauge.p${p} s`),gauge:q('.db-gauge.p'+p),hand:q('.db-hand.p'+p),
   mz:zones(p,'mz'),st:zones(p,'st'),field:q('.z.field.p'+p),deck:q('.z.deck.p'+p),extra:q('.z.extra.p'+p),grave:q('.z.grave.p'+p),art:q('.db-art.a'+p),danger:q('.db-danger.p'+p),last:null,handN:-1}));
  this.mat=q('.db-mat');this.phases=[...this.root.querySelectorAll('.db-phases i')];this.turnEl=q('.db-turn');this.overlay=q('.db-overlay');this.field=q('.db-field');
 }
 setStakes(text){this.root.querySelector('.db-stakes').textContent=text}
 setStakesHTML(html){const el=this.root.querySelector('.db-stakes');if(el.dataset.html!==html){el.dataset.html=html;el.innerHTML=html}}
 // Card art: the small thumbnail, else the full card (error listener in DuelBets), else the bare zone.
 card(z,code,{back=false,label=''}={}){const img=z.firstChild,key=back?'back':String(code||'');
  if(z.dataset.code!==key){z.dataset.code=key;
   if(!key){img.removeAttribute('src');img.style.visibility='hidden'}else{img.style.visibility='';if(back){delete img.dataset.full;img.src=assetURL(CARD_BACK)}else{img.dataset.full=cardFull(code);img.src=cardSrc(code)}}}
  // The number is the zone's own <b>: effects (rings, bursts) get appended after it, so never use lastChild.
  const num=z.children[1];if(num.textContent!==label)num.textContent=label}
 seats(seats,pick=null){seats.forEach((s,p)=>{const v=this.sides[p],src=assetURL('assets/'+s.sprite);if(v.art.getAttribute('src')!==src)v.art.src=src;v.name.textContent=s.name;v.chip.innerHTML=this.game.tierChip(s.label);v.who.classList.toggle('picked',pick===p)})}
 clear(){for(const v of this.sides){v.last=null;v.handN=-1;v.hand.innerHTML='';v.lp.textContent='8000';v.bar.style.transform='';v.who.classList.remove('won','lost','low');v.gauge.classList.remove('low');v.danger.style.opacity=0;v.danger.classList.remove('critical');
   for(const z of [...v.mz,...v.st,v.field,v.grave,v.deck,v.extra]){z.classList.remove('up','set','def');this.card(z,0)}}this.turnN=0;this.turnEl.textContent='';this.phase(0);this.field.classList.remove('playing')}
 frame(board,events,replay){
  this.field.classList.add('playing');
  if(board)board.forEach((row,p)=>this.row(p,row));
  const anim=this.lvl()===2;
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
  if(!last||last[0]!==row[0]){v.lp.textContent=Math.max(0,row[0]);v.bar.style.transform=`scaleY(${Math.max(0,Math.min(1,row[0]/8000))})`;this.danger(p,row[0])}
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
 // 7+ duels on screen at once: every board drops to the light level (no shakes, rings, bursts, slams or lunges).
 lvl(){const fx=this.game.state.settings.fx,m=motion();return fx==='off'||m===0?0:fx==='light'||m===1||this.game.crowded()?1:2}
 play(el,frames,opt){return el.animate(frames,opt).finished.catch(()=>{}).finally(()=>el.remove())}
 temp(cls,parent=this.field,tag='i'){const el=document.createElement(tag);el.className=cls;parent.append(el);return el}
 shake(px){if(this.lvl()<2||!px)return;this.mat.animate([{translate:'0 0'},{translate:`${px}px ${-px*.6}px`},{translate:`${-px}px ${px*.5}px`},{translate:`${px*.5}px ${-px*.3}px`},{translate:'0 0'}],{duration:280,easing:'ease-out'})}
 // A word slammed onto the board (DUEL!, CORRECT!, MISS…).
 stamp(text,cls,x=50,y=50){if(!this.lvl())return;const el=this.temp('db-stamp '+cls,this.field,'b');el.textContent=text;el.style.left=x+'%';el.style.top=y+'%';
  this.play(el,[{opacity:0,scale:2.6},{opacity:1,scale:.94,offset:.16},{opacity:1,scale:1,offset:.22},{opacity:1,scale:1,offset:.78},{opacity:0,scale:1.08}],{duration:1400,easing:'ease-out'})}
 // A coloured flash over one player's half (0 = bottom, 1 = top) or the whole board (null).
 flash(p,color,ms=420){if(!this.lvl())return;const el=this.temp('db-flash');if(p!=null){el.style.left=p?'50%':'0';el.style.right=p?'0':'50%'}el.style.background=`radial-gradient(ellipse at ${p===1?'100%':p===0?'0%':'50%'} 50%,${color},transparent 72%)`;
  this.play(el,[{opacity:1},{opacity:0}],{duration:ms,easing:'ease-out'})}
 ring(z,color){if(this.lvl()<2||!z)return;const r=this.temp('db-ring',z);r.style.borderColor=color;this.play(r,[{opacity:1,scale:.5},{opacity:0,scale:2.1}],{duration:520,easing:'ease-out'})}
 // A destroyed monster bursts out of its zone instead of just vanishing.
 poof(z){if(!this.lvl())return;const img=z.firstChild;if(!img.getAttribute('src')||img.style.visibility==='hidden')return;const c=img.cloneNode();c.className='db-poof';z.append(c);
  this.play(c,[{opacity:1,scale:1,rotate:'0deg'},{opacity:.8,scale:1.25,rotate:'-6deg',offset:.3},{opacity:0,scale:.2,rotate:'25deg'}],{duration:460,easing:'ease-in'});
  if(this.lvl()>1)for(let i=0;i<5;i++){const k=this.temp('db-shard',z);const a=Math.random()*Math.PI*2,d=60+Math.random()*60;this.play(k,[{opacity:1,translate:'0 0',scale:1},{opacity:0,translate:`${Math.cos(a)*d}% ${Math.sin(a)*d}%`,scale:.3}],{duration:420+Math.random()*200,easing:'ease-out'})}}
 // A duel starts: DUEL! slams down (no glow or portrait fade: user, 2026-11-25).
 duelStart(){this.stamp('DUEL!','duel')}
 // The duel is over: the winner's half flares, the loser's fades; your call is stamped on top.
 outcome(winner,pick){if(winner<2&&this.lvl())this.sides[winner].art.animate([{opacity:.32},{opacity:.7}],{duration:500,fill:'forwards'});
  if(pick==null)return;if(winner===pick){this.stamp('CORRECT!','good',50,42);this.shake(3)}else this.stamp('MISS','bad',50,42)}
 // The hit CPU's portrait shakes on any hit over 1000 damage, harder for bigger hits.
 hurt(p,hit){if(this.lvl()<2)return;const px=Math.min(14,4+hit/500),v=this.sides[p];
  v.art.animate([{translate:'0 0'},{translate:`${-px}px ${px*.3}px`},{translate:`${px}px ${-px*.3}px`},{translate:`${-px*.7}px 0`},{translate:`${px*.5}px ${px*.2}px`},{translate:`${-px*.25}px 0`},{translate:'0 0'}],{duration:420,easing:'ease-out',composite:'add'})}
 // That player's half turns redder as their LP falls (none at 8000+, strongest at 0); under 1000 it pulses.
 danger(p,lp){const v=this.sides[p],k=Math.max(0,Math.min(1,1-lp/8000));v.danger.style.opacity=this.game.state.settings.fx==='off'?0:(k**1.6*.85).toFixed(3);v.danger.classList.toggle('critical',lp>0&&lp<1000&&this.lvl()>0);v.who.classList.toggle('low',lp<2000);v.gauge.classList.toggle('low',lp<2000)}
 // The lit phase: Battle Phase covers its steps (8-128).
 phase(n){const key=n>=8&&n<256?8:n;for(const i of this.phases)i.classList.toggle('on',Number(i.dataset.ph)===key)}
 // Damage numbers: rise from the hit player's half of the field (top player = upper half) and fade.
 damage(p,amount){if(!amount||this.game.state.settings.fx==='off')return;if((this.dmgN||0)>=(this.game.crowded()?2:4))return;
  const el=document.createElement('b'),big=Math.abs(amount)>=2000;el.className='db-dmg'+(amount>0?' heal':'')+(big?' big':'');el.textContent=(amount>0?'+':'−')+Math.abs(amount);
  el.style.left=(p?72+Math.random()*12:16+Math.random()*12)+'%';el.style.top=(38+Math.random()*14)+'%';this.field.append(el);this.dmgN=(this.dmgN||0)+1;
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
 finish(){const g=this.game,s=g.state,r=this.replay.result(),pick=this.replay.pick,pay=g.withFeats(M.duelPayout(s,r,this.level,this.slot,pick),this.replay.tl,this.level),kind=r.reason;
  this.stake=0;this.phase='result';this.hold=RESULT_HOLD;
  if(pick===r.winner){s.stats.correct++;s.stats.slots[this.slot]=(s.stats.slots[this.slot]||0)+1}
  if([16,20,31,33].includes(kind))s.stats.exodia++;if(kind===21)s.stats.destiny++;M.recordDeckResult(s,this.replay.tl.seats,r.winner,kind);
  this.view?.ending(r.winner);this.view?.outcome(r.winner,pick);g.finisher(this.replay.tl,r);
  const winnerName=r.winner<2?this.replay.seats[r.winner].name:'Nobody';
  this.view?.show(`<div class="db-result ${pick===r.winner?'good':pick==null?'':'bad'}"><b>${esc(winnerName)} wins</b></div>`);
  g.payParts(pay,this.view?.root);g.dirty=true}
 refund(){if(this.phase==='play'&&this.stake){if(!this.game.state.settings.infinite)this.game.state.coins+=this.stake;this.stake=0}}
 destroy(){this.dead=true;this.game.supply.release(this.replay?.tl);this.game.supply.release(this.next);this.detach()}
}
// Exodia / Destiny Board / other jackpots: the whole screen flashes and shakes and the card bursts in.
DuelBets.prototype.jackpot=function(label,from){if(!this.el||this.state.settings.fx==='off'||!motion())return;const art=/EXODIA/.test(label)?33396948:/DESTINY/.test(label)?94212438:null,at=this.spot(from);if(!at)return;
 // Kept light on purpose: one image scaling in and out, no full-screen flash or shake.
 if(art){const img=document.createElement('img');img.className='db-splash';img.alt='';img.src=assetURL('assets/cards/'+art+'.jpg');img.style.left=at.x+'px';img.style.top=at.y+'px';img.style.width=Math.min(200,at.h*.55*.69,at.w*.4)+'px';this.el.fx.append(img);
  img.animate([{opacity:0,scale:.6},{opacity:1,scale:1,offset:.15},{opacity:1,scale:1,offset:.8},{opacity:0,scale:1.08}],{duration:1800,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>img.remove())}};
// Duel Feats for a recorded duel: added to its payout as one part.
DuelBets.prototype.withFeats=function(pay,tl,level){if(!tl||!M.ITEMS.some(i=>/^feat_/.test(i.id)&&M.itemLevel(this.state,i.id)))return pay;
 const seats=tl.seats.map(x=>this.seatOf(x)),metrics=M.duelMetrics(tl,this.cardInfo,tl.seats.map(x=>this.signatures(x.id)),seats.map(x=>x.label)),f=M.featPayout(this.state,metrics,tl.winner,level);
 if(f.total>0){pay.parts.push([`Duel feats ×${f.hits}`,f.total,true]);pay.total+=f.total}return pay};
DuelBets.prototype.payParts=function(pay,from){
 // Each part of a payout pops on its own: jackpots get the big treatment.
 pay.parts.forEach(([label,value,big],i)=>setTimeout(()=>{if(!this.el)return;const jackpot=/JACKPOT|Alternate|Deck-out/.test(label);this.gain(value,{from,size:jackpot?'jackpot':big?'medium':'small',label:big&&!jackpot?label:''});if(jackpot){this.jackpot(label,from);this.banner(label+'!',from||null)}},i*260));
};

// The bracket's standings: all 9 CPUs ranked by wins (damage dealt breaks ties). After each duel the rows glide
// to their new places (FLIP: measure, reorder, animate the difference) and the winner/loser rows flash.
class Standings{
 constructor(bracket,el,compact){Object.assign(this,{bracket,el,compact});this.build()}
 build(){const b=this.bracket,g=b.game;this.rows=b.roster.map((d,i)=>{const s=g.seatOf(d),r=document.createElement('div');r.className='db-st-row';r.dataset.i=i;
   r.innerHTML=`<span class="rk"></span><img alt="" src="${assetURL('assets/'+s.sprite)}"><span class="nm">${esc(s.name)}</span>${g.tierChip(s.label)}<b class="w"></b><b class="l"></b>${this.compact?'':'<small class="dm"></small>'}`;return r});
  this.el.innerHTML=`<div class="db-st-head"><span>#</span><span></span><span>CPU</span><span></span><b>W</b><b>L</b>${this.compact?'':'<small>DMG</small>'}</div>`;this.el.append(...this.rows);this.update(null,null,false)}
 update(win=null,lose=null,animate=true){const b=this.bracket,order=M.standings(b.wins,b.dmg),m=animate&&motion()&&b.game.state.settings.fx!=='off';
  const before=m?new Map(this.rows.map(r=>[r,r.offsetTop])):null;
  order.forEach((i,k)=>{const r=this.rows[i];r.querySelector('.rk').textContent=k+1;r.querySelector('.w').textContent=b.wins[i];r.querySelector('.l').textContent=b.losses[i];const dm=r.querySelector('.dm');if(dm)dm.textContent=M.fmt(b.dmg[i]);
   r.classList.toggle('mine',b.bet?.pick===i);r.classList.toggle('live',b.phase==='live'&&b.slots.some(d=>d&&!d.done&&d.pair.includes(i)));r.classList.toggle('top',k===0&&b.wins[i]>0);this.el.append(r)});
  if(!m)return;
  for(const r of this.rows){const dy=before.get(r)-r.offsetTop;if(dy)r.animate([{translate:`0 ${dy}px`},{translate:'0 0'}],{duration:1200,easing:'cubic-bezier(.45,0,.2,1)'})}
  if(win!=null)this.rows[win].animate([{backgroundColor:'#3ddc7a88'},{backgroundColor:'transparent'}],{duration:1500,easing:'ease-out'});
  if(lose!=null)this.rows[lose].animate([{backgroundColor:'#ff505070'},{backgroundColor:'transparent'}],{duration:1500,easing:'ease-out'})}
 crown(i){this.update();const r=this.rows[i];r.classList.add('champ');if(motion())r.animate([{scale:1},{scale:1.06},{scale:1}],{duration:700,iterations:2})}
}

// A bracket: a round-robin league of the same 9 random CPUs (every tier) — 36 pairings, everyone meets everyone once.
// Its 9 boards never wait for each other: as soon as a duel ends (and its result has shown), that board takes the
// next unplayed pairing, so a CPU may be in several duels at once. When all 36 are played, most wins is champion.
// It waits at the start for your champion bet (or Auto Champion Bet, or "Start without a bet").
const SLOT_HOLD=1200;
class Bracket{
 constructor(game,index,saved){Object.assign(this,{game,index});this.slots=Array(9).fill(null);this.views=null;
  const roster=saved?.roster?.map(k=>game.deck(k)).filter(Boolean),n=M.ROSTER_SIZE,arr=x=>Array.isArray(x)&&x.length===n?x.map(Number):Array(n).fill(0);
  if(roster?.length===n){this.roster=roster;this.wins=arr(saved.wins);this.losses=arr(saved.losses);this.dmg=arr(saved.dmg);this.results=saved.results&&typeof saved.results==='object'?{...saved.results}:{};this.bet=saved.bet??null;const started=!!saved.started||Object.keys(this.results).length>0;this.skipBet=started&&!this.bet;
   const valid=p=>Array.isArray(p)&&p.length===2&&p.every(i=>Number.isInteger(i)&&i>=0&&i<n)&&p[0]!==p[1];
   this.queue=Array.isArray(saved.queue)?saved.queue.filter(valid):this.allPairs().filter(p=>this.results[Math.min(...p)+'-'+Math.max(...p)]==null);
   if(!this.queue.length){this.fresh();return}
   this.phase='bet';this.left=started||this.bet?0:BET_WINDOW}
  else this.fresh()}
 allPairs(){const out=[];for(let r=0;r<M.BRACKET_ROUNDS;r++)out.push(...M.roundPairs(r,Math.random));return out}
 fresh(){this.roster=M.pickRoster(this.game.pool,Math.random);const n=M.ROSTER_SIZE;this.wins=Array(n).fill(0);this.losses=Array(n).fill(0);this.dmg=Array(n).fill(0);this.results={};
  this.bet=null;this.skipBet=false;this.queue=this.allPairs();this.phase='bet';this.left=BET_WINDOW;this.champion=null;
  for(let i=0;i<9;i++)this.slots[i]=null;this.table?.build();this.buildTile();this.paintAll()}
 // Duels still playing go back to the front of the queue: they replay from the start next time.
 saved(){const live=this.slots.filter(d=>d&&!d.done).map(d=>d.pair);return {roster:this.roster.map(d=>d.key),wins:[...this.wins],losses:[...this.losses],dmg:[...this.dmg],results:{...this.results},bet:this.bet,queue:[...live,...this.queue],started:this.phase==='live'}}
 level(slot){return M.slotLevel(slot,this.index)}
 played(){return Object.keys(this.results).length}
 total(){return M.ROSTER_SIZE*(M.ROSTER_SIZE-1)/2}
 progress(d){return !d?0:d.done?1:d.replay?Math.min(1,d.replay.t/d.replay.sched.total):d.model?Math.min(1,d.model.t/d.model.dur):0}
 // ---- running ----
 tick(gdt,dt){
  if(this.phase==='bet'){
   if(!this.bet&&!this.skipBet){if(M.isOn(this.game.state,'autochamp')&&this.autoChampion())return;if((this.tileAt=(this.tileAt||0)+dt)>480){this.tileAt=0;this.paintAll()}return}
   this.left-=dt;if(this.left<=0){this.phase='live';this.paintAll()}return}
  if(this.phase==='final'){this.left-=dt;if(this.left<=0)this.fresh();else if((this.tileAt=(this.tileAt||0)+dt)>480){this.tileAt=0;this.paintTile();this.paintHead()}return}
  let busy=false;
  for(let i=0;i<9;i++){let d=this.slots[i];
   if(!d||d.done&&(d.hold-=dt)<=0){if(d)this.game.supply.release(d.replay?.tl);d=this.slots[i]=this.queue.length?this.startSlot(i):null}
   if(!d)continue;busy=true;if(d.done)continue;
   if(d.replay){d.replay.tick(gdt,d.view||null,d.view?null:this.cellFor(d));if(d.replay.done)this.settle(d,d.replay.result(),d.replay)}
   else if(d.model){d.model.t+=gdt;if(d.model.t>=d.model.dur)this.settleModel(d)}}
  if(!busy&&!this.queue.length){this.finish();return}
  if((this.tileAt=(this.tileAt||0)+dt)>480){this.tileAt=0;if(this.game.openBracket===this){this.paintHead();for(const d of this.slots)if(d&&!d.done)this.paintChips(d)}else this.paintTile()}
 }
 startSlot(i){const pair=this.queue.shift(),d={pair,slot:i+1,pick:null,stake:0,replay:null,model:null,done:false,winner:null,hold:SLOT_HOLD,view:this.views?.[i]||null};
  if(this.game.openBracket===this)this.request(d);else this.modelFor(d);
  this.paintDuel(d);this.table?.update(null,null,false);return d}
 // Nobody is watching: settle it from the decks' records, over the length of a real recorded duel.
 async modelFor(d){const sample=await this.game.supply.sample();if(d.done||d.replay||this.dead)return;const [a,b]=d.pair.map(i=>this.roster[i]),stats=this.game.supply.stats,winner=M.modelWinner(a,b,stats,Math.random);
  d.model={t:0,dur:sample?M.schedule(sample).total:30000,winner,reason:M.modelWinKind(winner?b:a,stats,Math.random),sample}}
 request(d){if(d.replay||d.asked||d.done)return;d.asked=true;this.game.supply.record(d.pair.map(i=>this.roster[i]),true,()=>!d.done&&!this.dead&&this.slots.includes(d)).then(tl=>{d.asked=false;if(d.done||this.dead||!this.slots.includes(d))return;
   const start=d.model?Math.min(.95,d.model.t/d.model.dur):0;d.replay=new Replay(this.game,tl,{level:this.level(d.slot),slot:d.slot,pick:d.pick,start:start*M.schedule(tl).total});d.model=null;this.paintDuel(d)}).catch(()=>{d.asked=false;if(!d.done&&!d.model)this.modelFor(d)})}
 // Single-duel bets: open for the first quarter of each duel (the board's header shows the two buttons).
 bettable(d){return !!d&&this.phase==='live'&&!d.done&&d.pick==null&&(d.replay||d.model)&&this.progress(d)<.25}
 openBets(){return this.slots.filter(d=>this.bettable(d)&&M.canAfford(this.game.state,M.boardStake(this.level(d.slot))))}
 betDuel(i,seat){const d=this.slots[i];if(!this.bettable(d))return;const stake=M.boardStake(this.level(d.slot));if(!M.spend(this.game.state,stake))return;d.pick=seat;d.stake=stake;if(d.replay)d.replay.pick=seat;this.game.state.stats.bets++;this.game.dirty=true;this.game.paintTotal();this.game.refreshShop();this.paintDuel(d)}
 // Auto Champion Bet: random, or the highest-tier CPU with Scouting Report (ties at random).
 autoChampion(){const s=this.game.state;if(!M.canAfford(s,M.championStake(s,this.index)))return false;let pick=Math.floor(Math.random()*this.roster.length);
  if(M.isOn(s,'scout')){const best=Math.max(...this.roster.map(d=>M.tierRank(d.label))),top=this.roster.map((d,i)=>i).filter(i=>M.tierRank(this.roster[i].label)===best);pick=top[Math.floor(Math.random()*top.length)]}
  return this.betChampion(pick)}
 betChampion(i){if(this.phase!=='bet'||this.bet)return false;const stake=M.championStake(this.game.state,this.index);if(!M.spend(this.game.state,stake))return false;this.bet={pick:i,stake};this.left=Math.min(this.left,1500);this.game.dirty=true;this.game.paintTotal();this.game.refreshShop();this.table?.update();this.paintAll();return true}
 settleModel(d){const m=d.model,sample=m.sample,s=this.game.state,level=this.level(d.slot);
  // Fees from a comparable recorded duel stand in for this one's events.
  let fees=0;if(sample)for(const f of sample.frames)fees+=M.eventIncome(s,f[0],level);
  const r={winnerId:this.roster[d.pair[m.winner]]?.id,winner:m.winner,reason:m.reason,turns:sample?.turns||10,winnerLp:sample&&sample.winner<2?M.finalLp(sample,sample.winner):4000,winnerTier:this.roster[d.pair[m.winner]].label};
  if(fees>0)this.game.gain(fees,{from:this.cellFor(d),size:'small'});const dmg=[0,0];if(r.winner<2){dmg[r.winner]=8000;dmg[1-r.winner]=8000-r.winnerLp}this.settle(d,r,null,dmg)}
 settle(d,r,replay,damage){d.done=true;d.winner=r.winner;const s=this.game.state;
  if(r.winner<2){this.wins[d.pair[r.winner]]++;this.losses[d.pair[1-r.winner]]++}
  this.results[Math.min(...d.pair)+'-'+Math.max(...d.pair)]=r.winner<2?d.pair[r.winner]:-1;
  const dmg=replay?M.damageDealt(replay.tl):damage;if(dmg){this.dmg[d.pair[0]]+=dmg[0]||0;this.dmg[d.pair[1]]+=dmg[1]||0}
  this.table?.update(r.winner<2?d.pair[r.winner]:null,r.winner<2?d.pair[1-r.winner]:null);if(!this.game.openBracket)this.paintTile();
  if(d.pick===r.winner&&d.pick!=null){s.stats.correct++}
  if([16,20,31,33].includes(r.reason))s.stats.exodia++;if(r.reason===21)s.stats.destiny++;M.recordDeckResult(s,d.pair.map(i=>this.roster[i]),r.winner,r.reason);
  const pay=this.game.withFeats(M.duelPayout(s,r,this.level(d.slot),d.slot,d.pick),replay?.tl||d.model?.sample||null,this.level(d.slot));d.stake=0;
  this.game.payParts(pay,d.view?.root||this.cellFor(d));d.view?.ending(r.winner);d.view?.outcome(r.winner,d.pick);if(d.view&&replay)this.game.finisher(replay.tl,r);
  if(d.view){const name=r.winner<2?this.game.seatOf(this.roster[d.pair[r.winner]]).name:'Nobody';d.view.setStakes('');d.view.show(`<div class="db-result ${d.pick==null?'':d.pick===r.winner?'good':'bad'}"><b>${esc(name)} wins</b></div>`)}
  this.game.dirty=true}
 finish(){const order=M.standings(this.wins,this.dmg),champ=order[0],s=this.game.state;
  if(this.bet){if(this.bet.pick===champ){s.stats.champions++;const v=M.championPayout(s,this.index);setTimeout(()=>{if(!this.game.el)return;this.game.gain(v,{from:this.game.openBracket===this?this.game.el.stage:this.tile,size:'big',label:'CHAMPION'})},300)}this.bet=null}
  this.game.banner(this.game.seatOf(this.roster[champ]).name+' wins the '+M.bracketName(this.index)+'!');
  this.champion=champ;this.phase='final';this.left=FINAL_HOLD;this.table?.crown(champ);this.paintAll();this.game.save()}
 // ---- drawing ----
 tileStatus(){return this.phase==='bet'?(this.bet||this.skipBet?'Starting…':'Waiting for your champion bet'):this.phase==='final'?`Winner: ${this.game.seatOf(this.roster[this.champion]).name}`:`${this.played()} / ${this.total()} duels`}
 betHTML(){const g=this.game;return this.bet?`Your pick: ${esc(g.seatOf(this.roster[this.bet.pick]).name)}`:''}
 // While the bracket waits for its champion bet, a big prompt sits in its middle (the tile and the open view).
 promptHTML(){if(this.phase!=='bet'||this.bet||this.skipBet)return '';const s=this.game.state,stake=M.championStake(s,this.index),ok=M.canAfford(s,stake);
  return `<span class="db-champ-prompt"><span class="db-champ-btn" data-db="champion" data-b="${this.index}"><small>Bet on the champion</small><b>${M.fmt(stake)}</b><em>pays ${M.fmt(M.championPayout(s,this.index))}</em></span>${ok?'':`<span class="db-champ-skip" data-db="skip-champion" data-b="${this.index}">Start without a bet</span>`}</span>`}
 paintPrompt(host){if(!host)return;const html=this.promptHTML();let el=host.querySelector(':scope>.db-champ-host');if(!el){el=document.createElement('span');el.className='db-champ-host';host.append(el)}if(el.dataset.html!==html){el.dataset.html=html;el.innerHTML=html}}
 // The tile is a round-robin crosstable: the 9 CPUs down the side and across the top (18 portraits); each cell is
 // one matchup — W/L for the row CPU once played, both portraits side by side while that duel is live.
 buildTile(){if(!this.tile)return;const n=M.ROSTER_SIZE,g=this.game,face=i=>`<img alt="" src="${assetURL('assets/'+g.seatOf(this.roster[i]).sprite)}">`;let cells='<i class="corner"></i>';
  for(let j=0;j<n;j++)cells+=`<i class="hd col" data-c="${j}">${face(j)}</i>`;
  for(let i=0;i<n;i++){cells+=`<i class="hd row" data-r="${i}">${face(i)}</i>`;for(let j=0;j<n;j++)cells+=i===j?'<i class="x"></i>':`<i class="c" data-a="${i}" data-b="${j}"><s></s></i>`}
  this.tile.innerHTML=`<span class="db-bk-top"><span class="db-bk-title">${esc(M.bracketName(this.index))}</span><span class="db-bk-status"></span></span><span class="db-bk-bar"><i></i></span><span class="db-bk-cross"><span class="db-xt">${cells}</span></span><span class="db-bk-bet"></span>`;
  this.cells=new Map([...this.tile.querySelectorAll('.db-xt .c')].map(c=>[c.dataset.a+'-'+c.dataset.b,c]));this.heads=[...this.tile.querySelectorAll('.db-xt .hd')];this.paintTile()}
 // The crosstable cell of a duel (row = first seat), or the tile while the cells aren't built.
 cellFor(d){return this.cells?.get(d.pair[0]+'-'+d.pair[1])||this.tile||null}
 paintFields(){if(!this.cells)return;const live=new Map();
  for(const d of this.slots)if(d&&!d.done)live.set(Math.min(...d.pair)+'-'+Math.max(...d.pair),d);
  for(const [key,c] of this.cells){const a=+c.dataset.a,b=+c.dataset.b,pk=Math.min(a,b)+'-'+Math.max(a,b),res=this.results[pk],d=live.get(pk);
   const cls=d?'c live':res==null?'c':res===a?'c win':res===b?'c loss':'c draw';if(d)c.style.setProperty('--hue',SLOT_HUES[d.slot-1]);if(c.className!==cls){c.className=cls;
    c.style.backgroundImage=d?`url("${assetURL('assets/'+this.game.seatOf(this.roster[a]).sprite)}"),url("${assetURL('assets/'+this.game.seatOf(this.roster[b]).sprite)}")`:''}
   if(d)c.firstChild.style.transform=`scaleX(${this.progress(d)})`}
  const mine=this.bet?.pick;for(const h of this.heads){const i=+(h.dataset.r??h.dataset.c);h.classList.toggle('mine',mine===i)}}
 paintTile(){const t=this.tile;if(!t?.isConnected)return;t.querySelector('.db-bk-status').textContent=this.tileStatus();t.querySelector('.db-bk-bar i').style.width=Math.round(this.played()/this.total()*100)+'%';
  const bet=this.betHTML();const el=t.querySelector('.db-bk-bet');if(el.dataset.html!==bet){el.dataset.html=bet;el.innerHTML=bet}this.paintPrompt(t);this.paintFields()}
 show(stage){this.hideViews();stage.innerHTML=`<div class="db-bk-head"><button data-db="close-bracket">‹ Brackets</button><button class="db-burger" data-db="toggle-standings" aria-label="Standings" aria-expanded="${!!this.game.sideOpen}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button><span class="db-bk-info"></span></div><div class="db-bk-open ${this.game.sideOpen?'side-open':''}"><aside class="db-bk-side"><div class="db-bk-table"></div></aside><div class="db-grid n9"></div></div>`;
  const grid=stage.querySelector('.db-grid');this.head=stage.querySelector('.db-bk-info');this.table=new Standings(this,stage.querySelector('.db-bk-table'),false);
  this.views=Array.from({length:9},(_,i)=>new BoardView(this.game,grid,{title:`Board ${i+1}`,stakes:'',slot:i+1}));
  this.slots.forEach((d,i)=>{if(d){d.view=this.views[i];if(!d.done)this.request(d)}});this.paintAll()}
 hideViews(){for(const v of this.views||[])v.remove();this.views=null;for(const d of this.slots)if(d)d.view=null}
 hide(){this.hideViews();this.head=null;this.table=null}
 paintAll(){if(this.game.openBracket!==this){this.paintTile();return}this.views?.forEach((v,i)=>this.paintDuel(this.slots[i],v));this.paintHead()}
 paintHead(){if(!this.head)return;const html=`<b>${esc(M.bracketName(this.index))}</b> · ${esc(this.tileStatus())}${this.bet?` · Your pick: ${esc(this.game.seatOf(this.roster[this.bet.pick]).name)}`:''}`;if(this.head.dataset.html!==html){this.head.dataset.html=html;this.head.innerHTML=html}this.paintPrompt(this.head.closest('.db-stage')?.querySelector('.db-bk-open'))}
 // The board header: two bet buttons while betting is open, your pick after, the stakes otherwise.
 paintChips(d){const v=d?.view;if(!v)return;const level=this.level(d.slot),g=this.game,names=d.pair.map(i=>g.seatOf(this.roster[i]).name);
  const html=this.bettable(d)?`<button class="db-chip-bet" data-db="bracket-pick" data-b="${this.index}" data-duel="${d.slot-1}" data-seat="0" ${M.canAfford(g.state,M.boardStake(level))?'':'disabled'}>${esc(names[0])}</button><button class="db-chip-bet" data-db="bracket-pick" data-b="${this.index}" data-duel="${d.slot-1}" data-seat="1" ${M.canAfford(g.state,M.boardStake(level))?'':'disabled'}>${esc(names[1])}</button>`
   :d.pick!=null?`Backing ${esc(names[d.pick])} · win ${M.fmt(M.correctPayout(g.state,d.slot,level))}`:esc(`Bet ${M.fmt(M.boardStake(level))} · win ${M.fmt(M.correctPayout(g.state,d.slot,level))}`);
  v.setStakesHTML(html)}
 paintDuel(d,v=d?.view){if(!v)return;
  if(!d){v.clear();v.setStakesHTML('');v.show(this.phase==='bet'?'':`<div class="db-wait">${this.phase==='final'?'Bracket over':'Waiting…'}</div>`);return}
  if(d.done)return;const seats=d.pair.map(i=>this.game.seatOf(this.roster[i]));this.paintChips(d);
  if(d.replay){v.show('');v.seats(d.replay.seats,d.pick);const b=d.replay.lastBoard(d.replay.i-1);if(b)v.frame(b,[],d.replay);return}
  v.clear();v.seats(seats,d.pick);v.show('<div class="db-wait"><span class="db-spinner"></span>Catching up…</div>')}
 refund(){const s=this.game.state;for(const d of this.slots)if(d&&d.stake&&!d.done){if(!s.settings.infinite)s.coins+=d.stake;d.stake=0;d.pick=null}}
 destroy(){this.dead=true;this.hideViews()}
}
