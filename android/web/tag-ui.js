import {rewardIcon} from './reward-icons.js';
import {relicEyeIcon} from './relic-eye-icon.js';
import {frameLevelName,deckCardMarkup,deckStats,attributeOrder} from './feedback-ui.js';
import {revealPrice} from './jar-relics.js';

import {deckMinimum,fixedDeck} from './deck-minimum.js';

import {playUISound,playRerollSound} from './ui-sounds.js';
import {bossNameVoice} from './juice.js';

import {roomCodeControl} from './room-code.js';

import {characterEntrance,captureCharacterEntrance,cancelCharacterEntrance} from './character-entrance.js';

import {deckReadyFeedback} from './selection-feedback.js';

import {purchaseCoins} from './counter-audio.js';

import {polishShop} from './presentation-polish.js';
import {coinLabel} from './coin-label.js';

import {rememberedLevel,alternateUnlocked} from './difficulty-preference.js';

import {encounterPortrait,hasSpyglass,bossBanner,bossRerollPrice,playEncounterReveal,playPortraitReveal,revealCost,revealCostLabel,swordsIcon} from './encounter-reveal.js';


import {shopRerollPrice} from './experience-ui.js';

import {isShopUltra,announceShopUltra} from './shop-ultra.js';

import {curseIcons,curseDescription,cursedMarkup} from './experience-ui.js';

import {searches,matchesSearch,openSearch,clearSearch,DECK_STATUS_OPTIONS,deselectIcon,deckSearchButtons,splitDeckMarkup,saveDeckScroll,restoreDeckScroll,deckSplitColumns,splitStyle} from './card-search.js';

import {relicImage,relicArtwork} from './ui-art.js';

import {TagSession} from './tag-session.js';
import * as juice from './juice.js';
import * as keeperTalk from './shopkeeper-talk.js';
import {ownedBadge} from './shop-badges.js';
import {mountRunProgress} from './run-progress.js';
import {mountRunCard,copyRunCard,saveRunCard,runCardName} from './run-card.js';
import {assetURL} from './startup-assets.js';

// Every deck scroller in the Tag deck tab: one grid, or both panes of the wide split (card-search.js).
const tagDeckArea=root=>root?.querySelector('.tag-deck-scroll');
// The trade grid scrolls in .tag-deck-scroll itself, which the deck scrollers skip, so a tap sent it to the top
// (Mugen101, Discord 2026-11-08). Every redraw keeps its place; a filter change starts at the top.
const tradeScroller=root=>root?.querySelector('.tag-trade .tag-deck-scroll');

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const friendlyError=error=>{const text=error?.message||String(error),matches=[...text.matchAll(/(?:ValueError|RuntimeError|Error):\s*([^\n]+)/g)];return matches.length?matches.at(-1)[1].trim():text};

const button=(text,action,extra='')=>`<button data-tag="${action}" ${extra}>${text}</button>`;
const exitIcon='<svg class="navigation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const ROOM_KEY='tag-active-room',ROOM_MEMORY=86400000;
const savedRoom=()=>{try{return JSON.parse(localStorage.getItem(ROOM_KEY)||'null')}catch{return null}};
const rememberRoom=room=>{try{localStorage.setItem(ROOM_KEY,JSON.stringify({...room,at:Date.now()}))}catch{}};
const forgetRoom=()=>{try{localStorage.removeItem(ROOM_KEY)}catch{}};
export class TagUI {

 // Card records by id: deck and trade views look cards up inside filters and sorts.
 cardById(id){if(this.cardIndex?.source!==this.content.cards)this.cardIndex={source:this.content.cards,byId:new Map(this.content.cards.map(c=>[c.id,c]))};return this.cardIndex.byId.get(id)}

 constructor({sound=()=>{},tickSound=()=>{},stopTick=()=>{},root,content,profile,backend,image,inspect,inspectPack,dialog,showRewards,showScorecard,openPacks,onGoldenCards=()=>{},onDuel,onExit,onBack=async()=>{},onView=()=>{},onStatus=()=>{}}){

  Object.assign(this,{sound,tickSound,stopTick,root,content,profile,backend,image,inspect,inspectPack,dialog,showRewards,showScorecard,openPacks,onGoldenCards,onDuel,onExit,onBack,onView,onStatus});this.desktop=!!new URLSearchParams(location.search).get('desktop');this.screen='select';this.joinCode='';this.character=profile.unlocked[0]??0;this.level=rememberedLevel(profile,this.character);this.tab='deck';this.deckFilter='All';this.deckSort='Newest';this.deckStatus='First';this.packQueue=Promise.resolve();this.selection=new Set();this.status='';this.working=false;this.alive=true;

  this.click=e=>{const el=e.target.closest('[data-tag]');if(!el||!this.alive)return;e.stopImmediatePropagation();if(this.dragged)return;if(el.dataset.tag==='character')this.sound('flip',.25);else if(el.dataset.tag==='start')this.sound('activate',.4);this.action(el.dataset.tag,el).catch(error=>this.error(error))};

  document.addEventListener('click',this.click,true);

  this.cancelTradeHold=()=>clearTimeout(this.tradeHold);this.down=e=>{this.cancelTradeHold();this.origin=[e.clientX,e.clientY];this.dragged=false;const el=e.target.closest('[data-tag="trade-card"], [data-tag="card"]');if(el&&!el.disabled&&e.button===0)this.tradeHold=setTimeout(()=>{this.dragged=true;this.inspect(Number(el.dataset.id),el.dataset.tag==='card'?Number(el.dataset.index):null)},500)};this.move=e=>{if(this.origin&&Math.hypot(e.clientX-this.origin[0],e.clientY-this.origin[1])>10){this.dragged=true;this.cancelTradeHold()}};

  root.addEventListener('pointerup',this.cancelTradeHold);root.addEventListener('pointercancel',this.cancelTradeHold);root.addEventListener('scroll',this.cancelTradeHold,true);

  this.viewport=()=>root.style.setProperty('--tag-visible-height',(window.visualViewport?.height||innerHeight)+'px');this.viewport();window.visualViewport?.addEventListener('resize',this.viewport);

  this.context=e=>{const el=e.target.closest('[data-tag="trade-card"], [data-tag="card"], [data-tag="pack"]');if(!el||!this.alive)return;e.preventDefault();if(e.button!==2||e.pointerType==='touch'||el.disabled)return;this.cancelTradeHold();if(el.dataset.tag==='pack')this.action('pack',el).catch(error=>this.error(error));else this.inspect(Number(el.dataset.id),el.dataset.tag==='card'?Number(el.dataset.index):null)};root.addEventListener('contextmenu',this.context);

  root.addEventListener('pointerdown',this.down);root.addEventListener('pointermove',this.move);this.render();

 }

 netStatus(){const stats=this.session?.stats();return stats?{online:stats.route!=='connecting',partnerOnline:stats.linked,rtt:stats.rtt,route:stats.route,partner:this.view?.duel?.mode==='pvp'?'Opponent':'Teammate'}:null}
 error(error){this.status=friendlyError(error);this.onStatus('error',this.status);if(this.view?.phase!=='duel')this.render()}

 header(body,tools='',classes=''){return `<div class="page tag-page ${classes}"><header><h2>Tag duels${this.session?.code?' · '+this.session.code:''}</h2><div class="tools">${tools} ${button(exitIcon,'exit','class="navigation-icon-button" aria-label="Exit" title="Exit"')}</div></header>${this.status?`<div class="tag-status" role="status">${esc(this.status)}</div>`:''}${body}${this.session&&(this.session.seat??this.session.peer.seat)===0&&(!this.view||this.view.phase==='lobby')?`<footer class="settings-footer">${button('Back','back')}</footer>`:''}</div>`}

 // Wide screens: the deck tab splits into Deck and Collection panes, like solo (mobile.js checkDraftSplit).
 checkDeckSplit(){
  if(!this.deckSplitResize&&typeof window!=='undefined'&&window.addEventListener){this.deckSplitResize=true;let timer=0;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>this.checkDeckSplit(),200)},{passive:true})}
  const host=tagDeckArea(this.root),area=host?.querySelector('.draft-card-scroll');if(!area)return;
  const total=deckSplitColumns(host,area);
  if(total!==(this.deckSplit||0)){this.deckSplit=total;this.render()}
 }
 resetDeckFilters(){this.deckFilter='All';this.deckSort='Newest';this.deckStatus='First';clearSearch('tag-deck')}
 render(){

  this.updateRoomBadge();

  const scroll=saveDeckScroll(tagDeckArea(this.root)),trade=tradeScroller(this.root)?.scrollTop;

  this.renderContent();

  restoreDeckScroll(tagDeckArea(this.root),scroll);const tradeArea=tradeScroller(this.root);if(tradeArea&&trade)tradeArea.scrollTop=trade;this.checkDeckSplit();

 }

 cursed(){

  const v=this.view,offer=v.run.cursed_offer,disabled=this.working||v.seat!==0||v.paused?'disabled':'';

  this.root.innerHTML=`<section class="cursed-reward"><header><small>BOSS DEFEATED</small><h1>Choose a cursed relic</h1><p>${v.seat===0?'Choose 1 relic for your shared pool.':'Your teammate is choosing your shared relic.'}</p></header><div class="cursed-options">${offer.options.map(key=>{const [name,,text]=this.content.artifacts[key];return `<article><h2>${esc(name)}</h2>${relicArtwork(relicImage(this.content.artifactInfo[key].art))}${cursedMarkup(key,text,this.content.artifactInfo[key]?.parts)}${button('Choose relic','cursed-choose',`data-relic="${key}" ${disabled}`)}</article>`}).join('')}</div><footer>${button('Reroll · Rerolls: '+offer.rerolls_left,'cursed-reroll',disabled||!offer.rerolls_left?'disabled':'')}</footer></section>`;

 }

 async acknowledgeTrade(){

  const t=this.view?.trade;if(this.tradeAckPending||t?.status!=='received'||t.ack[this.view.seat])return;

  this.tradeAckPending=true;

  try{await this.session.request('trade-ack',{id:t.id});document.querySelector('#modal')?.close();}

  finally{this.tradeAckPending=false;this.render();}

 }

 updateRoomBadge(){

  const code=this.session?.code;if(!code){this.roomBadge?.remove();this.roomBadge=null;return;}

  if(!this.roomBadge){this.roomBadge=document.createElement('div');this.roomBadge.className='tag-room-code';document.body.append(this.roomBadge);}

  this.roomBadge.textContent='ROOM '+code;this.roomBadge.setAttribute('aria-label','Room code '+code);

 }

 renderFinale(){

  const v=this.view,f=v.finale,disabled=this.working||v.paused||!this.session.connected;

  const modes=[['none','No relics','Both players duel without relics.'],['draft','Draft relics','Player A picks first, then alternate until every shared relic is taken.'],['all','All relics','Both players receive every relic the team owned.']];

  let body;

  if(f.status==='resolving'){const labels=f.mode_votes.map(k=>modes.find(m=>m[0]===k)[1]),winner=modes.find(m=>m[0]===f.mode)[1];body=`<h1>Choosing duel rules</h1><div class="finale-mode-roll"><span>${esc(labels[0])}</span><span>${esc(labels[1])}</span><strong>${esc(winner)}</strong></div><p>Random pick between your two choices · 8,000 LP each</p>`;if(v.seat===0&&!disabled&&!this.finaleRollTimer)this.finaleRollTimer=setTimeout(async()=>{try{if(this.alive&&this.view?.finale?.status==='resolving')await this.session.request('finale-resolve')}catch(e){this.error(e)}finally{this.finaleRollTimer=null}},1700);}

  else if(f.status==='choosing')body=`<h1>Final duel rules</h1><p>8,000 LP each. Pick a mode. Different choices are settled by a random draw.</p><div class="finale-modes">${modes.map(([key,label,text])=>button(`<b>${label}</b><span>${text}</span><small>${f.mode_votes?.[v.seat]===key?'Your choice ✓ ':''}${f.mode_votes?.[1-v.seat]===key?'Opponent’s choice ✓':''}</small>`,'finale-mode',`data-mode="${key}" ${disabled?'disabled':''}`)).join('')}</div>`;

  else{const relic=key=>{const a=this.content.artifacts[key];return `${relicArtwork(relicImage(this.content.artifactInfo[key].art))}<b>${esc(a[0])}</b><span>${esc(a[2])}</span>`};body=`<h1>Draft your relics</h1><p>8,000 LP each · ${f.turn===v.seat?'Your pick':"Opponent’s pick"} · ${f.remaining.length} remaining</p><div class="finale-relics">${f.remaining.map(i=>button(relic(f.pool[i]),'finale-pick',`data-index="${i}" ${disabled||f.turn!==v.seat?'disabled':''}`)).join('')}</div><p>Your picks: ${f.picks[v.seat].map(k=>esc(this.content.artifacts[k][0])).join(', ')||'None yet'}</p><p>Opponent’s picks: ${f.picks[1-v.seat].map(k=>esc(this.content.artifacts[k][0])).join(', ')||'None yet'}</p>`;}

  this.root.innerHTML=this.header(`<section class="tag-ending finale-setup">${body}</section>`);

 }

 renderContent(skipTrade=false){

  if(!this.view||this.view.phase==='lobby'){this.renderLobby();return}

  const v=this.view,r=v.run,c=this.content.characters[r.character],waiting=v.paused||!this.session.connected;

  if(v.phase==='duel')return;

  if(!skipTrade&&v.trade&&v.trade.status!=='idle'){this.renderTrade();return;}

  if(['complete','gameover'].includes(v.phase)){

   const finale=v.finale||{},available=v.phase==='complete'&&finale.status==='available',voted=finale.votes?.[v.seat];

   if(['choosing','resolving','drafting'].includes(finale.status)){this.renderFinale();return;}

   const result=finale.status==='finished'?`<h2>${finale.winner===null?'Final duel: Draw':finale.winner===v.seat?'You won the final duel':'Your opponent won the final duel'}</h2><p>Your shared campaign victory is saved.</p>`:'';

   this.root.innerHTML=this.header(`<section class="tag-ending"><h1>${v.phase==='complete'?'Run complete':'Run ended'}</h1><div class="tag-run-card-slot"></div>${result}${available?`<div class="tag-finale-offer"><h2>One last duel?</h2><p>Face each other in an optional 1v1 with your final decks and 8,000 LP each. Both players must agree, then choose how relics work.</p><p>${voted?'You are ready. Waiting for your opponent…':finale.votes?.[1-v.seat]?'Your opponent wants to duel!':'Win or lose, your campaign is complete.'}</p><div>${button(voted?'Cancel readiness':'Play final 1v1','finale-vote',`class="primary" ${this.working||waiting?'disabled':''}`)}${button('Skip — finish run','finale-skip',this.working||waiting?'disabled':'')}</div></div>`:''}${button('Exit','exit')}</section>`);this.endCard(r);return

  }

  // The deck editor opens over the shop too, and its arrow leads back there (user, 2026-11-08).
  const inShop=v.phase==='shop';

  if(inShop){if(r.cursed_offer){this.cursed();return}if(this.tab!=='deck'||fixedDeck(r,c)){this.shop();return}}

  if(c.copycat)this.tab='opponents';

  const locked=v.ready[v.seat],fixed=fixedDeck(r,c);

  const mainCount=r.selected.filter(i=>!(this.cardById(r.pool[i])?.data.type&64)).length,validSize=fixed||mainCount>=(deckMinimum(r,this.content.characters[r.character]))&&mainCount<=60;

  const lockedCount=v.ready.filter(Boolean).length;

  // Both players see one opponent list. The swords lock a player in at once; the teammate's pick is marked and closed.
  const partner=this.content.characters[v.characters?.[1-v.seat]],partnerName=esc(partner?.name||'Your teammate'),mine=locked?v.opponents[v.seat]:null,theirs=v.ready[1-v.seat]?v.opponents[1-v.seat]:null,boss=(r.round+1)%3===0,minimum=deckMinimum(r,this.content.characters[r.character]);

  const ready=this.tab==='deck'?`<button class="tag-choose-opponent deck-count-arrow" data-tag="opponents" ${!validSize&&!inShop?'disabled':''} aria-label="${mainCount}/${minimum}+ main deck cards — ${inShop?'Back to shop':'Next duel'}"><span><span class="tag-next-label"><strong>${mainCount}/${minimum}+</strong></span></span></button>`:`<footer class="tag-lock-in">${c.copycat?'':button('Edit deck','deck','class="tag-edit-deck"')}<span role="status" aria-live="polite">${lockedCount}/2 players locked in</span>${mine!==null?button('Unlock','unready',`class="primary" ${waiting||this.working?'disabled':''}`):''}<small>${waiting?'Waiting for connection to your teammate.':!validSize&&mine===null?`${mainCount} main cards; you need ${minimum}–60. Edit your deck first.`:mine!==null?(theirs!==null?'Both players are locked in.':`Locked in · waiting for ${partnerName}. Editing your deck unlocks your pick.`):`Press ${swordsIcon('inline-swords')} on ${boss?'a boss':'an opponent'} to lock in your deck and pick.`}</small></footer>`;

  const tools=`<span>${esc(c.name)} · ${r.lp.toLocaleString()} LP</span>`;

  const lookup=id=>this.cardById(id),main=mainCount;

  let order=r.pool.map((_,i)=>i).filter(i=>matchesSearch(lookup(r.pool[i]),'tag-deck'));

  const inDeck=new Set(r.selected);if(!this.deckSplit&&(this.deckStatus==='In'||this.deckStatus==='Out'))order=order.filter(i=>inDeck.has(i)===(this.deckStatus==='In'));

  else if(this.deckFilter!=='All')order=order.filter(i=>lookup(r.pool[i])?.data.type&({Monster:1,Spell:2,Trap:4,Extra:64}[this.deckFilter]||0));

  const name=i=>lookup(r.pool[i])?.name||'';

  if(this.deckSort==='Default')order.sort((a,b)=>frameLevelName(lookup(r.pool[a]),lookup(r.pool[b]))||a-b);else if(this.deckSort==='Name')order.sort((a,b)=>name(a).localeCompare(name(b)));

  else if(this.deckSort==='Attribute')attributeOrder(order,r.pool,lookup,r);
  else if(this.deckSort==='ATK'){const attacks=new Map(order.map(i=>[i,lookup(r.pool[i]).data.type&1?deckStats(lookup(r.pool[i]),r,i,this.content.artifactInfo)[0]:0]));order.sort((a,b)=>attacks.get(b)-attacks.get(a)||name(a).localeCompare(name(b))||a-b)}
  else if(['DEF','Level'].includes(this.deckSort)){const key={ATK:'atk',DEF:'defense',Level:'level'}[this.deckSort];order.sort((a,b)=>(lookup(r.pool[b])?.[key]||0)-(lookup(r.pool[a])?.[key]||0))}

  else if(this.deckSort==='Newest')order.reverse();
  // Deck first keeps the chosen sort inside each group.
  if(this.deckStatus==='First')order=[...order.filter(i=>inDeck.has(i)),...order.filter(i=>!inDeck.has(i))];
  // A tap keeps every card in place; the order refreshes when type, sort, status, search or the pool changes.
  const orderKey=JSON.stringify([this.deckFilter,this.deckSort,this.deckStatus,searches['tag-deck']||null,r.pool.length,!!this.deckSplit]);
  if(this.deckOrder&&this.deckOrderKey===orderKey)order=this.deckOrder;else{this.deckOrderKey=orderKey;this.deckOrder=order}

  const cardMarkup=i=>deckCardMarkup(`<button class="cardbtn ${r.selected.includes(i)?'selected':''} ${[...(r.golden_cards||[]),r.golden_card].includes(r.pool[i])?'golden-card':''}" data-tag="card" data-index="${i}" data-id="${r.pool[i]}"><img src="${this.image(r.pool[i])}" draggable="false"><span>${esc(name(i))}</span>${[...(r.golden_cards||[]),r.golden_card].includes(r.pool[i])?'<span class="golden-sleeve-mark" title="Golden Sleeve">★</span>':''}</button>`,lookup(r.pool[i]),r,i,this.content.artifactInfo),cards=this.deckSplit?splitDeckMarkup(order.filter(i=>inDeck.has(i)),order.filter(i=>!inDeck.has(i)),cardMarkup,this.deckFilter==='Extra'):order.map(cardMarkup).join('');

  const bossCost=bossRerollPrice(r),known=i=>boss||hasSpyglass(r)||(r.revealed_opponents||[]).includes(i);
  const opponents=r.routes.map(i=>{const o=this.content.characters[i],reward=r.route_rewards[i],pack=this.content.packs.find(p=>p.id===reward?.pack),taken=theirs===i,picked=mine===i,name=known(i)?esc(o?.name||'opponent'):'this opponent';
   const badges=picked||taken?`<div class="tag-pick-badges">${picked?'<span class="tag-pick you">You · locked in</span>':''}${taken?`<span class="tag-pick partner"><img src="assets/${esc(partner?.sprite||'')}" alt="">${partnerName} · locked in</span>`:''}</div>`:'';
   // Either player rerolls either boss, one at a time, while nobody is locked in on it.
   const reroll=boss?`<button class="tag-boss-reroll" data-tag="boss-reroll" data-id="${i}" ${waiting||this.working||picked||taken||r.gold<bossCost?'disabled':''} aria-label="Reroll ${name} for ${bossCost} coins"><span class="boss-reroll-label"><span aria-hidden="true">↻</span> REROLL</span><span class="boss-reroll-price"><img src="assets/ui/coins.png" alt="Coins"><strong>${bossCost}</strong></span></button>`:'';
   const swords=`<button class="primary tag-swords ${picked?'locked':''}" data-tag="lock-opponent" data-id="${i}" aria-pressed="${picked}" aria-label="${picked?'Unlock '+name:taken?partnerName+' is locked in on '+name:'Lock in '+name}" ${waiting||this.working||taken?'disabled':''}>${swordsIcon('start-swords')}<span class="start-label">${picked?'Locked in ✓':taken?'Teammate’s pick':'Lock in'}</span></button>`;
   return `<section data-encounter="${i}" class="opponent tag-opponent ${picked?'selected':''} ${taken?'teammate-pick':''}">${encounterPortrait(this.content,r,i,{revealAttr:'data-id',disabled:waiting,tag:true})}${badges}<small>${r.challenge_level>=1?'Challenge LVL '+r.challenge_level+' · 8,000 LP':r.round===0?'Practice duel · 3,000 LP':'Duel '+(r.round+1)}</small><div class="reward"><img class="boost-icon" src="${rewardIcon(reward?.key)}" alt=""><span>SHOP BOOST<br><b>${esc(reward?.label||'')}</b></span></div>${pack?`<div class="reward"><img data-tag="pack" data-pack="${pack.id}" src="assets/packs/${pack.id}.jpg" alt="${esc(pack.name)}"><span>GUARANTEED PACK<br>${esc(pack.name)}</span></div>`:''}${curseIcons(this.content,r.route_curses?.[i]||[],true)}${hasSpyglass(r)?button('View deck','peek-deck',`data-id="${i}"`):''}${reroll}${swords}</section>`}).join('');
  const wallet=`<div class="boss-economy"><div class="boss-wallet" aria-label="${coinLabel(r.gold)} coins"><img src="assets/ui/coins.png" alt=""><div><small>TEAM COINS</small><strong>${coinLabel(r.gold)}</strong></div></div></div>`;
  const pickLine=mine!==null&&theirs!==null?'Both players are locked in':mine!==null?`Locked in · waiting for ${partnerName}`:theirs!==null?`${partnerName} is locked in on ${known(theirs)?esc(this.content.characters[theirs]?.name||'an opponent'):'an opponent'} · pick another`:boss?'Both bosses are on both screens · each player locks in one':'Choose your next opponent';
  const coinsLine=boss?`<span class="tag-boss-coins"> · Team coins ${coinLabel(r.gold)}</span>`:'';

  const body=this.tab==='deck'&&fixed?`<section class="tag-hidden-deck"><img src="assets/card-back.jpg" alt="Hidden deck"><h2>${c.copycat?"Copy of opponent's deck":'Chosen reward deck'}</h2></section>`:this.tab==='deck'?`<div class="scroll draft-scroll tag-deck-scroll"><div class="draft-summary"><div><p class="draft-count">${main} / ${deckMinimum(r,this.content.characters[r.character])}+ minimum main · ${r.selected.length-main} Extra Deck · ${r.artifacts.includes('broken_limiter')?'No copy limit (Broken Limiter).':'Maximum three copies.'}</p><p class="draft-inspect-help">${locked?'Locked in · tapping a card unlocks your pick':'Tap to select · Hold to inspect'}</p></div></div><div class="draft-tabs deck-filter-row">${deckSearchButtons('tag-deck',this.deckFilter!=='All'||this.deckSort!=='Newest'||this.deckStatus!=='First')}${['All','Monster','Spell','Trap','Extra'].map(t=>button(t==='Extra'?'Extra Deck':t,'deck-filter',`data-filter="${t}" class="${this.deckFilter===t?'active':''}"`)).join('')}<select id="tag-deck-status" data-draft-deck aria-label="Deck status">${DECK_STATUS_OPTIONS.map(([value,label])=>`<option value="${value}" ${this.deckStatus===value?'selected':''}>${label}</option>`).join('')}</select><select id="tag-deck-sort" data-draft-sort aria-label="Sort cards">${['Newest','Default','Name','Attribute','ATK','DEF','Level'].map(t=>`<option ${this.deckSort===t?'selected':''}>${t}</option>`).join('')}</select><button class="deck-deselect" data-tag="deselect-all" aria-label="Deselect all" title="Deselect all">${deselectIcon}</button><span class="deck-filter-break" aria-hidden="true"></span></div>${this.deckSplit?`<div class="draft-card-scroll deck-split" ${splitStyle(this.deckSplit)}>${cards}</div>`:`<div class="draft-card-scroll"><div class="cardgrid">${cards}</div></div>`}</div>`:`${boss?bossBanner(r)+wallet:''}<div class="tag-draft-controls" role="status" aria-live="polite">${pickLine}${coinsLine}</div><div class="routes tag-routes">${opponents}</div>`;

  const tradeTool=inShop?button('Back to shop','shop-back','class="tag-back-shop"'):this.tab==='deck'&&r.round>0&&v.trade?.available!==false?button(v.trade?.status==='received'?'Cards received':`Trade ${v.trade?.votes.filter(Boolean).length||0}/2${v.trade?.votes[v.seat]?' ✓':''}`,v.trade?.status==='received'?'trade-receipt':'trade-vote',waiting||this.working?'disabled':''):'';

  this.root.innerHTML=this.header(body+ready,tools+tradeTool+(this.tab==='deck'?button(relicEyeIcon,'relics','class="navigation-icon-button" aria-label="Relics" title="Relics"'):''),'tag-offline-draft'+(boss&&this.tab!=='deck'?' boss':''));if(this.tab!=='deck')mountRunProgress(this.root.querySelector('.tag-page'),r,{content:this.content});

  // Both bosses spin together; after a reroll only the new boss spins.
  if(boss&&this.tab!=='deck'&&!inShop){const key=JSON.stringify([r.round,r.routes]);if(this.bossRevealKey!==key){const seen=this.bossSeen?.round===r.round?this.bossSeen.routes:[],fresh=r.routes.filter(i=>!seen.includes(i));this.bossRevealKey=key;this.bossSeen={round:r.round,routes:[...r.routes]};playEncounterReveal({content:this.content,run:r,voice:bossNameVoice,opponents:fresh.length?fresh:r.routes,slot:true,sound:this.sound,tickSound:this.tickSound,stopTick:this.stopTick,active:()=>this.alive&&this.view?.phase==='draft'}).catch(e=>this.error(e))}}

  if(this.tab==='deck')deckReadyFeedback(this.root,main,deckMinimum(r,this.content.characters[r.character]),this);

  const search=this.root.querySelector('[data-effect-search]');if(search)search.onclick=()=>openSearch('tag-deck',r.pool.map(lookup),()=>this.render());
  const clear=this.root.querySelector('[data-effect-search-clear]');if(clear)clear.onclick=()=>{this.resetDeckFilters();this.render()};

  const sort=this.root.querySelector('#tag-deck-sort');if(sort)sort.onchange=()=>{this.deckSort=sort.value;this.render()};
  const status=this.root.querySelector('#tag-deck-status');if(status)status.onchange=()=>{this.deckStatus=status.value;this.render()};

 }



 // Reopening Tag after a reload or app restart goes straight back into a run in progress, with the same seat token and
 // character, so nobody has to type the room code again (2026-11-03). Leaving a room deletes its token, which ends this.
 async autoRejoin(){
  const room=savedRoom();if(!room?.started||this.session||Date.now()-room.at>ROOM_MEMORY)return;
  let endpoint;try{endpoint=await this.endpoint()}catch{return}
  if(!localStorage.getItem(endpoint.replace(/\/$/,'')+':tag:'+room.code)){forgetRoom();return}
  if(!this.profile.unlocked.includes(room.character))return;
  this.character=room.character;(this.variants??={})[room.character]=room.variant||0;this.level=room.level;this.status='Rejoining your Tag run…';this.render();
  try{await this.action('rejoin',{code:room.code,dataset:{}})}catch(error){this.status='';if([400,404,410].includes(error.status)||/room|seat/i.test(error.message))forgetRoom();this.error(error)}
 }

 async endpoint(){

  let config={};try{const response=await fetch('./multiplayer-config.json',{cache:'no-store'});if(response.ok)config=await response.json()}catch{}

  // A release-wide address is configured once, never entered by each player.

  const configured=config.signalingUrl||localStorage.getItem('tag-endpoint');

  if(configured){const url=new URL(configured);if(url.protocol==='https:'||new URLSearchParams(location.search).has('tagtest')&&['localhost','127.0.0.1'].includes(url.hostname))return url.href}

  if(new URLSearchParams(location.search).has('tagtest'))return 'http://127.0.0.1:8765';

  throw Error('Online rooms are not available in this build yet. The room service needs to be configured.');

 }

 chosenVariant(){return this.content.characters[this.character]?.alternate&&alternateUnlocked(this.profile,this.character)?this.variants?.[this.character]||0:0}
 portrait(id,label=''){

  const c=this.content.characters[id];return `<div class="tag-player-portrait" style="background-image:url('assets/${c.background||'character-backgrounds/'+id+'.jpg'}')"><img src="assets/${esc(c.sprite)}" alt="${esc(c.name)}"><strong>${esc(c.name)}</strong>${label?`<small>${esc(label)}</small>`:''}</div>`;

 }

 renderLobby(){

  if(this.session){

   const joined=!!this.view&&this.session.connected,seat=this.session.seat??this.session.peer.seat??0,characters=this.view?.characters||[seat===0?this.character:null,seat===1?this.character:null];

   const slots=[0,1].map(i=>characters[i]!=null&&(i===seat||joined)?this.portrait(characters[i],i===0?'Host':'Player 2'):`<div class="tag-player-portrait tag-empty"><span>Waiting for player ${i+1}…</span></div>`).join('');

   this.root.innerHTML=this.header(`<section class="tag-room"><div class="tag-room-heading"><div><small>ROOM CODE</small>${roomCodeControl(this.session.code||this.session.peer?.code)}</div><h2>${joined?2:1} / 2 players</h2></div><div class="tag-room-players">${slots}</div>${seat===0?button('Start run','start',joined&&!this.working?'':'disabled'):'<p>Waiting for the host to start…</p>'}</section>`);return;

  }

  if(this.screen==='join'){

   const keyboard=this.desktop?`<div class="tag-code-keyboard" role="group" aria-label="Room code keyboard">${['23456789','QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map(row=>`<div class="tag-key-row">${[...row].map(key=>button(key,'code-key',`data-key="${key}" aria-label="Type ${key}" ${this.working?'disabled':''}`)).join('')}</div>`).join('')}<div class="tag-key-row">${button('Backspace','code-delete',this.working?'disabled':'')}${button('Clear','code-clear',this.working?'disabled':'')}</div></div>`:'';

   this.root.innerHTML=this.header(`<section class="tag-join-screen ${this.desktop?'tag-join-desktop':''}"><h2>Join a room</h2><label for="tag-code">Enter room code</label><input id="tag-code" ${this.desktop?'readonly inputmode="none"':''} maxlength="5" value="${esc(this.joinCode)}" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="ABCDE" aria-label="Room code">${keyboard}<div>${button('Back','back')}${button(this.working?'Joining…':'Join','join-room',this.working?'disabled':'')}</div></section>`);const input=this.root.querySelector('#tag-code');input.addEventListener('input',()=>{this.joinCode=input.value.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,5);input.value=this.joinCode});input.addEventListener('keydown',e=>{if(e.key==='Enter')this.action('join-room',input).catch(error=>this.error(error))});return;

  }

  const base=this.content.characters[this.character],unlocked=alternateUnlocked(this.profile,this.character),variant=this.chosenVariant(),c=variant?{...base,...base.alternate,name:base.name}:base,packs=c.copycat||c.engine_deck||c.random_packs?[]:c.starting_packs||[c.pack,c.pack,c.pack,c.pack];

  const relic=c.starting_relic,info=this.content.artifactInfo[relic],relicName=relic==='none'?'No relic':relic==='random'?'Random relic':relic==='random_archetype'?'Random archetype relic':this.content.artifacts[relic]?.[0]||'',relicText=relic==='none'?'The Dueling Engine starts with no relic.':relic==='random'?'A different relic is rolled for each new run.':relic==='random_archetype'?'Start with a random relic that adds cards from an archetype to shop stock.':this.content.artifacts[relic]?.[2]||'';

  const packArt=packs.length?packs.map((id,n)=>`<img data-tag="pack" data-pack="${id}" src="assets/packs/${id}.jpg" style="--n:${n}" alt="Starting pack">`).join(''):`<img src="assets/card-back.jpg" style="--n:1"><span>${c.copycat?'Borrowed deck':c.engine_deck?'Victory deck choices':'4 random packs'}</span>`;

  this.root.innerHTML=this.header(`<div class="char-layout"><div class="roster tag-character-grid" style="--roster-rows:${Math.ceil(this.content.playable.length/6)}">${this.content.playable.map(i=>{const x=this.content.characters[i];return `<button class="portrait ${i===this.character?'selected':''} ${(this.profile.character_levels?.[i]??-1)>=5?'golden-complete':''} ${this.profile.unlocked.includes(i)?'':'locked'}" data-tag="character" data-id="${i}" data-completed-level="${this.profile.character_levels?.[i]??-1}" data-unlocked-level="${Math.min(6,(this.profile.character_levels?.[i]??-1)+1)}" aria-label="${esc(x.name)}" ${this.profile.unlocked.includes(i)?'':'disabled'}><img src="assets/${x.sprite}"><span>${esc(x.name)}</span></button>`}).join('')}</div><div class="duelist-selection"><aside class="char-details"><div class="duelist-hero" style="background-image:url('assets/${c.background||`character-backgrounds/${this.character}.jpg`}')"><img src="assets/${c.sprite}"><h2>${esc(c.name)}</h2></div>${base.alternate?`<div class="variant-selector"><button data-tag="variant" data-id="0" class="${variant?'':'active'}">Standard</button><button data-tag="variant" data-id="1" class="${variant?'active':''}" ${unlocked?'':'disabled'}>${esc(base.alternate.name)}</button>${unlocked?'':'<small>Beat Challenge LVL 2 or LVL -1</small>'}</div>`:''}<h3 class="loadout-heading">${c.copycat?'BORROWED DECK':c.engine_deck?'VICTORY DECK CHOICES':'GUARANTEED CARDS'}</h3><div class="duelist-loadout"><div class="draft-pack-fan">${packArt}</div><div class="signature-cards">${(c.cards||[]).map(name=>{const id=this.content.cards.find(x=>x.name===name)?.id;return `<button data-tag="inspect" data-id="${id}" aria-label="Inspect ${esc(name)}"><img src="${this.image(id)}"></button>`}).join('')}</div></div><div class="starting-relic"><div class="starting-relic-art">${info?relicArtwork(relicImage(info.art)):relic==='none'?'':'<img class="random-relic" src="assets/card-back.jpg">'}</div><div><h3>${esc(relicName)}</h3><p>${esc(relicText)}</p></div></div></aside><label class="tag-level-label">Host LVL <select id="tag-level">${this.profile.relicless_unlocked?`<option value="-1" ${this.level===-1?'selected':''}>-1 · Disable all relics or curses</option>`:''}${Array.from({length:Math.min(6,(this.profile.character_levels?.[this.character]??-1)+1)+1},(_,i)=>`<option ${i===this.level?'selected':''}>${i}</option>`).join('')}</select></label><div class="tag-connect-buttons">${button(this.working?'Creating…':'Host','host',`class="start-run" ${this.working?'disabled':''}`)}${button('Join','join',`class="start-run" ${this.working?'disabled':''}`)}</div></div></div>`,'','character-select-page tag-offline-select');

  this.root.querySelector('#tag-level').addEventListener('change',async e=>{const character=this.character,level=+e.target.value;try{await this.backend('remember-level',{character,level});(this.profile.character_last_levels??={})[character]=level;if(this.character===character)this.level=level}catch(error){this.error(error)}});

 }

 // The solo shop's layout, badges, effects and shopkeeper, with Tag's rules: shared gold and stock, one cart per player
 // that both can see, and Buy, Reroll and Next duel happen only once both players lock in the same choice (2026-11-08).
 shop(){const v=this.view,r=v.run,seat=v.seat,canAct=this.session.connected&&!v.paused,c=this.content.characters[r.character],fixed=c.copycat||c.engine_deck;

  announceShopUltra(fixed?{...r,shop:r.shop.filter(x=>x.kind==='artifact')}:r,this.content.cards);

  const s=v.shopping||{carts:[[],[]],locks:[null,null],choosing:[false,false]},partnerCart=new Set(s.carts?.[1-seat]||[]),myLock=s.locks?.[seat]??null,theirLock=s.locks?.[1-seat]??null;

  for(const i of this.selection)if(!r.shop[i]||r.shop[i].sold||fixed&&r.shop[i].kind!=='artifact'||partnerCart.has(i))this.selection.delete(i);

  const price=i=>r.shop[i]?.price||0,total=[...this.selection,...partnerCart].reduce((n,i)=>n+price(i),0),coins='<img src="assets/ui/coins.png" alt="Gold">',reroll=shopRerollPrice(r);
  const owned=new Map();for(const id of r.pool||[])owned.set(id,(owned.get(id)||0)+1);const copyLimit=r.artifacts?.includes('broken_limiter')?0:3;
  const partner=this.content.characters[v.characters[1-seat]],partnerName=esc(partner?.name||'Your teammate'),partnerArt=`<img src="assets/${esc(partner?.sprite||'')}" alt="">`;

  const product=(x,i)=>{const name=x.kind==='single'?this.cardById(x.id)?.name:x.kind==='artifact'?this.content.artifacts[x.id][0]:x.kind==='deck'?x.name:this.content.packs.find(p=>p.id===x.id)?.name,theirs=partnerCart.has(i);

   const art=x.kind==='single'?this.image(x.id):x.kind==='artifact'?relicImage(this.content.artifactInfo[x.id].art):x.kind==='deck'?`assets/decks/${x.art}.jpg`:`assets/packs/${x.id}.jpg`;

   return `<div class="shop-product ${x.sold?'sold':''} ${!x.sold&&x.price>r.gold?'fx-cant-afford':''} ${this.selection.has(i)?'chosen':''} ${theirs?'teammate-pick':''} ${isShopUltra(x,this.content.cards)?'shop-ultra':''}"><div class="product-art" data-shop-item="${i}">${x.kind==='artifact'?relicArtwork(art,`data-tag="item" data-index="${i}"`):`<img data-tag="item" data-index="${i}" src="${art}" alt="${esc(name)}">`}<span class="price-badge">${x.sold?'SOLD':`<span>${x.price}</span><img class="price-coin" src="assets/ui/coins.png" alt="gold">`}</span>${x.kind==='single'&&owned.get(x.id)?ownedBadge(owned.get(x.id),copyLimit):''}${theirs?`<span class="tag-cart-badge" title="${partnerName} picked this">${partnerArt}</span>`:''}<button class="purchase-check" role="checkbox" aria-checked="${this.selection.has(i)}" aria-label="${theirs?partnerName+' picked '+esc(name):'Select '+esc(name)}" data-tag="select" data-index="${i}" ${!canAct||x.sold||theirs||fixed&&x.kind!=='artifact'?'disabled':''}><span class="purchase-tick" aria-hidden="true"></span></button></div>${x.kind==='artifact'?`<small>${esc(name)}</small>`:''}</div>`;

  };

  // A lock-in button: pressing it again cancels. Locked, it greys out and says who it waits for.
  // The Next duel arrow is clipped to a triangle, so its state shows in the header and as an hourglass, not as a note.
  const lock=(intent,cls,inner,label,blocked=false,note=true)=>{const on=myLock===intent,ready=theirLock===intent;return `<button class="${cls} tag-lock ${on?'tag-locked':''} ${ready?'tag-partner-locked':''}" data-tag="shop-lock" data-intent="${intent}" aria-pressed="${on}" aria-label="${on?'Cancel: '+label+', waiting for '+partnerName:label+(ready?', '+partnerName+' is ready':'')}" ${!canAct||this.working||blocked&&!on?'disabled':''}>${inner}${note&&(on||ready)?`<small class="tag-lock-note">${on?'Waiting…':'1/2 ✓'}</small>`:''}</button>`};

  const singles=r.shop.map((x,i)=>({x,i})).filter(({x})=>x.kind==='single');
  const rerollButton=cls=>lock('reroll',cls,`<b>REROLL</b><span>${coins}<strong>${reroll}</strong></span>`,`Reroll entire shop for ${reroll} coins`,r.gold<reroll||fixed&&r.challenge_level===-1);
  const buyButton=lock('buy','primary shop-buy',`<b>BUY</b><span>${coins}<strong>${total}</strong></span>`,`Buy both players' picks for ${total} coins`,!(this.selection.size||partnerCart.size)||total>r.gold);
  const hourglass='<svg class="shop-next-swords" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 3h12M6 21h12M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9s10 4 10 9"/></svg>';
  const nextButton=lock('next','shop-next',myLock==='next'?hourglass:swordsIcon('shop-next-swords'),'Next duel',!!s.choosing?.[seat],false);
  // Who the shop waits for sits in the header, where the solo shop shows only LP. Lock-ins only: a general teammate
  // status line was turned down (2026-11-03), and the item badges already show who picked what.
  const wants={buy:'is ready to buy',reroll:'wants to reroll',next:'is ready for the next duel'},press={buy:'Buy',reroll:'Reroll',next:'Next duel'};
  const doing=myLock&&theirLock!==myLock?`Waiting for ${partnerName} to press ${press[myLock]}`:theirLock?`${partnerName} ${wants[theirLock]}`:s.choosing?.[1-seat]?`${partnerName} is making a relic choice`:'Shopping together';
  // Small screens show a short form, so the chip leaves the Edit deck button uncovered.
  const short=myLock&&theirLock!==myLock?'Waiting':theirLock?press[theirLock]+' ✓':s.choosing?.[1-seat]?'Choosing':'Together';
  const turn=`<span class="tag-shop-turn ${theirLock&&theirLock!==myLock?'your-turn':'teammate-turn'}" role="status" aria-live="polite" title="Buy, Reroll and Next duel happen when both players press them">${partnerArt}<b class="tag-turn-long">${doing}</b><b class="tag-turn-short" aria-hidden="true">${short}</b></span>`;
  this.root.innerHTML=this.header(`<div class="shop-layout">${fixed?'':`<div class="shop-stock"><h3>${esc(r.shop_rerolls>0?'General stock':r.shop_reward?.label||'Featured stock')}</h3><div class="shelf singles-featured">${singles.slice(0,5).map(({x,i})=>product(x,i)).join('')}</div><h3 class="general-stock-heading">General stock</h3><div class="shelf singles-general" style="--single-columns:${Math.max(1,singles.length-5)}">${singles.slice(5).map(({x,i})=>product(x,i)).join('')}</div><h3>Booster packs</h3><div class="packs" style="--pack-columns:${r.shop.filter(x=>['pack','deck'].includes(x.kind)).length}">${r.shop.map((x,i)=>['pack','deck'].includes(x.kind)?product(x,i):'').join('')}</div></div>`}<aside><div class="shop-counter"><button class="keeper secret-shopkeeper" data-tag="poke" aria-label="Shopkeeper"><img src="assets/shopkeeper.png" alt="Shopkeeper"><span class="keeper-hit" data-tag="poke" aria-hidden="true"></span></button><div class="shop-balance" aria-label="${coinLabel(r.gold)} gold"><img src="assets/ui/coins.png" alt=""><strong>${coinLabel(r.gold)}</strong></div>${buyButton}${rerollButton('shop-reroll-counter')}${fixedDeck(r,c)?button('View deck','view-deck','class="shop-edit-deck"'):button('Edit deck','deck','class="shop-edit-deck"')}${nextButton}</div>${r.challenge_level===-1?'':`<h3>Relics${fixed?' — relics only':''}</h3><div class="relics">${r.shop.map((x,i)=>x.kind==='artifact'?product(x,i):'').join('')}</div>`}<div class="shop-reference-buttons">${button('Coin scorecard','scorecard')}${button('Relics','relics')}${rerollButton('shop-reroll-landscape')}</div></aside></div>`,turn+`<span class="shop-header-lp">${r.lp.toLocaleString()} LP</span>`,'shop shop-compact tag-shop'+(fixed?' relic-only-shop':'')+(r.challenge_level===-1?' relicless-shop':''));mountRunProgress(this.root.querySelector('.tag-page'),r,{content:this.content},{shop:true});polishShop(this.root,'tag:'+this.session?.code+':'+r.started_at,r.gold);
  requestAnimationFrame(()=>{keeperTalk.placeHitArea(this.root.querySelector('.secret-shopkeeper'));keeperTalk.place()});
  // He greets each shop visit once the duel's card reward is done, like in solo play.
  const visit=[this.session?.code,r.started_at,r.loop,r.round].join(':');if(visit!==this.shopVisit&&!r.reward_slots?.pending){this.shopVisit=visit;keeperTalk.say('welcome')}

 }

 // A cart travels to the host a moment after the last tap, so a burst of taps costs one message.
 queueCart(){this.cartDirty=true;this.cartEdit=(this.cartEdit||0)+1;clearTimeout(this.cartTimer);this.cartTimer=setTimeout(()=>this.flushCart().catch(error=>this.error(error)),250)}
 async flushCart(){
  clearTimeout(this.cartTimer);this.cartTimer=null;if(!this.cartDirty||this.view?.phase!=='shop')return;
  const edit=this.cartEdit;
  try{await this.session.request('shop-cart',{items:[...this.selection]})}
  catch(error){if(edit===this.cartEdit){this.cartDirty=false;this.selection=new Set(this.view?.shopping?.carts?.[this.view.seat]||[]);this.render()}throw error}
  if(edit===this.cartEdit)this.cartDirty=false;
 }
 // Deck edits made from the shop reach the host when the player goes back to the shop.
 async flushShopDeck(){const d=this.shopDeck;if(!d||d.sent||this.view?.phase!=='shop'||d.code!==this.session?.code)return;d.sent=true;try{await this.session.request('deck',[...d.selected])}catch(error){d.sent=false;throw error}}
 editDeck(selected){
  const v=this.view;v.run.selected=selected;
  if(v.phase==='shop')this.shopDeck={code:this.session.code,round:v.run.round,selected:[...selected],sent:false};else this.saveDraft();
 }
 // A purchase or reroll runs when the second player locks in, so both screens play it from the view.
 async playShopEvent(event,previous){
  const v=this.view,seat=v.seat,shop=v.run.shop;
  if(event.kind==='reroll'){this.selection.clear();if(!juice.reroll(this.root,previous))playRerollSound();keeperTalk.say('reroll');return}
  if(event.kind!=='buy')return;
  const all=[...(event.items?.[0]||[]),...(event.items?.[1]||[])];purchaseCoins();
  requestAnimationFrame(()=>juice.buy(all.map(i=>this.root.querySelector(`[data-shop-item="${i}"]`)?.closest('.shop-product')),this.root.querySelector('.shop-balance'),all.map(i=>shop[i]?.price||0)));
  const mine=event.results?.[seat]||[],cards=mine.flatMap(x=>x.cards||[]),items=(event.items?.[seat]||[]).map(i=>({...shop[i],ultra:isShopUltra(shop[i],this.content.cards)}));
  await this.packQueue;await this.onGoldenCards();
  if(!this.alive)return;
  if(!mine.some(x=>x.kind==='pack')&&cards.length)this.dialog('Your purchases',`<div class="cardgrid">${cards.map(id=>`<button class="cardbtn" data-tag="inspect" data-id="${id}"><img src="${this.image(id)}"></button>`).join('')}</div>`);
  if(items.length)keeperTalk.say(keeperTalk.purchaseLine(items));
 }

 // Owned relics as in the solo Relics window; on your shop turn each one can be sold for half its price.
 relicsDialog(){
  const v=this.view,r=v.run,sell=v.phase==='shop'&&this.session.connected&&!v.paused,cursed=new Set(r.cursed_artifacts||[]),ids=[...new Set(r.artifacts||[])];
  this.dialog('Run relics',`<div class="relic-ledger"><p>Shared run relics · Effects apply when their listed conditions are met.</p><div class="relic-ledger-grid">${ids.map(id=>{const [name,price=0,text='']=this.content.artifacts[id]||[id],count=r.artifacts.filter(x=>x===id).length,coins=Math.floor(price/2);return `<section class="panel">${relicArtwork(relicImage(this.content.artifactInfo[id]?.art))}<h3>${esc(name)}${count>1?' ×'+count:''}</h3><b>OWNED · CONDITIONAL EFFECTS</b><p>${esc(text)}</p>${sell&&!cursed.has(id)?`<button class="sell-owned-relic" data-tag="sell-relic" data-relic="${esc(id)}" aria-label="Sell ${esc(name)} for ${coins} coins">Sell · ${coins} coins</button>`:''}</section>`}).join('')}</div></div>`);
 }



 renderTrade(){

  const v=this.view,t=v.trade,r=v.run,waiting=!this.session.connected||v.paused;

  if(this.tradeId!==t.id){this.tradeId=t.id;this.tradeSelection=new Set(t.selected||[]);this.tradeFilter='All'}

  const sent=t.sent[v.seat],received=t.status==='received';

  if(received){this.tab='deck';if(v.phase==='shop')this.shop();else this.renderContent(true);const tradeButton=this.root.querySelector('[data-tag="trade-vote"]');if(tradeButton){tradeButton.textContent=t.ack[v.seat]?'Waiting for teammate':'Cards received';tradeButton.dataset.tag='trade-receipt';}if(this.receivedTradeId!==t.id){this.receivedTradeId=t.id;this.dialog('Cards received',`<div class="cardgrid">${t.received.map(id=>`<button class="cardbtn" data-tag="inspect" data-id="${id}"><img src="${this.image(id)}"><span>${esc(this.cardById(id)?.name||id)}</span></button>`).join('')||'<p>No cards received.</p>'}</div>${button('Back to deck','trade-ack',`class="primary" ${waiting?'disabled':''}`)}`);document.querySelector('#modal')?.addEventListener('close',()=>this.acknowledgeTrade().catch(e=>this.error(e)),{once:true})}return}



  const rows=received?t.received.map((id,i)=>({id,i})):r.pool.map((id,i)=>({id,i}));

  const lookup=id=>this.cardById(id);

  const filtered=rows.filter(({id,i})=>this.tradeFilter==='Selected'?this.tradeSelection.has(i):this.tradeFilter==='All'||lookup(id)?.data.type&({Monster:1,Spell:2,Trap:4}[this.tradeFilter]||0));

  const controls=received?button(t.ack[v.seat]?'Waiting for teammate':'Back to shop','trade-ack',`class="primary trade-send" ${waiting||t.ack[v.seat]?'disabled':''}`):button(sent?'Sent — waiting for teammate':'Send','trade-send',`class="primary trade-send" ${waiting||sent?'disabled':''}`);

  this.root.innerHTML=this.header(`<div class="trade-heading"><h1>${received?'Cards received':'Trade cards'}</h1><p>${received?`${t.received.length} cards received from your teammate. Added to your collection; edit your deck to use them.`:sent?'Your offer is locked. Cards transfer when your teammate presses Send.':'Tap copies to select · Hold to inspect · Sending zero cards is allowed.'}</p><b>${received?'Exchange complete':t.sent.filter(Boolean).length+'/2 players sent'}</b></div>${!received?`<div class="draft-tabs">${['All','Monster','Spell','Trap','Selected'].map(f=>button(f,'trade-filter',`data-filter="${f}" class="${this.tradeFilter===f?'active':''}"`)).join('')}</div>`:''}<div class="scroll draft-scroll tag-deck-scroll"><div class="trade-cards cardgrid">${(received?rows:filtered).map(({id,i})=>`<button class="cardbtn ${!received&&this.tradeSelection.has(i)?'selected':''}" data-tag="${received?'inspect':'trade-card'}" data-id="${id}" data-index="${i}" ${!received&&sent?'disabled':''}><img draggable="false" loading="lazy" src="${this.image(id)}"><span>${esc(lookup(id)?.name||id)}</span>${!received&&r.selected.includes(i)?'<small>In your deck</small>':''}${!received&&r.card_mods?.[i]?'<small>Modified copy</small>':''}</button>`).join('')||'<p>No cards '+(received?'received.':'match this filter.')+'</p>'}</div></div><footer class="tag-lock-in"><span>${received?'Cards belong to you now':this.tradeSelection.size+' cards selected to send'}</span>${controls}${waiting?'<small>Waiting for connection. Your trade is saved.</small>':''}</footer>`,'','tag-trade');

 }

 async action(action,el){
  // No await before copying: Safari only allows the clipboard write inside the tap.
  if(action==='copy-run-card'||action==='save-run-card'){const card=this.runCard,status=card?.box.querySelector('.run-card-status');if(!card)return;(action==='save-run-card'?saveRunCard:copyRunCard)(card.box.querySelector('.run-card-canvas'),runCardName(card.run,this.content)).then(m=>{if(status)status.textContent=m}).catch(e=>{if(status)status.textContent=e.message||'Could not copy the image.'});return}

  if(action==='poke'){keeperTalk.say('poke');return}
  if(action==='curse-info'){this.dialog(this.content.curses[el.dataset.curse]?.[0]||'Curse',`<p>${esc(curseDescription(this.content,el.dataset.curse,this.view?.run?.challenge_level))}</p>`);return}



  if(this.working&&!['item','pack','relics','scorecard','return-title','exit','confirm-exit','cancel-exit'].includes(action))return;

  if(action==='return-title')action='exit';

  const id=Number(el.dataset.id),index=Number(el.dataset.index);

  if(['code-key','code-delete','code-clear'].includes(action)){

   if(!this.desktop||this.screen!=='join'||this.session)return;

   if(action==='code-clear')this.joinCode='';

   else if(action==='code-delete')this.joinCode=this.joinCode.slice(0,-1);

   else if(/^[A-Z2-9]$/.test(el.dataset.key)&&this.joinCode.length<5)this.joinCode+=el.dataset.key;

   const input=this.root.querySelector('#tag-code');if(input)input.value=this.joinCode;

   return;

  }

  if(action==='trade-ack')return this.acknowledgeTrade();

  if(action==='trade-vote'||action==='trade-send'){

   this.working=true;try{const t=this.view.trade;const value={id:t.id};if(action==='trade-vote')value.ready=!t.votes[this.view.seat];if(action==='trade-send')value.cards=[...this.tradeSelection];await this.session.request(action,value)}finally{this.working=false;this.render()}return;

  }

  if(action==='trade-receipt'){this.receivedTradeId=null;this.renderTrade();return}

  if(action==='trade-filter'){this.tradeFilter=el.dataset.filter;this.render();const area=tradeScroller(this.root);if(area)area.scrollTop=0;return}

  if(action==='trade-card'){if(this.view.trade.sent[this.view.seat])return;if(this.tradeSelection.has(index))this.tradeSelection.delete(index);else this.tradeSelection.add(index);this.render();return}

  if(action==='exit'&&this.session){this.dialog('Exit tag duels?',`<p>Leave this room and end your connection to your teammate?</p>${button('Keep playing','cancel-exit')}${button('Exit room','confirm-exit')}`);return}

  if(action==='cancel-exit'){document.querySelector('#modal')?.close();return}

  if(action==='confirm-exit')document.querySelector('#modal')?.close();

  if(action==='exit'||action==='confirm-exit'){this.working=true;try{if(this.session)await this.session.exit();this.destroy();await this.onExit()}finally{this.working=false;if(this.alive)this.render()}return}

  if(action==='character'){if(this.session)return;this.character=id;this.level=rememberedLevel(this.profile,id);this.render();return}
  if(action==='variant'){if(this.session)return;(this.variants??={})[this.character]=id;this.render();return}

  if(action==='reconnect'){await this.session?.reconnect();return}

  if(action==='back'){

   if(!this.session&&this.screen==='join'){this.screen='select';this.status='';this.render();return}

   if(!this.session||(this.session.seat??this.session.peer.seat)!==0||(this.view&&this.view.phase!=='lobby'))return;

   this.working=true;clearTimeout(this.tap?.timer);this.tap=null;

   try{

    const session=this.session;

    if(session){session.onView=()=>{};session.onDuel=()=>{};session.onStatus=()=>{};await session.pause();await session.peer.close();session.engine?.destroy()}

    this.session=null;this.view=null;this.screen='select';this.status='';this.tab='deck';this.selection.clear();

    await this.onBack(this.profile);

   }finally{this.working=false;this.render()}return;

  }

  if(action==='join'){this.screen='join';this.status='';this.render();return}

  if(action==='finale-mode'||action==='finale-pick'){this.working=true;try{await this.session.request(action,action==='finale-mode'?el.dataset.mode:Number(el.dataset.index))}finally{this.working=false;this.render()}return}

  if(action==='finale-vote'||action==='finale-skip'){this.working=true;try{await this.session.request(action,action==='finale-vote'?!this.view.finale?.votes?.[this.view.seat]:null)}finally{this.working=false;this.render()}return}

  if(action==='cursed-choose'||action==='cursed-reroll'){this.working=true;try{await this.session.request(action,el.dataset.relic)}finally{this.working=false;this.render()}return}

  if(action==='sell-relic'){if(this.view.paused||!this.session.connected)return;this.working=true;try{const result=await this.session.request('sell-relic',el.dataset.relic);this.notice?.(`Sold ${this.content.artifacts[result.relic]?.[0]||'relic'} for ${result.coins} coins.`)}finally{this.working=false;this.render()}if(document.querySelector('#modal[open] .relic-ledger'))this.relicsDialog();return}
  if((action==='shop-lock'||action==='select')&&/changed their picks/.test(this.status))this.status='';
  if(action==='shop-lock'){const v=this.view;if(v.paused||!this.session.connected||v.phase!=='shop')return;this.working=true;try{await this.flushCart();const intent=this.view.shopping?.locks?.[this.view.seat]===el.dataset.intent?null:el.dataset.intent;await this.session.request('shop-lock',{intent,cartRev:this.view.shopping?.cartRev});playUISound('shop-select')}finally{this.working=false;if(this.alive&&this.view?.phase!=='duel')this.render()}return}

  if(action==='start'){this.working=true;try{await this.session.request('start')}finally{this.working=false;this.render()}return}

  if(['host','join-room','rejoin'].includes(action)){

   const code=action==='rejoin'?el.code:this.joinCode.trim().toUpperCase();if(action==='join-room'&&!/^[A-Z2-9]{5}$/.test(code))throw Error('Enter the five-character room code.');

   this.working=true;this.status='';this.render();

   try{

   const endpoint=await this.endpoint();

   this.session=new TagSession({endpoint,character:this.character,variant:this.chosenVariant(),profile:this.profile,level:this.level,content:this.content,backend:this.backend,onView:v=>this.update(v),onDuel:(s,c)=>this.onDuel(s,c),onAbandoned:()=>{this.status='Your tag partner abandoned you';this.dialog('Your tag partner abandoned you',`<p>Your partner left the tag room.</p>${button('Return to title','return-title','class="primary"')}`)},onPacks:event=>{this.packQueue=this.packQueue.then(async()=>{await this.onGoldenCards();return !this.alive||!this.openPacks?undefined:new Promise(resolve=>this.openPacks(event.packs,resolve))}).catch(error=>this.error(error))},onStatus:(state,detail)=>{

    this.status=state==='connected'||state==='waiting'?'':state==='error'?friendlyError(detail):['disconnected','failed','reconnecting'].includes(state)?'':state==='signaling-error'?'Room service unavailable — retrying':'';

    this.onStatus(state,detail);if(this.view?.phase!=='duel'&&state!=='route')this.render();

   }});

   const room=await this.session[action==='host'?'host':'join'](...(action==='join-room'||action==='rejoin'?[code]:[]));localStorage.setItem('tag-last-code',room.code);
   if(action!=='rejoin')rememberRoom({code:room.code,character:this.character,variant:this.chosenVariant(),level:this.level,started:false});

   }catch(error){this.session?.peer.suspend();this.session=null;throw error}finally{this.working=false;this.render()}return;

  }

  if(action==='deck-filter'){this.deckFilter=el.dataset.filter;this.render();return}

  if(action==='view-deck'&&fixedDeck(this.view.run,this.content.characters[this.view.run.character])){this.dialog('Your deck',`<p>${this.content.characters[this.view.run.character].copycat?"Copy of opponent's deck":'Chosen reward deck'}</p>`);return}

  if(action==='view-deck'){this.dialog('Your deck',`<div class="cardgrid">${this.view.run.selected.map(i=>`<button data-tag="inspect" data-id="${this.view.run.pool[i]}"><img src="${this.image(this.view.run.pool[i])}"></button>`).join('')}</div>`);return}

  if(action==='inspect'){this.inspect(id);return}

  if(action==='pack'){this.inspectPack(el.dataset.pack);return}

  if(action==='shop-back'||action==='opponents'&&this.view?.phase==='shop'){this.tab='opponents';this.render();this.flushShopDeck().catch(error=>this.error(error));return}

  if(action==='deck'||action==='opponents'){if(action==='deck')this.deckOrderKey=null;this.tab=this.content.characters[this.view?.run?.character]?.copycat?'opponents':action;this.render();return}

  if(action==='item'){

   const x=this.view.run.shop[index];if(x.kind==='single'){this.inspect(x.id);return}

   if(x.kind==='artifact'){this.dialog(this.content.artifacts[x.id][0],`<img height="180" src="${relicImage(this.content.artifactInfo[x.id].art)}"><p>${esc(this.content.artifacts[x.id][2])}</p>`);return}

   if(x.kind==='pack'){this.inspectPack(x.id);return}

   this.dialog(x.name,`<p>Adds these cards to your collection. ${x.price} gold</p><div class="cardgrid">${[...new Set(x.cards)].map(id=>`<button class="cardbtn" data-tag="inspect" data-id="${id}"><img loading="lazy" src="${this.image(id)}"><span>${esc(this.cardById(id)?.name||id)}</span></button>`).join('')}</div>`);return;

  }

  if(action==='relics'){this.relicsDialog();return}

  if(action==='scorecard'){if(this.showScorecard)await this.showScorecard();return}



  if(action==='select'){const v=this.view,stock=v.run.shop[index],theirs=v.shopping?.carts?.[1-v.seat]||[];if(!stock||stock.sold||v.phase!=='shop'||!this.session.connected||v.paused||theirs.includes(index))return;if((this.content.characters[v.run.character].copycat||this.content.characters[v.run.character].engine_deck)&&stock.kind!=='artifact')return;if(this.selection.has(index))this.selection.delete(index);else{if(stock.price+[...this.selection,...theirs].reduce((n,i)=>n+(v.run.shop[i]?.price||0),0)>v.run.gold){playUISound('count-coins');throw Error('Not enough gold for both carts')}this.selection.add(index)}playUISound('shop-select');this.render();this.queueCart();return}

  if(action==='deselect-all'){this.dialog('Deselect all?',`<p>Take every card out of your deck?</p>${button('Deselect all','deselect-all-confirm','class="primary"')}`);return}

  if(action==='deselect-all-confirm'){document.querySelector('#modal')?.close();const c=this.content.characters[this.view.run.character];if(fixedDeck(this.view.run,c))return;if(this.view.phase==='draft'&&this.view.ready[this.view.seat])await this.unlockForEdit();this.editDeck([]);this.render();return}

  if(action==='card'){

   if(fixedDeck(this.view.run,this.content.characters[this.view.run.character])||!['draft','shop'].includes(this.view.phase))return;

   // Editing a locked-in deck unlocks the pick first; press the swords again when it's done.
   if(this.view.phase==='draft'&&this.view.ready[this.view.seat])await this.unlockForEdit();

   const selected=[...this.view.run.selected],at=selected.indexOf(index);if(at>=0)selected.splice(at,1);else selected.push(index);

   this.editDeck(selected);playUISound('deck-select');this.render();return;

  }



  this.working=true;

  try{

   if(action==='reveal-opponent'&&!el.dataset.confirmed){this.dialog('Confirm Reveal',`<div class="settings-actions">${button(`Reveal · <span class="reveal-cost-inline">${revealCostLabel(revealCost(this.view.run))}</span>`,'reveal-opponent',`data-id="${id}" data-confirmed="1" class="primary"`)}${button('Cancel','cancel-exit')}</div>`);return}
   if(action==='reveal-opponent'){document.querySelector('#modal')?.close();await playPortraitReveal({before:this.root.querySelector(`[data-encounter="${id}"] .encounter-hero`),update:async()=>{await this.session.request('reveal-opponent',id);this.render()},after:()=>this.root.querySelector(`[data-encounter="${id}"] .encounter-hero`),active:()=>this.alive&&this.view?.phase==='draft'})}

   else if(action==='boss-reroll'){await this.session.request('boss-reroll',id)}

   else if(action==='peek-deck'){const ids=await this.session.request('peek-deck',id);this.dialog('Opponent deck',`<div class="cardgrid">${ids.map(id=>`<button class="cardbtn" data-tag="inspect" data-id="${id}"><img src="${this.image(id)}"></button>`).join('')}</div>`)}

   else if(action==='choose'){this.view.run.opponent=id;this.saveDraft();this.render()}

   else if(action==='auto'){this.view.run.selected=await this.backend('tag-auto-preview',this.view.run);this.saveDraft();this.render()}

   // The swords lock in at once: the deck and this opponent. On the locked opponent they unlock; on another, they move the lock.
   else if(action==='lock-opponent'){

    const v=this.view,run=v.run,c=this.content.characters[run.character],main=run.selected.filter(i=>!(this.cardById(run.pool[i])?.data.type&64)).length;

    if(v.ready[v.seat]&&v.opponents[v.seat]===id)await this.session.request('unready');

    else{

     const minimum=deckMinimum(run,c);

     if(!fixedDeck(run,c)&&(main<minimum||main>60)){this.tab='deck';throw Error(`Your main deck has ${main} cards. Choose ${minimum} to 60 cards, then press the swords again.`)}

     run.opponent=id;this.saveDraft();await this.session.request('ready',{selected:run.selected,opponent:id});

    }

   }

   else if(action==='inspect')this.inspect(id);

   else if(['unready'].includes(action))await this.session.request(action);

  }finally{this.working=false;if(this.alive&&this.view&&this.view.phase!=='duel'&&['lock-opponent','unready','boss-reroll','reveal-opponent'].includes(action))this.render()}

 }

 async unlockForEdit(){this.working=true;try{await this.session.request('unready')}finally{this.working=false}}

 saveDraft(){

  if(!this.draftKey||this.view?.phase!=='draft')return;

  this.localDraft={selected:[...this.view.run.selected],opponent:this.view.run.opponent};

  localStorage.setItem(this.draftKey,JSON.stringify(this.localDraft));

 }

 update(view){

  const room=savedRoom();if(room&&room.code===this.session?.code){if(['complete','gameover'].includes(view.phase))forgetRoom();else if(view.phase!=='lobby'&&!room.started)rememberRoom({...room,started:true})}

  if(/That choice is stale|Wait for your teammate\.|No active duel\.|The carts changed|already picked that item|That boss has already changed|State changed/.test(this.status))this.status='';

  view=structuredClone(view);

  if(view.phase==='draft'){

   const key='tag-draft:'+this.session.code+':'+view.seat+':'+view.run.round+':'+JSON.stringify(view.run.pool);

   if(this.draftKey!==key){this.draftKey=key;try{this.localDraft=JSON.parse(localStorage.getItem(key)||'null')}catch{this.localDraft=null}
    // A deck edited in the shop that the host had not confirmed yet carries into opponent select.
    const d=this.shopDeck;if(!this.localDraft&&d?.code===this.session.code&&d.round===view.run.round&&d.selected.every(i=>i<view.run.pool.length))this.localDraft={selected:[...d.selected],opponent:null};this.shopDeck=null}

   if(this.localDraft&&!view.ready[view.seat]){view.run.selected=[...this.localDraft.selected];view.run.opponent=view.run.routes.includes(this.localDraft.opponent)?this.localDraft.opponent:null}

  }else if(this.draftKey){localStorage.removeItem(this.draftKey);this.draftKey=null;this.localDraft=null}

  const before=this.view?.phase,lastShop=before==='shop'?this.view.shopping:null;
  if(view.phase==='shop'){
   const d=this.shopDeck;
   if(d&&(d.code!==this.session.code||d.round!==view.run.round||d.selected.some(i=>i>=view.run.pool.length)))this.shopDeck=null;
   else if(d){if(d.sent&&JSON.stringify(d.selected)===JSON.stringify(view.run.selected))this.shopDeck=null;else view.run.selected=[...d.selected]}
   // The host's cart wins, except while this player's own taps are still on their way.
   if(!this.cartDirty)this.selection=new Set(view.shopping?.carts?.[view.seat]||[]);
   const theirs=view.shopping?.carts?.[1-view.seat]||[],locks=view.shopping?.locks||[];
   if(lastShop?.locks?.[view.seat]==='buy'&&!locks[view.seat]&&lastShop.event?.id===view.shopping?.event?.id&&JSON.stringify(lastShop.carts?.[1-view.seat])!==JSON.stringify(theirs))this.status='Your teammate changed their picks. Press Buy again.';
  }else if(before==='shop'||!view.phase){this.selection.clear();this.cartDirty=false;clearTimeout(this.cartTimer)}
  if(view.phase!=='shop'&&view.phase!=='draft')this.shopDeck=null;
  const event=view.phase==='shop'?view.shopping?.event:null,fresh=!!event&&this.shopEventSeen!==undefined&&event.id!==this.shopEventSeen;
  this.shopEventSeen=view.phase==='shop'?event?.id??null:undefined;
  const previousArt=fresh&&event.kind==='reroll'&&before==='shop'?juice.shopArt(this.root):null;

  const entrance=this.view?.phase==='lobby'&&view.phase==='draft'?captureCharacterEntrance(this.root.querySelectorAll('.tag-player-portrait>img')[view.seat]||this.root.querySelector('.duelist-hero>img')):null;

  const scroll=saveDeckScroll(tagDeckArea(this.root));

  if(before==='duel'&&view.phase!=='duel')this.resetDeckFilters();
  // After a duel the shop shows first; after the shop, opponent select. A deck editor that is open stays open.
  if(before==='duel'&&view.phase==='shop')this.tab='opponents';
  this.view=view;if(view.phase!=='shop')keeperTalk.hush();this.updateRoomBadge();this.profile=view.profile;this.onView(view);

  if(view.phase!=='duel'){this.render();restoreDeckScroll(tagDeckArea(this.root),scroll)}

  if(fresh)this.playShopEvent(event,previousArt).catch(error=>this.error(error));
  // A golden card or DNA Rewrite choice still open (after a reload, or the teammate's Golden Sleeve) is offered again:
  // Next duel waits for it.
  else if(view.phase==='shop'&&view.shopping?.choosing?.[view.seat]&&!this.offeringChoice){this.offeringChoice=true;this.packQueue.then(()=>this.alive&&this.onGoldenCards()).catch(error=>this.error(error)).finally(()=>{this.offeringChoice=false})}

  if(view.phase==='draft'&&view.run.round===0)this.openStartingPacks(view,entrance);

  if((!before||before==='duel')&&['shop','complete'].includes(view.phase)&&view.run.reward_slots?.pending)this.showRewards?.();

 }

 // The shareable run card, as on the solo ending. View updates re-render the ending, so the drawn card is kept and put back.
 endCard(r){
  const slot=this.root.querySelector('.tag-run-card-slot');if(!slot)return;
  const key=[this.session?.code,r.started_at,r.character,r.stage,r.round,r.gold,(r.artifacts||[]).join()].join(':');
  if(this.runCard?.key!==key){
   const box=document.createElement('div');box.className='tag-run-card';
   box.innerHTML=`<figure class="run-card"><canvas class="run-card-canvas" width="1080" height="1350" role="img" aria-label="Run summary"></canvas></figure><div class="run-card-share">${button('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>Copy image','copy-run-card','class="primary run-card-copy" disabled')}${button('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>Download','save-run-card','class="run-card-copy run-card-save" disabled')}<p class="run-card-status" role="status" aria-live="polite"></p></div>`;
   const canvas=box.querySelector('canvas'),card=id=>this.cardById(Number(id))||this.content.tokenCards?.find(c=>c.id===Number(id));this.runCard={key,box,run:r};
   mountRunCard(canvas,r,{content:this.content,character:this.content.characters[r.character],card,cardImage:this.image,relicImage,assetURL}).then(ready=>{
    if(this.runCard?.box!==box)return;
    // Left the ending before the artwork loaded: draw it again on the way back.
    if(!ready){this.runCard=null;return}
    box.querySelectorAll('.run-card-copy').forEach(b=>b.disabled=false);
   }).catch(error=>{console.error(error);const status=box.querySelector('.run-card-status');if(status)status.textContent='The run summary image could not be drawn.'});
  }
  slot.replaceWith(this.runCard.box);
 }

 openStartingPacks(view,entrance){

  const r=view.run,c=this.content.characters[r.character],key='tag-starting-packs:'+this.session.code+':'+view.seat+':'+r.started_at;

  if(c.copycat||c.engine_deck||!r.packs?.length||!this.openPacks||this.startingPacksKey===key||localStorage.getItem(key))return;

  this.startingPacksKey=key;

  const packs=r.packs.map((cards,i)=>({id:r.pack_ids[i],cards}));

  this.packQueue=this.packQueue.then(async()=>{

   if(!this.alive)return;

   await new Promise(resolve=>{

    let opened=false;

    const show=()=>{opened=true;if(!this.alive){resolve();return}this.closeStartingPacks=this.openPacks(packs,()=>{this.closeStartingPacks=null;localStorage.setItem(key,'1');resolve()})};

    characterEntrance(entrance,show).then(()=>{if(!opened){this.startingPacksKey=null;resolve()}}).catch(error=>{this.error(error);resolve()});

   });

  }).catch(error=>this.error(error));

 }

 destroy(){clearTimeout(this.cartTimer);cancelCharacterEntrance();this.closeStartingPacks?.();this.closeStartingPacks=null;this.root.removeEventListener('contextmenu',this.context);this.roomBadge?.remove();clearTimeout(this.finaleRollTimer);this.cancelTradeHold();this.root.removeEventListener('pointerup',this.cancelTradeHold);this.root.removeEventListener('pointercancel',this.cancelTradeHold);this.root.removeEventListener('scroll',this.cancelTradeHold,true);window.visualViewport?.removeEventListener('resize',this.viewport);this.root.style.removeProperty('--tag-visible-height');this.alive=false;clearTimeout(this.tap?.timer);document.removeEventListener('click',this.click,true);this.root.removeEventListener('pointerdown',this.down);this.root.removeEventListener('pointermove',this.move)}

}

