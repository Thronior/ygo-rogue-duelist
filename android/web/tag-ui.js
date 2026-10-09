import {playUISound,playRerollSound} from './ui-sounds.js';
import {roomCodeControl} from './room-code.js';
import {characterEntrance,captureCharacterEntrance,cancelCharacterEntrance} from './character-entrance.js';
import {deckReadyFeedback} from './selection-feedback.js';
import {purchaseCoins} from './counter-audio.js';
import {polishShop} from './presentation-polish.js';
import {rememberedLevel} from './difficulty-preference.js';
import {encounterPortrait,hasSpyglass,bossBanner,bossControls,bossRerollPrice,playEncounterReveal,playPortraitReveal} from './encounter-reveal.js';
import {allCardsPackDescription} from './pack-inspection.js';
import {searches as deckSearches} from './card-search.js';
import {shopRerollPrice} from './experience-ui.js';
import {isShopUltra,announceShopUltra} from './shop-ultra.js';
import {curseIcons,curseDescription,cursedMarkup} from './experience-ui.js';
import {searchButton,matchesSearch,openSearch} from './card-search.js';
import {relicImage,relicArtwork} from './ui-art.js';
import {TagSession} from './tag-session.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const friendlyError=error=>{const text=error?.message||String(error),matches=[...text.matchAll(/(?:ValueError|RuntimeError|Error):\s*([^\n]+)/g)];return matches.length?matches.at(-1)[1].trim():text};
const button=(text,action,extra='')=>`<button data-tag="${action}" ${extra}>${text}</button>`;
export class TagUI {
 constructor({sound=()=>{},tickSound=()=>{},stopTick=()=>{},root,content,profile,backend,image,inspect,dialog,showRewards,showScorecard,openPacks,onGoldenCards=()=>{},onDuel,onExit,onBack=async()=>{},onView=()=>{},onStatus=()=>{}}){
  Object.assign(this,{sound,tickSound,stopTick,root,content,profile,backend,image,inspect,dialog,showRewards,showScorecard,openPacks,onGoldenCards,onDuel,onExit,onBack,onView,onStatus});this.desktop=!!new URLSearchParams(location.search).get('desktop');this.screen='select';this.joinCode='';this.character=profile.unlocked[0]??0;this.level=rememberedLevel(profile,this.character);this.tab='deck';this.deckFilter='All';this.deckSort='Default';this.packQueue=Promise.resolve();this.selection=new Set();this.status='';this.working=false;this.alive=true;
  this.click=e=>{const el=e.target.closest('[data-tag]');if(!el||!this.alive)return;e.stopImmediatePropagation();if(this.dragged)return;if(el.dataset.tag==='character')this.sound('flip',.25);else if(el.dataset.tag==='start')this.sound('activate',.4);this.action(el.dataset.tag,el).catch(error=>this.error(error))};
  document.addEventListener('click',this.click,true);
  this.cancelTradeHold=()=>clearTimeout(this.tradeHold);this.down=e=>{this.cancelTradeHold();this.origin=[e.clientX,e.clientY];this.dragged=false;const el=e.target.closest('[data-tag="trade-card"], [data-tag="card"]');if(el&&!el.disabled&&e.button===0)this.tradeHold=setTimeout(()=>{this.dragged=true;this.inspect(Number(el.dataset.id),el.dataset.tag==='card'?Number(el.dataset.index):null)},500)};this.move=e=>{if(this.origin&&Math.hypot(e.clientX-this.origin[0],e.clientY-this.origin[1])>10){this.dragged=true;this.cancelTradeHold()}};
  root.addEventListener('pointerup',this.cancelTradeHold);root.addEventListener('pointercancel',this.cancelTradeHold);root.addEventListener('scroll',this.cancelTradeHold,true);
  this.viewport=()=>root.style.setProperty('--tag-visible-height',(window.visualViewport?.height||innerHeight)+'px');this.viewport();window.visualViewport?.addEventListener('resize',this.viewport);
  this.context=e=>{const el=e.target.closest('[data-tag="trade-card"], [data-tag="card"], [data-tag="item"]');if(!el||!this.alive)return;e.preventDefault();if(e.button!==2||e.pointerType==='touch'||el.disabled)return;this.cancelTradeHold();if(el.dataset.tag==='item')this.action('item',el).catch(error=>this.error(error));else this.inspect(Number(el.dataset.id),el.dataset.tag==='card'?Number(el.dataset.index):null)};root.addEventListener('contextmenu',this.context);
  root.addEventListener('pointerdown',this.down);root.addEventListener('pointermove',this.move);this.render();
 }
 error(error){this.status=friendlyError(error);this.onStatus('error',this.status);if(this.view?.phase!=='duel')this.render()}
 header(body,tools='',classes=''){return `<div class="page tag-page ${classes}"><header><h2>Tag duels${this.session?.code?' · '+this.session.code:''}</h2><div class="tools">${tools} ${this.session&&(this.session.seat??this.session.peer.seat)===0&&(!this.view||this.view.phase==='lobby')?button('Back','back'):''}${button('Exit','exit')}</div></header>${this.status?`<div class="tag-status" role="status">${esc(this.status)}</div>`:''}${body}</div>`}
 render(){
  this.updateRoomBadge();
  const scroll=this.root.querySelector('.tag-deck-scroll')?.scrollTop;
  this.renderContent();
  const list=this.root.querySelector('.tag-deck-scroll');if(list&&scroll!==undefined)list.scrollTop=scroll;
 }
 cursed(){
  const v=this.view,offer=v.run.cursed_offer,disabled=this.working||v.seat!==0||v.paused?'disabled':'';
  this.root.innerHTML=`<section class="cursed-reward"><header><small>BOSS DEFEATED</small><h1>Choose a cursed relic</h1><p>${v.seat===0?'Choose 1 relic for your shared pool.':'Your teammate is choosing your shared relic.'}</p></header><div class="cursed-options">${offer.options.map(key=>{const [name,,text]=this.content.artifacts[key];return `<article><h2>${esc(name)}</h2>${relicArtwork(relicImage(this.content.artifactInfo[key].art))}${cursedMarkup(key,text)}${button('Choose relic','cursed-choose',`data-relic="${key}" ${disabled}`)}</article>`}).join('')}</div><footer>${button('Reroll · Rerolls: '+offer.rerolls_left,'cursed-reroll',disabled||!offer.rerolls_left?'disabled':'')}</footer></section>`;
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
   this.root.innerHTML=this.header(`<section class="tag-ending"><h1>${v.phase==='complete'?'Run complete':'Run ended'}</h1><div class="tag-ending-portraits">${v.characters.map(i=>this.portrait(i)).join('')}</div><p>${r.round} victories · ${r.gold} gold</p>${result}${available?`<div class="tag-finale-offer"><h2>One last duel?</h2><p>Face each other in an optional 1v1 with your final decks and 8,000 LP each. Both players must agree, then choose how relics work.</p><p>${voted?'You are ready. Waiting for your opponent…':finale.votes?.[1-v.seat]?'Your opponent wants to duel!':'Win or lose, your campaign is complete.'}</p><div>${button(voted?'Cancel readiness':'Play final 1v1','finale-vote',`class="primary" ${this.working||waiting?'disabled':''}`)}${button('Skip — finish run','finale-skip',this.working||waiting?'disabled':'')}</div></div>`:''}${button('Exit','exit')}</section>`);return
  }
  if(v.phase==='shop'){if(r.cursed_offer){this.cursed();return}this.shop();return}
  if(c.copycat)this.tab='opponents';
  const locked=v.ready[v.seat],chosen=r.routes.includes(r.opponent),fixed=c.copycat||c.engine_deck;
  const mainCount=r.selected.filter(i=>!(this.content.cards.find(c=>c.id===r.pool[i])?.data.type&64)).length,validSize=fixed||mainCount>=(r.artifacts.includes('cursed_collectors_burden')?40:20)&&mainCount<=60;
  const lockedCount=v.ready.filter(Boolean).length;
  const ready=this.tab==='deck'?`<button class="tag-choose-opponent deck-count-arrow" data-tag="opponents" ${!validSize?'disabled':''} aria-label="${mainCount}/${r.artifacts.includes('cursed_collectors_burden')?40:20}+ main deck cards — Next duel"><span><span class="tag-next-label"><strong>${mainCount}/${r.artifacts.includes('cursed_collectors_burden')?40:20}+</strong></span></span></button>`:`<footer class="tag-lock-in">${c.copycat?'':button('Edit deck','deck','class="tag-edit-deck"')}<span role="status" aria-live="polite">${lockedCount}/2 players locked in</span>${button(locked?'Unlock selection':'Lock in',locked?'unready':'ready',`class="primary" ${waiting||!chosen||(!locked&&!validSize)?'disabled':''}`)}<small>${waiting?'Waiting for connection to your teammate.':!chosen?'Choose an opponent first.':!validSize&&!locked?`${mainCount} main cards; you need ${r.artifacts.includes('cursed_collectors_burden')?40:20}–60.`:locked?'Your selection is locked. Waiting for your teammate.':'Lock your deck and opponent to continue.'}</small></footer>`;
  const tools=`<span>${esc(c.name)} · ${r.lp.toLocaleString()} LP</span>${this.tab==='deck'?(fixed?'':button('Auto-build','auto',locked?'disabled':'')+button('Deselect all','deselect-all',locked?'disabled':'')):''}`;
  const lookup=id=>this.content.cards.find(c=>c.id===id),main=r.selected.filter(i=>!(lookup(r.pool[i])?.data.type&64)).length;
  let order=r.pool.map((_,i)=>i).filter(i=>matchesSearch(lookup(r.pool[i]),'tag-deck'));
  if(this.deckFilter==='Deck')order=order.filter(i=>r.selected.includes(i));
  else if(this.deckFilter!=='All')order=order.filter(i=>lookup(r.pool[i])?.data.type&({Monster:1,Spell:2,Trap:4}[this.deckFilter]||0));
  const name=i=>lookup(r.pool[i])?.name||'';
  if(this.deckSort==='Name')order.sort((a,b)=>name(a).localeCompare(name(b)));
  else if(['ATK','DEF','Level'].includes(this.deckSort)){const key={ATK:'atk',DEF:'defense',Level:'level'}[this.deckSort];order.sort((a,b)=>(lookup(r.pool[b])?.[key]||0)-(lookup(r.pool[a])?.[key]||0))}
  else if(this.deckSort==='Newest')order.reverse();
  const cards=order.map(i=>`<button class="cardbtn ${r.selected.includes(i)?'selected':''} ${[...(r.golden_cards||[]),r.golden_card].includes(r.pool[i])?'golden-card':''}" data-tag="card" data-index="${i}" data-id="${r.pool[i]}"><img src="${this.image(r.pool[i])}" draggable="false"><span>${esc(name(i))}</span>${[...(r.golden_cards||[]),r.golden_card].includes(r.pool[i])?'<span class="golden-sleeve-mark" title="Golden Sleeve">★</span>':''}</button>`).join('');
  const opponents=r.routes.map(i=>{const o=this.content.characters[i],reward=r.route_rewards[i],pack=this.content.packs.find(p=>p.id===reward?.pack),taken=v.ready[1-v.seat]&&v.opponents[1-v.seat]===i;return `<section data-encounter="${i}" class="opponent tag-opponent ${r.opponent===i?'selected':''}">${encounterPortrait(this.content,r,i)}<small>${r.challenge_level>=1?'Challenge LVL '+r.challenge_level+' · 8,000 LP':r.round===0?'Practice duel · 3,000 LP':'Duel '+(r.round+1)}</small><div class="reward"><img src="textures/attack.png"><span>SHOP BOOST<br><b>${esc(reward?.label||'')}</b></span></div>${pack?`<div class="reward"><img src="assets/packs/${pack.id}.jpg"><span>GUARANTEED PACK<br>${esc(pack.name)}</span></div>`:''}${curseIcons(this.content,r.route_curses?.[i]||[],true)}${(r.round+1)%3!==0&&!hasSpyglass(r)&&!(r.revealed_opponents||[]).includes(i)?button('<span>Reveal</span><img src="assets/ui/coins.png" alt="Coins"><b>15</b>','reveal-opponent',`data-id="${i}" class="opponent-reveal" ${r.gold<15||waiting?'disabled':''}`):''}${hasSpyglass(r)?button('View deck','peek-deck',`data-id="${i}"`):''}${button(taken?'Teammate’s opponent':r.opponent===i?'Selected':'Choose','choose',`data-id="${i}" class="primary" ${locked||taken?'disabled':''}`)}</section>`}).join('');
  const body=this.tab==='deck'&&fixed?`<section class="tag-hidden-deck"><img src="assets/card-back.jpg" alt="Hidden deck"><h2>${c.copycat?"Copy of opponent's deck":'Chosen reward deck'}</h2></section>`:this.tab==='deck'?`<div class="scroll draft-scroll tag-deck-scroll"><div class="draft-summary"><div><p class="draft-count">${main} / ${r.artifacts.includes('cursed_collectors_burden')?40:20}+ minimum main · ${r.selected.length-main} Extra Deck · Maximum three copies.</p><p class="draft-inspect-help">Tap to select · Hold to inspect</p></div></div><div class="draft-tabs">${searchButton('tag-deck')}${['All','Monster','Spell','Trap','Deck'].map(t=>button(t,'deck-filter',`data-filter="${t}" class="${this.deckFilter===t?'active':''}"`)).join('')}<select id="tag-deck-sort" aria-label="Sort cards">${['Default','Name','ATK','DEF','Level','Newest'].map(t=>`<option ${this.deckSort===t?'selected':''}>${t}</option>`).join('')}</select></div><div class="cardgrid">${cards}</div></div>`:`${(r.round+1)%3===0?bossBanner(r)+bossControls(r,{tag:true,disabled:waiting||v.ready.some(Boolean)}):''}<div class="tag-draft-controls">${locked?'Waiting for your teammate':chosen?'Opponent selected. Lock in when your deck is finished.':'Choose your next opponent'}</div><div class="routes tag-routes">${opponents}</div>`;
  const tradeTool=this.tab==='deck'&&r.round>0&&v.trade?.available!==false?button(v.trade?.status==='received'?'Cards received':`Trade ${v.trade?.votes.filter(Boolean).length||0}/2${v.trade?.votes[v.seat]?' ✓':''}`,v.trade?.status==='received'?'trade-receipt':'trade-vote',waiting||this.working?'disabled':''):'';
  this.root.innerHTML=this.header(body+ready,tools+tradeTool,'tag-offline-draft'+((r.round+1)%3===0&&this.tab!=='deck'?' boss':''));
  if((r.round+1)%3===0&&this.tab!=='deck'){const key=JSON.stringify([r.round,r.boss_rerolls||0,r.routes]);if(this.bossRevealKey!==key){this.bossRevealKey=key;playEncounterReveal({content:this.content,opponents:r.routes,slot:true,sound:this.sound,tickSound:this.tickSound,stopTick:this.stopTick,active:()=>this.alive&&this.view?.phase==='draft'}).catch(e=>this.error(e))}}
  if(this.tab==='deck')deckReadyFeedback(this.root,main,r.artifacts.includes('cursed_collectors_burden')?40:20,this);
  const search=this.root.querySelector('[data-effect-search]');if(search)search.onclick=()=>openSearch('tag-deck',r.pool.map(lookup),()=>this.render());
  const sort=this.root.querySelector('#tag-deck-sort');if(sort)sort.onchange=()=>{this.deckSort=sort.value;this.render()};
 }

 async endpoint(){
  let config={};try{const response=await fetch('./multiplayer-config.json',{cache:'no-store'});if(response.ok)config=await response.json()}catch{}
  // A release-wide address is configured once, never entered by each player.
  const configured=config.signalingUrl||localStorage.getItem('tag-endpoint');
  if(configured){const url=new URL(configured);if(url.protocol==='https:'||new URLSearchParams(location.search).has('tagtest')&&['localhost','127.0.0.1'].includes(url.hostname))return url.href}
  if(new URLSearchParams(location.search).has('tagtest'))return 'http://127.0.0.1:8765';
  throw Error('Online rooms are not available in this build yet. The room service needs to be configured.');
 }
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
  const c=this.content.characters[this.character],packs=c.copycat||c.engine_deck||c.random_packs?[]:c.starting_packs||[c.pack,c.pack,c.pack,c.pack];
  const relic=c.starting_relic,info=this.content.artifactInfo[relic],relicName=relic==='none'?'No relic':relic==='random'?'Random relic':this.content.artifacts[relic]?.[0]||'',relicText=relic==='none'?'The Dueling Engine starts with no relic.':relic==='random'?'A different relic is rolled for each new run.':this.content.artifacts[relic]?.[2]||'';
  const packArt=packs.length?packs.map((id,n)=>`<img src="assets/packs/${id}.jpg" style="--n:${n}" alt="Starting pack">`).join(''):`<img src="assets/card-back.jpg" style="--n:1"><span>${c.copycat?'Borrowed deck':c.engine_deck?'Victory deck choices':'4 random packs'}</span>`;
  this.root.innerHTML=this.header(`<div class="char-layout"><div class="roster tag-character-grid" style="--roster-rows:${Math.ceil(this.content.playable.length/6)}">${this.content.playable.map(i=>{const x=this.content.characters[i];return `<button class="portrait ${i===this.character?'selected':''} ${(this.profile.character_levels?.[i]??-1)>=5?'golden-complete':''} ${this.profile.unlocked.includes(i)?'':'locked'}" data-tag="character" data-id="${i}" data-unlocked-level="${Math.min(5,(this.profile.character_levels?.[i]??-1)+1)}" aria-label="${esc(x.name)}" ${this.profile.unlocked.includes(i)?'':'disabled'}><img src="assets/${x.sprite}"><span>${esc(x.name)}</span></button>`}).join('')}</div><div class="duelist-selection"><aside class="char-details"><div class="duelist-hero" style="background-image:url('assets/character-backgrounds/${this.character}.jpg')"><img src="assets/${c.sprite}"><h2>${esc(c.name)}</h2></div><h3 class="loadout-heading">${c.copycat?'BORROWED DECK':c.engine_deck?'VICTORY DECK CHOICES':'GUARANTEED CARDS'}</h3><div class="duelist-loadout"><div class="draft-pack-fan">${packArt}</div><div class="signature-cards">${(c.cards||[]).map(name=>{const id=this.content.cards.find(x=>x.name===name)?.id;return `<button data-tag="inspect" data-id="${id}" aria-label="Inspect ${esc(name)}"><img src="${this.image(id)}"></button>`}).join('')}</div></div><div class="starting-relic"><div class="starting-relic-art">${info?relicArtwork(relicImage(info.art)):relic==='none'?'':'<img class="random-relic" src="assets/card-back.jpg">'}</div><div><h3>${esc(relicName)}</h3><p>${esc(relicText)}</p></div></div></aside><label class="tag-level-label">Host LVL <select id="tag-level">${this.profile.relicless_unlocked?`<option value="-1" ${this.level===-1?'selected':''}>-1 · Disable all relics or curses</option>`:''}${Array.from({length:Math.min(5,(this.profile.character_levels?.[this.character]??-1)+1)+1},(_,i)=>`<option ${i===this.level?'selected':''}>${i}</option>`).join('')}</select></label><div class="tag-connect-buttons">${button(this.working?'Creating…':'Host','host',`class="start-run" ${this.working?'disabled':''}`)}${button('Join','join',`class="start-run" ${this.working?'disabled':''}`)}</div></div></div>`,'','character-select-page tag-offline-select');
  this.root.querySelector('#tag-level').addEventListener('change',async e=>{const character=this.character,level=+e.target.value;try{await this.backend('remember-level',{character,level});(this.profile.character_last_levels??={})[character]=level;if(this.character===character)this.level=level}catch(error){this.error(error)}});
 }
 shop(){const v=this.view,r=v.run,own=v.shopSeat===v.seat&&this.session.connected&&!v.paused,c=this.content.characters[r.character],fixed=c.copycat||c.engine_deck;
  announceShopUltra(fixed?{...r,shop:r.shop.filter(x=>x.kind==='artifact')}:r,this.content.cards);
  for(const i of this.selection)if(!r.shop[i]||r.shop[i].sold||fixed&&r.shop[i].kind!=='artifact')this.selection.delete(i);
  const total=[...this.selection].reduce((n,i)=>n+r.shop[i].price,0);
  const product=(x,i)=>{const name=x.kind==='single'?this.content.cards.find(c=>c.id===x.id)?.name:x.kind==='artifact'?this.content.artifacts[x.id][0]:x.kind==='deck'?x.name:this.content.packs.find(p=>p.id===x.id)?.name;
   const art=x.kind==='single'?this.image(x.id):x.kind==='artifact'?relicImage(this.content.artifactInfo[x.id].art):x.kind==='deck'?`assets/decks/${x.art}.jpg`:`assets/packs/${x.id}.jpg`;
   return `<div class="shop-product ${x.sold?'sold':''} ${this.selection.has(i)?'chosen':''} ${isShopUltra(x,this.content.cards)?'shop-ultra':''}"><div class="product-art" data-shop-item="${i}">${x.kind==='artifact'?relicArtwork(art,`data-tag="item" data-index="${i}"`):`<img data-tag="item" data-index="${i}" src="${art}" alt="${esc(name)}">`}<span class="price-badge">${x.sold?'SOLD':`<span>${x.price}</span><img class="price-coin" src="assets/ui/coins.png" alt="gold">`}</span><button class="purchase-check" role="checkbox" aria-checked="${this.selection.has(i)}" aria-label="Select ${esc(name)}" data-tag="select" data-index="${i}" ${!own||x.sold||fixed&&x.kind!=='artifact'?'disabled':''}><span class="purchase-tick" aria-hidden="true"></span></button></div>${x.kind==='artifact'?`<small>${esc(name)}</small>`:''}</div>`;
  };
  const singles=r.shop.map((x,i)=>({x,i})).filter(({x})=>x.kind==='single');
  this.root.innerHTML=this.header(`<div class="shop-layout"><div class="shop-stock" ${fixed?'hidden':''}><h3>${esc(r.shop_rerolls>0?'General stock':r.shop_reward?.label||'Featured stock')}</h3><div class="shelf singles-featured">${singles.slice(0,5).map(({x,i})=>product(x,i)).join('')}</div><h3 class="general-stock-heading">General stock</h3><div class="shelf singles-general">${singles.slice(5).map(({x,i})=>product(x,i)).join('')}</div><h3>Booster packs</h3><div class="packs" style="--pack-columns:${r.shop.filter(x=>['pack','deck'].includes(x.kind)).length}">${r.shop.map((x,i)=>['pack','deck'].includes(x.kind)?product(x,i):'').join('')}</div></div><aside><div class="shop-counter"><img class="keeper" src="assets/shopkeeper.png"><div class="shop-balance" aria-label="${r.gold} gold"><img src="assets/ui/coins.png" alt=""><strong>${r.gold.toLocaleString()}</strong></div><div class="tag-shop-actions"><button class="primary shop-buy" data-tag="buy" ${own?'':'disabled'}><b>${!own?'WAIT':this.selection.size?'BUY':'SKIP'}</b><span><img src="assets/ui/coins.png" alt="Gold"><strong>${total}</strong></span></button></div><div class="tag-shop-status ${own?'your-turn':'teammate-turn'}" role="status"><img src="assets/${this.content.characters[v.characters[v.shopSeat]]?.sprite||''}" alt=""><div><b>${own?'Your turn to shop':'Waiting for '+esc(this.content.characters[v.characters[v.shopSeat]]?.name||'teammate')}</b><span>${v.shopSeat===0?'Host · first shopper':'Player 2 · final shopper'}${own?' · Buy or skip when finished':''}</span></div></div></div>${r.challenge_level===-1?'':`<h3>Relics${fixed?' — relics only':''}</h3><div class="relics">${r.shop.map((x,i)=>x.kind==='artifact'?product(x,i):'').join('')}</div>`}<div class="shop-reference-buttons">${button('Coin scorecard','scorecard')}${button('Relics','relics')}${button('<b>REROLL</b><span><img src="assets/ui/coins.png" alt="Gold"><strong>'+shopRerollPrice(r)+'</strong></span>','shop-reroll',`class="shop-reroll-landscape tag-shop-reroll" ${!own||this.working||r.gold<shopRerollPrice(r)||fixed&&r.challenge_level===-1?'disabled':''}`)}</div></aside></div>`,`<span class="shop-header-lp">${r.lp.toLocaleString()} LP</span>${button('View deck','view-deck')}`,'shop shop-compact tag-offline-shop'+(fixed?' relic-only-shop':'')+(r.challenge_level===-1?' relicless-shop':''));polishShop(this.root,'tag:'+this.session?.code+':'+r.started_at,r.gold);
 }

 renderTrade(){
  const v=this.view,t=v.trade,r=v.run,waiting=!this.session.connected||v.paused;
  if(this.tradeId!==t.id){this.tradeId=t.id;this.tradeSelection=new Set(t.selected||[]);this.tradeFilter='All'}
  const sent=t.sent[v.seat],received=t.status==='received';
  if(received){this.tab='deck';if(v.phase==='shop')this.shop();else this.renderContent(true);const tradeButton=this.root.querySelector('[data-tag="trade-vote"]');if(tradeButton){tradeButton.textContent=t.ack[v.seat]?'Waiting for teammate':'Cards received';tradeButton.dataset.tag='trade-receipt';}if(this.receivedTradeId!==t.id){this.receivedTradeId=t.id;this.dialog('Cards received',`<div class="cardgrid">${t.received.map(id=>`<button class="cardbtn" data-tag="inspect" data-id="${id}"><img src="${this.image(id)}"><span>${esc(this.content.cards.find(c=>c.id===id)?.name||id)}</span></button>`).join('')||'<p>No cards received.</p>'}</div>${button('Back to deck','trade-ack',`class="primary" ${waiting?'disabled':''}`)}`);document.querySelector('#modal')?.addEventListener('close',()=>this.acknowledgeTrade().catch(e=>this.error(e)),{once:true})}return}

  const rows=received?t.received.map((id,i)=>({id,i})):r.pool.map((id,i)=>({id,i}));
  const lookup=id=>this.content.cards.find(c=>c.id===id);
  const filtered=rows.filter(({id,i})=>this.tradeFilter==='Selected'?this.tradeSelection.has(i):this.tradeFilter==='All'||lookup(id)?.data.type&({Monster:1,Spell:2,Trap:4}[this.tradeFilter]||0));
  const controls=received?button(t.ack[v.seat]?'Waiting for teammate':'Back to shop','trade-ack',`class="primary trade-send" ${waiting||t.ack[v.seat]?'disabled':''}`):button(sent?'Sent — waiting for teammate':'Send','trade-send',`class="primary trade-send" ${waiting||sent?'disabled':''}`);
  this.root.innerHTML=this.header(`<div class="trade-heading"><h1>${received?'Cards received':'Trade cards'}</h1><p>${received?`${t.received.length} cards received from your teammate. Added to your collection; edit your deck to use them.`:sent?'Your offer is locked. Cards transfer when your teammate presses Send.':'Tap copies to select · Hold to inspect · Sending zero cards is allowed.'}</p><b>${received?'Exchange complete':t.sent.filter(Boolean).length+'/2 players sent'}</b></div>${!received?`<div class="draft-tabs">${['All','Monster','Spell','Trap','Selected'].map(f=>button(f,'trade-filter',`data-filter="${f}" class="${this.tradeFilter===f?'active':''}"`)).join('')}</div>`:''}<div class="scroll draft-scroll tag-deck-scroll"><div class="trade-cards cardgrid">${(received?rows:filtered).map(({id,i})=>`<button class="cardbtn ${!received&&this.tradeSelection.has(i)?'selected':''}" data-tag="${received?'inspect':'trade-card'}" data-id="${id}" data-index="${i}" ${!received&&sent?'disabled':''}><img draggable="false" loading="lazy" src="${this.image(id)}"><span>${esc(lookup(id)?.name||id)}</span>${!received&&r.selected.includes(i)?'<small>In your deck</small>':''}${!received&&r.card_mods?.[i]?'<small>Modified copy</small>':''}</button>`).join('')||'<p>No cards '+(received?'received.':'match this filter.')+'</p>'}</div></div><footer class="tag-lock-in"><span>${received?'Cards belong to you now':this.tradeSelection.size+' cards selected to send'}</span>${controls}${waiting?'<small>Waiting for connection. Your trade is saved.</small>':''}</footer>`,'','tag-trade');
 }
 async action(action,el){
  if(action==='curse-info'){this.dialog(this.content.curses[el.dataset.curse]?.[0]||'Curse',`<p>${esc(curseDescription(this.content,el.dataset.curse,this.view?.run?.challenge_level))}</p>`);return}

  if(this.working&&!['item','relics','scorecard','return-title','exit','confirm-exit','cancel-exit'].includes(action))return;
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
  if(action==='trade-filter'){this.tradeFilter=el.dataset.filter;this.render();return}
  if(action==='trade-card'){if(this.view.trade.sent[this.view.seat])return;if(this.tradeSelection.has(index))this.tradeSelection.delete(index);else this.tradeSelection.add(index);this.render();return}
  if(action==='exit'&&this.session){this.dialog('Exit tag duels?',`<p>Leave this room and end your connection to your teammate?</p>${button('Keep playing','cancel-exit')}${button('Exit room','confirm-exit')}`);return}
  if(action==='cancel-exit'){document.querySelector('#modal')?.close();return}
  if(action==='confirm-exit')document.querySelector('#modal')?.close();
  if(action==='exit'||action==='confirm-exit'){this.working=true;try{if(this.session)await this.session.exit();this.destroy();await this.onExit()}finally{this.working=false;if(this.alive)this.render()}return}
  if(action==='character'){if(this.session)return;this.character=id;this.level=rememberedLevel(this.profile,id);this.render();return}
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
  if(action==='shop-reroll'){if(this.view.shopSeat!==this.view.seat||this.view.paused||!this.session.connected)return;this.working=true;try{await this.session.request('shop-reroll');this.selection.clear();playRerollSound()}finally{this.working=false;this.render()}return}
  if(action==='start'){this.working=true;try{await this.session.request('start')}finally{this.working=false;this.render()}return}
  if(['host','join-room'].includes(action)){
   const code=this.joinCode.trim().toUpperCase();if(action==='join-room'&&!/^[A-Z2-9]{5}$/.test(code))throw Error('Enter the five-character room code.');
   this.working=true;this.status='';this.render();
   try{
   const endpoint=await this.endpoint();
   this.session=new TagSession({endpoint,character:this.character,profile:this.profile,level:this.level,content:this.content,backend:this.backend,onView:v=>this.update(v),onDuel:(s,c)=>this.onDuel(s,c),onAbandoned:()=>{this.status='Your tag partner abandoned you';this.dialog('Your tag partner abandoned you',`<p>Your partner left the tag room.</p>${button('Return to title','return-title','class="primary"')}`)},onPacks:event=>{this.packQueue=this.packQueue.then(async()=>{await this.onGoldenCards();return !this.alive||!this.openPacks?undefined:new Promise(resolve=>this.openPacks(event.packs,resolve))}).catch(error=>this.error(error))},onStatus:(state,detail)=>{
    this.status=state==='connected'||state==='waiting'?'':state==='error'?friendlyError(detail):['disconnected','failed','reconnecting'].includes(state)?'':state==='signaling-error'?'Room service unavailable — retrying':'';
    this.onStatus(state,detail);if(this.view?.phase!=='duel')this.render();
   }});
   const room=await this.session[action==='host'?'host':'join'](...(action==='join-room'?[code]:[]));localStorage.setItem('tag-last-code',room.code);
   }catch(error){this.session?.peer.suspend();this.session=null;throw error}finally{this.working=false;this.render()}return;
  }
  if(action==='deck-filter'){this.deckFilter=el.dataset.filter;this.render();return}
  if(action==='view-deck'&&(this.content.characters[this.view.run.character].copycat||this.content.characters[this.view.run.character].engine_deck)){this.dialog('Your deck',`<p>${this.content.characters[this.view.run.character].copycat?"Copy of opponent's deck":'Chosen reward deck'}</p>`);return}
  if(action==='view-deck'){this.dialog('Your deck',`<div class="cardgrid">${this.view.run.selected.map(i=>`<button data-tag="inspect" data-id="${this.view.run.pool[i]}"><img src="${this.image(this.view.run.pool[i])}"></button>`).join('')}</div>`);return}
  if(action==='inspect'){this.inspect(id);return}
  if(action==='deck'||action==='opponents'){this.tab=this.content.characters[this.view?.run?.character]?.copycat?'opponents':action;this.render();return}
  if(action==='item'){
   const x=this.view.run.shop[index];if(x.kind==='single'){this.inspect(x.id);return}
   if(x.kind==='artifact'){this.dialog(this.content.artifacts[x.id][0],`<img height="180" src="${relicImage(this.content.artifactInfo[x.id].art)}"><p>${esc(this.content.artifacts[x.id][2])}</p>`);return}
   const pack=this.content.packs.find(p=>p.id===x.id);const description=x.kind==='deck'?'':allCardsPackDescription(pack);if(description){this.dialog(pack.name,`<p>${esc(description)}</p>`);return;}this.dialog(pack?.name||x.name,`<p>${x.kind==='deck'?'Adds these cards to your collection. ':''}${x.price} gold</p><div class="cardgrid">${[...new Set(x.kind==='deck'?x.cards:[...(pack?.common||[]),...(pack?.rare||[])])].map(id=>`<button class="cardbtn" data-tag="inspect" data-id="${id}"><img loading="lazy" src="${this.image(id)}"><span>${esc(this.content.cards.find(c=>c.id===id)?.name||id)}</span></button>`).join('')}</div>`);return;
  }
  if(action==='relics'){this.dialog('Owned relics',this.view.run.artifacts.map(k=>`<h3>${esc(this.content.artifacts[k][0])}</h3><p>${esc(this.content.artifacts[k][2])}</p>`).join(''));return}
  if(action==='scorecard'){if(this.showScorecard)await this.showScorecard();return}

  if(action==='select'){const stock=this.view.run.shop[index];if(!stock||stock.sold||this.view.shopSeat!==this.view.seat||!this.session.connected||this.view.paused)return;if((this.content.characters[this.view.run.character].copycat||this.content.characters[this.view.run.character].engine_deck)&&stock.kind!=='artifact')return;if(this.selection.has(index))this.selection.delete(index);else{if(this.view.run.shop[index].price+[...this.selection].reduce((n,i)=>n+this.view.run.shop[i].price,0)>this.view.run.gold)throw Error('Not enough gold');this.selection.add(index)}playUISound('shop-select');this.render();return}
  if(action==='deselect-all'){const c=this.content.characters[this.view.run.character];if(this.view.ready[this.view.seat]||c.copycat||c.engine_deck)return;this.view.run.selected=[];this.saveDraft();this.render();return}
  if(action==='card'){
   if(this.view.ready[this.view.seat])return;
   if(this.content.characters[this.view.run.character].copycat||this.content.characters[this.view.run.character].engine_deck)return;
   const selected=[...this.view.run.selected],at=selected.indexOf(index);if(at>=0)selected.splice(at,1);else selected.push(index);
   this.view.run.selected=selected;playUISound('deck-select');this.saveDraft();this.render();return;
  }

  this.working=true;
  try{
   if(action==='reveal-opponent'){await playPortraitReveal({before:el.closest('.opponent').querySelector('.encounter-hero'),update:async()=>{await this.session.request('reveal-opponent',id);this.render()},after:()=>this.root.querySelector(`[data-encounter="${id}"] .encounter-hero`),active:()=>this.alive&&this.view?.phase==='draft'})}
   else if(action==='boss-reroll'){await this.session.request('boss-reroll');this.render()}
   else if(action==='peek-deck'){const ids=await this.session.request('peek-deck',id);this.dialog('Opponent deck',`<div class="cardgrid">${ids.map(id=>`<button class="cardbtn" data-tag="inspect" data-id="${id}"><img src="${this.image(id)}"></button>`).join('')}</div>`)}
   else if(action==='choose'){this.view.run.opponent=id;this.saveDraft();this.render()}
   else if(action==='auto'){this.view.run.selected=await this.backend('tag-auto-preview',this.view.run);this.saveDraft();this.render()}
   else if(action==='ready'){
    const run=this.view.run,c=this.content.characters[run.character],main=run.selected.filter(i=>!(this.content.cards.find(c=>c.id===run.pool[i])?.data.type&64)).length;
    if(!c.copycat&&!c.engine_deck&&(main<20||main>60)){this.tab='deck';throw Error(`Your main deck has ${main} cards. Choose 20 to 60 cards or use Auto-build.`)}
    await this.session.request('ready',{selected:run.selected,opponent:run.opponent});
   }
   else if(action==='buy'){
    const chosen=[...this.selection];
    const result=await this.session.request(chosen.length?'buy':'skip',chosen);if(chosen.length)purchaseCoins();this.selection.clear();const cards=(result||[]).flatMap(p=>p.cards||[]);
    await this.packQueue;await this.onGoldenCards();
    if(!(result||[]).some(x=>x.kind==='pack')&&cards.length)this.dialog('Your purchases',`<div class="cardgrid">${cards.map(id=>`<button class="cardbtn" data-tag="inspect" data-id="${id}"><img src="${this.image(id)}"></button>`).join('')}</div>`);

   }else if(action==='inspect')this.inspect(id);
   else if(['unready'].includes(action))await this.session.request(action);
  }finally{this.working=false}
 }
 saveDraft(){
  if(!this.draftKey||this.view?.phase!=='draft')return;
  this.localDraft={selected:[...this.view.run.selected],opponent:this.view.run.opponent};
  localStorage.setItem(this.draftKey,JSON.stringify(this.localDraft));
 }
 update(view){
  if(/That choice is stale|Wait for your teammate\.|No active duel\./.test(this.status))this.status='';
  view=structuredClone(view);
  if(view.phase==='draft'){
   const key='tag-draft:'+this.session.code+':'+view.seat+':'+view.run.round+':'+JSON.stringify(view.run.pool);
   if(this.draftKey!==key){this.draftKey=key;try{this.localDraft=JSON.parse(localStorage.getItem(key)||'null')}catch{this.localDraft=null}}
   if(this.localDraft&&!view.ready[view.seat]){view.run.selected=[...this.localDraft.selected];view.run.opponent=view.run.routes.includes(this.localDraft.opponent)?this.localDraft.opponent:null}
  }else if(this.draftKey){localStorage.removeItem(this.draftKey);this.draftKey=null;this.localDraft=null}
  const entrance=this.view?.phase==='lobby'&&view.phase==='draft'?captureCharacterEntrance(this.root.querySelectorAll('.tag-player-portrait>img')[view.seat]||this.root.querySelector('.duelist-hero>img')):null;
  const before=this.view?.phase,scroll=this.root.querySelector('.tag-deck-scroll')?.scrollTop||0;
  if(before==='duel'&&view.phase!=='duel'){this.deckFilter='All';this.deckSort='Default';delete deckSearches['tag-deck'];}this.view=view;this.updateRoomBadge();this.profile=view.profile;this.onView(view);
  if(view.phase!=='duel'){this.render();const list=this.root.querySelector('.tag-deck-scroll');if(list)list.scrollTop=scroll}
  if(view.phase==='draft'&&view.run.round===0)this.openStartingPacks(view,entrance);
  if((!before||before==='duel')&&['shop','complete'].includes(view.phase)&&view.run.reward_slots?.pending)this.showRewards?.();
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
 destroy(){cancelCharacterEntrance();this.closeStartingPacks?.();this.closeStartingPacks=null;this.root.removeEventListener('contextmenu',this.context);this.roomBadge?.remove();clearTimeout(this.finaleRollTimer);this.cancelTradeHold();this.root.removeEventListener('pointerup',this.cancelTradeHold);this.root.removeEventListener('pointercancel',this.cancelTradeHold);this.root.removeEventListener('scroll',this.cancelTradeHold,true);window.visualViewport?.removeEventListener('resize',this.viewport);this.root.style.removeProperty('--tag-visible-height');this.alive=false;clearTimeout(this.tap?.timer);document.removeEventListener('click',this.click,true);this.root.removeEventListener('pointerdown',this.down);this.root.removeEventListener('pointermove',this.move)}
}
